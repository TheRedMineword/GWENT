const noServerWarningElement = document.getElementById("no-server");

// Buttons (new menu)
const btnCreateElem = document.getElementById("create-game");
const btnJoinElem = document.getElementById("join-game");
const btnReadyElem = document.getElementById("session-start-control");
const btnCancelElem = document.getElementById("cancel-game");

// Session display
const sessionDisplay = document.getElementById("session-display");
const sessionCodeText = document.getElementById("session-code-text");

// Initial state
btnCreateElem.classList.add("disabled");
btnJoinElem.classList.add("disabled");
btnReadyElem.classList.add("hidden");
btnCancelElem.classList.add("hidden");
sessionDisplay.classList.add("hidden");

// Session state
let createdSessionId = null;
let joinedSessionId = null;

// --------------------
// SOCKET EVENTS
// --------------------
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

  btnReadyElem.classList.add("hidden");
  btnCancelElem.classList.add("hidden");
  sessionDisplay.classList.add("hidden");

  createdSessionId = null;
  joinedSessionId = null;
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
function createGame() {
  btnCreateElem.classList.add("hidden");
  btnJoinElem.classList.add("hidden");

  btnReadyElem.classList.remove("hidden");
  btnReadyElem.classList.add("disabled");

  btnCancelElem.classList.remove("hidden");

  comp_and_send(socket, JSON.stringify({ type: "createSession" }));
}

function cancelSession() {
  btnReadyElem.classList.add("hidden");

  btnCreateElem.classList.remove("hidden");
  btnJoinElem.classList.remove("hidden");

  btnCancelElem.classList.add("hidden");
  sessionDisplay.classList.add("hidden");

  if (createdSessionId) {
    console.log("Cancelled Session:", createdSessionId);
    comp_and_send(socket, JSON.stringify({
      type: "cancelSession",
      code: createdSessionId
    }));
    createdSessionId = null;
  } else if (joinedSessionId) {
    console.log("Left Session:", joinedSessionId);
    comp_and_send(socket, JSON.stringify({
      type: "leaveSession",
      code: joinedSessionId
    }));
    joinedSessionId = null;
  }
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
  const data = recv_and_decomp; //.data;

  switch (data.type) {
    case "sessionCreated":
      createdSessionId = data.code;

      sessionDisplay.classList.remove("hidden");
      sessionCodeText.textContent = createdSessionId;

      console.log("Session created:", createdSessionId);
      break;

    case "sessionJoined":
      joinedSessionId = data.code;

      sessionDisplay.classList.remove("hidden");
      sessionCodeText.textContent = joinedSessionId;

      btnReadyElem.classList.remove("hidden");

      console.log("Joined session:", joinedSessionId);
      break;

    case "sessionInvalid":
      alert("Invalid session ID");
      break;
  }
});