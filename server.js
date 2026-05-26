const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const zlib = require("zlib");
const { json } = require("stream/consumers");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8081;

app.use(cors({ origin: '*' }));



let sessions = {};
const joinIndex = {};
let players = [];
let nextPlayerId = 1;

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
    console.log(`Bytes before ${input.length}\nBytes after ${compressed.length}\nCompressed% ${percentSaved(input.length, compressed.length)}%\nPayload sha ${sha256(compressed)}`);
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
        `Payload sha ${sha256(compressed)}`
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
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
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
const lastMessageTime = {};
// Serve all client files (index.html, JS, CSS, etc.)
app.use(express.static(__dirname));
app.use(express.json());
app.get("/wake", (req, res) => {
  res.json({ ok: "ok" });
});
app.get("/api/custom_sync", (req, res) => {
    res.setHeader(
        "Access-Control-Expose-Headers",
        "C-L, Content-Length"
    );

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

    console.log(
        `Req download custom-server config Content-Length: ${length}`
    );

    res.setHeader("Content-Type", "application/json");
    res.setHeader("C-L", length);

    // optional
    res.setHeader("Content-Length", length);

    return res.end(payload);
});
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.post("/api/message", (req, res) => {
  const { session_id, player_id, message, type } = req.body;

  // Basic validation
  if (!session_id || !player_id) {
    return res.status(400).json({
      error: "session_id and player_id required"
    });
  }

  // Only allow chat messages
  if (type !== "chat") {
    return res.status(403).json({
      error: "You are not allowed to use that type!!!"
    });
  }

  // Session validation
  const session = sessions[session_id];
  if (!session) {
    return res.status(404).json({
      error: "Session not found"
    });
  }

  // Player validation
  const targetPlayer = session.players.find(
    p => p.playerId === player_id
  );

  if (!targetPlayer) {
    return res.status(404).json({
      error: "Player not found in session"
    });
  }

  // Message validation
  if (typeof message !== "string") {
    return res.status(400).json({
      error: "Message must be text"
    });
  }
    // ---- RATE LIMIT (1 second) ----
  const key = `${session_id}:${player_id}`;
  const now = Date.now();

  if (lastMessageTime[key] && now - lastMessageTime[key] < 1000) {
    return res.status(429).json({
      error: "You're sending messages too fast"
    });
  }

  lastMessageTime[key] = now;

  // Trim whitespace
  let cleanMessage = message.trim();

  // Remove control / weird invisible chars
  cleanMessage = cleanMessage.replace(
    /[\x00-\x1F\x7F-\x9F]/g,
    ""
  );

  // Collapse excessive spaces
  cleanMessage = cleanMessage.replace(/\s{2,}/g, " ");

  // Limit message length
  const MAX_MESSAGE_LENGTH = 400;

  if (cleanMessage.length === 0) {
    return res.status(400).json({
      error: "Message cannot be empty"
    });
  }

  if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`
    });
  }

  // Optional: block suspicious unicode spam
  // Allows normal unicode text/emojis while filtering odd chars
  const suspiciousPattern =
    /[\u202E\u202D\u2066-\u2069]/g;

  cleanMessage = cleanMessage.replace(
    suspiciousPattern,
    ""
  );

  const payload = {
    type: "chat",
    message: cleanMessage,
    session_id,
    player_id
  };
  const payload_out = {
    message: cleanMessage
  };

  try {
    targetPlayer.send(
      compressPayload(JSON.stringify(payload))
    );

    // Return sent message too
    return res.json({
      ok: true,
      sent: payload_out
    });
  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: "Failed to send message"
    });
  }
});
function broadcastToSession(sessionId, payload) {
  console.log(`broadcastToSession() ${sessionId}, ${payload}`);
  const session = sessions[sessionId];
  if (!session) return false;
  let payload2 = null;
  let data = null;
  session.players.forEach(player => {
    try {
      if (player.readyState === WebSocket.OPEN) {
        console.log(`Sending mod msg to ${JSON.stringify(player.playerId)}`);
         payload2 = {
    type: "moderation",
    message: payload || null,
    session_id: sessionId,
    player_id: player.playerId
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
wss.on('connection', async (ws, req) => {
  ws.playerId = await generatePlayerId(req);
  
  const ip = getClientIp(req);
  const ip2 = crypto
    .createHash("sha256")
    .update(ip)
    .digest("hex")
  const ip_censor = ip.replace(
  /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/,
  (_, a, b, c, d) => `${a}.###.###.###`
);;
  console.log(`-# Ip connected: ${ip_censor} hash ${ip2}`);
  players.push(ws);

  // optional geo lookup
  let geo = {};

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`);
    geo = await res.json();
    geo.query = ip_censor;
    const res2 = await fetch(`https://proxycheck.io/v2/${ip}?key=111111-222222-333333-444444&vpn=3&asn=1&risk=2`);
    geo2 = await res2.json();
    geo.risk = {
      vpn: geo2[ip].vpn,
      risk: geo2[ip].risk,
      type: geo2[ip].type,
      proxy: geo2[ip].proxy
    }
    riskinfo = JSON.stringify({
      vpn: geo2[ip].vpn,
      risk: geo2[ip].risk,
      type: geo2[ip].type,
      proxy: geo2[ip].proxy
    });
    // geo.geo2 = geo2
  } catch (e) {}

  const country = geo.country || "Unknown";
  country_code = geo.countryCode || "JC";
  const region = geo.regionName || "Unknown";
  const city = geo.city || "Unknown";
  const isp = geo.isp || "Unknown";
  geo.ThatRealIp = ip2;
  // Send welcome
  comp_and_send(ws, JSON.stringify({
    type: 'welcome',
    playerId: ws.playerId,
    "_ip": geo
  }));

  console.log(
    `|| Player ${ws.playerId} connected from ${ip_censor} (${country}) | ${region}, ${city} | ISP: ${isp} | Risk: ${JSON.stringify(geo.risk)}`
  );

  // Send a welcome message with the player's ID
  // comp_and_send(ws, JSON.stringify({ type: 'welcome', playerId: ws.playerId }));
  console.log(`|| Player ${ws.playerId} connected`);
console.log(JSON.stringify({
  player: ws.playerId,
  ip_censor,
  country: geo.country,
  region: geo.regionName,
  city: geo.city,
  isp: geo.isp,
  org: geo.org,
  timezone: geo.timezone,
  proxy: geo.proxy,
  hosting: geo.hosting
}, null, 2));
let sessiondigitLength = 4;
function sessionIdToJoinCode(sessionId, digitLength = 4) {

    // Hash session ID
    const hash = crypto
        .createHash("sha256")
        .update(sessionId)
        .digest();

    // Convert first 4 bytes into number
    const num = hash.readUInt32BE(0);

    // Range for requested digit length
    const min = 10 ** (digitLength - 1);
    const max = 10 ** digitLength;

    // Generate fixed-length code
    return ((num % (max - min)) + min).toString();
}
  ws.on('message', (message) => {
    const msg_is = decompressPayload(message);
    const data = JSON.parse(msg_is);
    const msg =  JSON.stringify(data);
    console.log(`|| Message recived: \`\`\`\n${msg}\`\`\``);
if (data.type === "ping"){
  console.log(`|| Sombody pinged server!!!`);
}
if (data.type === "createSession") {

    const conf = data.custom_server?.active
        ? data.custom_server.conf
        : null;

    const sessionId = compressString(
        `Ip:${ip_censor}-PlayerId:${ws.playerId}(${country_code})-Risk:${riskinfo}-IsCustom:${!!conf}\nRandomstring:${generateCode()}`
    ).toString("base64");

    const joinCode = `${!!conf ? `!Custom!-` : ""}${sessionIdToJoinCode(sessionId, sessiondigitLength)}`;

    sessions[sessionId] = {
        id: sessionId,
        joinCode,
        players: [ws],
        playersReady: 0,
        custom: {
            active: !!conf,
            conf: conf || null
        }
    };

    joinIndex[joinCode] = sessionId;
    ws.sessionId = sessionId;

    comp_and_send(ws, JSON.stringify({
        type: "sessionCreated",
        id: sessionId,
        code: joinCode,
        custom: !!sessions[sessionId].custom?.active
    }));
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
        if (`${data?.silent || false}` === `${false}`){
        player.send(
          compressPayload(JSON.stringify({
            type: "sessionUnready",
            reason: "sessionCancelled"
          }))
        );
      }
    } catch (e) {
      console.error("cancelSession notify error:", e);
    }
  });

      console.log(`|| Player ${ws.playerId} cancelled Session ${sessionId}`);
      try { delete joinIndex[sessions[ws.sessionId].joinCode]; } catch(e) {}
      delete sessions[ws.sessionId];
    }

    if (data.type === "leaveSession") {
      const sessionId = data.code;
      if (!sessions[sessionId]) return;

      console.log(`|| Player ${ws.playerId} left Session ${sessionId}`);
      sessions[sessionId].players = sessions[sessionId].players.filter(player => player !== ws);
      broadcastToSession(ws.sessionId, `Player ${ws.playerId} left the session`);
    }

      // manual hand sync dump to opponent





    if (data.type === "joinSession") {
      let joinCode = null;
      let sessionId = false;
      try {
    joinCode = data.sessionId;

    sessionId = joinIndex[joinCode];
      } catch (e){
        console.log("err session id", e);
        comp_and_send(ws, JSON.stringify({
            type: "sessionInvalid"
        }));
        return;
      }
      try {
    if (!sessionId) {
        comp_and_send(ws, JSON.stringify({
            type: "sessionInvalid"
        }));
        return;
    }
  } catch (e) {
    console.log("err session id", e);
    comp_and_send(ws, JSON.stringify({
            type: "sessionInvalid"
        }));
        return;
  }

    const session = sessions[sessionId];

    if (session.players.length >= 2) {
        comp_and_send(ws, JSON.stringify({
            type: "sessionFull"
        }));
        return;
    }

    session.players.push(ws);

    ws.sessionId = sessionId;

    comp_and_send(ws, JSON.stringify({
        type: "sessionJoined",
        code: joinCode,
        id: sessionId,
        custom: !!session.custom?.active
    }));
    sessions[sessionId].players.forEach((player, index) => {
          player.send(compressPayload(JSON.stringify({ type: 'sessionReady', player: index + 1 })));
        });

    console.log(
        `Player joined ${joinCode}`
    );
    broadcastToSession(
  ws.sessionId,
  `Session ${ws.sessionId} chat is now active. Please keep conversations civilized. Session IDs and player IDs may later be linked via logs!`
);
}

    if (data.type === "gameStart") {
        if (ws.sessionId && sessions[ws.sessionId]) {
            const session = sessions[ws.sessionId]; 
            if (!sessions[ws.sessionId]?.firstPlayer) {
                            broadcastToSession(ws.sessionId, `Game started! Good Luck Everyone!!`);
                const firstPlayer = session.players[Math.floor(Math.random() * session.players.length)].playerId;
                sessions[ws.sessionId].firstPlayer = firstPlayer
                console.log(`First player (coinflip) ${JSON.stringify(firstPlayer)}`);
            }
            console.log("firstPlayer = ", sessions[ws.sessionId].firstPlayer)
            session.players.forEach((player) => {
                player.send(compressPayload(JSON.stringify({ type: 'coinToss', player: sessions[ws.sessionId].firstPlayer })));
              });   
  
        }
    }

    if (data.type === 'initial_reDraw') {
      if (ws.sessionId && sessions[ws.sessionId]) {
        const session = sessions[ws.sessionId];
        session.playersReady += 1;

        console.log(`|| Players ready in session ${ws.sessionId}: ${session.playersReady}`);

        if (session.playersReady === 2) {
            session.players.forEach((player) => {
                player.send(compressPayload(JSON.stringify({ type: 'start' })));
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

  ws.on('close', () => {
    console.log(`|| Player ${ws.playerId} disconnected`);

    // Check if the player has an active session
    if (ws.sessionId && sessions[ws.sessionId]) {
      const session = sessions[ws.sessionId];

      // Check if the player is the creator of the session
      if (session.players[0] === ws) {
        // If the creator disconnects, delete the session
        console.log(`|| Deleting session ${ws.sessionId} because the creator left`);
        if (session.players.length > 1) {
          try {
          // session.players[1].send(compressPayload(JSON.stringify({ type: 'unReady' })));
          session.players[1].send(compressPayload(JSON.stringify({ type: 'sessionUnready' })));
          } catch (e) {
            console.log("Err", e);
          }
        }
        try { delete joinIndex[sessions[ws.sessionId].joinCode]; } catch(e) {}
        delete sessions[ws.sessionId];
      } else {
        try {
        // If a non-creator disconnects, remove them from the session and notify the creator
        session.players = session.players.filter(player => player !== ws);
       session.players[0].send(compressPayload(JSON.stringify({ type: 'unReady' })));
        session.players[0].send(compressPayload(JSON.stringify({ type: 'sessionUnready' })));
        console.log(`|| Player ${ws.playerId} left the session ${ws.sessionId}`);
        broadcastToSession(ws.sessionId, `Player ${ws.playerId} left the session`);
        } catch (e) {
          console.log("Err", e);
        }
      }
    }

    // Remove the player from the players list
    players = players.filter(player => player !== ws);
  });
});



server.listen(PORT, () => console.log(`>>> Server running on port ${PORT} `));
