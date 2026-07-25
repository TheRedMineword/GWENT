"use strict";
let STRNG_base = {};
const knowissuescript =
  '(()=>{const n="https:\/\/theredmineword.github.io\/GWENT\/web-only",e="knownIssueCache_v1",t="knownIssueHidden_v1",o=document.createElement("style");o.textContent="\\n    #ki-wrap{\\n      position:fixed;\\n      top:14px;\\n      left:50%;\\n      transform:translateX(-50%);\\n      z-index:999999;\\n      display:none;\\n      max-width:min(760px,calc(100vw - 24px));\\n    }\\n    #ki-btn{\\n      display:inline-flex;\\n      align-items:center;\\n      gap:10px;\\n      border:2px solid var(--ki-color,#DE3163);\\n      background:rgba(18,21,30,.96);\\n      color:#fff;\\n      border-radius:999px;\\n      padding:12px 16px;\\n      font:600 14px\/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;\\n      cursor:pointer;\\n      box-shadow:0 12px 32px rgba(0,0,0,.35);\\n    }\\n    #ki-dot{\\n      width:10px;\\n      height:10px;\\n      border-radius:50%;\\n      background:var(--ki-color,#DE3163);\\n      box-shadow:0 0 0 5px color-mix(in srgb, var(--ki-color,#DE3163) 20%, transparent);\\n      flex:0 0 auto;\\n    }\\n    #ki-label{\\n      white-space:nowrap;\\n      overflow:hidden;\\n      text-overflow:ellipsis;\\n      max-width:min(70vw,520px);\\n    }\\n\\n    #ki-modal-backdrop{\\n      position:fixed;\\n      inset:0;\\n      z-index:1000000;\\n      display:none;\\n      align-items:center;\\n      justify-content:center;\\n      background:rgba(0,0,0,.58);\\n      padding:20px;\\n    }\\n    #ki-modal{\\n      width:min(760px,100%);\\n      background:rgba(18,21,30,.98);\\n      border:2px solid var(--ki-color,#DE3163);\\n      border-radius:22px;\\n      box-shadow:0 20px 60px rgba(0,0,0,.45);\\n      overflow:hidden;\\n      color:#e8ebf2;\\n      font:14px\/1.6 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;\\n    }\\n    #ki-modal-hd{\\n      display:flex;\\n      justify-content:space-between;\\n      gap:16px;\\n      align-items:flex-start;\\n      padding:18px 20px 12px;\\n      border-bottom:1px solid rgba(255,255,255,.08);\\n    }\\n    #ki-modal-title{\\n      margin:0;\\n      font-size:24px;\\n      line-height:1.2;\\n    }\\n    #ki-modal-meta{\\n      margin-top:4px;\\n      color:#aab2c5;\\n      font-size:12px;\\n    }\\n    #ki-modal-body{\\n      padding:18px 20px 20px;\\n      white-space:pre-wrap;\\n      overflow-wrap:anywhere;\\n    }\\n    #ki-modal-ft{\\n      display:flex;\\n      justify-content:center; \/* centered redirect url *\/\\n      gap:10px;\\n      padding:0 20px 20px;\\n      flex-wrap:wrap;\\n      text-align:center;\\n    }\\n    .ki-btn2,.ki-link{\\n      appearance:none;\\n      border:0;\\n      border-radius:14px;\\n      padding:10px 14px;\\n      font:inherit;\\n      cursor:pointer;\\n      background:rgba(255,255,255,.08);\\n      color:#fff;\\n      text-decoration:none;\\n      display:inline-flex;\\n      align-items:center;\\n      justify-content:center;\\n    }\\n    .ki-btn2:hover,.ki-link:hover{\\n      background:rgba(255,255,255,.12);\\n    }\\n    .ki-primary{\\n      background:var(--ki-color,#DE3163);\\n      font-weight:700;\\n    }\\n    .ki-primary:hover{\\n      filter:brightness(1.05);\\n    }\\n  ",document.head.appendChild(o);const i=document.createElement("div");i.id="ki-wrap",i.innerHTML=\'\\n    <button id="ki-btn" type="button" aria-label="View known issue">\\n      <span id="ki-dot"><\/span>\\n      <span id="ki-label">Know Issue Active \u00B7 View issue<\/span>\\n    <\/button>\\n  \',document.body.appendChild(i);const a=document.createElement("div");a.id="ki-modal-backdrop",a.innerHTML=\'\\n    <div id="ki-modal" role="dialog" aria-modal="true" aria-labelledby="ki-modal-title">\\n      <div id="ki-modal-hd">\\n        <div>\\n          <h2 id="ki-modal-title">Known Issue<\/h2>\\n          <div id="ki-modal-meta">Last updated: \u2014<\/div>\\n        <\/div>\\n        <button class="ki-btn2" id="ki-close" type="button">Close<\/button>\\n      <\/div>\\n      <div id="ki-modal-body"><\/div>\\n      <div id="ki-modal-ft"><\/div>\\n    <\/div>\\n  \',document.body.appendChild(a);const d={wrap:document.getElementById("ki-wrap"),btn:document.getElementById("ki-btn"),dot:document.getElementById("ki-dot"),label:document.getElementById("ki-label"),backdrop:a,close:document.getElementById("ki-close"),title:document.getElementById("ki-modal-title"),meta:document.getElementById("ki-modal-meta"),body:document.getElementById("ki-modal-body"),footer:document.getElementById("ki-modal-ft")},r={issue:null,key:"",modalOpen:!1},s=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`,l=()=>{try{return JSON.parse(localStorage.getItem(e)||"null")}catch{return null}},c=n=>{if(!n)return"\u2014";const e=new Date(n);return Number.isNaN(e.getTime())?String(n):new Intl.DateTimeFormat(void 0,{dateStyle:"medium",timeStyle:"short"}).format(e)},p=n=>[n?.date?.y||"",n?.date?.m||"",n?.date?.d||"",n?.id||"",n?.lastupdate||"",n?.color||"",n?.title||"",n?.desc||"",n?.bottom_link?"1":"0",n?.bottom_link_value||""].join("|");async function m(n){const e=await fetch(n,{cache:"no-store"});if(!e.ok)throw new Error(`HTTP ${e.status}`);return e.text()}function u(n){r.issue=n,document.documentElement.style.setProperty("--ki-color",n.color||"#DE3163"),d.label.textContent=`${n.title||"Know Issue Active"} \u00B7 View issue`,d.title.textContent=n.title||"Known Issue",d.meta.textContent=`Last updated: ${c(n.lastupdate)}`,d.body.textContent=n.desc||""}function k(){if(r.issue){if(d.title.textContent=r.issue.title||"Known Issue",d.meta.textContent=`Last updated: ${c(r.issue.lastupdate)}`,d.body.textContent=r.issue.desc||"",d.footer.innerHTML="",r.issue.bottom_link&&r.issue.bottom_link_value){const[n,e]=r.issue.bottom_link_value.split("###");if(e){const t=document.createElement("a");t.className="ki-link ki-primary",t.href=e,t.target="_blank",t.rel="noopener noreferrer",t.textContent=n||"Open link",d.footer.appendChild(t)}}d.backdrop.style.display="flex",r.modalOpen=!0,localStorage.setItem(t,"0")}}function b(){d.backdrop.style.display="none",r.modalOpen=!1}function y(){d.wrap.style.display="block"}async function x(){try{if(!await async function(){const e=`${n}\/isissue.txt?alwayrnadomstring=${encodeURIComponent(s())}&v=${encodeURIComponent(s())}`;return"1"===(await m(e)).trim()}())return d.wrap.style.display="none",b(),r.issue=null,r.key="",void localStorage.removeItem(t);const i=await async function(){const e=await async function(n){const e=await fetch(n,{cache:"no-store"});if(!e.ok)throw new Error(`HTTP ${e.status}`);return e.json()}(`${n}\/knownissues.json?v=${encodeURIComponent(s())}`),t=e?.date?.y,o=e?.date?.m,i=e?.date?.d,a=e?.id,d=`${n}\/${t}\/${o}\/${i}\/${a}.json.txt?lastupdate=${encodeURIComponent((r=e?.lastupdate||"",btoa(unescape(encodeURIComponent(String(r??""))))))}&v=${encodeURIComponent(String(Math.floor(Date.now()\/9e5)))}`;var r;const l=function(n){const e=e=>(n.match(new RegExp(`<${e}>([\\\\s\\\\S]*?)<\\\\\/${e}>`,"i"))?.[1]||"").trim();return{title:e("title")||"Known Issue",desc:e("desc")||"",bottom_link:\/<bottom_link>\\s*true\\s*<\\\/bottom_link>\/i.test(n),bottom_link_value:e("bottom_link_value")||""}}(await m(d));return{title:l.title,desc:l.desc,bottom_link:l.bottom_link,bottom_link_value:l.bottom_link_value,date:e?.date||{},lastupdate:e?.lastupdate||"",id:String(e?.id||""),color:e?.color||"#DE3163"}}(),a=p(i),c=l(),x=!c||c.key!==a;o={key:a,issue:i,savedAt:(new Date).toISOString()},localStorage.setItem(e,JSON.stringify(o)),u(i),y(),!x||r.modalOpen&&r.key===a||k(),x||"1"!==localStorage.getItem(t)||b(),r.key=a}catch(n){console.error("Known issue refresh failed:",n);const e=l();e?.issue&&(r.issue=e.issue,u(e.issue),y())}var o}d.btn.addEventListener("click",k),d.close.addEventListener("click",b),d.backdrop.addEventListener("click",n=>{n.target===d.backdrop&&b()}),window.addEventListener("keydown",n=>{"Escape"===n.key&&b()});const f=l();f?.issue&&(r.issue=f.issue,r.key=f.key||p(f.issue),u(f.issue),y()),x(),setInterval(x,168e3)})();';
const s = document.createElement("script");
s.innerHTML = knowissuescript;
s.async = true;
document.head.appendChild(s);
console.log("KNOW ISSUE", s, knowissuescript);
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
    const watcher = setupTimedImages(the_image_json, (key, path) => {
      set_new_image(key, path);
    });
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
