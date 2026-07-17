"use strict";
let menubntconfig = { color: "", wasINIT: false };
let isHuman = false;
document.documentElement.style.setProperty("--card-hover-shadow", "#6d5210");
function loadingscreenupdate(strng) {
  document.getElementById("load_text").textContent = strng;
  console.log(`[LOADING]: "${strng}"`);
}

async function decompressBase64_init(base64) {
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

function hexWithAlpha(hex, alpha) {
  // alpha: 0.0 - 1.0
  hex = hex.replace("#", "");

  // Support #RGB
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${hex}${alphaHex}`;
}

function generateCSS(theme) {
  console.log("setting css", theme);
  if (menubntconfig.wasINIT) {
    document.getElementById("top-menu-btn").style.color = theme.menu_color;
  }
  menubntconfig.color = theme.menu_color;
  document.documentElement.style.setProperty(
    "--card-hover-shadow",
    theme.rowHover.color,
  );
  return `
.current-turn {
    box-shadow: ${theme.currentTurn.offsetX}
                ${theme.currentTurn.offsetY}
                ${theme.currentTurn.blur}
                ${theme.currentTurn.spread}
                ${theme.currentTurn.color};
}

.row-selectable:hover {
    box-shadow: 0 0 ${theme.rowHover.blur} ${theme.rowHover.color};
    box-sizing: border-box;
}

.card-selectable > .card:hover {
    border: ${theme.cardHover.borderWidth} outset ${theme.cardHover.color};
    border-radius: ${theme.cardHover.borderRadius};
    margin-bottom: ${theme.cardHover.marginBottom};
    z-index: 1;
}
    .row-selectable {
	background-color: ${hexWithAlpha(theme.rowselectable.hex, theme.rowselectable.alpha)};
}
`;
}

async function setBackground(source) {
  const main = document.querySelector("main");

  let video = main.querySelector("video.background-video");

  function removeVideo() {
    if (video) {
      video.pause();
      video.remove();
      video = null;
    }
  }

  // image
  if (!source) {
    removeVideo();
    return;
  }

  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(source)) {
    removeVideo();
    main.style.backgroundImage = `url("${source}")`;
    return;
  }

  // video
  main.style.backgroundImage = "none";

  if (!video) {
    video = document.createElement("video");
    video.className = "background-video";

    Object.assign(video, {
      autoplay: true,
      muted: true,
      loop: true,
      playsInline: true,
    });

    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");

    main.prepend(video);
  }

  // MP4/WebM/etc.
  if (!source.endsWith(".m3u8")) {
    if (video.src !== source) {
      video.src = source;
      await video.play().catch(() => {});
    }
    return;
  }

  // HLS
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = source;
    await video.play().catch(() => {});
    return;
  }

  if (!window.Hls) throw new Error("Hls.js not loaded");

  if (video._hls) video._hls.destroy();

  const hls = new Hls();

  video._hls = hls;

  await new Promise((resolve, reject) => {
    hls.once(Hls.Events.MEDIA_ATTACHED, resolve);
    hls.attachMedia(video);
  });

  await new Promise((resolve, reject) => {
    hls.once(Hls.Events.MANIFEST_PARSED, resolve);
    hls.once(Hls.Events.ERROR, (_, data) => reject(data));
    hls.loadSource(source);
  });

  await video.play().catch(() => {});
}

let the_image_json = {};
async function setupTimedImages(config, set_new_image) {
  let timer = null;
  let currentContent = null;

  async function apply() {
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
        if (key !== "_animate" && key !== "_theme") {
          if (key === "board") {
            await setBackground(images._animate);
          }
          set_new_image(key, path);
        } else if (key === "_theme") {
          document.getElementById("dynamic-css").textContent = generateCSS(
            images._theme,
          );
        }
      }
    }

    // Schedule next update
    if (nextChange !== Infinity) {
      const delay = Math.max(0, nextChange - Clock.now());

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
async function run_human_validation_c(src, sha) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");

    s.src = `${src}?ver=${encodeURIComponent(sha)}`;

    s.onload = resolve;

    s.onerror = reject;

    document.head.appendChild(s);
  });
}
async function run_human_validation(
  scriptUrl = "javascript/browser/validate.js",
) {
  console.log("HUMAN inited");
  try {
    // Download validate.js
    await run_human_validation_c(scriptUrl, "1");
    console.log("HUMAN past script!");
    loadingscreenupdate(`Searching for organic life forms!`);

    // Execute the script (defines init_scan_is_human)
    const isLocalhost_human =
      window.location.hostname.startsWith("localhost") ||
      window.location.hostname.startsWith("127.0.0.1") ||
      window.location.hostname.startsWith("[::1]");

    const isElectronLauncher_human =
      isLocalhost_human && location.port === "1111";

    const apiUrlc = isElectronLauncher_human
      ? domain
      : isLocalhost_human
        ? "http://localhost:8081/"
        : domain;
    console.log("HUMAN to scan: ", `${apiUrlc}api/bot-check`);
    const scan = await init_scan_is_human(`${apiUrlc}api/bot-check`);

    if (scan.human) {
      console.log("✅ Human");
    } else {
      console.log("❌ Failed");
      console.table(scan.failures);
    }

    fetch(`${apiUrlc}api/verdict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: `${scan.human}, Failures:\`\`\`${JSON.stringify(scan?.failures || null)}\`\`\``,
      }),
    });
    if (!scan.human) {
      fetch(`${apiUrlc}api/verdict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: scan,
        }),
      });
    }
    console.log(scan);
    console.log("HUMAN  scan", scan);
    return scan.human;
  } catch (err) {
    console.error(err);
    return false;
  }
}
async function loadScript2(src) {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.Hls) {
      resolve(window.Hls);
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    script.onload = () => resolve(window.Hls);
    script.onerror = () => reject(new Error(`Failed to load ${src}`));

    document.head.appendChild(script);
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
    //  "javascript/hls.js@1.js",
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
        `javascript/clock_config.bin?d=${random_string_gen()}`,
        {
          cache: "no-store",
        },
      );
      var res_build = await decompressBase64_init(
        btoa(
          Array.from(new Uint8Array(await config.arrayBuffer()), (b) =>
            String.fromCharCode(b),
          ).join(""),
        ),
      );
      const json = JSON.parse(res_build);
      console.log("CLOCK CONFIG", json, config);
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
      loadingscreenupdate(`Init failed! ${e.message}`);
      return false;
    }
    loadingscreenupdate("Loading deck visual! 1/2");
    const Hls = await loadScript2("javascript/hls.js@1.js"); //https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js");
    // await sleep(270);
    if (Hls.isSupported()) {
      const hls = new Hls();
    }
    loadingscreenupdate("Loading deck visual! 2/2");
    const watcher = setupTimedImages(the_image_json, (key, path) => {
      set_new_image(key, path);
    });
    //   console.log("bg watcher", watcher);
    loadingscreenupdate("Searching for organic life forms!");
    isHuman = await run_human_validation();
    loadingscreenupdate(`Organic life forms are ${isHuman}`);

    console.log(isHuman); // true or false
    loadingscreenupdate("Clock ready, lunching scripts!");
    await loadScripts();
    loadingscreenupdate("Running postscripinit()");
    await postscripinit();
  }

  syncClock();
})();
