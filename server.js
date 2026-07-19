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
const analyseBot = require("./server-side/botDetector.js");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8081;

const auth_needed = false;

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

console.warn("PROCCESS ENV", process.env, process.env.VERIF || false);

const webhookUrl = process.env.WEBHOOK_LOGS_URL;

console.log = (message) => {
  // keep console output
  process.stdout.write(message + "\n");

  // only send if env exists
  if (!webhookUrl) return;

  fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [
        {
          description: String(message).slice(0, 4000),
        },
      ],
    }),
  }).catch(() => {
    // fail silently
  });
};

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

// ---------- send compressed ----------
function comp_and_send(ws, objectOrString) {
  try {
    if (ws.readyState !== WebSocket.OPEN) {
      console.log("Socket send failed reason: socket not open");
      return false;
    }

    const json =
      typeof objectOrString === "string"
        ? objectOrString
        : JSON.stringify(objectOrString);

    const compressed = compressPayload(json);

    ws.send(compressed, { binary: true }, (err) => {
      if (err) {
        console.log("Socket send failed reason: " + err.message);
      }
    });

    return true;
  } catch (err) {
    console.log("Socket send failed reason: " + err.message);
    return false;
  }
}

// ---------- receive compressed ----------
function decodeIncoming(message) {
  try {
    const json = decompressPayload(message);
    return JSON.parse(json);
  } catch (err) {
    console.log("Socket decode failed reason: " + err.message);
    return null;
  }
}

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
app.use(cors({ origin: "*" }));
app.get(process.env.A, (req, res) => {
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
// app.use(cors({ origin: "*" }));
app.use(express.static(__dirname));
app.use(
  express.json({
    limit: "700mb",
  }),
);
app.get("/wake", (req, res) => {
  res.json({ ok: "ok" });
});
app.post("/api/verdict", (req, res) => {
  const { value } = req.body;

  console.log(`Client verdict: ${JSON.stringify(value)}`);

  res.json({
    ok: true,
  });
});
app.post("/api/bot-check", async (req, res) => {
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
      `https://proxycheck.io/v2/${ip}?key=YOURKEY&vpn=3&risk=2&asn=1`,
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
app.get("/api/get-health", (req, res) => {
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
    time: new Date().toISOString(),
  });
});
app.get("/api/custom_sync", (req, res) => {
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
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.post(
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
app.post("/api/register", async (req, res) => {
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
app.post("/api/login", async (req, res) => {
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
app.post("/api/message", (req, res) => {
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
    targetPlayer.send(compressPayload(JSON.stringify(payload)));

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

app.post("/api/github", async (req, res) => {
  const payload = req.body;

  // Only handle successful deployments
  if (
    !payload.deployment_status ||
    payload.deployment_status.state !== "success"
  ) {
    return res.sendStatus(200);
  }

  const deployment = payload.deployment;
  const repo = payload.repository;

  const sha = deployment.sha;

  console.log("Pages deployed:", sha);

  // Fetch commit info
const commitResponse = await fetch(
  `https://api.github.com/repos/${repo.full_name}/commits/${sha}`,
  {
    headers: {
      Authorization: `Bearer ${process.env.PATCHES_GIT}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "GWENT-Server"
    }
  }
);

console.log(commitResponse.status);

const body = await commitResponse.text();
  console.log(`<https://api.github.com/repos/${repo.full_name}/commits/${sha}>\n\`${JSON.stringify(body)}\``);
  const commit = body;
  const commiter = commit?.commit?.author?.name ?? "Unknown";
  const commiterIcon = commit?.author?.avatar_url ?? "";
  const commitMessage = commit?.commit?.message ?? "Message Failed";

  const files = commit?.files ?? [];

  // Fetch template
  const ping = await fetch(
    `https://theredmineword.github.io/GWENT/change/web-only/ping_news.txt?random=${repo.full_name}_${sha}`,
  );

  if (!ping.ok) {
    console.log("No patchnote template");
    return res.sendStatus(200);
  }

  let message = await ping.text();

  const filesText = files
    .map((file) => {
      let prefix = " ";

      switch (file.status) {
        case "added":
          prefix = "+";
          break;

        case "removed":
          prefix = "-";
          break;

        case "modified":
          prefix = "---";
          break;

        case "renamed":
          prefix = ">>>";
          break;

        default:
          prefix = "?";
      }

      return `${prefix} ${file.filename}`;
    })
    .join("\n");
  // Variables available inside template
  const vars = {
    commiter,
    "commiter.icon": commiterIcon,

    commit: sha.substring(0, 7),
    "commit.full": sha,

    commits: commitMessage,

    files: filesText,

    repo: repo.name,

    branch: deployment.ref ?? "main",

    compare: `https://github.com/${repo.full_name}/compare/${sha}^...${sha}`,

    time: new Date().toISOString(),
  };

  // Replace {{variable}}
  for (const [key, value] of Object.entries(vars)) {
    message = message.replaceAll(`{{${key}}}`, value);
  }

  console.log(
    `\`\`\`\n${message.replaceAll("\\", "\/\/").replaceAll("`", "/\\`")}\`\`\``,
  );
  console.log(`Vars: \`\`\`json\n${JSON.stringify(vars)} \`\`\``);

  // Send to all clients
  packet = JSON.stringify({
    type: "show_patchnotes",
    content: message,
  });
  var sent = 0;
  for (const ws of players) {
    if (comp_and_send(ws, packet)) {
      sent++;
    }
  }
  console.log(`sended to: ${sent} players`);

  res.sendStatus(200);
});
function broadcastToSession(sessionId, payload) {
  console.log(`broadcastToSession() ${sessionId}, ${payload}`);
  const session = sessions[sessionId];
  if (!session) return false;
  let payload2 = null;
  let data = null;
  session.players.forEach((player) => {
    try {
      if (player.readyState === WebSocket.OPEN) {
        console.log(`Sending mod msg to ${JSON.stringify(player.playerId)}`);
        payload2 = {
          type: "moderation",
          message: payload || null,
          session_id: sessionId,
          player_id: player.playerId,
        };
        data = compressPayload(JSON.stringify(payload2));
        player.send(data);
      }
    } catch (e) {
      console.log(`Broadcast error: ${JSON.stringify(e)}`);
    }
  });

  return true;
}
riskinfo = "{}";
wss.on("connection", async (ws, req) => {
  ws.authenticated = false;
  ws.user = null;
  ws.playerId = await generatePlayerId(req);

  playerSockets[ws.playerId] = ws;

  const ip = getClientIp(req);
  const ip2 = crypto.createHash("sha256").update(ip).digest("hex");
  const ip_censor = ip.replace(
    /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/,
    (_, a, b, c, d) => `${a}.###.###.###`,
  );
  console.log(`-# Ip connected: ${ip_censor} hash ${ip2}`);
  players.push(ws);

  // optional geo lookup
  let geo = {};

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`);
    geo = await res.json();
    geo.query = ip_censor;
    //ws.bot = bot;
    const res2 = await fetch(
      `https://proxycheck.io/v2/${ip}?key=111111-222222-333333-444444&vpn=3&asn=1&risk=2`,
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
  let sessiondigitLength = 4;
  function sessionIdToJoinCode(sessionId, digitLength = 4) {
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
  ws.on("message", (message) => {
    const msg_is = decompressPayload(message);
    const data = JSON.parse(msg_is);
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

      const joinCode = `${!!conf ? `!Custom!-` : ""}${sessionIdToJoinCode(sessionId, sessiondigitLength)}`;

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
            player.send(
              compressPayload(
                JSON.stringify({
                  type: "sessionUnready",
                  reason: "sessionCancelled",
                }),
              ),
            );
          }
        } catch (e) {
          console.error("cancelSession notify error:", e);
        }
      });

      console.log(`|| Player ${ws.playerId} cancelled Session ${sessionId}`);
      try {
        delete joinIndex[sessions[ws.sessionId].joinCode];
      } catch (e) {}
      delete sessions[ws.sessionId];
    }

    if (data.type === "leaveSession") {
      const sessionId = data.code;
      if (!sessions[sessionId]) return;

      console.log(`|| Player ${ws.playerId} left Session ${sessionId}`);
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
        player.send(
          compressPayload(
            JSON.stringify({ type: "sessionReady", player: index + 1 }),
          ),
        );
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

          const firstPlayer =
            session.players[Math.floor(Math.random() * session.players.length)]
              .playerId;
          sessions[ws.sessionId].firstPlayer = firstPlayer;
          sessions[ws.sessionId].special =
            Math.random() < 0.05 ? "_lambert" : "";
          console.log(
            `First player (coinflip) ${JSON.stringify(firstPlayer)}${sessions[ws.sessionId].special || ""}`,
          );
        }
        console.log("firstPlayer = ", sessions[ws.sessionId].firstPlayer);
        session.players.forEach((player) => {
          player.send(
            compressPayload(
              JSON.stringify({
                type: "coinToss",
                player: sessions[ws.sessionId].firstPlayer,
                special: sessions[ws.sessionId].special,
              }),
            ),
          );
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
            player.send(compressPayload(JSON.stringify({ type: "start" })));
          });
          session.playersReady = 0;
        }
      }
    }

    // Relay messages to the other player in the same session
    if (ws.sessionId) {
      const sessionPlayers = sessions[ws.sessionId]?.players || [];
      sessionPlayers.forEach((player) => {
        if (player !== ws) {
          player.send(compressPayload(JSON.stringify(data)));
        }
      });
    }
  });
  ws.on("error", (err) => {
    console.log(`Socket error ${ws.playerId}:`, err.code, err.message);
    try {
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
              session.players[1].send(
                compressPayload(JSON.stringify({ type: "sessionUnready" })),
              );
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
            session.players[0].send(
              compressPayload(JSON.stringify({ type: "unReady" })),
            );
            session.players[0].send(
              compressPayload(JSON.stringify({ type: "sessionUnready" })),
            );
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
      // });
    } catch (e) {
      console.error(e);
    }
  });
  ws.on("close", () => {
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
            session.players[1].send(
              compressPayload(JSON.stringify({ type: "sessionUnready" })),
            );
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
          session.players[0].send(
            compressPayload(JSON.stringify({ type: "unReady" })),
          );
          session.players[0].send(
            compressPayload(JSON.stringify({ type: "sessionUnready" })),
          );
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
  });
});

(async () => {
  await loadDatabase();

  server.listen(PORT, () => {
    console.log(`>>> Server running ${PORT}`);
    console.log(`ADDON SPECIAL: ${process.env.B}`);
    if (process.env.B === "YES") {
      console.log("TRY INIT ADDON");
      init_addon();
    }
  });
})();
