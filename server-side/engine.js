console.log("ITS ME AN ENGINE!");
let intervals = [];
let listeners = [];
let mountedRouter = null;
let eventStreamCloseAll = null;
let processHandlersAttached = false;
let onUncaughtException = null;
let onUnhandledRejection = null;
let upgradeHandler = null;
const upgradedSockets = new WeakSet(); // sockets already handed to wss.handleUpgrade

const sock = require("./socket");
const comp_and_send = sock.send;      // same call signature as before
const decodeIncoming = sock.read;
const compressString = sock.compressString;
// delete your old compress/decompress/send/heartbeat helpers


function unmountRouter(app, router) {
    if (!router || !app?._router?.stack) return;
    app._router.stack = app._router.stack.filter(
        (layer) => layer.handle !== router,
    );
}

exports.stop = ({ app, server, wss }) => {
    console.log("KILL SERVER");
    try {
        require("./dcapi").stop();
    } catch (e) {}
    for (const id of intervals)
        clearInterval(id);

    intervals.length = 0;

    try { sock.stop(); } catch (e) {}   // [FIX] clear ping timer / peers before terminating sockets
    // remove the HTTP "upgrade" listener, otherwise every restart/hot-reload stacks another one
    try { if (upgradeHandler) server.off("upgrade", upgradeHandler); } catch (e) {}
    upgradeHandler = null;

    for (const fn of listeners)
        wss.off("connection", fn);

    listeners.length = 0;
    for (const client of wss.clients) {
        try {
            clearInterval(client.heartbeatInterval);
            client.terminate();
        } catch (e) {
            console.log("Error terminating client on stop", e);
        }
    }

    try {
        if (eventStreamCloseAll) eventStreamCloseAll();
    } catch (e) {}
    eventStreamCloseAll = null;
    unmountRouter(app, mountedRouter);
    mountedRouter = null;

    if (processHandlersAttached) {
        if (onUncaughtException) process.off("uncaughtException", onUncaughtException);
        if (onUnhandledRejection) process.off("unhandledRejection", onUnhandledRejection);
        onUncaughtException = null;
        onUnhandledRejection = null;
        processHandlersAttached = false;
    }
};

exports.start = ({ app, server, wss }) => {
const { forceUpdate } = require("./updater");
const express = require("express");
const vm = require("vm");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const zlib = require("zlib");
const { json } = require("stream/consumers");
const fs = require("fs");
const analyseBot = require("./botDetector.js");

require("dotenv").config();

// Discord bot / betting integration (optional, gated by env)
const dcBotEnabled =
  String(process.env.dc_bot_integration_use).toLowerCase() === "true";
const dcapi = dcBotEnabled ? require("./dcapi") : null;

// All routes/middleware for this run live on their own Router so stop()
// can unmount the whole batch in one shot instead of leaking onto `app`.
const router = express.Router();
app.use(router);
mountedRouter = router;

// Diagnostic safety net: without this, ANY unhandled synchronous throw in an
// event handler (e.g. the 'upgrade' listener below, or a ws 'message'
// handler) crashes the entire Node process with no trace of what happened,
// which is indistinguishable from a "silent crash". This logs the full
// stack instead. It does NOT attempt to keep the process healthy after a
// truly corrupt state — it's for diagnosis, not a substitute for fixing the
// underlying bug once you see the stack trace.
if (!processHandlersAttached) {
  onUncaughtException = (err) => {
    console.error("[FATAL] Uncaught exception:", err && err.stack ? err.stack : err);
  };
  onUnhandledRejection = (reason) => {
    console.error("[FATAL] Unhandled rejection:", reason && reason.stack ? reason.stack : reason);
  };
  process.on("uncaughtException", onUncaughtException);
  process.on("unhandledRejection", onUnhandledRejection);
  processHandlersAttached = true;
}

let auth_needed = true;

const blockedRelayTypes = new Set([
  "new_css",
  "new_visual",
  "show_patchnotes",
  "server_notif",
  "NewPlayTheme",
  "authRequired",
  "discordinventory",
  "discordintegration",
  "welcome",
  "discordintegration__screenshot"
]);

const ADMIN_ENDPOINT_LOGIN = process.env.ADMIN_ENDPOINT_LOGIN;

let sessions = {};
const joinIndex = {};
let players = [];
let nextPlayerId = 1;

let database = {
  users: [],
};

let databaseOriginal = "";
let playerSockets = {};

const coinTossHistory = new Map();
const COIN_TOSS_HISTORY_TTL = 60 * 60 * 1000;
const COIN_TOSS_MAX_STREAK = 2;

function coinTossHistoryCleanup() {
  const cutoff = Date.now() - COIN_TOSS_HISTORY_TTL;
  for (const [key, entry] of coinTossHistory) {
    if (entry.timestamp < cutoff) coinTossHistory.delete(key);
  }
}
intervals.push(setInterval(coinTossHistoryCleanup, 10 * 60 * 1000));

function pickFirstPlayer(session) {
  const ids = session.players.map((p) => p.playerId);
  const pairKey = ids.slice().sort().join("|");
  const prev = coinTossHistory.get(pairKey);
  const prevFresh = prev && Date.now() - prev.timestamp < COIN_TOSS_HISTORY_TTL;

  let winnerId;
  if (prevFresh && prev.streak >= COIN_TOSS_MAX_STREAK && ids.includes(prev.winner)) {
    // Same player has won the toss too many times in a row against this
    // exact opponent recently -> force it to go the other way this time.
    const otherIds = ids.filter((id) => id !== prev.winner);
    winnerId = otherIds[crypto.randomInt(0, otherIds.length)];
  } else {
    winnerId = ids[crypto.randomInt(0, ids.length)];
  }

  const streak = prevFresh && prev.winner === winnerId ? prev.streak + 1 : 1;
  coinTossHistory.set(pairKey, { winner: winnerId, streak, timestamp: Date.now() });

  return winnerId;
}

const CONFIG_URL = `${process.env.GWENT_URL_COIN || "https://theredmineword.github.io/GWENT/"}server-side/coin_config.json`;
let random_coin = [
  {
    chance: 9,
    val: "_lambert",
  },
];
const TRAFFIC_CONFIG_URL = `${process.env.GWENT_URL_COIN || "https://theredmineword.github.io/GWENT/"}server-side/TraficMonitor.json`;

const TRAFIC_BASE_URL = `${process.env.GWENT_URL_COIN2 || "https://drmineword-gwent.onrender.com/"}`;

let trafficMonitor = {
  askForPing: 30,
  recive_window: 20,
  firewsclose: true,
};

console.warn("PROCCESS ENV", process.env, process.env.VERIF || false);

// ---------------------------------------------------------------------------
// Log forwarding (env: forward_logs)
//
// forward_logs={"use": true, "put_api": "<url>", "maxatonce": 50, "limitsbeetwencalls": 7}
//   use                 - enable/disable forwarding
//   put_api             - stream API. Receives a JSON array of Discord-formatted
//                         messages, loops over it and forwards each to Discord,
//                         and finally responds with the text "done".
//   maxatonce           - max messages per call (slice of the log array)
//   limitsbeetwencalls  - seconds to wait between calls
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseForwardLogsEnv() {
  const fallback = { use: false, put_api: "", maxatonce: 50, limitsbeetwencalls: 7 };
  const raw = process.env.forward_logs;
  if (!raw) return fallback;
  try {
    const cfg = { ...fallback, ...JSON.parse(raw) };
    cfg.maxatonce = Math.max(1, parseInt(cfg.maxatonce, 10) || fallback.maxatonce);
    cfg.limitsbeetwencalls = Math.max(0, Number(cfg.limitsbeetwencalls) || 0);
    return cfg;
  } catch (e) {
    process.stderr.write("forward_logs env is not valid JSON: " + e.message + "\n");
    return fallback;
  }
}

const forwardLogs = parseForwardLogsEnv();
const forwardLogsActive = !!(forwardLogs.use && forwardLogs.put_api);

// Array of Discord-formatted messages waiting to be sent.
const logBuffer = [];
let logForwarderRunning = false;

function pushLog(message) {
  logBuffer.push({
    embeds: [
      {
        description: String(message).slice(0, 4096),
        footer: {
          text: "Lng: " + logBuffer.length,
          icon_url: "https://theredmineword.github.io/GWENT/img/web/logo_round.png",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  });
  runLogForwarder();
}

async function runLogForwarder() {
  if (logForwarderRunning || !forwardLogsActive) return;
  logForwarderRunning = true;

  try {
    while (logBuffer.length > 0) {
      const batch = logBuffer.slice(0, forwardLogs.maxatonce);
      let ok = false;

      try {
        const response = await fetch(forwardLogs.put_api, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        });

        // Stream API: wait for the whole stream, it ends with "done".
        const body = await response.text();
        ok = response.ok && body.trim().toLowerCase().endsWith("done");

        if (!ok) {
          process.stderr.write(
            "forward_logs: bad response (" + response.status + "): " + body.slice(0, 300) + "\n",
          );
        }
      } catch (error) {
        process.stderr.write("forward_logs: request failed: " + error.message + "\n");
      }

      if (ok) {
        logBuffer.splice(0, batch.length); // drop only what was confirmed sent
      }

      // wait between calls (also acts as retry delay on failure)
      await sleep(Math.max(forwardLogs.limitsbeetwencalls, 1) * 1000);
    }
  } finally {
    logForwarderRunning = false;
    if (logBuffer.length > 0) runLogForwarder();
  }
}

console.log = (message) => {
  process.stdout.write(String(message) + "\n");
  if (forwardLogsActive) pushLog(message);
};

const heartbeatWaiting = new Map();

const recentPushes = new Map(); // key: sha -> { sha, before, files, commits, repo, ref, time }
function isKnownIssuePath(filename = "") {
  return (
    /^web-only\/isissue\.txt$/i.test(filename) ||
    /^web-only\/knownissues\.json$/i.test(filename) ||
    /^web-only\/\d{4}\/\d{2}\/\d{2}\/[^/]+\.json\.txt$/i.test(filename) ||
    /^web-only\/change\/web-only\/ping_news\.txt$/i.test(filename) ||
    /^buttons\.json$/i.test(filename) ||
    /(^|\/)change\/.+$/i.test(filename)
  );
}

function isSilentKnownIssueUpdate(files = []) {
  return files.length > 0 && files.every((f) => isKnownIssuePath(f.filename));
}

function generateHeartbeatId() {
  return crypto.randomUUID();
}
async function updateTrafficMonitor() {
  try {
    const response = await fetch(TRAFFIC_CONFIG_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.log(`[TrafficMonitor] Failed: ${response.status}`);
      return;
    }

    trafficMonitor = await response.json();
    auth_needed = trafficMonitor.needauth;

    console.log(
      `[TrafficMonitor] Updated \`${JSON.stringify(trafficMonitor)}\` + auth \`${auth_needed}\``,
    );
    console.log(
      `[TrafficMonitor] blockedDomains = ${JSON.stringify(trafficMonitor.blockedDomains || [])}`,
    );
  } catch (err) {
    console.error("[TrafficMonitor]", err);
  }
}

updateTrafficMonitor();

function sendHeartbeat(ws, req) {
  const id = generateHeartbeatId();

  heartbeatWaiting.set(id, {
    ws,
    received: false,
    created: Date.now(),
  });

  const serverUrl = `${TRAFIC_BASE_URL}`;

  comp_and_send(ws, {
    type: "hearthbeat",
    data: `${serverUrl}api/recive-hearthbeat?db=${id}`,
  });

  setTimeout(
    () => {
      const hb = heartbeatWaiting.get(id);

      if (!hb) return;

      if (!hb.received) {
        console.log(`[Heartbeat] Player ${ws.playerId} failed heartbeat`);

        if (trafficMonitor.firewsclose) {
          ws.terminate();
        }
      } else {
        //      comp_and_send(ws, {
        //      type: "hearthbeat_recived",
        //      data: `${id}---BUMP`,
        //   });
      }

      heartbeatWaiting.delete(id);
    },
    Number(trafficMonitor.recive_window) * 1000,
  );
}

async function updateRandomCoin() {
  try {
    const response = await fetch(CONFIG_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.log(`[CoinWatcher] Failed to fetch config: ${response.status}`);
      return;
    }

    const config = await response.json();

    // Update the global variable
    random_coin = config;

    console.warn(
      `[CoinWatcher] random_coin updated: \`${JSON.stringify(random_coin)}\` ${CONFIG_URL}`,
    ); //,
    // response, config, CONFIG_URL);
  } catch (err) {
    console.error("[CoinWatcher]", err);
  }
  console.log(`[CoinWatcher] now \`${JSON.stringify(random_coin)}\``);
}

intervals.push(setInterval(updateRandomCoin, 35 * 60 * 1000));
intervals.push(setInterval(updateTrafficMonitor, 35 * 60 * 1000));
// db work
function encryptPassword(password) {
  const salt = process.env.AUTH_HEX;

  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  return `${salt}:${hash}`;
}

function decryptPassword(stored) {
  console.log(`stored ${stored}`);
  return stored;
}

async function loadDatabase() {
  const response = await fetch(
    `${process.env.XANO_URL}/database?id=${process.env.DB_ID}`,
  );

  const json = await response.json();

  if (!json.ok) {
    throw new Error("Failed loading database");
  }

  database = json.db || {
    users: [],
  };

  databaseOriginal = JSON.stringify(database);

  console.log(`Loaded ${database.users.length} users`);
}

async function saveDatabase() {
  const current = JSON.stringify(database);

  if (current === databaseOriginal) {
    return false;
  }

  const response = await fetch(`${process.env.XANO_URL}/database`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: process.env.DB_ID,
      overwrite: database,
    }),
  });

  const json = await response.json();

  if (json.ok) {
    database = json.db || database;

    databaseOriginal = JSON.stringify(database);

    console.log("Database synced");
  }

  return json;
}

// await loadDatabase();

// ---------- helpers ----------
function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function percentSaved(before, after) {
  return ((1 - after / before) * 100).toFixed(3);
}

function compressPayload(jsonString) {
  const input = Buffer.from(jsonString, "utf8");
  const compressed = zlib.deflateRawSync(input, { level: 9 });
  console.log(
    `Bytes before ${input.length}\nBytes after ${compressed.length}\nCompressed% ${percentSaved(input.length, compressed.length)}%\nPayload sha ${sha256(compressed)}`,
  );
  console.log(jsonString);
  return compressed;
}

function compressString(inputString) {
  console.log(`Input for session id ${JSON.stringify(inputString)}`);
  const input = Buffer.from(inputString, "utf8");

  const compressed = zlib.deflateRawSync(input, {
    level: 9,
  });

  console.log(
    `Bytes before ${input.length}\n` +
      `Bytes after ${compressed.length}\n` +
      `Compressed% ${percentSaved(input.length, compressed.length)}%\n` +
      `Payload sha ${sha256(compressed)}`,
  );

  console.log(`String compressed: ${inputString}`);

  return compressed;
}

function decompressPayload(buffer) {
  console.log(zlib.inflateRawSync(buffer).toString("utf8"));
  return zlib.inflateRawSync(buffer).toString("utf8");
}

// ---------- compress ----------
//function compressPayload(jsonString) {
// const input = Buffer.from(jsonString, "utf8");

// const compressed = zlib.brotliCompressSync(input, {
//     params: {
//         [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
//         [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT
//     }
//  });

//
//   return compressed;
//}

// ---------- decompress ----------
//function decompressPayload(buffer) {
// const raw = zlib.brotliDecompressSync(buffer);
//  return raw.toString("utf8");
//}

// [FIX] old comp_and_send()/decodeIncoming() removed: they shadowed the sock.send / sock.read
// aliases at the top of the file, so messages bypassed the sequence/ack/replay layer.

let genlng = 2;
// Helper function to generate a random 4-character code
function generateCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < genlng; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}
let country_code = "JC";
let ip_is = "null";
function generatePlayerId(req) {
  ip_is = getClientIp(req);
  const ipHash = crypto
    .createHash("sha256")
    .update(ip_is)
    .digest("hex")
    .slice(0, 4);

  const part = () => crypto.randomBytes(2).toString("hex");
  const num = () => Math.floor(1000 + Math.random() * 9000);
  const num2 = () => Math.floor(1000 + Math.random() * 9000);
  return `${ipHash}-${num()}-${part()}-${num2()}`;
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

async function loadAddon() {
  try {
    const code = Buffer.from(process.env.SECRET_ADDON, "base64").toString(
      "utf8",
    );
    console.log(`-# Code addon: ${code}`);
    const sandbox = {
      module: { exports: {} },
      exports: {},
      require,
      process,
      console,
      Buffer,
    };

    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    return sandbox.module.exports;
  } catch (e) {
    console.error("err YT", e);
  }
}
async function init_addon() {
  console.log("addon script");

  const addon = await loadAddon();

  console.log("addon =", addon);
  console.log("addon.init =", addon?.init);
  console.log("addon script", addon);
  await addon.init();
}
const lastMessageTime = {};
// Serve all client files (index.html, JS, CSS, etc.)
const allowedOrigins = [
  "https://drmineword-gwent.onrender.com",
  "http://theredmineword.github.io",
  "https://theredmineword.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function checkCors(req, res) {
  const origin = req.headers.origin;

  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    return true;
  }

  return false;
}
function isBlockedDomain(hostOrUrl) {
  if (!hostOrUrl) return false;

  // Accepts either a plain "host:port" (from the Host header) or a full
  // URL (from Origin/Referer headers, e.g. "https://evil.com/path").
  let hostname;
  try {
    hostname = hostOrUrl.includes("://")
      ? new URL(hostOrUrl).hostname
      : hostOrUrl.split(":")[0];
  } catch (e) {
    return false;
  }
  hostname = hostname.toLowerCase().trim();

  const blockedDomains = Array.isArray(trafficMonitor.blockedDomains)
    ? trafficMonitor.blockedDomains
    : [];

  return blockedDomains.some((domain) => {
    domain = String(domain).toLowerCase().trim();

    // Exact domain OR any subdomain
    return (
      hostname === domain ||
      hostname.endsWith("." + domain)
    );
  });
}
router.use(cors({ origin: "*" }));
router.use((req, res, next) => {
  try {
    const host = req.headers.host;
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (isBlockedDomain(host) || isBlockedDomain(origin) || isBlockedDomain(referer)) {
      console.log(
        `[TrafficMonitor] Blocked domain: host=${host} origin=${origin} referer=${referer}`,
      );

      return res.status(502).json({
      //  ok: false,
      //  error: "Domain blocked",
      });
    }

    next();
  } catch (err) {
    console.error("[TrafficMonitor] Error in domain-block middleware:", err && err.stack ? err.stack : err);
    next();
  }
});
const BR_TOKEN_TTL_MS = 2 * 60 * 1000;
const BR_IP_LIMIT = 3; // reports per IP ...
const BR_IP_WINDOW_MS = 10 * 60 * 1000; // ... per 10 min
const BR_GLOBAL_LIMIT = 20; // reports sent to the queue ...
const BR_GLOBAL_WINDOW_MS = 10 * 60 * 1000; // ... per 10 min, whole server
// no size limit by default; set BR_MAX_BODY (e.g. "50mb") / BR_MAX_IMAGE_MB in .env to cap them
const BR_MAX_BODY = process.env.BR_MAX_BODY || Infinity;
const BR_MAX_IMAGE_BYTES = process.env.BR_MAX_IMAGE_MB
  ? Number(process.env.BR_MAX_IMAGE_MB) * 1024 * 1024
  : Infinity;
const BR_MAX_LOG_CHARS = 400 * 1024;
const BR_MAX_JSON_CHARS = 200 * 1024;

const brTokens = new Map(); // token -> { ip, expires }
const brIpHits = new Map(); // ip -> [timestamps]
let brGlobalHits = [];

const brClip = (v, n) => {
  const s = String(v ?? "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};

function brAllowIp(ip) {
  const now = Date.now();
  const hits = (brIpHits.get(ip) || []).filter((t) => now - t < BR_IP_WINDOW_MS);
  const ok = hits.length < BR_IP_LIMIT;
  if (ok) hits.push(now);
  brIpHits.set(ip, hits);
  return ok;
}

function brAllowGlobal() {
  const now = Date.now();
  brGlobalHits = brGlobalHits.filter((t) => now - t < BR_GLOBAL_WINDOW_MS);
  if (brGlobalHits.length >= BR_GLOBAL_LIMIT) return false;
  brGlobalHits.push(now);
  return true;
}

intervals.push(
  setInterval(() => {
    const now = Date.now();
    for (const [t, v] of brTokens) if (v.expires < now) brTokens.delete(t);
    for (const [ip, hits] of brIpHits) {
      const fresh = hits.filter((x) => now - x < BR_IP_WINDOW_MS);
      if (fresh.length) brIpHits.set(ip, fresh);
      else brIpHits.delete(ip);
    }
  }, 60 * 1000),
);

// only our own game pages may use this (browsers always send Origin on POST)
function brOriginGuard(req, res, next) {
  const origin = req.headers.origin;
  if (!origin || !originMatches(origin)) return res.sendStatus(403);
  next();
}

// consumes the one-time token BEFORE the body is parsed
function brTokenGuard(req, res, next) {
  const t = brTokens.get(req.params.token);
  brTokens.delete(req.params.token);
  if (!t || t.expires < Date.now() || t.ip !== getClientIp(req)) {
    return res.sendStatus(403);
  }
  next();
}

// -- sanitising helpers ------------------------------------------------------
function brImageFromBase64(b64) {
  if (typeof b64 !== "string" || b64.length > BR_MAX_IMAGE_BYTES * 1.4) return null;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) return null;
  const buf = Buffer.from(b64, "base64");
  if (!buf.length || buf.length > BR_MAX_IMAGE_BYTES) return null;
  // trust magic bytes, not the client's mime type
  if (buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
    return { buf, ext: "png", type: "image/png" };
  if (buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    return { buf, ext: "jpg", type: "image/jpeg" };
  if (
    buf.subarray(0, 4).toString("latin1") === "RIFF" &&
    buf.subarray(8, 12).toString("latin1") === "WEBP"
  )
    return { buf, ext: "webp", type: "image/webp" };
  return null;
}

function brLogsFromBase64(b64) {
  if (typeof b64 !== "string" || !/^[A-Za-z0-9+/=\s]+$/.test(b64)) return null;
  let text = Buffer.from(b64, "base64").toString("utf8");
  let count = null;
  try {
    const arr = JSON.parse(text);
    if (Array.isArray(arr)) {
      count = arr.length;
      text = arr
        .map((l) => `[${l?.time ?? ""}] [${l?.level ?? "log"}] ${l?.text ?? ""}`)
        .join("\n");
    }
  } catch (e) {}
  if (text.length > BR_MAX_LOG_CHARS) text = text.slice(-BR_MAX_LOG_CHARS); // keep the newest
  return { text, count };
}

function brJsonFile(value) {
  let s;
  try {
    s = JSON.stringify(value, null, 2);
  } catch (e) {
    s = String(value);
  }
  return brClip(s ?? "null", BR_MAX_JSON_CHARS);
}

function brCleanError(e) {
  e = e && typeof e === "object" ? e : {};
  return {
    type: brClip(e.type, 40),
    message: brClip(e.message, 4000),
    source: brClip(e.source, 300),
    line: Number(e.line) || 0,
    column: Number(e.column) || 0,
    time: brClip(e.time, 40),
  };
}

// -- endpoints ---------------------------------------------------------------
router.post("/api/bug-report/init", brOriginGuard, (req, res) => {
  const ip = getClientIp(req);
  if (!brAllowIp(ip)) return res.status(429).json({ ok: false, error: "rateLimited" });

  const token = crypto.randomBytes(24).toString("base64url");
  brTokens.set(token, { ip, expires: Date.now() + BR_TOKEN_TTL_MS });

  const proto = String(req.headers["x-forwarded-proto"] || req.protocol)
    .split(",")[0]
    .trim();
  res.json({ ok: true, url: `${proto}://${req.get("host")}/api/bug-report/${token}` });
});

router.post(
  "/api/bug-report/:token",
  brOriginGuard,
  brTokenGuard,
  express.json({ limit: BR_MAX_BODY }),
  async (req, res) => {
    res.status(200).set({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    const say = (line) => {
      try {
        res.write(line + "\n");
      } catch (e) {}
    };
    const finish = (line) => {
      if (line) say(line);
      say("STOP");
      try {
        res.end();
      } catch (e) {}
    };

    const reportId = crypto.randomUUID().slice(0, 8);

    try {
      say(`Report ${reportId} received`);

      const apiUrl = process.env.BUG_REPORT_QUEUE_API;
      const apiKey = process.env.BUG_REPORT_QUEUE_KEY;
      if (!apiUrl || !apiKey) {
        console.error("[bug-report] BUG_REPORT_QUEUE_API / _KEY not configured");
        return finish("The server is not configured to receive reports");
      }

      const b = req.body && typeof req.body === "object" ? req.body : {};
      const error = brCleanError(b.error);
      const files = [];

      // --- screenshot
      say("Processing screenshot…");
      const img = b.screenshot?.attached ? brImageFromBase64(b.screenshot.content) : null;
      if (img) files.push({ name: `screenshot.${img.ext}`, type: img.type, data: img.buf });

      // --- logs
      say("Processing logs…");
      const logs = b.logs?.attached ? brLogsFromBase64(b.logs.content) : null;
      if (logs) files.push({ name: "logs.txt", type: "text/plain", data: Buffer.from(logs.text) });

      // --- error + player data
      files.push({
        name: "error.json",
        type: "application/json",
        data: Buffer.from(brJsonFile(error)),
      });
      const pd = b.player_data ?? null;
      if (pd !== null) {
        files.push({
          name: "player_data.json",
          type: "application/json",
          data: Buffer.from(brJsonFile(pd)),
        });
      }

      // --- discord message
      say("Building message…");
      const ip = getClientIp(req);
      const ipCensor = ip.replace(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/, (_, a) => `${a}.###.###.###`);
      const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 8);
      const playerId =
        pd && typeof pd === "object" ? pd.playerId || pd.player_id || null : null;

      const embed = {
        title: brClip(`🐞 Bug report ${reportId} (${error.type || "?"})`, 256),
        description:
          "```\n" + brClip(error.message.replace(/```/g, "'''"), 1800) + "\n```",
        color: 0xc0392b,
        timestamp: new Date().toISOString(),
        fields: [
          {
            name: "Source",
            value: brClip(`${error.source || "-"}:${error.line}:${error.column}`, 1000),
          },
          { name: "Error time", value: brClip(error.time || "-", 100), inline: true },
          { name: "Player", value: brClip(playerId || "-", 100), inline: true },
          { name: "IP", value: `${ipCensor} (${ipHash})`, inline: true },
          {
            name: "User-Agent",
            value: brClip(req.headers["user-agent"] || "unknown", 300),
          },
          {
            name: "Attachments",
            value: `Screenshot: ${img ? "✅" : "❌ " + brClip(b.screenshot?.error || "none", 100)}\nLogs: ${
              logs ? "✅ " + (logs.count ?? "?") + " lines" : "❌"
            }`,
          },
        ],
      };
      if (img) embed.image = { url: `attachment://screenshot.${img.ext}` };

      const payload = {
        username: "GWENT Bug Reports",
      //  avatar_url: "https://theredmineword.github.io/GWENT/img/web/logo_round.png",
        allowed_mentions: { parse: [] }, // no @everyone / role pings from user text
        embeds: [embed],
      };

      console.log(JSON.stringify(payload));
      // multipart/form-data (Discord webhook format). Serialised by hand so Xano
      // gets the raw body (base64) + the Content-Type header (with the boundary).
      const form = new FormData();
      form.append("payload_json", JSON.stringify(payload));
      files.forEach((f, i) =>
        form.append(`files[${i}]`, new Blob([f.data], { type: f.type }), f.name),
      );
      const encoded = new Response(form); // generates boundary + serialises body
      const mpHeader = encoded.headers.get("content-type"); // multipart/form-data; boundary=...
      const mpContent = Buffer.from(await encoded.arrayBuffer()).toString("base64");

      // --- global rate limit, then hand over to the queue
      if (!brAllowGlobal()) {
        return finish("Too many reports in a short time. Please try again later.");
      }
      say("Sending to the queue…");

      const upstream = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Report-Id": reportId,
        },
        body: JSON.stringify({ content: mpContent, header: mpHeader, _d: payload }),
        signal: AbortSignal.timeout(30000),
      });

      // relay the queue's own stream (clipped). Xano may frame it as SSE
      // ("id: 123" / "data: text" / empty "data:"), so strip those prefixes and
      // ignore empty frames instead of treating "data:" as the last line.
      let lastLine = "";
      let sawDone = false;
      let sawError = false;
      const rawLines = [];
      const onLine = (raw) => {
        rawLines.push(raw);
        let l = raw.trim();
        if (/^id:\s*\S*$/i.test(l)) return; // SSE id frame
        l = l.replace(/^(data|event):\s*/i, "").trim();
        if (!l) return;
        lastLine = l;
        if (/^(done|stop)$/i.test(l)) {
          sawDone = true;
          return;
        }
        if (/error|fail|invalid|denied|reject|exceed|too large|rate.?limit|cannot|can't|unable|"code"\s*:\s*\d+/i.test(l)) sawError = true;
        say("Queue: " + brClip(l, 200));
      };
      if (upstream.body) {
        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split("\n");
          buf = parts.pop();
          parts.forEach(onLine);
        }
        onLine(buf);
      }

      // success = HTTP ok AND (explicit "done"/"stop" line, or the stream ended
      // cleanly without any error-looking line)
      const ok = upstream.ok && !sawError && (sawDone || rawLines.length > 0);
      if (!ok) {
        console.error(
          `[bug-report] ${reportId} queue failed: HTTP ${upstream.status}, sawDone=${sawDone}, last="${lastLine}", raw=${JSON.stringify(rawLines).slice(0, 1000)}`,
        );
        return finish("Failed to add the report to the queue");
      }
      if (!sawDone) console.warn(`[bug-report] ${reportId} queue stream ended without "done" (last="${lastLine}")`);
      console.log(`[bug-report] ${reportId} queued (${files.length} files)`);
      finish(`Report ${reportId} added to the queue. Thank you!`);
    } catch (e) {
      console.error("[bug-report] failed:", e && e.stack ? e.stack : e);
      finish("Internal server error while sending the report");
    }
  },
);
////////
router.get("/api/recive-hearthbeat", (req, res) => {
  const id = req.query.db;

  if (!id || !heartbeatWaiting.has(id)) {
    return res.sendStatus(404);
  }

  heartbeatWaiting.get(id).received = true;

  res.sendStatus(204);
});
router.get(process.env.A, (req, res) => {
  if (!checkCors(req, res)) {
    return res.status(403).json({
      error: "CORS denied",
    });
  }

  const relPath = req.params[0];

  const storageRoot = path.resolve("./storage");

  const filePath = path.resolve(storageRoot, relPath);

  if (!filePath.startsWith(storageRoot)) {
    return res.status(403).end();
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).end();
  }

  res.sendFile(filePath);
});
// router.use(cors({ origin: "*" }));
router.use(express.static(path.resolve(__dirname, "..")));
router.use(
  express.json({
    limit: "700mb",
  }),
);
router.get("/wake", (req, res) => {
  res.json({ ok: "ok" });
});
const STREAM_HEARTBEAT_MS = 20000;
const STREAM_STATE_GRACE_MS = 60000;

const streamAllowedOrigins = [
  ...allowedOrigins,
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:1111",
];

const eventstream = new Map();

function getStreamState(id) {
  let s = eventstream.get(id);
  if (!s) {
    s = {
      js_ready: false,
      game_ready: false,
      playerid: id,
      res: null,
      pending: new Map(), // sent or waiting, not yet acknowledged
      closeTimer: null,
    };
    eventstream.set(id, s);
  }
  return s;
}

const ALLOWED_LOCAL_PORTS = new Set(["8080", "8081", "1111"]);
const ALLOWED_DOMAINS = [
  "gwent.localplayer.dev",
  "theredmineword.github.io",
];

function originMatches(origin) {
  let u;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (u.origin !== origin) return false;

  if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
    return ALLOWED_LOCAL_PORTS.has(u.port);
  }
  if (u.protocol !== "https:") return false;
  return ALLOWED_DOMAINS.some(
    (d) => u.hostname === d || u.hostname.endsWith("." + d)
  );
}

function streamOriginAllowed(req) {
  const claimed = String(req.query.orygin || "");
  const header = req.headers.origin;

  let reason = null;
  if (!claimed) reason = "no orygin param";
  else if (!originMatches(claimed)) reason = "claimed origin not in allowlist";
  else if (header && header !== claimed) reason = "Origin header != claimed";

  if (reason) slog("origin rejected:", { reason, claimed, header });
  return !reason;
}

function streamWrite(s, msg) {
  if (!s.res) return false;
  try {
    s.res.write(`id: ${msg.mid}\ndata: ${JSON.stringify(msg)}\n\n`);
    return true;
  } catch (e) {
    return false;
  }
}

// Send everything unacknowledged, but only once the client JS reported ready.
function flushStream(s) {
  if (!s.res || !s.js_ready) return;
  for (const msg of s.pending.values()) streamWrite(s, msg);
}

function pushStreamMessage(playerId, message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    throw new Error("Each stream payload must be a JSON object");
  }

  // Preserve the complete entry payload used by patchnotes.js (source, title,
  // advanced options, scheduling fields, arbitrary JSON content, etc.).
  const msg = { ...message, mid: crypto.randomUUID() };
  if (msg.id != null) msg.id = String(msg.id);
  if (msg.expire) {
    const expire = new Date(msg.expire);
    if (isNaN(expire)) throw new Error("expire must be a valid date");
    msg.expire = expire.toISOString();
  } else if (msg.expire === undefined) {
    msg.expire = null;
  }
  if (msg.showcountdown === undefined && msg.showCountdown !== undefined) {
    msg.showcountdown = msg.showCountdown;
  }

  const s = getStreamState(String(playerId));
  s.pending.set(msg.mid, msg);
  flushStream(s);
  return msg.mid;
}

function broadcastStreamMessage(message) {
  return Object.keys(playerSockets).map((id) => pushStreamMessage(id, message));
}
// Flip to false to silence all stream logs (or use STREAM_DEBUG=true in env)
const STREAM_DEBUG = process.env.STREAM_DEBUG
  ? process.env.STREAM_DEBUG === "true"
  : true;

const slog = (...args) => {
  if (STREAM_DEBUG) console.log(`[stream ${new Date().toISOString()}]`, ...args);
};

router.get("/stream", (req, res) => {
  const id = String(req.query.id || "");

  slog("connect attempt", {
    id,
    hasSocket: !!playerSockets[id],
    originHeader: req.get("origin"),
    referer: req.get("referer"),
    queryOrigin: req.query.origin,
    queryOrygin: req.query.orygin, // typo detector, remove once client is fixed
    ip: req.ip,
  });

  if (!id || !playerSockets[id]) {
    slog("404 reject: unknown id or no player socket", { id });
    return res.sendStatus(404);
  }
  if (!streamOriginAllowed(req)) {
    slog("403 reject: origin not allowed", { id });
    return res.sendStatus(403);
  }

  const s = getStreamState(id);
  if (s.closeTimer) clearTimeout(s.closeTimer);
  if (s.res) {
    slog("replacing existing stream", { id });
    try {
      s.res.end();
    } catch (e) {}
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");

  s.res = res;

  // Readiness is no longer reported by the page (/stream/ready is legacy),
  // so a connected stream counts as ready and queued events are delivered now.
  s.js_ready = true;
  s.game_ready = true;
  flushStream(s);

  slog("connected", { id, pending: s.pending?.size ?? 0 });

  req.on("close", () => {
    slog("closed", { id });
    if (s.res === res) s.res = null;
    s.closeTimer = setTimeout(() => {
      if (!s.res && !playerSockets[id]) {
        slog("state evicted", { id });
        eventstream.delete(id);
      }
    }, STREAM_STATE_GRACE_MS);
  });
});

// LEGACY: kept so old clients don't get errors. Does nothing.
router.post("/stream/ready", (req, res) => {
  slog("legacy /stream/ready ignored", { id: req.body?.id });
  res.sendStatus(204);
});

router.post("/stream/ack", (req, res) => {
  const { id, mid } = req.body || {};
  const s = eventstream.get(String(id));
  if (!s) {
    slog("ack 404: no stream state", { id, mid });
    return res.sendStatus(404);
  }

  const removed = s.pending.delete(String(mid));
  slog(removed ? "ack ok" : "ack 404: mid not pending", { id, mid });
  res.sendStatus(removed ? 204 : 404);
});

function adminKeyIsValid(value) {
  const a = Buffer.from(String(value || ""));
  const b = Buffer.from(String(ADMIN_ENDPOINT_LOGIN || ""));
  return !!ADMIN_ENDPOINT_LOGIN && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function safeSocketSnapshot(ws) {
  const blocked = new Set([
    "_socket", "_sender", "_receiver", "socket", "req", "upgradeReq",
    "_events", "_eventsCount", "_maxListeners", "heartbeatInterval",
  ]);
  const raw = {};
  for (const [key, value] of Object.entries(ws)) {
    if (blocked.has(key) || typeof value === "function") continue;
    if (key === "user" && value && typeof value === "object") {
      raw.user = { ...value };
    } else if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      raw[key] = value;
    } else if (Array.isArray(value) || (value && typeof value === "object")) {
      try { raw[key] = JSON.parse(JSON.stringify(value)); } catch (e) {}
    }
  }
  return raw;
}

// Admin read endpoint:
//   GET /api/admin/sessions?key=...             -> active sessions and players
//   GET /api/admin/sessions?key=...&fullraw=true -> include safe raw session/socket fields
//   GET /api/admin/sessions?key=...&justcount=true -> connected-player count (integer JSON)
router.get("/api/admin/sessions", (req, res) => {
  if (!adminKeyIsValid(req.query.key)) return res.sendStatus(401);

  const connected = Object.values(playerSockets).filter(
    (ws) => ws && ws.readyState === WebSocket.OPEN,
  );
  if (String(req.query.justcount).toLowerCase() === "true") {
    return res.json(connected.length);
  }

  const fullRaw = String(req.query.fullraw).toLowerCase() === "true";
  const now = Date.now();
  const seenPlayerIds = new Set();
  const toPlayer = (ws) => {
    const connectedAt = Number(ws.connectedAt || ws.connected_at || now);
    const player = {
      playerId: String(ws.playerId || ""),
      connectedSeconds: Math.max(0, Math.floor((now - connectedAt) / 1000)),
      readyState: ws.readyState,
    };
    if (fullRaw) player.raw = safeSocketSnapshot(ws);
    return player;
  };

  // Return actual game sessions, counting only currently open sockets.
  const result = Object.entries(sessions).map(([sessionId, session]) => {
    const sessionPlayers = (session?.players || [])
      .filter((ws) => ws && ws.readyState === WebSocket.OPEN)
      .map((ws) => {
        if (ws.playerId != null) seenPlayerIds.add(String(ws.playerId));
        return toPlayer(ws);
      });
    const item = {
      sessionId,
      playerCount: sessionPlayers.length,
      players: sessionPlayers,
    };
    if (fullRaw) {
      try { item.raw = JSON.parse(JSON.stringify({ ...session, players: undefined })); }
      catch (e) { item.raw = {}; }
    }
    return item;
  }).filter((session) => session.playerCount > 0);

  // A WebSocket can be connected without having created/joined a game session.
  // Include those players instead of returning [] while clients are connected.
  const unassigned = connected.filter((ws) => !seenPlayerIds.has(String(ws.playerId)));
  if (unassigned.length) {
    const item = {
      sessionId: null,
      status: "connected-not-in-session",
      playerCount: unassigned.length,
      players: unassigned.map(toPlayer),
    };
    if (fullRaw) item.raw = { note: "Connected players that have not joined a game session" };
    result.push(item);
  }

  res.json(result);
});

router.post("/api/stream-push", (req, res) => {
  const { key, target, message, payloads } = req.body || {};
  if (!adminKeyIsValid(key)) return res.sendStatus(401);

  // New shape: { key, target: "all" | ["playerId", ...], payloads: [...] }
  // Backwards compatible shape: { key, target: "all" | "playerId", message: {...} }
  const destinations = target === "all"
    ? Object.keys(playerSockets)
    : Array.isArray(target)
      ? [...new Set(target.map(String))]
      : target == null ? [] : [String(target)];
  const batch = payloads !== undefined ? payloads : (message !== undefined ? [message] : null);
  if (!Array.isArray(batch) || batch.length === 0 ||
      batch.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    return res.status(400).json({
      ok: false,
      error: "Provide payloads: [JSON objects] (or legacy message: JSON object)",
    });
  }
  if (!destinations.length) {
    return res.status(400).json({ ok: false, error: "target must be 'all', a player ID, or an array of player IDs" });
  }

  try {
    const results = [];
    for (const playerId of destinations) {
      if (!playerSockets[playerId]) {
        results.push({ playerId, ok: false, error: "player is not connected" });
        continue;
      }
      for (const payload of batch) {
        results.push({ playerId, mid: pushStreamMessage(playerId, payload), ok: true });
      }
    }
    res.json({ ok: true, sent: results.filter((x) => x.ok).length, results });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

intervals.push(
  setInterval(() => {
    for (const s of eventstream.values()) {
      try {
        if (s.res) s.res.write(": ping\n\n");
      } catch (e) {}
    }
  }, STREAM_HEARTBEAT_MS),
);

eventStreamCloseAll = () => {
  for (const s of eventstream.values()) {
    try {
      if (s.res) s.res.end();
    } catch (e) {}
  }
  eventstream.clear();
};
// ============================================================================

router.post("/api/verdict", (req, res) => {
  const { value } = req.body;

  console.log(`Client verdict: ${JSON.stringify(value)}`);

  res.json({
    ok: true,
  });
});
router.post("/api/bot-check", async (req, res) => {
  const ip = getClientIp(req);

  const {
    finger = {},
    canvasFingerprint,
    audioFingerprint,
    webglFingerprint,
    native = {},
  } = req.body || {};

  let geo = {};
  let proxy = {};

  try {
    const geoReq = await fetch(`http://ip-api.com/json/${ip}`);
    geo = await geoReq.json();

    const proxyReq = await fetch(
      `https://proxycheck.io/v2/${ip}?key=111111-222222-333333-44444&vpn=3&risk=2&asn=1`,
    );

    const proxyJson = await proxyReq.json();
    proxy = proxyJson[ip] || {};
  } catch {}

  const result = analyseBot({
    ip,
    headers: req.headers,
    geo,
    proxy,
    finger,
    canvasFingerprint,
    audioFingerprint,
    webglFingerprint,
    native,
  });

  res.json({
    ok: true,
    timestamp: Date.now(),
    ip,
    result,
  });
});
router.get("/api/get-health", (req, res) => {
    const { key } = req.query;
    let checkdchealth = false;
    try {
        checkdchealth = (dcapi?.getHealth()) ?? "func_err";
    } catch (e) {
    }
    if (key !== process.env.ADMIN_ENDPOINT_LOGIN){
        checkdchealth = "401";
    }
    
  const mem = process.memoryUsage();

  res.json({
    status: "ok",

    service: "GWENT Server",

    uptime: {
      seconds: Math.floor(process.uptime()),
      started: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    },

    server: {
      node: process.version,
      environment: process.env.NODE_ENV || "production",
      platform: process.platform,
    },
      checkdchealth: checkdchealth ?? null,
    time: new Date().toISOString(),
  });
});
router.get("/api/custom_sync", (req, res) => {
  res.setHeader("Access-Control-Expose-Headers", "C-L, Content-Length");

  res.setHeader("DrMinewordGwentServer", "yes");

  const sessionId = req.query.session;

  if (!sessionId) {
    return res.status(400).json({ error: "Missing session" });
  }

  const session = sessions[sessionId];

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const payload = JSON.stringify(session.custom.conf ?? null);
  const length = Buffer.byteLength(payload);

  console.log(`Req download custom-server config Content-Length: ${length}`);

  res.setHeader("Content-Type", "application/json");
  res.setHeader("C-L", length);

  // optional
  res.setHeader("Content-Length", length);

  return res.end(payload);
});
router.get("/api/force_update_server", async (req, res) => {
  const { key } = req.query;

  if (key === process.env.ADMIN_ENDPOINT_LOGIN) {
    console.log("[ADMIN] Force update requested.");
    await updateRandomCoin();
    await updateTrafficMonitor();
    await forceUpdate();
    return res.json({
      success: true,
    });
  }

  return res.status(403).json({
    success: false,
    error: "Invalid key.",
  });
});
if (dcapi) {
  // Mount dcapi's own /api/dc router (register/bet/status/scan/push/health -
  // see the HTTP surface comment at the top of dcapi.js) on this run's
  // router, so unmountRouter() in stop() takes it down along with
  // everything else.
  router.use("/api/dc", dcapi.router);

  dcapi
    .init({ sessions, playerSockets, sendToClient: comp_and_send })
    .then(() => console.log("[dcapi] Discord bet integration ready"))
    .catch((e) => console.error("[dcapi] init failed", e));
}
router.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});
router.post(
  "/api/admin/broadcast",
  express.json({ limit: "900mb" }),
  async (req, res) => {
    const login = req.get("X-Admin-Key");
    const { payload } = req.body;

    //   console.log(`${login} !== ${ADMIN_ENDPOINT_LOGIN} (${login !== ADMIN_ENDPOINT_LOGIN})`)
    if (login !== ADMIN_ENDPOINT_LOGIN) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized",
      });
    }

    if (!Array.isArray(payload)) {
      return res.status(400).json({
        ok: false,
        error: "Payload must be an array",
      });
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    let totalSent = 0;

    for (const packet of payload) {
      let sent = 0;

      for (const ws of players) {
        if (comp_and_send(ws, packet)) {
          sent++;
        }
      }

      totalSent += sent;

      console.log(`[ADMIN] Broadcasted packet to ${sent} clients`);

      await sleep(250);
    }

    res.json({
      ok: true,
      packets: payload.length,
      totalSent,
    });
  },
);
router.post("/api/register", async (req, res) => {
  try {
    const { playerId, login, password } = req.body;

    if (!playerId || !login || !password) {
      return res.status(400).json({
        ok: false,
        error: "missingFields",
      });
    }

    const userAgent = req.get("User-Agent") || "unknown";
    const ws = playerSockets[playerId];

    console.log(`REGISTER ATTEMPT login=${req.body.login} ua=${userAgent}`);

    if (!ws) {
      return res.status(404).json({
        ok: false,
        error: "playerNotConnected (Please refresh website)",
      });
    }

    const exists = database.users.find(
      (u) => u.login.toLowerCase() === login.toLowerCase(),
    );

    if (exists) {
      return res.status(409).json({
        ok: false,
        error: "loginTaken",
      });
    }

    const user = {
      id: crypto.randomUUID(),

      login,

      password: encryptPassword(password),
    };

    database.users.push(user);

    await saveDatabase();

    ws.authenticated = true;
    ws.user = user;

    comp_and_send(ws, {
      type: "welcome",
      playerId: ws.playerId,
      login: user.login,
    });

    return res.json({
      ok: true,
      user: {
        id: user.id,
        login: user.login,
      },
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      ok: false,
      error: "serverError",
    });
  }
});
router.post("/api/login", async (req, res) => {
  try {
    const { playerId, login, password } = req.body;

    if (!playerId || !login || !password) {
      return res.status(400).json({
        ok: false,
        error: "missingFields",
      });
    }
    const userAgent = req.get("User-Agent") || "unknown";
    const ws = playerSockets[playerId];

    if (!ws) {
      return res.status(404).json({
        ok: false,
        error: "playerNotConnected",
      });
    }

    const user = database.users.find(
      (u) => u.login.toLowerCase() === login.toLowerCase(),
    );

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "invalidCredentials",
      });
    }

    console.log(
      `LOGGIN ATTEMPT FOR: ${JSON.stringify(user)} wich password input\n-# ${encryptPassword(password)}} ua=${userAgent}`,
    );

    var pass_check = user.password;
    const realPassword = pass_check;

    if (realPassword !== encryptPassword(password)) {
      return res.status(401).json({
        ok: false,
        error: "invalidCredentials",
      });
    }

    ws.authenticated = true;
    ws.user = user;

    comp_and_send(ws, {
      type: "welcome",
      playerId: ws.playerId,
      login: user.login,
    });

    return res.json({
      ok: true,
      user: {
        id: user.id,
        login: user.login,
      },
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      ok: false,
      error: "serverError",
    });
  }
});
router.post("/api/message", (req, res) => {
  const { session_id, player_id, message, type } = req.body;

  // Basic validation
  if (!session_id || !player_id) {
    return res.status(400).json({
      error: "session_id and player_id required",
    });
  }

  // Only allow chat messages
  if (type !== "chat") {
    return res.status(403).json({
      error: "You are not allowed to use that type!!!",
    });
  }

  // Session validation
  const session = sessions[session_id];
  if (!session) {
    return res.status(404).json({
      error: "Session not found",
    });
  }

  // Player validation
  const targetPlayer = session.players.find((p) => p.playerId === player_id);

  if (!targetPlayer) {
    return res.status(404).json({
      error: "Player not found in session",
    });
  }

  // Message validation
  if (typeof message !== "string") {
    return res.status(400).json({
      error: "Message must be text",
    });
  }
  // ---- RATE LIMIT (1 second) ----
  const key = `${session_id}:${player_id}`;
  const now = Date.now();

  if (lastMessageTime[key] && now - lastMessageTime[key] < 1000) {
    return res.status(429).json({
      error: "You're sending messages too fast",
    });
  }

  lastMessageTime[key] = now;

  // Trim whitespace
  let cleanMessage = message.trim();

  // Remove control / weird invisible chars
  cleanMessage = cleanMessage.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

  // Collapse excessive spaces
  cleanMessage = cleanMessage.replace(/\s{2,}/g, " ");

  // Limit message length
  const MAX_MESSAGE_LENGTH = 400;

  if (cleanMessage.length === 0) {
    return res.status(400).json({
      error: "Message cannot be empty",
    });
  }

  if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
    });
  }

  // Optional: block suspicious unicode spam
  // Allows normal unicode text/emojis while filtering odd chars
  const suspiciousPattern = /[\u202E\u202D\u2066-\u2069]/g;

  cleanMessage = cleanMessage.replace(suspiciousPattern, "");

  const payload = {
    type: "chat",
    message: cleanMessage,
    session_id,
    player_id,
  };
  const payload_out = {
    message: cleanMessage,
  };

  try {
    comp_and_send(targetPlayer, payload);

    // Return sent message too
    return res.json({
      ok: true,
      sent: payload_out,
    });
  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: "Failed to send message",
    });
  }
});

router.post("/api/github", async (req, res) => {
  const { key } = req.query;
  if (key !== process.env.ADMIN_ENDPOINT_LOGIN) return res.sendStatus(401);

  const payload = req.body;
  const repo = payload.repository;
  const repoFull = repo?.full_name;

  if (!repoFull) return res.sendStatus(200);

  // 1) Push webhook: store the push details
  if (payload.ref && payload.after && Array.isArray(payload.commits)) {
    const files = [];
    for (const c of payload.commits) {
      for (const f of [
        ...(c.added || []),
        ...(c.modified || []),
        ...(c.removed || []),
      ]) {
        files.push({ filename: f });
      }
    }

    recentPushes.set(payload.after, {
      sha: payload.after,
      before: payload.before,
      files,
      commits: payload.commits,
      repo: repoFull,
      ref: payload.ref,
      time: Date.now(),
    });

    console.log("[PUSH] saved:", payload.after, "files:", files.length);
    return res.sendStatus(200);
  }

  // 2) Deployment status webhook: only proceed on success
  if (
    !payload.deployment_status ||
    payload.deployment_status.state !== "success"
  ) {
    return res.sendStatus(200);
  }

  const deployment = payload.deployment;
  const sha = deployment?.sha;
  if (!sha) return res.sendStatus(200);

  console.log("Pages deployed:", sha);

  // Try cached push first
  const cachedPush = recentPushes.get(sha);

  let files = cachedPush?.files || [];

  // If not cached, fall back to GitHub compare API or commit API
  if (!files.length) {
    const base = deployment?.payload?.before || null;

    if (base) {
      const compareResponse = await fetch(
        `https://api.github.com/repos/${repoFull}/compare/${base}...${sha}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PATCHES_GIT}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "GWENT-Server",
          },
        },
      );

      const compareBody = await compareResponse.json();
      files = (compareBody.files || []).map((f) => ({ filename: f.filename }));
    } else {
      const commitResponse = await fetch(
        `https://api.github.com/repos/${repoFull}/commits/${sha}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PATCHES_GIT}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "GWENT-Server",
          },
        },
      );

      const body = await commitResponse.json();
      files = (body.files || []).map((f) => ({ filename: f.filename }));
    }
  }

  const silentKnownIssueUpdate = isSilentKnownIssueUpdate(files);

  // Save latest deploy info either way
  console.log(
    "[DEPLOY] sha:",
    sha,
    "silentKnownIssueUpdate:",
    silentKnownIssueUpdate,
  );

  if (silentKnownIssueUpdate) {
    // Update any internal state you need here, but do NOT broadcast to clients.
    // This avoids pointless client restarts.
    return res.sendStatus(200);
  }

  // Normal patchnotes broadcast path below
  const commitResponse = await fetch(
    `https://api.github.com/repos/${repoFull}/commits/${sha}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PATCHES_GIT}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "GWENT-Server",
      },
    },
  );

  const commit = await commitResponse.json();
  const commiter = commit?.commit?.author?.name ?? "Unknown";
  const commiterIcon = commit?.author?.avatar_url ?? "";
  const commitMessage = commit?.commit?.message ?? "Message Failed";

  const ping = await fetch(
    `https://theredmineword.github.io/GWENT/change/web-only/ping_news.txt?random=${repoFull}_${sha}`,
  );

  if (!ping.ok) {
    console.log("No patchnote template");
    return res.sendStatus(200);
  }

  let message = await ping.text();

  const filesText = (files || [])
    .map((file) => `• ${file.filename}`)
    .join("\n");

  const vars = {
    commiter,
    "commiter.icon": commiterIcon,
    commit: sha.substring(0, 7),
    "commit.full": sha,
    commits: commitMessage,
    files: filesText,
    repo: repo.name,
    branch: deployment.ref ?? "main",
    compare: `https://github.com/${repoFull}/compare/${sha}^...${sha}`,
    time: new Date().toISOString(),
  };

  for (const [k, v] of Object.entries(vars)) {
    message = message.replaceAll(`{{${k}}}`, String(v));
  }

  const packet = JSON.stringify({
    type: "show_patchnotes",
    content: message,
  });

  let sent = 0;
  for (const ws of players) {
    if (comp_and_send(ws, packet)) sent++;
  }

  console.log(`sent to: ${sent} players`);
  res.sendStatus(200);
});
function broadcastToSession(sessionId, payload) {
  console.log(`broadcastToSession() ${sessionId}, ${payload}`);
  const session = sessions[sessionId];
  if (!session) return false;
  session.players.forEach((player) => {
    try {
      console.log(`Sending mod msg to ${JSON.stringify(player.playerId)}`);
      // [FIX] comp_and_send routes through the player's peer (queues during the grace period)
      comp_and_send(player, {
        type: "moderation",
        message: payload || null,
        session_id: sessionId,
        player_id: player.playerId,
      });
    } catch (e) {
      console.log(`Broadcast error: ${JSON.stringify(e)}`);
    }
  });

  return true;
}
riskinfo = "{}";
upgradeHandler = (req, socket, head) => {
  try {
    const host = req.headers.host;
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (isBlockedDomain(host) || isBlockedDomain(origin) || isBlockedDomain(referer)) {
      console.log(
        `[TrafficMonitor] Blocked WebSocket upgrade host=${host} origin=${origin} referer=${referer}`
      );

      if (!socket.destroyed) {
        socket.write(
          "HTTP/1.1 403 Forbidden\r\n" +
          "Connection: close\r\n" +
          "\r\n"
        );
        socket.destroy();
      }
      return;
    }

    // never hand the same socket to ws twice (that error also destroyed the good connection)
    if (upgradedSockets.has(socket)) return;
    upgradedSockets.add(socket);

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } catch (err) {
    // If this throws unhandled, it takes down the whole process (no
    // uncaughtException handler exists), which looks like a silent crash
    // and can also abort in-flight upgrades for non-blocked hosts if this
    // listener races with another 'upgrade' listener on the same server
    // (e.g. the ws library's own internal listener, if `wss` was created
    // with `{ server }` instead of `{ noServer: true }`).
    console.error("[Upgrade] Unhandled error during upgrade:", err && err.stack ? err.stack : err);
    try {
      if (!socket.destroyed) socket.destroy();
    } catch (e) {}
  }
};
server.on("upgrade", upgradeHandler);
// [FIX] Runs ONLY for brand-new connections. ws.playerId is already set by sock.attach(),
// and the message/close/error handlers are no longer attached here (see handleMessage / cleanupPlayer).
const setupConnection = async (ws, req) => {
  ws.authenticated = false;
  ws.user = null;
  ws.connectedAt = Date.now();

  playerSockets[ws.playerId] = ws;

  // [FIX] HTTP heartbeat disabled: socket.js already does ping/pong + timeout, and with
  // trafficMonitor.firewsclose=true this killed any client that could not reach /api/recive-hearthbeat.

  const ip = getClientIp(req);
  const ip2 = crypto.createHash("sha256").update(ip).digest("hex");
  const ip_censor = ip.replace(
    /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/,
    (_, a, b, c, d) => `${a}.###.###.###`,
  );
  ws.ip_censor = ip_censor; // [FIX] used by handleMessage (no more closure variable)
  console.log(`-# Ip connected: ${ip_censor} hash ${ip2}`);
  players.push(ws);

  // optional geo lookup
  let geo = {};

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`, { signal: AbortSignal.timeout(3000) });
    geo = await res.json();
    geo.query = ip_censor;
    //ws.bot = bot;
    const res2 = await fetch(
      `https://proxycheck.io/v2/${ip}?key=111111-222222-333333-444444&vpn=3&asn=1&risk=2`,
      { signal: AbortSignal.timeout(3000) },
    );
    geo2 = await res2.json();
    geo.risk = {
      vpn: geo2[ip].vpn,
      risk: geo2[ip].risk,
      type: geo2[ip].type,
      proxy: geo2[ip].proxy,
    };
    riskinfo = JSON.stringify({
      vpn: geo2[ip].vpn,
      risk: geo2[ip].risk,
      type: geo2[ip].type,
      proxy: geo2[ip].proxy,
    });
    // geo.geo2 = geo2
  } catch (e) {}

  const country = geo.country || "Unknown";
  country_code = geo.countryCode || "JC";
  const region = geo.regionName || "Unknown";
  const city = geo.city || "Unknown";
  const isp = geo.isp || "Unknown";
  geo.ThatRealIp = ip2;
  const userAgent = req.headers["user-agent"] || "unknown";
  // Send welcome
  //comp_and_send(ws, JSON.stringify({
  // type: 'welcome',
  // playerId: ws.playerId,
  // "_ip": geo
  //}));
  console.log(
    `AUTH REQ\n-# ${JSON.stringify({
      type: "authRequired",
      playerId: ws.playerId,
      _ip: geo,
      _useragent: userAgent,
      needed: auth_needed,
    })}`,
  );
  ws.userAgent = userAgent;
  comp_and_send(
    ws,
    JSON.stringify({
      type: "authRequired",
      playerId: ws.playerId,
      _ip: geo,
      _useragent: userAgent,
      needed: auth_needed,
    }),
  );

  if (!auth_needed) {
    ws.authenticated = true;
    comp_and_send(
      ws,
      JSON.stringify({ type: "welcome", playerId: ws.playerId }),
    );
  }

  console.log(
    `|| Player ${ws.playerId} connected from ${ip_censor} (${country}) | ${region}, ${city} | ISP: ${isp} | Risk: ${JSON.stringify(geo.risk)}\nAuth needed? ${auth_needed}`,
  );

  // Send a welcome message with the player's ID
  // comp_and_send(ws, JSON.stringify({ type: 'welcome', playerId: ws.playerId }));
  console.log(`|| Player ${ws.playerId} connected`);
  console.log(
    JSON.stringify(
      {
        player: ws.playerId,
        ip_censor,
        country: geo.country,
        region: geo.regionName,
        city: geo.city,
        isp: geo.isp,
        org: geo.org,
        timezone: geo.timezone,
        proxy: geo.proxy,
        hosting: geo.hosting,
      },
      null,
      2,
    ),
  );
};

// [FIX] hoisted out of connectionHandler so handleMessage() can use them
let sessiondigitLength = 5;
let custom_server_prefix = "!CUSTOM%s!";
console.warn(`Session digits code ${sessiondigitLength}`);
function sessionIdToJoinCode(sessionId, digitLength = sessiondigitLength) {
// Hash session ID
const hash = crypto.createHash("sha256").update(sessionId).digest();

// Convert first 4 bytes into number
const num = hash.readUInt32BE(0);

// Range for requested digit length
const min = 10 ** (digitLength - 1);
const max = 10 ** digitLength;

// Generate fixed-length code
return ((num % (max - min)) + min).toString();
}

// [FIX] was ws.on("message", ...) inside connectionHandler. Called by sock.onMessage with the
// already-decoded, de-duplicated object (no "_s"). Works for both new and resumed sockets.
function handleMessage(ws, data) {
    const ip_censor = ws.ip_censor || "unknown";
    const msg = JSON.stringify(data);
    const allowedBeforeAuth = ["ping"];

    if (!ws.authenticated && !allowedBeforeAuth.includes(data.type)) {
      if (!auth_needed) {
        ws.authenticated = true;
        comp_and_send(
          ws,
          JSON.stringify({ type: "welcome", playerId: ws.playerId }),
        );
      } else {
        comp_and_send(ws, {
          type: "authRequired",
          playerId: ws.playerId,
          needed: auth_needed,
        });
      }

      return;
    }
    console.log(`|| Message recived: \`\`\`\n${msg}\`\`\``);
    if (data.type === "ping") {
      console.log(`|| Sombody pinged server!!!`);
    }
    if (data.type === "createSession") {
      const conf = data.custom_server?.active ? data.custom_server.conf : null;

      const sessionId = compressString(
        `Ip:${ip_censor}-PlayerId:${ws.playerId}(${country_code})-Risk:${riskinfo}-IsCustom:${!!conf}\nRandomstring:${generateCode()}`,
      ).toString("base64");

      var a = sessionIdToJoinCode(sessionId, sessiondigitLength);
      const joinCode = `${!!conf ? custom_server_prefix.replace("%s", a) : a}`;

      sessions[sessionId] = {
        id: sessionId,
        joinCode,
        players: [ws],
        playersReady: 0,
        custom: {
          active: !!conf,
          conf: conf || null,
        },
      };

      joinIndex[joinCode] = sessionId;
      ws.sessionId = sessionId;

      comp_and_send(
        ws,
        JSON.stringify({
          type: "sessionCreated",
          id: sessionId,
          code: joinCode,
          custom: !!sessions[sessionId].custom?.active,
        }),
      );
    }

    if (data.type === "cancelSession") {
      const sessionId = data.code;
      if (!sessions[sessionId]) return;

      console.log("Try notify all remaining players");
      sessions[ws.sessionId].players.forEach((player) => {
        try {
          if (player === sessions[ws.sessionId].players[0]) return;
          console.log(`${player.id} cancelled try`);
          console.log(`SEND unready session, silent: ${data?.silent || false}`);
          if (`${data?.silent || false}` === `${false}`) {
            comp_and_send(player, {
                  type: "sessionUnready",
                  reason: "sessionCancelled",
                });
          }
        } catch (e) {
          console.error("cancelSession notify error:", e);
        }
      });

      console.log(`|| Player ${ws.playerId} cancelled Session ${sessionId}`);
      if (dcapi) {
        dcapi
          .onPlayerLeftSession(ws, sessionId)
          .catch((e) => console.error("[dcapi] onPlayerLeftSession error", e));
      }
      try {
        delete joinIndex[sessions[ws.sessionId].joinCode];
      } catch (e) {}
      delete sessions[ws.sessionId];
    }

    if (data.type === "leaveSession") {
      const sessionId = data.code;
      if (!sessions[sessionId]) return;

      console.log(`|| Player ${ws.playerId} left Session ${sessionId}`);
      if (dcapi) {
        dcapi
          .onPlayerLeftSession(ws, sessionId)
          .catch((e) => console.error("[dcapi] onPlayerLeftSession error", e));
      }
      sessions[sessionId].players = sessions[sessionId].players.filter(
        (player) => player !== ws,
      );
      broadcastToSession(
        ws.sessionId,
        `Player ${ws.playerId} left the session`,
      );
    }

    // manual hand sync dump to opponent

    if (data.type === "joinSession") {
      let joinCode = null;
      let sessionId = false;
      try {
        joinCode = data.sessionId;

        sessionId = joinIndex[joinCode];
      } catch (e) {
        console.log("err session id", e);
        comp_and_send(
          ws,
          JSON.stringify({
            type: "sessionInvalid",
          }),
        );
        return;
      }
      try {
        if (!sessionId) {
          comp_and_send(
            ws,
            JSON.stringify({
              type: "sessionInvalid",
            }),
          );
          return;
        }
      } catch (e) {
        console.log("err session id", e);
        comp_and_send(
          ws,
          JSON.stringify({
            type: "sessionInvalid",
          }),
        );
        return;
      }

      const session = sessions[sessionId];

      if (session.players.length >= 2) {
        comp_and_send(
          ws,
          JSON.stringify({
            type: "sessionFull",
          }),
        );
        return;
      }

      session.players.push(ws);

      ws.sessionId = sessionId;

      comp_and_send(
        ws,
        JSON.stringify({
          type: "sessionJoined",
          code: joinCode,
          id: sessionId,
          custom: !!session.custom?.active,
        }),
      );
      sessions[sessionId].players.forEach((player, index) => {
        comp_and_send(player, { type: "sessionReady", player: index + 1 });
      });

      console.log(`Player joined ${joinCode}`);
      broadcastToSession(
        ws.sessionId,
        `Session ${ws.sessionId} chat is now active. Please keep conversations civilized. Session IDs and player IDs may later be linked via logs!`,
      );
    }

    if (data.type === "gameStart") {
      if (ws.sessionId && sessions[ws.sessionId]) {
        const session = sessions[ws.sessionId];
        if (!sessions[ws.sessionId]?.firstPlayer) {
          //        broadcastToSession(
          //         ws.sessionId,
          //         `Game started! Good Luck Everyone!!`,
          //       );

          const firstPlayer = pickFirstPlayer(session);
          sessions[ws.sessionId].firstPlayer = firstPlayer;
          sessions[ws.sessionId].special = "";
          //console.log(`Random coing ${JSON.stringify(random_coin)}`)
          for (const special of random_coin) {
            var roll = Math.random() * 100;
            if (process.env?.deep_log_coin ?? false) {
              console.warn(
                "Roll/chance",
                roll,
                special.chance,
                "  ",
                roll < special.chance,
              );
            }
            if (roll < special.chance) {
              sessions[ws.sessionId].special = special.val;
              break; // Stop after the first matching special
            }
          }
          console.log(
            `First player (coinflip) ${JSON.stringify(firstPlayer)}${sessions[ws.sessionId].special || ""}`,
          );
        }
        console.log("firstPlayer = ", sessions[ws.sessionId].firstPlayer);
        session.players.forEach((player) => {
          comp_and_send(player, {
                type: "coinToss",
                player: sessions[ws.sessionId].firstPlayer,
                special: sessions[ws.sessionId].special,
              });
        });
      }
    }

    if (data.type === "initial_reDraw") {
      try {
        delete sessions[ws.sessionId].firstPlayer;
        delete sessions[ws.sessionId].special;
      } catch (e) {}
      if (ws.sessionId && sessions[ws.sessionId]) {
        const session = sessions[ws.sessionId];
        session.playersReady += 1;

        console.log(
          `|| Players ready in session ${ws.sessionId}: ${session.playersReady}`,
        );

        if (session.playersReady === 2) {
          session.players.forEach((player) => {
            comp_and_send(player, { type: "start" });
          });
          session.playersReady = 0;
        }
      }
    }

if (data.type === "matchResult" && dcapi) {
  try {
    dcapi.onMatchResult(ws, data);
  } catch (e) {
    console.error("[dcapi] onMatchResult error", e);
  }
}

if (data.type === "discord_dm_me") {
  if (dcapi) {
    try {
      dcapi.onDmRequest(ws, data);
    } catch (e) {
      console.error("[dcapi] onDmRequest error", e);
    }
  }
  return;
}

    // Relay messages to the other player in the same session
    if (blockedRelayTypes.has(data.type)) {
  return;
}
    if (ws.sessionId) {
      const sessionPlayers = sessions[ws.sessionId]?.players || [];
      sessionPlayers.forEach((player) => {
        if (player !== ws) {
          comp_and_send(player, data);
        }
      });
    }
  }

// [FIX] was ws.on("close") / ws.on("error") inside connectionHandler. Now called from the
// onDisconnect hook, i.e. only after the reconnect grace period ended (or the client left with code 4000).
function cleanupPlayer(ws) {
    clearInterval(ws.heartbeatInterval);
    if (dcapi) {
      dcapi
        .onDisconnect(ws)
        .catch((e) => console.error("[dcapi] onDisconnect error", e));
    }
    console.log(`|| Player ${ws.playerId} disconnected`);
    delete playerSockets[ws.playerId];
    // Check if the player has an active session
    if (ws.sessionId && sessions[ws.sessionId]) {
      const session = sessions[ws.sessionId];

      // Check if the player is the creator of the session
      if (session.players[0] === ws) {
        // If the creator disconnects, delete the session
        console.log(
          `|| Deleting session ${ws.sessionId} because the creator left`,
        );
        if (session.players.length > 1) {
          try {
            // session.players[1].send(compressPayload(JSON.stringify({ type: 'unReady' })));
            comp_and_send(session.players[1], { type: "sessionUnready" });
          } catch (e) {
            console.log("Err", e);
          }
        }
        try {
          delete joinIndex[sessions[ws.sessionId].joinCode];
        } catch (e) {}
        delete sessions[ws.sessionId];
      } else {
        try {
          // If a non-creator disconnects, remove them from the session and notify the creator
          session.players = session.players.filter((player) => player !== ws);
          comp_and_send(session.players[0], { type: "unReady" });
          comp_and_send(session.players[0], { type: "sessionUnready" });
          console.log(
            `|| Player ${ws.playerId} left the session ${ws.sessionId}`,
          );
          broadcastToSession(
            ws.sessionId,
            `Player ${ws.playerId} left the session`,
          );
        } catch (e) {
          console.log("Err", e);
        }
      }
    }

    // Remove the player from the players list
    players = players.filter((player) => player !== ws);
}

const onConnection = (ws, req) => {
  // [FIX] attach() assigns ws.playerId (synchronous generatePlayerId) - it used to receive a Promise
  const { resumed } = sock.attach(ws, req, () => generatePlayerId(req));

  if (!resumed) {
    setupConnection(ws, req).catch((e) => console.error("[setupConnection]", e));
  }
  // both new and resumed sockets must register the app-level handler
  sock.onMessage(ws, (data) => handleMessage(ws, data));
};
wss.on("connection", onConnection);
listeners.push(onConnection);

// [FIX] hooks live here (inside start()) so they can see sessions/players/playerSockets
sock.init({
  onLost: (ws, graceMs) => {
    console.log(`|| Player ${ws.playerId} lost connection, waiting ${graceMs}ms`);
  },
  onResume: (newWs, oldWs) => {
    newWs.ip_censor = oldWs.ip_censor;
    // everything that stored the old ws object must now point at the new one
    playerSockets[newWs.playerId] = newWs;
    players = players.map((p) => (p === oldWs ? newWs : p));
    const s = newWs.sessionId && sessions[newWs.sessionId];
    if (s) s.players = s.players.map((p) => (p === oldWs ? newWs : p));
    console.log(`|| Player ${newWs.playerId} is back`);
  },
  onDisconnect: (ws) => cleanupPlayer(ws),
});

console.log("start lesser log");
(async () => {
  console.log("start higher log");
  await loadDatabase();
  await updateRandomCoin();
  console.log(`## SERVER AWAKE\n-# Date: ${new Date()}`);
})();
};