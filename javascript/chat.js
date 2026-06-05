"use strict";

// const { json } = require("express");
const chatBtn2 = document.getElementById("chat-toggle");
const menuBtn2 = document.getElementById("top-menu-btn");

const overlay2 = document.getElementById("chat-overlay");
const closeBtn2 = document.getElementById("chat-close");

const input2 = document.getElementById("chat-input");
const sendBtn2 = document.getElementById("chat-send");

const log = document.getElementById("chat-log");
const message_recived_sound = true;

let chat_dis = 0;
document.getElementById("chat-toggle").disabled = true;
let unreadCount = 0;
let fullcahturl = null;
const isLocalhost_chat =
  host.startsWith("localhost") ||
  host.startsWith("127.0.0.1") ||
  host.startsWith("[::1]");

const isElectronLauncher_chat = isLocalhost_chat && location.port === "1111";

const api_url_msg = isElectronLauncher_chat
  ? "drmineword-gwent.onrender.com"
  : isLocalhost_chat
    ? "localhost:8081"
    : "drmineword-gwent.onrender.com";
const api_url_msg_mode = isElectronLauncher_chat
  ? "aHR0cHM="
  : isLocalhost_chat
    ? "aHR0cA=="
    : "aHR0cHM=";
console.log("[CHAT], api url:", api_url_msg);
chatBtn2.onclick = () => {
  overlay2.classList.toggle("hidden");

  if (!overlay2.classList.contains("hidden")) {
    clearUnread();
  }
};

closeBtn2.onclick = () => {
  overlay2.classList.add("hidden");
};

sendBtn2.onclick = sendChatMessage;

input2.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendChatMessage();
  }
});

fullcahturl = `${atob(api_url_msg_mode)}://${api_url_msg}/api/message`;
console.log(
  "[CHAT]",
  ` ${fullcahturl}`,
  ` ${atob(api_url_msg_mode)}://${api_url_msg}/api/message`,
);

async function sendChatMessage() {
  if (!isconnectedtosession) return;
  const text = input2.value.trim();
  if (!text) return;
  if (!current_op) {
    alert("Cant send messsage while in empty session");
    return;
  }

  try {
    const res = await fetch(
      `${atob(api_url_msg_mode)}://${api_url_msg}/api/message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: ThisSessionId,
          player_id: current_op.me_id,
          type: "chat",
          message: text,
        }),
      },
    );

    // Try to parse response (even for errors)
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("Message send failed:", res.status, data);

      alert(
        "Send failed:\n" +
          JSON.stringify(
            {
              status: res.status,
              response: data,
            },
            null,
            2,
          ),
      );

      return;
    }
    console.log(`[CHAT] response, ${JSON.stringify(data)}`);
    addMessage("me", data?.sent.message);
    input2.value = "";
  } catch (err) {
    console.error("Network error:", err);

    alert(
      "Network error:\n" +
        JSON.stringify(
          {
            message: err?.message,
            stack: err?.stack,
          },
          null,
          2,
        ),
    );
  }
}

async function sendChatMessageStrig(atext) {
  if (!isconnectedtosession) return;
  const text = atext;
  if (!text) return;
  if (!current_op) {
    // alert("Cant send messsage while in empty session");
    return;
  }

  try {
    const res = await fetch(
      `${atob(api_url_msg_mode)}://${api_url_msg}/api/message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: ThisSessionId,
          player_id: current_op.me_id,
          type: "chat",
          message: text,
        }),
      },
    );

    // Try to parse response (even for errors)
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("Message send failed:", res.status, data);

      alert(
        "Send failed:\n" +
          JSON.stringify(
            {
              status: res.status,
              response: data,
            },
            null,
            2,
          ),
      );

      return;
    }
    console.log(`[CHAT] response, ${JSON.stringify(data)}`);
    addMessage("me", data?.sent.message);
    input2.value = "";
  } catch (err) {
    console.error("Network error:", err);

    alert(
      "Network error:\n" +
        JSON.stringify(
          {
            message: err?.message,
            stack: err?.stack,
          },
          null,
          2,
        ),
    );
  }
}

function addMessage(type, text) {
  console.log("[CHAT] NEW MESSAGE", type, text);
  let parse_type = type;
  const div = document.createElement("div");

  div.className = `chat-line chat-${type}`;
  if (parse_type === "me") {
    parse_type = players.me;
  } else if (parse_type === "op") {
    parse_type = players.op;
    if (message_recived_sound) {
      tocar("tf2/msg/Chat_display_text", false);
    }
  } else if (parse_type === "system") {
    parse_type = players.sys;
    if (message_recived_sound) {
      // tocar("tf2/msg/Chat_display_text", false); // no sound effect for system so players can focus
    }
  }
  div.textContent = `${parse_type}: ${text}`;

  log.appendChild(div);

  log.scrollTop = log.scrollHeight;

  if (overlay2.classList.contains("hidden")) {
    setUnread();
  }
}

function setUnread() {
  unreadCount++;

  menuBtn2.classList.add("chat-alert");
  menuBtn2.textContent = `(${unreadCount}!)☰`;

  chatBtn2.textContent = `Chat (${unreadCount}!)`;
}

function clearUnread() {
  unreadCount = 0;

  menuBtn2.classList.remove("chat-alert");
  menuBtn2.textContent = `☰`;

  chatBtn2.textContent = "Chat";
}

function disableChat() {
  if (chat_dis === 0) {
    chat_dis = 1;
    document.getElementById("chat-toggle").disabled = false;
  } else {
    chat_dis = 0;
    overlay2.classList.add("hidden");
    document.getElementById("chat-toggle").disabled = true;
    clearUnread();
  }
}
console.log("[CHAT] Chat loaded");
