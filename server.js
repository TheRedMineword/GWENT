const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const zlib = require("zlib");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8081;

app.use(cors({
  origin: "*", // or your frontend domain in production
}));



let sessions = {};
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



// Helper function to generate a random 4-character code
function generateCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

function generatePlayerId() {
  const part = () => crypto.randomBytes(2).toString("hex"); // 4 hex chars
  const num = () => Math.floor(1000 + Math.random() * 9000); // 4-digit number

  return `${part()}-${num()}-${part()}-${num()}`;
}


// Serve all client files (index.html, JS, CSS, etc.)
app.use(express.static(__dirname));
app.get("/wake", (req, res) => {
  res.json({ ok: "ok" });
});
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

wss.on('connection', (ws) => {
  ws.playerId = generatePlayerId();
  players.push(ws);

  // Send a welcome message with the player's ID
  comp_and_send(ws, JSON.stringify({ type: 'welcome', playerId: ws.playerId }));
  console.log(`|| Player ${ws.playerId} connected`);

  ws.on('message', (message) => {
    const msg_is = decompressPayload(message);
    const data = JSON.parse(msg_is);
    const msg =  JSON.stringify(data);
    console.log(`|| Message recived: \`\`\`\n${msg}\`\`\``);

    if (data.type === 'createSession') {
      const sessionCode = generateCode();
      // Create a new session and auto-join the creator
      sessions[sessionCode] = { players: [ws], code: sessionCode, playersReady: 0 };
      ws.sessionCode = sessionCode;
      comp_and_send(ws, JSON.stringify({ type: 'sessionCreated', code: sessionCode }));
      console.log(`|| Player ${ws.playerId} created Session ${sessionCode}`);

      comp_and_send(ws, JSON.stringify({ type: 'sessionJoined', code: sessionCode }));
    }

    if (data.type === "cancelSession") {
      const sessionCode = data.code;
      if (!sessions[sessionCode]) return;

      console.log(`|| Player ${ws.playerId} cancelled Session ${sessionCode}`);
      delete sessions[ws.sessionCode];
    }

    if (data.type === "leaveSession") {
      const sessionCode = data.code;
      if (!sessions[sessionCode]) return;

      console.log(`|| Player ${ws.playerId} left Session ${sessionCode}`);
      sessions[sessionCode].players = sessions[sessionCode].players.filter(player => player !== ws);
    }

    if (data.type === 'joinSession') {
      const sessionCode = data.sessionId;
      if (sessions[sessionCode] && sessions[sessionCode].players.length === 1) {
        sessions[sessionCode].players.push(ws);
        ws.sessionCode = sessionCode;
        comp_and_send(ws, JSON.stringify({ type: 'sessionJoined', code: sessionCode }));
        console.log(`|| Player ${ws.playerId} joined Session ${sessionCode}`);

        sessions[sessionCode].players.forEach((player, index) => {
          player.send(compressPayload(JSON.stringify({ type: 'sessionReady', player: index + 1 })));
        });
      
      } else {
        comp_and_send(ws, JSON.stringify({ type: 'sessionInvalid' }));
        const msg_out =  JSON.stringify({ type: 'sessionInvalid' });
  
      }
    }

    if (data.type === "gameStart") {
        if (ws.sessionCode && sessions[ws.sessionCode]) {
            const session = sessions[ws.sessionCode]; 
            if (!sessions[ws.sessionCode]?.firstPlayer) {
                const firstPlayer = session.players[Math.floor(Math.random() * session.players.length)].playerId;
                sessions[ws.sessionCode].firstPlayer = firstPlayer
            }
            console.log("firstPlayer = ", sessions[ws.sessionCode].firstPlayer)

            session.players.forEach((player) => {
                player.send(compressPayload(JSON.stringify({ type: 'coinToss', player: sessions[ws.sessionCode].firstPlayer })));
              });
  
        }
    }

    if (data.type === 'initial_reDraw') {
      if (ws.sessionCode && sessions[ws.sessionCode]) {
        const session = sessions[ws.sessionCode];
        session.playersReady += 1;

        console.log(`|| Players ready in session ${ws.sessionCode}: ${session.playersReady}`);

        if (session.playersReady === 2) {
            session.players.forEach((player) => {
                player.send(compressPayload(JSON.stringify({ type: 'start' })));
              });
          session.playersReady = 0;
        }
      }
    }

    // Relay messages to the other player in the same session
    if (ws.sessionCode) {
      const sessionPlayers = sessions[ws.sessionCode]?.players || [];
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
    if (ws.sessionCode && sessions[ws.sessionCode]) {
      const session = sessions[ws.sessionCode];

      // Check if the player is the creator of the session
      if (session.players[0] === ws) {
        // If the creator disconnects, delete the session
        console.log(`|| Deleting session ${ws.sessionCode} because the creator left`);
        if (session.players.length > 1) {
          session.players[1].send(compressPayload(JSON.stringify({ type: 'unReady' })));
          session.players[1].send(compressPayload(JSON.stringify({ type: 'sessionUnready' })));
        }
        delete sessions[ws.sessionCode];
      } else {
        // If a non-creator disconnects, remove them from the session and notify the creator
        session.players = session.players.filter(player => player !== ws);
        session.players[0].send(compressPayload(JSON.stringify({ type: 'unReady' })));
        session.players[0].send(compressPayload(JSON.stringify({ type: 'sessionUnready' })));
        console.log(`|| Player ${ws.playerId} left the session ${ws.sessionCode}`);
      }
    }

    // Remove the player from the players list
    players = players.filter(player => player !== ws);
  });
});



server.listen(PORT, () => console.log(`>>> Server running on port ${PORT} `));