"use strict";
// (function () {

let STORAGE_KEY = "patchnotes_shown_id";
let STORAGE_KEY_B = "patchnotes_shown_id";
let patchnotesWatcher = null;

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

function getActiveId(index, setupWatcher = true) {
  const now = Clock.now();

  let active = {
    a: index.default,
    b: false,
    c: index.default,
  };

  let nextChange = Infinity;

  if (Array.isArray(index.timed)) {
    for (let i = index.timed.length - 1; i >= 0; i--) {
      const timed = index.timed[i];

      const from = timed.from ? new Date(timed.from).getTime() : -Infinity;
      const until = timed.until ? new Date(timed.until).getTime() : Infinity;

      // Active timed entry
      if (now >= from && now <= until) {
        active = {
          a: timed.id,
          b: true,
          c: index.default,
        };

        // expiration is the next possible change
        if (until !== Infinity && until > now) {
          nextChange = Math.min(nextChange, until + 1);
        }

        break;
      }

      // Upcoming entry
      if (from > now) {
        nextChange = Math.min(nextChange, from);
      }
    }
  }

  if (setupWatcher && nextChange !== Infinity) {
    setupPatchnotesWatcher(index, nextChange);
  }

  return active;
}

function setupPatchnotesWatcher(index, timestamp) {
  if (patchnotesWatcher) {
    clearTimeout(patchnotesWatcher);
  }

  const delay = timestamp - Clock.now();

  if (delay <= 0) return;

  patchnotesWatcher = setTimeout(() => {
    console.log("Patchnotes schedule changed, refreshing...");

    run_patchnotes();

    // setup the next watcher
    getActiveId(index);
  }, delay);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatInline(text) {
  console.log("text", text);
  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a class="patch-link" href="$2" target="_blank" rel="noopener">$1</a>',
  );

  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  text = text.replace(/_(.+?)_/g, "<em>$1</em>");

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
    //       if (line.startsWith("\\")) {
    //   closeList();
    //   html += `<p>${formatInline(line.substring(1))}</p>`;
    //   continue;
    //}
    //  console.log(line);
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

    //  console.log(`[Patch notes: Per Each Line], line raw:${JSON.stringify(raw)}, unescape:${JSON.stringify(line)}`)
    const regex = /%%img\s+src="([^"]+)"(?:\s+style="([^"]*)")?\s*%%/g;

    const matches = [...raw.matchAll(regex)];

    if (matches.length > 0) {
      closeList();

      for (const m of matches) {
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
  const style = document.createElement("style");

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

.diff-add{
color:#6BCB77;
font-weight:bold;
}

.diff-modify{
color:#e5a84b;
font-weight:bold;
}

.diff-remove{
color:#ff6b6b;
font-weight:bold;
}


.briefing-overlay{
position:fixed;
inset:0;
display:flex;
justify-content:center;
align-items:center;
background:rgba(0,0,0,.88);
backdrop-filter:blur(4px);
z-index:2147483647;
font-family:Arial,Helvetica,sans-serif;
}

.briefing-overlay *{
box-sizing:border-box;
font-family:inherit;
/* color:#fff; */
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

.briefing-header>div{
font-size:34px;
font-weight:700;
line-height:1.1;
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

.patch-gap-1{
    height:6px;
}

.patch-gap-2{
    height:12px;
}

.patch-gap-3{
    height:20px;
}

.patch-color,
.patch-color * {
    color: inherit !important;
}
`;

  document.head.appendChild(style);
}

async function showPatch(data) {
  installStyles(data.box.lines_outline_hex);

  const overlay = document.createElement("div");
  overlay.className = "briefing-overlay";

  overlay.innerHTML = `
<div class="briefing-loader">
<hr>
<div>${data.load.text}</div>
<hr>
</div>
`;

  document.body.appendChild(overlay);

  await new Promise((resolve) =>
    setTimeout(resolve, parseInt(data.load.duration_ms, 10) || 3000),
  );

  overlay.innerHTML = `
<div class="briefing-box">

<div class="briefing-small-text-box">
${data.small_text.text}
</div>

${data.images.banner ? `<img class="briefing-banner" src="${data.images.banner}">` : ""}

<div class="briefing-header">

${data.images.logo ? `<img class="briefing-logo" src="${data.images.logo}">` : ""}

<div>${data.box.title}</div>

</div>

<div class="briefing-scrollable-text">
${formatPatchText(data.box.text)}
</div>

<button class="briefing-button">
${data.button.name}
</button>

</div>
`;
  if (`${data?.restart ?? false}` === "true") {
    overlay.querySelector(".briefing-button").onclick = () => {
      overlay.remove();

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
    overlay.querySelector(".briefing-button").onclick = () => overlay.remove();
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

async function run_patchnotes() {
  try {
    const indexRes = await fetch(`change/index.json?v=${cacheBust()}`);

    if (!indexRes.ok) return;

    const index = await indexRes.json();
    var raw_ids = getActiveId(index);
    let id = raw_ids.a;
    if (raw_ids.b) {
      STORAGE_KEY = `${STORAGE_KEY}_TIMEDEVENTS`;
    }
    //    console.log("RAW IDS", raw_ids, localStorage[STORAGE_KEY]);

    if (!id) return;

    var shown = localStorage.getItem(STORAGE_KEY);

    if (raw_ids.b && shown !== id) {
    } else {
      STORAGE_KEY = STORAGE_KEY_B;
      shown = localStorage.getItem(STORAGE_KEY);
      id = raw_ids.c;
    }

    if (shown === id) return;

    const txtRes = await fetch(`change/log-${id}.txt.bin?v=${cacheBust()}`);

    if (!txtRes.ok) return;

    //  const text = await txtRes.text();

    const text = await decompressBase64(
      btoa(
        Array.from(new Uint8Array(await txtRes.arrayBuffer()), (b) =>
          String.fromCharCode(b),
        ).join(""),
      ),
    );

    const data = parsePatchNotes(text);

    await showPatch(data);

    localStorage.setItem(STORAGE_KEY, id);
  } catch (e) {
    console.error("Patch notes failed:", e);
  }
}

//    if (document.readyState === "loading")
//        document.addEventListener("DOMContentLoaded", run_patchnotes);
//    else
//        run_patchnotes();

// })();
