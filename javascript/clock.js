"use strict";
function loadingscreenupdate(strng) {
  document.getElementById("load_text").textContent = strng;
  console.log(`[LOADING]: "${strng}"`);
}

function set_new_image(key, path, isvideo = false) {
  //  console.log("Visual", key, path);
  var the_key = false;
  if (key === "board") {
    the_key = "main";
  } else if (key === "deck") {
    the_key = ".deck-bg";
  }
  if (the_key !== false) {
    const doc = document.querySelector(the_key);
    doc.style.backgroundImage = `url("${path}")`;
  } else {
    document.getElementById("very_start_bg1").style.backgroundImage =
      `url("${path}")`;
  }
}

let the_image_json = {};
function setupTimedImages(config, set_new_image) {
  let timer = null;
  let currentContent = null;

  function apply() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    const now = Clock.now();

    let active = null;
    let nextChange = Infinity;

    for (const item of config.timed) {
      const start = Date.parse(item.start);
      const end = Date.parse(item.end);

      if (now >= start && now < end) {
        active = item;

        if (end < nextChange) {
          nextChange = end;
        }
      } else if (now < start) {
        if (start < nextChange) {
          nextChange = start;
        }
      }
    }

    const images = active ? config.images[active.content] : config.fallback;

    const contentKey = active ? active.content : "__fallback__";

    // Only update if something actually changed
    if (contentKey !== currentContent) {
      currentContent = contentKey;

      for (const [key, path] of Object.entries(images)) {
        set_new_image(key, path);
      }
    }

    // Schedule next update
    if (nextChange !== Infinity) {
      const delay = Math.max(0, nextChange - Date.now());

      // setTimeout max is ~24.8 days
      const MAX_DELAY = 0x7fffffff;

      timer = setTimeout(apply, Math.min(delay, MAX_DELAY));
    }
  }

  apply();

  return {
    refresh: apply, // if config changes later
    destroy() {
      if (timer) clearTimeout(timer);
    },
  };
}

function warn_screen(content, type = "alert", title = "Warning") {
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
    header.textContent = title;
    Object.assign(header.style, {
      padding: "10px 16px",
      background: "#6f5830",
      color: "#f4e7c3",
      fontSize: "18px",
      fontWeight: "bold",
      textAlign: "center",
    });

    const body = document.createElement("div");
    Object.assign(body.style, {
      padding: "24px",
      textAlign: "left",
      fontSize: "17px",
      lineHeight: "1.5",
      whiteSpace: "pre-line", // <-- supports \n
      maxHeight: "300px", // <-- scroll area
      overflowY: "auto", // <-- enables scrolling
    });
    body.textContent = content;

    const buttons = document.createElement("div");
    Object.assign(buttons.style, {
      display: "flex",
      justifyContent: "center",
      gap: "14px",
      paddingBottom: "20px",
    });

    function makeButton(label) {
      const btn = document.createElement("button");
      btn.textContent = label;

      Object.assign(btn.style, {
        minWidth: "100px",
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

    function close(value) {
      document.body.removeChild(overlay);
      resolve(value);
    }

    if (type === "confirm") {
      const yes = makeButton("Confirm");
      const no = makeButton("Cancel");

      yes.onclick = () => close(true);
      no.onclick = () => close(false);

      buttons.append(yes, no);
      yes.focus();
    } else {
      const ok = makeButton("OK");

      ok.onclick = () => close(true);

      buttons.append(ok);
      ok.focus();
    }

    box.append(header, body, buttons);
    overlay.append(box);
    document.body.append(overlay);
  });
}
(() => {
  loadingscreenupdate("Starting clock synchronization");
  let useSecureClock = false;
  let serverTimestamp = 0;
  let syncPerf = 0;
  let timezone = "UTC";
  let sha = "abcde";

  const scripts = [
    "javascript/jszip.min.js",
    "javascript/defines.js",
    "javascript/cards.js",
    "javascript/custom_cards.js",
    "javascript/decks.js",
    "javascript/abilities.js",
    "javascript/factions.js",
    "javascript/hls.js@1.js",
    "javascript/external_deck.js",
    "javascript/gwent_coin.js",
    "javascript/gwent.js",
    "javascript/session_registering.js",
    //  "https://www.youtube.com/iframe_api",
    "javascript/patchnotes.js",
    "javascript/sync_hands.js",
    "javascript/session.js",
    "javascript/chat.js",
    "javascript/faction_ability_counter.js",
    "javascript/connect_to_custom_server.js",
  ];
  window.Clock = {
    now() {
      if (!useSecureClock) return Date.now();

      return serverTimestamp + (performance.now() - syncPerf);
    },

    date() {
      return new Date(this.now());
    },
  };

  async function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");

      s.src = `${src}?ver=${encodeURIComponent(sha)}`;

      s.onload = resolve;

      s.onerror = reject;

      document.head.appendChild(s);
    });
  }

  async function loadScripts() {
    for (const script of scripts) {
      console.log("Loading", script);

      loadingscreenupdate(`Loading ${script}...`);
      await loadScript(script);
    }
  }

  async function syncClock() {
    loadingscreenupdate("Fetching clock config...");
    try {
      const config = await fetch(
        `javascript/clock_config.json?date=${random_string_gen()}`,
        {
          cache: "no-store",
        },
      );

      const json = await config.json();
      the_image_json = json.graphic;
      loadingscreenupdate("Parsing clock response...");

      timezone = json.zone || "UTC";
      sha = json.sha || "";

      loadingscreenupdate(`Clock synchronization to ${timezone} in progress`);

      console.log("Clock config", json);
      if (window.location.port !== "8080" && window.location.port !== "8081") {
        const start = performance.now();

        const response = await fetch(
          `https://time.now/developer/api/timezone/${encodeURIComponent(timezone)}`,
          {
            cache: "no-store",
          },
        );

        const midpoint = performance.now();

        const body = await response.json();

        serverTimestamp = new Date(body.datetime).getTime();

        syncPerf = (start + midpoint) / 2;

        useSecureClock = true;

        console.log(
          "Secure clock synced",
          new Date(serverTimestamp).toISOString(),
        );
      } else {
        console.warn("Secure clock unavailable, using device clock.");

        useSecureClock = false;
      }
    } catch (e) {
      console.warn("Secure clock unavailable, using device clock.", e);

      useSecureClock = false;
    }
    loadingscreenupdate("Loading deck visual!");
    // await sleep(270);
    const watcher = setupTimedImages(the_image_json, (key, path) => {
      set_new_image(key, path);
    });
    console.log("bg watcher", watcher);
    loadingscreenupdate("Clock ready, lunching scripts!");
    await loadScripts();
    loadingscreenupdate("Running postscripinit()");
    await postscripinit();
  }

  syncClock();
})();
