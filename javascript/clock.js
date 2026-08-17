"use strict";
let STRNG_base = {};
const knowissuescript =
  '(() => {\n  const BASE = "https://theredmineword.github.io/GWENT/web-only";\n  const POLL_MS = 2.8 * 60 * 1000;\n  const ISSUE_CACHE_KEY = "knownIssueCache_v1";\n  const HIDDEN_KEY = "knownIssueHidden_v1";\n\n  const css = `\n    #ki-wrap{\n      position:fixed;\n      top:14px;\n      left:50%;\n      transform:translateX(-50%);\n      z-index:999999;\n      display:none;\n      max-width:min(760px,calc(100vw - 24px));\n    }\n    #ki-btn{\n      display:inline-flex;\n      align-items:center;\n      gap:10px;\n      border:2px solid var(--ki-color,#DE3163);\n      background:rgba(18,21,30,.96);\n      color:#fff;\n      border-radius:999px;\n      padding:12px 16px;\n      font:600 14px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;\n      cursor:pointer;\n      box-shadow:0 12px 32px rgba(0,0,0,.35);\n    }\n    #ki-dot{\n      width:10px;\n      height:10px;\n      border-radius:50%;\n      background:var(--ki-color,#DE3163);\n      box-shadow:0 0 0 5px color-mix(in srgb, var(--ki-color,#DE3163) 20%, transparent);\n      flex:0 0 auto;\n    }\n    #ki-label{\n      white-space:nowrap;\n      overflow:hidden;\n      text-overflow:ellipsis;\n      max-width:min(70vw,520px);\n    }\n\n    #ki-modal-backdrop{\n      position:fixed;\n      inset:0;\n      z-index:1000000;\n      display:none;\n      align-items:center;\n      justify-content:center;\n      background:rgba(0,0,0,.58);\n      padding:20px;\n    }\n    #ki-modal{\n      width:min(760px,100%);\n      background:rgba(18,21,30,.98);\n      border:2px solid var(--ki-color,#DE3163);\n      border-radius:22px;\n      box-shadow:0 20px 60px rgba(0,0,0,.45);\n      overflow:hidden;\n      color:#e8ebf2;\n      font:14px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;\n    }\n    #ki-modal-hd{\n      display:flex;\n      justify-content:space-between;\n      gap:16px;\n      align-items:flex-start;\n      padding:18px 20px 12px;\n      border-bottom:1px solid rgba(255,255,255,.08);\n    }\n    #ki-modal-title{\n      margin:0;\n      font-size:24px;\n      line-height:1.2;\n    }\n    #ki-modal-meta{\n      margin-top:4px;\n      color:#aab2c5;\n      font-size:12px;\n    }\n    #ki-modal-body{\n      padding:18px 20px 20px;\n      white-space:pre-wrap;\n      overflow-wrap:anywhere;\n    }\n    #ki-modal-ft{\n      display:flex;\n      justify-content:center; /* centered redirect url */\n      gap:10px;\n      padding:0 20px 20px;\n      flex-wrap:wrap;\n      text-align:center;\n    }\n    .ki-btn2,.ki-link{\n      appearance:none;\n      border:0;\n      border-radius:14px;\n      padding:10px 14px;\n      font:inherit;\n      cursor:pointer;\n      background:rgba(255,255,255,.08);\n      color:#fff;\n      text-decoration:none;\n      display:inline-flex;\n      align-items:center;\n      justify-content:center;\n    }\n    .ki-btn2:hover,.ki-link:hover{\n      background:rgba(255,255,255,.12);\n    }\n    .ki-primary{\n      background:var(--ki-color,#DE3163);\n      font-weight:700;\n    }\n    .ki-primary:hover{\n      filter:brightness(1.05);\n    }\n  `;\n\n  const style = document.createElement("style");\n  style.textContent = css;\n  document.head.appendChild(style);\n\n  const wrap = document.createElement("div");\n  wrap.id = "ki-wrap";\n  wrap.innerHTML = `\n    <button id="ki-btn" type="button" aria-label="View known issue">\n      <span id="ki-dot"></span>\n      <span id="ki-label">Know Issue Active · View issue</span>\n    </button>\n  `;\n  document.body.appendChild(wrap);\n\n  const backdrop = document.createElement("div");\n  backdrop.id = "ki-modal-backdrop";\n  backdrop.innerHTML = `\n    <div id="ki-modal" role="dialog" aria-modal="true" aria-labelledby="ki-modal-title">\n      <div id="ki-modal-hd">\n        <div>\n          <h2 id="ki-modal-title">Known Issue</h2>\n          <div id="ki-modal-meta">Last updated: —</div>\n        </div>\n        <button class="ki-btn2" id="ki-close" type="button">Close</button>\n      </div>\n      <div id="ki-modal-body"></div>\n      <div id="ki-modal-ft"></div>\n    </div>\n  `;\n  document.body.appendChild(backdrop);\n\n  const els = {\n    wrap: document.getElementById("ki-wrap"),\n    btn: document.getElementById("ki-btn"),\n    dot: document.getElementById("ki-dot"),\n    label: document.getElementById("ki-label"),\n    backdrop,\n    close: document.getElementById("ki-close"),\n    title: document.getElementById("ki-modal-title"),\n    meta: document.getElementById("ki-modal-meta"),\n    body: document.getElementById("ki-modal-body"),\n    footer: document.getElementById("ki-modal-ft"),\n  };\n\n  const state = {\n    issue: null,\n    key: "",\n    modalOpen: false,\n  };\n\n  const LOG_PREFIX = "[KnownIssue]";\n  const log = (...args) => console.log(LOG_PREFIX, ...args);\n  const warn = (...args) => console.warn(LOG_PREFIX, ...args);\n  const error = (...args) => console.error(LOG_PREFIX, ...args);\n\n  const b64 = (s) => btoa(unescape(encodeURIComponent(String(s ?? ""))));\n  const slot15 = () => String(Math.floor(Date.now() / (15 * 60 * 1000)));\n  const randomToken = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);\n\n  const loadCache = () => {\n    try { return JSON.parse(localStorage.getItem(ISSUE_CACHE_KEY) || "null"); } catch { return null; }\n  };\n  const saveCache = (v) => localStorage.setItem(ISSUE_CACHE_KEY, JSON.stringify(v));\n  const isHidden = () => localStorage.getItem(HIDDEN_KEY) === "1";\n  const setHidden = (v) => localStorage.setItem(HIDDEN_KEY, v ? "1" : "0");\n\n  const fmtDate = (iso) => {\n    if (!iso) return "—";\n    const d = new Date(iso);\n    return Number.isNaN(d.getTime())\n      ? String(iso)\n      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);\n  };\n\n  const issueKey = (x) => [\n    x?.date?.y || "",\n    x?.date?.m || "",\n    x?.date?.d || "",\n    x?.id || "",\n    x?.lastupdate || "",\n    x?.color || "",\n    x?.title || "",\n    x?.desc || "",\n    x?.bottom_link ? "1" : "0",\n    x?.bottom_link_value || ""\n  ].join("|");\n\n  async function fetchText(url) {\n    const r = await fetch(url, { cache: "no-store" });\n    if (!r.ok) throw new Error(`HTTP ${r.status}`);\n    return r.text();\n  }\n\n  async function fetchJson(url) {\n    const r = await fetch(url, { cache: "no-store" });\n    if (!r.ok) throw new Error(`HTTP ${r.status}`);\n    return r.json();\n  }\n\n  function parseIssueText(raw) {\n    const get = (tag) => (raw.match(new RegExp(`<${tag}>([\\\\s\\\\S]*?)<\\\\/${tag}>`, "i"))?.[1] || "").trim();\n    return {\n      title: get("title") || "Known Issue",\n      desc: get("desc") || "",\n      bottom_link: /<bottom_link>\\s*true\\s*<\\/bottom_link>/i.test(raw),\n      bottom_link_value: get("bottom_link_value") || "",\n    };\n  }\n\n  function applyIssue(issue) {\n    state.issue = issue;\n    document.documentElement.style.setProperty("--ki-color", issue.color || "#DE3163");\n    els.label.textContent = `${issue.title || "Know Issue Active"} · View issue`;\n    els.title.textContent = issue.title || "Known Issue";\n    els.meta.textContent = `Last updated: ${fmtDate(issue.lastupdate)}`;\n    els.body.textContent = issue.desc || "";\n    log("Applied issue", { title: issue.title, key: issueKey(issue), lastupdate: issue.lastupdate });\n  }\n\n  function openModal() {\n    if (!state.issue) {\n      log("Open modal ignored: no issue loaded yet");\n      return;\n    }\n    log("Opening modal", { title: state.issue.title, key: state.key });\n    els.title.textContent = state.issue.title || "Known Issue";\n    els.meta.textContent = `Last updated: ${fmtDate(state.issue.lastupdate)}`;\n    els.body.textContent = state.issue.desc || "";\n    els.footer.innerHTML = "";\n\n    if (state.issue.bottom_link && state.issue.bottom_link_value) {\n      const [label, url] = state.issue.bottom_link_value.split("###");\n      if (url) {\n        const a = document.createElement("a");\n        a.className = "ki-link ki-primary";\n        a.href = url;\n        a.target = "_blank";\n        a.rel = "noopener noreferrer";\n        a.textContent = label || "Open link";\n        els.footer.appendChild(a);\n      }\n    }\n\n    els.backdrop.style.display = "flex";\n    state.modalOpen = true;\n    setHidden(false);\n  }\n\n  function closeModal() {\n    els.backdrop.style.display = "none";\n    state.modalOpen = false;\n    log("Modal closed");\n  }\n\n  function showBanner() {\n    els.wrap.style.display = "block";\n    log("Banner shown");\n  }\n\n  function hideBanner() {\n    els.wrap.style.display = "none";\n    log("Banner hidden");\n  }\n\n  async function checkFlag() {\n    const url = `${BASE}/isissue.txt?alwayrnadomstring=${encodeURIComponent(randomToken())}&v=${encodeURIComponent(randomToken())}`;\n    log("Checking active issue flag", url);\n    const txt = (await fetchText(url)).trim();\n    const active = txt === "1";\n    log("Active issue flag result", { raw: txt, active });\n    return active;\n  }\n\n  async function loadIssue() {\n    const meta = await fetchJson(`${BASE}/knownissues.json?v=${encodeURIComponent(randomToken())}`);\n    log("Loaded issue metadata", meta);\n    const y = meta?.date?.y, m = meta?.date?.m, d = meta?.date?.d, id = meta?.id;\n    const fileUrl = `${BASE}/${y}/${m}/${d}/${id}.json.txt?lastupdate=${encodeURIComponent(b64(meta?.lastupdate || ""))}&v=${encodeURIComponent(slot15())}`;\n    const parsed = parseIssueText(await fetchText(fileUrl));\n    return {\n      title: parsed.title,\n      desc: parsed.desc,\n      bottom_link: parsed.bottom_link,\n      bottom_link_value: parsed.bottom_link_value,\n      date: meta?.date || {},\n      lastupdate: meta?.lastupdate || "",\n      id: String(meta?.id || ""),\n      color: meta?.color || "#DE3163",\n    };\n  }\n\n  async function refresh() {\n    try {\n      log("Refresh start");\n      const active = await checkFlag();\n\n      if (!active) {\n        log("No active issue; keeping banner hidden");\n        hideBanner();\n        closeModal();\n        state.issue = null;\n        state.key = "";\n        localStorage.removeItem(HIDDEN_KEY);\n        return;\n      }\n\n      const issue = await loadIssue();\n      const newKey = issueKey(issue);\n      const cached = loadCache();\n      const changed = !cached || cached.key !== newKey;\n      log("Issue loaded", { newKey, changed, cachedKey: cached?.key || null });\n\n      saveCache({\n        key: newKey,\n        issue,\n        savedAt: new Date().toISOString(),\n      });\n\n      applyIssue(issue);\n      showBanner();\n\n      // Auto-open only when the issue changes (new path/date/id/lastupdate/content).\n      if (changed && (!state.modalOpen || state.key !== newKey)) {\n        log("Issue changed; auto-opening modal");\n        openModal();\n      }\n\n      // If user had hidden the modal before, do not force it open again unless changed.\n      if (!changed && isHidden()) {\n        log("Modal was previously hidden; leaving it closed");\n        closeModal();\n      }\n\n      state.key = newKey;\n      log("Refresh complete", { key: state.key });\n    } catch (e) {\n      error("Known issue refresh failed:", e);\n      const cached = loadCache();\n      if (cached?.issue) {\n        warn("Using cached issue only for fallback state; banner stays hidden until a live active issue is confirmed", { cachedKey: cached.key || issueKey(cached.issue) });\n        state.issue = cached.issue;\n        state.key = cached.key || issueKey(cached.issue);\n      } else {\n        warn("No cached issue available after refresh failure");\n      }\n    }\n  }\n\n  els.btn.addEventListener("click", openModal);\n  els.close.addEventListener("click", closeModal);\n  els.backdrop.addEventListener("click", (e) => {\n    if (e.target === els.backdrop) closeModal();\n  });\n  window.addEventListener("keydown", (e) => {\n    if (e.key === "Escape") closeModal();\n  });\n\n  // Warm cache state without rendering it before live verification.\n  const cached = loadCache();\n  if (cached?.issue) {\n    state.issue = cached.issue;\n    state.key = cached.key || issueKey(cached.issue);\n    log("Cached issue available at startup (not rendered yet)", { cachedKey: state.key });\n  } else {\n    log("No cached issue available at startup");\n  }\n\n  log("Boot complete; waiting for live refresh before showing banner");\n  refresh();\n  setInterval(refresh, POLL_MS);\n})();';
const s = document.createElement("script");
s.innerHTML = knowissuescript;
s.async = true;
document.head.appendChild(s);
// console.log("KNOW ISSUE", s, knowissuescript);
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

function warn_screen(content, type = "alert", title) {
  return new Promise((resolve) => {
    //console.log(content, type, title);
    if (!title) {
      title = getUiHtmlStrng("warn_screen.titlefallback");
    }
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
      justifyContent: "center",
      whiteSpace: "pre-line", // <-- supports \n
      maxHeight: "300px", // <-- scroll area
      overflowY: "auto", // <-- enables scrolling
    });
    body.style.textAlign = "center";
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
let the_image_json = {};
(() => {
  loadingscreenupdate("Starting clock synchronization");
  let useSecureClock = false;
  let serverTimestamp = 0;
  let syncPerf = 0;
  let timezone = "UTC";
  let sha = "abcde";

  const scripts = [
    // "javascript/transclations/assets.js",
    "javascript/clock_ui.js",
    "javascript/jszip.min.js",
    "javascript/defines.js",
    "javascript/witcherpotions.js",
    "javascript/card_skins.js",
    "javascript/cards.js",
    "javascript/bucket.js",
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

        try {
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
        } catch (apiError) {
          console.warn(
            "Failed to fetch time from API, switching to local clock.",
            apiError,
          );
          useSecureClock = false;
          // Set serverTimestamp to local clock time
          serverTimestamp = Date.now();
          loadingscreenupdate("Using local clock due to API failure");
        }
      } else {
        console.warn("Secure clock unavailable, using device clock.");
        useSecureClock = false;
        serverTimestamp = Date.now(); // fallback to local clock
      }
    } catch (e) {
      console.warn("Secure clock unavailable, using device clock.", e);
      useSecureClock = false;
      serverTimestamp = Date.now(); // fallback to local clock
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
    // Script below was compressed and set as variable not function, you can find them in raw form at .fullscripts.js in javascrips directory in github repo!
    // https://github.com/TheRedMineword/GWENT/blob/main/javascript/.fullscripts.js
    const code_setupTimedImages =
      'window.setupTimedImages=async function(e,n,t=!1){t&&console.log("[TimedImages] setupTimedImages() START",{config:e,set_new_image:n,timedCount:e?.timed?.length,moonConfig:e?.moon}),t&&console.log("[TimedImages] Evaluating moon script...");try{window.getMoonBoardTheme=function(e=Date.now(),n=30){const t=864e5,o=Math.PI/180,a=e=>Math.sin(e*o),l=e=>(e%360+360)%360;function i(e,n){const o=e/1236.85,i=o*o,s=i*o,m=s*o;let r=2451550.09765+29.530588853*e+1337e-7*i-15e-8*s+7.3e-10*m;const g=l(2.5534+29.1053567*e-14e-7*i-11e-8*s),c=l(201.5643+385.81693528*e+.0107582*i+1238e-8*s-58e-9*m),d=l(160.7108+390.67050284*e-.0016118*i-227e-8*s+11e-9*m),u=l(124.7746-1.5637558*e+.0020672*i+215e-8*s),I=1-.002516*o-74e-7*i;r+=n?-.40614*a(c)+.17302*I*a(g)+.01614*a(2*c)+.01043*a(2*d)+.00734*I*a(c-g)-.00515*I*a(c+g)+.00209*I*I*a(2*g)-.00111*a(c-2*d)-57e-5*a(c+2*d)+56e-5*I*a(2*c+g)-42e-5*a(3*c)+42e-5*I*a(g+2*d)+38e-5*I*a(g-2*d)-24e-5*I*a(2*c-g)-17e-5*a(u)-7e-5*a(c+2*g)+4e-5*a(2*c-2*d)+4e-5*a(3*g)+3e-5*a(c+g-2*d)+3e-5*a(c+g+2*d)-3e-5*a(c-g+2*d)-2e-5*a(c-g-2*d)-2e-5*a(3*c+g)+2e-5*a(4*c):-.4072*a(c)+.17241*I*a(g)+.01608*a(2*c)+.01039*a(2*d)+.00739*I*a(c-g)-.00514*I*a(c+g)+.00208*I*I*a(2*g)-.00111*a(c-2*d)-57e-5*a(c+2*d)+56e-5*I*a(2*c+g)-42e-5*a(3*c)+42e-5*I*a(g+2*d)+38e-5*I*a(g-2*d)-24e-5*I*a(2*c-g)-17e-5*a(u)-7e-5*a(c+2*g)+4e-5*a(2*c-2*d)+4e-5*a(3*g)+3e-5*a(c+g-2*d)+3e-5*a(2*c+2*d)-3e-5*a(c+g+2*d)+3e-5*a(c-g+2*d)-2e-5*a(c-g-2*d)-2e-5*a(3*c+g)+2e-5*a(4*c);const T=[[299.77,.107408,-325e-6],[251.88,.016321,0],[251.83,26.651886,0],[349.42,36.412478,0],[84.66,18.206239,0],[141.74,53.303771,0],[207.14,2.453732,0],[154.84,7.30686,0],[34.52,27.261239,0],[207.19,.121824,0],[291.34,1.844379,0],[161.72,24.198154,0],[239.56,25.513099,0],[331.55,3.592518,0]],x=[325e-6,165e-6,164e-6,126e-6,11e-5,62e-6,6e-5,56e-6,47e-6,42e-6,4e-5,37e-6,35e-6,23e-6];for(let n=0;n<T.length;n++)r+=x[n]*a(T[n][0]+T[n][1]*e+T[n][2]*i);return(r-2440587.5)*t}const s=e/t+2440587.5,m=Math.round((s-2451550.09765)/29.530588853),r=36e5*n,g=[{type:"new",time:i(m,!1)},{type:"new",time:i(m+1,!1)},{type:"full",time:i(m-.5,!0)},{type:"full",time:i(m+.5,!0)}].map(e=>{const n=e.time-r,t=e.time+r;return{...e,start:n,end:t}}).sort((e,n)=>e.start-n.start),c=g.find(n=>e>=n.start&&e<=n.end),d=g.find(n=>n.start>e);return c?{active:!0,type:c.type,event:new Date(c.time).toISOString(),start:new Date(c.start).toISOString(),end:new Date(c.end).toISOString(),eventUnix:Math.round(c.time),startUnix:Math.round(c.start),endUnix:Math.round(c.end),nextType:d?d.type:null,nextEvent:d?new Date(d.time).toISOString():null,nextStart:d?new Date(d.start).toISOString():null,nextEnd:d?new Date(d.end).toISOString():null,nextEventUnix:d?Math.round(d.time):null,nextStartUnix:d?Math.round(d.start):null,nextEndUnix:d?Math.round(d.end):null}:{active:!1,type:null,event:null,start:null,end:null,eventUnix:null,startUnix:null,endUnix:null,nextType:d?d.type:null,nextEvent:d?new Date(d.time).toISOString():null,nextStart:d?new Date(d.start).toISOString():null,nextEnd:d?new Date(d.end).toISOString():null,nextEventUnix:d?Math.round(d.time):null,nextStartUnix:d?Math.round(d.start):null,nextEndUnix:d?Math.round(d.end):null}},t&&console.log("[TimedImages] Moon script evaluated successfully")}catch(e){throw t&&console.error("[TimedImages] Moon script evaluation FAILED",e),e}let o={active:!1,type:null,event:null,start:null,end:null,eventUnix:null,startUnix:null,endUnix:null,nextType:null,nextEvent:null,nextStart:null,nextEnd:null},a=null;try{const n=Clock.now();t&&console.log("[TimedImages] Initial getMoonBoardTheme()",{now:n,runbefore:e.moon.runbefore}),o=window.getMoonBoardTheme(n,e.moon.runbefore),t&&console.log("[TimedImages] Initial moon result",o)}catch(e){a=e,t&&console.error("[TimedImages] Initial getMoonBoardTheme() FAILED",e)}t&&console.log("[TimedImages] INIT Board themes: setupTimedImages",{config:e,set_new_image:n,moon:o,evalError:a});let l=null,i=null;async function s(t=!1){t&&console.group("[TimedImages] apply()");try{l&&(t&&console.log("[TimedImages] Clearing existing timer",l),clearTimeout(l),l=null);const a=Clock.now();t&&console.log("[TimedImages] Current time",{now:a,date:new Date(a).toISOString(),currentContent:i});let m=null,r=1/0;t&&console.group("[TimedImages] Checking timed items");for(const[n,o]of e.timed.entries()){const e=Date.parse(o.start),l=Date.parse(o.end),i=a>=e&&a<l,s=a<e;t&&console.log(`[TimedImages] Item #${n}`,{item:o,start:e,startDate:isNaN(e)?"INVALID DATE":new Date(e).toISOString(),end:l,endDate:isNaN(l)?"INVALID DATE":new Date(l).toISOString(),isActive:i,isFuture:s}),i?(m=o,t&&console.log(`[TimedImages] Item #${n} is ACTIVE`,{content:o.content,end:l}),l<r&&(r=l,t&&console.log("[TimedImages] nextChange updated from active item",{nextChange:r,nextChangeDate:new Date(r).toISOString()}))):s&&e<r&&(r=e,t&&console.log("[TimedImages] nextChange updated from future item",{nextChange:r,nextChangeDate:new Date(r).toISOString()}))}t&&console.groupEnd(),t&&console.log("[TimedImages] Timed item selection complete",{active:m,nextChange:r,nextChangeDate:r!==1/0?new Date(r).toISOString():null}),t&&console.group("[TimedImages] Moon calculation"),t&&console.log("[TimedImages] Calling getMoonBoardTheme()",{now:a,runbefore:e.moon.runbefore});try{o=window.getMoonBoardTheme(a,e.moon.runbefore),t&&console.log("[TimedImages] Moon result",o)}catch(e){t&&console.error("[TimedImages] getMoonBoardTheme() FAILED",e),o={active:!1,type:null,event:null,start:null,end:null,eventUnix:null,startUnix:null,endUnix:null,nextType:null,nextEvent:null,nextStart:null,nextEnd:null}}let g=!1;if(o.active&&o.type){g=!0;const n=e.moon[o.type];t&&console.log("[TimedImages] Moon is ACTIVE",{type:o.type,event:o.event,start:o.start,end:o.end,eventUnix:o.eventUnix,startUnix:o.startUnix,endUnix:o.endUnix,moonContent:n}),n?(m={content:n,__moon:!0},t&&console.log("[TimedImages] Moon content selected",{type:o.type,content:n})):t&&console.warn("[TimedImages] Moon is active but no content exists",{type:o.type,availableMoonKeys:Object.keys(e.moon)}),null!=o.endUnix&&o.endUnix<r&&(r=o.endUnix,t&&console.log("[TimedImages] nextChange updated from moon end",{nextChange:r,nextChangeDate:new Date(r).toISOString()}))}else if(o.nextStart){const e=Date.parse(o.nextStart);t&&console.log("[TimedImages] Moon inactive",{nextStart:o.nextStart,nextStartUnix:e,nextStartDate:isNaN(e)?"INVALID DATE":new Date(e).toISOString()}),!isNaN(e)&&e<r&&(r=e,console.log("[TimedImages] nextChange updated from next moon start",{nextChange:r,nextChangeDate:new Date(r).toISOString()}))}else t&&console.log("[TimedImages] Moon inactive and has no nextStart");t&&console.groupEnd();const c=m?e.images[m.content]:e.fallback,d=g?"__moon_"+o.type:m?m.content:"__fallback__";if(t&&console.log("[TimedImages] Content selection",{active:m,moonActive:g,moonType:o.type,contentKey:d,previousContent:i,changed:d!==i,images:c}),c||t&&console.error("[TimedImages] NO IMAGES FOUND FOR CONTENT",{contentKey:d,active:m,moonActive:g,moonType:o.type,availableImageKeys:Object.keys(e.images||{})}),c&&d!==i){t&&console.log("[TimedImages] Content CHANGED - applying images",{from:i,to:d}),i=d;for(const[e,o]of Object.entries(c))if(t&&console.log("[TimedImages] Processing image entry",{key:e,path:o}),"_animate"!==e&&"_theme"!==e){if("board"===e){t&&console.log("[TimedImages] Updating board background",{animation:c._animate});try{await setBackground(c._animate),t&&console.log("[TimedImages] setBackground() completed")}catch(e){t&&console.error("[TimedImages] setBackground() FAILED",e)}}t&&console.log("[TimedImages] Calling set_new_image()",{key:e,path:o});try{n(e,o),t&&console.log("[TimedImages] set_new_image() completed",{key:e})}catch(n){t&&console.error("[TimedImages] set_new_image() FAILED",{key:e,path:o,error:n})}}else if("_theme"===e){t&&console.log("[TimedImages] Applying dynamic CSS",{theme:c._theme});const e=generateCSS(c._theme),n=document.getElementById("dynamic-css");n?(n.textContent=e,t&&console.log("[TimedImages] Dynamic CSS applied",{cssLength:e?.length})):t&&console.error("[TimedImages] #dynamic-css element NOT FOUND")}}else c?t&&console.log("[TimedImages] Content unchanged - no image update",{contentKey:d,currentContent:i}):t&&console.warn("[TimedImages] Skipping image application because images is missing");if(r!==1/0){const e=Clock.now(),n=Math.max(0,r-e),o=2147483647,a=Math.min(n,o);t&&console.log("[TimedImages] Scheduling next apply()",{nextChange:r,nextChangeDate:new Date(r).toISOString(),clockNow:e,clockNowDate:new Date(e).toISOString(),delay:n,actualDelay:a,delayMinutes:a/1e3/60}),l=setTimeout(s,a),t&&console.log("[TimedImages] Timer scheduled",{timer:l})}else t&&console.log("[TimedImages] No next change - no timer scheduled")}catch(e){t&&console.error("[TimedImages] apply() UNHANDLED ERROR",e)}finally{t&&console.log("[TimedImages] apply() END",{currentContent:i,timer:l}),t&&console.groupEnd()}}return t&&console.log("[TimedImages] Calling initial apply()"),await s(t),t&&console.log("[TimedImages] setupTimedImages() READY",{currentContent:i,timer:l}),{refresh:s(t),destroy(){t&&console.log("[TimedImages] destroy()",{timer:l,currentContent:i}),l&&(clearTimeout(l),l=null,t&&console.log("[TimedImages] Timer cleared"))}}};';
    console.warn(`code_setupTimedImages === \"${code_setupTimedImages}\"`);
    new Function(code_setupTimedImages)();
    //window.setupTimedImages();

    const watcher = window.setupTimedImages(
      the_image_json,
      (key, path) => {
        set_new_image(key, path);
      },
      the_image_json.debug,
    );
    loadingscreenupdate("Loading languages...");
    await initlng(sha);
    await loadScriptEval(`javascript/translations/strings/en.js?ver=${sha}`);
    await loadScriptEval(`javascript/translations/strings/pl.js?ver=${sha}`);
    await loadScriptEval(`javascript/translations/strings/END.js?ver=${sha}`);

    translate_ui_hub();
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
