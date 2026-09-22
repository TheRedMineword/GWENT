'use strict';

// ---------------------------------------------------------------------------
// dcstate.js
//
// Everything dcapi.js needs to remember between requests, kept in memory
// only (same tradeoff dcbot.js made before it: no persistence across a
// restart. Swap the Maps below for a real store if that ever matters).
//
// This module deliberately owns `deps` (sessions / playerSockets /
// sendToClient) too, set once via setDeps() from dcapi.js's init(), so that
// betting.js (which has no hook into init() itself) can still look up which
// session a Discord user's registered client is currently in.
// ---------------------------------------------------------------------------

let deps = {
  sessions: {},
  playerSockets: {},
  sendToClient: null,
};

function setDeps(d) {
  deps = d || { sessions: {}, playerSockets: {}, sendToClient: null };
}

function getDeps() {
  return deps;
}

// ---------------------------------------------------------------------------
// Registration: discordId <-> playerId (the in-game client id), 1:1 both
// ways. Mirrors registerByPlayer/registerByDiscord from dcbot.js.
// ---------------------------------------------------------------------------

const registerByPlayer = new Map();  // playerId   -> discordId
const registerByDiscord = new Map(); // discordId  -> playerId

// register(discordId, playerId) - matches the !register wiring:
//   GET /api/dc?mode=handleregisters&userid=<discordId>&gwentid=<playerId>
// Returns false if that playerId isn't a currently-connected client (same
// validation dcbot.js effectively got for free from discord.js message
// context - here we have to check deps.playerSockets ourselves).
function register(discordId, playerId) {
  if (!discordId || !playerId) return false;
  if (!deps.playerSockets || !deps.playerSockets[playerId]) return false;

  // A discord user can only be linked to one client at a time, and a
  // client can only be linked to one discord user - clear any prior
  // link on either side first (same 1:1 rule dcbot.js enforced).
  const prevPlayerId = registerByDiscord.get(discordId);
  if (prevPlayerId && prevPlayerId !== playerId) {
    registerByPlayer.delete(prevPlayerId);
  }
  const prevDiscordId = registerByPlayer.get(playerId);
  if (prevDiscordId && prevDiscordId !== discordId) {
    registerByDiscord.delete(prevDiscordId);
  }

  registerByPlayer.set(playerId, discordId);
  registerByDiscord.set(discordId, playerId);
  return true;
}

// Clears a registration by playerId (client disconnected, etc).
// Returns the discordId that was linked, or null.
function unregisterByPlayer(playerId) {
  const discordId = registerByPlayer.get(playerId);
  if (!discordId) return null;
  registerByPlayer.delete(playerId);
  registerByDiscord.delete(discordId);
  return discordId;
}

function getDiscordIdForPlayer(playerId) {
  return registerByPlayer.get(playerId) || null;
}

function getPlayerIdForDiscord(discordId) {
  return registerByDiscord.get(discordId) || null;
}

// ---------------------------------------------------------------------------
// Bets: sessionId -> { [playerId]: { discordId, amount } }
// ---------------------------------------------------------------------------

const bets = new Map();

// Adds to (or starts) a player's bet for a session. Matches dcbot.js's
// "can be called again to add more to an existing bet" behavior.
function placeBet(sessionId, playerId, discordId, amount) {
  const sessionBets = bets.get(sessionId) || {};
  const existing = sessionBets[playerId]?.amount || 0;
  sessionBets[playerId] = { discordId, amount: existing + amount };
  bets.set(sessionId, sessionBets);
  return sessionBets[playerId].amount;
}

function getSessionBets(sessionId) {
  return bets.get(sessionId) || {};
}

// Removes and returns a session's bets (used when settling - refund or
// payout - so nothing can double-settle the same session's bets).
function takeSessionBets(sessionId) {
  const sessionBets = bets.get(sessionId);
  bets.delete(sessionId);
  return sessionBets || null;
}

// ---------------------------------------------------------------------------
// Match reports / scores: sessionId -> { [playerId]: winnerId|score }
// ---------------------------------------------------------------------------

const matchReports = new Map();
const matchScores = new Map();

function reportResult(sessionId, playerId, winnerId, score) {
  const reports = matchReports.get(sessionId) || {};
  reports[playerId] = winnerId;
  matchReports.set(sessionId, reports);

  const scores = matchScores.get(sessionId) || {};
  scores[playerId] = Number.isFinite(score) ? score : 0;
  matchScores.set(sessionId, scores);

  return { reports, scores };
}

function clearMatch(sessionId) {
  matchReports.delete(sessionId);
  matchScores.delete(sessionId);
}

// ---------------------------------------------------------------------------
// Resolving-session lock: prevents onMatchResult / onPlayerLeftSession /
// onDisconnect from double-settling (refunding+paying, or paying twice)
// the same session when they race. claimSession() must be called
// synchronously, before any `await`, exactly like dcbot.js's
// resolvingSessions.add() did.
// ---------------------------------------------------------------------------

const resolvingSessions = new Set();

function claimSession(sessionId) {
  if (resolvingSessions.has(sessionId)) return false;
  resolvingSessions.add(sessionId);
  return true;
}

function releaseSession(sessionId) {
  resolvingSessions.delete(sessionId);
}

function isResolving(sessionId) {
  return resolvingSessions.has(sessionId);
}

// ---------------------------------------------------------------------------
// Cash ledger: an internal, trust-based running balance per Discord user.
// This is NOT the same number as their actual UnbelievaBoat balance - it's
// a local bookkeeping copy (useful for e.g. a leaderboard/inventory display
// on the game client) that the external bot's own UB-side changes don't
// automatically sync into. mode=removecash uses this directly; real money
// movement (payouts/refunds/free claims) instead goes out as scan events
// for the external bot to actually apply against UnbelievaBoat.
// ---------------------------------------------------------------------------

const cash = new Map(); // discordId -> number

function adjustCash(discordId, delta) {
  if (!discordId) return false;
  const current = cash.get(discordId) || 0;
  cash.set(discordId, current + delta);
  return true;
}

function getCash(discordId) {
  return cash.get(discordId) || 0;
}

// ---------------------------------------------------------------------------
// Outbound scan-event queue. Drained by GET /api/dc?mode=scan, polled by
// the external bot every ~10s. Event shapes (the "a" field selects which):
//
//   { a: "dm",      dc, msg }                 DM this discord user
//   { a: "free",    val, reason }              post as a first-come claim
//                                               (no specific dc to credit)
//   { a: "addcash", dc, val, reason }          credit this discord user's
//                                               real UnbelievaBoat balance
//   { a: "offline", dc }                       client disconnected, purge
// ---------------------------------------------------------------------------

let eventQueue = [];

function enqueueEvent(evt) {
  eventQueue.push(evt);
}

function drainEvents() {
  const batch = eventQueue;
  eventQueue = [];
  return batch;
}

module.exports = {
  setDeps,
  getDeps,

  register,
  unregisterByPlayer,
  getDiscordIdForPlayer,
  getPlayerIdForDiscord,

  placeBet,
  getSessionBets,
  takeSessionBets,

  reportResult,
  clearMatch,

  claimSession,
  releaseSession,
  isResolving,

  adjustCash,
  getCash,

  enqueueEvent,
  drainEvents,
};
