const IGNORED_ERRORS = [
  {
    type: "Promise",
    message:
      /Cannot read properties of null \(reading 'reset'\)[\s\S]*at Game\.reset/,
  },
  {
    type: "Promise",
    message:
      /Cannot read properties of undefined \(reading 'passed'\)[\s\S]*at Player\.enableLeader/,
  },
];

let error_strings = {
  title: "Game Error",
  default:
    "An unexpected error occurred, and the game may not be working correctly. You can send a report to help us fix the issue.",
  JavaScript:
    "An error occurred in the game code. We recommend reloading the page. Please send a report to help us fix the issue.",
  Promise:
    "A background operation failed. The game may become unstable. Please send a report to help us fix the issue.",
  // Used by fatal(e) when no custom message is given
  Fatal:
    "A critical error occurred and the game cannot continue properly. Please send a report to help us fix the issue.",
  ask: "Would you like to send an error report? A screenshot, logs, and player data will be included.",
  btn_send: "Send Report",
  btn_reload: "Reload",
  btn_close: "Close",
  sending_title: "Sending Report",
  steps: {
    screenshot: "Taking Screenshot",
    logs: "Reading Logs",
    connect: "Connecting to Server",
    send: "Sending Report",
    response: "Server Response",
  },
  done: "Report sent. Thank you!",
  failed: "Failed to send raport: ",
};
try {
  error_strings = deepClone(getTranslation("ui_error_strings"));
  console.log("error strings is now:", error_strings);
} catch (e) {
  // console.error("error strings", e)
}

const MAX_LOGS = 300;
const MAX_LOG_LEN = 2000;
const MAX_STORE_CHARS = 200000;
const LOGS_KEY = "game_logs";
const ERRORS_KEY = "game_errors";

// ---------------------------------------------------------------------------
// CORE
// ---------------------------------------------------------------------------
(function () {
  "use strict";

  // keep originals so our own output never recurses into the wrappers
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  const safeStr = (v) => {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.stack || v.message;
    try {
      return JSON.stringify(v);
    } catch (_) {
      return String(v);
    }
  };

  const isIgnored = (type, message) =>
    IGNORED_ERRORS.some(
      (r) =>
        (!r.type || r.type === type) &&
        (r.message instanceof RegExp
          ? r.message.test(message)
          : message.includes(r.message)),
    );

  // ---- console log saver ([log] [warn] [error]) ---------------------------
  // sessionStorage, wiped on every start so it can never grow forever
  const store = (() => {
    try {
      return window.sessionStorage;
    } catch (_) {
      return null;
    }
  })();
  try {
    store?.removeItem(LOGS_KEY);
    store?.removeItem(ERRORS_KEY);
  } catch (_) {}
  // drop leftovers from the old localStorage version
  try {
    localStorage.removeItem(LOGS_KEY);
    localStorage.removeItem(ERRORS_KEY);
  } catch (_) {}

  let logBuffer = [];

  // write to storage; on quota/size problems keep halving the buffer
  function persistLogs() {
    if (!store) return;
    for (let i = 0; i < 6; i++) {
      try {
        const json = JSON.stringify(logBuffer);
        if (json.length > MAX_STORE_CHARS) throw new Error("too big");
        store.setItem(LOGS_KEY, json);
        return;
      } catch (_) {
        logBuffer = logBuffer.slice(Math.ceil(logBuffer.length / 2));
      }
    }
  }

  let saveTimer = null;
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persistLogs();
    }, 500);
  }

  function whenBodyReady(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  function pushLog(level, args) {
    let text = args.map(safeStr).join(" ");
    if (text.length > MAX_LOG_LEN) text = text.slice(0, MAX_LOG_LEN) + "…";
    logBuffer.push({ level, text, time: new Date().toISOString() });
    if (logBuffer.length > MAX_LOGS) logBuffer = logBuffer.slice(-MAX_LOGS);
    scheduleSave();
  }

  ["log", "warn", "error"].forEach((level) => {
    console[level] = function (...args) {
      orig[level](...args);
      try {
        pushLog(level, args);
      } catch (_) {}
    };
  });

  window.addEventListener("beforeunload", persistLogs);

  // ---- ErrorCatcher -------------------------------------------------------
  const ErrorCatcher = {
    errors: [],
    crashShown: false,

    // Automatic errors (window "error" / "unhandledrejection")
    log(type, message, source = "", line = 0, column = 0) {
      message = String(message).slice(0, 4000);

      if (isIgnored(type, message)) {
        orig.warn(
          "[ErrorCatcher] Ignored phantom error:",
          message.split("\n")[0],
        );
        pushLog("warn", ["[ignored]", type, message.split("\n")[0]]);
        return;
      }

      this._record({
        type,
        message,
        source,
        line,
        column,
        time: new Date().toISOString(),
      });
    },

    // Manual fatal error:   fatal(e, "MESSAGE")
    // Shows the same crash window as any other error, but with YOUR message
    // as the main text. The original error (stack) is kept in the report.
    // Never filtered by IGNORED_ERRORS.
    fatal(e, message) {
      const original =
        e instanceof Error ? e.stack || e.message : e == null ? "" : safeStr(e);
      const custom = message == null ? "" : String(message);

      this._record(
        {
          type: "Fatal",
          message: [custom, original].filter(Boolean).join("\n").slice(0, 4000),
          custom, // shown in the crash window
          original: String(original).slice(0, 4000), // first line shown as detail
          source: "manual",
          line: 0,
          column: 0,
          time: new Date().toISOString(),
        },
        true,
      );
    },

    // shared by log() and fatal()
    _record(error, force = false) {
      this.errors.push(error);
      console.error("[Game Error]", error);

      // Keep only the latest 100 errors
      if (this.errors.length > 100) this.errors = this.errors.slice(-100);
      try {
        store?.setItem(ERRORS_KEY, JSON.stringify(this.errors.slice(-20)));
      } catch (_) {}

      // A report is being sent right now: never replace that window
      const sending = !!document.getElementById("__ec_steps");

      // Normal errors: only the first one opens the window.
      // Fatal errors: always open the window (unless a report is sending).
      if (force ? !sending : !this.crashShown) {
        this.crashShown = true;
        // body may not exist yet if the error happens very early
        whenBodyReady(() => {
          try {
            showCrashScreen(error);
          } catch (e) {
            this.crashShown = false; // allow the next error to try again
            orig.error("[ErrorCatcher] crash screen failed", e);
          }
        });
      }
    },

    getErrors() {
      return [...this.errors];
    },

    getLogs() {
      return [...logBuffer];
    },

    clear() {
      this.errors = [];
      logBuffer = [];
      try {
        store?.removeItem(ERRORS_KEY);
        store?.removeItem(LOGS_KEY);
      } catch (_) {}
    },

    // Test the catcher. NOTE: errors typed directly into the DevTools console
    // do NOT reach window "error" events, so throw from async code instead.
    // kinds: "js" (default), "promise", "fatal"
    test(kind = "js") {
      if (kind === "promise")
        Promise.reject(new Error("ErrorCatcher test (promise)"));
      else if (kind === "fatal")
        this.fatal(
          new Error("ErrorCatcher test (fatal)"),
          "Test fatal message",
        );
      else
        setTimeout(() => {
          throw new Error("ErrorCatcher test (js)");
        }, 0);
    },
  };

  window.addEventListener("error", function (event) {
    ErrorCatcher.log(
      "JavaScript",
      event.message || "Unknown error",
      event.filename,
      event.lineno,
      event.colno,
    );
  });

  window.addEventListener("unhandledrejection", function (event) {
    ErrorCatcher.log(
      "Promise",
      event.reason?.stack || event.reason?.message || String(event.reason),
    );
  });

  window.ErrorCatcher = ErrorCatcher;
  // short global alias:  fatal(e, "MESSAGE")
  window.fatal = (e, message) => ErrorCatcher.fatal(e, message);

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  function injectStyle() {
    if (document.getElementById("__ec_style")) return;
    const s = document.createElement("style");
    s.id = "__ec_style";
    s.textContent = `
#__ec_overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.65);
  display:flex;align-items:center;justify-content:center;font-family:Georgia,serif}
#__ec_box{width:min(92vw,460px);background:linear-gradient(#ece3cc,#dccfb0);
  border:2px solid #7a5c2e;border-radius:10px;overflow:hidden;color:#3b2a10;
  box-shadow:0 10px 40px rgba(0,0,0,.6)}
#__ec_title{background:linear-gradient(#85652f,#6f5226);color:#f3e8cd;text-align:center;
  font-weight:bold;font-size:20px;padding:14px}
#__ec_body{padding:18px 22px;font-size:15px;line-height:1.4}
#__ec_detail{margin-top:10px;font:12px monospace;background:rgba(0,0,0,.08);
  border-radius:4px;padding:6px 8px;max-height:90px;overflow:auto;white-space:pre-wrap;word-break:break-word}
#__ec_btns{display:flex;flex-direction:column;gap:10px;padding:0 22px 20px}
.__ec_btn{background:#7a5c2e;color:#f3e8cd;border:1px solid #5a4220;border-radius:5px;
  font:bold 17px Georgia,serif;padding:10px;cursor:pointer}
.__ec_btn:hover{background:#8d6b35}
.__ec_btn:disabled{background:#8b8672;color:#b5b09c;cursor:default}
#__ec_steps{list-style:none;margin:0;padding:0}
#__ec_steps li{padding:5px 0 5px 28px;position:relative;opacity:.45}
#__ec_steps li.active,#__ec_steps li.done,#__ec_steps li.fail{opacity:1}
#__ec_steps li::before{content:"○";position:absolute;left:4px}
#__ec_steps li.active::before{content:"";width:12px;height:12px;left:4px;top:9px;
  border:2px solid #7a5c2e;border-top-color:transparent;border-radius:50%;
  animation:__ec_spin .8s linear infinite}
#__ec_steps li.done::before{content:"✔";color:#3d7a2e}
#__ec_steps li.fail::before{content:"✖";color:#a33}
#__ec_stream{margin-top:8px;font-size:13px;max-height:110px;overflow:auto}
@keyframes __ec_spin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(s);
  }

  const $ = (id) => document.getElementById(id);
  const esc = (t) =>
    String(t).replace(
      /[&<>]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
    );

  function showCrashScreen(error) {
    injectStyle();
    const old = $("__ec_overlay");
    if (old) old.remove();

    // Fatal errors show the custom message as the main text;
    // everything else uses the translated text for its type.
    const isFatal = error.type === "Fatal";
    const text =
      isFatal && error.custom
        ? error.custom
        : error_strings[error.type] || error_strings.default;
    const detail = isFatal
      ? String(error.original || "").split("\n")[0]
      : String(error.message).split("\n")[0];

    const overlay = document.createElement("div");
    overlay.id = "__ec_overlay";
    overlay.innerHTML = `
      <div id="__ec_box">
        <div id="__ec_title">${esc(error_strings.title)}</div>
        <div id="__ec_body">
          <div>${esc(text)}</div>
          ${detail ? `<div id="__ec_detail">${esc(detail)}</div>` : ""}
          <div style="margin-top:12px"><b>${esc(error_strings.ask)}</b></div>
        </div>
        <div id="__ec_btns">
          <button class="__ec_btn" id="__ec_send">${esc(error_strings.btn_send)}</button>
          <button class="__ec_btn" id="__ec_reload">${esc(error_strings.btn_reload)}</button>
          <button class="__ec_btn" id="__ec_close">${esc(error_strings.btn_close)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    $("__ec_close").onclick = () => overlay.remove();
    $("__ec_reload").onclick = () => location.reload();
    $("__ec_send").onclick = () => sendReport(error);

    try {
      comp_and_send(
        socket,
        JSON.stringify({
          type: "op_error",
        }),
      );
    } catch (e) {}
  }

  function showProgress() {
    $("__ec_title").textContent = error_strings.sending_title;
    const keys = Object.keys(error_strings.steps);
    $("__ec_body").innerHTML = `<ul id="__ec_steps">${keys
      .map((k) => `<li data-step="${k}">${esc(error_strings.steps[k])}</li>`)
      .join("")}</ul><div id="__ec_stream"></div>`;
    $("__ec_btns").innerHTML =
      `<button class="__ec_btn" id="__ec_close2" disabled>${esc(
        error_strings.btn_close,
      )}</button>`;
    $("__ec_close2").onclick = () => $("__ec_overlay")?.remove();
  }

  const setStep = (key, state) => {
    const li = document.querySelector(`#__ec_steps li[data-step="${key}"]`);
    if (li) li.className = state;
  };

  const streamLine = (msg) => {
    const el = $("__ec_stream");
    if (!el) return;
    const d = document.createElement("div");
    d.textContent = msg;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  };

  // ---------------------------------------------------------------------------
  // REPORT
  // ---------------------------------------------------------------------------
  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(r.error || new Error("FileReader failed"));
      r.readAsDataURL(blob);
    });

  const nextFrame = () =>
    new Promise((res) =>
      requestAnimationFrame(() => requestAnimationFrame(res)),
    );

  async function takeScreenshot() {
    const overlay = $("__ec_overlay");
    try {
      if (typeof GwentScreenshot === "undefined")
        throw new Error("GwentScreenshot is not available");
      // hide our own overlay so it is not part of the screenshot
      if (overlay) overlay.style.visibility = "hidden";
      await nextFrame();
      const result = await GwentScreenshot.capture();
      const blob =
        result instanceof Blob
          ? result
          : result?.blob instanceof Blob
            ? result.blob
            : null;
      if (!blob) throw new Error("capture() did not return a Blob");
      const content = await blobToBase64(blob);
      return { attached: true, mime: blob.type || "image/png", content };
    } catch (e) {
      return { attached: false, error: String(e?.message || e) };
    } finally {
      if (overlay) overlay.style.visibility = "";
    }
  }

  function readLogs() {
    try {
      const json = JSON.stringify(logBuffer);
      const bytes = new TextEncoder().encode(json);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000)
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return { attached: true, content: btoa(bin) };
    } catch (e) {
      return { attached: false, error: String(e?.message || e) };
    }
  }

  async function sendReport(error) {
    showProgress();
    let failed = null;
    try {
      // 1. screenshot
      setStep("screenshot", "active");
      const screenshot = await takeScreenshot();
      setStep("screenshot", screenshot.attached ? "done" : "fail");

      // 2. logs
      setStep("logs", "active");
      const logs = readLogs();
      setStep("logs", logs.attached ? "done" : "fail");

      // 3. ask the server where to send the report
      setStep("connect", "active");
      const initRes = await fetch(REPORT_INIT_URL, { method: "POST" });
      if (!initRes.ok) throw new Error("HTTP " + initRes.status);
      const initText = await initRes.text();
      let url;
      try {
        const j = JSON.parse(initText);
        url = typeof j === "string" ? j : j.url;
      } catch (_) {
        url = initText.trim();
      }
      if (!url) throw new Error("Server did not return a URL");
      setStep("connect", "done");

      // 4. send the report
      setStep("send", "active");
      var player_data_errors = {
        op_player: { me_id: playerId ?? null, me_flag: country ?? null },
        names: players ?? null,
        lang: lang_hash ?? lang ?? null,
      };
      const body = {
        logs,
        screenshot,
        error,
        player_data:
          typeof player_data_errors !== "undefined" ? player_data_errors : null,
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error("HTTP " + res.status);
      setStep("send", "done");

      // 5. read the streamed response until STOP
      setStep("response", "active");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let stopped = false;
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          if (line === "STOP") {
            stopped = true;
            break;
          }
          streamLine(line);
        }
      }
      if (!stopped && buf.trim() && buf.trim() !== "STOP")
        streamLine(buf.trim());
      try {
        reader.cancel();
      } catch (_) {}
      setStep("response", "done");
      streamLine(error_strings.done);
    } catch (e) {
      failed = e;
      const active = document.querySelector("#__ec_steps li.active");
      if (active) active.className = "fail";
      streamLine(error_strings.failed + String(e?.message || e));
      orig.error("[ErrorCatcher] report failed", e);
    } finally {
      const b = $("__ec_close2");
      if (b) b.disabled = false;
    }
    return !failed;
  }

  ErrorCatcher.sendReport = sendReport;

  console.log("[ErrorCatcher] Global error monitoring enabled.");
})();

async function errorcatchsayhi() {
  return "HELLO";
}
function this_makes_error() {
  return error();
}
function showopponenterrored() {
  warn_screen(
    getTranslation("ui_error_strings.xx.cnt"),
    "alert",
    getTranslation("ui_error_strings.xx.tits"),
  );
}
