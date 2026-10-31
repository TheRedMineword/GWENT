"use strict";
let pcnr = false;

const PN_WIFI_OPTIMIZE = true;

let PN_OPTIMIZE = {
  lazy_icons: false,
  icon_spinner: true,
  icon_min_spinner_ms: 0,
  icon_debug_extra_ms: 3500,
  image_queue: false,
  image_concurrency: 99,
  ticker_interval_ms: 1,
  ticker_pause_when_hidden: true,
  debug_logs: true,
  log_categories: ["fetch", "stream", "schedule", "tune"],
};

const PN_PROFILES = {
  normal: {
    lazy_icons: false,
    image_queue: false,
    image_concurrency: 99,
    ticker_interval_ms: 1,
  },
  slow: {
    lazy_icons: true,
    image_queue: true,
    image_concurrency: 4,
    ticker_interval_ms: 500,
  },
};

function pnLog(category, message, data) {
  if (!PN_OPTIMIZE.debug_logs) return;
  const only = PN_OPTIMIZE.log_categories;
  if (only && !only.includes(category)) return;
  if (data === undefined) console.log(`[PN:${category}]`, message);
  else console.log(`[PN:${category}]`, message, data);
}

function pnSlowDebug() {
  return (
    typeof patchnotesdebug_slowerload !== "undefined" &&
    !!patchnotesdebug_slowerload
  );
}

const pnQ = [];
let pnQActive = 0;
let pnTuneBound = false;

function pnPump() {
  while (pnQActive < PN_OPTIMIZE.image_concurrency && pnQ.length) {
    const run = pnQ.shift();
    pnQActive++;
    run().finally(() => {
      pnQActive--;
      pnPump();
    });
  }
}

function pnEnqueue(task) {
  if (!PN_OPTIMIZE.image_queue) return task();
  return new Promise((resolve) => {
    pnQ.push(() => task().then(resolve, resolve));
    pnPump();
  });
}

function pnTune(mode = "auto", overrides = {}) {
  const c = navigator.connection || {};
  // deliberately conservative: only clearly bad connections count as slow
  const slow =
    mode === "slow" ||
    (mode === "auto" &&
      (c.saveData === true ||
        /^(slow-2g|2g)$/.test(c.effectiveType || "") ||
        (c.downlink > 0 && c.downlink < 0.7)));

  PN_OPTIMIZE = {
    ...PN_OPTIMIZE,
    ...PN_PROFILES[slow ? "slow" : "normal"],
    ...overrides,
  };

  pnLog("tune", slow ? "slow profile" : "normal profile", PN_OPTIMIZE);
  onPatchnoteEvent("tuned", { slow, config: PN_OPTIMIZE });
  pnPump();
  return PN_OPTIMIZE;
}

function pnIconSettle(img, ok) {
  const wrap = img.parentNode;
  if (!wrap) return;

  const fallback = img.dataset.pnFallback;
  if (!ok && fallback && !img.dataset.pnFell) {
    img.dataset.pnFell = "1";
    img.src = fallback;
    return;
  }
  /*
   const wait = Math.max(
    PN_OPTIMIZE.icon_min_spinner_ms,
    pnSlowDebug() ? PN_OPTIMIZE.icon_debug_extra_ms : 0,
  );

  setTimeout(() => {
    wrap.classList.add(ok ? "is-loaded" : "is-failed");
    if (!ok) onPatchnoteEvent("icon_failed", { src: img.src });
  }, wait);
  */
  wrap.classList.add(ok ? "is-loaded" : "is-failed");
  if (!ok) onPatchnoteEvent("icon_failed", { src: img.src });
}

function pnHydrateIcons(root = document) {
  root.querySelectorAll("img[data-pn-src]").forEach((img) => {
    const src = img.dataset.pnSrc;
    delete img.dataset.pnSrc;

    pnEnqueue(
      () =>
        new Promise((done) => {
          if (!img.isConnected) return done();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          img.src = src;
        }),
    );
  });
}

// (function () {
const ICON_BASE_PATH = "img/patchnotes/";

const UI_TEXT = {
  expires_prefix: "Expires in ",
  expired_text: "<l>UPDATING PATCH NOTES…</l>",
  deck_loading_text: "Downloading…",
  deck_error_text: "Failed to load, try again",
  deck_empty_text: "No new notices.",
  github_loading_text: "*Loading some data here*",
  github_error_text: "*Failed to load data here*",
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
    duration_ms: "0",
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

const BIGPICTURE = {
  width_px: 360,
  height_px: 64,
  min_load_ms: 0, // no artificial minimum loading time
  default_countdown_color: "#ffffff",
  default_countdown_pos: { right: "2%", bottom: "2%" },
};

function safeCssColor(value, fallback) {
  const v = typeof value === "string" ? value.trim() : "";
  return v && /^[#\w(),.%\s-]+$/.test(v) ? v : fallback;
}

function parseBigPictureCords(text) {
  const pos = {};
  const horizontal = ["left", "right"];
  const vertical = ["top", "bottom"];
  const axisTaken = { h: false, v: false };

  for (const part of String(text ?? "").split(",")) {
    const m = part
      .trim()
      .match(/^(-?\d+(?:\.\d+)?)\s*(px|%)?\s+(left|right|top|bottom)$/i);
    if (!m) continue;

    const side = m[3].toLowerCase();
    const axis = horizontal.includes(side) ? "h" : "v";
    if (axisTaken[axis]) continue; // one value per axis
    axisTaken[axis] = true;

    pos[side] = `${m[1]}${(m[2] || "%").toLowerCase()}`;
  }

  if (!axisTaken.h) pos.right = BIGPICTURE.default_countdown_pos.right;
  if (!axisTaken.v) pos.bottom = BIGPICTURE.default_countdown_pos.bottom;
  return pos;
}

function normalizeAdvanced(raw) {
  const adv = raw && typeof raw === "object" ? raw : null;
  const url = typeof adv?.bigpicture === "string" ? adv.bigpicture.trim() : "";
  if (!url) return null;

  const ownSize = adv.own_size === true || adv.own_size === "true";
  const pick = (v, fallback, min, max) => {
    const n = Number(v);
    return ownSize && Number.isFinite(n) && n > 0
      ? Math.min(Math.max(Math.round(n), min), max)
      : fallback;
  };

  return {
    bigpicture: url,
    size: {
      width_px: pick(adv.size?.width_px, BIGPICTURE.width_px, 40, 2000),
      height_px: pick(adv.size?.height_px, BIGPICTURE.height_px, 16, 800),
    },
    loadingColor: safeCssColor(
      adv.color_loading?.box_outlines,
      DEFAULTS.box.lines_outline_hex,
    ),
    countdownColor: safeCssColor(
      adv.color_post?.countdown,
      BIGPICTURE.default_countdown_color,
    ),
    countdownPos: parseBigPictureCords(
      adv.ifcountown__cords ?? adv.ifcountdown__cords,
    ),
  };
}

let SHOW_BELL_BUTTON = true;

const STREAM_MESSAGES = {
  warn: `
<box.title>Server notice</box.title>
<small_text.text>SERVER WARNING</small_text.text>
<button.name>OK</button.name>
<box.text>
# Warning
The server will restart soon.
-# Please finish your match.
</box.text>
`,
};
var who = false;
if (
  window.location.host === "localhost:8080" ||
  window.location.host === "localhost:8081"
) {
  who = true;
}

const STREAM_BASE = who ? "http://localhost:8081" : `https://${domain_raw}`;

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

  // bell is back: build it if needed and cue anything that became active meanwhile
  if (visible && pcnr) {
    renderDeck();
    pnCheckUnseenActive();
  }
}

const Z_INDEX = {
  overlay: 2147483647, // the full patch-note/news modal
  bell: 9997, // the floating bell button
  deck_panel: 9998, // the inbox/deck panel
};

const SEEN_STORAGE_KEY = "patchnotes_seen_v2";
const SEEN_TIMESTAMP_KEY = "patchnotes_seen_timestamps_v1";
const PATCHNOTE_MAX_AGE = 90 * 24 * 60 * 60 * 1000;

let seenmapstrng = JSON.stringify(localStorage.getItem(SEEN_STORAGE_KEY) || {});

function verdictseen(onchange) {
  try {
    const usaid = JSON.stringify(playerId ?? 'Failed to load the "playerID"');

    const isLocalhost_human =
      window.location.hostname.startsWith("localhost") ||
      window.location.hostname.startsWith("127.0.0.1") ||
      window.location.hostname.startsWith("[::1]");

    const isElectronLauncher_human =
      isLocalhost_human && location.port === "1111";

    const apiUrlcPN = isElectronLauncher_human
      ? domain
      : isLocalhost_human
        ? "http://localhost:8081/"
        : domain;

    const seenmapstrng_2 = localStorage.getItem(SEEN_STORAGE_KEY) || {};
    seenmapstrng = JSON.stringify(localStorage.getItem(SEEN_STORAGE_KEY) || {});

    return fetch(`${apiUrlcPN}api/verdict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: `Player: ${usaid}, Seen patchnotes (onchange:${onchange}):\`\`\`${seenmapstrng_2}\`\`\``,
      }),
    });
  } catch (e) {
    console.error(e);
  }
  return null;
}

function loadSeenMap() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function loadSeenTimestamps() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_TIMESTAMP_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveSeenMap(map) {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(map));

    if (
      JSON.stringify(localStorage.getItem(SEEN_STORAGE_KEY) || {}) !==
      seenmapstrng
    ) {
      verdictseen(true);
    }
  } catch (e) {
    console.warn("Patch notes: failed to persist seen state:", e);
  }
}

function isSeen(id) {
  return !!loadSeenMap()[id];
}

function markSeen(id) {
  const map = loadSeenMap();
  const timestamps = loadSeenTimestamps();

  map[id] = true;
  timestamps[id] = Date.now();

  try {
    localStorage.setItem(SEEN_TIMESTAMP_KEY, JSON.stringify(timestamps));
  } catch (e) {
    console.warn("Patch notes: failed to persist timestamps:", e);
  }

  saveSeenMap(map);
}

function cleanupExpiredSeen() {
  const map = loadSeenMap();
  const timestamps = loadSeenTimestamps();
  const now = Date.now();
  let changed = false;

  for (const id of Object.keys(map)) {
    const lastSeen = timestamps[id];

    if (id.startsWith("stream-")) {
      delete map[id];
      delete timestamps[id];
      changed = true;
    } else {
      if (typeof lastSeen === "number" && now - lastSeen > PATCHNOTE_MAX_AGE) {
        delete map[id];
        delete timestamps[id];
        changed = true;
      }
    }
  }

  if (changed) {
    localStorage.setItem(SEEN_TIMESTAMP_KEY, JSON.stringify(timestamps));
    saveSeenMap(map);
  }
}

function cacheBust() {
  return Date.now().toString(36);
}
cleanupExpiredSeen();
verdictseen(false);
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
  return iconUrl2(iconId);
}
function iconUrl2(iconId) {
  if (iconId.startsWith("custom!")) {
    return iconId.slice(7);
  }

  return `${ICON_BASE_PATH}${iconId}.svg`;
}

function iconImg(iconId, alt = "", fallbackId = null) {
  if (!iconId) return "";

  const px = ICON_SIZES.patch_icon_px;
  const url = pnEscapeAttr(iconUrl(iconId));
  const srcAttr = PN_OPTIMIZE.image_queue
    ? `data-pn-src="${url}"`
    : `src="${url}"`;
  const fallbackAttr = fallbackId
    ? ` data-pn-fallback="${pnEscapeAttr(iconUrl(fallbackId))}"`
    : "";
  const lazy = PN_OPTIMIZE.lazy_icons ? ` loading="lazy" decoding="async"` : "";
  const ready = PN_OPTIMIZE.icon_spinner ? "" : " is-loaded";

  return `<span class="patch-icon-wrap${ready}" style="width:${px}px;height:${px}px"><img class="patch-icon" width="${px}" height="${px}"${lazy} ${srcAttr}${fallbackAttr} alt="${escapeHtml(alt)}" onload="pnIconSettle(this,true)" onerror="pnIconSettle(this,false)"></span>`;
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
  pnLog("parse", "patch notes parsed", returnss);
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

const PN_GH_TTL_MS = 90 * 1000; // 40 fetches/hour per cached endpoint (limit: 60/h per IP)
const PN_GH_STORAGE_KEY = "patchnotes_ghcommit_v1";
const PN_REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const PN_UNIT_SECONDS = { d: 86400, h: 3600, m: 60, s: 1 };
const PN_UNIT_ORDER = ["d", "h", "m", "s"];

const PN_TOKEN_RE = new RegExp(
  [
    "!lastgithubcommittimestamp:([^!\\s]+)!",
    "!lastgithubcommitcountup:([^!\\s]+)!",
    '!(countup|countdown)_((?:dd|hh|mm|ss)(?:_(?:dd|hh|mm|ss))*)_letzeros:(true|false)_"([^"!\\n]*)":([^!\\n]+)!',
  ].join("|"),
  "g",
);

function pnNow() {
  return typeof Clock !== "undefined" &&
    Clock &&
    typeof Clock.now === "function"
    ? Clock.now()
    : Date.now();
}

function pnEscapeAttr(text) {
  return escapeHtml(String(text)).replace(/"/g, "&quot;");
}

const pnGhMem = new Map();
const pnGhPromises = new Map();

function pnGhCachedTs(repo) {
  const key = repo.toLowerCase();
  const mem = pnGhMem.get(key);
  if (mem && Date.now() - mem.at < PN_GH_TTL_MS) return mem.ts;

  try {
    const store = JSON.parse(localStorage.getItem(PN_GH_STORAGE_KEY)) || {};
    const e = store[key];
    if (e && Date.now() - e.at < PN_GH_TTL_MS) {
      pnGhMem.set(key, e);
      return e.ts;
    }
  } catch (err) {}

  return null;
}

function pnGhStore(repo, ts) {
  const key = repo.toLowerCase();
  const entry = { ts, at: Date.now() };
  pnGhMem.set(key, entry);

  try {
    const store = JSON.parse(localStorage.getItem(PN_GH_STORAGE_KEY)) || {};
    store[key] = entry;
    localStorage.setItem(PN_GH_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {}
}

function pnGhFetch(repo) {
  const key = repo.toLowerCase();
  if (pnGhPromises.has(key)) return pnGhPromises.get(key);

  const p = fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((r) => {
      if (!r.ok) throw new Error(`GitHub ${r.status}`);
      return r.json();
    })
    .then((arr) => {
      const c = arr && arr[0] && arr[0].commit;
      const iso =
        c && ((c.committer && c.committer.date) || (c.author && c.author.date));
      const ts = Date.parse(iso);
      if (isNaN(ts)) throw new Error("No commit date");
      pnGhStore(repo, ts);
      return ts;
    });

  pnGhPromises.set(key, p);
  p.then(
    () => setTimeout(() => pnGhPromises.delete(key), PN_GH_TTL_MS),
    () => pnGhPromises.delete(key), // allow a retry on the next render
  );
  return p;
}

function pnFormatDuration(ms, units, letZeros) {
  let rem = Math.max(0, Math.floor(ms / 1000));
  const parts = units.map((u) => {
    const v = Math.floor(rem / PN_UNIT_SECONDS[u]);
    rem -= v * PN_UNIT_SECONDS[u];
    return { u, v };
  });

  if (!letZeros) {
    while (parts.length > 1 && parts[0].v === 0) parts.shift();
  }

  return parts.map((p) => `${p.v}${p.u}`).join(" ");
}

function pnComputeText(d, ts) {
  if (ts === null || isNaN(ts)) {
    return d.pnState === "error"
      ? UI_TEXT.github_error_text
      : UI_TEXT.github_loading_text;
  }

  if (d.pnKind === "timestamp") {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const diff = d.pnKind === "countdown" ? ts - pnNow() : pnNow() - ts;

  if (d.pnKind === "countdown" ? diff <= 0 : diff < 0) return d.pnExp ?? "";

  return pnFormatDuration(diff, d.pnTpl.split(""), d.pnLz === "true");
}

function pnUpdateEl(el) {
  const d = el.dataset;
  let ts = d.pnTs ? Number(d.pnTs) : null;

  if (ts === null && d.pnRepo) {
    const cached = pnGhCachedTs(d.pnRepo);
    if (cached !== null) {
      ts = cached;
      d.pnTs = String(cached);
    }
  }

  const text = pnComputeText(d, ts);
  if (el.textContent !== text) el.textContent = text;
}

let pnLiveInterval = null;

function pnRefreshAll() {
  document.querySelectorAll(".pn-live").forEach(pnUpdateEl);
}

function pnEnsureTicker() {
  if (pnLiveInterval) return;

  pnLiveInterval = setInterval(() => {
    if (!document.querySelector(".pn-live")) {
      clearInterval(pnLiveInterval); // nothing on screen any more
      pnLiveInterval = null;
      return;
    }
    pnRefreshAll();
  }, 1000);
}

function pnBuildSpan(kind, source, opts = {}) {
  const { units = "dhms", letZeros = false, expired = "" } = opts;
  source = source.trim();

  let repo = null;
  let ts = null;

  const gh = source.match(/^lastgithubcommit:(.+)$/);
  if (gh) {
    source = gh[1].trim();
    repo = source;
  } else if (opts.repoOnly) {
    repo = source;
  }

  if (repo !== null) {
    if (!PN_REPO_RE.test(repo)) return null;
    ts = pnGhCachedTs(repo);
  } else if (/^\d{13}$/.test(source)) {
    ts = Number(source);
  } else if (/^\d{10}$/.test(source)) {
    ts = Number(source) * 1000;
  } else {
    ts = Date.parse(source);
    if (isNaN(ts)) return null;
  }

  const attrs = {
    "data-pn-kind": kind,
    "data-pn-tpl": units,
    "data-pn-lz": String(letZeros),
    "data-pn-exp": expired,
  };
  if (repo !== null) attrs["data-pn-repo"] = repo;
  if (ts !== null) attrs["data-pn-ts"] = String(ts);

  const d = {
    pnKind: kind,
    pnTpl: units,
    pnLz: String(letZeros),
    pnExp: expired,
  };
  const text = pnComputeText(d, ts);

  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${pnEscapeAttr(v)}"`)
    .join(" ");

  if (repo !== null && ts === null) {
    pnGhFetch(repo).then(
      () => pnRefreshAll(),
      (e) => {
        console.warn("Patch notes: GitHub lookup failed:", repo, e);
        document.querySelectorAll(".pn-live").forEach((el) => {
          if (el.dataset.pnRepo === repo) el.dataset.pnState = "error";
        });
        pnRefreshAll();
      },
    );
  }

  pnEnsureTicker();
  return `<span class="pn-live" ${attrStr}>${escapeHtml(text)}</span>`;
}

function pnExtractTokens(text, store) {
  return text.replace(
    PN_TOKEN_RE,
    (whole, tsRepo, cuRepo, kind, tpl, lz, exp, ts) => {
      let html = null;

      if (tsRepo) {
        html = pnBuildSpan("timestamp", tsRepo, { repoOnly: true });
      } else if (cuRepo) {
        html = pnBuildSpan("countup", cuRepo, {
          repoOnly: true,
          units: "dhms",
          letZeros: false,
          expired: "0s",
        });
      } else {
        const units = tpl.split("_").map((u) => u[0]);
        const ordered = units.every(
          (u, i) =>
            i === 0 ||
            PN_UNIT_ORDER.indexOf(units[i - 1]) < PN_UNIT_ORDER.indexOf(u),
        );
        if (ordered) {
          html = pnBuildSpan(kind, ts, {
            units: units.join(""),
            letZeros: lz === "true",
            expired: exp,
          });
        }
      }

      if (html === null) return whole;

      store.push(html);
      return `\uE000${store.length - 1}\uE001`;
    },
  );
}

function formatPatchText(text) {
  const pnTokens = [];
  text = pnExtractTokens(text, pnTokens);
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
    if (line === escapeHtml("<fat-1>")) {
      closeList();
      html += '<div class="patch-gap--1"></div>';
      continue;
    }
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
        //   console.log("LINE", line.substring(0, 10), line.startsWith("Q"), line.startsWith("A"), line.substring(0,1) === "A");
        if (line.startsWith("Q")) {
          closeList();
          html += `<div class="patch-QandA_Q">${formatInline(line)}</div>`;
          continue;
        }

        if (line.startsWith("A")) {
          closeList();
          html += `<div class="patch-QandA_A">${formatInline(line)}</div>`;
          continue;
        }
        if (line.startsWith("+")) {
          html += `<div class="patch-add">${formatInline(line)}</div>`;
        } else if (line.startsWith("---")) {
          html += `<div class="patch-modify">${formatInline(line)}</div>`;
        } else if (line.startsWith("-")) {
          html += `<div class="patch-remove">${formatInline(line)}</div>`;
        } else if (line.startsWith("?")) {
          html += `<div class="patch-rebalnce">${formatInline(line)}</div>`;
        } else if (line.startsWith("&")) {
          html += `<div class="patch-funny">${formatInline(line)}</div>`;
        } else {
          html += `<div>${formatInline(line)}</div>`;
        }
      } else {
        html += line + "\n";
      }

      continue;
    }

    if (line.trim() === "--separator--") {
      closeList();
      html += '<hr class="patch-separator">';
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

    if (line.startsWith("-## ")) {
      closeList();
      html += `<div class="patch-small2">${formatInline(line.substring(4))}</div>`;
      continue;
    }

    if (line.startsWith("-#_ ")) {
      closeList();
      html += `<div class="patch-smallx">${formatInline(line.substring(4))}</div>`;
      continue;
    }

    if (line.startsWith("-##_ ")) {
      closeList();
      html += `<div class="patch-small2x">${formatInline(line.substring(5))}</div>`;
      continue;
    }

    if (line.startsWith("> ")) {
      closeList();
      html += `<div class="patch-quote">${formatInline(line)}</div>`;
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
  html = html.replace(
    /\uE000(\d+)\uE001/g,
    (_, i) => pnTokens[Number(i)] ?? "",
  );
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

.patch-icon-wrap{
position:relative;
display:inline-flex;
flex:0 0 auto;
align-items:center;
justify-content:center;
}

.patch-icon-wrap::before{
content:"";
position:absolute;
width:40%;
height:40%;
/* HERE IN CASE YOU NEED TO COMMENT OUT IT AGAIN */
border:2px solid ${color};
animation:patch-icon-spin .9s linear infinite;
}

.patch-icon-wrap.is-loaded::before,
.patch-icon-wrap.is-failed::before{
display:none;
}

.patch-icon-wrap:not(.is-loaded) .patch-icon{
opacity:0;
}

.patch-icon-wrap.is-failed .patch-icon{
display:none;
}

@keyframes patch-icon-spin{
to{ transform:rotate(360deg); }
}

.patch-bell .patch-icon-wrap{
width:${ICON_SIZES.bell_icon_px}px !important;
height:${ICON_SIZES.bell_icon_px}px !important;
}

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

.patch-bell img.patch-icon{
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

/* ---------- Big picture inbox rows ---------- */

.patch-deck-item--big{
position:relative;
box-sizing:border-box;
flex:none;
padding:0;
overflow:hidden;
background:#111;
}

.patch-bp-img{
position:absolute;
inset:0;
width:100%;
height:100%;
object-fit:cover;
display:block;
pointer-events:none;
}

.patch-bp-loader{
display:none;
gap:10px;
pointer-events:none;
}

/* loaded row: dim overlay with squares while the patchnote is opening */
.patch-deck-item--big .patch-bp-loader{
position:absolute;
inset:0;
align-items:center;
justify-content:center;
}

.patch-deck-item--big.is-opening .patch-bp-loader{
display:flex;
background:rgba(0,0,0,.55);
}

.patch-deck-item--big.is-failed{
border-color:#ff4d4d;
}

/* loading row: default look, only outline color + small squares bottom-right */
.patch-deck-item.patch-deck-item--bp-loading{
position:relative;
}

.patch-deck-item.patch-deck-item--bp-loading,
.patch-deck-item.patch-deck-item--bp-loading:hover{
border-color:var(--bp-load,#fff);
}

.patch-deck-item--bp-loading .patch-bp-loader{
display:flex;
position:absolute;
right:12px;
bottom:10px;
gap:5px;
}

.patch-bp-loader i{
display:block;
box-sizing:border-box;
width:14px;
height:14px;
border:2px solid var(--bp-load,#fff);
animation:patch-bp-pulse 1s infinite ease-in-out;
}

.patch-deck-item--bp-loading .patch-bp-loader i{
width:9px;
height:9px;
border-width:1.5px;
}

.patch-bp-loader i:nth-child(2){ animation-delay:.15s; }
.patch-bp-loader i:nth-child(3){ animation-delay:.3s; }

@keyframes patch-bp-pulse{
0%,100%{ transform:scale(.6); opacity:.3; }
50%{ transform:scale(1); opacity:1; }
}

.patch-bp-dot{
position:absolute;
top:6px;
left:6px;
z-index:2;
}

.patch-bp-countdown{
position:absolute;
z-index:2;
font-size:11px;
font-weight:700;
white-space:nowrap;
color:var(--bp-count,#fff);
text-shadow:0 0 3px #000,0 0 6px #000;
pointer-events:none;
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

.patch-small2{
margin:2px 0;
font-size:14px;
opacity:.65;
font-style:italic;
}

.patch-smallx{
margin:2px 0;
font-size:12px;
opacity:.65;
}

.patch-small2x{
margin:2px 0;
font-size:14px;
opacity:.65;
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

.patch-QandA_Q{
color:#A0FF8F;
margin:1px 0;
    line-height:1.35;
}
.patch-QandA_A{
color:#FFD28F;
margin:1px 0;
    line-height:1.35;
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
.patch-funny{
color:#9DF2C9;
font-weight: bold;
font-style: italic;
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

.patch-separator{
  display:block;
  width:100%;
  height:1px;
  margin:12px 0;
  border:0;
  background:${color};
  opacity:.85;
}

.patch-gap--1{ height:3px; }
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
      advenced: normalizeAdvanced(base.advenced ?? base.advanced),
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
      showCountdown: activeTimed?.showCountdown ?? false, //timedUntil !== Infinity, // shows a countdown if it actually expires
      until: timedUntil,
      advenced: normalizeAdvanced(activeTimed.advenced ?? activeTimed.advanced),
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
          showCountdown: news?.showCountdown ?? false, //end !== Infinity,
          until: end,
          advenced: normalizeAdvanced(news.advenced ?? news.advanced),
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

    pnLog("fetch", "entry", { id, url, status: res.status, asText });

    if (!res.ok) {
      throw new Error(`Failed to fetch log-${id}: HTTP ${res.status}`);
    }

    if (asText) {
      // pnLog("reading response as text...");

      const text = await res.text();

      // pnLog("text received:", text.length, "chars");

      return text;
    }

    // pnLog("reading response as arrayBuffer...");

    const buffer = await res.arrayBuffer();

    // pnLog("arrayBuffer received:", buffer.byteLength, "bytes");

    const bytes = new Uint8Array(buffer);

    const base64 = btoa(
      Array.from(bytes, (b) => String.fromCharCode(b)).join(""),
    );

    // pnLog("base64 created:", base64.length, "chars");
    // pnLog("calling decompressBase64...");

    const result = await decompressBase64(base64);

    // pnLog("decompressBase64 succeeded");

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
  const entry = openBoxEntry;
  stopBoxCountdown();
  openBoxEntry = null;
  overlay.remove();
  onPatchnoteEvent("box_close", entry);
  // a lower-priority autodisplay entry may have been waiting behind this box
  setTimeout(pnShowNextAuto, 0);
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
        // pnLog(
        //   location.hostname,
        //   `${location.hostname === "localhost"}`,
        //   location.port,
        //   `${location.port === "1111"}`,
        // );
        var doit = true;
        if (location.hostname === "localhost" && location.port === "1111") {
          // pnLog(doit);
          try {
            pnLog("restart", "local launcher restart", location.port);
            await fetch("http://localhost:1111/local-api/restart", {
              method: "POST",
            });
            // pnLog("Screen beacuse 1111");
            showBrickScreen();
            doit = false;
          } catch (err) {
            console.warn("Local restart request failed:", err);
          }
        }
        if (doit) {
          pnLog("restart", "reloading page");
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

  pnHydrateIcons(overlay);
  wireBoxInteractions(overlay, data);

  if (entry.showCountdown && entry.until !== Infinity) {
    startBoxCountdown(overlay, entry);
  }
}

async function presentEntry(entry, { fromAuto = false, rowEl = null } = {}) {
  pnLog("entry", "present", { id: entry?.id, fromAuto });
  try {
    onPatchnoteEvent(fromAuto ? "auto_display" : "manual_open", entry);

    if (rowEl) setRowLoading(rowEl, true);

    if (patchnotesdebug_slowerload) {
      await sleep(1000);
    }

    // stream entries carry (or load) their own content, everything else is fetched
    const data = await pnEntryData(entry);

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
let INDEX_POOL = []; // entries that come from index.json
const streamEntries = new Map(); // inbox entries that came from the event stream (id -> entry)
let deckTickInterval = null;

// inbox = index entries + non-expired stream entries
function rebuildDeckPool() {
  const now = Clock.now();

  for (const [id, entry] of streamEntries) {
    if (entry.until <= now) streamEntries.delete(id);
  }

  DECK_POOL = [...INDEX_POOL, ...streamEntries.values()];
}

function ensureDeckUI() {
  if (!document.getElementById("patchnotes-style")) {
    installStyles(DEFAULTS.box.lines_outline_hex);
  }

  if (SHOW_BELL_BUTTON && !document.getElementById("patch-bell")) {
    const bell = document.createElement("div");
    bell.id = "patch-bell";
    bell.className = "patch-bell";
    bell.innerHTML = `${iconImg("bell", "notifications")}<span id="patch-bell-badge" class="patch-bell-badge" style="display:none;"></span>`;
    bell.onclick = () => {
      onPatchnoteEvent("bell_click", { bell });
      toggleDeck();
    };
    bell.onmouseenter = () => onPatchnoteEvent("bell_hover", { bell });
    bell.onmouseleave = () => onPatchnoteEvent("bell_leave", { bell });

    document.body.appendChild(bell);
    pnHydrateIcons(bell);
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
    retryFailedBigPictures();
    renderDeck(); // starts the big picture loading
    startDeckTicker();
    onPatchnoteEvent("deck_open", { pool: DECK_POOL });
  } else {
    stopDeckTicker();
    onPatchnoteEvent("deck_close", {});
  }
}

function setRowLoading(rowEl, loading, failed = false) {
  // big picture rows have a fixed size: show the squares over the image instead
  if (rowEl.classList.contains("patch-deck-item--big")) {
    rowEl.classList.toggle("is-opening", loading);
    rowEl.classList.toggle("is-failed", failed);
    return;
  }

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

const BIGPIC_STATE = new Map(); // url -> "loaded" | "failed"
const BIGPIC_PENDING = new Map(); // url -> Promise<boolean>

function loadBigPicture(url) {
  if (BIGPIC_PENDING.has(url)) return BIGPIC_PENDING.get(url);

  const fetched = pnEnqueue(
    () =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      }),
  );
  var extra = 0;
  if (patchnotesdebug_slowerload) {
    extra = 3500;
  }
  const minWait = new Promise((r) =>
    setTimeout(r, BIGPICTURE.min_load_ms + extra),
  );

  const promise = Promise.all([fetched, minWait]).then(([ok]) => {
    BIGPIC_STATE.set(url, ok ? "loaded" : "failed");
    BIGPIC_PENDING.delete(url);
    onPatchnoteEvent(ok ? "bigpicture_loaded" : "bigpicture_failed", { url });
    return ok;
  });

  BIGPIC_PENDING.set(url, promise);
  return promise;
}

// failed pictures get another try every time the inbox is opened
function retryFailedBigPictures() {
  for (const [url, state] of BIGPIC_STATE) {
    if (state === "failed") BIGPIC_STATE.delete(url);
  }
}

function renderBigRow(entry, unseen, now) {
  const adv = entry.advenced;

  const posStyle = Object.entries(adv.countdownPos)
    .map(([side, value]) => `${side}:${value}`)
    .join(";");

  const countdown =
    entry.showCountdown && entry.until !== Infinity
      ? `<div class="patch-bp-countdown" data-until="${entry.until}" style="${posStyle}">
           <span data-countdown>${UI_TEXT.expires_prefix}${formatCountdown(entry.until - now)}</span>
         </div>`
      : "";

  return `
      <div class="patch-deck-item patch-deck-item--big" data-id="${entry.id}"
           style="width:100%;max-width:${adv.size.width_px}px;aspect-ratio:${adv.size.width_px}/${adv.size.height_px};height:auto;--bp-load:${adv.loadingColor};--bp-count:${adv.countdownColor}">
        <img class="patch-bp-img" alt="${pnEscapeAttr(entry.title)}">
        <div class="patch-bp-loader"><i></i><i></i><i></i></div>
        ${unseen ? `<span class="patch-deck-dot patch-bp-dot"></span>` : ""}
        ${countdown}
      </div>`;
}

function hydrateBigPictures() {
  const panelOpen = document
    .getElementById("patch-deck-panel")
    ?.classList.contains("open");

  document
    .querySelectorAll(
      "#patch-deck-list .patch-deck-item--big, #patch-deck-list .patch-deck-item--bp-loading",
    )
    .forEach((rowEl) => {
      const entry = DECK_POOL.find((e) => e.id === rowEl.dataset.id);
      const url = entry?.advenced?.bigpicture;
      if (!url) return;

      const state = BIGPIC_STATE.get(url);

      if (state === "loaded") {
        const img = rowEl.querySelector(".patch-bp-img");
        if (img) img.src = url;
      } else if (!state && panelOpen && !BIGPIC_PENDING.has(url)) {
        loadBigPicture(url).then(() => renderDeck());
      }
    });
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
      // pnLog("deck", "entry", entry);
      const unseen = !seen[entry.id];

      const bpState = entry.advenced
        ? BIGPIC_STATE.get(entry.advenced.bigpicture)
        : null;

      if (bpState === "loaded") {
        return renderBigRow(entry, unseen, now);
      }

      const bpLoading = !!entry.advenced && bpState !== "failed";

      const sub = entry.showCountdown
        ? `<div class="patch-deck-item-sub" data-until="${entry.until}">
             <span data-countdown>${UI_TEXT.expires_prefix}${formatCountdown(entry.until - now)}</span>
           </div>`
        : "";

      return `
      <div class="patch-deck-item${bpLoading ? " patch-deck-item--bp-loading" : ""}" data-id="${entry.id}"${bpLoading ? ` style="--bp-load:${entry.advenced.loadingColor}"` : ""}>
        <div class="patch-deck-item-top">
          <div class="patch-deck-item-title">
            ${unseen ? `<span class="patch-deck-dot"></span>` : ""}
            <span>${entry.title}</span>
          </div>
          ${iconImg(entry.icon, entry.title, entry.type === "news" ? "news" : "patchnote")}
        </div>
        ${sub}
        ${bpLoading ? `<div class="patch-bp-loader"><i></i><i></i><i></i></div>` : ""}
      </div>`;
    })
    .join("");

  pnHydrateIcons(listEl);

  listEl.querySelectorAll(".patch-deck-item").forEach((rowEl) => {
    const entryOf = () => DECK_POOL.find((e) => e.id === rowEl.dataset.id);

    rowEl.onclick = () => {
      const entry = entryOf();
      if (!entry) return;
      onPatchnoteEvent("row_click", { entry, rowEl });
      presentEntry(entry, { fromAuto: false, rowEl });
    };

    rowEl.onmouseenter = () => {
      const entry = entryOf();
      if (entry) onPatchnoteEvent("row_hover", { entry, rowEl });
    };

    rowEl.onmouseleave = () => {
      const entry = entryOf();
      if (entry) onPatchnoteEvent("row_leave", { entry, rowEl });
    };
  });

  if (document.getElementById("patch-deck-panel")?.classList.contains("open")) {
    startDeckTicker();
  }

  hydrateBigPictures();
}

function startDeckTicker() {
  stopDeckTicker();

  deckTickInterval = setInterval(() => {
    if (PN_OPTIMIZE.ticker_pause_when_hidden && document.hidden) return;
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
  }, PN_OPTIMIZE.ticker_interval_ms);
}

function stopDeckTicker() {
  if (deckTickInterval) clearInterval(deckTickInterval);
  deckTickInterval = null;
}

function onPatchnoteEvent(event, payload) {
  pnLog("event", event, payload);
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

    case "row_click":
      break;

    case "row_hover":
      tocar("card", false);
      break;

    case "row_leave":
      break;

    case "bell_click":
      tocar("card", false);
      break;

    case "bell_hover":
      tocar("card", false);
      break;

    case "bell_leave":
      break;

    case "box_close":
      break;

    case "icon_failed":
      break;

    case "bigpicture_loaded":
      break;

    case "bigpicture_failed":
      break;

    case "stream_message":
      tocar("card", false);
      break;

    case "tuned":
      break;

    case "unseen_timed_now_active":
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
    pnLog("schedule", "changed, refreshing");
    reloadIndexAndRefresh();
  }, delay);
}

async function reloadIndexAndRefresh() {
  if (reinit_after < Clock.now() - 1.9 * 150000) {
    try {
      var url = `${patchnotes_index_src}?v=${cacheBust()}`;
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

  INDEX_POOL = [...patchnoteCandidates, ...newsCandidates];
  rebuildDeckPool();

  renderDeck();
  scheduleWatcher(nextChange);

  const popup =
    !openBoxEntry && !pnAutoBusy && auto && !isSeen(auto.id) ? auto : null;

  // cue for unseen entries that just became active (the popup one is skipped)
  pnCheckUnseenActive(popup?.id ?? null);

  onPatchnoteEvent("refreshed", { pool: DECK_POOL, auto });

  if (popup) {
    await pnPresentAuto(popup);
  }
}

let pnAutoBusy = false;

async function pnPresentAuto(entry) {
  if (pnAutoBusy || openBoxEntry) return;
  pnAutoBusy = true; // set synchronously so concurrent callers can't double-open
  try {
    await presentEntry(entry, { fromAuto: true });
  } finally {
    pnAutoBusy = false;
  }
}

async function pnShowNextAuto() {
  if (openBoxEntry || pnAutoBusy || !INDEX_CACHE) return;

  const { patchnoteCandidates, newsCandidates } = resolveIndex(INDEX_CACHE);
  const next = pickAutoDisplay(patchnoteCandidates, newsCandidates);
  if (!next || isSeen(next.id)) return;

  await pnPresentAuto(next);
}

// ---------------------------------------------------------------------------
// "unseen entry is active now" cue
// ---------------------------------------------------------------------------
const pnAnnounced = new Set(); // ids already checked this session

// true only when the bell button is really on screen
function pnBellVisible() {
  if (!SHOW_BELL_BUTTON) return false;
  const bell = document.getElementById("patch-bell");
  if (!bell || !bell.isConnected) return false;
  const cs = getComputedStyle(bell);
  return cs.display !== "none" && cs.visibility !== "hidden";
}

// Fires "unseen_timed_now_active" once for entries that just became active
// and are unseen. Does nothing (and remembers nothing) while the bell is
// hidden, so the cue still fires once the bell shows up.
// skipId = entry that is about to pop up as a modal anyway.
function pnCheckUnseenActive(skipId = null) {
  if (!pnBellVisible()) return [];

  const now = Clock.now();
  const fresh = DECK_POOL.filter((e) => !pnAnnounced.has(e.id));
  fresh.forEach((e) => pnAnnounced.add(e.id));

  const unseen = fresh.filter(
    (e) => e.id !== skipId && e.until > now && !isSeen(e.id),
  );
  if (!unseen.length) return [];

  onPatchnoteEvent("unseen_timed_now_active", {
    entry: unseen[0],
    entries: unseen,
    count: unseen.length,
  });
  return unseen;
}

// ---------------------------------------------------------------------------
// Event stream
// ---------------------------------------------------------------------------
let streamSource = null;
let streamPlayerId = null;
const STREAM_SEEN_MAX = 500;
const streamSeen = new Set(); // keys already handled (server re-sends unacked ones on reconnect)
const streamQueue = [];
let streamDraining = false;
let streamRetryTimer = null;
let streamRetryMs = 1000;

function streamPost(path, body) {
  return fetch(`${STREAM_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((e) => console.warn("stream post failed:", path, e));
}

const streamFlags = { js_ready: true, game_ready: false };

function startEventStream(playerId, flags = {}) {
  if (streamSource) streamSource.close();
  clearTimeout(streamRetryTimer);
  streamRetryTimer = null;
  streamPlayerId = playerId;
  Object.assign(streamFlags, flags);

  const url =
    `${STREAM_BASE}/stream?id=${encodeURIComponent(playerId)}` +
    `&orygin=${encodeURIComponent(location.origin)}`;

  const source = new EventSource(url);
  streamSource = source;

  // report the current state on every connect (also after automatic reconnects)
  source.onopen = () => {
    streamRetryMs = 1000;
    streamPost("/stream/ready", { id: streamPlayerId, ...streamFlags });
  };

  source.onmessage = (ev) => handleStreamPayload(ev.data);

  source.onerror = () => {
    console.warn("event stream error / reconnecting");
    // EventSource retries by itself, unless the browser gave up (CLOSED)
    if (source !== streamSource || source.readyState !== EventSource.CLOSED) {
      return;
    }
    clearTimeout(streamRetryTimer);
    streamRetryTimer = setTimeout(
      () => startEventStream(streamPlayerId),
      streamRetryMs,
    );
    streamRetryMs = Math.min(streamRetryMs * 2, 30000);
  };
}

// Update the state later, e.g. setStreamReady({ game_ready: true }) when the game UI is loaded.
function setStreamReady(flags) {
  Object.assign(streamFlags, flags);
  if (!streamPlayerId) return;
  streamPost("/stream/ready", { id: streamPlayerId, ...streamFlags });
}
setStreamReady({ game_ready: true });

// ---- small helpers --------------------------------------------------------
function pnBool(v) {
  return v === true || /^(true|1|yes|on)$/i.test(String(v ?? "").trim());
}

function pnHash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++)
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ISO string, ms number, 10-digit unix seconds, numeric string -> ms (or null)
function pnParseTime(v) {
  if (v === undefined || v === null || v === "" || v === false) return null;
  if (typeof v === "number")
    return Number.isFinite(v) ? (v < 1e12 ? v * 1000 : v) : null;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return pnParseTime(Number(s));
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

// run fn at timestamp ts (setTimeout can't wait longer than ~24 days)
function pnLater(ts, fn) {
  const wait = ts - Clock.now();
  if (wait <= 0) return fn();
  setTimeout(() => pnLater(ts, fn), Math.min(wait, 2147483000));
}

function pnSafeIconId(icon, type) {
  const fallback = type === "patchnote" ? "patchnote" : "news";
  if (typeof icon !== "string") return fallback;
  const id = icon.trim();
  if (/^custom!.+/.test(id) || /^[\w-]+$/.test(id)) return id;
  return fallback;
}

function pnSafeUrl(u) {
  try {
    const x = new URL(String(u).trim(), location.href);
    return /^https?:$/.test(x.protocol) ? x.href : null;
  } catch (e) {
    return null;
  }
}

function pnNormalizeData(data) {
  if (typeof data.box.text !== "string")
    data.box.text = String(data.box.text ?? "");
  return data;
}

// Accepts: tagged text (<box.text>..</box.text>), plain text (used as body),
// a JSON string holding either of those, or a JSON object ({box:{title,text},button:{name},...}).
function pnContentToData(raw) {
  let value = raw;

  if (typeof raw === "string") {
    const t = raw.trim();
    if (/^["{]/.test(t)) {
      try {
        value = JSON.parse(t);
      } catch (e) {}
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const data = deepMerge(clone(DEFAULTS), clone(value));
    if (data.box.text === undefined) {
      data.box.text = value.text ?? value.body ?? value.message ?? "";
    }
    return pnNormalizeData(data);
  }

  const text = String(value ?? "");
  const data = parsePatchNotes(text);
  if (data.box.text === undefined) data.box.text = text; // plain string = body
  return pnNormalizeData(data);
}

async function pnLoadExternal(url, asText) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`external content HTTP ${res.status}`);
  if (asText) return pnContentToData(await res.text());

  const bytes = new Uint8Array(await res.arrayBuffer());
  let text;
  try {
    text = await decompressBase64(
      btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join("")),
    );
  } catch (e) {
    text = new TextDecoder().decode(bytes); // wasn't compressed after all
  }
  return pnContentToData(text);
}

// Decide where a message's content comes from.
// returns { data } (ready now), { loader } (fetched when opened) or null (nothing to show)
//   source: "$predefined"            -> STREAM_MESSAGES[id]
//           "$rawcontent=<text|json>" -> inline content
//           "$external=<url>"         -> fetched from a url (also a bare http(s) url)
//           ""                        -> content / predefined (legacy), else the
//                                        normal change/log-<id> file (index-style entry)
function pnStreamPlan(msg) {
  const src = typeof msg.source === "string" ? msg.source.trim() : "";
  let m;

  if (/^\$predefined$/i.test(src)) {
    const s = STREAM_MESSAGES[msg.id];
    if (s == null) {
      console.warn("Patch notes: no predefined stream message:", msg.id);
      return null;
    }
    return { data: pnContentToData(s) };
  }

  if ((m = src.match(/^\$rawcon\w*\s*=\s*([\s\S]*)$/i))) {
    return { data: pnContentToData(m[1]) };
  }

  if (
    (m = src.match(/^\$external\s*=\s*(.+)$/i)) ||
    /^https?:\/\//i.test(src)
  ) {
    const url = pnSafeUrl(m ? m[1] : src);
    if (!url) {
      console.warn("Patch notes: bad external url:", src);
      return null;
    }
    const asText = msg.text === undefined ? true : pnBool(msg.text);
    return { loader: () => pnLoadExternal(url, asText) };
  }

  if (src) return { data: pnContentToData(src) };

  // content (if not null) wins over the predefined text
  if (msg.content != null) return { data: pnContentToData(msg.content) };
  if (msg.predefined && STREAM_MESSAGES[msg.id] != null) {
    return { data: pnContentToData(STREAM_MESSAGES[msg.id]) };
  }

  // index-shaped message (id + title, no content): load log-<id> like an index entry
  if (msg.id && (msg.title || msg.advenced || msg.advanced)) {
    const asText = pnBool(msg.text); // default false, same as index entries
    return {
      loader: async () => pnNormalizeData(await fetchEntryData(msg.id, asText)),
    };
  }

  return null;
}

// one place that resolves an entry's content (stream, external, or index log)
async function pnEntryData(entry) {
  if (entry.streamData) return entry.streamData;

  if (entry.streamLoader) {
    if (!entry.streamLoading) {
      entry.streamLoading = entry.streamLoader().then(
        (d) => (entry.streamData = d),
        (e) => {
          entry.streamLoading = null; // allow a retry on the next click
          throw e;
        },
      );
    }
    return entry.streamLoading;
  }

  return fetchEntryData(entry.id, entry?.text ?? false);
}

// ---- incoming ---------------------------------------------------------------
// Handles anything the server sends: one object, an array of objects,
// a JSON string, or plain text (shown as the body).
function handleStreamPayload(raw) {
  let parsed = raw;

  if (typeof raw === "string") {
    if (!raw.trim()) return;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = { content: raw };
    }
  }

  for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
    try {
      handleStreamMessage(typeof item === "string" ? { content: item } : item);
    } catch (e) {
      console.error("Patch notes: bad stream message", item, e);
    }
  }
}

function handleStreamMessage(msg) {
  pnLog("stream", "message", msg);
  if (!msg || typeof msg !== "object") return;
  if (/^(ping|heartbeat|keepalive)$/i.test(String(msg.type ?? ""))) return;

  const hasMid = msg.mid !== undefined && msg.mid !== null && msg.mid !== "";
  const key = hasMid ? String(msg.mid) : `h${pnHash(JSON.stringify(msg))}`;

  // acknowledge on receipt so the server drops it from memory
  if (hasMid) streamPost("/stream/ack", { id: streamPlayerId, mid: msg.mid });

  if (streamSeen.has(key)) return; // replayed duplicate
  streamSeen.add(key);
  if (streamSeen.size > STREAM_SEEN_MAX) {
    streamSeen.delete(streamSeen.values().next().value);
  }

  const plan = pnStreamPlan(msg);

  // messages without mid are only real if they have something to show
  if (!plan && !hasMid) return;

  onPatchnoteEvent("stream_message", msg);
  tocar("mail");

  if (!plan) return; // nothing to display

  const now = Clock.now();
  const start = pnParseTime(msg.start ?? msg.from);
  const until = pnParseTime(msg.end ?? msg.until ?? msg.expire) ?? Infinity;
  if (until <= now) return; // already expired

  const data = plan.data ?? null;
  const type = /^patchnote$/i.test(String(msg.type ?? ""))
    ? "patchnote"
    : "news";
  const weight = Number(msg.weight);

  const entry = {
    type,
    kind: "stream",
    id: `stream-${key}`,
    text: true,
    weight: Number.isFinite(weight) ? weight : Number.MAX_SAFE_INTEGER,
    icon: pnSafeIconId(msg.icon ?? data?.icon, type),
    title: String(msg.title ?? data?.box?.title ?? msg.id ?? ""),
    display: msg.display === "fullscreen" ? "fullscreen" : "modal",
    autodisplay: pnBool(msg.autodisplay),
    showCountdown:
      pnBool(msg.showCountdown ?? msg.showcountdown) && until !== Infinity,
    until,
    advenced: normalizeAdvanced(msg.advenced ?? msg.advanced),
    streamData: data, // parsed content, if already available
    streamLoader: plan.loader ?? null, // otherwise fetched when opened
  };

  const delayed = start !== null && start > now;

  const activate = () => {
    if (entry.until <= Clock.now()) return;

    // a live message was already cued by stream_message above
    if (!delayed) pnAnnounced.add(entry.id);

    streamEntries.set(entry.id, entry);
    rebuildDeckPool();
    renderDeck();

    if (delayed) pnCheckUnseenActive(entry.autodisplay ? entry.id : null);

    // drop it from the inbox when it expires
    if (entry.until !== Infinity) {
      pnLater(entry.until + 50, () => {
        rebuildDeckPool();
        renderDeck();
      });
    }

    // popup only when the payload says autodisplay: true (default false)
    if (entry.autodisplay) {
      streamQueue.push(entry);
      drainStreamQueue();
    }
  };

  if (delayed)
    pnLater(start, activate); // not active yet: appears at "start"
  else activate();
}

async function drainStreamQueue() {
  if (streamDraining) return;
  streamDraining = true;

  try {
    while (streamQueue.length) {
      // wait while a patch note / another message is open
      while (openBoxEntry || pnAutoBusy)
        await new Promise((r) => setTimeout(r, 500));

      const entry = streamQueue.shift();
      if (entry.until <= Clock.now()) continue; // expired while queued
      if (isSeen(entry.id)) continue; // already opened from the inbox while queued

      let data;
      try {
        data = await pnEntryData(entry);
      } catch (e) {
        console.warn("Patch notes: stream content failed to load", entry.id, e);
        continue;
      }
      if (openBoxEntry || pnAutoBusy) {
        streamQueue.unshift(entry); // something opened while loading
        continue;
      }

      installStyles(data.box.lines_outline_hex);

      const overlay = document.createElement("div");
      overlay.className = "briefing-overlay";
      document.body.appendChild(overlay);

      renderBox(overlay, entry, data);

      markSeen(entry.id);
      renderDeck();
      onPatchnoteEvent(
        entry.type === "news" ? "news_seen" : "patchnote_seen",
        entry,
      );
    }
  } finally {
    streamDraining = false;
  }
}

let json_patchnotes_for_this_session = {};
let reinit_after = 0;
let have_player_id = false;
let have_inited_stream = false;
async function initPatchnotes() {
  if (PN_WIFI_OPTIMIZE) {
    pnTune("auto");
    if (!pnTuneBound) {
      pnTuneBound = true;
      navigator.connection?.addEventListener?.(
        "change",
        () => PN_WIFI_OPTIMIZE && pnTune("auto"),
      );
    }
  }
  try {
    var url = `${patchnotes_index_src}?v=${cacheBust()}`;
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
    if (have_player_id && !have_inited_stream) {
      have_inited_stream = true;
      startEventStream(playerId);
    }
  } catch (e) {
    console.error("Patch notes failed:", e);
  }
  pcnr = true;
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
