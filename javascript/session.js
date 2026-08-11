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
  ? domain
  : isLocalhost
    ? "http://localhost:8081/"
    : domain;
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
  isconnectedtosession = false;
  warn_screen("Disconnected from the server");
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

    const header = document.createElement("div");
    header.textContent = getUiHtmlStrng("session_mode.header");
    Object.assign(header.style, {
      padding: "10px 16px",
      background: "#6f5830",
      color: "#f4e7c3",
      fontSize: "18px",
      fontWeight: "bold",
      textAlign: "center",
      borderBottom: "1px solid #4f3d22",
    });

    const content = document.createElement("div");
    Object.assign(content.style, {
      padding: "24px",
      textAlign: "center",
    });

    const text = document.createElement("div");
    text.textContent = getUiHtmlStrng("session_mode.text");
    Object.assign(text.style, {
      fontSize: "18px",
      marginBottom: "20px",
    });

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
        minWidth: "120px",
        padding: "8px 18px",
        background: "#7a5b2e",
        color: "#f6edd8",
        border: "1px solid #4f3d22",
        borderRadius: "4px",
        fontSize: "16px",
        fontWeight: "bold",
        cursor: "pointer",
      });

      btn.onmouseenter = () => (btn.style.background = "#9b7539");
      btn.onmouseleave = () => (btn.style.background = "#7a5b2e");

      return btn;
    }

    const create = makeButton(getUiHtmlStrng("session_mode.create"));
    const custom = makeButton(getUiHtmlStrng("session_mode.custom"));

    create.onclick = () => cleanup({ type: "create" });
    custom.onclick = () => cleanup({ type: "custom" });

    function cleanup(value) {
      document.body.removeChild(overlay);
      resolve(value);
    }

    buttons.append(create, custom);
    content.append(text, buttons);
    box.append(header, content);
    overlay.append(box);
    document.body.append(overlay);

    create.focus();
  });
}

function askForCustomConfig() {
  return new Promise((resolve) => {
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

    const box = document.createElement("div");
    Object.assign(box.style, {
      width: "500px",
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

    const header = document.createElement("div");
    header.textContent = getUiHtmlStrng("custom_server.header");
    Object.assign(header.style, {
      padding: "10px 16px",
      background: "#6f5830",
      color: "#f4e7c3",
      fontSize: "18px",
      fontWeight: "bold",
      textAlign: "center",
      borderBottom: "1px solid #4f3d22",
    });

    const content = document.createElement("div");
    Object.assign(content.style, {
      padding: "24px",
    });

    const input = document.createElement("textarea");
    input.placeholder = getUiHtmlStrng("custom_server.placeholder");
    Object.assign(input.style, {
      width: "100%",
      height: "150px",
      boxSizing: "border-box",
      padding: "10px",
      marginBottom: "20px",
      border: "1px solid #6f5830",
      borderRadius: "4px",
      background: "#f8f3e8",
      color: "#2d2418",
      resize: "vertical",
    });

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
      });

      btn.onmouseenter = () => (btn.style.background = "#9b7539");
      btn.onmouseleave = () => (btn.style.background = "#7a5b2e");

      return btn;
    }

    const start = makeButton(getUiHtmlStrng("custom_server.start"));
    const cancel = makeButton(getUiHtmlStrng("custom_server.cancel"));

    function cleanup(value) {
      document.body.removeChild(overlay);
      resolve(value);
    }

    start.onclick = () => {
      try {
        cleanup(JSON.parse(input.value || "{}"));
      } catch {
        warn_screen(getUiHtmlStrng("custom_server.invalid_json"));
      }
    };

    cancel.onclick = () => cleanup(null);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") cancel.click();
    });

    buttons.append(start, cancel);
    content.append(input, buttons);
    box.append(header, content);
    overlay.append(box);
    document.body.append(overlay);

    input.focus();
  });
}

function askForPlayerName() {
  return new Promise((resolve) => {
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

    const header = document.createElement("div");
    header.textContent = getUiHtmlStrng("player_name.header");
    Object.assign(header.style, {
      padding: "10px 16px",
      background: "#6f5830",
      color: "#f4e7c3",
      fontSize: "18px",
      fontWeight: "bold",
      textAlign: "center",
      borderBottom: "1px solid #4f3d22",
    });

    const content = document.createElement("div");
    Object.assign(content.style, {
      padding: "24px",
      textAlign: "center",
    });

    const label = document.createElement("div");
    label.textContent = getUiHtmlStrng("player_name.label");
    Object.assign(label.style, {
      fontSize: "18px",
      marginBottom: "16px",
    });

    const loginName = (() => {
      try {
        const value = JSON.parse(localStorage.saved_auth)?.login;
        if (typeof value !== "string") return "";
        return value.includes("@") ? value.split("@")[0] : value;
      } catch {
        return "";
      }
    })();

    const input = document.createElement("input");
    input.type = "text";
    input.value = loginName;
    input.placeholder = getUiHtmlStrng("player_name.placeholder");

    Object.assign(input.style, {
      width: "100%",
      boxSizing: "border-box",
      padding: "10px",
      marginBottom: "20px",
      border: "1px solid #6f5830",
      borderRadius: "4px",
      background: "#f8f3e8",
      color: "#2d2418",
      fontSize: "16px",
    });

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
      });

      btn.onmouseenter = () => (btn.style.background = "#9b7539");
      btn.onmouseleave = () => (btn.style.background = "#7a5b2e");

      return btn;
    }

    const ok = makeButton(getUiHtmlStrng("player_name.ok"));
    const cancel = makeButton(getUiHtmlStrng("player_name.cancel"));

    function cleanup(value) {
      document.body.removeChild(overlay);
      resolve(value);
    }

    ok.onclick = () => {
      const name = input.value.trim();
      if (!name) {
        warn_screen(getUiHtmlStrng("player_name.empty"));
        return;
      }
      cleanup(name);
    };

    cancel.onclick = () => cleanup("$$valexample$$");

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ok.click();
      if (e.key === "Escape") cancel.click();
    });

    buttons.append(ok, cancel);
    content.append(label, input, buttons);
    box.append(header, content);
    overlay.append(box);
    document.body.append(overlay);

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
    isconnectedtosession = false;
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
    isconnectedtosession = false;
    btnCancelElem.classList.add("hidden");
  }
  joinedSessionId = null;
  reset_custom();
  updateOpponentUI({
    name: getUiStrng("no_op_ui"),
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
    isconnectedtosession = false;
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
    isconnectedtosession = false;
    btnCancelElem.classList.add("hidden");
  }
  joinedSessionId = null;
  reset_custom();
  updateOpponentUI({
    name: getUiStrng("no_op_ui"),
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
  isconnectedtosession = false;
  btnCancelElem.classList.add("hidden");
  joinedSessionId = null;
  reset_custom();
  updateOpponentUI({
    name: getUiStrng("no_op_ui"),
    state:
      "img/icons/google_fonts__signal_disconnected_99dp_CCCCCC_FILL0_wght400_GRAD0_opsz48.png",
    status: "",
  });
}
// --------------------
// SOCKET MESSAGE HANDLING
// --------------------
function YourNameNOW() {
  try {
    updateOpponentUI({
      name: `${current_op.me_flag === null ? "" : "( "}${current_op.me_flag === null ? players.noflag : current_op.me_flag}${current_op.me_flag === null ? "" : " ) "}${players["op"]}`,
      state: `${current_op.me_flag === null ? op_icon_faction : `<svg width=\"32\" height=\"32\" xmlns=\"http:\/\/www.w3.org\/2000\/svg\">\r\n    <!-- Background image as base64 -->\r\n    <image href=\"${op_icon_faction}\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"none\"\/>\r\n    <!-- Remote image in bottom-right corner -->\r\n    <image x=\"17\" y=\"17\" width=\"15\" height=\"15\" href=\"${current_op.me_flag === null ? op_icon_faction : `https://flagsapi.com/${current_op.me_flag}/flat/64.png`}\"\/>\r\n<\/svg>`}`,
      status: `${getTranslation("ui.mmenu.status.ready")} ${opponentReady}`,
    });
  } catch (e) {}
  comp_and_send(
    socket,
    JSON.stringify({
      type: "YourNamePls",
    }),
  );
  if (
    players.me !== "$$valexample$$" &&
    players.me !== getTranslation("ui.elem.definesJS.players.me")
  ) {
    comp_and_send(
      socket,
      JSON.stringify({
        type: "MyName",
        is: players.me,
      }),
    );
  } else {
    comp_and_send(
      socket,
      JSON.stringify({
        type: "MyName",
        a: false,
      }),
    );
  }
}
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
      showTooltip(getUiStrng("session_made").replace("%s", createdSessionId));

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
      YourNameNOW();
      if (user_name === "ThatCoolUsername") {
        warn_screen(
          "That was an EXAMPLE username, and its not even that cool\n:(",
        );
      }
      console.log(user_name);
      if (!user_name && user_name !== "$$valexample$$") {
        console.log("No user name");
        players.me = "$$valexample$$";
      } else {
        players.me = user_name;
        console.log("User name set", players);
      }
      if (
        players.me !== "$$valexample$$" &&
        players.me !== getTranslation("ui.elem.definesJS.players.me")
      ) {
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
      showTooltip(getUiStrng("session_joined").replace("%s", data.id));
      YourNameNOW();
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
      YourNameNOW();
      if (user_name === "ThatCoolUsername") {
        warn_screen(
          "That was an EXAMPLE username, and its not even that cool\n:(",
        );
      }
      console.log(user_name);
      if (!user_name && user_name !== "$$valexample$$") {
        console.log("No user name");
        players.me = "$$valexample$$";
      } else {
        players.me = user_name;
        console.log("User name set", players);
      }
      if (
        players.me !== "$$valexample$$" &&
        players.me !== getTranslation("ui.elem.definesJS.players.me")
      ) {
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
      if (data?.a ?? true) {
        console.log("Nice to meet you ", data.is);
        if (data.is !== "$$valexample$$") {
          players.op = data.is;
        }
        await sleep(1200);
        updateOpponentUI({
          name: `${current_op.me_flag === null ? "" : "( "}${current_op.me_flag === null ? players.noflag : current_op.me_flag}${current_op.me_flag === null ? "" : " ) "}${players["op"]}`,
          state: `${current_op.me_flag === null ? op_icon_faction : `<svg width=\"32\" height=\"32\" xmlns=\"http:\/\/www.w3.org\/2000\/svg\">\r\n    <!-- Background image as base64 -->\r\n    <image href=\"${op_icon_faction}\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"none\"\/>\r\n    <!-- Remote image in bottom-right corner -->\r\n    <image x=\"17\" y=\"17\" width=\"15\" height=\"15\" href=\"${current_op.me_flag === null ? op_icon_faction : `https://flagsapi.com/${current_op.me_flag}/flat/64.png`}\"\/>\r\n<\/svg>`}`,
          status: `${getTranslation("ui.mmenu.status.ready")} ${opponentReady}`,
        });
      } else {
        await sleep(1200);
        updateOpponentUI({
          name: `${current_op.me_flag === null ? "" : "( "}${current_op.me_flag === null ? players.noflag : current_op.me_flag}${current_op.me_flag === null ? "" : " ) "}${players["op"]}`,
          state: `${current_op.me_flag === null ? op_icon_faction : `<svg width=\"32\" height=\"32\" xmlns=\"http:\/\/www.w3.org\/2000\/svg\">\r\n    <!-- Background image as base64 -->\r\n    <image href=\"${op_icon_faction}\" x=\"0\" y=\"0\" width=\"32\" height=\"32\" preserveAspectRatio=\"none\"\/>\r\n    <!-- Remote image in bottom-right corner -->\r\n    <image x=\"17\" y=\"17\" width=\"15\" height=\"15\" href=\"${current_op.me_flag === null ? op_icon_faction : `https://flagsapi.com/${current_op.me_flag}/flat/64.png`}\"\/>\r\n<\/svg>`}`,
          status: `${getTranslation("ui.mmenu.status.ready")} ${opponentReady}`,
        });
      }
      break;
    case "leaveSession":
      cancelSession();
      reset_custom();
      disableChat();
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
    elem
      .requestFullscreen()
      .then(() => console.log("[FS] Success"))
      .catch((err) => {
        console.error("[FS] Failed:", err.name, err.message);
      });
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

  const nameEl = document.getElementById("opponent-name");
  const img = box.querySelector("img");
  const statusEl = box.querySelector("span");

  if (!nameEl || !img || !statusEl) return;

  // reset state
  box.classList.add("hidden");

  // always clean previous dynamic SVG/text node safely
  const oldStateNode = box.querySelector(".opponent-state");
  if (oldStateNode) oldStateNode.remove();

  // NO DATA STATE
  if (!data) {
    nameEl.textContent = getUiStrng("no_op_ui");
    img.src =
      "img/icons/google_fonts__signal_disconnected_99dp_CCCCCC_FILL0_wght400_GRAD0_opsz48.png";
    statusEl.textContent = "";

    box.classList.add("disabled");
    box.classList.remove("hidden");
    return;
  }

  // ACTIVE STATE
  box.classList.remove("hidden", "disabled");

  nameEl.textContent = data.name || "Opponent";
  statusEl.textContent = data.status || "";

  const state2 = data.state;

  // detect inline SVG
  if (typeof state2 === "string" && state2.trim().startsWith("<svg")) {
    // remove image src safely
    img.removeAttribute("src");

    const p = document.createElement("p");
    p.className = "opponent-state";
    p.innerHTML = state2;

    img.insertAdjacentElement("afterend", p);
  } else {
    // normal image URL
    img.src = state2 || "";
  }
}

async function JoinMatch(id) {
  window.location.hash = `lang=${lang}`;
  var res = await warn_screen(`Join Game ${id}?`, "confirm"); // chnage later

  if (!getTranslation("_info.translated")) {
    {
      var transwarnshow = localStorage.getItem(
        btoa(`${getTranslation("_info.id")}_is_translated_warning`),
      );
      if (!transwarnshow) {
        transwarnshow = 0;
      }
      if (Clock.now() > transwarnshow) {
        show_translation_warn();
        localStorage.setItem(
          btoa(`${getTranslation("_info.id")}_is_translated_warning`),
          Clock.now() + 1000 * 60 * 60 * 24 * 27,
        );
      }
    }
  }
  if (res) {
    comp_and_send(
      socket,
      JSON.stringify({
        type: "joinSession",
        sessionId: id,
      }),
    );
  }
}
