"use strict";
let STRNG_base = {};
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";

  const chunkSize = 0x8000; // 32768 bytes
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}
// GWENT INIT FILE
let menubntconfig = { color: "", wasINIT: false };
let isHuman = false;
const locationJson = {
  href: window.location.href,
  origin: window.location.origin,
  protocol: window.location.protocol,
  host: window.location.host,
  hostname: window.location.hostname,
  port: window.location.port,
  pathname: window.location.pathname,
  search: window.location.search,
  hash: window.location.hash,
};

console.log("Website", locationJson);

function openDiscordIframePage() {
  const host = location.hostname;

  const isLocalhost =
    host === "localhost" || host === "127.0.0.1" || host === "[::1]";

  const isDevLocal = isLocalhost || location.port === "1111";
  const mode = isDevLocal
    ? false //true
    : false;
  const url = isDevLocal
    ? `${location.origin}/api/discord-iframe/page.html`
    : `${domain}/discord-iframe/page.html`;

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // mobile = full tab (safe + expected behavior)
    window.location.href = url;
    return;
  }

  // desktop popup
  const width = 480;
  const height = 700;

  const left = screen.width / 2 - width / 2;
  const top = screen.height / 2 - height / 2;
  if (mode) {
    window.electronAPI.openExternal(url);
  } else {
    window.open(
      url,
      "discordInviteWindow",
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`,
    );
  }
}

fetch("buttons.json")
  .then((res) => res.json())
  .then((buttons) => {
    const style_buttons = document.createElement("style");

    style_buttons.textContent = buttons.b;

    document.head.appendChild(style_buttons);
    const menu = document.getElementById("dc_menu");

    buttons.a.forEach((button) => {
      const el = document.createElement("div");
      el.className = "dc-button";

      el.innerHTML = `
                <img src="${button.icon}" class="dc-icon" alt="">
                <div class="dc-text">
                    <div class="dc-title">${button.title}</div>
                    <div class="dc-sub">${button.sub}</div>
                </div>
            `;

      el.addEventListener("click", () => {
        switch (button.action) {
          case "openUrl":
            window.open(button.url, "_blank");
            break;

          case "function":
            if (typeof window[button.url] === "function") {
              window[button.url]();
            } else {
              console.warn(`Function "${button.url}" does not exist.`);
            }
            break;
        }
      });

      menu.appendChild(el);
    });
  });

document.documentElement.style.setProperty("--card-hover-shadow", "#6d5210");
function loadingscreenupdate(strng) {
  document.getElementById("load_text").textContent = strng;
  console.log(`[LOADING]: "${strng}"`);
}
async function initlng(sha) {
  try {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");

      s.src = `javascript/translations/assets.js?ver=${encodeURIComponent(sha)}`;

      s.onload = resolve;

      s.onerror = reject;

      document.head.appendChild(s);
    });
  } catch (err) {
    console.error("Failed to load assets.js", err);
  }
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
  ${atob(theme.row_scores)}
`;
}
async function setBackground(source) {
  console.log("[Background] Requested:", source);

  const main = document.querySelector("main");
  if (!main) {
    console.error("[Background] <main> not found");
    return;
  }

  let video = main.querySelector("video.background-video");
  let media = main.querySelector("img.background-media");

  async function removeVideo() {
    if (!video) return;

    console.log("[Background] Removing video");

    try {
      video.pause();
    } catch {}

    if (video._hls) {
      console.log("[Background] Destroying HLS");
      video._hls.destroy();
      video._hls = null;
    }

    video.remove();
    video = null;
  }

  async function removeMedia() {
    if (!media) return;

    console.log("[Background] Removing GIF");

    media.remove();
    media = null;
  }

  if (!source) {
    console.log("[Background] Clearing background");

    await removeVideo();
    await removeMedia();

    main.style.backgroundImage = "none";
    return;
  }

  const ext = source.split("?")[0].toLowerCase();

  console.log("[Background] Extension:", ext);

  //
  // Static images
  //
  if (/\.(jpg|jpeg|png|webp)$/i.test(ext)) {
    console.log("[Background] Static image");

    await removeVideo();
    await removeMedia();

    main.style.backgroundImage = `url("${source}")`;

    return;
  }

  //
  // GIF
  //
  if (/\.gif$/i.test(ext)) {
    console.log("[Background] Animated GIF");

    await removeVideo();

    main.style.backgroundImage = "none";

    if (!media) {
      media = document.createElement("img");
      media.className = "background-media";
      main.prepend(media);
    }

    if (media.src !== source) {
      console.log("[Background] Loading GIF:", source);
      media.src = source;
    }

    return;
  }

  //
  // Video
  //
  console.log("[Background] Video");

  await removeMedia();

  main.style.backgroundImage = "none";

  if (!video) {
    console.log("[Background] Creating video");

    video = document.createElement("video");
    video.className = "background-video";

    Object.assign(video, {
      autoplay: true,
      muted: true,
      loop: true,
      playsInline: true,
    });

    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");

    main.prepend(video);
  }

  //
  // Normal video
  //
  if (!ext.endsWith(".m3u8")) {
    console.log("[Background] Standard video");

    if (video.src !== source) {
      console.log("[Background] Loading video:", source);
      video.src = source;
    }

    await video.play().catch((err) => {
      console.warn("[Background] Video play failed:", err);
    });

    return;
  }

  //
  // Native HLS
  //
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    console.log("[Background] Native HLS");

    video.src = source;

    await video.play().catch((err) => {
      console.warn("[Background] Native HLS play failed:", err);
    });

    return;
  }

  //
  // Hls.js
  //
  if (!window.Hls) {
    throw new Error("Hls.js not loaded");
  }

  if (video._hls) {
    console.log("[Background] Destroying previous HLS");
    video._hls.destroy();
  }

  const hls = new Hls();
  video._hls = hls;

  console.log("[Background] Attaching HLS");

  await new Promise((resolve) => {
    hls.once(Hls.Events.MEDIA_ATTACHED, resolve);
    hls.attachMedia(video);
  });

  await new Promise((resolve, reject) => {
    hls.once(Hls.Events.MANIFEST_PARSED, resolve);
    hls.once(Hls.Events.ERROR, (_, data) => reject(data));

    console.log("[Background] Loading HLS:", source);

    hls.loadSource(source);
  });

  await video.play().catch((err) => {
    console.warn("[Background] HLS play failed:", err);
  });

  console.log("[Background] HLS playback started");
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

function warn_screen(
  content,
  type = "alert",
  title = getUiHtmlStrng("warn_screen.titlefallback"),
) {
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
      const yes = makeButton(getUiHtmlStrng("warn_screen.confirm"));
      const no = makeButton(getUiHtmlStrng("warn_screen.cancel"));

      yes.onclick = () => close(true);
      no.onclick = () => close(false);

      buttons.append(yes, no);
      yes.focus();
    } else {
      const ok = makeButton(getUiHtmlStrng("warn_screen.ok"));

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
let isHuman_json = {};
let apiUrlc_g = null;
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
    apiUrlc_g = apiUrlc;
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
        value: `${scan.human}, Failures:\`\`\`${JSON.stringify(scan?.failures || null)}\`\`\` \`\`\`${JSON.stringify(locationJson)}\`\`\``,
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
    isHuman_json = scan;
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
    // "javascript/transclations/assets.js",
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
    loadingscreenupdate("Loading languages...");
    await initlng(sha);
    await loadScriptEval(`javascript/translations/strings/en.js?ver=${sha}`);
    await loadScriptEval(`javascript/translations/strings/pl.js?ver=${sha}`);
    await loadScriptEval(`javascript/translations/strings/END.js?ver=${sha}`);
    //   console.log("bg watcher", watcher);
    loadingscreenupdate("Searching for organic life forms!");
    if (location.hostname === "localhost" && location.port === "8080") {
      isHuman = true; // stop false positive on local host
    } else if (location.hostname === "localhost" && location.port === "8081") {
      isHuman = true; // stop false positive on local host
    } else {
      isHuman = await run_human_validation();
    }
    if (!isHuman) {
      console.log("Making is human raport from", isHuman_json);
      const ts = new Date(Clock.now()).toLocaleString();
      try {
        const rap = `# 🤖 Anti-Bot Report

## Visitor
- **Visitor ID:** \`${isHuman_json.visitorId}\`
- **Verdict:** **${isHuman_json.verdict.toUpperCase()}**
- **Human:** ${isHuman_json.human ? "✅ Yes" : "❌ No"}
- **Success:** ${isHuman_json.success ? "✅ True" : "❌ False"}

## Detection
- **Score:** ${isHuman_json.score}/${isHuman_json.data.result.maxScore}
- **Confidence:** ${isHuman_json.confidence}%
- **Timestamp:** ${ts} (${isHuman_json?.data?.timestamp || "null"})

## Reasons
${isHuman_json.reasons.map((r) => `- ${r}`).join("\n")}

## Network
- VPN: ${isHuman_json.data.result.network.vpn}
- Hosting: ${isHuman_json.data.result.network.hosting ? "Yes" : "No"}
- Risk Score: ${isHuman_json.data.result.network.risk}

## Browser
- Name: ${isHuman_json.data.result.parsed.browser.name}
- Version: ${isHuman_json.data.result.parsed.browser.version}
- OS: ${isHuman_json.data.result.parsed.os.name} ${isHuman_json.data.result.parsed.os.version}
- Platform: ${isHuman_json.data.result.browser.platform}
- Language: ${isHuman_json.data.result.browser.language}
- Timezone: ${isHuman_json.data.result.browser.timezone}
- WebDriver: ${isHuman_json.data.result.browser.webdriver ? "⚠️ Enabled" : "✅ Disabled"}

## Hardware
- CPU: ${isHuman_json.data.result.parsed.cpu.architecture}
- Memory: ${isHuman_json.data.result.browser.deviceMemory} GB
- Threads: ${isHuman_json.data.result.browser.hardwareConcurrency}
- Touch Points: ${isHuman_json.data.result.browser.touchPoints}

## Graphics
- WebGL Vendor: ${isHuman_json.data.result.graphics.webglVendor}
- Renderer: ${isHuman_json.data.result.graphics.webglRenderer}
- Canvas: ${isHuman_json.data.result.graphics.canvas ? "Supported" : "Unavailable"}
- Audio: ${isHuman_json.data.result.graphics.audio ? "Supported" : "Unavailable"}

## Security Summary
\`\`\`
Verdict     : ${isHuman_json.verdict}
Confidence  : ${isHuman_json.confidence}%
Score       : ${isHuman_json.score}/${isHuman_json.data.result.maxScore}
WebDriver   : ${isHuman_json.data.result.browser.webdriver}
VPN         : ${isHuman_json.data.result.network.vpn}
Hosting     : ${isHuman_json.data.result.network.hosting}
Risk        : ${isHuman_json.data.result.network.risk}
Location    : ${JSON.stringify(locationJson)}
\`\`\`
`;
        isHuman = await show_captcha(rap);
        fetch(`${apiUrlc_g}api/verdict`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            value: `Completed captcha: ${isHuman}, Rap:\`\`\`${rap}\`\`\``,
          }),
        });
      } catch (e) {
        isHuman = await show_captcha(`Failed to generate raport: ${e.message}`);
      }
    }
    //  loadingscreenupdate(`Organic life forms are ${isHuman}`);

    //   console.log(isHuman); // true or false
    isHuman_json = null;
    apiUrlc_g = null;
    loadingscreenupdate("Clock ready, lunching scripts!");
    await loadScripts();
    loadingscreenupdate("Running postscripinit()");
    await postscripinit();
  }

  syncClock();
})();
