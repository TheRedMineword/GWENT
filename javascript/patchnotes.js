"use strict";
// (function () {

let STORAGE_KEY = "patchnotes_shown_id";

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

function getActiveId(index) {
  const now = Date.now();

  if (Array.isArray(index.timed)) {
    for (let i = index.timed.length - 1; i >= 0; i--) {
      const timed = index.timed[i];

      const from = timed.from ? new Date(timed.from).getTime() : -Infinity;

      const until = timed.until ? new Date(timed.until).getTime() : Infinity;

      if (now >= from && now <= until) return { a: timed.id, b: true };
    }
  }

  return { a: index.default, b: false };
}
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatInline(text) {
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a class="patch-link" href="$2" target="_blank" rel="noopener">$1</a>',
  );

  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  text = text.replace(/_(.+?)_/g, "<em>$1</em>");

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
    const raw = line;
    line = unescape(line);
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

  return html;
}
function installStyles(color) {
  const style = document.createElement("style");

  style.textContent = `
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
color:#fff;
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
font-size:17px;
line-height:1.7;
color:#fff;
word-break:break-word;
white-space:normal;
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
margin:0 0 18px;
font-size:34px;
font-weight:700;
color:${color};
}

.patch-h2{
margin:22px 0 12px;
font-size:27px;
font-weight:700;
color: ${color};
}

.patch-h3{
margin:18px 0 8px;
font-size:21px;
font-weight:700;
color: ${color};
}

.patch-small{
margin:6px 0;
font-size:12px;
opacity:.65;
font-style:italic;
}

.patch-quote{
margin:16px 0;
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
margin:4px 0;
}

.patch-modify{
color:#f2b24d;
font-weight:bold;
margin:4px 0;
}

.patch-remove{
color:#ff7373;
font-weight:bold;
margin:4px 0;
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

  overlay.querySelector(".briefing-button").onclick = () => overlay.remove();
}

async function run_patchnotes() {
  try {
    const indexRes = await fetch(`change/index.json?v=${cacheBust()}`);

    if (!indexRes.ok) return;

    const index = await indexRes.json();
    var raw_ids = getActiveId(index);
    const id = raw_ids.a;
    if (raw_ids.b) {
      STORAGE_KEY = `${STORAGE_KEY}_TIMEDEVENTS`;
    }

    if (!id) return;

    const shown = localStorage.getItem(STORAGE_KEY);

    if (shown === id) return;

    const txtRes = await fetch(
      `change/log-${id}.txt`, // ?v=${cacheBust()}`
    );

    if (!txtRes.ok) return;

    const text = await txtRes.text();

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
