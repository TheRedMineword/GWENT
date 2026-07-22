"use strict";

class Controller {}

// Better menu //
const menuBtn = document.getElementById("top-menu-btn");
const menu = document.getElementById("top-menu");

menuBtn.onclick = () => {
  menu.classList.toggle("hidden");
};

function toggleReadyWaiting(amReady) {
  console.log("[READY] toggleReadyWaiting called:", amReady);

  const container = document.querySelector("#deck-customization");

  console.log("[READY] container:", container);

  if (!container) {
    console.error("[READY] #deck-customization NOT FOUND");
    return;
  }

  const existing = document.querySelector("#ready-waiting-overlay");

  if (!amReady) {
    if (existing) {
      existing.remove();
      console.log("[READY] overlay removed");
    }
    tocar("tf2/Vote_no", false);
    return;
  }
  tocar("tf2/Vote_yes", false);
  if (existing) {
    console.log("[READY] overlay already exists");
    return;
  }

  // ensure relative positioning
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }

  // inject css once
  if (!document.querySelector("#ready-waiting-style")) {
    const style = document.createElement("style");
    style.id = "ready-waiting-style";

    style.innerHTML = `
            #ready-waiting-overlay {
                position: absolute;
                inset: 0;

                display: flex;
                align-items: center;
                justify-content: center;

                z-index: 99999;

                background: rgba(0,0,0,0.35);

                pointer-events: none;
            }

            .gwent-ready-spinner {
                width: 180px;
                height: 180px;

                border-radius: 50%;

                border-top: 6px solid #d8a45a;
                border-right: 6px solid #7a4b1f;
                border-bottom: 6px solid #f0d28c;
                border-left: 6px solid #3a2411;

                box-shadow:
                    0 0 30px rgba(255,190,90,0.5),
                    inset 0 0 20px rgba(255,210,120,0.2);

                animation: gwentSpin 1.5s linear infinite;

                position: relative;
            }

            .gwent-ready-spinner::after {
                content: "";

                position: absolute;
                bottom: -42px;
                left: 50%;

                transform: translateX(-50%);

                color: #d6b06b;
                font-size: 18px;
                letter-spacing: 2px;
                white-space: nowrap;

                text-shadow:
                    0 0 8px rgba(0,0,0,1),
                    0 0 12px rgba(214,176,107,0.4);
            }

            @keyframes gwentSpin {
                from {
                    transform: rotateY(0deg) rotate(0deg);
                }
                to {
                    transform: rotateY(360deg) rotate(360deg);
                }
            }
        `;

    document.head.appendChild(style);
  }

  const overlay = document.createElement("div");
  overlay.id = "ready-waiting-overlay";

  overlay.innerHTML = `
        <div class="gwent-ready-spinner"></div>
    `;

  container.appendChild(overlay);

  console.log("[READY] overlay appended");
}
function askForSessionId() {
  return new Promise((resolve) => {
    // Overlay
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(10, 8, 5, 0.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "99999",
      backdropFilter: "blur(2px)",
    });

    // Dialog
    const box = document.createElement("div");
    Object.assign(box.style, {
      width: "420px",
      maxWidth: "90vw",
      background: "linear-gradient(#efe7d3, #ddd0b3)",
      border: "2px solid #6f5830",
      borderRadius: "8px",
      boxShadow: "0 10px 30px rgba(0,0,0,.55)",
      color: "#2d2418",
      fontFamily: "Georgia, serif",
      overflow: "hidden",
    });
    box.classList.add("allow-click");

    // Header
    const header = document.createElement("div");
    header.textContent = getUiHtmlStrng("askForSessionId.header");
    Object.assign(header.style, {
      padding: "10px 16px",
      background: "#6f5830",
      color: "#f4e7c3",
      fontSize: "18px",
      fontWeight: "bold",
      textAlign: "center",
      borderBottom: "1px solid #4f3d22",
    });

    // Content
    const content = document.createElement("div");
    Object.assign(content.style, {
      padding: "24px",
      textAlign: "center",
    });

    const label = document.createElement("div");
    label.textContent = getUiHtmlStrng("askForSessionId.enter");
    Object.assign(label.style, {
      fontSize: "18px",
      marginBottom: "16px",
    });

    // Input
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = getUiHtmlStrng("askForSessionId.input");
    Object.assign(input.style, {
      width: "100%",
      boxSizing: "border-box",
      padding: "10px",
      marginBottom: "20px",
      fontSize: "16px",
      border: "1px solid #6f5830",
      borderRadius: "4px",
      background: "#f8f3e8",
      color: "#2d2418",
    });

    // Button row
    const buttons = document.createElement("div");
    Object.assign(buttons.style, {
      display: "flex",
      justifyContent: "center",
      gap: "14px",
    });

    function makeButton(label) {
      const btn = document.createElement("button");
      btn.textContent = label;
      Object.assign(btn.style, {
        minWidth: "90px",
        padding: "8px 18px",
        background: "#7a5b2e",
        color: "#f6edd8",
        border: "1px solid #4f3d22",
        borderRadius: "4px",
        fontSize: "16px",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "0.15s",
      });

      btn.onmouseenter = () => {
        btn.style.background = "#9b7539";
      };

      btn.onmouseleave = () => {
        btn.style.background = "#7a5b2e";
      };

      return btn;
    }

    const join = makeButton(getUiHtmlStrng("askForSessionId.ok"));
    const cancel = makeButton(getUiHtmlStrng("askForSessionId.notOk"));

    function cleanup(value) {
      document.body.removeChild(overlay);
      resolve(value);
    }

    join.onclick = () => {
      const value = input.value.trim();
      cleanup(value || null);
    };

    cancel.onclick = () => cleanup(null);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") join.click();
      if (e.key === "Escape") cancel.click();
    });

    content.appendChild(label);
    content.appendChild(input);
    buttons.appendChild(join);
    buttons.appendChild(cancel);
    content.appendChild(buttons);

    box.appendChild(header);
    box.appendChild(content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    input.focus();
  });
}

document.getElementById("join-game").onclick = async () => {
  const code = await askForSessionId();
  if (!code) return;

  comp_and_send(
    socket,
    JSON.stringify({
      type: "joinSession",
      sessionId: code,
    }),
  );
};

const readyButtonElem = document.getElementById("session-start-control");
const opponentReadyElem = document.getElementById("opponent-ready");
const isOpponentReadyElem = document.getElementById("opponent-ready");
const passButton = document.getElementById("pass-button");
const customizationElem = document.getElementById("deck-customization");
const gameStartControlsElem = document.getElementById("session-start-control");
const ep_id = document.getElementById("player-id-btn");

let debug = false;

function showTooltip(text, duratation = 3200) {
  console.log("ToolTip", text, duratation);
  const tooltip = document.getElementById("tooltip");

  // set message
  tooltip.textContent = `${text}`;

  tooltip.classList.add("show");

  setTimeout(() => {
    tooltip.classList.remove("show");
  }, duratation);
}

function cardredrawnotice(text) {
  // tooltipQueue.push(text);
  // processTooltipQueue();
  pushMessage(formatMessage2(text), 9000);
}

function processTooltipQueue() {
  if (tooltipActive) return;
  if (tooltipQueue.length === 0) return;

  tooltipActive = true;

  const tooltip2 = document.getElementById("tooltip2");
  const text = tooltipQueue.shift();

  tooltip.textContent = text;
  tooltip.classList.add("show");

  setTimeout(() => {
    tooltip.classList.remove("show");

    // small delay so CSS fade-out can finish cleanly
    setTimeout(() => {
      tooltipActive = false;
      processTooltipQueue();
    }, 200);
  }, 3200);
}

document.getElementById("copy-session").onclick = () => {
  // document.querySelector("copy-session").addEventListener("click", async () => {
  console.log("clicked session copy", joinedSessionId);
  if (!joinedSessionId) return;

  try {
    navigator.clipboard.writeText(joinedSessionId);
    showTooltip(joinedSessionId);
  } catch (err) {
    console.error("Copy failed:", err);
  }
};

// Websocket and Server config.

const wakeUrl = `${domain}wake`;

const host = window.location.hostname; // wrong define window.location?

const isLocalhost =
  host.startsWith("localhost") ||
  host.startsWith("127.0.0.1") ||
  host.startsWith("[::1]");

const isElectronLauncher = isLocalhost && location.port === "1111";

const wsUrl = isElectronLauncher
  ? socket_domain
  : isLocalhost
    ? "ws://localhost:8081"
    : socket_domain;

function showBrickScreen() {
  document.documentElement.innerHTML = `
    <style>
      body {
        margin:0;
        background:#0d0d0d;
        color:#ff4d4d;
        font-family:Arial,sans-serif;
        display:flex;
        align-items:center;
        justify-content:center;
        height:100vh;
        text-align:center;
      }

      .box {
        max-width:700px;
        padding:40px;
        border:2px solid #ff4d4d;
        background:#1a0000;
        box-shadow:0 0 30px rgba(255,0,0,.35);
      }

      h1 {
        font-size:42px;
        margin-bottom:20px;
      }

      p {
        font-size:20px;
        line-height:1.6;
        color:#ffd0d0;
      }
    </style>

    <div class="box">
      <h1>${getUiHtmlStrng("brick.name")}</h1>
      <p>${getUiHtmlStrng("brick.why", true)}</p>
    </div>
  `;
  fetch(wakeUrl);
}

console.log("Websocket", wsUrl);
// const socket = new WebSocket('ws://127.0.0.1:8080');				// Example line for when using local installation instead of remote deployment.
let socket = null;

loadingscreenupdate("Starting webscoket");
if (isHuman) {
  socket = new WebSocket(wsUrl);
} else if (isLocalhost && !isElectronLauncher) {
  socket = new WebSocket(wsUrl);
} else {
  showBrickScreen();
  warn_screen(
    "!!BOT DETECTED!!\nFailed to connect to multiplayer server.\n\nIf you are human report is as bug!\n\n!!BOT DETECTED!!",
  );
}

socket.onopen = () => {
  console.log("WebSocket connected");
  loadingscreenupdate("Webscoket OK");
};

socket.onerror = (err) => {
  console.error("WebSocket error", err);
  showBrickScreen();
  warn_screen("Failed to connect to multiplayer server.");
};

socket.onclose = (event) => {
  console.warn("WebSocket closed", event);

  // Optional: treat early close as failure
  if (!socket._connected) {
    showBrickScreen();
    warn_screen(
      "Failed to start multiplayer, please refresh page!!!\n\nIf it dont work wait for a moment before trying again!",
    );
  }
};

let amReady = false;
let opponentReady = false;
let playerId = null;

// Super JSON Compressor for WebSockets
// Uses Brotli if available, falls back to gzip-like Deflate via CompressionStream
// Sends binary Uint8Array payloads
// Logs stats + SHA hash + failure reasons

const TextEnc = new TextEncoder();
const TextDec = new TextDecoder();

async function sha256(buffer) {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function compressData(str) {
  const input = TextEnc.encode(str);

  if ("CompressionStream" in window) {
    const cs = new CompressionStream("deflate-raw");
    const writer = cs.writable.getWriter();
    writer.write(input);
    writer.close();

    const compressed = await new Response(cs.readable).arrayBuffer();
    return new Uint8Array(compressed);
  }

  throw new Error("CompressionStream not supported.");
}

async function decompressData(uint8) {
  if ("DecompressionStream" in window) {
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(uint8);
    writer.close();

    const decompressed = await new Response(ds.readable).arrayBuffer();
    console.log("Decompressed:", decompressed);
    return TextDec.decode(decompressed);
  }

  throw new Error("DecompressionStream not supported.");
}

async function decompressBase64(base64) {
  // base64 -> Uint8Array
  const binary = atob(base64);

  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

  // Create decompression stream
  const ds = new DecompressionStream("deflate-raw");

  // Pipe compressed bytes into it
  const decompressedStream = new Blob([bytes]).stream().pipeThrough(ds);

  // Read decompressed result
  const decompressedBuffer = await new Response(
    decompressedStream,
  ).arrayBuffer();

  return new TextDecoder().decode(decompressedBuffer);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start automatic queue processor
setInterval(async () => {
  if (sendQueue.length === 0) return;

  const item = sendQueue.shift(); // take first queued item
  const { socket, jsonString } = item;

  try {
    console.log("Comp and send:", socket, jsonString);

    const before = TextEnc.encode(jsonString).length;

    const compressed = await compressData(jsonString);

    const after = compressed.length;
    const saved = ((1 - after / before) * 100).toFixed(3);
    const hash = await sha256(compressed);

    console.log("Bytes before:", before);
    console.log("Bytes after :", after);
    console.log("Compressed% :", saved + "%");
    console.log("Payload sha :", hash);

    if (socket.readyState !== WebSocket.OPEN) {
      if (JSON.parse(jsonString).type === "ping") {
      } else {
        throw new Error("socket not open");
      }
    }

    socket.send(compressed);
  } catch (err) {
    console.error(err);
    if (JSON.parse(jsonString).type === "ping") {
    } else {
      warn_screen("Socket send failed: " + err.message);
    }
  }
}, SEND_INTERVAL_MS);

// Call this anytime you want to queue a send
function comp_and_send(socket, jsonString) {
  sendQueue.push({
    socket,
    jsonString,
  });

  console.log("Queued request. Queue size:", sendQueue.length);
}

async function recv_and_decomp(event) {
  console.log("recv_and_decomp");
  try {
    let buffer;

    if (event.data instanceof Blob) {
      buffer = await event.data.arrayBuffer();
    } else if (event.data instanceof ArrayBuffer) {
      buffer = event.data;
    } else {
      throw new Error("Unsupported message type");
    }

    const uint8 = new Uint8Array(buffer);
    const json = await decompressData(uint8);

    console.log("Received JSON:", json);
    return JSON.parse(json);
  } catch (err) {
    warn_screen("Socket receive failed: " + err.message);
  }
}

function handleRiskMessage(message) {
  console.log("HANDLE RISK", message);
  // Extract JSON part from: risk_is ({...})
  const match = message;
  if (!match) return;

  let data;
  try {
    data = match;
  } catch (e) {
    console.warn("Invalid risk JSON:", e);
    return;
  }

  if (data.vpn === "yes") {
    showVpnWarning();
    country = null;
  }
  return message;
}

function showVpnWarning() {
  // Create popup
  const popup = document.createElement("div");
  popup.innerText =
    "⚠ VPN detected.\nVPN usage is not recommended and server may not support it.\nUse it at your own risk!\n\nOpponent country display is disabled for fairness.";

  popup.style.position = "fixed";
  popup.style.bottom = "20px";
  popup.style.left = "50%";
  popup.style.transform = "translateX(-50%)";
  popup.style.background = "rgba(0,0,0,0.85)";
  popup.style.color = "#fff";
  popup.style.padding = "12px 16px";
  popup.style.borderRadius = "8px";
  popup.style.fontSize = "14px";
  popup.style.zIndex = "9999999999999999999";
  popup.style.whiteSpace = "pre-line";
  popup.style.maxWidth = "520px";
  popup.style.textAlign = "center";

  document.body.appendChild(popup);

  // Auto remove after 4 seconds
  setTimeout(() => {
    popup.remove();
  }, 16000);
}

document.getElementById("copy-session").onclick = () => {
  // document.querySelector("copy-session").addEventListener("click", async () => {
  console.log("clicked session copy", joinedSessionId);
  if (!joinedSessionId) return;

  try {
    navigator.clipboard.writeText(joinedSessionId);
    showTooltip(getUiStrng("session_copied").replace("%s", joinedSessionId));
  } catch (err) {
    console.error("Copy failed:", err);
  }
};

function showSurrenderVote() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.72);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:999999999;
      backdrop-filter:blur(3px);
    `;

    const box = document.createElement("div");
    box.style.cssText = `
      width:520px;
      max-width:90vw;
      padding:30px;
      border:2px solid #9d7a43;
      border-radius:12px;
      background:
        linear-gradient(
          to bottom,
          #24180f,
          #17110b
        );
      box-shadow:
        0 0 40px rgba(0,0,0,.9),
        0 0 20px rgba(212,168,87,.25);
      color:#e6c98c;
      text-align:center;
      font-family:serif;
    `;

    box.innerHTML = `
<div style="font-size:56px;margin-bottom:12px;">${getUiHtmlStrng("surrender_request.sword")}</div>

<div style="font-size:28px;letter-spacing:2px;margin-bottom:18px;">
    ${getUiHtmlStrng("surrender_request.title")}
</div>

<div style="font-size:19px;color:#d9bf8a;margin-bottom:30px;line-height:1.5;">
    ${getUiHtmlStrng("surrender_request.description", true)}
</div>

<div style="display:flex;justify-content:center;gap:20px;">
    <button id="surrender-accept-btn">
        ${getUiHtmlStrng("surrender_request.accept")}
    </button>

    <button id="surrender-reject-btn">
        ${getUiHtmlStrng("surrender_request.reject")}
    </button>
</div>
`;
    box.classList.add("allow-click");

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const accept = box.querySelector("#surrender-accept-btn");

    const reject = box.querySelector("#surrender-reject-btn");

    accept.onclick = () => {
      tocar("tf2/Vote_yes", false);
      overlay.remove();
      resolve(true);
    };

    reject.onclick = () => {
      tocar("tf2/Vote_no", false);
      overlay.remove();
      resolve(false);
    };
  });
}
async function endGameBySurrender(winner, loser) {
  gameended = true;

  ui.enablePlayer(false);

  //  winner.health = Math.max(winner.health, 1);
  //  loser.health = 0;

  //  winner.setWinning(true);
  //  loser.setWinning(false);

  //  await game.returnToCustomization();

  //  reset_menu();
  //  clearUnread();

  //  isconnectedtosession = false;
  await game.surrenderEnd(winner);
}
function askforsurrender() {
  tocar("tf2/Vote_started", false);
  ui.enableSurrender(false);
  ui.enablePlayer(false);
  sendChatMessageStrig("asked to surrender!");
  comp_and_send(
    socket,
    JSON.stringify({
      type: "surrenderRequest",
    }),
  );
  showSideTooltip(getUiHtmlStrng("surrender_request.ask"));
}
document
  .getElementById("surrender-button")
  .addEventListener("click", askforsurrender);
let ip_data = null;
let country = null;
let current_op = null;
let risk_is = {
  vpn: "no",
  risk: 0,
  type: "Wireless",
  proxy: "no",
};
socket.onmessage = async (event) => {
  console.log("[socket raw event.data]", event.data);
  const event_parsed = await recv_and_decomp(event);
  console.log("event_parsed", event_parsed);
  const data = event_parsed; //.data;
  console.log("onmsg data:", data);
  switch (data.type) {
    case "hearthbeat": //{"type":"hearthbeat","data":"http://localhost:8081/api/recive-hearthbeat?db=cdea635c-6a30-4778-96ed-1702d503ff6c"}
      try {
        console.log("[HEARTH BEAT!!", data, await fetch(data.data));
      } catch (e) {
        console.error("HeartBeat err", e);
        warn_screen(`HearthBeat Failed!!\n\n${e.message}`);
      }
      break;
    case "new_css":
      try {
        document.getElementById("dynamic-css").textContent = generateCSS(
          data.theme,
        );
      } catch (e) {
        console.error("apply new vars err", e);
      }
      break;
    case "new_visual":
      try {
        if (data.key === "board") {
          console.log("setBackground(", data.vid);
          var res = await setBackground(data.vid);
          console.log("setBackground(", data.vid, res);
        }
        set_new_image(data.key, data.path);
      } catch (e) {
        console.error("apply new vars err", e);
      }
      break;
    case "show_patchnotes":
      if (data.content) {
        console.log(
          "Server asked to show patchnotes",
          await showPatch(parsePatchNotes(data.content)),
        );
      }
      break;
    case "server_notif":
      try {
        pushMessage(formatMessage2(data.msg), data.duration);
      } catch (e) {}
      break;
    case "NewPlayTheme":
      try {
        ui.youtubePlay(data.id, data.vol, data.rep);
      } catch (e) {}
      break;
    case "authRequired":
      ip_data = data._ip;
      console.log("[IP PARSE]", data._ip);
      country = ip_data?.countryCode || null;
      risk_is = data._ip?.risk || risk_is;
      handleRiskMessage(risk_is);
      ip_data = null;

      currentPlayerId = data.playerId;
      if (data.needed) {
        createAuthOverlay(api_url_login_reg);

        tryAutoLogin(api_url_login_reg, data.playerId);
      } else {
        init_button_show_patchnotes = true;
        NoAuthNeeded();
      }
      break;
    case "welcome":
      playerId = data.playerId;
      console.log(
        "[SERVER DROPPED IP DATA",
        ip_data,
        ` Country: ${country} || Risk: ${JSON.stringify(risk_is)}`,
      );
      console.log("Welcome, your id is " + playerId);
      ep_id.textContent = `Hello PlayerID:\n${playerId}`;
      ep_id.style.color = "";
      //  menuBtn.style.transition = "color 2s ease";
      //  menuBtn.style.color = "lightgreen";

      //  setTimeout(() => {
      //      menuBtn.style.color = "";
      //   }, ui_display_times.socketready);
      //    await sleep(1000);
      menuBtn.style.color = menubntconfig.color;
      console.log("menubntconfig", menubntconfig, "is ready");
      menubntconfig.wasINIT = true;
      break;

    // Opponent has joined and the session is ready
    case "sessionCreated":
      console.log("Parsing vars for session join", data);
      joinedSessionId = data.code;
      console.log("joinedSessionId", joinedSessionId);
      break;
    case "sessionReady":
      console.log("sessionReady");
      tocar("tf2/Vote_started", false);
      // showTooltip("Opponent has joined and the session is ready");
      // [socket raw event.data] {"type":"sessionJoined","code":"XRA2"}
      document
        .getElementById("session-start-control")
        .classList.remove("hidden");
      isOpponentReadyElem.classList.remove("hidden");

      // document.getElementById("session-display").classList.remove("hidden");
      //  document.getElementById("session-code-text").textContent = joinedSessionId;

      // joinedSessionId;
      // sends the opponent which faction you're playing with
      comp_and_send(
        socket,
        JSON.stringify({
          type: "opChangeFaction",
          faction: dm.faction,
          info: { me_id: playerId, me_flag: country },
        }),
      );
      if (players.me !== "You") {
        comp_and_send(
          socket,
          JSON.stringify({
            type: "MyName",
            is: players.me,
          }),
        );
      }
      sendChatMessageStrig(`play wich ${factions[faction_name].name} faction!`);
      break;

    // Opponent has left and the session is no longer ready
    case "sessionUnready":
      opponentReady = false;
      players.op = "Opponent";
      // btnCancelElem.classList.remove("hidden");
      if (isconnectedtosession) {
        tocar("tf2/Vote_failure", false);
      }
      console.log("session un ready", gameended);
      disableChat();
      //reset_custom();
      if (gameended === false) {
        showTooltip(getUiStrng("op_left"));
        var btn = document.getElementById("session-start-control");
        btn.textContent = "Ready";
        amReady = false;
        toggleReadyWaiting(amReady);
        //	btnCancelElem.classList.remove("hidden");
        //	btnCreateElem.classList.remove("hidden");
        //	btnJoinElem.classList.remove("hidden");
      }
      twoPlayersConnected = false;
      if (twoPlayersConnected === true) {
        ui.stopYouTube();
        play_wait_music();
      } else {
        stop_wait_music();
        ui.resumeYouTube();
      }
      console.log("---------------------");
      console.log("Opponent left the game");
      // isOpponentReadyElem.classList.add("hidden");
      updateOpponentUI({
        name: getUiStrng("no_op_ui"),
        state:
          "img/icons/google_fonts__signal_disconnected_99dp_CCCCCC_FILL0_wght400_GRAD0_opsz48.png",
        status: "",
      });
      await sleep(100);
      opponentReadyElem.classList.add("disabled");
      document
        .getElementById("session-start-control")
        .classList.add("disabled");
      opponentReadyElem.classList.add("disabled");
      // if (game.roundCound > 0) { //oryginal dev typo X D
      var game_state = this.game;
      console.log(
        "END GAME TRY round counts",
        game_state.roundCount,
        "game",
        game_state,
      );
      if (gameended === false) {
        if (game_state.roundCount > 0) {
          isconnectedtosession = false;
          await ui.notification(
            "win-opleft",
            ui_display_times.round_end_result * 2,
          );

          await game.returnToCustomization();
          btnCancelElem.classList.remove("hidden"); // no idea if its do anything
          if (joinedSessionId) {
            silent_cancelSession();
          }
          reset_menu();
        }
      } else {
        console.log("Op left, but game ended is", gameended);
        showTooltip(getUiStrng("op_left_short"));
      }

      clearUnread();
      if (data?.reason || null === "sessionCancelled") {
        silent_cancelSession();
      } else {
      }

      createdSessionId = null;
      joinedSessionId = null;
      ThisSessionId = null;
      isconnectedtosession = false;
      break;

    // Opponent is ready. If you are ready begin the game immediately
    case "ready":
      showTooltip(getUiStrng("op_ready"));
      tocar("tf2/Vote_yes", false);
      updateOpponentUI({
        name: `${current_op.me_flag === null ? "" : "( "}${current_op.me_flag === null ? players.noflag : current_op.me_flag}${current_op.me_flag === null ? "" : " ) "}${players["op"]}`,
        state: `${current_op.me_flag === null ? op_icon_faction : `<svg width=\"32\" height=\"32\" xmlns=\"http:\/\/www.w3.org\/2000\/svg\">\r\n    <!-- Background image as base64 -->\r\n    <image href=\"${op_icon_faction}\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"none\"\/>\r\n    <!-- Remote image in bottom-right corner -->\r\n    <image x=\"17\" y=\"17\" width=\"15\" height=\"15\" href=\"${current_op.me_flag === null ? op_icon_faction : `https://flagsapi.com/${current_op.me_flag}/flat/64.png`}\"\/>\r\n<\/svg>`}`,
        status: `Ready: ${opponentReady}`,
      });
      player_op = new Player(
        1,
        players["op"]?.replace(
          /[&<>"']/g,
          (m) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[m],
        ),
        data.deck,
      );
      if (amReady) {
        customizationElem.classList.add("hide");
        gameStartControlsElem.classList.add("hide");
        //await sleep(100);
        game.startGame();
        return;
      } else {
        opponentReadyElem.classList.remove("disabled");
        opponentReady = true;
        updateOpponentUI({
          name: `${current_op.me_flag === null ? "" : "( "}${current_op.me_flag === null ? players.noflag : current_op.me_flag}${current_op.me_flag === null ? "" : " ) "}${players["op"]}`,
          state: `${current_op.me_flag === null ? op_icon_faction : `<svg width=\"32\" height=\"32\" xmlns=\"http:\/\/www.w3.org\/2000\/svg\">\r\n    <!-- Background image as base64 -->\r\n    <image href=\"${op_icon_faction}\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"none\"\/>\r\n    <!-- Remote image in bottom-right corner -->\r\n    <image x=\"17\" y=\"17\" width=\"15\" height=\"15\" href=\"${current_op.me_flag === null ? op_icon_faction : `https://flagsapi.com/${current_op.me_flag}/flat/64.png`}\"\/>\r\n<\/svg>`}`,
          status: `Ready: ${opponentReady}`,
        });
      }
      break;

    case "opChangeFaction":
      if (twoPlayersConnected === false) {
        disableChat();
      }
      twoPlayersConnected = true;
      current_op = data.info;
      //	current_op.me_flag = "PL";
      if (twoPlayersConnected === true) {
        ui.stopYouTube();
        play_wait_music();
      } else {
        stop_wait_music();
        ui.resumeYouTube();
      }
      console.log("opponent has changed his faction");
      showTooltip(
        getUiStrng("op_faction").replace(
          "%s",
          factions[data.faction]?.name || data.faction,
        ),
      );
      op_icon_faction = `img/icons/deck_shield_${data.faction}.png`;
      updateOpponentUI({
        name: `${current_op.me_flag === null ? "" : "( "}${current_op.me_flag === null ? players.noflag : current_op.me_flag}${current_op.me_flag === null ? "" : " ) "}${players["op"]?.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m])}`,
        state: `${current_op.me_flag === null ? op_icon_faction : `<svg width=\"32\" height=\"32\" xmlns=\"http:\/\/www.w3.org\/2000\/svg\">\r\n    <!-- Background image as base64 -->\r\n    <image href=\"${op_icon_faction}\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"none\"\/>\r\n    <!-- Remote image in bottom-right corner -->\r\n    <image x=\"17\" y=\"17\" width=\"15\" height=\"15\" href=\"${current_op.me_flag === null ? op_icon_faction : `https://flagsapi.com/${current_op.me_flag}/flat/64.png`}\"\/>\r\n<\/svg>`}`,
        status: `Ready: ${opponentReady}`,
      });
      // opponentReadyElem.querySelector("img").src = `img/icons/deck_shield_${data.faction}.png`
      break;

    case "unReady":
      opponentReady = false;
      if (isconnectedtosession) {
        tocar("tf2/Vote_no", false);
      }
      if (twoPlayersConnected === true) {
        ui.stopYouTube();
        play_wait_music();
      } else {
        stop_wait_music();
        ui.resumeYouTube();
      }
      // amReady = false;
      toggleReadyWaiting(amReady);
      updateOpponentUI({
        name: `${current_op.me_flag === null ? "" : "( "}${current_op.me_flag === null ? players.noflag : current_op.me_flag}${current_op.me_flag === null ? "" : " ) "}${players["op"]?.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m])}`,
        state: `${current_op.me_flag === null ? op_icon_faction : `<svg width=\"32\" height=\"32\" xmlns=\"http:\/\/www.w3.org\/2000\/svg\">\r\n    <!-- Background image as base64 -->\r\n    <image href=\"${op_icon_faction}\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"none\"\/>\r\n    <!-- Remote image in bottom-right corner -->\r\n    <image x=\"17\" y=\"17\" width=\"15\" height=\"15\" href=\"${current_op.me_flag === null ? op_icon_faction : `https://flagsapi.com/${current_op.me_flag}/flat/64.png`}\"\/>\r\n<\/svg>`}`,
        status: `Ready: ${opponentReady}`,
      });
      //	twoPlayersConnected = true;
      showTooltip(getUiStrng("op_unready"));
      // opponentReadyElem.classList.add("disabled");
      if (amReady) {
        document
          .getElementById("session-start-control")
          .classList.remove("ready");
        customizationElem.classList.remove("noclick");
      }
      break;

    // Initializes Opponent's updated Hand and Deck
    case "initial_reDraw":
      data.deck = fillCardElements(data.deck, player_op);
      data.hand = fillCardElements(data.hand, player_op);

      player_op.hand.cards = data.hand;
      player_op.deck.cards = data.deck;
      break;

    // Game-start
    case "start":
      console.log("---------------------");
      console.log("Match start");

      game.startRound();
      tocar("game_start", false);
      break;

    case "resync_hands()##BLOCK##": //Resync function disabled, due to changes made in play
      try {
        console.log("[RESYNC]", "recived", data);
        var rebuild = await deserializeCards(data.data, player_op);
        console.log("[RESYNC]", "REBUILD", rebuild);
        player_op.hand.cards = rebuild;
        console.log("[RESYNC]", "op is", player_op.hand.cards);
        try {
          console.log(
            "[RESYNC]",
            "sync cards counter op",
            player_op.hand.cards.length,
          );
          var op_counter = document.getElementById("hand-count-op");
          op_counter.innerHTML = player_op.hand.cards.length;
        } catch (e) {
          console.log("[RESYNC]", "sync cards counter op", e);
        }
      } catch (e) {
        console.log("[RESYNC]", " FAILED", " OUT", e);
      }
      break;
    case "SpecialAbility":
      tocar("ability_use_from_counter", false);
      switch (data.leader) {
        case "turn_skiper":
          await ability_turn_skiper_op(data);
          break;
        case "d20cloner":
          var cards_init = await deserializeCards(data?.hand.before, player_op);
          player_op.hand.cards = cards_init;
          await ability_counter_d20__op(data);
          var cards_after = await deserializeCards(data?.hand.after, player_op);
          player_op.hand.cards = cards_after;
          break;
      }
      break;
    case "medicrevivedata":
      medicrevivethat = [];
      medicrevivethat = data.data;
      console.log("Medic revive recived:", data);
      break;
    // Game - Opponent plays card
    case "play":
      console.log(
        "[OPHAND]",
        await deserializeCards(data?.isMeHand, player_op),
      );
      var cards_to_find = await deserializeCards(data?.isMeHand, player_op);
      player_op.hand.cards = cards_to_find;
      console.log("[OPHAND]", cards_to_find, data?.isMeHand);
      card = null;
      // const card = player_op.hand.cards.find(c => c.filename === data.card.filename);
      try {
        try {
          console.log(
            "[OPHAND]",
            "IsCardPlayed?",
            player_op.hand.cards.find((c) => c.filename === data.card.filename),
          );
        } catch (e) {}
        card = cards_to_find.find((c) => c.filename === data.card.filename);
      } catch (e) {
        console.log(
          "[OPHAND]",
          "Let card card failure",
          e,
          "\n\n",
          "OpHand: (rebuilded)",
          player_op.hand.cards,
          "payload",
          data,
          "card",
          card,
        );
        warn_screen(
          "Failed to build opponent hand, check console for more!! \n\nReport is as bug!!!",
        );
      }
      console.log("[OPHAND]", "OP", "PLAY", card, cards_to_find, data);

      const splitRowName = data.row.split("-");
      let row;
      if (splitRowName.length > 1) {
        const targetRow = splitRowName[0] === "self" ? "target" : "self";
        row = board.row.find(
          (r) => r.elem_parent.id === `${targetRow}-${splitRowName[1]}`,
        );
      } else {
        row = data.row;
      }

      if (data.card.filename === "decoy") {
        const replacedCard = row.cards.find(
          (bc) => bc.filename === data.target.filename,
        );
        if (!replacedCard) return;
        try {
          replacedCard.animate2("decoy"); //placeholder
          await sleep(
            Math.floor(ui_display_times.show_me_that_card_you_have * (1 - 0.6)),
          );
        } catch (e) {
          console.log("Decoy target", e);
        }
        board.moveTo(replacedCard, player_op.hand, row);
      }

      if (row === "weather") await player_op.playCard(card, row);
      else if (data.card.filename === "scorch")
        await player_op.playScorch(card);
      else await player_op.playCardToRow(card, row);

      await sleep(500);
      console.log("[OPHAND]", "PLAY EXCUTE DONE, SYNC2");
      try {
        console.log(
          "[OPHAND] post",
          await deserializeCards(data?.HandMePost, player_op),
        );
        var cards_to_find_post = await deserializeCards(
          data?.HandMePost,
          player_op,
        );
        player_op.hand.cards = cards_to_find_post;
        console.log("[OPHAND]", player_op.hand.cards);
        document.getElementById("hand-count-op").innerHTML =
          player_op.hand.cards.length;
      } catch (e) {
        console.log(
          "[OPHAND]",
          "sync from payload post procces fatal",
          e,
          "data",
          data,
          cards_to_find_post,
        );
        warn_screen(
          "Failed sync op cars on end of execute path, check console for more \n\nReport it as bug!!!",
        );
      }
      break;

    case "sessionInvalid":
      warn_screen("Invalid session ID");
      break;

    case "surrenderRequest":
      tocar("tf2/Vote_started", false);

      const accepted = await showSurrenderVote();

      if (accepted) {
        comp_and_send(
          socket,
          JSON.stringify({
            type: "surrenderResponse",
            accepted: true,
          }),
        );
        endGameBySurrender(player_me, player_op);
      } else {
        comp_and_send(
          socket,
          JSON.stringify({
            type: "surrenderResponse",
            accepted: false,
          }),
        );
        showSideTooltip("You refused your opponent's surrender.");
      }
      break;
    case "surrenderResponse":
      ui.enableSurrender(true);
      if (data.accepted) {
        //  warn_screen("accepted flag");
        endGameBySurrender(player_op, player_me);
      } else {
        //  warn_screen("rejected surrender");
        tocar("tf2/Vote_no", false);
        showSideTooltip(getUiHtmlStrng("surrender_request.ask"));
        ui.enablePlayer(true);
      }
      break;
    //case "medicDraw":
    //	var data2 = data;

    //break;
    // Game - Opponent pass
    case "pass":
      player_op.passRound();
      break;

    // Game - Opponent used the leader card
    case "useLeader":
      console.log(
        "[OPHAND]",
        await deserializeCards(data?.isMeHand, player_op),
      );
      var cards_to_find = await deserializeCards(data?.isMeHand, player_op);
      player_op.hand.cards = cards_to_find;
      console.log("[OPHAND]", cards_to_find, data?.isMeHand);
      // const card = player_op.hand.cards.find(c => c.filename === data.card.filename);
      card = null;
      await player_op.activateLeader();
      try {
        console.log(
          "[OPHAND] post",
          await deserializeCards(data?.HandMePost, player_op),
        );
        var cards_to_find_post = await deserializeCards(
          data?.HandMePost,
          player_op,
        );
        player_op.hand.cards = cards_to_find_post;
        console.log("[OPHAND]", player_op.hand.cards);
        document.getElementById("hand-count-op").innerHTML =
          player_op.hand.cards.length;
      } catch (e) {
        console.log(
          "[OPHAND]",
          "sync from payload post procces fatal",
          e,
          "data",
          data,
          cards_to_find_post,
        );
        warn_screen(
          "Failed sync op cars on end of execute path, check console for more \n\nReport it as bug!!!",
        );
      }
      player_op.endTurn();
      break;
  }
};

async function sunlightEffect(duration = 1900) {
  const sun = document.createElement("div");

  sun.style.position = "fixed";
  sun.style.top = "0";
  sun.style.left = "0";

  sun.style.width = "40vw";
  sun.style.height = "40vw";

  sun.style.pointerEvents = "none";
  sun.style.zIndex = "999999999999";

  sun.style.background = `
		radial-gradient(
			circle at top left,
			rgba(255,255,220,0.95) 0%,
			rgba(255,240,180,0.55) 18%,
			rgba(255,220,120,0.18) 35%,
			rgba(255,255,255,0) 60%
		)
	`;

  sun.style.filter = "blur(6px)";
  sun.style.mixBlendMode = "screen";

  // remove scaling animation
  sun.style.opacity = "0";
  sun.style.transition = "opacity 0.35s ease";

  document.body.appendChild(sun);

  await sleep(20);

  // fade in only
  sun.style.opacity = "1";

  let pulse = setInterval(() => {
    sun.style.filter = Math.random() > 0.5 ? "blur(8px)" : "blur(5px)";
  }, 120);

  await sleep(duration - 500);

  clearInterval(pulse);

  // fade out only
  sun.style.opacity = "0";

  await sleep(400);

  sun.remove();
}

function fillCardElements(cards, player) {
  for (let i = 0; i < cards.length; i++) {
    const cardFromDict = card_dict.find(
      (dict) => dict.filename === cards[i].filename,
    );
    cards[i] = new Card(cardFromDict, player);
  }
  return cards;
}

// Opponent Controller
class ControllerOpponent {
  constructor(player) {
    player.tag = "op";

    this.player = player;
  }
}

function for_seed_hashString(str) {
  let h = 2166136261;

  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleSeeded(array, seed, debug = null) {
  var input = {
    array: array,
    seed: for_seed_hashString(seed),
    debug: debug,
  };
  var finresult = shuffleSeeded2(array, seed, debug);
  console.log(
    "SHUFFLE INPUT/OUTPUT",
    input,
    finresult,
    " check same ",
    finresult.array === input.array,
  );
  return finresult;
}
function shuffleSeeded2(array, seed, debug = null) {
  try {
    let seed_init = seed;
    seed = for_seed_hashString(seed);
    console.log(`Shuffle new seed ${seed} from ${seed_init}`, array);
    let rng = mulberry32(seed);
    if (debug === "THAT_IS_OP__RETURN_THIS") {
      try {
        console.log(
          "SHUFFLE ON SEED",
          seed,
          `\nStarted: ${fasthash(utf8ToBase64(JSON.stringify(array)))}`,
          `\nOutput: ${fasthash(utf8ToBase64(JSON.stringify(array)))}`,
          debug,
        );
      } catch (e) {}
      return { array: array, seed: seed };
    }
    let arr = [...array];

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    try {
      console.log(
        "SHUFFLE ON SEED",
        seed,
        `\nStarted: ${fasthash(utf8ToBase64(JSON.stringify(array)))}`,
        `\nOutput: ${fasthash(utf8ToBase64(JSON.stringify(arr)))}`,
        debug,
      );
    } catch (e) {}
    return { array: arr, seed: seed };
  } catch (e) {
    console.error(
      `shuffleSeeded`,
      ` fatal error`,
      array,
      seed,
      debug,
      ` error `,
      e,
    );
    warn_screen(
      "GAME CRASH!\n\nFatal error at shuffleSeeded function, check console for more info\n\nReport is as bug!!",
    );
  }
}

// Can make actions during turns like playing cards that it owns
class Player {
  constructor(id, name, deck) {
    // console.log("PLAYER NEW", id, name, deck);
    let debug = null;
    if (name === players.me) {
      this.ThatPlayerId = playerId;
      debug = "ME";
    } else {
      this.ThatPlayerId = current_op.me_id;
      debug = "THAT_IS_OP__RETURN_THIS";
    }

    this.id = id;
    this.tag = "me";
    this.controller =
      id === 0 ? new Controller() : new ControllerOpponent(this);
    var tmp_cards = shuffleSeeded(
      deck.cards,
      utf8ToBase64(
        `${Math.random().toString(36).substring(2, 36)}${this.ThatPlayerId}`,
      ),
      debug,
    );
    deck.cards = tmp_cards.array;
    this.deckseed = tmp_cards.seed;

    this.hand =
      id === 0
        ? new Hand(document.getElementById("hand-row"))
        : new HandOpponent();
    this.grave = new Grave(document.getElementById("grave-" + this.tag));
    this.deck = new Deck(
      deck.faction,
      document.getElementById("deck-" + this.tag),
    );
    this.deck_data = deck;

    this.leader = new Card(deck.leader, this);
    this.leader_init = new Card(deck.leader, this);
    this.elem_leader = document.getElementById("leader-" + this.tag);
    this.elem_leader.children[0].appendChild(this.leader.elem);

    this.reset();

    this.name = name;
    document.getElementById("name-" + this.tag).innerHTML = name;

    document.getElementById("deck-name-" + this.tag).innerHTML =
      factions[deck.faction].name;
    document
      .getElementById("stats-" + this.tag)
      .getElementsByClassName("profile-img")[0].children[0].children[0];
    let x = document.querySelector(
      "#stats-" + this.tag + " .profile-img > div > div",
    );
    x.style.backgroundImage = iconURL("deck_shield_" + deck.faction);
  }

  // Sets default values
  reset() {
    white_flame_lg_faction = {
      me: null,
      op: null,
    };
    gameended = false;
    this.grave.reset();
    this.hand.reset();
    this.deck.reset();
    this.deck.initializeFromID(this.deck_data.cards, this);

    this.health = maxhealth;
    this.total = 0;
    this.passed = false;
    this.handsize = thishandsize;
    this.winning = false;
    ability_reset("me");
    ability_reset("op");

    this.enableLeader();
    try {
      player_me.passed = false;
    } catch (e) {}
    try {
      player_op.passed = false;
    } catch (e) {}
    try {
      document.getElementById("passed-me").classList.remove("passed");
    } catch (e) {}
    try {
      document.getElementById("passed-op").classList.remove("passed");
    } catch (e) {}
    // this.setPassed(false);
    document.getElementById("gem1-" + this.tag).classList.add("gem-on");
    document.getElementById("gem2-" + this.tag).classList.add("gem-on");
  }

  // Returns the opponent Player
  opponent() {
    return board.opponent(this);
  }

  // Updates the player's total score and notifies the gamee
  updateTotal(n) {
    // console.log(`UPdtae total this`, this);
    this.total += n;
    document.getElementById("score-total-" + this.tag).children[0].innerHTML =
      this.total;
    board.updateLeader();
  }

  // Puts the player in the winning state
  setWinning(isWinning) {
    this.winning = Boolean(isWinning);

    document
      .getElementById(`score-total-${this.tag}`)
      .classList.toggle("score-leader", this.winning);
  }

  resetWinning() {
    this.setWinning(false);
  }

  // Puts the player in the passed state
  setPassed(hasPassed) {
    if (this.passed ^ hasPassed)
      document.getElementById("passed-" + this.tag).classList.toggle("passed");
    this.passed = hasPassed;
  }

  // Sets up board for turn
  async startTurn() {
    document.getElementById("stats-" + this.tag).classList.add("current-turn");
    if (this.leaderAvailable)
      this.elem_leader.children[1].classList.remove("hide");

    if (this === player_me) {
      document.getElementById("pass-button").classList.remove("noclick");
    }
  }

  // Passes the round and ends the turn
  passRound() {
    this.setPassed(true);
    this.endTurn();
  }

  // Plays a scorch card
  async playScorch(card) {
    console.log("playScorch", card, this);
    await this.playCardAction(
      card,
      async () => await ability_dict["scorch"].activated(card),
    );
  }

  // Plays a card to a specific row
  async playCardToRow(card, row) {
    await this.playCardAction(
      card,
      async () => await board.moveTo(card, row, this.hand),
    );
  }

  // Plays a card to the board
  async playCard(card) {
    await this.playCardAction(card, async () => await card.autoplay(this.hand));
  }

  // Shows a preview of the card being played, plays it to the board and ends the turn
  async playCardAction(card, action) {
    console.log(
      "[ShowCard]",
      card,
      action,
      ui_display_times.show_me_that_card_you_have,
    );
    ui.showPreviewVisuals(card);
    await sleep(ui_display_times.show_me_that_card_you_have);
    ui.hidePreview(card);
    await action();
    this.endTurn();
  }

  // Handles end of turn visuals and behavior the notifies the game
  endTurn() {
    if (!this.passed && !this.canPlay()) this.setPassed(true);
    if (this === player_me) {
      document.getElementById("pass-button").classList.add("noclick");
    }
    document
      .getElementById("stats-" + this.tag)
      .classList.remove("current-turn");
    this.elem_leader.children[1].classList.add("hide");
    game.endTurn();
  }

  // Tells the the Player if it won the round. May damage health.
  endRound(win) {
    if (!win) {
      if (this.health < 1) return;
      document
        .getElementById("gem" + this.health + "-" + this.tag)
        .classList.remove("gem-on");
      this.health--;
    }
    this.setPassed(false);
    this.setWinning(false);
  }

  // Returns true if the Player can make any action other than passing
  canPlay() {
    return this.hand.cards.length > 0 || this.leaderAvailable;
  }

  // Use a leader's Activate ability, then disable the leader
  async activateLeader() {
    ui.showPreviewVisuals(this.leader);
    tocar("leader_horn", false);
    await sleep(ui_display_times.faction_ability + 600);
    ui.hidePreview(this.leader);
    await this.leader.activated[0](this.leader, this);
    this.disableLeader();
    // this.endTurn();
  }

  // Disable access to leader ability and toggles leader visuals to off state
  disableLeader() {
    this.leaderAvailable = false;
    let elem = this.elem_leader.cloneNode(true);
    this.elem_leader.parentNode.replaceChild(elem, this.elem_leader);
    this.elem_leader = elem;
    this.elem_leader.children[0].classList.add("fade");
    this.elem_leader.children[1].classList.add("hide");
    this.elem_leader.addEventListener(
      "click",
      async () => await ui.viewCard(this.leader),
      false,
    );
  }

  // Enable access to leader ability and toggles leader visuals to on state
  async enableLeader() {
    this.leaderAvailable = this.leader.activated.length > 0;
    let elem = this.elem_leader.cloneNode(true);
    this.elem_leader.parentNode.replaceChild(elem, this.elem_leader);
    this.elem_leader = elem;
    this.elem_leader.children[0].classList.remove("fade");
    this.elem_leader.children[1].classList.remove("hide");

    if (this.id === 0 && this.leader.activated.length > 0) {
      this.elem_leader.addEventListener("click", async () => {
        await ui.viewCard(this.leader, async () => {
          var handData = await serializeCards(player_me.hand.cards);
          console.log("HandData", handData);
          await this.activateLeader();
          var handData_after = await serializeCards(player_me.hand.cards);
          console.log("HandData post", handData_after);
          await comp_and_send(
            socket,
            JSON.stringify({
              type: "useLeader",
              player: this.id,
              isMeHand: handData,
              HandMePost: handData_after,
            }),
          );
          await sleep(100);
          console.log("extraJSON vibe check:", extraJSON.length, extraJSON);
          if (extraJSON.length > 0) {
            const total = extraJSON.length;
            var opponent_see_card_delay = 2.5;
            showTooltip(
              getUiStrng("sync.init").replace(
                "%s",
                Math.floor(
                  (ui_display_times.faction_ability + 600) /
                    opponent_see_card_delay,
                ) / 1000,
              ),
            );
            await sleep(
              Math.floor(
                (ui_display_times.faction_ability + 600) /
                  opponent_see_card_delay,
              ),
            );
            if (med_draw === 1) {
              await sleep(medic_ability_revive_wait_a_second);
              comp_and_send(
                socket,
                JSON.stringify({ type: "medicrevivedata", data: extraJSON }),
              );
              med_draw = 0;
              extraJSON.length = 0;
            } else {
              for (let i = 0; i < total; i++) {
                const payload = extraJSON[i];

                // base hold + extra 500ms for each next packet
                const delay =
                  RegisterMovesHold +
                  i * 500 +
                  medicdrawextrasecondswait * 1000;

                console.log(
                  `Hold before send extraJSON ${i + 1}/${total}`,
                  payload,
                );

                showTooltip(
                  getUiStrng("sync.hold_progress")
                    .replace("%x", i + 1)
                    .replace("%y", total)
                    .replace("%s", delay / 1000),
                );

                await new Promise((resolve) => setTimeout(resolve, delay));

                comp_and_send(socket, payload);
              }
            }

            extraJSON = [];
          }
          if (player_op.passed && !player_me.passed) {
            ui.enablePlayer(false);
            showTooltip(
              getUiStrng("sync.sync").replace("%s", RegisterMovesHold / 1000),
            );
            ui.enablePlayer(false);
            await sleep(RegisterMovesHold);
            showTooltip(getUiStrng("sync.end"));
            ui.enablePlayer(true);
          }
          //	await init_sync_hands();
          //console.log("LEADER END TURN");
          await player_me.endTurn();
        });
      });
    } else {
      this.elem_leader.addEventListener(
        "click",
        async () => await ui.viewCard(this.leader),
        false,
      );
      if (player_op.passed && !player_me.passed) {
        ui.enablePlayer(false);
        showTooltip(
          getUiStrng("sync.sync").replace("%s", RegisterMovesHold / 1000),
        );
        ui.enablePlayer(false);
        await sleep(RegisterMovesHold);
        showTooltip(getUiStrng("sync.end"));
        ui.enablePlayer(true);
      }
      //console.log("LEADER END TURN");
      await player_me.endTurn();
    }
  }
}

// Handles the adding, removing and formatting of cards in a container
class CardContainer {
  constructor(elem) {
    this.elem = elem;
    this.cards = [];
  }

  // Returns the first card that satisfies the predcicate. Does not modify container.
  findCard(predicate) {
    for (let i = this.cards.length - 1; i >= 0; --i)
      if (predicate(this.cards[i])) return this.cards[i];
  }

  // Returns a list of cards that satisfy the predicate. Does not modify container.
  findCards(predicate) {
    return this.cards.filter(predicate);
  }

  // Returns a list of up to n cards that satisfy the predicate. Does not modify container.
  findCardsRandom(predicate, n) {
    let valid = predicate ? this.cards.filter(predicate) : this.cards;
    if (valid.length === 0) return [];
    if (!n || n === 1) return [valid[randomInt(valid.length)]];
    let out = [];
    for (let i = Math.min(n, valid.length); i > 0; --i) {
      let index = randomInt(valid.length);
      out.push(valid.splice(index, 1)[0]);
    }
    return out;
  }

  // Removes and returns a list of cards that satisy the predicate.
  getCards(predicate) {
    return this.cards
      .reduce((a, c, i) => (predicate(c, i) ? [i] : []).concat(a), [])
      .map((i) => this.removeCard(i));
  }

  // Removes and returns a card that satisfies the predicate.
  getCard(predicate) {
    for (let i = this.cards.length - 1; i >= 0; --i)
      if (predicate(this.cards[i])) return this.removeCard(i);
  }

  // Removes and returns any cards up to n that satisfy the predicate.
  getCardsRandom(predicate, n) {
    return this.findCardsRandom(predicate, n).map((c) => this.removeCard(c));
  }

  // Adds a card to the container along with its associated HTML element.
  addCard(card, index) {
    this.cards.push(card);
    this.addCardElement(card, index ? index : 0);
    this.resize();
  }

  // Removes a card from the container along with its associated HTML element.
  removeCard(card, index) {
    console.log("REMOVE CARD", card, index);
    if (this.cards.length === 0)
      throw "Cannot draw from empty " + this.constructor.name;
    card = this.cards.splice(
      isNumber(card) ? card : this.cards.indexOf(card),
      1,
    )[0];
    this.removeCardElement(card, index ? index : 0);
    this.resize();
    return card;
  }

  // Adds a card to a pre-sorted CardContainer
  addCardSorted(card) {
    let i = this.getSortedIndex(card);
    this.cards.splice(i, 0, card);
    return i;
  }

  // Returns the expected index of a card in a sorted CardContainer
  getSortedIndex(card) {
    for (var i = 0; i < this.cards.length; ++i)
      if (Card.compare(card, this.cards[i]) < 0) break;
    return i;
  }

  // Adds a card to a random index of the CardContainer
  //addCardRandom(card){
  //	this.cards.push(card);
  //	let index = randomInt(this.cards.length);
  //	if (index !== this.cards.length-1) {
  //		let t = this.cards[this.cards.length-1];
  //		this.cards[this.cards.length-1] = this.cards[index];
  //		this.cards[index] = t;
  //	}
  //	return index;
  //	}
  addCardRandom(card) {
    //	console.log("[addRCard] called", { game, card });

    this.cards.push(card);
    //	console.log("[addRCard] after push", { cardsLength: this.cards.length });
    var CardsAll = this.cards;
    //	console.log("CardPicked?", CardsAll);

    let index = randomInt(this.cards.length);
    //	console.log("[addRCard] random index", index);

    if (index !== this.cards.length - 1) {
      //console.log("[addRCard] swapping", {
      //	from: this.cards.length - 1,
      //	to: index
      //	});

      let t = this.cards[this.cards.length - 1];
      this.cards[this.cards.length - 1] = this.cards[index];
      this.cards[index] = t;
    }

    //console.log("[addRCard] result index", index, { game });
    //console.log("CardPicked?", CardsAll[this.cards.length - 1]);

    return index;
  }

  // Removes the HTML elemenet associated with the card from this CardContainer
  removeCardElement(card, index) {
    if (this.elem) this.elem.removeChild(card.elem);
  }

  // Adds the HTML elemenet associated with the card to this CardContainer
  addCardElement(card, index) {
    if (this.elem) {
      if (index === this.cards.length) this.elem.appendChild(card.elem);
      else this.elem.insertBefore(card.elem, this.elem.children[index]);
    }
  }

  // Empty function to be overried by subclasses that resize their content
  resize() {}

  // Modifies the margin of card elements inside a row-like container to stack properly
  resizeCardContainer(overlap_count, gap, coef) {
    let n = this.elem.children.length;
    let param =
      n < overlap_count ? "" + gap + "vw" : defineCardRowMargin(n, coef);
    let children = this.elem.getElementsByClassName("card");
    for (let x of children) x.style.marginLeft = x.style.marginRight = param;

    function defineCardRowMargin(n, coef = 0) {
      return (
        "calc((100% - (4.45vw * " +
        n +
        ")) / (2*" +
        n +
        ") - (" +
        coef +
        "vw * " +
        n +
        "))"
      );
    }
  }

  // Allows the row to be clicked
  setSelectable() {
    this.elem.classList.add("row-selectable");
  }

  // Disallows the row to be clicked
  clearSelectable() {
    this.elem.classList.remove("row-selectable");
    for (card in this.cards) card.elem.classList.add("noclick");
  }

  // Returns the container to its default, empty state
  reset() {
    while (this.cards.length) this.removeCard(0);
    if (this.elem)
      while (this.elem.firstChild) this.elem.removeChild(this.elem.firstChild);
    this.cards = [];
  }
}

// Contians all used cards in the order that they were discarded
class Grave extends CardContainer {
  constructor(elem) {
    super(elem);
    elem.addEventListener("click", () => ui.viewCardsInContainer(this), false);
  }

  // Override
  addCard(card) {
    this.setCardOffset(card, this.cards.length);
    super.addCard(card, this.cards.length);
  }

  // Override
  removeCard(card) {
    let n = isNumber(card) ? card : this.cards.indexOf(card);
    return super.removeCard(card, n);
  }

  // Override
  removeCardElement(card, index) {
    card.elem.style.left = "";
    super.removeCardElement(card, index);
    for (let i = index; i < this.cards.length; ++i) {
      this.setCardOffset(this.cards[i], i);
    }
  }

  // Offsets the card element in the deck
  setCardOffset(card, n) {
    card.elem.style.left = -0.03 * n + "vw";
  }
}

// Contains a randomized set of cards to be drawn from
class Deck extends CardContainer {
  constructor(faction, elem) {
    super(elem);
    this.faction = faction;

    this.counter = document.createElement("div");
    this.counter.classList = "deck-counter center";
    this.counter.appendChild(document.createTextNode(this.cards.length));
    this.elem.appendChild(this.counter);
  }

  // Creates duplicates of cards with a count of more than one, then initializes deck
  initializeFromID(card_id_list, player) {
    this.initialize(
      card_id_list.reduce(
        (a, c) => a.concat(clone(c.count, card_dict[c.index])),
        [],
      ),
      player,
    );
    function clone(n, elem) {
      for (var i = 0, a = []; i < n; ++i) a.push(elem);
      return a;
    }
  }

  // Populates a deck with a list of card data and associated those cards with the owner of this deck.
  initialize(card_data_list, player) {
    for (let i = 0; i < card_data_list.length; ++i) {
      let card = new Card(card_data_list[i], player);
      card.holder = player;
      this.addCardRandom(card);
      this.addCardElement();
    }
    this.resize();
  }

  // Override
  addCard(card) {
    this.addCardRandom(card);
    this.addCardElement();
    this.resize();
  }

  // Sends the top card from the Deck to the Hand
  async draw(hand) {
    let drawnCard = null;
    tocar("game_buy", false);
    if (hand === player_op.hand) {
      drawnCard = this.removeCard(0);
      hand.addCard(drawnCard);
    } else {
      drawnCard = this.cards[0];
      await board.toHand(drawnCard, this);
    }

    if (drawnCard !== null) return drawnCard;
  }
  // Draws a card and sends it to the container before adding a card from the container back to the deck.
  //swap(container, card){
  //	container.addCard(this.removeCard(0));
  //	this.addCard(card);
  //	}
  swap(container, card) {
    const fromDeck = this.cards[0]; // card that will be removed

    console.log(
      "SWAP START",
      "\n Deck gives:",
      fromDeck?.name,
      "\n Hand gives:",
      card?.name,
    );

    const removedFromDeck = this.removeCard(0);

    container.addCard(removedFromDeck);
    this.addCard(card);

    console.log(
      "SWAP RESULT",
      "\n -> Deck received:",
      card?.name,
      "\n -> Hand received:",
      removedFromDeck?.name,
    );
    try {
      var txt_draw = getUiStrng("redraw")
        .replace("%x", card?.name || "")
        .replace("%y", removedFromDeck?.name || "");
      console.log(txt_draw);
      cardredrawnotice(txt_draw);
    } catch (e) {
      console.log("cardredrawnotice err", e);
    }
  }

  // Override
  addCardElement() {
    let elem = document.createElement("div");
    elem.classList.add("deck-card");
    elem.style.backgroundImage = iconURL("deck_back_" + this.faction, "jpg");
    this.setCardOffset(elem, this.cards.length - 1);
    this.elem.insertBefore(elem, this.counter);
  }

  // Override
  removeCardElement() {
    this.elem.removeChild(this.elem.children[this.cards.length]).style.left =
      "";
  }

  // Offsets the card element in the deck
  setCardOffset(elem, n) {
    elem.style.left = -0.03 * n + "vw";
  }

  // Override
  resize() {
    this.counter.innerHTML = this.cards.length;
    this.setCardOffset(this.counter, this.cards.length);
  }

  // Override
  reset() {
    super.reset();
    this.elem.appendChild(this.counter);
  }
}

// Hand used by Opponent. Has an offscreen HTML element for card transitions.
class HandOpponent extends CardContainer {
  constructor() {
    super(undefined);
    this.counter = document.getElementById("hand-count-op");
    this.hidden_elem = document.getElementById("hand-op");
  }
  resize() {
    this.counter.innerHTML = this.cards.length;
  }
}

// Hand used by current player
class Hand extends CardContainer {
  constructor(elem) {
    super(elem);
    this.counter = document.getElementById("hand-count-me");
  }

  // Override
  addCard(card) {
    let i = this.addCardSorted(card);
    this.addCardElement(card, i);
    this.resize();
  }

  // Override
  resize() {
    this.counter.innerHTML = this.cards.length;
    this.resizeCardContainer(11, 0.075, 0.00225);
  }
}

// Contains active cards and effects. Calculates the current score of each card and the row.
class Row extends CardContainer {
  constructor(elem) {
    super(elem.getElementsByClassName("row-cards")[0]);
    this.elem_parent = elem;
    this.elem_special = elem.getElementsByClassName("row-special")[0];
    this.special = null;
    this.total = 0;
    this._id = { raw: elem.id, short: elem.id.split("-")[1] };
    this.id = elem.id.split("-")[1];
    this.effects = {
      weather: false,
      bond: {},
      morale: 0,
      horn: 0,
      mardroeme: 0,
    };
    this.elem.addEventListener("click", () => ui.selectRow(this), true);
    this.elem_special.addEventListener(
      "click",
      () => ui.selectRow(this),
      false,
      true,
    );
    this.elem.addEventListener("mouseover", function () {
      tocar("card", false);

      const color = getComputedStyle(document.documentElement)
        .getPropertyValue("--card-hover-shadow")
        .trim();

      this.style.boxShadow = `0 0 1.5vw ${color}`;
    });

    this.elem.addEventListener("mouseout", function () {
      this.style.boxShadow = "0 0 0 transparent";
    });
    console.log("[ROW CONSTRUCT]", elem.id, this);
  }

  // Override
  async addCard(card) {
    //		console.log("ADD CARD", card);
    if (card.hero) {
      var card_info = `${JSON.stringify({ a: card.faction + "_" + card.filename, b: card.holder.id, c: card.holder.tag, d: card.name, f: card.row })}-${gameID}`;
      var card_id_for_hero = card_info;
      //if (!herocardsdb.includes(card_id_for_hero)) {
      //  herocardsdb.push(card_id_for_hero);
      if (herocardanim === true) {
        console.log(
          "NEW HERO",
          card,
          card_id_for_hero,
          card_info,
          " ARRAY NOW",
          herocardsdb,
        );
        card.animate2("hero");
      }
      //	}
    }
    if (card.isSpecial()) {
      this.special = card;
      this.elem_special.appendChild(card.elem);
    } else {
      let index = this.addCardSorted(card);
      this.addCardElement(card, index);
      this.resize();
    }
    this.updateState(card, true);
    for (let x of card.placed) await x(card, this);
    card.elem.classList.add("noclick");
    await sleep(600);
    this.updateScore();
  }

  // Override
  removeCard(card) {
    card = isNumber(card)
      ? card === -1
        ? this.special
        : this.cards[card]
      : card;
    if (card.isSpecial()) {
      this.special = null;
      this.elem_special.removeChild(card.elem);
    } else {
      super.removeCard(card);
      card.resetPower();
    }
    this.updateState(card, false);
    for (let x of card.removed) x(card);
    this.updateScore();
    return card;
  }

  // Override
  removeCardElement(card, index) {
    super.removeCardElement(card, index);
    let x = card.elem;
    x.style.marginLeft = x.style.marginRight = "";
    x.classList.remove("noclick");
  }

  // Updates a card's effect on the row
  updateState(card, activate) {
    for (let x of card.abilities) {
      switch (x) {
        case "morale":
        case "horn":
        case "mardroeme":
          this.effects[x] += activate ? 1 : -1;
          break;
        case "bond":
          if (!this.effects.bond[card.id()]) this.effects.bond[card.id()] = 0;
          this.effects.bond[card.id()] += activate ? 1 : -1;
          break;
      }
    }
  }

  // Activates weather effect and visuals
  addOverlay(overlay) {
    var som =
      overlay == "fog" || overlay == "rain"
        ? overlay
        : overlay == "frost"
          ? "cold"
          : "";
    if (som != "") tocar(som, false);
    this.effects.weather = true;
    this.elem_parent
      .getElementsByClassName("row-weather")[0]
      .classList.add(overlay);
    this.updateScore();
  }

  // Deactivates weather effect and visuals
  removeOverlay(overlay) {
    this.effects.weather = false;
    this.elem_parent
      .getElementsByClassName("row-weather")[0]
      .classList.remove(overlay);
    this.updateScore();
  }

  // Override
  resize() {
    this.resizeCardContainer(10, 0.075, 0.00325);
  }

  // Updates the row's score by summing the current power of its cards
  updateScore() {
    let total = 0;
    for (let card of this.cards) {
      total += this.cardScore(card);
    }
    let player =
      this.elem_parent.parentElement.id === "field-op" ? player_op : player_me;
    player.updateTotal(total - this.total);
    this.total = total;
    this.elem_parent.getElementsByClassName(
      `row-score-${this._id.raw}`,
    )[0].innerHTML = this.total;
  }

  // Calculates and set the card's current power
  cardScore(card) {
    let total = this.calcCardScore(card);
    card.setPower(total);
    return total;
  }

  // Calculates the current power of a card affected by row affects
  calcCardScore(card) {
    let totalpower = 0;
    totalpower = this.calcCardScore_work(card);
    if (totalpower >= killoverpowercard) {
      this.scorch_a_card(card);
      return totalpower;
    }
    return totalpower;
  }
  calcCardScore_work(card) {
    //  console.log("calcCardScore(card)", card, this); //this.cards[0].holder.leader.abilities to get card 0 leader abilities, could be usefull in future
    if (card.name === "decoy") return 0;
    let total = card.basePower;
    var row_name = this.id;
    var player = card.holder;
    var leader_ability = player.leader.abilities[0];
    //   console.log("CARD HOLDER PLAYER", player);
    // outdated let this_row_have_quen = [false, 1, 2]; // should bool, multiplayer, axii weather etc, horn
    let this_row_have_quen = {
      siege: [false, 1, 2, 1], // bool (active), weather, horn, axii
      ranged: [false, 1, 2, 1],
      melee: [false, 1, 2, 1],
    };
    console.log("CALC swicth", leader_ability);
    switch (leader_ability) {
      case "king_bran":
        this_row_have_quen[row_name][0] = true;
        this_row_have_quen[row_name][1] = 0.5;
        //    console.log("this_row_have_quen change", this_row_have_quen);
        break;
    }
    if (
      this.cards.some((c) => c.filename === "wshield" || c.filename === "quen")
    ) {
      this_row_have_quen[row_name] = [true, 0.5, 1, 0.45];
    }
    ///   console.log("QUEEN", this_row_have_quen);
    if (this.cards.some((c) => c.filename === "darkstorm")) {
      if (card.hero === false) {
        card.pendingScorch = true;
        // this.scorch_a_card(card);
        return card.basePower;
      }
    }
    if (
      this.cards.some((c) => c.filename === "axii" || c.filename === "axii_p")
    ) {
      if (0 < total && total < axii.IfBasePowerUnder) {
        total =
          total - Math.ceil(axii.TakeAway * this_row_have_quen[row_name][3]);
      }
    }
    if (this.cards.some((c) => c.filename === "yrden")) {
      if (card.hero) {
        return total;
      } else if (card.name === "Witcher Signs: Yrden") {
        return 0;
      }

      total = total - this.cards.filter((c) => c.filename === "yrden").length;
    }
    if (this.cards.some((c) => c.filename === "igni")) {
      if (card.hero) {
        return total;
      } else if (card.name === "Witcher Signs: Igni") {
        return 0;
      }

      total = total + 1; //this.cards.filter(c => c.filename === "igni").length;
    }
    if (
      card.abilities.includes("magicthegathering") === true ||
      card.abilities.includes("tgc_portal") === true
    ) {
      var holder_is_the = this.cards.find((card) =>
        card.abilities?.includes("magicthegathering"),
      )?.holder?.ThatPlayerId;

      console.log(
        "magicthegathering",
        this,
        mtg_conf.unstable_mode,
        holder_is_the,
      );
      if (mtg_conf.unstable_mode === "random") {
        total =
          shuffleSeeded(
            [-3, -4, -5, -6, -3, -4, -4, -3, -6, -7, -2, -2, -1, 0, 1],
            utf8ToBase64(
              `${mtg_conf.daily_seed ? `${time_now_utc_to_b64()}` : ""}${mtg_conf.version}${turncount}${gameID}${holder_is_the}`,
            ),
            `MTG POWER CHECK Seeded from ${mtg_conf.daily_seed ? `${time_now_utc_to_b64()}` : ""}${mtg_conf.version}${turncount}${gameID}${holder_is_the}`,
          ).array[0] || 2;
        if (total > 0) {
          //	card.animate2("powergain"); //animations here are ugly
        } else if (total < 0) {
          //	card.animate2("debuff");
        }
      } else if (mtg_conf.unstable_mode === "unrandom") {
        return -3;
      } else {
        return 0;
      }
    }
    if (card.abilities.includes("powergain") === true) {
      let count = this.cards.length;

      // exclude self if needed
      if (!powergain.CountSelf) {
        count = Math.max(0, count - 1);
      }

      let bonus = count * powergain.ForEachCardGain;
      console.log(
        "[POWERGAIN]",
        ` Total valid cards: ${count}, making it ${bonus} bonus power by ${powergain.ForEachCardGain} for each card!`,
      );

      // apply weather debuff
      if (this.effects.weather) {
        bonus *=
          powergain.WeatherDebuffPercent * this_row_have_quen[row_name][1];
        console.log(
          "[POWERGAIN]",
          ` Total valid cards: ${count}, making it ${bonus} (lost ${powergain.WeatherDebuffPercent} by weather) bonus power by ${powergain.ForEachCardGain} for each card!`,
        );
      }

      // rounding
      bonus = powergain.Ceil ? Math.ceil(bonus) : Math.floor(bonus);
      console.log(
        "[POWERGAIN]",
        ` Return: ${bonus} rounded (Total:${total} = Total+Bonus:${total + bonus})`,
      );
      total += bonus;
      if (count > 1) {
        //	card.animate("powergain");
      }
      return total;
    }
    // card.animate("powergain");
    if (card.hero) return total;
    if (this.effects.weather)
      if (this_row_have_quen[row_name][0]) {
        total = Math.ceil(total * this_row_have_quen[row_name][1]);
      } else {
        total = Math.min(1, total);
      }
    if (game.doubleSpyPower && card.abilities.includes("spy")) total *= 2;
    if (game.doubleSpyPower && card.abilities.includes("sabotage"))
      //Double sabotage power
      total = Math.ceil(total * 1.5);
    let bond = this.effects.bond[card.id()];
    if (isNumber(bond) && bond > 1) total *= Number(bond);
    //	if (this?.effects.morale > 0) {
    //	card.animate("powergain");
    //	}
    total += Math.max(
      0,
      this.effects.morale + (card.abilities.includes("morale") ? -1 : 0),
    );
    if (this.effects.horn - (card.abilities.includes("horn") ? 1 : 0) > 0)
      //	card.animate("powergain");
      total *= this_row_have_quen[row_name][2];
    return total;
  }

  // Applies a temporary leader horn affect that is removed at the end of the round
  async leaderHorn() {
    if (this.special !== null) return;
    let horn = new Card(card_dict[5], null);
    await this.addCard(horn);
    game.roundEnd.push(() => this.removeCard(horn));
  }

  // Applies a local scorch effect to this row
  async scorch() {
    console.log("schorch play", this);
    if (this.total >= 10)
      await Promise.all(
        this.maxUnits().map(async (c) => {
          //        console.log("schroch", c);
          await c.animate("scorch", true, false);
          await board.toGrave(c, this);
        }),
      );
  }

  async scorch_a_card(card) {
    console.log("scorch_a_card", name, this);
    if (!card) return;
    console.log("scorch_a_card(card)", card);
    if (card.hero) return;

    // Find the row/container the card is currently in
    let row = board.row.find((r) => r.cards.includes(card));

    if (!row) return;

    // Play scorch animation
    await card.animate("scorch", true, false);

    // Move card to graveyard
    await board.toGrave(card, row);
  }

  // Removes all cards and effects from this row
  clear() {
    if (this.special != null) board.toGrave(this.special, this);
    console.log("Before:", this.cards);

    this.cards
      .filter((c) => c.noRemove === "1" || !c.noRemove)
      .forEach((c) => board.toGrave(c, this));

    console.log("After grave:", this.cards);

    this.cards
      .filter((c) => c.noRemove === "0")
      .forEach(
        (c) => (c.noRemove = "1"),
        console.log("NO REMOVE REMOVED FROM C"),
      );

    console.log("After reset:", this.cards);
  }

  // Returns all regular unit cards with the heighest power
  maxUnits() {
    let max = [];
    for (let i = 0; i < this.cards.length; ++i) {
      let card = this.cards[i];
      if (!card.isUnit()) continue;
      if (!max[0] || max[0].power < card.power) max = [card];
      else if (max[0].power === card.power) max.push(card);
    }
    return max;
  }

  // Override
  reset() {
    super.reset();
    while (this.special) this.removeCard(this.special);
    while (this.elem_special.firstChild)
      this.elem_special.removeChild(this.elem_speical.firstChild);
    this.total = 0;
    //["rain","fog","frost"].forEach( w => this.removeOverlay(w) );
    this.effects = {
      weather: false,
      bond: {},
      morale: 0,
      horn: 0,
      mardroeme: 0,
    };
  }
}

// Handles how weather effects are added and removed
class Weather extends CardContainer {
  constructor(elem) {
    super(document.getElementById("weather"));
    this.types = {
      rain: { name: "rain", count: 0, rows: [] },
      fog: { name: "fog", count: 0, rows: [] },
      frost: { name: "frost", count: 0, rows: [] },
    };
    let i = 0;
    for (let key of Object.keys(this.types))
      this.types[key].rows = [board.row[i], board.row[5 - i++]];

    this.elem.addEventListener("click", () => ui.selectRow(this), false);
  }

  // Adds a card if unique and clears all weather if 'clear weather' card added
  async addCard(card) {
    super.addCard(card);
    card.elem.classList.add("noclick");
    if (card.name === "Clear Weather") {
      // TODO Sunlight animation
      sunlightEffect();
      // idk what it is
      tocar("clear", false);
      await sleep(500);
      this.clearWeather();
    } else {
      this.changeWeather(
        card,
        (x) => ++this.types[x].count === 1,
        (r, t) => r.addOverlay(t.name),
      );
      for (let i = this.cards.length - 2; i >= 0; --i) {
        if (card.name === this.cards[i].name) {
          await sleep(750);
          await board.toGrave(card, this);
          break;
        }
      }
    }
    await sleep(750);
  }

  // Override
  removeCard(card) {
    card = super.removeCard(card);
    card.elem.classList.remove("noclick");
    this.changeWeather(
      card,
      (x) => --this.types[x].count === 0,
      (r, t) => r.removeOverlay(t.name),
    );
    return card;
  }

  // Checks if a card's abilities are a weather type. If the predicate is met, perfom the action
  // on the type's associated rows
  changeWeather(card, predicate, action) {
    for (let x of card.abilities) {
      if (x in this.types && predicate(x)) {
        for (let r of this.types[x].rows) action(r, this.types[x]);
      }
    }
  }

  // Removes all weather effects and cards
  async clearWeather() {
    await Promise.all(
      this.cards
        .map((c, i) => this.cards[this.cards.length - i - 1])
        .map((c) => board.toGrave(c, this)),
    );
  }

  // Override
  resize() {
    this.resizeCardContainer(4, 0.075, 0.045);
  }

  // Override
  reset() {
    super.reset();
    Object.keys(this.types).map((t) => (this.types[t].count = 0));
  }
}

//
class Board {
  constructor() {
    this.op_score = 0;
    this.me_score = 0;
    this.row = [];
    for (let x = 0; x < 6; ++x) {
      let elem = document.getElementById(x < 3 ? "field-op" : "field-me")
        .children[x % 3];
      this.row[x] = new Row(elem);
    }
  }

  // Get the opponent of this Player
  opponent(player) {
    return player === player_me ? player_op : player_me;
  }

  // Sends and translates a card from the source to the Deck of the card's holder
  async toDeck(card, source) {
    tocar("discard", false);
    await this.moveTo(card, "deck", source);
  }

  // Sends and translates a card from the source to the Grave of the card's holder
  async toGrave(card, source) {
    //  console.log("To grave wich you", card, source);
    await this.moveTo(card, "grave", source);
  }

  // Sends and translates a card from the source to the Hand of the card's holder
  async toHand(card, source) {
    await this.moveTo(card, "hand", source);
  }

  // Sends and translates a card from the source to Weather
  async toWeather(card, source) {
    await this.moveTo(card, weather, source);
  }

  // Sends and translates a card from the source to the Deck of the card's combat row
  async toRow(card, source) {
    let row = card.row === "agile" ? "close" : card.row ? card.row : "close";
    await this.moveTo(card, row, source);
  }

  // Sends and translates a card from the source to a specified row name or CardContainer
  async moveTo(card, dest, source) {
    if (isString(dest)) dest = this.getRow(card, dest);

    try {
      cartaNaLinha(dest.elem.id, card);
    } catch (err) {}
    await translateTo(card, source ? source : null, dest);
    await dest.addCard(source ? source.removeCard(card) : card);
  }

  // Sends and translates a card from the source to a row name associated with the passed player
  async addCardToRow(card, row_name, player, source) {
    let row = this.getRow(card, row_name, player);
    try {
      cartaNaLinha(row.elem.id, card);
    } catch (err) {}
    await translateTo(card, source, row);
    await row.addCard(card);
  }

  // Returns the CardCard associated with the row name that the card would be sent to
  getRow(card, row_name, player) {
    player = player ? player : card ? card.holder : player_me;
    let isMe = player === player_me;
    let isSpy = card.abilities.some((ability) => ThatIsSpy.includes(ability));
    switch (row_name) {
      case "weather":
        return weather;
        break;
      case "close":
        return this.row[isMe ^ isSpy ? 3 : 2];
      case "ranged":
        return this.row[isMe ^ isSpy ? 4 : 1];
      case "siege":
        return this.row[isMe ^ isSpy ? 5 : 0];
      case "grave":
        return player.grave;
      case "deck":
        return player.deck;
      case "hand":
        return player.hand;
      default:
        console.error(
          card.name +
            ' sent to incorrect row "' +
            row_name +
            '" by ' +
            card.holder.name,
        );
    }
  }

  // Updates which player currently is in the lead
  updateLeader() {
    let dif = player_me.total - player_op.total;
    player_me.setWinning(dif > 0);
    player_op.setWinning(dif < 0);
  }
}

class Game {
  constructor() {
    this.endScreen = document.getElementById("end-screen");
    let buttons = this.endScreen.getElementsByTagName("button");
    this.customize_elem = buttons[0];
    //	this.replay_elem = buttons[1];
    this.customize_elem.addEventListener(
      "click",
      () => this.returnToCustomization(),
      false,
    );
    //	this.replay_elem.addEventListener("click", () => this.restartGame(), false);
    this.reset();
  }

  async reset() {
    this.firstPlayer;
    this.currPlayer = null;

    this.gameStart = [];
    this.roundStart = [];
    this.roundEnd = [];
    this.turnStart = [];
    this.turnEnd = [];

    this.roundCount = 0;
    this.roundHistory = [];

    this.randomRespawn = false;
    this.doubleSpyPower = false;

    weather.reset();
    await board.row.forEach((r) => r.reset());
    player_me.total = 0;
    player_op.total = 0;
    player_me.winning = false;
    player_op.winning = false;
  }

  // Sets up player faction abilities and psasive leader abilities
  initPlayers(p1, p2) {
    let l1 = ability_dict[p1.leader.abilities[0]];
    let l2 = ability_dict[p2.leader.abilities[0]];
    if (
      l1 === ability_dict["emhyr_whiteflame"] ||
      l2 === ability_dict["emhyr_whiteflame"]
    ) {
      p1.disableLeader();
      p2.disableLeader();
    } else {
      initLeader(p1, l1);
      initLeader(p2, l2);
    }
    if (p1.deck.faction === p2.deck.faction && p1.deck.faction === "scoiatael")
      return;
    initFaction(p1);
    initFaction(p2);

    function initLeader(player, leader) {
      if (leader.placed) leader.placed(player.leader);
      Object.keys(leader)
        .filter((key) => game[key])
        .map((key) => game[key].push(leader[key]));
    }

    function initFaction(player) {
      if (
        factions[player.deck.faction] &&
        factions[player.deck.faction].factionAbility
      )
        factions[player.deck.faction].factionAbility(player);
    }
  }

  // Initializes player abilities, hands and waits for cointoss
  async startGame() {
    await game.reset();
    var btn = document.getElementById("session-start-control");
    btn.textContent = "Game \nStarting";
    ui.enablePlayer(false);
    tocar("tf2/Vote_success", false);
    btnCancelElem.classList.add("hidden");
    btnCreateElem.classList.add("hidden");
    btnJoinElem.classList.add("hidden");
    gameStartControlsElem.classList.add("hide");
    // isOpponentReadyElem.classList.add("hidden");
    turncount = 1;
    gameID = gameID + 1;
    ui.resumeYouTube();
    // CLEAR OLD BOARD
    board.row.forEach((row) => row.clear());
    weather.clearWeather();
    await sleep(10);
    player_op.grave.reset();
    player_me.grave.reset();
    await sleep(10);
    player_op.total = 0;
    player_me.total = 0;
    board.row.forEach((r) => r.updateScore());
    ability_disable("me");
    ability_disable("op");
    // Emhyr white flame v2
    white_flame_lg_faction = {
      me: player_me.leader.faction,
      op: player_op.leader.faction,
    };
    add_redraws = 0;
    if (
      player_me.leader.abilities?.includes("emhyr_whiteflame2") &&
      player_me.leader.filename !== player_op.leader.filename
    ) {
      var tmp_faction_me = player_me.leader.faction;
      white_flame_lg_faction.me = player_op.leader.faction;
      player_me.leader = new Card(player_op.deck_data.leader, player_me);
      await ui.notification(
        `whiteflame2-me_${player_me.leader_init.faction}`,
        ui_display_times.faction_ability,
      );
      await sleep(30);
      player_me.leader.faction = tmp_faction_me;
      try {
        if (typeof player_op.leader.activated[0] !== "function") {
          player_me.disableLeader(true);
        }
      } catch (e) {}
    }
    if (
      player_op.leader.abilities?.includes("emhyr_whiteflame2") &&
      player_me.leader.filename !== player_op.leader.filename
    ) {
      var tmp_faction_op = player_op.leader.faction;
      white_flame_lg_faction.op = player_me.leader.faction;
      player_op.leader = new Card(player_me.deck_data.leader, player_op);
      add_redraws = 2;
      await ui.notification(
        `whiteflame2-op_${player_op.leader_init.faction}`,
        ui_display_times.faction_ability,
      );
      player_op.leader.faction = tmp_faction_op;
      await sleep(30);
      try {
        if (typeof player_me.leader.activated[0] !== "function") {
          player_op.disableLeader(true);
        }
      } catch (e) {}
    }
    console.log("additional redraws:", add_redraws);
    if (
      player_me.leader?.abilities?.[0] === "mediclove" ||
      player_op.leader?.abilities?.[0] === "mediclove"
    ) {
      await ui.notification("medicextra", ui_display_times.faction_ability);
    }
    // End of white falme
    // Cleared i hope
    await sleep(20);
    ui.youtubePlay(
      audio_yt_vid_soundtrack,
      audio_yt_vid_soundtrack_volume,
      true,
    );
    stop_wait_music();
    updateOpponentUI({
      name: " ",
      state: `${current_op.me_flag === null ? op_icon_faction : `<svg width=\"32\" height=\"32\" xmlns=\"http:\/\/www.w3.org\/2000\/svg\">\r\n    <!-- Background image as base64 -->\r\n    <image href=\"${op_icon_faction}\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"none\"\/>\r\n    <!-- Remote image in bottom-right corner -->\r\n    <image x=\"17\" y=\"17\" width=\"15\" height=\"15\" href=\"${current_op.me_flag === null ? op_icon_faction : `https://flagsapi.com/${current_op.me_flag}/flat/64.png`}\"\/>\r\n<\/svg>`}`,
      status: `Game In Progress!`,
    });
    await sleep(10);
    player_op.total = 0;
    player_me.total = 0;
    player_me.setWinning(false);
    player_op.setWinning(false);
    this.resetTurnUI("me");
    this.resetTurnUI("op");
    ui.toggleMusic_elem.style.left = "26vw";

    ui.toggleMusic_elem.classList.remove("music-customization");
    this.currPlayer = player_me;
    this.initPlayers(player_me, player_op);
    console.log("[FS] running fullscreen req");
    openFullscreen();
    console.log("start game players:", player_me, player_op);
    await ability_setup("me", player_me.leader.abilities[0]);
    await ability_setup("op", player_op.leader.abilities[0]);
    await sleep(5);
    await set_start_power("me");
    await set_start_power("op");
    var meleadercardloss =
      player_me.leader.abilities[0] === "nilf_drawmaster"
        ? nilfard_drawmaster.cardban
        : 0;
    var cardspecialgain = 0;
    console.log("On game start i lose cards:", meleadercardloss);
    var gamestart_thishandsize =
      thishandsize + cardspecialgain - meleadercardloss;
    if (
      player_me.leader.abilities.includes("gaunter_neutral_leader") ||
      player_op.leader.abilities.includes("gaunter_neutral_leader")
    ) {
      gamestart_thishandsize = Math.floor(
        gamestart_thishandsize * (1 + gaunter_lider.extra_cards),
      );
    }
    console.log("End game start hannd size", gamestart_thishandsize);
    await Promise.all(
      [...Array(gamestart_thishandsize).keys()].map(async () => {
        await player_me.deck.draw(player_me.hand);
        // await player_op.deck.draw(player_op.hand);
      }),
    );
    var op_meleadercardloss =
      player_op.leader.abilities[0] === "nilf_drawmaster"
        ? nilfard_drawmaster.cardban
        : 0;
    var op_cardspecialgain = cardspecialgain;
    console.log("On game start op lose cards:", op_meleadercardloss);
    var op_gamestart_thishandsize =
      thishandsize + op_cardspecialgain - op_meleadercardloss;
    if (
      player_me.leader.abilities.includes("gaunter_neutral_leader") ||
      player_op.leader.abilities.includes("gaunter_neutral_leader")
    ) {
      op_gamestart_thishandsize = Math.floor(
        op_gamestart_thishandsize * (1 + gaunter_lider.extra_cards),
      );
    }
    console.log("End game start hannd size", op_gamestart_thishandsize);
    await Promise.all(
      [...Array(op_gamestart_thishandsize).keys()].map(async () => {
        // await player_me.deck.draw(player_me.hand);
        await player_op.deck.draw(player_op.hand);
      }),
    );

    try {
      eval(ongame_start_eval);
    } catch (e) {
      console.log("Game eval start fail", e);
    }

    await this.runEffects(this.gameStart);
    tocar("game_opening", false);
    if (
      player_op.deck.faction === "scoiatael" &&
      player_me.deck.faction !== "scoiatael"
    ) {
      var btn2 = document.getElementById("session-start-control");
      btn2.textContent = "Waiting for opponent to start";
      //    showTooltip("Opponent used Scoia'tael faction ability to pick who play first!", 9000);
      ui.notification("scol_pick", 5000);
      await new Promise((resolve) => {
        const handleMessage = async (event) => {
          const data = await recv_and_decomp(event);
          console.log(
            "Player op have a Squirrel leader, waiting for msg",
            event,
          );
          if (data.type === "scoiataelStart") {
            console.log("Is who start info vs Squirrel");
            const player = data.first === "me" ? player_op : player_me;
            game.firstPlayer = player;
            game.currPlayer = player;
            this.resetTurnUI("me");
            this.resetTurnUI("op");
            socket.removeEventListener("message", handleMessage);
            var btn4 = document.getElementById("session-start-control");
            btn4.textContent = "Game In Progress";
            await scol_fake_coin();
            resolve(true);
          }
        };
        socket.addEventListener("message", handleMessage);
      });

      comp_and_send(socket, JSON.stringify({ type: "gameStart" }));
      await this.initialRedraw();
    } else if (
      player_me.deck.faction === "scoiatael" &&
      player_op.deck.faction !== "scoiatael"
    ) {
      comp_and_send(socket, JSON.stringify({ type: "gameStart" }));

      await this.initialRedraw();
    } else {
      comp_and_send(socket, JSON.stringify({ type: "gameStart" }));
      await this.coinToss();

      await this.initialRedraw();
    }
    var btn3 = document.getElementById("session-start-control");
    btn3.textContent = "Game In Progress";
  }

  // Determines who starts first
  async coinToss() {
    return new Promise((resolve) => {
      const handleMessage = async (event) => {
        const data = await recv_and_decomp(event);

        if (data.type === "coinToss") {
          let player;
          if (data.player === playerId) {
            player = player_me;
            passButton.classList.remove("hidden");
            ui.showSurrender(true);
            document.addEventListener("keydown", handleKeyDown);
            document.addEventListener("keyup", handleKeyUp);
          } else {
            player = player_op;
          }
          game.firstPlayer = player;
          game.currPlayer = player;
          this.resetTurnUI("me");
          this.resetTurnUI("op");

          var special = "";
          try {
            special = data.special;
          } catch (e) {}

          socket.removeEventListener("message", handleMessage);
          //  await ui.notification(
          //   game.firstPlayer.tag + "-coin" + special,
          //    ui_display_times.coin,
          //  );
          await displayCoinToss(
            game.firstPlayer.tag,
            {
              me: `img/icons/notif_me_coin${special}.png`,
              op: `img/icons/notif_op_coin${special}.png`,
            },
            map_results_txt[`_${game.firstPlayer.tag}${special}`],

            player_me.leader_init.filename,
            player_me.name,
            map_results_color[player_me.leader.faction],
            player_me.leader_init.faction,

            player_op.leader_init.filename,
            player_op.name,
            map_results_color[player_op.leader.faction],
            player_op.leader_init.faction,
          );
          resolve(true);
        }
      };
      socket.addEventListener("message", handleMessage);
    });
  }

  // Allows the player to swap out up to two cards from their iniitial hand
  async initialRedraw() {
    amReady = false;
    opponentReady = false;
    var nilfard_drawmaster_draws =
      player_me.leader.abilities[0] === "nilf_drawmaster"
        ? nilfard_drawmaster.drawextra
        : 0;
    var OnGameStartDraw2 =
      OnGameStartDraw + nilfard_drawmaster_draws + add_redraws;
    if (debug == true)
      await ui.queueCarousel(
        player_me.hand,
        OnGameStartDraw2,
        async (c, i) => await player_me.deck.swap(c, c.removeCard(i)),
        (c) => true,
        true,
        true,
        `Choose up to ${OnGameStartDraw2} cards to redraw.`,
      );
    else
      await ui.queueCarousel(
        player_me.hand,
        OnGameStartDraw2,
        async (c, i) => await player_me.deck.swap(c, c.removeCard(i)),
        (c) => true,
        true,
        true,
        `Choose up to ${OnGameStartDraw2} cards to redraw.`,
      );
    ui.enablePlayer(false);

    comp_and_send(
      socket,
      JSON.stringify({
        type: "initial_reDraw",
        hand: removeCircularReferences(player_me.hand.cards),
        deck: removeCircularReferences(player_me.deck.cards),
      }),
    );
  }

  // Initiates a new round of the game
  async startRound() {
    this.roundCount++;
    this.currPlayer =
      this.roundCount % 2 === 0
        ? this.firstPlayer
        : this.firstPlayer.opponent();
    player_me.setPassed(false);
    player_op.setPassed(false); //tried reset to resolve desync //Update it worked, ez
    await this.runEffects(this.roundStart);

    if (!player_me.canPlay()) player_me.setPassed(true);
    if (!player_op.canPlay()) player_op.setPassed(true);

    if (player_op.passed && player_me.passed) return this.endRound();

    if (this.currPlayer.passed) this.currPlayer = this.currPlayer.opponent();

    await ui.notification("round-start", ui_display_times.round_start);
    if (this.currPlayer.opponent().passed)
      await ui.notification(
        this.currPlayer.tag + "-turn",
        ui_display_times.turn,
      );

    this.startTurn();
  }

  // Starts a new turn. Enables client interraction in client's turn.
  async startTurn() {
    //console.log("startTurn()", player_me, player_op);

    await this.runEffects(this.turnStart);
    if (!this.currPlayer.opponent().passed) {
      this.currPlayer = this.currPlayer.opponent();
      ui.notification(this.currPlayer.tag + "-turn", ui_display_times.turn);
    }
    if (this.currPlayer === player_me) {
      passButton.classList.remove("hidden");
      ui.showSurrender(true);
      //     document.addEventListener("keydown", handleKeyDown);
      //     document.addEventListener("keyup", handleKeyUp);
      ui.enablePlayer(true);
    } else {
      passButton.classList.add("hidden");
      ui.showSurrender(false);
      //      document.removeEventListener("keydown", handleKeyDown);
      //    document.removeEventListener("keyup", handleKeyUp);
    }

    this.currPlayer.startTurn();
  }

  resetTurnUI(side) {
    var pla = player_op;
    if (side === "me") {
      pla = player_me;
    }
    document.getElementById("stats-" + side).classList.remove("current-turn");
    passButton.classList.toggle("hidden", true);
    ui.showSurrender(false);
    ui.enablePlayer(false);
  }

  // Ends the current turn and may end round. Disables client interraction in client's turn.
  async endTurn() {
    board.row.forEach((r) => {
      if (
        r.cards.some((card) => card.abilities?.includes("magicthegathering"))
      ) {
        r.updateScore();
      }
    });
    turncount = turncount + 1;
    console.log(
      `TURN ENDED: Turn ${turncount - 1}\nNext turn will be: ${turncount}`,
    );
    if (announce_turn_count) {
      showTooltip(getUiStrng("end_turn").replace("%s", ordinal(turncount - 1)));
    }
    if (darknessstorm_await === true) {
      for (const row of board.row) {
        for (const card of [...row.cards]) {
          if (card.pendingScorch) {
            card.pendingScorch = false;
            await row.scorch_a_card(card);
          }
        }
      }
    } else {
      await Promise.all(
        board.row.flatMap((row) =>
          [...row.cards]
            .filter((card) => card.pendingScorch)
            .map(async (card) => {
              card.pendingScorch = false;
              await row.scorch_a_card(card);
            }),
        ),
      );
    }
    if (this.currPlayer === player_me) ui.enablePlayer(false);
    await this.runEffects(this.turnEnd);
    if (this.currPlayer.passed)
      await ui.notification(
        this.currPlayer.tag + "-pass",
        ui_display_times.pass,
      );
    if (player_op.passed && player_me.passed) {
      this.endRound();
    } else {
      if (this.currPlayer.tag === "me") {
        // Gain power to abilities
        if (ability_data.me.enabled) {
          try {
            ability_add("me", ability_data.me.add);
          } catch (e) {}
        }
      } else {
        if (ability_data.op.enabled) {
          try {
            ability_add("op", ability_data.op.add);
          } catch (e) {}
        }
      }
      this.startTurn();
    }
  }

  // Ends the round and may end the game. Determines final scores and the round winner.
  async endRound() {
    let dif = player_me.total - player_op.total;

    // null = no Nilfgaard tie-break, "me" = I won by Nilfgaard, "op" = opponent won by Nilfgaard
    let nilfgaardWin = "no";

    if (dif === 0) {
      let nilf_me = player_me.deck.faction === "nilfgaard",
        nilf_op = player_op.deck.faction === "nilfgaard";

      if (nilf_me ^ nilf_op) {
        nilfgaardWin = nilf_me ? "me" : "op";
        dif = nilf_me ? 1 : -1;
      }
    }

    // nilfgaardWin is now:
    // - "no"  -> normal result (win/lose/draw)
    // - "me"  -> player_me won because of Nilfgaard
    // - "op"  -> player_op won because of Nilfgaard

    // Gain power to abilities
    if (ability_data.me.enabled) {
      try {
        var addme = ability_data.me.add * 2;
        ability_add("me", Number(addme.toFixed(2)));
      } catch (e) {}
    }
    if (ability_data.op.enabled) {
      try {
        var addop = ability_data.op.add * 2;
        ability_add("op", Number(addop.toFixed(2)));
      } catch (e) {}
    }
    let winner = dif > 0 ? player_me : dif < 0 ? player_op : null;
    let verdict = {
      winner: winner,
      score_me: player_me.total,
      score_op: player_op.total,
    };
    this.roundHistory.push(verdict);

    await this.runEffects(this.roundEnd);

    board.row.forEach((row) => row.clear());
    weather.clearWeather();

    player_me.endRound(dif > 0);
    player_op.endRound(dif < 0);
    if (nilfgaardWin === "no") {
      if (dif > 0)
        await ui.notification("win-round", ui_display_times.round_end_result);
      else if (dif < 0)
        await ui.notification("lose-round", ui_display_times.round_end_result);
      else
        await ui.notification("draw-round", ui_display_times.round_end_result);

      if (player_me.health === 0 || player_op.health === 0) {
        this.endGame();
      } else {
        this.startRound();
      }
    } else {
      await ui.notification(
        `${nilfgaardWin}_win_via_nilfgaard`,
        ui_display_times.round_end_result,
      );

      if (player_me.health === 0 || player_op.health === 0) {
        this.endGame();
      } else {
        this.startRound();
      }
    }
  }
  // Sets up and displays the end-game screen
  async endGame() {
    document.getElementById("session-start-control").classList.remove("ready");
    let endScreen = document.getElementById("end-screen");
    let rows = endScreen.getElementsByTagName("tr");
    rows[1].children[0].innerHTML = player_me.name;
    rows[2].children[0].innerHTML = player_op.name;

    for (let i = 1; i < 4; ++i) {
      let round = this.roundHistory[i - 1];
      rows[1].children[i].innerHTML = round ? round.score_me : 0;
      rows[1].children[i].style.color =
        round && round.winner === player_me ? "goldenrod" : "";

      rows[2].children[i].innerHTML = round ? round.score_op : 0;
      rows[2].children[i].style.color =
        round && round.winner === player_op ? "goldenrod" : "";
    }
    const subtitle = endScreen.querySelector("p");
    if (subtitle) {
      subtitle.classList.add("hide");
      subtitle.innerHTML = "";
    }
    endScreen.children[0].className = "";
    console.log("---------------------");
    if (player_op.health <= 0 && player_me.health <= 0) {
      if (game_draw_force_rematch) {
        var end_screen = false;
        console.log("Game over || Draw");
        gameended = true;
        ui.enablePlayer(false);
        tocar("tf2/game_draw", true);
        await ui.notification("draw_end", 8000);
        //  game.draw_restart();
        this.restartGame();
      } else {
        var end_screen = true;
        tocar("tf2/game_draw_not_redraw", true);
        endScreen.getElementsByTagName("p")[0].classList.remove("hide");
        endScreen.children[0].classList.add("end-draw");
      }
    } else if (player_op.health === 0) {
      var end_screen = true;
      tocar("game_win", true);
      endScreen.children[0].classList.add("end-win");
      console.log("Game over || Victory");
      gameended = true;
    } else {
      var end_screen = true;
      tocar("game_lose", true);
      endScreen.children[0].classList.add("end-lose");
      endScreen.children[0].classList.add("end-lose");
      console.log("Game over || Defeat");
      gameended = true;
    }
    if (end_screen) {
      fadeIn(endScreen, 300);
      ui.enablePlayer(true);
    } else {
      ui.enablePlayer(false);
    }
  }
  async surrenderEnd(winner) {
    //  document
    //    .getElementById("session-start-control")
    //    .classList.remove("ready");

    const endScreen = document.getElementById("end-screen");
    const rows = endScreen.getElementsByTagName("tr");

    rows[1].children[0].innerHTML = player_me.name;
    rows[2].children[0].innerHTML = player_op.name;

    // Fill rounds exactly like normal game
    for (let i = 1; i < 4; ++i) {
      const round = this.roundHistory[i - 1];

      rows[1].children[i].innerHTML = round ? round.score_me : 0;

      rows[2].children[i].innerHTML = round ? round.score_op : 0;

      rows[1].children[i].style.color =
        round && round.winner === player_me ? "goldenrod" : "";

      rows[2].children[i].style.color =
        round && round.winner === player_op ? "goldenrod" : "";
    }

    endScreen.children[0].className = "";

    gameended = true;
    ui.enablePlayer(false);

    const subtitle = endScreen.querySelector("p");

    if (winner === player_me) {
      console.log("Game over || Victory by surrender");

      tocar("game_win", true);

      endScreen.children[0].classList.add("end-win");

      if (subtitle) {
        subtitle.classList.remove("hide");
        subtitle.innerHTML = "Your opponent has surrendered.";
      }
    } else {
      console.log("Game over || Defeat by surrender");

      tocar("game_lose", true);

      endScreen.children[0].classList.add("end-lose");

      if (subtitle) {
        subtitle.classList.remove("hide");
        subtitle.innerHTML = "You have surrendered.";
      }
    }

    fadeIn(endScreen, 300);
    ui.enablePlayer(true);
  }

  // Returns the client to the deck customization screen
  returnToCustomization() {
    if (!waitMusicPlaying) {
      ui.youtubePlay(tavern_yt_vid, tavern_yt_volume, true);
    }
    comp_and_send(socket, JSON.stringify({ type: "unReady" }));
    amReady = false;
    toggleReadyWaiting(amReady);
    //  opponentReady = false;
    document.getElementById("session-start-control").classList.remove("ready");

    ui.toggleMusic_elem.style.left = "20.5vw";

    this.reset();
    player_me.reset();
    player_op.reset();
    var btn5 = document.getElementById("session-start-control");
    btn5.textContent = "Ready";
    //	ui.toggleMusic_elem.classList.add("music-customization");
    this.endScreen.classList.add("hide");
    customizationElem.classList.remove("hide");
    gameStartControlsElem.classList.remove("hide");
    customizationElem.classList.remove("noclick");
    if (isconnectedtosession) {
      btnCancelElem.classList.remove("hidden");
    }
    ui.enablePlayer(true);
  }

  // Restarts the last game with the same decks
  restartGame() {
    this.reset();
    player_me.reset();
    player_op.reset();
    this.endScreen.classList.add("hide");
    this.startGame();
  }

  // Executes effects in list. If effect returns true, effect is removed.
  async runEffects(effects) {
    for (let i = effects.length - 1; i >= 0; --i) {
      let effect = effects[i];
      if (await effect()) effects.splice(i, 1);
    }
  }
}

// Contains information and behavior of a Card
class Card {
  constructor(card_data, player) {
    console.log("constructor card data", card_data, player);
    this.name = card_data.name;
    this.basePower = this.power = Number(card_data.strength);
    this.faction = card_data.deck;
    this.abilities =
      card_data.ability === "" ? [] : card_data.ability.split(" ");
    this.row = card_data.deck === "weather" ? card_data.deck : card_data.row;
    this.filename = card_data.filename;
    this.placed = [];
    this.removed = [];
    this.activated = [];
    this.holder = player;

    this.hero = false;
    if (this.abilities.length > 0) {
      if (this.abilities[0] === "hero") {
        this.hero = true;
        this.abilities.splice(0, 1);
      }
      for (let x of this.abilities) {
        let ab = ability_dict[x];
        if ("placed" in ab) this.placed.push(ab.placed);
        if ("removed" in ab) this.removed.push(ab.removed);
        if ("activated" in ab) this.activated.push(ab.activated);
      }
    }

    if (this.row === "leader") {
      this.desc_name = getTranslation("ability.leader");
    } else if (this.abilities.length > 0) {
      let name = "";

      for (let i = this.abilities.length - 1; i >= 0; i--) {
        const ability = ability_dict[this.abilities[i]];
        if (ability?.name) {
          name = ability.name;
          break;
        }
      }

      this.desc_name = name;
    } else if (this.row === "agile") {
      this.desc_name = "agile";
    } else if (this.hero) {
      this.desc_name = "hero";
    } else {
      this.desc_name = "";
    }

    this.desc = this.row === "agile" ? ability_dict["agile"].description : "";
    for (let i = this.abilities.length - 1; i >= 0; --i) {
      this.desc += ability_dict[this.abilities[i]].description;
    }
    if (this.hero) this.desc += ability_dict["hero"].description;

    this.elem = this.createCardElem(this);
  }

  // Returns the identifier for this type of card
  id() {
    return this.name;
  }

  // Sets and displays the current power of this card
  setPower(n) {
    if (this.name === "Decoy") return;
    let elem = this.elem.children[0].children[0];
    if (n !== this.power) {
      this.power = n;
      elem.innerHTML = this.power;
    }
    elem.style.color =
      n > this.basePower ? "goldenrod" : n < this.basePower ? "red" : "";
  }

  // Resets the power of this card to default
  resetPower() {
    this.setPower(this.basePower);
  }

  // Automatically sends and translates this card to its apropriate row from the passed source
  async autoplay(source) {
    await board.toRow(this, source);
  }

  // Animates an ability effect
  async animate(name, bFade = true, bExpand = true) {
    var guia = {
      medic: "med",
      muster: "ally",
      morale: "moral",
      bond: "moral",
      powergain: "moral", //no audio
      darkstrom: "moral",
      avenger_spawn_creature: "avenger",
      hero: "hero_anim",
      griffin: "moral",
      mtg: "cos",
      decoy: "spy",
      dopler: "spy",
      dopavenger: "moral",
      dopler_spawn_creature: "avenger",
      muster2: "ally",
      reinforce: "moral",
      aid: "royal_horn",
      wshield: "ally",
      turn_skip_clone_board: "spy",
      turn_skip_clone_hand: "moral",
      scorch_fail: "knockback",
      debuff: "moral",
      necromancy: "necro_reviv",
    };
    var temSom = new Array();
    for (var x in guia) temSom[temSom.length] = x;
    var literais = [
      "scorch",
      "spy",
      "horn",
      "shield",
      "lock",
      "seize",
      "knockback",
      "resilience",
    ];
    var som =
      literais.indexOf(name) > -1
        ? literais[literais.indexOf(name)]
        : temSom.indexOf(name) > -1
          ? guia[name]
          : "";
    if (som != "") tocar(som, false);

    if (name === "scorch") {
      return await this.scorch(name);
    }
    let anim = this.elem.children[3];
    anim.style.backgroundImage = iconURL("anim_" + name);
    anim.style.position = "absolute";
    anim.style.inset = "0";
    anim.style.zIndex = "50";
    // console.log("ANIM", anim);
    await sleep(50);

    if (bFade) fadeIn(anim, 300);
    if (bExpand) anim.style.backgroundSize = "100% auto";
    await sleep(300);

    if (bExpand) anim.style.backgroundSize = "80% auto";
    await sleep(1000);

    if (bFade) fadeOut(anim, 300);
    if (bExpand) anim.style.backgroundSize = "40% auto";
    await sleep(300);

    anim.style.backgroundImage = "";
    return;
  }

  async animate2(name, bFade = true) {
    const guia = {
      medic: "med",
      muster: "ally",
      morale: "moral",
      bond: "moral",
      powergain: "moral",
      darkstrom: "moral",
      avenger_spawn_creature: "avenger",
      hero: "hero_anim",
      griffin: "moral",
      mtg: "cos",
      decoy: "spy",
      dopler: "spy",
      dopavenger: "moral",
      dopler_spawn_creature: "avenger",
      muster2: "ally",
      reinforce: "moral",
      aid: "royal_horn",
      wshield: "ally",
      turn_skip_clone_board: "spy",
      turn_skip_clone_hand: "moral",
      scorch_fail: "knockback",
      debuff: "moral",
      necromancy: "necro_reviv",
    };

    const literais = [
      "scorch",
      "spy",
      "horn",
      "shield",
      "lock",
      "seize",
      "knockback",
      "resilience",
    ];

    let som = "";

    if (literais.includes(name)) {
      som = name;
    } else if (guia[name]) {
      som = guia[name];
    }

    if (som) tocar(som, false);

    // IMPORTANT
    if (getComputedStyle(this.elem).position === "static") {
      this.elem.style.position = "relative";
    }

    // create overlay
    const anim = document.createElement("div");
    // console.log("ANIM2", anim);
    anim.style.width = "100%";
    anim.style.height = "100%";

    anim.style.backgroundSize = "contain";
    anim.style.backgroundRepeat = "no-repeat";
    anim.style.backgroundPosition = "center";

    anim.style.position = "absolute";
    anim.style.top = "0";
    anim.style.left = "0";

    // IMPORTANT
    anim.style.backgroundColor = "transparent";

    anim.style.backgroundImage = iconURL("anim_" + name);
    anim.style.backgroundRepeat = "no-repeat";
    anim.style.backgroundPosition = "center";

    // use contain instead of cover
    anim.style.backgroundSize = "contain";

    anim.style.pointerEvents = "none";

    // IMPORTANT
    anim.style.zIndex = "49";

    // opacity
    anim.style.opacity = bFade ? "0" : "1";

    this.elem.appendChild(anim);

    await sleep(50);

    if (bFade) fadeIn(anim, 300);

    await sleep(1300);

    if (bFade) fadeOut(anim, 300);

    await sleep(300);

    anim.remove();
  }

  // Animates the scorch effect
  async scorch(name) {
    //    console.log("async scorch(", name, ")");
    let anim = this.elem.children[3];
    anim.style.backgroundSize = "cover";
    anim.style.backgroundImage = iconURL("anim_" + name);
    await sleep(50);

    fadeIn(anim, 300);
    await sleep(1300);

    fadeOut(anim, 300);
    await sleep(300);

    anim.style.backgroundSize = "";
    anim.style.backgroundImage = "";
  }

  // Returns true if this is a combat card that is not a Hero
  isUnit() {
    return (
      !this.hero &&
      (this.row === "close" ||
        this.row === "ranged" ||
        this.row === "siege" ||
        this.row === "agile")
    );
  }

  // Returns true if card is sent to a Row's special slot
  isSpecial() {
    return this.name === "Commander's Horn" || this.name === "Mardroeme";
  }

  // Compares by type then power then name
  static compare(a, b) {
    var dif = factionRank(a) - factionRank(b);
    if (dif !== 0) return dif;
    dif = a.basePower - b.basePower;
    if (dif && dif !== 0) return dif;
    return a.name.localeCompare(b.name);

    function factionRank(c) {
      return c.faction === "special" ? -2 : c.faction === "weather" ? -1 : 0;
    }
  }

  // Creates an HTML element based on the card's properties
  createCardElem(card) {
    console.log("createcardElem", card);
    let elem = document.createElement("div");
    const faction =
      card?.row === "leader"
        ? (white_flame_lg_faction?.[card.holder?.tag] ?? card.faction)
        : card.faction;

    var tmp = `${faction}_${card.filename}`;

    if (card.filename === "Gaunter_Leader") {
      tmp = "neutral_Gaunter_Leader";
    }

    elem.style.backgroundImage = smallURL(tmp);
    elem.classList.add("card");
    elem.addEventListener("click", () => ui.selectCard(card), false);

    if (card.row === "leader") return elem;

    let power = document.createElement("div");
    elem.appendChild(power);
    let bg;
    if (card.hero) {
      bg = "power_hero";
      elem.classList.add("hero");
    } else if (card.faction === "weather") {
      bg = "power_" + card.abilities[0];
    } else if (card.faction === "special") {
      bg = "power_" + card.abilities[0];
      elem.classList.add("special");
    } else {
      bg = "power_normal";
    }
    power.style.backgroundImage = iconURL(bg);

    let row = document.createElement("div");
    elem.appendChild(row);
    if (
      card.row === "close" ||
      card.row === "ranged" ||
      card.row === "siege" ||
      card.row === "agile"
    ) {
      let num = document.createElement("div");
      num.appendChild(document.createTextNode(card.basePower));
      num.classList.add("center");
      power.appendChild(num);
      row.style.backgroundImage = iconURL("card_row_" + card.row);
    }

    let abi = document.createElement("div");
    elem.appendChild(abi);
    if (
      card.faction !== "special" &&
      card.faction !== "weather" &&
      card.abilities.length > 0
    ) {
      var abilities = card.abilities.filter((a) => a !== "DontPickMeUp");
      let str = abilities.at(-1);
      //  let str = card.abilities[card.abilities.length - 1];
      if (str === "cerys") str = "muster";
      if (str.startsWith("avenger")) str = "avenger";
      if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
        str = "scorch";
      abi.style.backgroundImage = iconURL("card_ability_" + str);
    } else if (card.row === "agile")
      abi.style.backgroundImage = iconURL("card_ability_" + "agile");

    elem.appendChild(document.createElement("div")); // animation overlay
    console.log("createcardElem out", elem);
    return elem;
  }
}

class YouTubeAudioAdapter {
  constructor(player) {
    console.log("constructor yt", player);
    this.player = player;
    this._loop = false;
    this._is_yt = true;
  }

  async play() {
    this.player.playVideo();
    return Promise.resolve();
  }

  pause() {
    try {
      this.player.pauseVideo();
    } catch (e) {}
  }

  load() {}

  set volume(v) {
    try {
      this.player.setVolume(v * 100);
    } catch (e) {}
  }

  get volume() {
    try {
      return this.player.getVolume() / 100;
    } catch (e) {}
  }

  set loop(v) {
    //   console.log("set yt loop", v);
    // this._loop = v;
    //  this.loop = v;
    //   console.log("set yt loop", v, this);
  }

  get loop() {
    return this._loop;
  }

  set src(videoId) {
    try {
      console.log("[YT_API]", this, `src("${videoId}")`);
      this.player.loadVideoById(videoId);
    } catch (e) {
      console.error("[YT_API]", this, `src("${videoId}")`, e);
    }
  }
}
function getSegmentCount(m3u8) {
  var out = m3u8
    .split("\n")
    .filter((line) => /^segment_\d+\.m4s$/.test(line.trim())).length;
  try {
    console.log("getSegmentCount(", utf8ToBase64(m3u8), "\nOut: ", out);
  } catch (e) {}
  return out;
}
function init_AudioBaseUrl() {
  if (location.port === "1111" || location.port === "8080") {
    return "http://localhost:1111/get-audio/ost/";
  } else {
    return `${domain}YouTubePlayer_Gwent_Adless/TheRedMineword-3b88b341d8d88a53d597fadefa5d79da4f8e9e7fa770a83375e3ba8bf2e8dc72-f25cd7160fbea56b5a38df6a2a893120889e6bf8/ost/`;
  }
}
const AudioBaseUrl = init_AudioBaseUrl();

const KEY = "yt_notice_last_shown";
const COOLDOWN_DAYS = 30;

function shouldShowNotice() {
  const last = localStorage.getItem(KEY);
  if (!last) return true;

  const now = Date.now();
  const diffDays = (now - parseInt(last, 10)) / (1000 * 60 * 60 * 24);

  return diffDays >= COOLDOWN_DAYS;
}

function showNotice() {
  document.getElementById("yt-notice").style.display = "block";
}

function closeNotice() {
  document.getElementById("yt-notice").style.display = "none";
  localStorage.setItem(KEY, Date.now().toString());
}
const localhost1111modeissecond = 11110;
// Handles notifications and client interration with menus
class UI {
  constructor() {
    this.carousels = [];
    this.notif_elem = document.getElementById("notification-bar");
    this.preview = document.getElementsByClassName("card-preview")[0];
    this.previewCard = null;
    this.lastRow = null;
    this.lyrics = [];
    this.lyricsInfo = {};
    this.lyricsTimer = null;
    this.lyricsRoot = null;
    this.bypassPlayback = false; // If true, ignore user settings and control playback directly
    this.savedVolume = null; // To store previous volume before muting or stopping
    passButton.addEventListener("click", () => {
      comp_and_send(socket, JSON.stringify({ type: "pass", player: playerId }));
      player_me.passRound();
    });
    document
      .getElementById("click-background")
      .addEventListener("click", () => ui.cancel(), false);
    this.youtube;
    this.ytActive;
    this.toggleMusic_elem = document.getElementById("toggle-music");
    this.toggleMusic_elem.classList.add("fade");
    this.toggleMusic_elem.addEventListener(
      "click",
      () => this.toggleMusic(),
      false,
    );
  }

  enablePlayer(enable) {
    let main = document.getElementsByTagName("main")[0].classList;
    if (enable) main.remove("noclick");
    else main.add("noclick");
  }
  async audioExists(id) {
    var val = await this.audioExists_real(id);
    if (!val) {
      if (shouldShowNotice()) {
        showNotice();
      }
    }
    return val;
  }
  async audioExists_real(id) {
    if (location.port === "1111" || location.port === "8080") {
      try {
        const response = await fetch(`${AudioBaseUrl}${id}/audio.m3u8`, {
          method: "HEAD",
        });
        //  console.log(response.ok);
        return response.ok;
      } catch (error) {
        console.log(error);
        return false;
      }
    } else {
      try {
        const response = await fetch(`${AudioBaseUrl}${id}/readme.md`, {
          method: "HEAD",
        });
        //  console.log(response.ok);
        return response.ok;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
  }

  async createYoutubePlayer_v2() {
    console.log("[YT_API] createYoutubePlayer()");

    if (!YT.loaded || !YT.Player) {
      throw new Error("YouTube API not ready");
    }

    await new Promise((resolve) => {
      this.youtube = new YT.Player("youtube", {
        videoId: tavern_yt_vid,

        playerVars: {
          autoplay: 1,
          controls: 0,
          loop: 1,
          playlist: tavern_yt_vid,
          rel: 0,
          enablejsapi: 1,
          origin: location.origin,
        },

        events: {
          onReady: async (event) => {
            console.log("[YT_API] READY");

            // Wait until metadata exists
            let tries = 0;

            while (tries < 50 && !event.target.getVideoData()?.video_id) {
              await new Promise((r) => setTimeout(r, 100));
              tries++;
            }

            console.log("[YT_API] VIDEO LOADED", {
              data: event.target.getVideoData(),
              state: event.target.getPlayerState(),
            });

            event.target.setVolume(tavern_yt_volume);

            resolve();
          },

          onStateChange: (event) => {
            console.log("[YT_API] STATE", event.data);
          },

          onError: (event) => {
            console.error("[YT_API] ERROR", event.data);
          },
        },
      });
    });

    this.audio = new YouTubeAudioAdapter(this.youtube);

    console.log("[YT_API] fully initialized");
  }

  // Initializes the youtube background music object
  async initYouTube() {
    console.log("ui.initYouTube()");
    try {
      const response = await fetch("javascript/yt/lyrics_api/video_map.json");

      if (response.ok) {
        videoMapLyrics = await response.json();
      }
    } catch (err) {
      // Ignore errors; keep videoMap as {}
    }
    var exists = await ui.audioExists(tavern_yt_vid);
    //  console.log("Audio play exists", exists, tavern_yt_vid);
    try {
      this.audio = document.createElement("audio");
    } catch (e) {
      console.error("THIS AUDIO FAILURE", e);
    }
    this.audio.preload = "auto";
    this.audio.loop = true;
    console.log("initYouTube()", this.audio, exists);
    if (exists) {
      if (location.port !== localhost1111modeissecond) {
        // default soundtrack
        const hls = new Hls();

        hls.loadSource(`${AudioBaseUrl}${tavern_yt_vid}/audio.m3u8`);
        hls.attachMedia(this.audio);
        //       this.audio.src = `${AudioBaseUrl}${tavern_yt_vid}/audio.m3u8`;

        this.audio.volume = tavern_yt_volume / 100;

        this.audio.addEventListener("canplay", () => {
          this.audio.play().catch(() => {});
        });
      } else {
        const mediaSource = new MediaSource();

        this.audio.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener("sourceopen", async () => {
          const sb = mediaSource.addSourceBuffer(
            'audio/mp4; codecs="mp4a.40.2"',
          );

          const init = await fetch(
            `${AudioBaseUrl}${tavern_yt_vid}/init.mp4`,
          ).then((r) => r.arrayBuffer());
          const init_count = await fetch(
            `${AudioBaseUrl}${tavern_yt_vid}/audio.m3u8`,
          ).then((r) => r.arrayBuffer());
          const conunt_arr = getSegmentCount(
            new TextDecoder().decode(init_count),
          );
          sb.appendBuffer(init);

          await new Promise((resolve) =>
            sb.addEventListener("updateend", resolve, { once: true }),
          );

          for (let i = 0; i < conunt_arr; i++) {
            const seg = await fetch(
              `${AudioBaseUrl}${tavern_yt_vid}/segment_${String(i).padStart(3, "0")}.m4s`,
            ).then((r) => r.arrayBuffer());
            try {
              sb.appendBuffer(seg);
            } catch (e) {}

            await new Promise((resolve) =>
              sb.addEventListener("updateend", resolve, { once: true }),
            );
          }

          mediaSource.endOfStream();
          try {
            this.audio.loop = true;
            this.audio.volume = tavern_yt_volume / 100;
          } catch (e) {}
          this.audio.addEventListener("canplay", () => {
            this.audio.play().catch(() => {});
          });
        });
      }

      this.audio.addEventListener("playing", () => {
        if (ui.ytActive !== undefined) return;

        ui.ytActive = true;

        let timer = setInterval(() => {
          if (ui.audio.paused) {
            ui.audio.play().catch(() => {});
          } else {
            clearInterval(timer);
            ui.toggleMusic_elem.classList.remove("fade");
          }
        }, 500);
      });
    } else {
      yt_repeat_conf = true;
      console.log("Will yt repeat?", yt_repeat_conf, true, "!");
      yt_repeat_launch.id = tavern_yt_vid;
      yt_repeat_launch.vol = tavern_yt_volume;
      //  console.log("[YT_API] [this.youtube] A");
      await this.youtubePlay(tavern_yt_vid, tavern_yt_volume, true);
      // await this.createYoutubePlayer_v2();
      //     console.log("[YT_API] dump past init A", {
      //      apiLoaded: YT.loaded,
      //      video: this.youtube?.getVideoData?.(),
      //      state: this.youtube?.getPlayerState?.(),
      //    });
      //  this.audio.src = tavern_yt_vid;
      //  this.audio.loop = false;
    }
  }
  getAudioTimeNow() {
    try {
      if (this.audio?._is_yt ?? false) {
        return this.youtube.getCurrentTime();
      } else {
        return this.audio.currentTime;
      }
    } catch (e) {
      return -1;
    }
  }
  async loadLyrics(path) {
    console.log("[Lyrics] Loading:", path);

    this.clearLyrics();

    const txt = await fetch(path).then((r) => r.text());

    // Parse info
    const infoMatch = txt.match(/<info>\s*(.+)/);
    if (infoMatch) {
      try {
        this.lyricsInfo = JSON.parse(infoMatch[1]);
        console.log("[Lyrics] Info:", this.lyricsInfo);
      } catch (e) {
        console.warn("[Lyrics] Failed parsing info:", e);
      }
    }

    const regex =
      /<(lg|sm):(\d+):(\d+(?:\.\d+)?)--(\d+):(\d+(?:\.\d+)?)>\s*<(#(?:[0-9a-fA-F]{6}))>(.*?)<\/#(?:[0-9a-fA-F]{6})>/g;

    let m;
    while ((m = regex.exec(txt))) {
      this.lyrics.push({
        type: m[1],
        start: +m[2] * 60 + +m[3],
        end: +m[4] * 60 + +m[5],
        color: m[6],
        text: m[7],
      });
    }
    console.log(`[Lyrics] Parsed ${this.lyrics.length} entries.`);

    // Create overlay
    this.lyricsRoot = document.createElement("div");
    this.lyricsRoot.style = `
    position: fixed;
    left: 50%;
    top: 40px;
    transform: translateX(-50%);
    z-index: 9999;
    pointer-events: none;
    text-align: center;
    font-family: sans-serif;
    width: 90%;
`;

    document.body.appendChild(this.lyricsRoot);

    this.lyricsTimer = setInterval(() => this.updateLyrics(), 50);
  }

  updateLyrics() {
    const t = this.getAudioTimeNow();

    if (t < 0) {
      this.lyricsRoot.innerHTML = "";
      return;
    }

    const active = this.lyrics.filter((x) => t >= x.start && t < x.end);

    let html = "";

    for (const line of active) {
      html += `
            <div style="
                color:${line.color};
                font-size:${line.type === "lg" ? "38px" : "22px"};
                font-weight:bold;
                text-shadow:2px 2px 6px black;
            ">
                ${line.text}
            </div>`;
    }

    this.lyricsRoot.innerHTML = html;
  }

  clearLyrics() {
    console.log("[Lyrics] Clearing");

    if (this.lyricsTimer) {
      clearInterval(this.lyricsTimer);
      this.lyricsTimer = null;
    }

    if (this.lyricsRoot) {
      this.lyricsRoot.remove();
      this.lyricsRoot = null;
    }

    this.lyrics = [];
    this.lyricsInfo = {};
  }
  getAudioState() {
    if (!this.audio) return AUDIO_STATE.UNSTARTED;

    if (this.audio instanceof YouTubeAudioAdapter) {
      const state = this.youtube.getPlayerState();

      switch (state) {
        case YT.PlayerState.PLAYING:
          return AUDIO_STATE.PLAYING;

        case YT.PlayerState.PAUSED:
          return AUDIO_STATE.PAUSED;

        case YT.PlayerState.ENDED:
          return AUDIO_STATE.ENDED;

        default:
          return AUDIO_STATE.UNSTARTED;
      }
    }

    if (this.audio.ended) return AUDIO_STATE.ENDED;
    if (!this.audio.paused) return AUDIO_STATE.PLAYING;

    return AUDIO_STATE.PAUSED;
  }

  // Stops the YouTube video, but preserves mute and volume settings
  stopYouTube() {
    if (this.audio) {
      this.bypassPlayback = true;
      this.savedVolume = this.audio.volume;

      this.audio.pause();
    }
  }

  // Resumes the YouTube video with previous volume if available
  resumeYouTube() {
    if (this.audio) {
      this.bypassPlayback = false;

      this.audio.play().catch(() => {});

      this.audio.volume =
        this.savedVolume ?? audio_yt_vid_soundtrack_volume / 100;

      this.savedVolume = null;

      if (buttonmutemode === 0) {
        this.audio.pause();
        this.bypassPlayback = false;
      }
    }
  }

  youtubeRestart() {
    if (this.audio && this.getAudioState() !== AUDIO_STATE.UNSTARTED) {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    }
  }
  async youtubePlay(ostId, volume = 100, repeat = false) {
    console.log("[YT_API] youtubePlay() called", {
      ostId,
      volume,
      repeat,
      currentAudio: this.audio,
      youtubePlayer: this.youtube,
    });

    try {
      this.clearLyrics();
      console.log(
        "[Lyrics]",
        ostId,
        videoMapLyrics[ostId],
        videoMapLyrics,
        videoMapLyrics[ostId]?.a ?? false,
      );
      if (videoMapLyrics[ostId]?.a ?? false) {
        await this.loadLyrics(videoMapLyrics[ostId].b);
      }
      console.log("[YT_API] Stopping current YouTube playback");
      ui.stopYouTube();

      console.log("[YT_API] Checking if hosted audio exists:", ostId);
      const exists = await ui.audioExists(ostId);

      console.log("[YT_API] audioExists() result:", exists);

      if (exists) {
        console.log("[YT_API] Hosted audio found, using HLS");
        return await this.playHostedAudio(ostId, volume, repeat);
      }

      console.log("[YT_API] Hosted audio not found, falling back to YouTube");
      return await this.playYouTube(ostId, volume, repeat);
    } catch (e) {
      console.error("[YT_API] youtubePlay() failed", e);
    }

    console.warn("[YT_API] Reached fallback cleanup");

    await sleep(100);

    button_is_second_sheet = 1;
    console.log("[YT_API] button_is_second_sheet =", button_is_second_sheet);

    if (buttonmutemode === 0) {
      console.log("[YT_API] buttonmutemode == 0, stopping YouTube");
      ui.stopYouTube();
    }
  }

  async playHostedAudio(ostId, volume, repeat) {
    console.log("[YT_API] playHostedAudio()", {
      ostId,
      volume,
      repeat,
      audio: this.audio,
    });

    if (this.audio?.player?.videoTitle) {
      console.log(
        "[YT_API] Current audio is YouTube adapter, replacing with HTMLAudioElement",
      );
      this.audio = document.createElement("audio");
      await sleep(10);
    }

    if (!this.audio || !(this.audio instanceof HTMLAudioElement)) {
      console.log("[YT_API] Creating new HTMLAudioElement");
      this.audio = document.createElement("audio");
    }

    console.log("[YT_API] Creating HLS instance");
    const hls = new Hls();

    const source = `${AudioBaseUrl}${ostId}/audio.m3u8`;

    console.log("[YT_API] Loading HLS source:", source);

    hls.loadSource(source);

    console.log("[YT_API] Attaching media");
    hls.attachMedia(this.audio);

    this.audio.volume = volume / 100;
    this.audio.loop = repeat;

    console.log("[YT_API] Audio configured", {
      volume: this.audio.volume,
      loop: this.audio.loop,
    });

    console.log("[YT_API] Calling audio.play()");
    await this.audio
      .play()
      .then(() => {
        console.log("[YT_API] HTML audio playback started");
      })
      .catch((err) => {
        console.error("[YT_API] HTML audio play() failed", err);
      });

    button_is_second_sheet = 1;
    console.log("[YT_API] button_is_second_sheet =", button_is_second_sheet);

    if (buttonmutemode === 0) {
      console.log("[YT_API] buttonmutemode == 0, stopping YouTube");
      ui.stopYouTube();
    }
  }

  async playYouTube(ostId, volume, repeat) {
    console.log("[YT_API] playYouTube()", {
      ostId,
      volume,
      repeat,
      youtubeExists: !!this.youtube,
      audio: this.audio,
    });

    yt_repeat_conf = repeat;

    yt_repeat_launch = {
      id: ostId,
      vol: volume,
    };

    console.log("[YT_API] Repeat config updated", {
      yt_repeat_conf,
      yt_repeat_launch,
    });

    //  if (!this.youtube) {
    console.log("[YT_API] YouTube player doesn't exist, creating");

    await this.createYoutubePlayer(ostId);

    console.log("[YT_API] YouTube player created");

    this.audio.src = ostId;
    this.audio.volume = volume / 100;

    console.log("[YT_API] Initial audio adapter configured");
    //   } else {
    //      console.log("[YT_API] Reusing existing YouTube player");
    //    }

    if (!this.audio || !this.audio._is_yt) {
      console.log("[YT_API] Creating YouTubeAudioAdapter");
      this.audio = new YouTubeAudioAdapter(this.youtube);
    }

    console.log("[YT_API] Setting adapter src:", ostId);

    this.audio.src = ostId;

    console.log("[YT_API] Setting adapter volume:", volume / 100);

    this.audio.volume = volume / 100;

    button_is_second_sheet = 1;
    console.log("[YT_API] button_is_second_sheet =", button_is_second_sheet);
    _debug_volume = volume;
    if (buttonmutemode === 0) {
      console.log("[YT_API] buttonmutemode == 0, stopping YouTube");
      ui.stopYouTube();
      //this.audio.pause();
    }
  }

  isYTPlayerHealthy(player) {
    return !!(
      player &&
      typeof player.playVideo === "function" &&
      typeof player.loadVideoById === "function" &&
      typeof player.getPlayerState === "function" &&
      typeof player.getVideoData === "function"
    );
  }

  async createYoutubePlayer(vid) {
    console.log("[YT_API] createYoutubePlayer()");

    if (!this.isYTPlayerHealthy(this.youtube)) {
      try {
        ui.youtube?.destroy?.();

        document.getElementById("youtube")?.remove();

        const div = document.createElement("div");
        div.id = "youtube";
        document.body.appendChild(div);
      } catch (e) {}
      try {
        this.youtube = null;
      } catch (e) {}
    }
    if (this.youtube) {
      console.log("[YT_API] Player already exists");
      return;
    }

    console.log("[YT_API] Creating YT.Player");
    console.log("[YT_API] [this.youtube] B");
    await new Promise((resolve) => {
      this.youtube = new YT.Player("youtube", {
        videoId: vid,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          enablejsapi: 1,
          origin: location.origin,
        },

        events: {
          onReady: (event) => {
            console.log("[YT_API] onReady fired", event);

            try {
              console.log("[YT_API] Player info", {
                state: this.youtube?.getPlayerState?.(),
                iframe: this.youtube?.getIframe?.(),
              });
            } catch (e) {}

            resolve();
          },

          onStateChange: (event) => {
            console.log("[YT_API] onStateChange", {
              state: event.data,
              stateName: {
                "-1": "UNSTARTED",
                0: "ENDED",
                1: "PLAYING",
                2: "PAUSED",
                3: "BUFFERING",
                5: "CUED",
              }[event.data],
            });

            this.handleYoutubeState(event);
          },

          onError: (event) => {
            console.error("[YT_API] onError", event);
          },
        },
      });
    });

    console.log("[YT_API] Wrapping player in YouTubeAudioAdapter");

    this.audio = new YouTubeAudioAdapter(this.youtube);

    console.log("[YT_API] createYoutubePlayer() finished");
  }

  handleYoutubeState(event) {
    console.log("[YT_API] handleYoutubeState()", {
      state: event.data,
    });

    if (event.data !== YT.PlayerState.ENDED) {
      console.log("[YT_API] Ignoring state:", event.data);
      return;
    }

    console.log("[YT_API] Video ended");

    setTimeout(() => {
      const state = this.youtube.getPlayerState();

      console.log("[YT_API] Post-end state check", state);

      if (state !== YT.PlayerState.ENDED) {
        console.log("[YT_API] Player no longer ended, aborting repeat");
        return;
      }

      if (!yt_repeat_conf) {
        console.log("[YT_API] Repeat disabled");
        return;
      }

      console.log("[YT_API] Restarting playback", yt_repeat_launch);

      ui.youtubePlay(yt_repeat_launch.id, yt_repeat_launch.vol, true);
    }, 500);
  }

  // Called when client toggles the music
  toggleMusic() {
    if (button_is_second_sheet === 0) {
      if (buttonmutemode === 0) {
        this.audio.play();
        if (ui.audio?._is_yt ?? false) {
          ui.resumeYouTube();
        }
        buttonmutemode = 1;
        this.toggleMusic_elem.classList.remove("fade");
        ui.audio.volume = _debug_volume;
      } else {
        _debug_volume = ui.audio.volume;
        this.audio.pause();
        if (ui.audio?._is_yt ?? false) {
          ui.stopYouTube();
        }
        this.toggleMusic_elem.classList.add("fade");
        buttonmutemode = 0;
      }
      // When bypassed, just stop or resume
      //  if (this.getAudioState() === AUDIO_STATE.PLAYING) {
      //      this.stopYouTube();
      //  } else {
      //      this.resumeYouTube();
      //  }
      return;
    }
    if (button_is_second_sheet === 1) {
      this.bypassPlayback = false;
    }
    console.log(this.bypassPlayback, button_is_second_sheet);
    try {
      if (this.bypassPlayback) {
        if (buttonmutemode === 0) {
          iniciarMusica(this.bypassPlayback);
          buttonmutemode = 1;
          ui.audio.volume = _debug_volume;
        } else {
          _debug_volume = ui.audio.volume;
          this.audio.pause();
          this.toggleMusic_elem.classList.add("fade");
          buttonmutemode = 0;
        }
        // When bypassed, just stop or resume
        //  if (this.getAudioState() === AUDIO_STATE.PLAYING) {
        //      this.stopYouTube();
        //  } else {
        //      this.resumeYouTube();
        //  }
        return;
      }
      if (button_is_second_sheet === 1) {
        if (buttonmutemode === 0) {
          buttonmutemode = 1;
          this.audio.play();
          ui.toggleMusic_elem.classList.remove("fade");
          if (ui.audio?._is_yt ?? false) {
            ui.resumeYouTube();
          }
          ui.audio.volume = _debug_volume;
        } else {
          _debug_volume = ui.audio.volume;
          this.audio.pause();
          if (ui.audio?._is_yt ?? false) {
            ui.stopYouTube();
          }
          buttonmutemode = 0;
          this.toggleMusic_elem.classList.add("fade");
        }
        return;
      }
      // Existing logic
      else if (this.getAudioState() !== AUDIO_STATE.PLAYING) {
        buttonmutemode = 1;
        console.log(
          "Initiar music",
          this.getAudioState() !== AUDIO_STATE.PLAYING,
        );
        iniciarMusica(this.bypassPlayback);
      } else {
        _debug_volume = ui.audio.volume;
        this.audio.pause();
        this.toggleMusic_elem.classList.add("fade");
        buttonmutemode = 0;
      }
    } catch (e) {
      console.log("Music toggle error:", e);
      try {
        if (ui.getAudioState() !== 1) {
          ui.initYouTube();
        }
      } catch (e) {
        console.log("ui.initYouTube(); error", e);
      }
    }
  }

  // Enables or disables backgorund music
  setYouTubeEnabled(enable) {
    if (this.ytActive === enable) return;

    if (enable && !this.mute) this.audio.play().catch(() => {});
    else this.audio.pause();

    this.ytActive = enable;
  }

  // Called when the player selects a selectable card
  async selectCard(card) {
    extraJSON = extraJSON;
    var handData = await serializeCards(player_me.hand.cards);
    console.log("HandData", handData);
    let row = this.lastRow;
    let pCard = this.previewCard;
    if (card === pCard) return;
    if (pCard === null || card.holder.hand.cards.includes(card)) {
      this.setSelectable(null, false);
      this.showPreview(card);
    } else if (pCard.name === "Decoy") {
      const nomeColuna = this.lastRow.elem_parent.id;
      const playedCard = removeCircularReferences(this.previewCard);
      const targetCard = removeCircularReferences(card);
      // targetCard.animate("horn"); //Uncaught (in promise) TypeError: targetCard.animate is not a function at UI.selectCard

      //console.log("You played the card", this.previewCard)
      //comp_and_send(socket, JSON.stringify({ type: "play", player: playerId, card: playedCard, row: nomeColuna, target: targetCard, isMeHand: handData }));

      this.hidePreview(card);
      this.enablePlayer(false);
      board.toHand(card, row);
      await board.moveTo(pCard, row, pCard.holder.hand);
      var handData_after = await serializeCards(player_me.hand.cards);
      console.log("HandData_after", handData);
      console.log("You played the card", this.previewCard);
      comp_and_send(
        socket,
        JSON.stringify({
          type: "play",
          player: playerId,
          card: playedCard,
          row: nomeColuna,
          target: targetCard,
          isMeHand: handData,
          HandMePost: handData_after,
        }),
      );
      console.log("extraJSON vibe check:", extraJSON.length, extraJSON);
      if (extraJSON.length > 0) {
        const total = extraJSON.length;
        if (med_draw === 1) {
          await sleep(medic_ability_revive_wait_a_second);
          comp_and_send(
            socket,
            JSON.stringify({ type: "medicrevivedata", data: extraJSON }),
          );
          med_draw = 0;
          extraJSON.length = 0;
        } else {
          for (let i = 0; i < total; i++) {
            const payload = extraJSON[i];

            // base hold + extra 500ms for each next packet
            const delay =
              RegisterMovesHold + i * 500 + medicdrawextrasecondswait * 1000;

            console.log(
              `Hold before send extraJSON ${i + 1}/${total}`,
              payload,
            );

            showTooltip(
              getUiStrng("sync.hold_progress")
                .replace("%x", i + 1)
                .replace("%y", total)
                .replace("%s", delay / 1000),
            );

            await new Promise((resolve) => setTimeout(resolve, delay));

            comp_and_send(socket, payload);
          }
        }
        extraJSON = [];
      }
      if (player_op.passed && !player_me.passed) {
        showTooltip(
          getUiStrng("sync.sync").replace("%s", RegisterMovesHold / 1000),
        );
        await sleep(RegisterMovesHold);
        showTooltip(getUiStrng("sync.end"));
      }
      pCard.holder.endTurn();
      //	await init_sync_hands();
    }
  }

  // Called when the player selects a selectable CardContainer
  // LEO - aqui de fato coloca a carta na coluna.
  async selectRow(row, opponentCard = null) {
    extraJSON = extraJSON;
    var handData = await serializeCards(player_me.hand.cards);
    console.log("HandData", handData);
    this.lastRow = row;

    if (this.previewCard === null && opponentCard === null) {
      await ui.viewCardsInContainer(row);
      return;
    }

    const nomeColuna =
      this.lastRow.elem.id === "weather"
        ? this.lastRow.elem.id
        : this.lastRow.elem_parent.id;
    const playedCard = removeCircularReferences(
      this.previewCard || opponentCard,
    );

    console.log("You played the card", this.previewCard);
    if (this.previewCard.name === "Decoy") return;

    // comp_and_send(socket, JSON.stringify({ type: "play", player: playerId, card: playedCard, row: nomeColuna, isMeHand: handData}));

    let card = this.previewCard || opponentCard;
    let holder = card.holder;
    this.hidePreview();
    this.enablePlayer(false);
    if (card.name === "Scorch") {
      this.hidePreview();
      await ability_dict["scorch"].activated(card);
    } else if (card.name === "Decoy") {
      return;
    } else {
      await board.moveTo(card, row, card.holder.hand);
    }
    var handData_after = await serializeCards(player_me.hand.cards);
    console.log("HandData_after", handData_after);
    comp_and_send(
      socket,
      JSON.stringify({
        type: "play",
        player: playerId,
        card: playedCard,
        row: nomeColuna,
        isMeHand: handData,
        HandMePost: handData_after,
      }),
    );
    console.log("extraJSON vibe check:", extraJSON.length, extraJSON);
    if (extraJSON.length > 0) {
      const total = extraJSON.length;
      if (med_draw === 1) {
        await sleep(medic_ability_revive_wait_a_second);
        comp_and_send(
          socket,
          JSON.stringify({ type: "medicrevivedata", data: extraJSON }),
        );
        med_draw = 0;
        extraJSON.length = 0;
      } else {
        for (let i = 0; i < total; i++) {
          const payload = extraJSON[i];

          // base hold + extra 500ms for each next packet
          const delay =
            RegisterMovesHold + i * 500 + medicdrawextrasecondswait * 1000;

          console.log(`Hold before send extraJSON ${i + 1}/${total}`, payload);

          showTooltip(
            getUiStrng("sync.hold_progress")
              .replace("%x", i + 1)
              .replace("%y", total)
              .replace("%s", delay / 1000),
          );

          await new Promise((resolve) => setTimeout(resolve, delay));

          comp_and_send(socket, payload);
        }
      }
      extraJSON = [];
    }
    if (player_op.passed && !player_me.passed) {
      showTooltip(
        getUiStrng("sync.sync").replace("%s", RegisterMovesHold / 1000),
      );
      await sleep(RegisterMovesHold);
      showTooltip(getUiStrng("sync.end"));
    }
    holder.endTurn();
    // await init_sync_hands();
  }

  // Called when the client cancels out of a card-preview
  cancel() {
    tocar("discard", false);
    this.hidePreview();
  }

  // Displays a card preview then enables and highlights potential card destinations
  showPreview(card) {
    tocar("explaining", false);
    this.showPreviewVisuals(card);
    this.setSelectable(card, true);
    document.getElementById("click-background").classList.remove("noclick");
  }

  // Sets up the graphics and description for a card preview
  showPreviewVisuals(card) {
    //   console.log("showPreviewVisuals", card);
    this.previewCard = card;
    this.preview.classList.remove("hide");
    const faction =
      card?.row === "leader"
        ? (white_flame_lg_faction?.[card.holder?.tag] ?? card.faction)
        : card.faction;

    var tmp = `${faction}_${card.filename}`;

    if (card.filename === "Gaunter_Leader") {
      tmp = "neutral_Gaunter_Leader";
    }

    this.preview.getElementsByClassName("card-lg")[0].style.backgroundImage =
      largeURL(tmp);
    let desc_elem = this.preview.getElementsByClassName("card-description")[0];
    this.setDescription(card, desc_elem);
  }

  // Hides the card preview then disables and removes highlighting from card destinations
  hidePreview() {
    document.getElementById("click-background").classList.add("noclick");
    player_me.hand.cards.forEach((c) => c.elem.classList.remove("noclick"));

    this.preview.classList.add("hide");
    this.setSelectable(null, false);
    this.previewCard = null;
    this.lastRow = null;
  }

  // Sets up description window for a card
  setDescription(card, desc) {
    //	console.log("SET DESCRYPTION", card, desc);
    try {
      if (
        card.hero ||
        card.row === "agile" ||
        card.abilities.length > 0 ||
        card.faction === "faction"
      ) {
        desc.classList.remove("hide");
        let str = card.row === "agile" ? "agile" : "";
        if (card.abilities.length)
          var abilities = card.abilities.filter((a) => a !== "DontPickMeUp");
        str = abilities.at(-1);
        //  str = card.abilities[card.abilities.length - 1];
        if (str === "cerys") str = "muster";
        if (str.startsWith("avenger")) str = "avenger";
        if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
          str = "scorch";
        if (
          card.row === "leader" ||
          card.faction === "faction" ||
          (card.abilities.length === 0 && card.row !== "agile")
        )
          desc.children[0].style.backgroundImage = "";
        else
          desc.children[0].style.backgroundImage = iconURL(
            "card_ability_" + str,
          );
        desc.children[1].innerHTML = card.desc_name;
        desc.children[2].innerHTML = card.desc;
      } else {
        desc.classList.add("hide");
      }
    } catch (e) {
      console.error("setDescription", " error", e);
      desc.classList.add("hide");
    }
  }

  async waitNotificationsDone() {
    console.log("[notif] WAIT START");
    console.log(
      "[notif]: check config:",
      ui_display_times.hold_pause.sleep,
      ui_display_times.hold_pause.needs,
    );
    let consecutiveTrueCount = 0;
    const requiredConsecutive = ui_display_times.hold_pause.needs;

    while (true) {
      const isDone =
        ui_display_times.queue.length === 0 &&
        !ui_display_times.is_busy &&
        !ui_display_times.is_transitioning;

      if (isDone) {
        consecutiveTrueCount++;
        console.log(
          `[notif] check: condition true (${consecutiveTrueCount}/${requiredConsecutive})`,
        );
      } else {
        consecutiveTrueCount = 0;
        console.log("[notif] check: condition false, reset counter");
      }

      if (consecutiveTrueCount >= requiredConsecutive) {
        break; // exit loop after 10 consecutive true checks
      }
      console.log(`[notif] check: sleeps`);
      await sleep(ui_display_times.hold_pause.sleep);
      console.log(`[notif] check: sleeped`);
    }
    console.log("[notif] WAIT DONE");
  }

  async notification(name, duration) {
    console.log("[notif] notification() CALL:", name, duration);

    if (!duration) duration = ui_display_times.notyfication;
    duration = Math.max(800, duration);

    // SOUND mapping
    const guia2 = {
      "me-pass": "pass",
      "op-pass": "pass",
      "win-round": "round_win",
      "draw-round": "round_lose",
      "lose-round": "round_lose",
      me_win_via_nilfgaard: "round_win",
      op_win_via_nilfgaard: "round_lose",
      "me-turn": "turn_me",
      "op-turn": "turn_op",
      "op-leader": "turn_op",
      "op-white-flame": "turn_op",
      "nilfgaard-wins-draws": "turn_op",
      "sv-err": "server_error",
      "win-opleft": "round_win", // "opponent_left",
      "round-start": "round1_start",
      gaunter: "necromancy_ability",
      darkstorm: "darknessishere",
    };

    const temSom = Object.keys(guia2);
    const som = temSom.includes(name)
      ? guia2[name]
      : name === "round-start" && game.roundHistory.length === 0
        ? "round1_start"
        : "";
    console.log("[notif]: value to play", som);
    if (som !== "") {
      console.log("[notif] PLAY SOUND:", som);
      tocar(som, false);
    } else {
      console.log("[notif] NO SOUND FOR:", name);
    }

    // Add notification to queue
    ui_display_times.queue.push({
      name: name,
      duration: duration,
      time: Date.now(),
    });

    console.log(
      "[notif] QUEUE PUSHED:",
      name,
      "queue size:",
      ui_display_times.queue.length,
    );

    // Start notification loop if not already running
    this.notificationLoop();

    // Wait until all notifications are finished
    await this.waitNotificationsDone();

    console.log("[notif] notification() RETURN:", name);
  }

  async notificationLoop() {
    if (ui_display_times.is_running) {
      //   console.log("[notif] notificationLoop already running");
      return;
    }

    ui_display_times.is_running = true;
    console.log("[notif] notificationLoop START");

    while (true) {
      if (
        !ui_display_times.is_busy &&
        !ui_display_times.is_transitioning &&
        ui_display_times.queue.length > 0
      ) {
        ui_display_times.is_busy = true;

        const item = ui_display_times.queue.shift();
        console.log(
          "[notif] SHOW:",
          item.name,
          "queue left:",
          ui_display_times.queue.length,
        );

        try {
          const fadeSpeed = ui_display_times.fadeSpeed;

          // Show notification
          ui_display_times.is_transitioning = true;
          this.notif_elem.classList.remove("hide");
          this.notif_elem.style.display = "";
          this.notif_elem.style.opacity = 0;

          this.notif_elem.children[0].id = "notif-" + item.name;

          console.log("[notif] fadeIn:", item.name);
          await fadeIn(this.notif_elem, fadeSpeed);
          console.log("[notif] fadeIn complete:", item.name);

          // Wait for display duration
          await sleep(item.duration);

          console.log("[notif] fadeOut:", item.name);
          ui_display_times.is_transitioning = true;
          await fadeOut(this.notif_elem, fadeSpeed);
          console.log("[notif] fadeOut complete:", item.name);

          // Reset state after fade out
          this.notif_elem.classList.add("hide");
          this.notif_elem.style.display = "none";
          this.notif_elem.style.opacity = 0;

          console.log("[notif] DONE:", item.name);
        } catch (e) {
          console.error("[notif] ERROR:", e);
          ui_display_times.is_transitioning = false;
        }
        console.log("[notif] done down here notif too");
        ui_display_times.is_busy = false;
        console.log(
          "[notif] Notif to unpause is_transitioning sleeps for",
          ui_display_times.checkDelay * 2.3,
        );
        await sleep(ui_display_times.fadeSpeed * 2.3);
        ui_display_times.is_transitioning = false;
        console.log(
          "[notif]: ui_display_times.is_transitioning = false;",
          ui_display_times.is_transitioning,
        );
      }
      await sleep(ui_display_times.checkDelay);
    }
  }

  // Displays a cancellable Carousel for a single card
  async viewCard(card, action) {
    if (card === null) return;
    let container = new CardContainer();
    container.cards.push(card);
    await this.viewCardsInContainer(container, action);
  }

  // Displays a cancellable Carousel for all cards in a container
  async viewCardsInContainer(container, action) {
    action = action
      ? action
      : function () {
          return this.cancel();
        };

    await this.queueCarousel(container, 1, action, () => true, false, true);
    comp_and_send(socket, JSON.stringify({ type: "containerClosed" }));
  }

  // Displays a Carousel menu of filtered container items that match the predicate.
  // Suspends gameplay until the Carousel is closed.
  async queueCarousel(
    container,
    count,
    action,
    predicate,
    bSort,
    bQuit,
    title,
  ) {
    let carousel = new Carousel(
      container,
      count,
      action,
      predicate,
      bSort,
      bQuit,
      title,
    );
    if (Carousel.curr === undefined || Carousel.curr === null) carousel.start();
    else {
      this.carousels.push(carousel);
      return;
    }
    await sleepUntil(() => this.carousels.length === 0 && !Carousel.curr, 100);
  }

  // Starts the next queued Carousel
  quitCarousel() {
    if (this.carousels.length > 0) {
      this.carousels.shift().start();
    }
  }

  // Displays a custom confirmation menu
  async popup(yesName, yes, noName, no, title, description) {
    let p = new Popup(yesName, yes, noName, no, title, description);
    await sleepUntil(() => !Popup.curr);
  }

  // Enables or disables selection and highlighting of rows specific to the card
  setSelectable(card, enable) {
    if (!enable) {
      for (let row of board.row) {
        row.elem.classList.remove("row-selectable");
        row.elem.classList.remove("noclick");
        row.elem_special.classList.remove("row-selectable");
        row.elem_special.classList.remove("noclick");
        row.elem.classList.add("card-selectable");

        for (let card of row.cards) {
          card.elem.classList.add("noclick");
        }
      }
      weather.elem.classList.remove("row-selectable");
      weather.elem.classList.remove("noclick");
      return;
    }
    if (card.faction === "weather") {
      for (let row of board.row) {
        row.elem.classList.add("noclick");
        row.elem_special.classList.add("noclick");
      }
      weather.elem.classList.add("row-selectable");
      return;
    }

    weather.elem.classList.add("noclick");

    if (card.name === "Scorch") {
      for (let r of board.row) {
        r.elem.classList.add("row-selectable");
        r.elem_special.classList.add("row-selectable");
      }
      return;
    }
    if (card.isSpecial()) {
      for (let i = 0; i < 6; i++) {
        let r = board.row[i];
        if (i < 3 || r.special !== null) {
          r.elem.classList.add("noclick");
          r.elem_special.classList.add("noclick");
        } else {
          r.elem_special.classList.add("row-selectable");
        }
      }
      return;
    }

    board.row.forEach((r) => r.elem_special.classList.add("noclick"));

    if (card.name === "Decoy") {
      for (let i = 0; i < 6; ++i) {
        let r = board.row[i];
        let units = r.cards.filter((c) => c.isUnit());
        units = units.filter(
          (unit) =>
            !unit.abilities.some((ability) =>
              NotPickUpAbilities.includes(ability),
            ),
        );
        console.log("DECOY UNITS", units);
        if (i < 3 || units.length === 0) {
          r.elem.classList.add("noclick");
          r.elem_special.classList.add("noclick");
          r.elem.classList.remove("card-selectable");
        } else {
          r.elem.classList.add("row-selectable");
          units.forEach((c) => c.elem.classList.remove("noclick"));
        }
      }
      return;
    }

    let currRows =
      card.row === "agile"
        ? [
            board.getRow(card, "close", card.holder),
            board.getRow(card, "ranged", card.holder),
          ]
        : [board.getRow(card, card.row, card.holder)];
    for (let i = 0; i < 6; i++) {
      let row = board.row[i];
      if (currRows.includes(row)) {
        row.elem.classList.add("row-selectable");
      } else {
        row.elem.classList.add("noclick");
      }
    }
  }
  enableSurrender = function (enabled = true) {
    const btn = document.getElementById("surrender-button");

    if (!btn) return;

    btn.classList.toggle("hidden", !enabled);
    btn.classList.toggle("disabled", !enabled);

    btn.style.pointerEvents = enabled ? "auto" : "none";

    btn.style.opacity = enabled ? "1" : "0.5";
  };
  showSurrender = function (show = true) {
    const btn = document.getElementById("surrender-button");
    if (!btn) return;

    btn.classList.toggle("hidden", !show);
  };
}

// Displays up to 5 cards for the client to cycle through and select to perform an action
// Clicking the middle card performs the action on that card "count" times
// Clicking adejacent cards shifts the menu to focus on that card
class Carousel {
  constructor(
    container,
    count,
    action,
    predicate,
    bSort,
    bExit = false,
    title,
  ) {
    if (count <= 0 || !container || !action || container.cards.length === 0)
      return;
    this.container = container;
    this.count = count;
    this.action = action ? action : () => this.cancel();
    this.predicate = predicate;
    this.bSort = bSort;
    this.indices = [];
    this.index = 0;
    this.bExit = bExit;
    this.title = title;
    this.cancelled = false;

    if (!Carousel.elem) {
      Carousel.elem = document.getElementById("carousel");
      Carousel.elem.children[0].addEventListener(
        "click",
        () => Carousel.curr.cancel(),
        false,
      );
    }
    this.elem = Carousel.elem;
    document.getElementsByTagName("main")[0].classList.remove("noclick");

    this.elem.children[0].classList.remove("noclick");
    this.previews = this.elem.getElementsByClassName("card-lg");
    this.desc = this.elem.getElementsByClassName("card-description")[0];
    this.title_elem = this.elem.children[2];
  }

  // Initializes the current Carousel
  start() {
    if (!this.elem) return;
    this.indices = this.container.cards.reduce(
      (a, c, i) => (!this.predicate || this.predicate(c) ? a.concat([i]) : a),
      [],
    );
    if (this.indices.length <= 0) return this.exit();
    if (this.bSort)
      this.indices.sort((a, b) =>
        Card.compare(this.container.cards[a], this.container.cards[b]),
      );

    this.update();
    Carousel.setCurrent(this);

    if (this.title) {
      this.title_elem.innerHTML = this.title;
      this.title_elem.classList.remove("hide");
    } else {
      this.title_elem.classList.add("hide");
    }

    this.elem.classList.remove("hide");
    ui.enablePlayer(true);
    tocar("explaining", false);
  }

  // Called by the client to cycle cards displayed by n
  shift(event, n) {
    (event || window.event).stopPropagation();
    this.index = Math.max(0, Math.min(this.indices.length - 1, this.index + n));
    this.update();
  }

  // Called by client to perform action on the middle card in focus
  async select(event) {
    //    console.log("SELECT EVENT DEBUG", event, " and this actionString", this.action.toString());
    (event || window.event).stopPropagation();
    --this.count;
    if (this.isLastSelection()) this.elem.classList.add("hide");
    if (this.count <= 0) ui.enablePlayer(false);

    const actionString = this.action.toString();
    tocar("redraw", false);
    const resp = await this.action(this.container, this.indices[this.index]);
    if (
      //     actionString === "(c, i) => wrapper.card=c.cards[i]" ||
      //    actionString === "(c,i) => newCard = c.cards[i]"
      med_draw === 10
      // THERE WAS SOME BUG, I HAVE NO IDEA WHY OR HOW SO....... I added this check if === 1 ~DrMineword
      //  99 little bugs in the code, 99 little bugs.
      //  Take one down, patch it around, 128 bugs in the code!
    ) {
      setTimeout(() => {
        med_draw = 0;
        extraJSON.push(
          JSON.stringify({
            type: "medicDraw",
            card: resp.filename,
          }),
        );
        //extraJSON = JSON.stringify({ type: "medicDraw", card: resp.filename });
        console.log(
          "extra json now",
          extraJSON,
          JSON.stringify({
            type: "medicDraw",
            card: resp.filename,
          }),
        );
      }, 1000);
    } else if (
      // actionString.includes("board.toWeather")
      med_draw === "EredinKIng"
    ) {
      // this shit here is broken, no resp
      med_draw = 0;

      // Rest handled inside ability!!

      // setTimeout(() => {
      //     extraJSON.push(
      //      JSON.stringify({ type: "weatherDraw", card: resp.filename }),
      //    );
      //extraJSON = JSON.stringify({ type: "medicDraw", card: resp.filename });
      //    console.log(
      //      "extra json now",
      //      extraJSON,
      //      JSON.stringify({ type: "weatherDraw", card: resp.filename }),
      //    );
      //   }, 1000);
    } else if (actionString.includes("board.toGrave")) {
      setTimeout(() => {
        extraJSON.push(
          JSON.stringify({ type: "removeCardHand", card: resp.filename }),
        );
        //extraJSON = JSON.stringify({ type: "medicDraw", card: resp.filename });
        console.log(
          "extra json now",
          extraJSON,
          JSON.stringify({ type: "removeCardHand", card: resp.filename }),
        );
      }, 1000);
      //    } else if (actionString.includes("board.toHand")) {
      //      setTimeout(() => {
      //       extraJSON.push(
      //        JSON.stringify({ type: "addCardHand", card: resp.filename }),
      //       );
      //extraJSON = JSON.stringify({ type: "medicDraw", card: resp.filename });
      //       console.log(
      //         "extra json now",
      //         extraJSON,
      //        JSON.stringify({ type: "addCardHand", card: resp.filename }),
      //      );
      //    }, 1000);
    }
    if (this.isLastSelection() && !this.cancelled) return this.exit();
    this.update();
  }

  // Called by client to exit out of the current Carousel if allowed. Enables player interraction.
  cancel() {
    if (this.bExit) {
      this.cancelled = true;
      tocar("discard", false);
      this.exit();
    }
    ui.enablePlayer(true);
  }

  // Returns true if there are no more cards to view or select
  isLastSelection() {
    return this.count <= 0 || this.indices.length === 0;
  }

  // Updates the visuals of the current selection of cards
  update() {
    this.indices = this.container.cards.reduce(
      (a, c, i) => (!this.predicate || this.predicate(c) ? a.concat([i]) : a),
      [],
    );
    if (this.index >= this.indices.length) this.index = this.indices.length - 1;
    for (let i = 0; i < this.previews.length; i++) {
      let curr = this.index - 2 + i;
      if (curr >= 0 && curr < this.indices.length) {
        let card = this.container.cards[this.indices[curr]];
        const faction =
          card?.row === "leader"
            ? (white_flame_lg_faction?.[card.holder?.tag] ?? card.faction)
            : card.faction;

        var tmp = `${faction}_${card.filename}`;

        if (card.filename === "Gaunter_Leader") {
          tmp = "neutral_Gaunter_Leader";
        }

        this.previews[i].style.backgroundImage = largeURL(tmp);
        this.previews[i].classList.remove("hide");
        this.previews[i].classList.remove("noclick");
      } else {
        this.previews[i].style.backgroundImage = "";
        this.previews[i].classList.add("hide");
        this.previews[i].classList.add("noclick");
      }
    }
    ui.setDescription(
      this.container.cards[this.indices[this.index]],
      this.desc,
    );
  }

  // Clears and quits the current carousel
  exit() {
    for (let x of this.previews) x.style.backgroundImage = "";
    this.elem.classList.add("hide");
    Carousel.clearCurrent();
    ui.quitCarousel();
  }

  // Statically sets the current carousel
  static setCurrent(curr) {
    this.curr = curr;
  }

  // Statically clears the current carousel
  static clearCurrent() {
    this.curr = null;
  }
}

// Custom confirmation windows
class Popup {
  constructor(yesName, yes, noName, no, header, description) {
    this.yes = yes ? yes : () => {};
    this.no = no ? no : () => {};

    this.elem = document.getElementById("popup");
    let main = this.elem.children[0];
    main.children[0].innerHTML = header ? header : "";
    main.children[1].innerHTML = description ? description : "";
    main.children[2].children[0].innerHTML = yesName ? yesName : "Yes";
    main.children[2].children[1].innerHTML = noName ? noName : "No";

    this.elem.classList.remove("hide");
    Popup.setCurrent(this);
    ui.enablePlayer(true);
  }

  // Sets this as the current popup window
  static setCurrent(curr) {
    this.curr = curr;
  }

  // Unsets this as the current popup window
  static clearCurrent() {
    this.curr = null;
  }

  // Called when client selects the positive aciton
  selectYes() {
    this.clear();
    this.yes();
    return true;
  }

  // Called when client selects the negative option
  selectNo() {
    this.clear();
    this.no();
    return false;
  }

  // Clears the popup and diables player interraction
  clear() {
    ui.enablePlayer(false);
    this.elem.classList.add("hide");
    Popup.clearCurrent();
  }
}

function add_card_count(deck) {
  deck.forEach((item) => {
    if (!item || !item.elem) return;

    const el = item.elem;

    // ensure badge exists
    let badge = el.querySelector(".card-count-badge");

    if (!badge) {
      badge = document.createElement("div");
      badge.className = "card-count-badge";

      badge.style.position = "absolute";
      badge.style.bottom = "6px";
      badge.style.right = "6px";

      badge.style.display = "flex";
      badge.style.alignItems = "center";
      badge.style.gap = "5px";

      badge.style.fontSize = "14px";
      badge.style.fontWeight = "700";

      badge.style.padding = "4px 6px";
      badge.style.borderRadius = "6px";

      badge.style.background = "rgb(33, 31, 29)"; // darker, less transparent #8e8880
      badge.style.color = "#5f4923"; // brighter gold
      badge.style.boxShadow = "0 2px 6px rgba(0,0,0,0.6)";
      badge.style.backdropFilter = "blur(2px)";
      badge.style.border = "1px solid rgba(255, 210, 122, 0.25)";

      const img = document.createElement("img");
      img.src = "./img/icons/preview_count.png";
      img.style.width = "16px";
      img.style.height = "16px";
      // img.style.filter = 'brightness(1.2)';

      const text = document.createElement("span");

      badge.appendChild(img);
      badge.appendChild(text);
      el.appendChild(badge);

      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }
    }

    // 🔥 SOURCE OF TRUTH = existing <div>1</div>
    const sourceDiv = el.querySelector(":scope > div");
    const value = sourceDiv ? sourceDiv.textContent.trim() : "0";

    const span = badge.querySelector("span");
    if (span) {
      span.textContent = value;
    }

    // console.log("DECK UPDATE", value);
  });
}
// Screen used to customize, import and export deck contents
class DeckMaker {
  constructor() {
    this.elem = customizationElem;
    this.bank_elem = document.getElementById("card-bank");
    this.deck_elem = document.getElementById("card-deck");
    this.leader_elem = document.getElementById("card-leader");
    this.leader_elem.children[1].addEventListener(
      "click",
      () => this.selectLeader(),
      false,
    );

    this.faction =
      Object.keys(factions)[
        Math.floor(Math.random() * Object.keys(factions).length)
      ] || "realms";
    console.log("START DECK RANDOM FACTION", this.faction);
    this.setFaction(this.faction, true);
    let start_deck = premade_deck.find((d) => d.faction === this.faction);
    console.log(
      "START DECK",
      JSON.stringify(start_deck?.cards) || start_deck,
      `For faction ${factions[this.faction].name || this.faction}`,
    );
    start_deck.cards = start_deck.cards.map((c) => ({
      index: c[0],
      count: c[1],
    }));
    this.setLeader(start_deck.leader);
    this.makeBank(this.faction, start_deck.cards);
    this.change_elem = document.getElementById("change-faction");
    this.change_elem.addEventListener(
      "click",
      () => this.selectFaction(),
      false,
    );

    document
      .getElementById("download-deck")
      .addEventListener(
        "click",
        () => deck_importo_exporto.downloadDeck(),
        false,
      );
    document
      .getElementById("add-file")
      .addEventListener(
        "change",
        () => deck_importo_exporto.uploadDeck(),
        false,
      );
    readyButtonElem.addEventListener("click", () => this.startNewGame(), false);
    somCarta();

    this.update();
  }

  // Called when client selects a deck faction. Clears previous cards and makes valid cards available.
  async setFaction(faction_name, silent) {
    if (!silent && this.faction === faction_name) return false;
    if (!silent) {
      tocar("warning", false);
      var res = await new Promise((resolve) => {
        // Overlay
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
          position: "fixed",
          inset: "0",
          background: "rgba(10, 8, 5, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: "99999",
          backdropFilter: "blur(2px)",
        });

        // Dialog
        const box = document.createElement("div");
        Object.assign(box.style, {
          width: "420px",
          maxWidth: "90vw",
          background: "linear-gradient(#efe7d3, #ddd0b3)",
          border: "2px solid #6f5830",
          borderRadius: "8px",
          boxShadow: "0 10px 30px rgba(0,0,0,.55)",
          color: "#2d2418",
          fontFamily: "Georgia, serif",
          overflow: "hidden",
        });
        box.classList.add("allow-click");

        // Header
        const header = document.createElement("div");
        header.textContent = "Confirm";
        Object.assign(header.style, {
          padding: "10px 16px",
          background: "#6f5830",
          color: "#f4e7c3",
          fontSize: "18px",
          fontWeight: "bold",
          textAlign: "center",
          borderBottom: "1px solid #4f3d22",
        });

        // Message
        const text = document.createElement("div");
        text.innerHTML =
          "Change faction?<br><br>This will clear your current deck!";
        Object.assign(text.style, {
          padding: "24px",
          fontSize: "18px",
          lineHeight: "1.5",
          textAlign: "center",
        });

        // Button row
        const buttons = document.createElement("div");
        Object.assign(buttons.style, {
          display: "flex",
          justifyContent: "center",
          gap: "14px",
          padding: "0 0 20px",
        });

        function makeButton(label) {
          const btn = document.createElement("button");
          btn.textContent = label;
          Object.assign(btn.style, {
            minWidth: "90px",
            padding: "8px 18px",
            background: "#7a5b2e",
            color: "#f6edd8",
            border: "1px solid #4f3d22",
            borderRadius: "4px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "0.15s",
          });

          btn.onmouseenter = () => {
            btn.style.background = "#9b7539";
          };

          btn.onmouseleave = () => {
            btn.style.background = "#7a5b2e";
          };

          return btn;
        }

        const yes = makeButton("Yes");
        const no = makeButton("No");

        function cleanup(result) {
          document.body.removeChild(overlay);
          resolve(result);
        }

        yes.onclick = () => cleanup(true);
        no.onclick = () => cleanup(false);

        overlay.addEventListener("keydown", (e) => {
          if (e.key === "Enter") cleanup(true);
          if (e.key === "Escape") cleanup(false);
        });

        buttons.appendChild(yes);
        buttons.appendChild(no);
        box.appendChild(header);
        box.appendChild(text);
        box.appendChild(buttons);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        yes.focus();
      });
      if (!res) {
        tocar("warning", false);
        return false;
      }

      comp_and_send(
        socket,
        JSON.stringify({
          type: "opChangeFaction",
          faction: faction_name,
          info: { me_id: playerId, me_flag: country },
        }),
      );
      if (players.me !== "You") {
        comp_and_send(
          socket,
          JSON.stringify({
            type: "MyName",
            is: players.me,
          }),
        );
      }
      sendChatMessageStrig(`play wich ${factions[faction_name].name} faction!`);
    }

    this.elem.getElementsByTagName("h1")[0].innerHTML =
      factions[faction_name].name;
    this.elem.getElementsByTagName("h1")[0].style.backgroundImage = iconURL(
      "deck_shield_" + faction_name,
    );
    const description = factions[faction_name].description;

    document.getElementById("faction-description").innerHTML = description
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    this.leaders = card_dict
      .map((c, i) => ({ index: i, card: c }))
      .filter((c) => c.card.deck === faction_name && c.card.row === "leader");
    if (!this.leader || this.faction !== faction_name) {
      this.leader = this.leaders[0];
      var tmp = this.leader.card.deck + "_" + this.leader.card.filename;

      if (this.leader.card.filename === "Gaunter_Leader") {
        tmp = "neutral_Gaunter_Leader";
      }

      this.leader_elem.children[1].style.backgroundImage = largeURL(tmp);
    }
    this.faction = faction_name;
    setTimeout(function () {
      somCarta();
    }, 300);
    return true;
  }

  // Called when client selects a leader for their deck
  setLeader(index) {
    this.leader = this.leaders.find((l) => l.index == index);
    var tmp = this.leader.card.deck + "_" + this.leader.card.filename;

    if (this.leader.card.filename === "Gaunter_Leader") {
      tmp = "neutral_Gaunter_Leader";
    }

    this.leader_elem.children[1].style.backgroundImage = largeURL(tmp);
  }

  // Constructs a bank of cards that can be used by the faction's deck.
  // If a deck is provided, will not add cards to bank that are already in the deck.
  makeBank(faction, deck) {
    if (faction !== "syndicate") {
      this.clear();
      let cards = card_dict
        .map((c, i) => ({ card: c, index: i }))
        .filter(
          (p) =>
            [faction, "neutral", "weather", "special"].includes(p.card.deck) &&
            p.card.row !== "leader",
        );

      cards.sort(function (id1, id2) {
        let a = card_dict[id1.index],
          b = card_dict[id2.index];
        let c1 = { name: a.name, basePower: -a.strength, faction: a.deck };
        let c2 = { name: b.name, basePower: -b.strength, faction: b.deck };
        return Card.compare(c1, c2);
      });

      let deckMap = {};
      if (deck) {
        for (let i of Object.keys(deck)) deckMap[deck[i].index] = deck[i].count;
      }
      cards.forEach((p) => {
        let count =
          deckMap[p.index] !== undefined ? Number(deckMap[p.index]) : 0;
        this.makePreview(
          p.index,
          Number.parseInt(p.card.count) - count,
          this.bank_elem,
          this.bank,
        );
        this.makePreview(p.index, count, this.deck_elem, this.deck);
      });
      add_card_count(this.bank);
      add_card_count(this.deck);
    } else {
      this.clear();
      let cards = card_dict
        .map((c, i) => ({ card: c, index: i }))
        .filter(
          (p) =>
            [
              ...Object.keys(syndicate_faction_clone),
              "neutral",
              "weather",
              "special",
            ].includes(p.card.deck) && p.card.row !== "leader",
        );

      cards.sort(function (id1, id2) {
        let a = card_dict[id1.index],
          b = card_dict[id2.index];
        let c1 = { name: a.name, basePower: -a.strength, faction: a.deck };
        let c2 = { name: b.name, basePower: -b.strength, faction: b.deck };
        return Card.compare(c1, c2);
      });

      let deckMap = {};
      if (deck) {
        for (let i of Object.keys(deck)) deckMap[deck[i].index] = deck[i].count;
      }
      cards.forEach((p) => {
        let count =
          deckMap[p.index] !== undefined ? Number(deckMap[p.index]) : 0;
        this.makePreview(
          p.index,
          Number.parseInt(p.card.count) - count,
          this.bank_elem,
          this.bank,
        );
        this.makePreview(p.index, count, this.deck_elem, this.deck);
      });
      add_card_count(this.bank);
      add_card_count(this.deck);
    }
  }

  // Creates HTML elements for the card previews
  makePreview(index, num, container_elem, cards) {
    let card_data = card_dict[index];

    let elem = document.createElement("div");
    var tmp = card_data.deck + "_" + card_data.filename;

    if (card_data.filename === "Gaunter_Leader") {
      tmp = "neutral_Gaunter_Leader";
    }

    elem.style.backgroundImage = largeURL(tmp);
    elem.classList.add("card-lg");
    let count = document.createElement("div");
    elem.appendChild(count);
    container_elem.appendChild(elem);

    let bankID = { index: index, count: num, elem: elem };
    let isBank = cards === this.bank;
    count.innerHTML = bankID.count;
    cards.push(bankID);
    let cardIndex = cards.length - 1;
    elem.addEventListener("click", () => this.select(cardIndex, isBank), false);

    return bankID;
  }

  // Updates the card preview elements when any changes are made to the deck
  update() {
    for (let x of this.bank) {
      if (x.count) x.elem.classList.remove("hide");
      else x.elem.classList.add("hide");
    }
    let total = 0,
      units = 0,
      special = 0,
      strength = 0,
      hero = 0;
    for (let x of this.deck) {
      let card_data = card_dict[x.index];
      if (x.count) x.elem.classList.remove("hide");
      else x.elem.classList.add("hide");
      total += x.count;
      if (card_data.deck === "special" || card_data.deck === "weather") {
        special += x.count;
        continue;
      }
      units += x.count;
      strength += card_data.strength * x.count;
      if (card_data.ability.split(" ").includes("hero")) hero += x.count;
    }
    this.stats = {
      total: total,
      units: units,
      special: special,
      strength: strength,
      hero: hero,
    };
    this.updateStats();
  }

  // Updates and displays the statistics describing the cards currently in the deck
  updateStats() {
    let stats = document.getElementById("deck-stats");
    stats.children[1].innerHTML = this.stats.total;
    stats.children[3].innerHTML =
      this.stats.units +
      (this.stats.units < ForGameStart.unitscards
        ? "/" + ForGameStart.unitscards
        : "");
    stats.children[5].innerHTML =
      this.stats.special + "/" + ForGameStart.special;
    stats.children[7].innerHTML = this.stats.strength;
    stats.children[9].innerHTML = this.stats.hero + "/" + ForGameStart.hero;

    stats.children[3].style.color =
      this.stats.units < ForGameStart.unitscard ? "red" : "";
    stats.children[5].style.color =
      this.stats.special > ForGameStart.special ? "red" : "";
    stats.children[9].style.color =
      this.stats.hero > ForGameStart.hero ? "red" : "";
  }

  // Opens a Carousel to allow the client to select a leader for their deck
  selectLeader() {
    let container = new CardContainer();
    container.cards = this.leaders.map((c) => {
      let card = new Card(c.card, player_me);
      card.data = c;
      return card;
    });

    let index = this.leaders.indexOf(this.leader);
    ui.queueCarousel(
      container,
      1,
      (c, i) => {
        let data = c.cards[i].data;
        this.leader = data;
        var tmp = data.card.deck + "_" + data.card.filename;

        if (data.card.filename === "Gaunter_Leader") {
          tmp = "neutral_Gaunter_Leader";
        }

        this.leader_elem.children[1].style.backgroundImage = largeURL(tmp);
      },
      () => true,
      false,
      true,
    );
    Carousel.curr.index = index;
    Carousel.curr.update();
  }

  // Opens a Carousel to allow the client to select a faction for their deck
  selectFaction() {
    let container = new CardContainer();
    container.cards = Object.keys(factions).map((f) => {
      return {
        abilities: [f],
        filename: f,
        desc_name: factions[f].name,
        desc: factions[f].description,
        faction: "faction",
      };
    });
    let index = container.cards.reduce(
      (a, c, i) => (c.filename === this.faction ? i : a),
      0,
    );
    ui.queueCarousel(
      container,
      1,
      (c, i) => {
        const card_faction_name = c.cards[i].filename;
        let change = this.setFaction(card_faction_name);
        if (!change) return;
        const faction_premade_deck = premade_deck.find(
          (d) => d.faction === card_faction_name,
        );

        if (faction_premade_deck) {
          var is_premade = false;
          try {
            is_premade = faction_premade_deck?.cards[0].index;
          } catch (e) {}
          if (!is_premade)
            faction_premade_deck.cards = faction_premade_deck.cards.map(
              (c) => ({ index: c[0], count: c[1] }),
            );
          this.makeBank(card_faction_name, faction_premade_deck.cards);
        } else this.makeBank(card_faction_name);
        this.update();
      },
      () => true,
      false,
      true,
    );
    Carousel.curr.index = index;
    Carousel.curr.update();
  }

  // Called when client selects s a preview card. Moves it from bank to deck or vice-versa then updates;
  select(index, isBank) {
    if (isBank) {
      tocar("menu_buy", false);
      this.add(index, this.deck);
      this.remove(index, this.bank);
    } else {
      tocar("discard", false);
      this.add(index, this.bank);
      this.remove(index, this.deck);
    }
    console.log("BANK/DECK UPDATE", "DECK", this.deck, "BANK", this.bank);
    add_card_count(this.deck);
    add_card_count(this.bank);
    this.update();
  }

  // Adds a card to container (Bank or deck)
  async add(index, cards) {
    let id = cards[index];
    id.elem.children[0].innerHTML = ++id.count;
    try {
      // console.log("Adds a card to container (Bank or deck)", index, cards, id, this, "\n", this.stats, "\n\n", card_dict[id.index].ability);
      // abilities on the card, e.g. ["hero", "morale"]
      var abilities = (card_dict[id.index].ability || "")
        .split(" ")
        .filter(Boolean);
      var descOutput = abilities
        .map((abilityId) => ability_dict[abilityId]?.description || "")
        .filter(Boolean);
      var descString = descOutput.join("\n");
      var timeNow = Date.now().toString();
      var shaSource = utf8ToBase64(timeNow + descString);
      // console.log("\nAdds a card to container (Bank or deck)", abilities, descOutput, descString, shaSource);
      if (2 < descString.length) {
        console.log(
          "Show stats for",
          card_dict[id.index],
          ` wich abilities ${card_dict[id.index].ability} `,
          descString,
          " for ",
          showbankms / 1000,
        );
        displaynow = shaSource;
        document.getElementById("cardstatsdisplay").innerHTML =
          descString.replace(/\n/g, "<br>");
        await sleep(showbankms);
        if (shaSource === displaynow) {
          console.log(
            "Hide stats for",
            card_dict[id.index],
            ` wich abilities ${card_dict[id.index].ability} `,
          );
          document.getElementById("cardstatsdisplay").innerHTML = "";
        } else {
          console.log(
            `displaynow no longer valid ${displaynow} != ${shaSource}`,
          );
        }
      }
    } catch (e) {
      console.log("Adds a card to container (Bank or deck)", " err", e);
    }
  }

  // Removes a card from container (bank or deck)
  remove(index, cards) {
    let id = cards[index];
    id.elem.children[0].innerHTML = --id.count;
  }

  // Removes all elements in the bank and deck
  clear() {
    while (this.bank_elem.firstChild)
      this.bank_elem.removeChild(this.bank_elem.firstChild);
    while (this.deck_elem.firstChild)
      this.deck_elem.removeChild(this.deck_elem.firstChild);
    this.bank = [];
    this.deck = [];
    this.stats = {};
  }

  // Verifies current deck, creates the players and their decks, then starts a new game
  async startNewGame() {
    if (!twoPlayersConnected) {
      console.warn("Cannot start game: waiting for second player.");
      showTooltip(getUiStrng("no_op_start"));
      return;
    }
    if (amReady) {
      comp_and_send(socket, JSON.stringify({ type: "unReady" }));
      showTooltip(getUiStrng("me_unready"));
      var btn = document.getElementById("session-start-control");
      btn.textContent = "Ready";
      customizationElem.classList.remove("noclick");
      amReady = false;
      toggleReadyWaiting(amReady);
      //		readyButtonElem.classList.remove("ready");
      //		customizationElem.classList.remove("noclick");
      //		comp_and_send(socket, JSON.stringify({ type: "unReady" }));
      return;
    }
    console.log("[Start] \\this.stats\\", this.stats);
    let warning = "";
    if (this.stats.units < ForGameStart.unitscards)
      warning += `Your deck must have at least ${ForGameStart.unitscards} unit cards. \n`;
    if (this.stats.special > ForGameStart.special)
      warning += `Your deck must have no more than ${ForGameStart.special} special cards. \n`;
    if (this.stats.hero > ForGameStart.hero)
      warning += `Your deck must have no more than ${ForGameStart.hero} hero cards. \n`;

    if (warning != "") return warn_screen(warning);
    else {
      document.getElementById("session-start-control").classList.add("ready");
      customizationElem.classList.add("noclick");
    }

    let me_deck = {
      faction: this.faction,
      leader: card_dict[this.leader.index],
      cards: this.deck.filter((x) => x.count > 0),
    };
    previous_game_start_cards = me_deck;

    player_me = new Player(
      0,
      players["me"]?.replace(
        /[&<>"']/g,
        (m) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[m],
      ),
      me_deck,
    );
    comp_and_send(socket, JSON.stringify({ type: "ready", deck: me_deck }));
    amReady = true;
    toggleReadyWaiting(amReady);
    customizationElem.classList.add("noclick");
    showTooltip(getUiStrng("me_ready"));
    if (opponentReady) {
      this.elem.classList.add("hide");
      //await sleep(100);
      game.startGame();
    } else {
      var btn = document.getElementById("session-start-control");
      btn.textContent = "UnReady";
    }
  }
}
// Translates a card between two containers
async function translateTo(card, container_source, container_dest) {
  if (!container_dest || !container_source) return;
  if (container_dest === player_op.hand && container_source === player_op.deck)
    return;

  let elem = card.elem;
  let source = !container_source
    ? card.elem
    : getSourceElem(card, container_source, container_dest);
  let dest = getDestinationElem(card, container_source, container_dest);
  if (!isInDocument(elem)) source.appendChild(elem);
  let x =
    trueOffsetLeft(dest) -
    trueOffsetLeft(elem) +
    dest.offsetWidth / 2 -
    elem.offsetWidth;
  let y =
    trueOffsetTop(dest) -
    trueOffsetTop(elem) +
    dest.offsetHeight / 2 -
    elem.offsetHeight / 2;
  if (
    container_dest instanceof Row &&
    container_dest.cards.length !== 0 &&
    !card.isSpecial()
  ) {
    x +=
      container_dest.getSortedIndex(card) === container_dest.cards.length
        ? elem.offsetWidth / 2
        : -elem.offsetWidth / 2;
  }
  if (card.holder.controller instanceof ControllerOpponent)
    x += elem.offsetWidth / 2;
  if (
    container_source instanceof Row &&
    container_dest instanceof Grave &&
    !card.isSpecial()
  ) {
    let mid =
      trueOffset(container_source.elem, true) +
      container_source.elem.offsetWidth / 2;
    x += trueOffset(elem, true) - mid;
  }
  if (container_source instanceof Row && container_dest === player_me.hand)
    y *= 7 / 8;
  await translate(elem, x, y);

  // Returns true if the element is visible in the viewport
  function isInDocument(elem) {
    return elem.getBoundingClientRect().width !== 0;
  }

  // Returns the true offset of a nested element in the viewport
  function trueOffset(elem, left) {
    let total = 0;
    let curr = elem;
    while (curr) {
      total += left ? curr.offsetLeft : curr.offsetTop;
      curr = curr.parentElement;
    }
    return total;
  }
  function trueOffsetLeft(elem) {
    return trueOffset(elem, true);
  }
  function trueOffsetTop(elem) {
    return trueOffset(elem, false);
  }

  // Returns the source container's element to transition from
  function getSourceElem(card, source, dest) {
    if (source instanceof HandOpponent) return source.hidden_elem;
    if (source instanceof Deck)
      return source.elem.children[source.elem.children.length - 2];
    return source.elem;
  }

  // Returns the destination container's element to transition to
  function getDestinationElem(card, source, dest) {
    if (dest instanceof HandOpponent) return dest.hidden_elem;
    if (card.isSpecial() && dest instanceof Row) return dest.elem_special;
    if (
      dest instanceof Row ||
      dest instanceof Hand ||
      dest instanceof Weather
    ) {
      if (dest.cards.length === 0) return dest.elem;
      let index = dest.getSortedIndex(card);
      let dcard = dest.cards[index === dest.cards.length ? index - 1 : index];
      return dcard.elem;
    }
    return dest.elem;
  }
}

// Translates an element by x from the left and y from the top
async function translate(elem, x, y) {
  let vw100 = 100 / document.getElementById("dimensions").offsetWidth;
  x *= vw100;
  y *= vw100;
  elem.style.transform = "translate(" + x + "vw, " + y + "vw)";
  let margin = elem.style.marginLeft;
  elem.style.marginRight = -elem.offsetWidth * vw100 + "vw";
  elem.style.marginLeft = "";
  await sleep(499);
  elem.style.transform = "";
  elem.style.position = "";
  elem.style.marginLeft = margin;
  elem.style.marginRight = margin;
}

// Fades out an element until hidden over the duration
async function fadeOut(elem, duration, delay) {
  await fade(false, elem, duration, delay);
}

// Fades in an element until opaque over the duration
async function fadeIn(elem, duration, delay) {
  await fade(true, elem, duration, delay);
}

// Fades an element over a duration
async function fade(fadeIn, elem, dur, delay) {
  if (delay) await sleep(delay);
  let op = fadeIn ? 0.1 : 1;
  elem.style.opacity = op;
  elem.style.filter = "alpha(opacity=" + op * 100 + ")";
  if (fadeIn) elem.classList.remove("hide");
  let timer = setInterval(async function () {
    op += op * (fadeIn ? 0.1 : -0.1);
    if (op >= 1) {
      clearInterval(timer);
      return;
    } else if (op <= 0.1) {
      elem.classList.add("hide");
      elem.style.opacity = "";
      elem.style.filter = "";
      clearInterval(timer);
      return;
    }
    elem.style.opacity = op;
    elem.style.filter = "alpha(opacity=" + op * 100 + ")";
  }, dur / 24);
}

//      Get Image paths
function iconURL(name, ext = "png") {
  const blobUrl = getTexturePackBlob("icons/" + name, ext);
  if (blobUrl) {
    return `url('${blobUrl}')`;
  }
  return imgURL("icons/" + name, ext);
}
function largeURL(name, ext = "jpg") {
  const blobUrl = getTexturePackBlob("lg/" + name, ext);
  if (blobUrl) {
    return `url('${blobUrl}')`;
  }
  const bloburl_custom = getCustomCardBlob(
    "lg",
    name.substring(name.indexOf("_") + 1),
  );
  if (bloburl_custom) {
    return `url('${bloburl_custom}')`;
  }
  return imgURL("lg/" + name, ext);
}
function smallURL(name, ext = "jpg") {
  const blobUrl = getTexturePackBlob("sm/" + name, ext);
  if (blobUrl) {
    return `url('${blobUrl}')`;
  }
  const bloburl_custom = getCustomCardBlob(
    "sm",
    name.substring(name.indexOf("_") + 1),
  );
  if (bloburl_custom) {
    return `url('${bloburl_custom}')`;
  }
  return imgURL("sm/" + name, ext);
}
function imgURL(path, ext) {
  const blobUrl = getTexturePackBlob("img/" + path + "." + ext + "");
  if (blobUrl) {
    return `url('${blobUrl}')`;
  }
  // return "url('img/" + path + "." + ext;
  return "url('img/" + path + "." + ext + "')";
}

// Returns true if n is an Number
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Returns true if s is a String
function isString(s) {
  return typeof s === "string" || s instanceof String;
}

// Returns a random integer in the range [0,n)
function randomInt(n) {
  return Math.floor(Math.random() * n);
}

// Pauses execution until the passed number of milliseconds as expired
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
  //return new Promise(resolve => setTimeout(() => {if (func) func(); return resolve();}, ms));
}

// Suspends execution until the predicate condition is met, checking every ms milliseconds
function sleepUntil(predicate, ms) {
  return new Promise((resolve) => {
    let timer = setInterval(function () {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      }
    }, ms);
  });
}

// Remove circular references to create JSON.
function removeCircularReferences(obj) {
  const seen = new WeakSet();
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    }),
  );
}

function createCardElement(card) {
  let elem = document.createElement("div");
  const faction =
    card?.row === "leader"
      ? (white_flame_lg_faction?.[card.holder?.tag] ?? card.faction)
      : card.faction;

  var tmp = `${faction}_${card.filename}`;

  if (card.filename === "Gaunter_Leader") {
    tmp = "neutral_Gaunter_Leader";
  }

  elem.style.backgroundImage = smallURL(tmp);
  elem.classList.add("card");
  elem.addEventListener("click", () => ui.selectCard(card), false);

  if (card.row === "leader") return elem;

  let power = document.createElement("div");
  elem.appendChild(power);
  let bg;
  if (card.hero) {
    bg = "power_hero";
    elem.classList.add("hero");
  } else if (card.faction === "weather") {
    bg = "power_" + card.abilities[0];
  } else if (card.faction === "special") {
    bg = "power_" + card.abilities[0];
    elem.classList.add("special");
  } else {
    bg = "power_normal";
  }
  power.style.backgroundImage = iconURL(bg);

  let row = document.createElement("div");
  elem.appendChild(row);
  if (
    card.row === "close" ||
    card.row === "ranged" ||
    card.row === "siege" ||
    card.row === "agile"
  ) {
    let num = document.createElement("div");
    num.appendChild(document.createTextNode(card.basePower));
    num.classList.add("center");
    power.appendChild(num);
    row.style.backgroundImage = iconURL("card_row_" + card.row);
  }

  let abi = document.createElement("div");
  elem.appendChild(abi);
  if (
    card.faction !== "special" &&
    card.faction !== "weather" &&
    card.abilities.length > 0
  ) {
    var abilities = card.abilities.filter((a) => a !== "DontPickMeUp");
    let str = abilities.at(-1);
    //  let str = card.abilities[card.abilities.length - 1];
    if (str === "cerys") str = "muster";
    if (str.startsWith("avenger")) str = "avenger";
    if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
      str = "scorch";
    abi.style.backgroundImage = iconURL("card_ability_" + str);
  } else if (card.row === "agile")
    abi.style.backgroundImage = iconURL("card_ability_" + "agile");

  elem.appendChild(document.createElement("div")); // animation overlay
  return elem;
}

function somCarta() {
  var classes = ["card", "card-lg"];
  for (var i = 0; i < classes.length; i++) {
    var cartas = document.getElementsByClassName(classes[i]);
    for (var j = 0; j < cartas.length; j++) {
      if (cartas[j].id != "no_sound" && cartas[j].id != "no_hover")
        cartas[j].addEventListener("mouseover", function () {
          tocar("card", false);
        });
    }
  }
  var tags = ["label", "a", "button"];
  for (var i = 0; i < tags.length; i++) {
    var rec = document.getElementsByTagName(tags[i]);
    for (var j = 0; j < rec.length; j++)
      rec[j].addEventListener("mouseover", function () {
        tocar("card", false);
      });
  }
  var ids = ["pass-button", "toggle-music"];
  for (var i = 0; i < ids.length; i++)
    document.getElementById(ids[i]).addEventListener("mouseover", function () {
      tocar("card", false);
    });
}

var lastSound = "";
// legacy
//function tocar(arquivo, pararMusica) {
//	console.log("[sfx] play: arquivo, pararMusica", arquivo, pararMusica)
//	if (arquivo != lastSound && arquivo != "") {
//	var s = new Audio("sfx/" + arquivo + ".mp3");
//   if (pararMusica && ui.youtube && ui.youtube.getPlayerState() === AUDIO_STATE.PLAYING) {
//		ui.youtube.pauseVideo();
//		ui.toggleMusic_elem.classList.add("fade");
//	}
//	lastSound = arquivo;
//	s.play();
//	setTimeout(function() {
//		lastSound = "";
//	}, 50);
//}
//}

// cache:
async function loadPackedSFX() {
  var loadPackedSFX_pref = "[sfx] [zip]";

  console.log(loadPackedSFX_pref, " loading packed.zip");

  const response = await fetch("sfx/packed.zip");
  const buffer = await response.arrayBuffer();
  console.log(loadPackedSFX_pref, " buffer ", buffer);
  const zip = await JSZip.loadAsync(buffer);

  const files = Object.keys(zip.files);
  console.log(loadPackedSFX_pref, " files ", files);
  for (const filename of files) {
    if (!filename.endsWith(".mp3")) continue;

    const blob = await zip.files[filename].async("blob");

    const url = URL.createObjectURL(blob);

    const cleanName = filename.replace("sfx/", "").replace(".mp3", "");

    audio_cache[cleanName] = url;

    console.log(loadPackedSFX_pref, " cached:", cleanName);
  }

  console.log(loadPackedSFX_pref, " all sounds loaded");
}
// new:
function tocar(arquivo, pararMusica) {
  if (arquivo.includes("card") || arquivo.includes("game_buy")) {
  } else {
    if (playBlock[utf8ToBase64(arquivo)]) {
      if (playBlock[utf8ToBase64(arquivo)] === 1) {
        playBlock[utf8ToBase64(arquivo)] = 2;
        //	console.log("TOCAR PLAY", playBlock, arquivo);
      } else {
        //			console.log("TOCAR BLOCK PLAY", playBlock, arquivo);
        return false;
      }
    } else {
      playBlock[utf8ToBase64(arquivo)] = 2;
      //	console.log("TOCAR PLAY", playBlock, arquivo);
    }
  }

  // console.log("TOCAR", arquivo, pararMusica);
  //console.log("[sfx] tocar() called", "\n[sfx] params -> arquivo:", arquivo, "| pararMusica:", pararMusica);
  //console.log("[sfx] current lastSound:", lastSound);

  if (arquivo != lastSound && arquivo != "") {
    //	console.log("[sfx] sound allowed to play");

    var audioPath =
      getTexturePackBlob("sfx/" + arquivo + ".mp3") ||
      audio_cache[arquivo] ||
      "sfx/" + arquivo + ".mp3";

    // console.log("[sfx] creating Audio with path:", audioPath);

    var s = new Audio(audioPath);

    if (pararMusica) {
      console.log("[sfx] pararMusica is true", ui.getAudioState());
      if (ui.getAudioState() === 1) {
        ui.stopYouTube();
      }
    }

    lastSound = arquivo;
    //console.log("[sfx] lastSound updated to:", lastSound);

    s.play()
      .then(() => {
        if (playBlock[utf8ToBase64(arquivo)]) {
          playBlock[utf8ToBase64(arquivo)] = 1;
          //	console.log("TOCAR DEL NOW:", playBlock, arquivo);
        }
        //	console.log("[sfx] audio playback started successfully");
      })
      .catch((err) => {
        if (playBlock[utf8ToBase64(arquivo)]) {
          playBlock[utf8ToBase64(arquivo)] = 1;
          //	console.log("TOCAR DEL NOW:", playBlock, arquivo);
        }
        //	console.error("[sfx] audio playback failed:", err);
      });

    setTimeout(function () {
      //	console.log("[sfx] resetting lastSound after timeout");
      lastSound = "";
    }, 50);
  } else {
    if (arquivo == "") {
      //console.warn("[sfx] blocked: arquivo is empty");
    } else {
      //	console.warn("[sfx] blocked: same as lastSound:", arquivo);
    }
  }
}

/*----------------------------------------------------*/
function onYouTubeIframeAPIReady() {
  if (!onYouTubeIframeAPIReady_status) {
    onYouTubeIframeAPIReady_status = true;
    console.warn("YT IFRAME IS READY");
    if (ui.getAudioState() !== 1) {
      ui.initYouTube();
    }
  }
}
loadingscreenupdate("YouTubeIframeAPIReady() ready...");

async function iniciarMusica(bypass = false) {
  try {
    try {
      var tmp = ui.audio?.paused || false;
    } catch (e) {
      var tmp = false;
    }
    console.log("iniciarMusica TMP", tmp, bypass);
    if (!tmp) {
      if (location.port !== "1111") {
        ui.audio.play().catch(() => {});
      } else {
        await sleep(200);
        if (ui.getAudioState() !== 1) {
          await ui.youtubePlay(tavern_yt_vid, tavern_yt_volume, true);
        }
        console.log("state", ui.getAudioState());
      }

      if (bypass) {
        ui.stopYouTube();
      }

      ui.toggleMusic_elem.classList.remove("fade");
    }
  } catch (err) {
    console.log("iniciarMusica err", bypass, err);
  }
}

var ui = new UI();

var board = new Board();
var weather = new Weather();
var game = new Game();
var player_me, player_op;

ui.enablePlayer(false);
let dm = null;
if (debuglunchcustomcards) {
  dm = new DeckMaker();
} else {
}

function cartaNaLinha(id, carta) {
  if (id.charAt(0) == "f") {
    if (!carta.hero) {
      if (carta.name != "Decoy") {
        var linha = parseInt(id.charAt(1));
        if (linha == 1 || linha == 6) tocar("common3", false);
        else if (linha == 2 || linha == 5) tocar("common2", false);
        else if (linha == 3 || linha == 4) tocar("common1", false);
      } else tocar("menu_buy", false);
    } else tocar("hero", false);
  }
}

async function inicio() {
  openFullscreen();
  var classe = document.getElementsByClassName("abs");
  for (var i = 0; i < classe.length; i++) classe[i].style.display = "none";
  iniciou = true;
  tocar("menu_opening", false);
  //openFullscreen();
  if (init_button_show_patchnotes) {
    run_patchnotes();
  }
  await iniciarMusica(false);
  if (ui.getAudioState() !== 1) {
    await ui.toggleMusic();
    await sleep(10);
    await ui.toggleMusic();
  }
  if (ui.getAudioState() !== 1) {
    await ui.youtubePlay(tavern_yt_vid, tavern_yt_volume, true);
  }
}

var iniciou = false,
  isLoaded = false;
// window.onload = async function () {
async function postscripinit() {
  if (debuglunchcustomcards) {
    document.getElementById("load_text").style.display = "none";
    document.getElementById("button_start").style.display = "inline-block";
    customizationElem.style.display = "";
    document.getElementById("toggle-music").style.display = "";
    document.getElementsByTagName("main")[0].style.display = "";
    document
      .getElementById("button_start")
      .addEventListener("click", function () {
        inicio();
        if (ui.getAudioState() !== 1) {
          ui.initYouTube();
        }
        // cache audio:
        try {
          console.log("[sfx] In init: loadPackedSFX()");
          loadPackedSFX();
        } catch (e) {
          console.log("[sfx] In init: loadPackedSFX(); err", e);
        }
      });
    isLoaded = true;
  } else {
    loadingscreenupdate(`Waiting for card builds...`);
    try {
      await custom_card_builder_init();
    } catch (e) {
      warn_screen(
        "Fatal error at custom_card_builder_init()\n\nGame failed to lunch\n\nCheck console for more!",
      );
      console.error("FATAL", e);
    }
  }
}

async function loadYTByEval() {
  if (window.YT?.Player) return window.YT;

  const code = await fetch("javascript/yt/iframe_api.js").then((r) => r.text());

  // Execute the downloaded API
  (0, eval)(code);

  // Wait until the API becomes usable
  while (!window.YT?.Player) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return window.YT;
}

async function lunch_gwent_ui() {
  loadingscreenupdate(`Loading music...`);
  await loadYTByEval();
  console.log("YouTube API is ready!");
  loadingscreenupdate(`Running lunch_gwent_ui()...`);

  document.getElementById("load_text").style.display = "none";
  document.getElementById("button_start").style.display = "inline-block";
  customizationElem.style.display = "";
  document.getElementById("toggle-music").style.display = "";
  document.getElementsByTagName("main")[0].style.display = "";
  document
    .getElementById("button_start")
    .addEventListener("click", function () {
      inicio();
      if (ui.getAudioState() !== 1) {
        ui.initYouTube();
      }
      // cache audio:
      try {
        console.log("[sfx] In init: loadPackedSFX()");
        loadPackedSFX();
      } catch (e) {
        console.log("[sfx] In init: loadPackedSFX(); err", e);
      }
    });
  isLoaded = true;
  console.log("dm init", card_dict);
  //  onYouTubeIframeAPIReady();
  dm = new DeckMaker();
  console.log("DM", dm);
}

let spacebarPressTimer;
let isSpacebarPressed = false;

function handleKeyDown(event) {
  if (event.code === "xxxxxxSpace" && !isSpacebarPressed) {
    isSpacebarPressed = true;
    spacebarPressTimer = setTimeout(() => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      passButton.classList.remove("loading");
      player_me.passRound();
      comp_and_send(socket, JSON.stringify({ type: "pass", player: playerId }));
    }, 2 * 1000);
    startLoadingEffect();
  }
}

function handleKeyUp(event) {
  if (event.code === "Space") {
    isSpacebarPressed = false;
    clearTimeout(spacebarPressTimer);
    stopLoadingEffect();
  }
}

function startLoadingEffect() {
  passButton.classList.add("loading");
}

function stopLoadingEffect() {
  passButton.classList.remove("loading");
}

async function ShowDeckMe() {
  console.log("Loading deck...");
  const deck = {
    ...player_me.deck,
    cards: [...player_me.deck.cards],
  };

  deck.cards.sort((a, b) => a.name.localeCompare(b.name));
  ui.viewCardsInContainer(deck);
}

document.getElementById("deck-me").addEventListener("click", async () => {
  await ShowDeckMe();
});
