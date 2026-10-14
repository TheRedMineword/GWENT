"use strict";
(() => {
  if (window.GwentScreenshot) return; // already loaded

  const BASE_W = 1920;
  const MAX_SIDE = 8192;
  const TRANSPARENT_GIF =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  const DEFAULTS = {
    width: BASE_W,
    format: "png",
    quality: 0.92,
    filename: null,
    background: "#000",
    hideHand: false,
    hideOpponentHand: false,
    overlays: false,
    hide: [],
    delay: 0,
    debug: false,
  };

  // Transient UI that lives inside <main> and is not "the board"
  const OVERLAY_SELECTORS = [
    ".card-preview",
    "#carousel",
    "#popup",
    "#notification-bar",
    "#end-screen",
    "#click-background",
    "#tooltip",
    "#side-tooltip",
  ];

  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "LINK",
    "META",
    "NOSCRIPT",
    "TEMPLATE",
    "IFRAME",
    "OBJECT",
    "EMBED",
    "AUDIO",
    "SOURCE",
    "TRACK",
  ]);

  // Properties that are never copied (behaviour only, or logical duplicates
  // of physical properties we already copy).
  const SKIP_PROPS = new RegExp(
    [
      "^--",
      "^transition",
      "^animation",
      "^cursor$",
      "^pointer-events$",
      "^will-change$",
      "^caret-color$",
      "^user-select$",
      "^-webkit-user-select$",
      "^touch-action$",
      "^scroll-",
      "^overscroll",
      "^resize$",
      "^accent-color$",
      "^view-transition",
      "^container",
      "^counter-",
      "^anchor-",
      "^position-(anchor|area|try|visibility)",
      "^timeline-scope$",
      "^-webkit-app-region$",
      "^contain-intrinsic",
      "(^|-)(inline|block)-(start|end|size)",
      "^(min|max)-(inline|block)-size$",
      "^border-(start|end)-(start|end)-radius$",
    ].join("|"),
  );

  const URL_PROPS = [
    "background-image",
    "border-image-source",
    "mask-image",
    "-webkit-mask-image",
    "mask-border-source",
    "-webkit-mask-box-image-source",
    "list-style-image",
    "shape-outside",
  ];

  const URL_RE =
    /url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^)\s]*))\s*\)/g;

  const MIME_BY_EXT = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
    bmp: "image/bmp",
    ico: "image/x-icon",
  };

  const dataUrlCache = new Map(); // stable (non-blob) URL -> Promise<string|null>
  const DATA_CACHE_MAX = 400;

  // ------------------------------------------------------------------
  // small helpers
  // ------------------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error || new Error("FileReader failed"));
      fr.readAsDataURL(blob);
    });
  }

  function extOf(url) {
    try {
      const p = new URL(url, document.baseURI).pathname;
      const m = p.match(/\.([a-z0-9]+)$/i);
      return m ? m[1].toLowerCase() : "";
    } catch {
      return "";
    }
  }

  function unescapeCssString(s) {
    return s
      .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => {
        try {
          return String.fromCodePoint(parseInt(h, 16));
        } catch {
          return "";
        }
      })
      .replace(/\\(.)/g, "$1");
  }

  function stripInvalidXml(s) {
    // eslint-disable-next-line no-control-regex
    return s.replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,
      "",
    );
  }

  function safeName(s) {
    return (
      String(s || "")
        .replace(/[^\p{L}\p{N}_-]+/gu, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 24) || ""
    );
  }

  // ------------------------------------------------------------------
  // image -> data URI
  // ------------------------------------------------------------------
  function imageToDataURL(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth || img.width;
          c.height = img.naturalHeight || img.height;
          c.getContext("2d").drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error("image load failed"));
      img.src = url;
    });
  }

  async function fetchAsDataURL(url) {
    try {
      const r = await fetch(url, { cache: "force-cache" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      let blob = await r.blob();
      if (!blob.type || blob.type === "application/octet-stream") {
        const mime = MIME_BY_EXT[extOf(url)];
        if (mime) blob = new Blob([blob], { type: mime });
      }
      return await blobToDataURL(blob);
    } catch (e1) {
      try {
        return await imageToDataURL(url);
      } catch (e2) {
        return null;
      }
    }
  }

  function getDataURL(url, env) {
    if (!url) return Promise.resolve(null);
    if (url.startsWith("data:")) return Promise.resolve(url);

    const stable = !url.startsWith("blob:");
    if (stable && dataUrlCache.has(url)) return dataUrlCache.get(url);
    if (env.localCache.has(url)) return env.localCache.get(url);

    const p = fetchAsDataURL(url).then((d) => {
      if (!d) env.failed.add(url);
      return d;
    });
    env.localCache.set(url, p);
    if (stable) {
      if (dataUrlCache.size > DATA_CACHE_MAX) dataUrlCache.clear();
      dataUrlCache.set(url, p);
      // don't keep failures forever (might be a temporary network error)
      p.then((d) => {
        if (!d) dataUrlCache.delete(url);
      });
    }
    return p;
  }

  // Replace every url(...) in a CSS value with an inlined data URI
  async function inlineCssUrls(value, env) {
    const found = [];
    value.replace(URL_RE, (m, dq, sq, bare) => {
      const raw = dq ?? sq ?? bare ?? "";
      found.push({ m, raw: unescapeCssString(raw) });
      return m;
    });
    if (!found.length) return value;

    const resolved = await Promise.all(
      found.map(async ({ raw }) => {
        if (!raw || raw.startsWith("data:")) return null; // keep as is
        let abs = raw;
        try {
          abs = new URL(raw, document.baseURI).href;
        } catch {}
        const d = await getDataURL(abs, env);
        return d || TRANSPARENT_GIF;
      }),
    );

    let i = 0;
    return value.replace(URL_RE, (m) => {
      const r = resolved[i++];
      return r ? `url("${r}")` : m;
    });
  }

  // ------------------------------------------------------------------
  // default computed styles (so the clone only stores what differs)
  // ------------------------------------------------------------------
  class StyleDefaults {
    constructor() {
      this.iframe = document.createElement("iframe");
      this.iframe.setAttribute("aria-hidden", "true");
      this.iframe.style.cssText =
        "position:fixed;left:-10000px;top:0;width:1200px;height:800px;" +
        "border:0;visibility:hidden;pointer-events:none;";
      document.body.appendChild(this.iframe);
      const d = this.iframe.contentDocument;
      d.open();
      d.write("<!doctype html><html><head></head><body></body></html>");
      d.close();
      this.doc = d;
      this.win = d.defaultView;
      this.cache = new Map();
    }

    get(tag) {
      let map = this.cache.get(tag);
      if (map) return map;
      map = new Map();
      const el = this.doc.createElement(tag);
      this.doc.body.appendChild(el);
      const cs = this.win.getComputedStyle(el);
      for (let i = 0; i < cs.length; i++) {
        const p = cs[i];
        map.set(p, cs.getPropertyValue(p));
      }
      this.doc.body.removeChild(el);
      this.cache.set(tag, map);
      return map;
    }

    destroy() {
      this.iframe.remove();
    }
  }

  // Copy computed style -> el.style, skipping values that the clone would get
  // anyway (same as UA default AND same as the parent, so inheritance is safe).
  function freezeStyle(el, cs, parentCS, defaults) {
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (SKIP_PROPS.test(p)) continue;
      const v = cs.getPropertyValue(p);
      if (
        v === defaults.get(p) &&
        (!parentCS || v === parentCS.getPropertyValue(p))
      ) {
        continue;
      }
      el.style.setProperty(p, v, cs.getPropertyPriority(p));
    }
  }

  // ------------------------------------------------------------------
  // DOM -> styled clone
  // ------------------------------------------------------------------
  function frameToDataURL(src) {
    try {
      const w = src.videoWidth || src.naturalWidth || src.width;
      const h = src.videoHeight || src.naturalHeight || src.height;
      if (!w || !h) return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(src, 0, 0, w, h);
      return c.toDataURL("image/png");
    } catch {
      return null; // tainted / not ready
    }
  }

  function makePseudo(src, which, srcCS, env) {
    let ps;
    try {
      ps = getComputedStyle(src, which);
    } catch {
      return null;
    }
    const content = ps.content;
    if (!content || content === "none" || content === "normal") return null;
    if (ps.display === "none") return null;

    const el = document.createElement("span");
    freezeStyle(el, ps, srcCS, env.defaults.get("span"));

    const m =
      content.match(/^"((?:[^"\\]|\\.)*)"$/) ||
      content.match(/^'((?:[^'\\]|\\.)*)'$/);
    if (m && m[1])
      el.appendChild(document.createTextNode(unescapeCssString(m[1])));
    env.pseudoCount++;
    registerUrls(el, env);
    return el;
  }

  function registerUrls(el, env) {
    for (const p of URL_PROPS) {
      const v = el.style.getPropertyValue(p);
      if (v && v.includes("url(")) {
        env.tasks.push(
          inlineCssUrls(v, env).then((nv) => el.style.setProperty(p, nv)),
        );
      }
    }
  }

  function cloneNodeStyled(src, parentCS, env) {
    if (src.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(stripInvalidXml(src.nodeValue));
    }
    if (src.nodeType !== Node.ELEMENT_NODE) return null;

    const tag = src.localName;
    if (SKIP_TAGS.has(src.tagName)) return null;

    // SVG content: copy as is (rare on this board)
    if (src.namespaceURI === "http://www.w3.org/2000/svg" && tag !== "svg") {
      return src.cloneNode(true);
    }

    const cs = getComputedStyle(src);
    if (cs.display === "none") return null;
    if (env.hideSel && src.matches(env.hideSel)) return null;

    let el;
    if (src instanceof HTMLVideoElement || src instanceof HTMLCanvasElement) {
      el = document.createElement("img");
      const d = frameToDataURL(src);
      el.setAttribute("src", d || TRANSPARENT_GIF);
      if (!d) env.warnings.push(`${tag}: no frame available`);
    } else if (src instanceof HTMLImageElement) {
      el = document.createElement("img");
      const url = src.currentSrc || src.src;
      if (/\.gif($|\?)/i.test(url)) {
        // animated gif -> the frame that is showing right now
        const d = frameToDataURL(src);
        if (d) el.setAttribute("src", d);
        else el.setAttribute("src", TRANSPARENT_GIF);
      } else {
        el.setAttribute("src", TRANSPARENT_GIF);
        env.tasks.push(
          getDataURL(url, env).then((d) =>
            el.setAttribute("src", d || TRANSPARENT_GIF),
          ),
        );
      }
    } else if (tag === "svg") {
      el = src.cloneNode(true);
      // keep size/position of the <svg> box itself
      env.defaultsOwner = env.defaultsOwner || null;
      freezeStyle(el, cs, parentCS, env.defaults.get("div"));
      return finishPosition(el, src, cs, env);
    } else {
      el = document.createElement(tag);
      if (tag === "input") el.setAttribute("value", src.value);
    }

    freezeStyle(el, cs, parentCS, env.defaults.get(el.localName));
    finishPosition(el, src, cs, env);
    registerUrls(el, env);

    // ---- children ----
    const skipChildren =
      (env.opts.hideHand && src.id === "hand-row") ||
      (env.opts.hideOpponentHand && src.id === "hand-op") ||
      src instanceof HTMLImageElement ||
      src instanceof HTMLVideoElement ||
      src instanceof HTMLCanvasElement ||
      src instanceof HTMLInputElement;

    if (src instanceof HTMLTextAreaElement) {
      el.appendChild(document.createTextNode(stripInvalidXml(src.value)));
    }

    if (!skipChildren) {
      const before = makePseudo(src, "::before", cs, env);
      if (before) el.appendChild(before);

      for (let n = src.firstChild; n; n = n.nextSibling) {
        const c = cloneNodeStyled(n, cs, env);
        if (c) el.appendChild(c);
      }

      const after = makePseudo(src, "::after", cs, env);
      if (after) el.appendChild(after);
    }

    env.nodeCount++;
    return el;
  }

  // position:fixed is relative to the window, which doesn't exist inside the
  // clone -> turn it into absolute, relative to the board.
  function finishPosition(el, src, cs, env) {
    if (cs.position !== "fixed") return el;
    let left = parseFloat(cs.left);
    let top = parseFloat(cs.top);
    if (Number.isNaN(left) || Number.isNaN(top)) {
      const r = src.getBoundingClientRect();
      left = r.left - (parseFloat(cs.marginLeft) || 0);
      top = r.top - (parseFloat(cs.marginTop) || 0);
    }
    el.style.setProperty("position", "absolute");
    el.style.setProperty("left", left - env.originX + "px");
    el.style.setProperty("top", top - env.originY + "px");
    el.style.setProperty("right", "auto");
    el.style.setProperty("bottom", "auto");
    return el;
  }

  // ------------------------------------------------------------------
  // render
  // ------------------------------------------------------------------
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("SVG render failed"));
      img.src = url;
    });
  }

  async function warmDecode(urls) {
    await Promise.all(
      urls.map(async (u) => {
        try {
          const i = new Image();
          i.src = u;
          if (i.decode) await i.decode();
        } catch {}
      }),
    );
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
          type,
          quality,
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  async function renderSvg(svgText, outW, outH, opts) {
    const attempts = [
      () =>
        URL.createObjectURL(
          new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }),
        ),
      () => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText),
    ];
    let lastErr;
    for (const make of attempts) {
      const url = make();
      try {
        const img = await loadImage(url);
        if (img.decode) await img.decode().catch(() => {});
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        const paint = () => {
          ctx.clearRect(0, 0, outW, outH);
          if (opts.background) {
            ctx.fillStyle = opts.background;
            ctx.fillRect(0, 0, outW, outH);
          }
          ctx.drawImage(img, 0, 0, outW, outH);
        };
        paint();
        // Firefox/Safari can need a beat before nested images are ready
        await sleep(60);
        paint();

        const mime =
          opts.format === "jpeg" || opts.format === "jpg"
            ? "image/jpeg"
            : opts.format === "webp"
              ? "image/webp"
              : "image/png";
        return await canvasToBlob(canvas, mime, opts.quality);
      } catch (e) {
        lastErr = e;
      } finally {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }
    }
    throw lastErr || new Error("Could not render the board");
  }

  // ------------------------------------------------------------------
  // main entry
  // ------------------------------------------------------------------
  async function capture(userOpts = {}) {
    const opts = { ...DEFAULTS, ...userOpts };
    const log = (...a) => opts.debug && console.log("[Screenshot]", ...a);
    const t0 = performance.now();

    const main = document.querySelector("main");
    if (!main || getComputedStyle(main).display === "none") {
      throw new Error(
        "The board is not visible yet (start or join a game first).",
      );
    }
    const rect = main.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (!(W > 0 && H > 0)) throw new Error("The board has no size.");

    if (opts.delay > 0) await sleep(opts.delay);
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    // output size
    let outW =
      opts.width === "screen"
        ? Math.round(W * (window.devicePixelRatio || 1))
        : Math.max(16, Math.round(Number(opts.width) || BASE_W));
    let outH = Math.round((outW * H) / W);
    const over = Math.max(outW, outH) / MAX_SIDE;
    if (over > 1) {
      outW = Math.floor(outW / over);
      outH = Math.floor(outH / over);
    }

    // selectors to leave out
    const hide = [];
    if (!opts.overlays) hide.push(...OVERLAY_SELECTORS);
    hide.push(
      ...(Array.isArray(opts.hide) ? opts.hide : opts.hide ? [opts.hide] : []),
    );
    let hideSel = hide.join(",");
    try {
      if (hideSel) document.createDocumentFragment().querySelector(hideSel);
    } catch {
      throw new Error("Invalid selector in options.hide");
    }

    // ---- everything between here and destroy() is synchronous, so the
    // clone is one consistent snapshot of the board ----
    const env = {
      opts,
      hideSel,
      defaults: new StyleDefaults(),
      originX: rect.left,
      originY: rect.top,
      tasks: [],
      failed: new Set(),
      warnings: [],
      localCache: new Map(),
      nodeCount: 0,
      pseudoCount: 0,
    };

    let clone;
    try {
      clone = cloneNodeStyled(main, null, env);
    } finally {
      env.defaults.destroy();
    }
    if (!clone) throw new Error("Nothing to capture.");

    // the board sits at 0,0 of the canvas
    const s = clone.style;
    s.setProperty("position", "absolute");
    s.setProperty("left", "0px");
    s.setProperty("top", "0px");
    s.setProperty("right", "auto");
    s.setProperty("bottom", "auto");
    s.setProperty("margin", "0px");
    s.setProperty("width", W + "px");
    s.setProperty("height", H + "px");
    s.setProperty("transform", "none");

    const holder = document.createElement("div");
    holder.style.cssText = `position:relative;width:${W}px;height:${H}px;overflow:hidden;margin:0;padding:0;`;
    holder.appendChild(clone);

    log(
      `cloned ${env.nodeCount} elements (+${env.pseudoCount} pseudo) in ${Math.round(performance.now() - t0)}ms`,
    );

    // inline images
    await Promise.all(env.tasks);
    if (env.failed.size) {
      const list = [...env.failed];
      console.warn(
        `[Screenshot] ${list.length} image(s) could not be loaded and were left blank`,
        opts.debug ? list : "(use debug:true to list)",
      );
    }

    // pre-decode the data URIs so the renderer doesn't race them
    const dataUrls = new Set();
    const html0 = holder.outerHTML; // cheap check only to find urls
    html0.replace(/url\(&quot;(data:image\/[^&]+?)&quot;\)/g, (_, u) => {
      dataUrls.add(u);
      return _;
    });
    if (dataUrls.size && dataUrls.size < 800) await warmDecode([...dataUrls]);

    const xml = stripInvalidXml(new XMLSerializer().serializeToString(holder));
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${W} ${H}">` +
      `<foreignObject x="0" y="0" width="${W}" height="${H}">${xml}</foreignObject></svg>`;
    log(`svg ${(svg.length / 1048576).toFixed(1)} MB, output ${outW}x${outH}`);

    const blob = await renderSvg(svg, outW, outH, opts);
    log(
      `done in ${Math.round(performance.now() - t0)}ms (${(blob.size / 1024).toFixed(0)} KB)`,
    );
    if (opts.debug && env.warnings.length)
      console.warn("[Screenshot]", env.warnings);
    return blob;
  }

  function buildFilename(opts, blob) {
    if (opts.filename) return opts.filename;
    const ext =
      blob.type === "image/jpeg"
        ? "jpg"
        : blob.type === "image/webp"
          ? "webp"
          : "png";
    const me = safeName(document.getElementById("name-me")?.textContent);
    const op = safeName(document.getElementById("name-op")?.textContent);
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    const who = me && op ? `${me}_vs_${op}_` : "";
    return `gwent_${who}${stamp}.${ext}`;
  }

  async function download(opts = {}) {
    const blob = await capture(opts);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildFilename({ ...DEFAULTS, ...opts }, blob);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return blob;
  }

  async function copy(opts = {}) {
    // the clipboard only accepts PNG reliably
    const blob = await capture({ ...opts, format: "png" });
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      throw new Error(
        "Clipboard image copy is not supported here (needs https and a recent browser).",
      );
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return blob;
  }

  async function open(opts = {}) {
    // open the tab first (inside the user gesture), fill it afterwards
    const w = window.open("", "_blank");
    try {
      const blob = await capture(opts);
      const url = URL.createObjectURL(blob);
      if (w) w.location.href = url;
      else window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return blob;
    } catch (e) {
      if (w) w.close();
      throw e;
    }
  }

  const api = Object.freeze({ capture, download, copy, open, version: "1.0" });
  Object.defineProperty(window, "GwentScreenshot", {
    value: api,
    writable: false,
    configurable: false,
    enumerable: true,
  });
  if (!("takeScreenshot" in window)) {
    Object.defineProperty(window, "takeScreenshot", {
      value: (opts) => download(opts),
      writable: false,
      configurable: false,
      enumerable: true,
    });
  }
})();
// I will add propably an discord bot command for it so user can share their screenshots, idk
// NOTE TO SELF: dont forget
// Also 100% rewrite idea so users dont steal your discord webhook and spam it
async function discord_integration_sendScreenshotToDiscord(webhookUrl, msg) {
  const blob = await GwentScreenshot.capture();

  const formData = new FormData();
  formData.append("files[0]", blob, "screenshot.png");
  formData.append(
    "payload_json",
    JSON.stringify({
      content: msg ?? "Gwent screenshot",
    }),
  );

  const response = await fetch(webhookUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`failed: ${response.status} ${await response.text()}`);
  }

  return response;
}
