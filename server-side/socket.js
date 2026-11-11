"use strict";
console.warn("scoket");
/**
 * socket.js - every WebSocket concern in one place.
 *
 * The rest of the server only needs two functions:
 *      send(wsOrPlayerId, objectOrJsonString [, {reliable:false}])
 *      read(rawFrame)                       -> parsed object | null
 * (engine.js aliases them as comp_and_send / decodeIncoming)
 *
 * WIRE FORMAT
 *   data   : BINARY frame, deflate-raw(JSON).  Reliable messages carry "_s" (sequence number).
 *   control: TEXT frames (so they can never collide with a data frame)
 *              "1"      ping  (1 byte)   - either side may send it
 *              "2"      pong  (1 byte)   - answer to a ping
 *              "a<n>"   ack: "I processed everything up to seq n" (either side)
 *
 * RECONNECT
 *   Server sends {type:"resume_token", playerId, token} on every fresh connection.
 *   Client reconnects with   ws://host/?resume=<playerId>&t=<token>&ack=<lastServerSeqSeen>
 *   - within graceMs  -> server answers {type:"resumed", playerId, inAck} and replays every
 *                        un-acked message in order, keeping the original spacing between them
 *                        (capped by replayMaxGapMs). Each replayed message gets "_a" = its age in ms.
 *                        "inAck" = last client seq the server processed; client re-sends anything above it.
 *   - too late / bad token -> normal new connection, resume_token has resumeFailed:true.
 *   - close the socket with code 4000 to leave immediately (no grace period).
 */
const zlib = require("zlib");
const crypto = require("crypto");
const WebSocket = require("ws");

const PING = "1";
const PONG = "2";
const DEBUG = String(process.env.SOCKET_DEBUG || "").toLowerCase() === "true";
const log = (...a) => {
  if (DEBUG) console.log("[socket]", ...a);
};

const defaults = {
  pingMs: 10000, // how often we ping a quiet socket
  timeoutMs: 25000, // no frame at all for this long -> terminate (-> grace period)
  graceMs: 15000, // time a dropped player has to come back before "disconnected"
  replayMaxGapMs: 3000, // max pause kept between replayed messages
  maxOutbox: 1000, // un-acked messages kept per player
  terminateOnTimeout: true,
};

let getConfig = () => ({});
let hooks = {};
let tick = null;
let stopped = false;
const peers = new Map(); // playerId -> peer (survives socket swaps)

function cfg() {
  const c = { ...defaults };
  const o = getConfig() || {};
  for (const k of Object.keys(defaults)) {
    if (o[k] == null) continue;
    c[k] = typeof defaults[k] === "boolean" ? !!o[k] : Number(o[k]);
    if (typeof defaults[k] === "number" && !Number.isFinite(c[k])) c[k] = defaults[k];
  }
  return c;
}

/* ------------------------------------------------------------------ codec */

function compressPayload(jsonString) {
  return zlib.deflateRawSync(Buffer.from(jsonString, "utf8"), { level: 9 });
}

function decompressPayload(buffer) {
  return zlib.inflateRawSync(buffer).toString("utf8");
}

// used by engine for session ids (same output as before, without the log spam)
function compressString(inputString) {
  log("compressString", inputString);
  return compressPayload(inputString);
}

function read(raw) {
  try {
    const buf = Buffer.isBuffer(raw)
      ? raw
      : Array.isArray(raw)
        ? Buffer.concat(raw)
        : Buffer.from(raw);
    return JSON.parse(decompressPayload(buf));
  } catch (err) {
    console.log("Socket decode failed reason: " + err.message);
    return null;
  }
}

function rawWrite(ws, data, binary) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(data, { binary }, (err) => {
      if (err) console.log("Socket send failed reason: " + err.message);
    });
    return true;
  } catch (err) {
    console.log("Socket send failed reason: " + err.message);
    return false;
  }
}

const peerOf = (t) => (typeof t === "string" ? peers.get(t) : t && t._peer);

/* ------------------------------------------------------------------- send */

function send(target, payload, opts = {}) {
  let obj;
  try {
    obj = typeof payload === "string" ? JSON.parse(payload) : payload;
  } catch (e) {
    console.log("Socket send failed reason: payload is not JSON");
    return false;
  }
  const peer = peerOf(target);
  const plain = !obj || typeof obj !== "object" || Array.isArray(obj);

  // unreliable path: handshake messages, sockets we do not track, odd payloads
  if (!peer || plain || opts.reliable === false) {
    const ws = peer ? peer.ws : target;
    return rawWrite(ws, compressPayload(JSON.stringify(obj)), true);
  }

  const c = cfg();
  const msg = { ...obj, _s: ++peer.outSeq };
  peer.outbox.push({ seq: msg._s, ts: Date.now(), obj: msg, sentTo: null });
  if (peer.outbox.length > c.maxOutbox) peer.outbox.shift();
  flush(peer);
  return true; // delivered or queued for replay
}

function writeEntry(peer, e, replayed) {
  const body = replayed ? { ...e.obj, _a: Date.now() - e.ts } : e.obj;
  rawWrite(peer.ws, compressPayload(JSON.stringify(body)), true);
  e.sentTo = peer.ws;
}

function flush(peer) {
  if (!peer.connected || peer.replaying) return; // replay loop will pick new entries up
  for (const e of peer.outbox) if (e.sentTo !== peer.ws) writeEntry(peer, e, false);
}

function ackUpTo(peer, n) {
  if (!(n > 0)) return;
  peer.outbox = peer.outbox.filter((e) => e.seq > n);
}

function scheduleAck(peer) {
  if (peer.ackPending) return;
  peer.ackPending = true;
  setImmediate(() => {
    peer.ackPending = false;
    if (peer.connected) rawWrite(peer.ws, "a" + peer.inSeq, false);
  });
}

/* ----------------------------------------------------------------- replay */

function startReplay(peer) {
  clearTimeout(peer.replayTimer);
  const ws = peer.ws;
  const maxGap = cfg().replayMaxGapMs;
  const started = Date.now();
  let prevTs = null;
  peer.replaying = true;

  const stillMine = () => peer.ws === ws && ws.readyState === WebSocket.OPEN;

  const next = () => {
    if (!stillMine()) return void (peer.replaying = false);
    const e = peer.outbox.find((x) => x.sentTo !== ws);
    if (!e) return void (peer.replaying = false);

    const live = e.ts >= started; // queued after the replay began -> no artificial delay
    const wait = prevTs == null || live ? 0 : Math.min(Math.max(e.ts - prevTs, 0), maxGap);

    peer.replayTimer = setTimeout(() => {
      if (!stillMine()) return void (peer.replaying = false);
      if (peer.outbox.includes(e)) {
        writeEntry(peer, e, !live);
        prevTs = e.ts;
      }
      next();
    }, wait);
  };
  next();
}

/* ----------------------------------------------------------- attach/bind */

/**
 * Call first thing in the connection handler (synchronously).
 * makeId() is only called for a brand new player.
 * Returns { resumed, old, resumeFailed }.
 */
function attach(ws, req, makeId) {
  let q;
  try {
    q = new URL(req.url || "/", "http://x").searchParams;
  } catch (e) {
    q = new URLSearchParams();
  }
  const rid = q.get("resume");
  let peer = rid ? peers.get(rid) : null;
  if (peer && peer.token !== q.get("t")) peer = null;

  if (peer) {
    const old = peer.ws;
    clearTimeout(peer.graceTimer);
    clearTimeout(peer.replayTimer);
    peer.graceTimer = null;
    peer.replaying = false;
    peer.handler = null; // engine re-registers with onMessage()

    ws.playerId = peer.playerId;
    for (const k of ["authenticated", "user", "sessionId", "userAgent", "connectedAt"]) ws[k] = old[k];

    peer.ws = ws;
    ws._peer = peer;
    peer.connected = true;
    peer.lastSeen = Date.now();
    peer.lastPing = Date.now();
    ackUpTo(peer, Number(q.get("ack")) || 0);

    if (old !== ws) {
      try {
        old.terminate(); // half-dead socket, make sure it is gone
      } catch (e) {}
    }
    bind(ws, peer);
    rawWrite(
      ws,
      compressPayload(
        JSON.stringify({
          type: "resumed",
          playerId: peer.playerId,
          token: peer.token,
          inAck: peer.inSeq,
          pending: peer.outbox.length,
        }),
      ),
      true,
    );
    console.log(`|| Player ${peer.playerId} resumed (${peer.outbox.length} messages to replay)`);
    if (hooks.onResume) hooks.onResume(ws, old);
    startReplay(peer);
    return { resumed: true, old, resumeFailed: false };
  }

  const playerId = makeId();
  ws.playerId = playerId;
  peer = {
    playerId,
    token: crypto.randomBytes(16).toString("hex"),
    ws,
    connected: true,
    outSeq: 0,
    outbox: [],
    inSeq: 0,
    lastSeen: Date.now(),
    lastPing: 0,
    pingSentAt: 0,
    rtt: null,
    graceTimer: null,
    replayTimer: null,
    replaying: false,
    ackPending: false,
    handler: null,
    queue: [],
  };
  peers.set(playerId, peer);
  ws._peer = peer;
  bind(ws, peer);

  const c = cfg();
  send(
    ws,
    {
      type: "resume_token",
      playerId,
      token: peer.token,
      resumeFailed: !!rid,
      pingMs: c.pingMs,
      graceMs: c.graceMs,
    },
    { reliable: false },
  );
  return { resumed: false, old: null, resumeFailed: !!rid };
}

function bind(ws, peer) {
  ws.on("message", (raw, isBinary) => {
    if (peer.ws !== ws) return;
    peer.lastSeen = Date.now(); // any frame proves the socket is alive

    if (typeof raw === "string" || isBinary === false) {
      const s = String(raw);
      if (s === PING) rawWrite(ws, PONG, false);
      else if (s === PONG) {
        if (peer.pingSentAt) peer.rtt = Date.now() - peer.pingSentAt;
        peer.pingSentAt = 0;
      } else if (s.charCodeAt(0) === 97) ackUpTo(peer, parseInt(s.slice(1), 10));
      return;
    }

    const data = read(raw);
    if (!data) return;
    if (typeof data._s === "number") {
      const dup = data._s <= peer.inSeq;
      if (!dup) peer.inSeq = data._s;
      delete data._s; // never relay the sender's sequence number
      scheduleAck(peer);
      if (dup) return; // client re-sent something we already processed
    }
    dispatch(peer, data);
  });

  ws.on("error", (err) => {
    console.log(`Socket error ${ws.playerId}:`, err.code, err.message);
  });

  ws.on("close", (code) => {
    if (peer.ws !== ws) return; // replaced by a resumed socket
    peer.connected = false;
    peer.replaying = false;
    clearTimeout(peer.replayTimer);
    if (stopped) return;
    const c = cfg();
    if (code === 4000 || c.graceMs <= 0) return finalize(peer);
    log(`${peer.playerId} lost (${code}), grace ${c.graceMs}ms`);
    clearTimeout(peer.graceTimer);
    peer.graceTimer = setTimeout(() => finalize(peer), c.graceMs);
    if (hooks.onLost) {
      try {
        hooks.onLost(ws, c.graceMs);
      } catch (e) {
        console.error("[socket] onLost", e);
      }
    }
  });
}

function dispatch(peer, data) {
  if (!peer.handler) {
    if (peer.queue.length < 200) peer.queue.push(data);
    return;
  }
  try {
    peer.handler(data);
  } catch (e) {
    console.error("[socket] message handler error:", e && e.stack ? e.stack : e);
  }
}

/** Register the app-level handler: fn(data). Messages that arrived earlier are delivered now. */
function onMessage(ws, fn) {
  const peer = ws._peer;
  if (!peer) return;
  peer.handler = fn;
  const q = peer.queue.splice(0);
  for (const d of q) dispatch(peer, d);
}

function finalize(peer) {
  if (peers.get(peer.playerId) === peer) peers.delete(peer.playerId);
  clearTimeout(peer.graceTimer);
  clearTimeout(peer.replayTimer);
  peer.outbox = [];
  peer.queue = [];
  peer.handler = null;
  if (hooks.onDisconnect) {
    try {
      hooks.onDisconnect(peer.ws);
    } catch (e) {
      console.error("[socket] onDisconnect", e);
    }
  }
}

/* ---------------------------------------------------------- keepalive/etc */

function tickAll() {
  const c = cfg();
  const now = Date.now();
  for (const peer of peers.values()) {
    const ws = peer.ws;
    if (!peer.connected || ws.readyState !== WebSocket.OPEN) continue;
    if (now - peer.lastSeen > c.timeoutMs) {
      if (c.terminateOnTimeout) {
        console.log(`[Keepalive] Player ${peer.playerId} silent for ${now - peer.lastSeen}ms, terminating`);
        ws.terminate();
      }
      continue;
    }
    if (now - peer.lastPing >= c.pingMs) {
      peer.lastPing = now;
      peer.pingSentAt = now;
      rawWrite(ws, PING, false);
    }
  }
}

/**
 * init({ getConfig, onLost(ws, graceMs), onResume(newWs, oldWs), onDisconnect(ws) })
 * getConfig() may return any of the keys in `defaults` (read live, so it can be remote-tuned).
 */
function init(opts = {}) {
  getConfig = opts.getConfig || (() => ({}));
  hooks = {
    onLost: opts.onLost,
    onResume: opts.onResume,
    onDisconnect: opts.onDisconnect,
  };
  stopped = false;
  clearInterval(tick);
  tick = setInterval(tickAll, 1000);
  if (tick.unref) tick.unref();
}

function stop() {
  stopped = true;
  clearInterval(tick);
  tick = null;
  for (const p of peers.values()) {
    clearTimeout(p.graceTimer);
    clearTimeout(p.replayTimer);
  }
  peers.clear();
}

/** TEST HELPER: kill a player's socket (ws or playerId) after delayMs, as if the network dropped. */
function testTerminate(target, delayMs = 0) {
  const peer = peerOf(target);
  if (!peer) return false;
  setTimeout(() => {
    try {
      peer.ws.terminate();
    } catch (e) {}
  }, Math.max(0, Number(delayMs) || 0));
  return true;
}

function stats() {
  return [...peers.values()].map((p) => ({
    playerId: p.playerId,
    connected: p.connected,
    rttMs: p.rtt,
    outSeq: p.outSeq,
    inSeq: p.inSeq,
    unacked: p.outbox.length,
    replaying: p.replaying,
  }));
}

module.exports = {
  init,
  stop,
  attach,
  onMessage,
  send,
  read,
  compressPayload,
  decompressPayload,
  compressString,
  testTerminate,
  stats,
};