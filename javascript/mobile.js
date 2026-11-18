"use strict";
// Dev note in in .tmp/mobiles.txt dir
(function () {
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);

  const MAX_PHONE_SHORT_SIDE = 600; // CSS px, shorter screen side (real devices)
  const MAX_WINDOW_SHORT_SIDE = 600; // CSS px, shorter window side (desktop windows)
  const MAX_WINDOW_WIDTH = 820; // narrow / portrait-ish desktop windows

  function detectMobile() {
    const force = params.get("mobile");
    if (force === "1") return true;
    if (force === "0") return false;
    const ua = /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent);
    const touch =
      window.matchMedia("(pointer: coarse)").matches &&
      window.matchMedia("(hover: none)").matches;
    const shortSide = Math.min(screen.width, screen.height);
    if ((ua || touch) && shortSide <= MAX_PHONE_SHORT_SIDE) return true;
    // desktop browser: switch by window size (also what devtools / resizing gives)
    const w = window.innerWidth;
    const h = window.innerHeight;
    return Math.min(w, h) <= MAX_WINDOW_SHORT_SIDE || w <= MAX_WINDOW_WIDTH;
  }

  let isMobile = false;
  window.IS_MOBILE = false;

  /* ---------------- safe area probe ---------------- */
  let probe = null;
  function safeInsets() {
    if (!probe) {
      probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
        "padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) " +
        "env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);";
      document.body.appendChild(probe);
    }
    const cs = getComputedStyle(probe);
    return {
      t: parseFloat(cs.paddingTop) || 0,
      r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0,
      l: parseFloat(cs.paddingLeft) || 0,
    };
  }

  /* ---------------- board scale / centering ---------------- */
  const RATIO = 9 / 16;
  let pending = 0;

  function layout() {
    pending = 0;
    if (!document.body) return;
    const now = detectMobile();
    if (now !== isMobile) {
      isMobile = now;
      window.IS_MOBILE = now;
      root.classList.toggle("is-mobile", now);
      if (!now) {
        root.classList.remove(
          "m-land",
          "m-port",
          "kb-open",
          "fill-v",
          "fill-h",
        );
        [
          "--m-s",
          "--m-x",
          "--m-y",
          "--m-bw",
          "--m-bh",
          "--m-w",
          "--m-h",
          "--m-side",
          "--m-side-r",
          "--m-top",
          "--m-bottom",
          "--kb",
          "--vvh",
        ].forEach((k) => root.style.removeProperty(k));
      }
    }
    if (!isMobile) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const land = W > H;
    const sa = safeInsets();

    const bw = W; // layout width of the board (main uses 100% width)
    const bh = W * RATIO; // layout height of the board (vw based)

    const availW = Math.max(100, W - sa.l - sa.r);
    const s = Math.min(1, H / bh, availW / bw);
    const x = sa.l + (availW - bw * s) / 2;
    const y = (H - bh * s) / 2;
    // fill whichever direction actually has the free space (works for near-square windows too)
    const fillV = H - bh * s > W - bw * s;

    const set = (k, v) => root.style.setProperty(k, v);
    set("--m-s", String(s));
    set("--m-x", x + "px");
    set("--m-y", y + "px");
    set("--m-bw", bw * s + "px");
    set("--m-bh", bh * s + "px");
    set("--m-w", W + "px");
    set("--m-h", H + "px");
    // free space around the board (cutout panels)
    set("--m-side", Math.max(0, x) + "px");
    set("--m-side-r", Math.max(0, W - x - bw * s) + "px");
    set("--m-top", Math.max(0, y) + "px");
    set("--m-bottom", Math.max(0, H - y - bh * s) + "px");

    root.classList.toggle("fill-v", fillV);
    root.classList.toggle("fill-h", !fillV);
    root.classList.toggle("m-land", land);
    root.classList.toggle("m-port", !land);

    keyboard();
  }

  function schedule() {
    if (pending) return;
    pending = requestAnimationFrame(layout);
  }

  /* ---------------- keyboard (chat input) ---------------- */
  function keyboard() {
    if (!isMobile) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const kb = Math.max(
      0,
      Math.round(window.innerHeight - vv.height - vv.offsetTop),
    );
    root.style.setProperty("--kb", kb + "px");
    root.style.setProperty("--vvh", Math.round(vv.height) + "px");
    root.classList.toggle("kb-open", kb > 80);
  }

  /* ---------------- cutout images ---------------- */
  const frame = { a: null, b: null };
  let cutoutCfg = null; // from clock_config "mobile"
  let boardPath = null; // fallback when no cutout configured

  function cssUrl(p) {
    return `url("${String(p).replace(/"/g, '\\"')}")`;
  }

  function applyCutout() {
    if (!frame.a) {
      frame.a = document.querySelector("#mobile-frame .mf-a");
      frame.b = document.querySelector("#mobile-frame .mf-b");
    }
    if (!frame.a || !frame.b) return;

    let imgs =
      cutoutCfg && Array.isArray(cutoutCfg.cutout) ? cutoutCfg.cutout : [];
    imgs = imgs.filter(Boolean);
    let mirror = cutoutCfg ? cutoutCfg.mirror !== false : true;
    let dim = false;

    if (!imgs.length && boardPath) {
      // no cutout configured -> reuse the board image, darkened
      imgs = [boardPath];
      mirror = true;
      dim = true;
    }

    const fit = (cutoutCfg && cutoutCfg.fit) || "cover";
    const img1 = imgs[0] || null;
    const img2 = mirror ? img1 : imgs[1] || img1;

    frame.a.style.backgroundImage = img1 ? cssUrl(img1) : "none";
    frame.b.style.backgroundImage = img2 ? cssUrl(img2) : "none";
    frame.a.style.backgroundSize = fit;
    frame.b.style.backgroundSize = fit;

    const f = document.getElementById("mobile-frame");
    f.classList.toggle("mirror", !!mirror && !!img1);
    f.classList.toggle("dim", dim);
    f.classList.toggle("has-img", !!img1);
  }

  /* Called from set_new_image() in clock.js */
  window.setMobileConfig = function (cfg) {
    cutoutCfg = cfg && typeof cfg === "object" ? cfg : null;
    applyCutout();
  };
  window.setMobileBoardFallback = function (path) {
    boardPath =
      typeof path === "string" && !/\.(mp4|webm|m3u8)(\?|$)/i.test(path)
        ? path
        : boardPath;
    applyCutout();
  };

  /* ---------------- background fallback read from the DOM ----------------
   * Works even if clock.js was not patched: we watch the board / deck / start
   * backgrounds and use whichever static image is currently set. */
  function bgUrl(el) {
    if (!el) return null;
    const m = /url\((['"]?)(.*?)\1\)/.exec(
      getComputedStyle(el).backgroundImage || "",
    );
    return m ? m[2] : null;
  }
  function syncFallbackFromDom() {
    const img =
      bgUrl(document.querySelector("main")) ||
      bgUrl(document.querySelector(".deck-bg")) ||
      bgUrl(document.getElementById("very_start_bg1"));
    if (img && img !== boardPath) {
      boardPath = img;
      applyCutout();
    }
  }

  function hookSetNewImage() {
    if (typeof window.set_new_image !== "function" || window.set_new_image.__m)
      return;
    const orig = window.set_new_image;
    const wrapped = function (key, path) {
      if (key === "mobile") {
        window.setMobileConfig(path);
        return;
      }
      return orig.apply(this, arguments);
    };
    wrapped.__m = true;
    window.set_new_image = wrapped;
  }

  /* ---------------- init ---------------- */
  function init() {
    hookSetNewImage();
    layout();
    applyCutout();
    syncFallbackFromDom();
    const mo = new MutationObserver(syncFallbackFromDom);
    ["main", ".deck-bg", "#very_start_bg1"].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) mo.observe(el, { attributes: true, attributeFilter: ["style"] });
    });
    setInterval(() => {
      hookSetNewImage();
      syncFallbackFromDom();
    }, 1500);
    // iOS reports stale sizes right after rotation -> re-measure a few times
    const again = () => {
      schedule();
      setTimeout(layout, 120);
      setTimeout(layout, 400);
    };
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", again);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedule);
      window.visualViewport.addEventListener("scroll", keyboard);
    }
    // keep the page from being scrolled by the keyboard / rubber-banding
    document.addEventListener(
      "focusin",
      () => setTimeout(() => window.scrollTo(0, 0), 50),
      { passive: true },
    );
    // block pinch-zoom of the whole page (single-finger scrolling is untouched)
    document.addEventListener(
      "touchmove",
      (e) => {
        if (isMobile && e.touches.length > 1 && e.cancelable)
          e.preventDefault();
      },
      { passive: false },
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
