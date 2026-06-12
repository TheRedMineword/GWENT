const noServerWarningElement = document.getElementById("no-server");

// Buttons (new menu)
const btnCreateElem = document.getElementById("create-game");
const btnJoinElem = document.getElementById("join-game");
const btnReadyElem = document.getElementById("session-start-control");
const btnCancelElem = document.getElementById("cancel-game");

// Session display
// const sessionDisplay = document.getElementById("session-display");
const sessionCodeText = document.getElementById("session-code-text");

// Initial state
btnCreateElem.classList.add("disabled");
btnJoinElem.classList.add("disabled");
btnReadyElem.classList.add("hidden");
btnCancelElem.classList.add("hidden");
// sessionDisplay.classList.add("hidden");

// Session state
let createdSessionId = null;
let joinedSessionId = null;
let ThisSessionId = null;

// --------------------
// SOCKET EVENTS
// --------------------
const custom_url = isElectronLauncher
  ? "https://drmineword-gwent.onrender.com/"
  : isLocalhost
    ? "http://localhost:8081/"
    : "https://drmineword-gwent.onrender.com/";
socket.onopen = () => {
  console.log("Connected to the server");

  noServerWarningElement.classList.add("hidden");

  btnCreateElem.classList.remove("disabled");
  btnJoinElem.classList.remove("disabled");
};

socket.onclose = () => {
  console.log("Disconnected from the server");

  noServerWarningElement.classList.remove("hidden");

  btnCreateElem.classList.add("disabled");
  btnJoinElem.classList.add("disabled");

  document.getElementById("session-start-control").classList.add("hidden");
  btnCancelElem.classList.add("hidden");
  // sessionDisplay.classList.add("hidden");

  createdSessionId = null;
  joinedSessionId = null;
  ThisSessionId = null;
  alert("Disconnected from the server");
  showBrickScreen();
};

// --------------------
// BUTTON ACTIONS
// --------------------
btnCreateElem.addEventListener("click", createGame);
btnCancelElem.addEventListener("click", cancelSession);

// NOTE: join button is handled in your main script via prompt()
// so we DO NOT attach another listener here

// --------------------
// FUNCTIONS
// --------------------

function askForSessionMode() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";

    const box = document.createElement("div");
    box.style.background = "white";
    box.style.padding = "20px";
    box.style.borderRadius = "10px";
    box.style.minWidth = "260px";
    box.style.textAlign = "center";

    //    const title = document.createElement("div");
    //   title.textContent = "Choose session type";

    //    title.style.margin = "0 0 15px 0";
    //   title.style.color = "#111";
    //    title.style.fontSize = "24px";
    //    title.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    //    title.style.fontWeight = "600";
    //    title.style.textAlign = "center";
    //    title.style.letterSpacing = "0.3px";

    const createBtn = document.createElement("button");
    createBtn.textContent = "Create Server";
    createBtn.style.marginRight = "10px";

    const customBtn = document.createElement("button");
    customBtn.textContent = "Custom Server";

    function cleanup(value) {
      document.body.removeChild(overlay);
      resolve(value);
    }

    createBtn.onclick = () => cleanup({ type: "create" });
    customBtn.onclick = () => cleanup({ type: "custom" });

    //    box.appendChild(title);
    box.appendChild(createBtn);
    box.appendChild(customBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}
function askForCustomConfig() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";

    const box = document.createElement("div");
    box.style.background = "white";
    box.style.padding = "20px";
    box.style.borderRadius = "10px";
    box.style.minWidth = "300px";

    const input = document.createElement("textarea");
    input.placeholder = "Enter JSON config...";
    input.style.width = "100%";
    input.style.height = "120px";
    input.style.marginBottom = "10px";

    const ok = document.createElement("button");
    ok.textContent = "Start";

    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.style.marginLeft = "10px";

    function cleanup(value) {
      document.body.removeChild(overlay);
      resolve(value);
    }

    ok.onclick = () => {
      try {
        const parsed = JSON.parse(input.value || "{}");
        cleanup(parsed);
      } catch (e) {
        alert("Invalid JSON");
      }
    };

    cancel.onclick = () => cleanup(null);

    box.appendChild(input);
    box.appendChild(ok);
    box.appendChild(cancel);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    input.focus();
  });
}
async function createGame() {
  btnCreateElem.classList.add("hidden");
  btnJoinElem.classList.add("hidden");

  document.getElementById("session-start-control").classList.remove("hidden");
  document.getElementById("session-start-control").classList.add("disabled");

  btnCancelElem.classList.remove("hidden");

  const mode = await askForSessionMode();

  if (!mode) return;

  if (mode.type === "create") {
    tocar("tf2/Trade_ready", false);
    comp_and_send(
      socket,
      JSON.stringify({
        type: "createSession",
        custom_server: { active: false },
      }),
    );
    isconnectedtosession = true;
  }

  if (mode.type === "custom") {
    const conf = await askForCustomConfig();
    if (!conf) {
      cancelSession();
      return;
    }

    comp_and_send(
      socket,
      JSON.stringify({
        type: "createSession",
        custom_server: {
          active: true,
          conf,
        },
      }),
    );
    isconnectedtosession = true;
  }
}
function askForPlayerName() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.5)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";

    const box = document.createElement("div");
    box.style.background = "white";
    box.style.padding = "20px";
    box.style.borderRadius = "10px";
    box.style.minWidth = "300px";
    box.style.textAlign = "center";

    const title = document.createElement("h3");
    title.textContent = "Enter Your Name (Optional)";

    const style = document.createElement("style");
    title.style.margin = "0 0 15px 0";
    title.style.color = "#111";
    title.style.fontSize = "20px";
    // title.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    title.style.fontWeight = "600";
    title.style.textAlign = "center";
    title.style.letterSpacing = "0.3px";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "(Example: ThatCoolUsername)";
    input.style.width = "100%";
    input.style.marginTop = "10px";
    input.style.marginBottom = "15px";
    input.style.padding = "8px";

    const joinBtn = document.createElement("button");
    joinBtn.textContent = "Join";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.marginLeft = "10px";

    function cleanup(value) {
      document.body.removeChild(overlay);
      resolve(value);
    }

    joinBtn.onclick = () => {
      const name = input.value.trim();
      if (!name) {
        alert("Please enter a name");
        return;
      }
      cleanup(name);
    };

    cancelBtn.onclick = () => cleanup(null);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") joinBtn.click();
    });

    box.appendChild(title);
    box.appendChild(input);
    box.appendChild(joinBtn);
    box.appendChild(cancelBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    input.focus();
  });
}

function cancelSession() {
  players.op = "Opponent";
  if (isconnectedtosession) {
    tocar("tf2/Trade_failure", false);
  }
  isconnectedtosession = false;
  document.getElementById("session-start-control").classList.add("hidden");

  btnCreateElem.classList.remove("hidden");
  btnJoinElem.classList.remove("hidden");

  btnCancelElem.classList.add("hidden");
  // sessionDisplay.classList.add("hidden");

  if (createdSessionId) {
    amReady = false;
    opponentReady = false;
    console.log("Cancelled Session:", createdSessionId);
    comp_and_send(
      socket,
      JSON.stringify({
        type: "cancelSession",
        code: ThisSessionId,
      }),
    );
    createdSessionId = null;
    ThisSessionId = null;
  } else if (joinedSessionId) {
    console.log("Left Session:", joinedSessionId);
    comp_and_send(
      socket,
      JSON.stringify({
        type: "leaveSession",
        code: ThisSessionId,
      }),
    );
    joinedSessionId = null;
    ThisSessionId = null;
    btnCancelElem.classList.add("hidden");
  }
  joinedSessionId = null;
  reset_custom();
  updateOpponentUI({
    name: "No Opponent",
    state:
      "img/icons/google_fonts__signal_disconnected_99dp_CCCCCC_FILL0_wght400_GRAD0_opsz48.png",
    status: "",
  });
}
function silent_cancelSession() {
  players.op = "Opponent";
  amReady = false;
  opponentReady = false;
  if (isconnectedtosession) {
    tocar("tf2/Trade_failure", false);
  }
  isconnectedtosession = false;
  document.getElementById("session-start-control").classList.add("hidden");

  btnCreateElem.classList.remove("hidden");
  btnJoinElem.classList.remove("hidden");

  btnCancelElem.classList.add("hidden");
  // sessionDisplay.classList.add("hidden");

  if (createdSessionId) {
    console.log("Cancelled Session:", createdSessionId);
    comp_and_send(
      socket,
      JSON.stringify({
        type: "cancelSession",
        code: ThisSessionId,
        silent: true,
      }),
    );
    createdSessionId = null;
    ThisSessionId = null;
  } else if (joinedSessionId) {
    console.log("Left Session:", joinedSessionId);
    comp_and_send(
      socket,
      JSON.stringify({
        type: "leaveSession",
        code: ThisSessionId,
        silent: true,
      }),
    );
    joinedSessionId = null;
    ThisSessionId = null;
    btnCancelElem.classList.add("hidden");
  }
  joinedSessionId = null;
  reset_custom();
  updateOpponentUI({
    name: "No Opponent",
    state:
      "img/icons/google_fonts__signal_disconnected_99dp_CCCCCC_FILL0_wght400_GRAD0_opsz48.png",
    status: "",
  });
}
function reset_menu() {
  amReady = false;
  opponentReady = false;
  document.getElementById("session-start-control").classList.add("hidden");

  btnCreateElem.classList.remove("hidden");
  btnJoinElem.classList.remove("hidden");

  btnCancelElem.classList.add("hidden");
  // sessionDisplay.classList.add("hidden");
  createdSessionId = null;
  ThisSessionId = null;
  btnCancelElem.classList.add("hidden");
  joinedSessionId = null;
  reset_custom();
  updateOpponentUI({
    name: "No Opponent",
    state:
      "img/icons/google_fonts__signal_disconnected_99dp_CCCCCC_FILL0_wght400_GRAD0_opsz48.png",
    status: "",
  });
}
// --------------------
// SOCKET MESSAGE HANDLING
// --------------------
socket.addEventListener("message", async (event) => {
  const data_dec = null;
  try {
    let data_dec = await recv_and_decomp(event);

    if (!data_dec) return;
  } catch (err) {
    console.error(err);
  }
  const data = await recv_and_decomp(event);
  console.log("Session.js on msg", data);
  switch (data.type) {
    case "sessionCreated":
      createdSessionId = data.code;
      showTooltip(`Created Session join code: ${createdSessionId}`);

      //    sessionDisplay.classList.remove("hidden");
      // sessionCodeText.textContent = createdSessionId;

      console.log("Session created:", data.id, "\nCode:", createdSessionId);

      ThisSessionId = data.id;
      console.log(`[SD] Session joined data ${data.code}/${data.id}`);
      var decodedsession = await decompressBase64(data.id);
      console.log(`[SD] Session joined data raw: ${decodedsession}`);
      if (data.custom === true) {
        await connect_to_custom_server(
          `${custom_url}api/custom_sync?session=${encodeURIComponent(ThisSessionId)}`,
        );
      }
      var user_name = await askForPlayerName();
      if (user_name === "ThatCoolUsername") {
        alert("That was an EXAMPLE username, and its not even that cool\n:(");
      }
      console.log(user_name);
      if (!user_name) {
        console.log("No user name");
        players.me = "You";
      } else {
        players.me = user_name;
        console.log("User name set", players);
      }
      if (players.me !== "You") {
        comp_and_send(
          socket,
          JSON.stringify({
            type: "MyName",
            is: players.me,
          }),
        );
      }
      break;

    case "sessionJoined":
      console.log("Session.js", data.code);
      joinedSessionId = data.code;
      ThisSessionId = data.id;
      isconnectedtosession = true;
      showTooltip(`Joined session: ${data.id}`);
      if (data.custom === true) {
        await connect_to_custom_server(
          `${custom_url}api/custom_sync?session=${encodeURIComponent(ThisSessionId)}`,
        );
      }
      //     sessionDisplay.classList.remove("hidden");
      //    sessionCodeText.textContent = joinedSessionId;

      document
        .getElementById("session-start-control")
        .classList.remove("hidden");
      // hide if joined
      btnCreateElem.classList.add("hidden");
      btnJoinElem.classList.add("hidden");

      console.log("Joined session:", joinedSessionId);
      console.log(`[SD] Session joined data ${data.code}/${data.id}`);
      var decodedsession = await decompressBase64(data.id);
      console.log(`[SD] Session joined data raw: ${decodedsession}`);
      var user_name = await askForPlayerName();
      if (user_name === "ThatCoolUsername") {
        alert("That was an EXAMPLE username, and its not even that cool\n:(");
      }
      console.log(user_name);
      if (!user_name) {
        console.log("No user name");
        players.me = "You";
      } else {
        players.me = user_name;
        console.log("User name set", players);
      }
      if (players.me !== "You") {
        comp_and_send(
          socket,
          JSON.stringify({
            type: "MyName",
            is: players.me,
          }),
        );
      }
      break;
    case "chat":
      addMessage("op", data.message);
      break;

    case "moderation":
      addMessage("system", data.message);
      break;
    case "MyName":
      console.log("Nice to meet you ", data.is);
      players.op = data.is;
      await sleep(1200);
      updateOpponentUI({
        name: players["op"],
        state: `${current_op.me_flag === null ? op_icon_faction : `<svg width=\"32\" height=\"32\" xmlns=\"http:\/\/www.w3.org\/2000\/svg\">\r\n    <!-- Background image as base64 -->\r\n    <image href=\"${op_icon_faction}\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"none\"\/>\r\n    <!-- Remote image in bottom-right corner -->\r\n    <image x=\"17\" y=\"17\" width=\"15\" height=\"15\" href=\"${current_op.me_flag === null ? op_icon_faction : `https://flagsapi.com/${current_op.me_flag}/flat/64.png`}\"\/>\r\n<\/svg>`}`,
        status: `Ready: ${opponentReady}`,
      });
      break;
  }
});

function isLocalhost_session() {
  const host = window.location.hostname;

  const port = window.location.port;

  const localhost = host === "localhost" || host === "127.0.0.1";

  const electronLauncher = localhost && port === "1111";

  return localhost && !electronLauncher;
}

function openFullscreen() {
  const elem = document.documentElement;
  const local = isLocalhost_session();

  console.log("[FS] Attempting fullscreen");
  console.log("[FS] Element:", elem);
  console.log("[FS] Hostname:", window.location.hostname);
  console.log("[FS] Is localhost:", local);

  const allowed = local ? fullscreenConfig.localhost : fullscreenConfig.else;

  console.log("[FS] Fullscreen allowed:", allowed);

  if (!allowed) {
    console.warn("[FS] Fullscreen blocked by config");
    return;
  }

  if (elem.requestFullscreen) {
    console.log("[FS] Using standard requestFullscreen()");
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) {
    console.log("[FS] Using webkitRequestFullscreen()");
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) {
    console.log("[FS] Using msRequestFullscreen()");
    elem.msRequestFullscreen();
  } else {
    console.error("[FS] Fullscreen API not supported");
  }
}

let op_icon_faction =
  "img/icons/google_fonts__signal_disconnected_99dp_CCCCCC_FILL0_wght400_GRAD0_opsz48.png";
function updateOpponentUI(data) {
  console.log("[OP UPDATE MENU]", data);
  const box = document.getElementById("opponent-ready");
  if (!box) return;

  const label = document.getElementById("opponent-name");
  const img = box.querySelector("img");
  const span = box.querySelector("span");

  if (!label || !img || !span) return;

  // reset state
  box.classList.add("hidden");

  if (!data) {
    label.textContent = "No Opponent";
    img.src =
      "img/icons/google_fonts__signal_disconnected_99dp_CCCCCC_FILL0_wght400_GRAD0_opsz48.png";
    span.textContent = "";

    box.classList.add("disabled");
    box.classList.remove("hidden");
    return;
  }

  box.classList.remove("hidden", "disabled");

  label.textContent = data.name || "Opponent";

  span.textContent = data.status; //Readys

  // img.src = data.state;
  var state2 = data.state;
  const container = document.getElementById("opponent-ready");

  const p = container.querySelector("p");
  if (p) {
    p.remove();
  }
  // detect svg string
  if (typeof state2 === "string" && state2.trim().startsWith("<svg")) {
    // not an image URL → treat as inline SVG/text
    img.removeAttribute("src");

    const p = document.createElement("p");
    p.innerHTML = state2;

    img.insertAdjacentElement("afterend", p);
    img._fallbackNode = p;
  } else {
    // normal image (can be /img/src/a.png or full URL)
    img.src = state2;
  }
}
