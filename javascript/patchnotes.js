"use strict";
// (function () {
const ICON_BASE_PATH = "img/patchnotes/";

const UI_TEXT = {
  expires_prefix: "Expires in ",
  expired_text: "<l>UPDATING PATCH NOTES…</l>",
  deck_loading_text: "Downloading…",
  deck_error_text: "Failed to load, try again",
  deck_empty_text: "No new notices.",
};

const DEFAULTS = {
  small_text: {
    text: "NEWS / PATCHNOTES",
  },

  box: {
    lines_outline_hex: "#debf81",
  },

  button: {
    name: "CONTINUE",
  },

  load: {
    text: "<l>INCOMING MESSAGE</l>",
    duration_ms: "3000",
  },

  images: {
    logo: "",
    banner: "",
  },
};

const ICON_SIZES = {
  patch_icon_px: 28, // generic inline icon (deck rows, box header, timer icon...)
  bell_icon_px: 26, // icon inside the floating bell button
  bell_button_px: 52, // diameter of the floating bell button itself
};

let SHOW_BELL_BUTTON = true;

function setPatchnotesVisible(visible) {
  SHOW_BELL_BUTTON = visible;

  const bell = document.getElementById("patch-bell");
  const panel = document.getElementById("patch-deck-panel");

  if (bell) {
    bell.style.display = visible ? "flex" : "none";
  }

  if (panel) {
    panel.style.display = visible ? "" : "none";
  }
}

const Z_INDEX = {
  overlay: 2147483647, // the full patch-note/news modal
  bell: 2147483000, // the floating bell button
  deck_panel: 2147483000, // the inbox/deck panel
};

const SEEN_STORAGE_KEY = "patchnotes_seen_v2";

function loadSeenMap() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveSeenMap(map) {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("Patch notes: failed to persist seen state:", e);
  }
}

function isSeen(id) {
  return !!loadSeenMap()[id];
}

function markSeen(id) {
  const map = loadSeenMap();
  map[id] = true;
  saveSeenMap(map);
}

function cacheBust() {
  return Date.now().toString(36);
}

function deepMerge(target, source) {
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};

      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }

  return target;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function iconUrl(iconId) {
  return `${ICON_BASE_PATH}${iconId}.svg`;
}

function iconImg(iconId, alt = "", fallbackId = null) {
  if (!iconId) return "";

  const onerror = fallbackId
    ? `this.onerror=function(){this.style.display='none'};this.src='${iconUrl(fallbackId)}'`
    : `this.style.display='none'`;

  return `<img class="patch-icon" width="${ICON_SIZES.patch_icon_px}" height="${ICON_SIZES.patch_icon_px}" src="${iconUrl(iconId)}" alt="${escapeHtml(alt)}" onerror="${onerror}">`;
}

let always_full_timer_in_patchnotes = true;

let timerAnimationFrame = 0;
const timerAnimation = ["|", "/", "-", "\\"];

function formatCountdown(ms) {
  if (ms <= 0) return "0s";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (always_full_timer_in_patchnotes) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;

  return `${seconds}s`;
}

function parsePatchNotes(text) {
  const result = {};

  const regex = /<([\w.]+)>\s*([\s\S]*?)\s*<\/\1>/g;

  let match;

  while ((match = regex.exec(text)) !== null) {
    const path = match[1].split(".");
    const value = match[2];

    let current = result;

    while (path.length > 1) {
      const key = path.shift();

      if (!current[key]) current[key] = {};

      current = current[key];
    }

    current[path[0]] = value;
  }
  var returnss = deepMerge(clone(DEFAULTS), result);
  console.log("patch notes", text, returnss);
  return returnss;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatInline(text) {
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  text = text.replace(/_(.+?)_/g, "<em>$1</em>");

  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label, href) =>
      `<a class="patch-link" href="${href}" target="_blank" rel="noopener">${label}</a>`,
  );

  // <color=#hex>text</color>
  text = text.replace(
    /&lt;color=(#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8})&gt;([\s\S]*?)&lt;\/color&gt;/g,
    '<span style="color:$1 !important;"><span style="color:inherit !important;">$2</span></span>',
  );

  return text;
}

function formatPatchText(text) {
  text = escapeHtml(text);

  const lines = text.replace(/\r/g, "").split("\n");

  let html = "";

  let inList = false;
  let inCode = false;
  let codeLang = "";

  function closeList() {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  }
  function unescape(text) {
    return text.replace(/\\(.)/g, "$1");
  }

  for (let line of lines) {
    const raw = line;
    line = unescape(line);
    if (line === escapeHtml("<fat1>")) {
      closeList();
      html += '<div class="patch-gap-1"></div>';
      continue;
    }

    if (line === escapeHtml("<fat2>")) {
      closeList();
      html += '<div class="patch-gap-2"></div>';
      continue;
    }

    if (line === escapeHtml("<fat3>")) {
      closeList();
      html += '<div class="patch-gap-3"></div>';
      continue;
    }

    const imgRegex = /%%img\s+src="([^"]+)"(?:\s+style="([^"]*)")?\s*%%/g;

    const imgMatches = [...raw.matchAll(imgRegex)];

    if (imgMatches.length > 0) {
      closeList();

      for (const m of imgMatches) {
        const src = m[1];
        const style = m[2] || "";

        html += `<img src="${src}" style="${style}" alt="">`;
      }

      continue;
    }
    // %%video
    {
      const regex =
        /%%video\s+src="([^"]+)"(?:\s+style="([^"]*)")?((?:\s+\w+)*)\s*%%/g;

      const matches = [...raw.matchAll(regex)];

      if (matches.length) {
        closeList();

        for (const m of matches) {
          const src = m[1];
          const style = m[2] || "";
          const flags = m[3] || "";

          const attrs = [];

          if (flags.includes("controls")) attrs.push("controls");
          if (flags.includes("autoplay")) attrs.push("autoplay");
          if (flags.includes("muted")) attrs.push("muted");
          if (flags.includes("loop")) attrs.push("loop");
          if (flags.includes("playsinline")) attrs.push("playsinline");

          html += `<video src="${src}" style="${style}" ${attrs.join(" ")}></video>`;
        }

        continue;
      }
    }
    // %%audio
    {
      const regex =
        /%%audio\s+src="([^"]+)"(?:\s+style="([^"]*)")?((?:\s+\w+)*)\s*%%/g;

      const matches = [...raw.matchAll(regex)];

      if (matches.length) {
        closeList();

        for (const m of matches) {
          const src = m[1];
          const style = m[2] || "";
          const flags = m[3] || "";

          const attrs = [];

          if (flags.includes("controls")) attrs.push("controls");
          if (flags.includes("autoplay")) attrs.push("autoplay");
          if (flags.includes("loop")) attrs.push("loop");
          if (flags.includes("muted")) attrs.push("muted");

          html += `<audio src="${src}" style="${style}" ${attrs.join(" ")}></audio>`;
        }

        continue;
      }
    }
    // ``` blocks
    if (line.startsWith("```")) {
      if (!inCode) {
        closeList();

        codeLang = line.substring(3).trim();

        inCode = true;

        if (codeLang === "diff") {
          html += '<div class="patch-code">';
        } else {
          html += '<pre class="patch-code"><code>';
        }
      } else {
        if (codeLang === "diff") {
          html += "</div>";
        } else {
          html += "</code></pre>";
        }

        inCode = false;
        codeLang = "";
      }

      continue;
    }

    if (inCode) {
      if (codeLang === "diff") {
        if (line.startsWith("+")) {
          html += `<div class="patch-add">${formatInline(line)}</div>`;
        } else if (line.startsWith("---")) {
          html += `<div class="patch-modify">${formatInline(line)}</div>`;
        } else if (line.startsWith("-")) {
          html += `<div class="patch-remove">${formatInline(line)}</div>`;
        } else if (line.startsWith("?")) {
          html += `<div class="patch-rebalnce">${formatInline(line)}</div>`;
        } else {
          html += `<div>${formatInline(line)}</div>`;
        }
      } else {
        html += line + "\n";
      }

      continue;
    }

    if (!line.trim()) {
      closeList();
      html += "<br>";
      continue;
    }

    if (line.startsWith("# ")) {
      closeList();
      html += `<div class="patch-h1">${formatInline(line.substring(2))}</div>`;
      continue;
    }

    if (line.startsWith("## ")) {
      closeList();
      html += `<div class="patch-h2">${formatInline(line.substring(3))}</div>`;
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      html += `<div class="patch-h3">${formatInline(line.substring(4))}</div>`;
      continue;
    }

    if (line.startsWith("-# ")) {
      closeList();
      html += `<div class="patch-small">${formatInline(line.substring(3))}</div>`;
      continue;
    }

    if (line.startsWith("> ")) {
      closeList();
      html += `<div class="patch-quote">${formatInline(line.substring(2))}</div>`;
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }

      html += `<li>${formatInline(line.substring(2))}</li>`;
      continue;
    }

    closeList();

    html += `<p>${formatInline(line)}</p>`;
  }

  closeList();
  html = html.replaceAll("!new!", '<span class="new-badge">NEW</span>');
  html = html.replace(/!time:([^!]+)!/g, (_, iso) => {
    const d = new Date(iso);

    if (isNaN(d)) return iso;

    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  });
  return html;
}

function installStyles(color) {
  let style = document.getElementById("patchnotes-style");

  if (!style) {
    style = document.createElement("style");
    style.id = "patchnotes-style";
    document.head.appendChild(style);
  }

  style.textContent = `
.new-badge {
  display: inline-block;
  padding: 1px 6px;
  margin: 0 3px;
  border-radius: 999px;
  background: #5d8fb3;
  color: #eef8ff;
  font-size: 0.72em;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  box-shadow: 0 0 4px rgba(93, 143, 179, 0.35);
}

.diff-add{ color:#6BCB77; font-weight:bold; }
.diff-modify{ color:#e5a84b; font-weight:bold; }
.diff-remove{ color:#ff6b6b; font-weight:bold; }

.briefing-overlay{
position:fixed;
inset:0;
display:flex;
justify-content:center;
align-items:center;
background:rgba(0,0,0,.88);
backdrop-filter:blur(4px);
z-index:${Z_INDEX.overlay};
font-family:Arial,Helvetica,sans-serif;
}

.briefing-overlay *{
box-sizing:border-box;
font-family:inherit;
}

.briefing-loader{
display:flex;
flex-direction:column;
gap:12px;
min-width:420px;
padding:24px 40px;
background:#090909;
border:1px solid ${color};
border-radius:10px;
box-shadow:0 0 25px ${color};
text-align:center;
font-size:20px;
font-weight:600;
color:#fff;
}

.briefing-loader hr{
margin:0;
border:0;
height:1px;
background:${color};
}

.briefing-box{
position:relative;
width:min(900px,90vw);
max-height:85vh;
overflow:hidden;
display:flex;
flex-direction:column;
background:#090909;
border:1px solid ${color};
border-radius:14px;
box-shadow:
0 0 30px ${color},
0 0 70px rgba(0,0,0,.8);
color:#fff;
}

.briefing-box--fullscreen{
width:100vw;
height:100vh;
max-height:100vh;
border-radius:0;
}

.briefing-small-text-box{
position:absolute;
top:24px;
right:20px;
transform:translateY(-50%);
padding:5px 14px;
background:#090909;
border:1px solid ${color};
border-radius:999px;
font-size:12px;
font-weight:bold;
letter-spacing:1px;
text-transform:uppercase;
color:${color};
z-index:10;
}

.briefing-banner{
display:block;
width:100%;
max-height:240px;
object-fit:cover;
background:#111;
border-bottom:1px solid ${color};
}

.briefing-header{
display:flex;
align-items:center;
gap:18px;
padding:18px 24px;
border-bottom:1px solid ${color};
}

.briefing-logo{
width:64px;
height:64px;
object-fit:contain;
flex:none;
}

.briefing-title-block{
flex:1;
min-width:0;
display:flex;
flex-direction:column;
gap:6px;
}

.briefing-title-row{
display:flex;
align-items:center;
justify-content:space-between;
gap:14px;
}

.briefing-title{
font-size:34px;
font-weight:700;
line-height:1.1;
color:#fff;
min-width:0;
}

.briefing-expiry-row{
display:flex;
align-items:center;
justify-content:space-between;
gap:8px;
font-size:13px;
letter-spacing:.02em;
opacity:.75;
color:#fff;
}

.briefing-scrollable-text{
flex:1;
overflow-y:auto;
padding:24px;
    font-size:16px;
    line-height:1.35;
color:#fff;
word-break:break-word;
white-space:normal;
}

.briefing-scrollable-text p{
    margin:0 0 2px;
    line-height:inherit;
}

.briefing-scrollable-text::-webkit-scrollbar{
width:8px;
}

.briefing-scrollable-text::-webkit-scrollbar-thumb{
background:${color};
border-radius:99px;
}

.briefing-scrollable-text::-webkit-scrollbar-track{
background:#111;
}

.briefing-footer{
display:flex;
justify-content:flex-end;
padding:20px 24px;
border-top:1px solid ${color};
}

.briefing-button{
appearance:none;
border:0;
outline:0;
padding:12px 28px;
background:${color};
color:#111;
font-size:16px;
font-weight:700;
border-radius:8px;
cursor:pointer;
transition:.2s;
}

.briefing-button:active{
transform:none;
}

/* ---------- Inbox / deck ---------- */

.patch-icon{
width:${ICON_SIZES.patch_icon_px}px;
height:${ICON_SIZES.patch_icon_px}px;
min-width:${ICON_SIZES.patch_icon_px}px;
min-height:${ICON_SIZES.patch_icon_px}px;
object-fit:contain;
flex:0 0 auto;
display:inline-block;
z-index: -100;
}

.patch-bell{
position:fixed;
right:20px;
bottom:20px;
width:${ICON_SIZES.bell_button_px}px;
height:${ICON_SIZES.bell_button_px}px;
min-width:${ICON_SIZES.bell_button_px}px;
min-height:${ICON_SIZES.bell_button_px}px;
border-radius:50%;
background:#090909;
border:1px solid ${color};
box-shadow:0 0 16px ${color};
display:flex;
align-items:center;
justify-content:center;
cursor:pointer;
z-index:${Z_INDEX.bell};
}

.patch-bell img{
width:${ICON_SIZES.bell_icon_px}px;
height:${ICON_SIZES.bell_icon_px}px;
min-width:${ICON_SIZES.bell_icon_px}px;
min-height:${ICON_SIZES.bell_icon_px}px;
}

.patch-bell-badge{
position:absolute;
top:-4px;
right:-4px;
min-width:18px;
height:18px;
padding:0 4px;
border-radius:999px;
background:#ff4d4d;
color:#fff;
font-size:11px;
font-weight:700;
align-items:center;
justify-content:center;
box-shadow:0 0 6px rgba(255,77,77,.8);
}

.patch-deck-panel{
position:fixed;
right:20px;
bottom:calc(20px + ${ICON_SIZES.bell_button_px}px + 12px);
width:min(360px,90vw);
max-height:60vh;
overflow-y:auto;
background:#090909;
border:1px solid ${color};
border-radius:12px;
box-shadow:0 0 24px rgba(0,0,0,.7);
z-index:${Z_INDEX.deck_panel};
padding:8px;
display:none;
}

.patch-deck-panel.open{
display:block;
}

.patch-deck-empty{
padding:16px;
text-align:center;
opacity:.6;
font-size:13px;
color:#fff;
}

.patch-deck-item{
padding:10px 12px;
border-radius:8px;
margin-bottom:6px;
background:rgba(255,255,255,.03);
border:1px solid transparent;
cursor:pointer;
transition:background .15s, border-color .15s;
}

.patch-deck-item:hover{
background:rgba(255,255,255,.07);
border-color:${color};
}

.patch-deck-item-top{
display:flex;
align-items:center;
justify-content:space-between;
gap:8px;
}

.patch-deck-item-title{
font-size:14px;
font-weight:600;
color:#fff;
display:flex;
align-items:center;
gap:6px;
min-width:0;
}

.patch-deck-item-title span{
overflow:hidden;
text-overflow:ellipsis;
white-space:nowrap;
}

.patch-deck-dot{
width:8px;
height:8px;
border-radius:50%;
background:#ff4d4d;
box-shadow:0 0 6px rgba(255,77,77,.9);
flex:none;
}

.patch-deck-item-sub{
display:flex;
align-items:center;
justify-content:space-between;
margin-top:4px;
font-size:11px;
opacity:.7;
color:#fff;
}

/* ---------- Markdown ---------- */

.patch-h1{
 margin:0 0 8px;
font-size:34px;
font-weight:700;
color:${color};
}

.patch-h2{
margin:10px 0 4px;
font-size:27px;
font-weight:700;
color: ${color};
}

.patch-h3{
margin:8px 0 3px;
font-size:21px;
font-weight:700;
color: ${color};
}

.patch-small{
margin:2px 0;
font-size:12px;
opacity:.65;
font-style:italic;
}

.patch-quote{
margin:6px 0;
padding-left:14px;
border-left:3px solid ${color};
opacity:.85;
font-style:italic;
}

.patch-link{
color:#7cb9ff;
text-decoration:none;
}

.patch-link:hover{
text-decoration:underline;
}

.patch-add{
color:#77dd77;
font-weight:bold;
margin:1px 0;
    line-height:1.35;
}

.patch-modify{
color:#f2b24d;
font-weight:bold;
margin:1px 0;
    line-height:1.35;
}

.patch-remove{
color:#ff7373;
font-weight:bold;
margin:1px 0;
    line-height:1.35;
}
.patch-rebalnce{
color:#8FD3FF;
font-weight:bold;
margin:1px 0;
    line-height:1.35;
}
.briefing-scrollable-text ul{
    margin:2px 0;
    padding-left:22px;
}

.briefing-scrollable-text li{
    margin:0;
    line-height:1.35;
}

.patch-code{
margin:14px 0;
padding:14px;
background:#111;
border:1px solid #333;
border-radius:8px;
font-family:Consolas,monospace;
white-space:pre-wrap;
}

.patch-gap-1{ height:6px; }
.patch-gap-2{ height:12px; }
.patch-gap-3{ height:20px; }

.patch-color,
.patch-color * {
    color: inherit !important;
}
`;
}

function getWindow(entry, fromKey = "from", untilKey = "until") {
  const from = entry[fromKey] ? new Date(entry[fromKey]).getTime() : -Infinity;
  const until = entry[untilKey]
    ? new Date(entry[untilKey]).getTime()
    : Infinity;
  return { from, until };
}

function resolveIndex(index) {
  const now = Clock.now();
  const patchnoteCandidates = [];
  const newsCandidates = [];
  let nextChange = Infinity;

  const base = index?.patchnotes?.base;
  if (base && base.id) {
    patchnoteCandidates.push({
      type: "patchnote",
      text: base?.text ?? false,
      kind: "base",
      id: base.id,
      weight: base.weight ?? 0,
      icon: base.icon || "patchnote",
      title: base.title || base.id,
      display: base.display || "modal",
      showCountdown: false,
      until: Infinity,
    });
  }

  let activeTimed = null;
  if (Array.isArray(index?.patchnotes?.timed)) {
    for (const timed of index.patchnotes.timed) {
      const { from, until } = getWindow(timed);

      if (now >= from && now <= until) {
        if (!activeTimed || (timed.weight ?? 0) > (activeTimed.weight ?? 0)) {
          activeTimed = timed;
        }
      } else if (from > now) {
        nextChange = Math.min(nextChange, from);
      }

      if (until !== Infinity && until > now) {
        nextChange = Math.min(nextChange, until + 1);
      }
    }
  }

  if (activeTimed) {
    const timedUntil = getWindow(activeTimed).until;

    patchnoteCandidates.push({
      type: "patchnote",
      text: activeTimed?.text ?? false,
      kind: "timed",
      id: activeTimed.id,
      weight: activeTimed.weight ?? 0,
      icon: activeTimed.icon || "patchnote",
      title: activeTimed.title || activeTimed.id,
      display: activeTimed.display || "modal",
      showCountdown: timedUntil !== Infinity, // shows a countdown if it actually expires
      until: timedUntil,
    });
  }

  if (Array.isArray(index?.news)) {
    for (const news of index.news) {
      const { from: start, until: end } = getWindow(news, "start", "end");

      if (now >= start && now <= end) {
        newsCandidates.push({
          type: "news",
          kind: "news",
          id: news.id,
          text: news?.text ?? false,
          weight: news.weight ?? 0,
          icon: news.icon || "news",
          title: news.title || news.id,
          display: news.display || "modal",
          autodisplay: !!news.autodisplay,
          showCountdown: end !== Infinity,
          until: end,
        });

        if (end !== Infinity && end > now) {
          nextChange = Math.min(nextChange, end + 1);
        }
      } else if (start > now) {
        nextChange = Math.min(nextChange, start);
      }
    }
  }

  return { patchnoteCandidates, newsCandidates, nextChange };
}

function pickAutoDisplay(patchnoteCandidates, newsCandidates) {
  //  console.error("pickAutoDisplay", patchnoteCandidates, newsCandidates)
  try {
    const eligible = [
      ...patchnoteCandidates.filter((n) => !(loadSeenMap()?.[n.id] ?? false)),
      ...newsCandidates.filter(
        (n) => n.autodisplay && !(loadSeenMap()?.[n.id] ?? false),
      ),
    ];
    //console.warn(eligible);
    if (!eligible.length) return null;

    eligible.sort((a, b) => b.weight - a.weight);
    return eligible[0];
  } catch (e) {
    console.error(e);
  }
}

async function fetchEntryText(id, asText) {
  let url = `https://theredmineword.github.io/GWENT/change/log-${id}.txt.bin`;

  if (
    window.location.host === "localhost:8080" ||
    window.location.host === "localhost:8081"
  ) {
    url = `change/log-${id}.txt.bin`;
  }

  try {
    const res = await fetch(url);

    console.log("fetch:", url, res.status, res.ok, asText);

    if (!res.ok) {
      throw new Error(`Failed to fetch log-${id}: HTTP ${res.status}`);
    }

    if (asText) {
      console.log("reading response as text...");

      const text = await res.text();

      console.log("text received:", text.length, "chars");

      return text;
    }

    console.log("reading response as arrayBuffer...");

    const buffer = await res.arrayBuffer();

    console.log("arrayBuffer received:", buffer.byteLength, "bytes");

    const bytes = new Uint8Array(buffer);

    const base64 = btoa(
      Array.from(bytes, (b) => String.fromCharCode(b)).join(""),
    );

    console.log("base64 created:", base64.length, "chars");
    console.log("calling decompressBase64...");

    const result = await decompressBase64(base64);

    console.log("decompressBase64 succeeded");

    return result;
  } catch (err) {
    console.error(`fetchEntryText(${id}) failed:`, err);
    throw err;
  }
}

async function fetchEntryData(id, asText) {
  const text = await fetchEntryText(id, asText);
  // console.warn(parsePatchNotes(text));
  return parsePatchNotes(text);
}

let openBoxEntry = null;
let boxCountdownInterval = null;

function stopBoxCountdown() {
  if (boxCountdownInterval) clearInterval(boxCountdownInterval);
  boxCountdownInterval = null;
}

function closeOverlay(overlay) {
  stopBoxCountdown();
  openBoxEntry = null;
  overlay.remove();
}

function startBoxCountdown(overlay, entry) {
  stopBoxCountdown();

  boxCountdownInterval = setInterval(() => {
    const now = Clock.now();
    const remaining = entry.until - now;
    const textEl = overlay.querySelector("[data-expiry-text]");

    if (remaining <= 0) {
      stopBoxCountdown();

      if (textEl) textEl.innerHTML = UI_TEXT.expired_text;

      onPatchnoteEvent("entry_expired", entry);

      setTimeout(async () => {
        closeOverlay(overlay);
        await reloadIndexAndRefresh();
      }, 1200);

      return;
    }

    if (textEl) {
      textEl.textContent = `${UI_TEXT.expires_prefix}${formatCountdown(remaining)}`;
    }
  }, 1000);
}

function wireBoxInteractions(overlay, data) {
  const doClose = () => closeOverlay(overlay);

  if (`${data?.restart ?? false}` === "true") {
    overlay.querySelector(".briefing-button").onclick = () => {
      doClose();

      requestAnimationFrame(async () => {
        console.log(
          location.hostname,
          `${location.hostname === "localhost"}`,
          location.port,
          `${location.port === "1111"}`,
        );
        var doit = true;
        if (location.hostname === "localhost" && location.port === "1111") {
          console.log(doit);
          try {
            console.log("Post because 1111");
            await fetch("http://localhost:1111/local-api/restart", {
              method: "POST",
            });
            console.log("Screen beacuse 1111");
            showBrickScreen();
            doit = false;
          } catch (err) {
            console.warn("Local restart request failed:", err);
          }
        }
        if (doit) {
          console.log("Reloading");
          location.reload();
        }
      });
    };
  } else {
    overlay.querySelector(".briefing-button").onclick = doClose;
  }

  document.querySelectorAll("video[data-src]").forEach((video) => {
    const src = video.dataset.src;

    if (src.endsWith(".m3u8")) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else if (window.Hls && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
      }
    } else {
      video.src = src;
    }
  });
}

function renderBox(overlay, entry, data) {
  openBoxEntry = entry;

  const now = Clock.now();
  const fullscreenClass =
    entry.display === "fullscreen" ? " briefing-box--fullscreen" : "";
  const title = data.box.title || entry.title || "";

  overlay.innerHTML = `
<div class="briefing-box${fullscreenClass}">

<div class="briefing-small-text-box">
${data.small_text.text}
</div>

${data.images.banner ? `<img class="briefing-banner" src="${data.images.banner}">` : ""}

<div class="briefing-header">

${data.images.logo ? `<img class="briefing-logo" src="${data.images.logo}">` : ""}

<div class="briefing-title-block">
  <div class="briefing-title-row">
    <div class="briefing-title">${title}</div>
    ${iconImg(entry.icon, title, entry.type === "news" ? "news" : "patchnote")}
  </div>
  ${
    entry.showCountdown
      ? `<div class="briefing-expiry-row">
    <span data-expiry-text>${UI_TEXT.expires_prefix}${formatCountdown(entry.until - now)}</span>
  </div>`
      : ""
  }
</div>

</div>

<div class="briefing-scrollable-text">
${formatPatchText(data.box.text)}
</div>

<button class="briefing-button">
${data.button.name}
</button>

</div>
`;

  wireBoxInteractions(overlay, data);

  if (entry.showCountdown && entry.until !== Infinity) {
    startBoxCountdown(overlay, entry);
  }
}

async function presentEntry(entry, { fromAuto = false, rowEl = null } = {}) {
  console.log("presentEntry", entry, { fromAuto, rowEl });
  try {
    onPatchnoteEvent(fromAuto ? "auto_display" : "manual_open", entry);

    if (rowEl) setRowLoading(rowEl, true);

    const data = await fetchEntryData(entry.id, entry?.text ?? false);

    if (rowEl) setRowLoading(rowEl, false);

    installStyles(data.box.lines_outline_hex);

    const overlay = document.createElement("div");
    overlay.className = "briefing-overlay";
    document.body.appendChild(overlay);

    if (fromAuto) {
      overlay.innerHTML = `
<div class="briefing-loader">
<hr>
<div>${data.load.text}</div>
<hr>
</div>
`;
      await new Promise((resolve) =>
        setTimeout(resolve, parseInt(data.load.duration_ms, 10) || 3000),
      );
    }

    renderBox(overlay, entry, data);

    //   if (fromAuto) {
    markSeen(entry.id);
    //  }
    renderDeck();

    onPatchnoteEvent(
      entry.type === "news" ? "news_seen" : "patchnote_seen",
      entry,
    );
  } catch (e) {
    console.error("Patch notes: failed to present entry", entry?.id, e);
    if (rowEl) setRowLoading(rowEl, false, true);
  }
}

let DECK_POOL = [];
let deckTickInterval = null;

function ensureDeckUI() {
  if (!document.getElementById("patchnotes-style")) {
    installStyles(DEFAULTS.box.lines_outline_hex);
  }

  if (SHOW_BELL_BUTTON && !document.getElementById("patch-bell")) {
    const bell = document.createElement("div");
    bell.id = "patch-bell";
    bell.className = "patch-bell";
    bell.innerHTML = `${iconImg("bell", "notifications")}<span id="patch-bell-badge" class="patch-bell-badge" style="display:none;"></span>`;
    bell.onclick = toggleDeck;

    document.body.appendChild(bell);
  }

  if (document.getElementById("patch-deck-panel")) return;

  const panel = document.createElement("div");
  panel.id = "patch-deck-panel";
  panel.className = "patch-deck-panel";
  panel.innerHTML = `<div id="patch-deck-list"></div>`;

  document.body.appendChild(panel);
}

function toggleDeck() {
  const panel = document.getElementById("patch-deck-panel");
  if (!panel) return;

  const opening = !panel.classList.contains("open");
  panel.classList.toggle("open", opening);

  if (opening) {
    startDeckTicker();
    onPatchnoteEvent("deck_open", { pool: DECK_POOL });
  } else {
    stopDeckTicker();
    onPatchnoteEvent("deck_close", {});
  }
}

function setRowLoading(rowEl, loading, failed = false) {
  let subEl = rowEl.querySelector(".patch-deck-item-sub");

  if (!subEl) {
    subEl = document.createElement("div");
    subEl.className = "patch-deck-item-sub";
    rowEl.appendChild(subEl);
  }

  if (loading) {
    subEl.dataset.prevHtml = subEl.dataset.prevHtml ?? subEl.innerHTML;
    subEl.innerHTML = `<span>${UI_TEXT.deck_loading_text}</span>`;
  } else if (failed) {
    subEl.innerHTML = `<span>${UI_TEXT.deck_error_text}</span>`;
  } else if (subEl.dataset.prevHtml !== undefined) {
    subEl.innerHTML = subEl.dataset.prevHtml;
    delete subEl.dataset.prevHtml;
  }
}

function renderDeck() {
  ensureDeckUI();

  const seen = loadSeenMap();
  const listEl = document.getElementById("patch-deck-list");
  const badgeEl = document.getElementById("patch-bell-badge");

  const unseenCount = DECK_POOL.filter((e) => !seen[e.id]).length;

  if (badgeEl) {
    if (unseenCount > 0) {
      badgeEl.textContent = unseenCount > 9 ? "9+" : String(unseenCount);
      badgeEl.style.display = "flex";
    } else {
      badgeEl.style.display = "none";
    }
  }

  if (!listEl) return;

  if (!DECK_POOL.length) {
    listEl.innerHTML = `<div class="patch-deck-empty">${UI_TEXT.deck_empty_text}</div>`;
    return;
  }

  const now = Clock.now();

  listEl.innerHTML = DECK_POOL.slice()
    .sort((a, b) => b.weight - a.weight)
    .map((entry) => {
      console.log("ALERT ENTRY", entry);
      const unseen = !seen[entry.id];

      const sub = entry.showCountdown
        ? `<div class="patch-deck-item-sub" data-until="${entry.until}">
             <span data-countdown>${UI_TEXT.expires_prefix}${formatCountdown(entry.until - now)}</span>
           </div>`
        : "";

      return `
      <div class="patch-deck-item" data-id="${entry.id}">
        <div class="patch-deck-item-top">
          <div class="patch-deck-item-title">
            ${unseen ? `<span class="patch-deck-dot"></span>` : ""}
            <span>${entry.title}</span>
          </div>
          ${iconImg(entry.icon, entry.title, entry.type === "news" ? "news" : "patchnote")}
        </div>
        ${sub}
      </div>`;
    })
    .join("");

  listEl.querySelectorAll(".patch-deck-item").forEach((rowEl) => {
    rowEl.onclick = () => {
      const id = rowEl.dataset.id;
      const entry = DECK_POOL.find((e) => e.id === id);
      if (entry) presentEntry(entry, { fromAuto: false, rowEl });
    };
  });

  if (document.getElementById("patch-deck-panel")?.classList.contains("open")) {
    startDeckTicker();
  }
}

function startDeckTicker() {
  stopDeckTicker();

  deckTickInterval = setInterval(() => {
    const now = Clock.now();
    let expiredSomething = false;

    document
      .querySelectorAll("#patch-deck-list [data-until]")
      .forEach((subEl) => {
        const until = Number(subEl.dataset.until);
        const span = subEl.querySelector("[data-countdown]");

        if (now >= until) {
          expiredSomething = true;
          return;
        }

        if (span) {
          span.textContent = `${UI_TEXT.expires_prefix}${formatCountdown(until - now)}`;
        }
      });

    if (expiredSomething) {
      stopDeckTicker();
      reloadIndexAndRefresh();
    }
  }, 1000);
}

function stopDeckTicker() {
  if (deckTickInterval) clearInterval(deckTickInterval);
  deckTickInterval = null;
}

function onPatchnoteEvent(event, payload) {
  //  console.log(event, payload, "onPatchnoteEvent")
  switch (event) {
    case "init":
      break;

    case "refreshed":
      break;

    case "auto_display":
      //  tocar("hero", false);
      break;

    case "manual_open":
      tocar("card", false);
      break;

    case "patchnote_seen":
      break;

    case "news_seen":
      break;

    case "entry_expired":
      break;

    case "deck_open":
      tocar("card", false);
      break;

    case "deck_close":
      tocar("card", false);
      break;

    default:
      break;
  }
}

let INDEX_CACHE = null;
let watcherTimer = null;

function scheduleWatcher(nextChange) {
  if (watcherTimer) clearTimeout(watcherTimer);
  watcherTimer = null;

  if (nextChange === Infinity) return;

  const delay = Math.max(nextChange - Clock.now(), 1000);

  watcherTimer = setTimeout(() => {
    console.log("Patchnotes schedule changed, refreshing...");
    reloadIndexAndRefresh();
  }, delay);
}

async function reloadIndexAndRefresh() {
  if (reinit_after < Clock.now() - 1.9 * 150000) {
    try {
      var url = `https://theredmineword.github.io/GWENT/change/index.json?v=${cacheBust()}`;
      if (window.location.host === "localhost:8080") {
        url = `change/index.json?v=${cacheBust()}`;
      }
      if (window.location.host === "localhost:8081") {
        url = `change/index.json?v=${cacheBust()}`;
      }
      const indexRes = await fetch(url);

      if (!indexRes.ok) return;

      reinit_after = Clock.now();

      INDEX_CACHE = await indexRes.json();

      json_patchnotes_for_this_session = INDEX_CACHE;
    } catch (e) {
      console.error("Patch notes failed:", e);
    }
  }

  await refreshFromIndex();
}

async function refreshFromIndex() {
  if (!INDEX_CACHE) return;

  const { patchnoteCandidates, newsCandidates, nextChange } =
    resolveIndex(INDEX_CACHE);
  const auto = pickAutoDisplay(patchnoteCandidates, newsCandidates);

  DECK_POOL = [...patchnoteCandidates, ...newsCandidates];

  renderDeck();
  scheduleWatcher(nextChange);

  onPatchnoteEvent("refreshed", { pool: DECK_POOL, auto });

  if (!openBoxEntry && auto && !isSeen(auto.id)) {
    await presentEntry(auto, { fromAuto: true });
  }
}
let json_patchnotes_for_this_session = {};
let reinit_after = 0;
async function initPatchnotes() {
  try {
    var url = `https://theredmineword.github.io/GWENT/change/index.json?v=${cacheBust()}`;
    if (window.location.host === "localhost:8080") {
      url = `change/index.json?v=${cacheBust()}`;
    }
    if (window.location.host === "localhost:8081") {
      url = `change/index.json?v=${cacheBust()}`;
    }
    const indexRes = await fetch(url);

    if (!indexRes.ok) return;

    reinit_after = Clock.now();

    INDEX_CACHE = await indexRes.json();

    json_patchnotes_for_this_session = INDEX_CACHE;

    onPatchnoteEvent("init", { index: INDEX_CACHE });

    await refreshFromIndex();

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        reloadIndexAndRefresh();
      }
    });
  } catch (e) {
    console.error("Patch notes failed:", e);
  }
}

try {
  ThisDef.env_vars = {
    ...deepClone(ThisDef).env_vars,
    always_full_timer_in_patchnotes: deepClone(always_full_timer_in_patchnotes),
  };
} catch (e) {}

//    if (document.readyState === "loading")
//        document.addEventListener("DOMContentLoaded", initPatchnotes);
//    else
//        initPatchnotes();

// })();
