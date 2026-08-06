const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const startEngine = require("./server-side/updater");
const PORT = process.env.PORT || 8081;
startEngine({
  app,
  server,
  wss,
});
server.listen(PORT, () => {
  console.log(`>>> Server running \"${PORT}\"`);
  console.log(`ADDON SPECIAL: ${process.env.B}`);
  if (process.env.B === "YES") {
    console.log("TRY INIT ADDON");
    init_addon();
  }
});
