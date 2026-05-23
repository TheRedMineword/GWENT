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
const custom_url =
    isElectronLauncher
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
  showBrickScreen()
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

        const title = document.createElement("div");
        title.textContent = "Choose session type";
        title.style.marginBottom = "15px";
        title.style.fontWeight = "bold";

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

        box.appendChild(title);
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
        comp_and_send(socket, JSON.stringify({ type: "createSession", custom_server: { active: false}}));
    }

    if (mode.type === "custom") {
        const conf = await askForCustomConfig();
        if (!conf){
          cancelSession();
          return;
        }

        comp_and_send(socket, JSON.stringify({
            type: "createSession",
            custom_server: {
                active: true,
                conf
            }
        }));
    }
}

function cancelSession() {
  tocar("tf2/Trade_failure", false);
  document.getElementById("session-start-control").classList.add("hidden");

  btnCreateElem.classList.remove("hidden");
  btnJoinElem.classList.remove("hidden");

  btnCancelElem.classList.add("hidden");
 // sessionDisplay.classList.add("hidden");

  if (createdSessionId) {
    console.log("Cancelled Session:", createdSessionId);
    comp_and_send(socket, JSON.stringify({
      type: "cancelSession",
      code: ThisSessionId
    }));
    createdSessionId = null;
    ThisSessionId = null;
  } else if (joinedSessionId) {
    console.log("Left Session:", joinedSessionId);
    comp_and_send(socket, JSON.stringify({
      type: "leaveSession",
      code: ThisSessionId
    }));
    joinedSessionId = null;
    ThisSessionId = null;
    btnCancelElem.classList.add("hidden");
  }
  joinedSessionId = null;
 // reset_custom();
}
function silent_cancelSession() {
  tocar("tf2/Trade_failure", false);
  document.getElementById("session-start-control").classList.add("hidden");

  btnCreateElem.classList.remove("hidden");
  btnJoinElem.classList.remove("hidden");

  btnCancelElem.classList.add("hidden");
 // sessionDisplay.classList.add("hidden");

  if (createdSessionId) {
    console.log("Cancelled Session:", createdSessionId);
    comp_and_send(socket, JSON.stringify({
      type: "cancelSession",
      code: ThisSessionId,
      silent: true
    }));
    createdSessionId = null;
    ThisSessionId = null;
  } else if (joinedSessionId) {
    console.log("Left Session:", joinedSessionId);
    comp_and_send(socket, JSON.stringify({
      type: "leaveSession",
      code: ThisSessionId,
      silent: true
    }));
    joinedSessionId = null;
    ThisSessionId = null;
    btnCancelElem.classList.add("hidden");
  }
  joinedSessionId = null;
 // reset_custom();
}
function reset_menu() {
  document.getElementById("session-start-control").classList.add("hidden");

  btnCreateElem.classList.remove("hidden");
  btnJoinElem.classList.remove("hidden");

  btnCancelElem.classList.add("hidden");
 // sessionDisplay.classList.add("hidden");
    createdSessionId = null;
    ThisSessionId = null;
    btnCancelElem.classList.add("hidden");
  joinedSessionId = null;
 // reset_custom();
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
    console.log("Session.js on msg", data)
  switch (data.type) {
    case "sessionCreated":
      createdSessionId = data.code;
      showTooltip(`Created Session join code: ${createdSessionId}`);

  //    sessionDisplay.classList.remove("hidden");
     // sessionCodeText.textContent = createdSessionId;

      console.log("Session created:", data.id, "\nCode:", createdSessionId);
      
      ThisSessionId = data.id;
      console.log(`[SD] Session joined data ${data.code}/${data.id}`); var decodedsession = await decompressBase64(data.id);  console.log(`[SD] Session joined data raw: ${decodedsession}`);
      if (data.custom === true){
        connect_to_custom_server(`${custom_url}api/custom_sync?session=${encodeURIComponent(ThisSessionId)}`);
      }
      break;

    case "sessionJoined":
      console.log("Session.js", data.code);
      joinedSessionId = data.code;
      ThisSessionId = data.id;
      showTooltip(`Joined session: ${data.id}`);
      if (data.custom === true){
        connect_to_custom_server(`${custom_url}api/custom_sync?session=${encodeURIComponent(ThisSessionId)}`);
      }
 //     sessionDisplay.classList.remove("hidden");
  //    sessionCodeText.textContent = joinedSessionId;

      document.getElementById("session-start-control").classList.remove("hidden");
    // hide if joined
    btnCreateElem.classList.add("hidden");
		btnJoinElem.classList.add("hidden");



      console.log("Joined session:", joinedSessionId);
      console.log(`[SD] Session joined data ${data.code}/${data.id}`); var decodedsession = await decompressBase64(data.id);  console.log(`[SD] Session joined data raw: ${decodedsession}`);
      break;
      case "chat":
    addMessage("op", data.message);
      break;

    case "moderation":
    addMessage("system", data.message);
    break;
    
  }
});


function isLocalhost_session() {

    const host =
        window.location.hostname;

    const port =
        window.location.port;

    const localhost =
        host === "localhost" ||
        host === "127.0.0.1";

    const electronLauncher =
        localhost &&
        port === "1111";

    return (
        localhost &&
        !electronLauncher
    );
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


let op_icon_faction = "img/icons/google_fonts__signal_disconnected_99dp_CCCCCC_FILL0_wght400_GRAD0_opsz48.png";
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
    img.src = "img/icons/google_fonts__signal_disconnected_99dp_CCCCCC_FILL0_wght400_GRAD0_opsz48.png";
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