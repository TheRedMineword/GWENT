'use strict';

// ---------------------------------------------------------------------------
// dcverify.js - Discord verification endpoint (bot check + quiz + IP check)
//
//   link (made by anything, not signed):  verify.html#auth=<base64("<discordId>:<unixExpSeconds>")>
//   (JSON payload {"dc":"..","exp":..} works too)
//
//   page -> POST /api/dcverify/start       { auth }          -> { sid }
//   page -> POST /api/dcverify/bot-check?sid=...             (same as /api/bot-check)
//   page -> GET  /api/dcverify/challenge?sid=...             -> questions
//   page -> POST /api/dcverify/answer      { sid, answers }  -> { ok, passed }
//
// On finish an event goes into dcstate's queue, picked up on the bot's next scan:
//   { a:"verify", dc, ok, reason, value:"<json string>", answers:"<plain text>", at }
// value = JSON.stringify({ sha, ip, others, vpn, hosting, risk })   <- only the ip info is json
//   sha    sha256 of the IP (salted with DCVERIFY_IP_SALT if set)
//   ip     censored IP like engine.js, e.g. "203.###.###.###" ("localhost" for ::1)
//   others how many OTHER discord ids already passed from the same IP
// answers = plain text, "Q1: ...\nA1: ...\n\nQ2: ..." (no grading, sent as-is, not json)
// ---------------------------------------------------------------------------

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const state = require('./dcstate');

const IP_SALT = process.env.DCVERIFY_IP_SALT || '';
const STRICT_IP = process.env.DCVERIFY_STRICT_IP !== '0'; // IP must stay the same during a session
const SESSION_TTL_MS = 10 * 60 * 1000;
const QUESTIONS_PER_RUN = Number(process.env.DCVERIFY_QUESTIONS) || 3;
const MAX_ANSWER_LEN = 300;
const MAX_BOT_SCANS = 3;
const DEBUG = process.env.DCVERIFY_DEBUG === '1';

const router = express.Router();
let botCheck = null;
let getClientIp = (req) => req.ip;

function init(opts = {}) {
  botCheck = opts.botCheck || null;
  if (opts.getClientIp) getClientIp = opts.getClientIp;
}

// ---- questions -------------------------------------------------------------
// Plain Q&A: no right or wrong answers, the answers are stored with the event.
// choice: { q, options:[..] }
// text:   { q }   (or { q, type:"text" })
let QUESTIONS = [];
function loadQuestions() {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'dcquestions.json'), 'utf8'));
  const out = [];
  raw.forEach((q, n) => {
    const bad = (why) => console.warn(`[dcverify] question #${n} ignored: ${why}`);
    if (!q || typeof q.q !== 'string' || !q.q.trim()) return bad('missing "q"');
    if (Array.isArray(q.options) && q.type !== 'text') {
      const options = q.options.map(String).filter((o) => o.trim());
      if (options.length < 2) return bad('choice question needs at least 2 options');
      return out.push({ q: q.q, type: 'choice', options });
    }
    out.push({ q: q.q, type: 'text' });
  });
  QUESTIONS = out;
  console.log(`[dcverify] ${out.length} questions loaded`);
}

loadQuestions();

// returns the answer as a clean string, or null if it is blank / invalid
function readAnswer(q, given) {
  if (given === undefined || given === null) return null;
  if (q.type === 'text') {
    const g = String(given).trim().slice(0, MAX_ANSWER_LEN);
    return g || null;
  }
  if (typeof given === 'string' && given.trim() !== '' && !/^\d+$/.test(given.trim())) {
    return q.options.includes(given) ? given : null; // option text sent instead of an index
  }
  if (given === '' || typeof given === 'boolean') return null;
  const i = Number(given);
  return Number.isInteger(i) && i >= 0 && i < q.options.length ? q.options[i] : null;
}

// ---- token (unsigned, expiry only) ----------------------------------------
function parseAuth(token) {
  if (typeof token !== 'string' || !token || token.length > 600) return { error: 'bad_token' };
  let dc, exp;
  try {
    const text = Buffer.from(token, 'base64url').toString('utf8'); // accepts +/ too
    if (text.trim().startsWith('{')) {
      const j = JSON.parse(text);
      dc = String(j.dc ?? j.id ?? j.userid ?? '');
      exp = Number(j.exp);
    } else {
      const m = /^(\d{5,25}):(\d{9,13})$/.exec(text);
      if (m) { dc = m[1]; exp = Number(m[2]); }
    }
  } catch { return { error: 'bad_token' }; }
  if (!/^\d{5,25}$/.test(dc || '') || !Number.isFinite(exp)) return { error: 'bad_token' };
  if (exp > 1e12) exp = Math.floor(exp / 1000);
  if (exp * 1000 < Date.now()) return { error: 'expired' };
  return { dc, exp, key: token };
}

// ---- ip --------------------------------------------------------------------
const cleanIp = (ip) => String(ip || '').replace(/^::ffff:/, '');
const ipSha = (ip) => crypto.createHash('sha256').update(IP_SALT + cleanIp(ip)).digest('hex');

function maskIp(ip) {
  const c = cleanIp(ip);
  if (c === '::1' || c === '127.0.0.1') return 'localhost';
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(c);
  if (v4) return `${v4[1]}.###.###.###`; // same censor as engine.js
  if (c.includes(':')) { const first = c.split(':')[0]; return first ? `${first}:###:###` : '::###'; }
  return '###';
}

const passedByIp = new Map(); // sha -> Set(discordId)

// ---- sessions --------------------------------------------------------------
const sessions = new Map();
const tokenSession = new Map();
const usedTokens = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [sid, s] of sessions) if (s.expiresAt < now) endSession(sid);
  for (const [k, t] of usedTokens) if (t < now) usedTokens.delete(k);
}, 60 * 1000).unref();

function endSession(sid) {
  const s = sessions.get(sid);
  if (!s) return;
  sessions.delete(sid);
  if (tokenSession.get(s.key) === sid) tokenSession.delete(s.key);
}

function getSession(sid) {
  const s = typeof sid === 'string' ? sessions.get(sid) : null;
  if (!s) return null;
  if (s.expiresAt < Date.now()) { endSession(sid); return null; }
  return s;
}

function finish(s, ok, reason, qa) {
  usedTokens.set(s.key, s.exp * 1000 + 60000);
  endSession(s.sid);

  const sha = ipSha(s.ip);
  const set = passedByIp.get(sha) || new Set();
  const others = [...set].filter((d) => d !== s.dc).length;
  if (ok) { set.add(s.dc); passedByIp.set(sha, set); }

  const net = s.network || {};
  state.enqueueEvent({
    a: 'verify', dc: s.dc, ok, reason: reason || null,
    value: JSON.stringify({
      sha, ip: maskIp(s.ip), others,
      vpn: net.vpn ?? null, hosting: net.hosting ?? null, risk: net.risk ?? null,
    }),
    answers: qa ? qa.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1}: ${x.a}`).join('\n\n') : null,
    at: Date.now(),
  });
}

// returns true if ok; otherwise ends the session and answers 403
function ipOk(req, s, res) {
  if (!STRICT_IP || cleanIp(getClientIp(req)) === cleanIp(s.ip)) return true;
  finish(s, false, 'ip_mismatch');
  res.status(403).json({ ok: false, error: 'ip_mismatch' });
  return false;
}

function isHuman(result) {
  if (!result || typeof result !== 'object') return false;
  if (typeof result.human === 'boolean') return result.human;
  if (typeof result.verdict === 'string') return result.verdict.toLowerCase() === 'human';
  return false;
}

// ---- routes ----------------------------------------------------------------
router.post('/start', (req, res) => {
  const p = parseAuth(req.body && req.body.auth);
  if (p.error) return res.status(400).json({ ok: false, error: p.error });
  if (usedTokens.has(p.key)) return res.status(409).json({ ok: false, error: 'already_used' });

  const old = tokenSession.get(p.key);
  if (old) endSession(old);

  const sid = crypto.randomBytes(18).toString('base64url');
  sessions.set(sid, {
    sid, dc: p.dc, exp: p.exp, key: p.key, ip: cleanIp(getClientIp(req)),
    expiresAt: Math.min(Date.now() + SESSION_TTL_MS, p.exp * 1000),
    scans: 0, human: false, questions: null, network: null,
  });
  tokenSession.set(p.key, sid);
  res.json({ ok: true, sid });
});

router.post('/bot-check', (req, res) => {
  const s = getSession(req.query.sid);
  if (!s) return res.status(404).json({ ok: false, error: 'no_session' });
  if (!botCheck) return res.status(500).json({ ok: false, error: 'not_configured' });
  if (!ipOk(req, s, res)) return;
  if (++s.scans > MAX_BOT_SCANS) { finish(s, false, 'too_many_scans'); return res.status(429).json({ ok: false, error: 'too_many_scans' }); }

  const origJson = res.json.bind(res);
  res.json = (body) => {
    if (body && body.result) {
      s.human = isHuman(body.result);
      s.network = body.result.network || null;
      if (!s.human) finish(s, false, 'bot');
    }
    return origJson(body);
  };
  return botCheck(req, res);
});

router.get('/challenge', (req, res) => {
  const s = getSession(req.query.sid);
  if (!s) return res.status(404).json({ ok: false, error: 'no_session' });
  if (!ipOk(req, s, res)) return;
  if (!s.human) return res.status(403).json({ ok: false, error: 'bot_check_required' });

  if (!s.questions) s.questions = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_RUN);
  res.json({
    ok: true,
    questions: s.questions.map((q, i) => (
      q.type === 'text' ? { id: i, type: 'text', q: q.q } : { id: i, type: 'choice', q: q.q, options: q.options }
    )),
  });
});

router.post('/answer', (req, res) => {
  const s = getSession(req.body && req.body.sid);
  if (!s) return res.status(404).json({ ok: false, error: 'no_session' });
  if (!ipOk(req, s, res)) return;
  if (!s.human || !s.questions) return res.status(403).json({ ok: false, error: 'bot_check_required' });

  const answers = req.body.answers;
  if (!Array.isArray(answers) || answers.length !== s.questions.length) {
    return res.status(400).json({ ok: false, error: 'bad_answers' });
  }
  const qa = [];
  for (let i = 0; i < s.questions.length; i++) {
    const a = readAnswer(s.questions[i], answers[i]);
    if (a === null) return res.status(400).json({ ok: false, error: 'empty_answer', index: i }); // session stays open, can retry
    qa.push({ q: s.questions[i].q, a });
  }
  if (DEBUG) console.log('[dcverify] answer', JSON.stringify({ dc: s.dc, qa }));
  finish(s, true, null, qa);
  res.json({ ok: true, passed: true });
});

module.exports = { router, init, parseAuth, loadQuestions };