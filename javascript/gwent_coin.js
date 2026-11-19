"use strict";
function decodeAndStripHtml(str) {
  const div = document.createElement("div");
  div.innerHTML = str;
  return div.textContent || "";
}
function getDarkerHex(hex, factor = 0.7) {
  // Remove '#' if present
  hex = hex.replace("#", "");
  // Parse R,G,B
  const r = Math.floor(parseInt(hex.substring(0, 2), 16) * factor);
  const g = Math.floor(parseInt(hex.substring(2, 4), 16) * factor);
  const b = Math.floor(parseInt(hex.substring(4, 6), 16) * factor);
  // Clamp values
  const R = Math.min(255, Math.max(0, r));
  const G = Math.min(255, Math.max(0, g));
  const B = Math.min(255, Math.max(0, b));
  // Return as hex
  return (
    "#" +
    R.toString(16).padStart(2, "0") +
    G.toString(16).padStart(2, "0") +
    B.toString(16).padStart(2, "0")
  );
}
function getContrastingTextColor(hex) {
  hex = hex.replace("#", "");

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq >= 186 ? "#000000" : "#FFFFFF";
}

async function displayCoinToss(
  starter,
  coinImages,
  resultText,

  meLeader,
  meName,
  meColor,
  meFaction,

  opLeader,
  opName,
  opColor,
  opFaction,
) {
  const DEBUG = coin_cnfg.debug;
  const log = (...a) => DEBUG && console.log("[CoinToss]", ...a);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  log("Starting.");
  log("Starter:", starter);
  log("Me:", meName, meFaction, meLeader);
  log("Op:", opName, opFaction, opLeader);

  let old = document.getElementById("gwent-coin-toss");
  if (old) {
    log("Removing previous overlay.");
    old.remove();
  }

  // Replace older injected styles so config/CSS updates take effect immediately.
  document.getElementById("gwent-coin-style")?.remove();
  document.getElementById("gwent-coin-style-v2")?.remove();

  if (!document.getElementById("gwent-coin-style-v2")) {
    log("Injecting CSS.");

    const style = document.createElement("style");
    style.id = "gwent-coin-style-v2";

    style.textContent = `
#gwent-coin-toss{
    position:fixed;
    inset:0;
    overflow:hidden;
    z-index:999999999;
    pointer-events:none;
    font-family:serif;

    /* dark vignette, warm light in the middle like the table in Gwent */
    background:
        radial-gradient(ellipse at 50% 50%,
            rgba(48,33,12,.55) 0%,
            rgba(0,0,0,.86) 60%,
            rgba(0,0,0,.96) 100%);
}

/* ---------- player panels ---------- */
.gwent-player{
    position:absolute;
    display:flex;
    align-items:center;
    gap:1vw;
    opacity:0;
    transition:opacity .8s, transform .6s cubic-bezier(.2,.8,.2,1), box-shadow .6s;
    font-size:clamp(20px,1.6vw,34px);

    padding:1vh 1vw;
    border-radius:12px;

    background: color-mix(in srgb, var(--p-bg) 65%, rgba(0,0,0,0.85));
    border:2px solid var(--p-color);

    box-shadow:
        0 0 0 1px rgba(0,0,0,0.9),
        0 0 18px rgba(0,0,0,0.8);
}
.gwent-player.me{ left:2vw; bottom:2vh; transform-origin:left bottom; }
.gwent-player.op{ right:2vw; top:2vh;   transform-origin:right top; }

/* whoever goes first lights up */
.gwent-player.winner{
    transform:scale(1.07);
    box-shadow:
        0 0 0 1px rgba(0,0,0,0.9),
        0 0 32px var(--p-color);
}

.gwent-player .leader{
    height:auto;
    max-height:12vh;
    width:auto;
    border-radius:8px;
    box-shadow:0 0 12px rgba(0,0,0,0.6);
}
.gwent-player .faction{
    width:clamp(28px,2vw,52px);
    height:auto;
    border-radius:0;
    box-shadow:0 0 8px rgba(0,0,0,0.6);
}
.gwent-player span{
    font-weight:600;
    letter-spacing:0.5px;
    color: var(--p-text);
    text-shadow:none;
}

/* ---------- coin ---------- */
.coin-area{
    position:absolute;
    left:50%;
    top:50%;
    transform:translate(-50%,-50%);
}

.coin-stage{
    --coin-size: clamp(150px, 12vw, 300px);
    --half: calc(var(--coin-size) * var(--coin-face-offset, .03));
    position:relative;
    width:var(--coin-size);
    height:var(--coin-size);
}

/* warm light pool under the coin */
.coin-spot{
    position:absolute;
    left:-120%; top:-120%;
    width:340%; height:340%;
    border-radius:50%;
    background: radial-gradient(circle,
        rgba(var(--impact-rgb, 255,214,120),.32) 0%,
        rgba(var(--impact-rgb, 255,214,120),.12) 35%,
        rgba(0,0,0,0) 68%);
    opacity:0;
}

/* contact shadow on the table */
.coin-shadow{
    position:absolute;
    left:8%;
    bottom:-16%;
    width:84%;
    height:22%;
    border-radius:50%;
    background: radial-gradient(ellipse, rgba(0,0,0,.85) 0%, rgba(0,0,0,0) 70%);
    opacity:0;
}

/* this element is thrown up / down; it also owns the 3D perspective */
.coin-flight{
    position:absolute;
    inset:0;
    perspective: calc(var(--coin-size) * 5);
    filter:
        drop-shadow(0 0 14px rgba(var(--impact-rgb, 255,214,120),.28))
        drop-shadow(0 6px 10px rgba(0,0,0,.55));
}

/* this element tumbles end-over-end */
.coin{
    position:absolute;
    inset:0;
    transform-style:preserve-3d;
}

.coin-face{
    position:absolute;
    inset:0;
    width:100%;
    height:100%;
    object-fit:contain;
    backface-visibility:hidden;
}
.coin-face.front{ transform: translateZ(var(--half)); }
.coin-face.back { transform: rotateX(180deg) translateZ(var(--half)); }

/* Stacked hollow rings create the visible edge without filling a PNG's hole. */
.coin-edge{
    position:absolute;
    inset:var(--edge-inset, 3.5%);
    border-radius:50%;
    border:1px solid rgba(0,0,0,.34);
    box-shadow:inset 0 0 1px rgba(255,255,255,.22);
    transform: translateZ(calc(var(--coin-size) * var(--k)));
    -webkit-mask:radial-gradient(circle at center,
        transparent 0 calc(var(--coin-size) * var(--hole-radius, 0)),
        #000 calc(var(--coin-size) * var(--hole-radius, 0) + 1px));
    mask:radial-gradient(circle at center,
        transparent 0 calc(var(--coin-size) * var(--hole-radius, 0)),
        #000 calc(var(--coin-size) * var(--hole-radius, 0) + 1px));
}

/* impact effects */
.coin-ring{
    position:absolute;
    inset:0;
    border-radius:50%;
    border:var(--impact-ring-border, 3px) solid rgba(var(--impact-rgb, 255,214,120),.95);
    box-shadow:
        0 0 24px rgba(var(--impact-rgb, 255,214,120),.7),
        inset 0 0 24px rgba(var(--impact-rgb, 255,214,120),.5);
    opacity:0;
}
.coin-spark{
    position:absolute;
    left:50%; top:50%;
    width:var(--spark-size, 6px); height:var(--spark-size, 6px);
    margin:calc(var(--spark-size, 6px) / -2) 0 0 calc(var(--spark-size, 6px) / -2);
    border-radius:50%;
    background:rgba(var(--impact-rgb, 255,214,120),.98);
    box-shadow:0 0 8px 2px rgba(var(--impact-rgb, 255,214,120),.78);
    opacity:0;
}

.result{
    position: absolute;
    left: 130%;
    top: 50%;
    transform: translateY(-50%);

    width: 460px;
    text-align: center;

    opacity: 0;
    white-space: normal;

    color: #d8bc7d;
    font-size: clamp(28px, 2.3vw, 52px);

    text-shadow:
        0 0 10px black,
        0 0 20px black,
        0 0 30px black;
}
`;
    document.head.appendChild(style);
  }

  const fixColor = (c) => {
    if (!c) return "#ffffff";
    if (c.startsWith("#")) return c;
    return "#" + c;
  };

  function makePlayer(side, leader, faction, name, color) {
    const baseColor = fixColor(color);
    const bgColor = getDarkerHex(baseColor, 0.35);
    const textColor = getContrastingTextColor(baseColor);

    const div = document.createElement("div");
    div.className = `gwent-player ${side}`;

    div.style.setProperty("--p-color", baseColor);
    div.style.setProperty("--p-bg", bgColor);
    div.style.setProperty("--p-text", textColor);

    const leaderImg = document.createElement("img");
    leaderImg.className = "leader";

    if (leader !== "Gaunter_Leader" && leader !== "Gaunter_Leader2") {
      leaderImg.src = `img/sm/${faction}_${leader}.jpg`;
    } else {
      if (leader === "Gaunter_Leader") {
        leaderImg.src = `img/sm/neutral_Gaunter_Leader.jpg`;
      } else {
        leaderImg.src = `img/sm/neutral_Gaunter_Leader2.jpg`;
      }
    }

    const factionImg = document.createElement("img");
    factionImg.className = "faction";
    factionImg.src = `img/icons/deck_shield_${faction}.png`;

    const span = document.createElement("span");
    span.textContent = decodeAndStripHtml(name);
    span.style.color = textColor;

    if (side === "op") {
      // name - shield - leader
      div.append(span, factionImg, leaderImg);
    } else {
      // leader - shield - name
      div.append(leaderImg, factionImg, span);
    }

    return div;
  }

  // ---- build DOM --------------------------------------------------------
  const overlay = document.createElement("div");
  overlay.id = "gwent-coin-toss";

  overlay.append(
    makePlayer("me", meLeader, meFaction, meName, meColor),
    makePlayer("op", opLeader, opFaction, opName, opColor),
  );

  const coinArea = document.createElement("div");
  coinArea.className = "coin-area";

  const stage = document.createElement("div");
  stage.className = "coin-stage";
  stage.style.setProperty("--coin-face-offset", String(coin_cnfg.faceOffset));
  stage.style.setProperty("--edge-inset", `${coin_cnfg.edgeInset}%`);
  stage.style.setProperty(
    "--impact-ring-border",
    `${coin_cnfg.impactRingBorderPx}px`,
  );
  stage.style.setProperty("--spark-size", `${coin_cnfg.sparkSizePx}px`);

  const spot = document.createElement("div");
  spot.className = "coin-spot";

  const shadow = document.createElement("div");
  shadow.className = "coin-shadow";

  const flight = document.createElement("div");
  flight.className = "coin-flight";

  const coin = document.createElement("div");
  coin.className = "coin";

  // Edge slices sit between the two faces. A radial mask keeps the centre
  // hollow, so the PNG's transparent hole stays open during edge-on rotation.
  const edgeSlices = [];
  const fallbackRgb = [119, 115, 107];
  for (let i = 0; i < coin_cnfg.edgeSlices; i++) {
    const s = document.createElement("div");
    s.className = "coin-edge";
    const t = coin_cnfg.edgeSlices > 1 ? i / (coin_cnfg.edgeSlices - 1) : 0.5;
    const depth = coin_cnfg.edgeDepthStart + coin_cnfg.edgeThickness * t;
    s.style.setProperty("--k", depth.toFixed(4));
    s.style.setProperty("--hole-radius", "0");
    if (!coin_cnfg.hollowCoin) {
      s.style.webkitMask = "none";
      s.style.mask = "none";
    }
    s.style.backgroundColor = coin_cnfg.rimFallbackColor || "#77736b";
    s.style.backgroundImage =
      "linear-gradient(180deg, rgba(255,255,255,.16), rgba(0,0,0,.08) 48%, rgba(0,0,0,.24))";
    edgeSlices.push(s);
    coin.appendChild(s);
  }

  const front = document.createElement("img");
  front.className = "coin-face front";
  front.src = coinImages.me;

  const back = document.createElement("img");
  back.className = "coin-face back";
  back.src = coinImages.op;

  for (const img of [front, back]) {
    img.addEventListener("error", () =>
      console.warn("[CoinToss] Missing coin image:", img.src),
    );
  }

  coin.append(front, back);
  flight.appendChild(coin);

  const ring = document.createElement("div");
  ring.className = "coin-ring";

  stage.append(spot, shadow, flight, ring);

  const result = document.createElement("div");
  result.className = "result";

  coinArea.append(stage, result);
  overlay.appendChild(coinArea);
  document.body.appendChild(overlay);

  log("Overlay added.");

  const mePanel = overlay.querySelector(".me");
  const opPanel = overlay.querySelector(".op");

  // make sure both coin faces are loaded so nothing pops in mid-flip
  const faceReady = (img) =>
    new Promise((res) => {
      if (img.complete && img.naturalWidth) return res();
      img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
    });
  await Promise.race([
    Promise.all([faceReady(front), faceReady(back)]),
    wait(1500),
  ]);

  // Sample a narrow ring just inside each image's circular outer edge. This
  // lets the 3D side inherit the coin's own metal/texture instead of using gold.
  function sampleCoinRim(img) {
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) {
      return null;
    }

    try {
      const maxSide = coin_cnfg.rimSampleSize || 256;
      const scale = Math.min(
        1,
        maxSide / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);

      const pixels = ctx.getImageData(0, 0, w, h).data;
      const cx = (w - 1) / 2;
      const cy = (h - 1) / 2;
      const radius = Math.min(w, h) * 0.465;
      const samples = [];

      // Several nearby radii avoid relying on a single antialiased pixel row.
      for (const r of [radius - 2, radius, radius + 2]) {
        for (let n = 0; n < 72; n++) {
          const a = (n / 72) * Math.PI * 2;
          const x = Math.round(cx + Math.cos(a) * r);
          const y = Math.round(cy + Math.sin(a) * r);
          if (x < 0 || x >= w || y < 0 || y >= h) continue;
          const p = (y * w + x) * 4;
          const alpha = pixels[p + 3];
          if (alpha < coin_cnfg.holeAlphaThreshold) continue; // ignore transparent corners/background
          samples.push([pixels[p], pixels[p + 1], pixels[p + 2]]);
        }
      }

      if (samples.length < 8) return null;

      // Median is more resistant than a simple average to highlights and artwork.
      const median = (channel) => {
        const values = samples.map((rgb) => rgb[channel]).sort((a, b) => a - b);
        return Math.round(values[Math.floor(values.length / 2)]);
      };
      return [median(0), median(1), median(2)];
    } catch (err) {
      // Canvas sampling can be blocked for cross-origin images; use the fallback.
      console.debug("[CoinToss] Could not sample coin rim:", err);
      return null;
    }
  }

  // Read the transparent centre radius from a PNG. The returned value is
  // a fraction of the full coin width, suitable for the CSS ring mask.
  function detectTransparentHoleRadius(img) {
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight)
      return null;
    try {
      const maxSide = coin_cnfg.rimSampleSize || 256;
      const scale = Math.min(
        1,
        maxSide / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      const pixels = ctx.getImageData(0, 0, w, h).data;
      const cx = (w - 1) / 2;
      const cy = (h - 1) / 2;
      const maxRadius = Math.min(w, h) * 0.38;
      const boundaries = [];
      const alphaAt = (x, y) => pixels[(y * w + x) * 4 + 3];
      const centerX = Math.round(cx);
      const centerY = Math.round(cy);
      // An opaque centre means this particular coin image has no transparent hole.
      if (alphaAt(centerX, centerY) >= coin_cnfg.holeAlphaThreshold) return 0;

      for (let angleIndex = 0; angleIndex < 96; angleIndex++) {
        const angle = (angleIndex / 96) * Math.PI * 2;
        let boundary = null;
        for (let radius = 1; radius <= maxRadius; radius += 1) {
          const x = Math.round(cx + Math.cos(angle) * radius);
          const y = Math.round(cy + Math.sin(angle) * radius);
          if (x < 0 || x >= w || y < 0 || y >= h) break;
          if (alphaAt(x, y) >= coin_cnfg.holeAlphaThreshold) {
            boundary = radius / Math.min(w, h);
            break;
          }
        }
        if (boundary !== null) boundaries.push(boundary);
      }
      if (boundaries.length < 24) return null;
      boundaries.sort((a, b) => a - b);
      return boundaries[Math.floor(boundaries.length / 2)];
    } catch (err) {
      console.debug("[CoinToss] Could not detect transparent coin hole:", err);
      return null;
    }
  }

  const backRim = coin_cnfg.sampleRimColors
    ? sampleCoinRim(back) || fallbackRgb
    : fallbackRgb;
  const frontRim = coin_cnfg.sampleRimColors
    ? sampleCoinRim(front) || backRim
    : backRim;

  if (coin_cnfg.hollowCoin) {
    const frontHoleRadius = detectTransparentHoleRadius(front);
    const backHoleRadius = detectTransparentHoleRadius(back);
    const autoHoleRadius =
      coin_cnfg.holeRadius === "auto"
        ? frontHoleRadius === null && backHoleRadius === null
          ? null
          : Math.max(frontHoleRadius || 0, backHoleRadius || 0)
        : Number(coin_cnfg.holeRadius);
    // Use the fallback only when sampling was blocked/unavailable, not when
    // both images were successfully inspected and have solid centres.
    const holeRadius =
      autoHoleRadius === null
        ? coin_cnfg.holeRadiusFallback
        : Number.isFinite(autoHoleRadius)
          ? Math.max(0, autoHoleRadius)
          : coin_cnfg.holeRadiusFallback;
    edgeSlices.forEach((slice) => {
      if (holeRadius > 0) {
        slice.style.setProperty("--hole-radius", String(holeRadius));
      } else {
        slice.style.webkitMask = "none";
        slice.style.mask = "none";
      }
    });
    log("Hollow coin edge radius:", holeRadius);
  }
  const toHex = (rgb) =>
    "#" +
    rgb
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  const mixRgb = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
  const shadeRgb = (rgb, factor) =>
    rgb.map((v) => Math.max(0, Math.min(255, v * factor)));

  edgeSlices.forEach((slice, i) => {
    const t = edgeSlices.length > 1 ? i / (edgeSlices.length - 1) : 0.5;
    const faceTone = mixRgb(backRim, frontRim, t);
    // Gentle alternating brightness creates a fine reeded-metal edge.
    const tone = shadeRgb(
      faceTone,
      i % 2 ? coin_cnfg.rimShadowFactor : coin_cnfg.rimHighlightFactor,
    );
    slice.style.backgroundColor = toHex(tone);
  });

  overlay.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: coin_cnfg.introFadeMs,
  });
  coinArea.animate(
    [
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1 },
    ],
    { duration: coin_cnfg.introScaleMs, easing: "ease-out" },
  );

  mePanel.style.opacity = "1";
  opPanel.style.opacity = "1";

  log("Panels faded in.");

  await wait(coin_cnfg.panelDelayMs);

  try {
    if (typeof tocar === "function") {
      log("Playing coin_flip.");
      tocar("coin_flip", false);
    }
  } catch (e) {
    console.warn(e);
  }

  // ---- the toss ---------------------------------------------------------
  const landOnOp = starter === "op";
  const winnerFactionColor = fixColor(landOnOp ? opColor : meColor);
  const impactColor = coin_cnfg.impactUseWinnerFactionColor
    ? winnerFactionColor
    : fixColor(coin_cnfg.impactColor);
  const impactMatch = /^#?([0-9a-f]{6})$/i.exec(impactColor);
  const impactHex = impactMatch ? impactMatch[1] : "ffd678";
  const impactRgb = [0, 2, 4].map((i) =>
    parseInt(impactHex.slice(i, i + 2), 16),
  );
  // NOTE: the winner color is applied only at impact (see below). Until then the
  // CSS fallback (neutral gold) is used, so the glow can't reveal the winner early.

  const T = coin_cnfg.flightMs;
  const LAND = coin_cnfg.land;
  // front (me) is up at multiples of 360, back (op) at +180
  const finalX = coin_cnfg.flips * 360 + (landOnOp ? 180 : 0);

  log("Starting spin. Landing on:", landOnOp ? "op" : "me");

  const up = `cubic-bezier(.2,.75,.35,1)`; // decelerating (rising)
  const down = `cubic-bezier(.6,0,.9,.55)`; // accelerating (falling)

  // 1) throw: up toward the camera, back down onto the table, then bounce
  const flightAnim = flight.animate(
    [
      { offset: 0, transform: "translateY(0) scale(1)", easing: "ease-out" },
      // little crouch before the flick
      { offset: 0.06, transform: "translateY(1.6vh) scale(.95)", easing: up },
      {
        offset: 0.46,
        transform: `translateY(-${coin_cnfg.peakVh}vh) scale(${coin_cnfg.peakScale})`,
        easing: down,
      },
      { offset: LAND, transform: "translateY(0) scale(1)", easing: up },
      { offset: 0.875, transform: "translateY(-5vh) scale(1.1)", easing: down },
      { offset: 0.935, transform: "translateY(0) scale(1)", easing: up },
      {
        offset: 0.965,
        transform: "translateY(-1.4vh) scale(1.03)",
        easing: down,
      },
      { offset: 1, transform: "translateY(0) scale(1)" },
    ],
    { duration: T, fill: "forwards" },
  );

  // 2) tumble end over end, slowing down so the face can be read
  const spinAnim = coin.animate(
    [
      { offset: 0, transform: "rotateX(0deg)", easing: "linear" },
      {
        offset: 0.06,
        transform: "rotateX(0deg)",
        easing: "cubic-bezier(.22,.55,.55,.95)",
      },
      { offset: LAND, transform: `rotateX(${finalX}deg)`, easing: "ease-out" },
      // coin rocks a little on every bounce before lying flat
      {
        offset: 0.875,
        transform: `rotateX(${finalX + 14}deg)`,
        easing: "ease-in-out",
      },
      { offset: 0.935, transform: `rotateX(${finalX}deg)`, easing: "ease-out" },
      {
        offset: 0.965,
        transform: `rotateX(${finalX - 5}deg)`,
        easing: "ease-in-out",
      },
      { offset: 1, transform: `rotateX(${finalX}deg)` },
    ],
    { duration: T, fill: "forwards" },
  );

  // 3) slight drift in the picture plane so it doesn't look mechanical
  const driftAnim = coin.animate(
    [
      { offset: 0, rotate: "0deg", easing: "ease-in-out" },
      { offset: 0.46, rotate: "16deg", easing: "ease-in-out" },
      { offset: LAND, rotate: "0deg" },
      { offset: 1, rotate: "0deg" },
    ],
    { duration: T, fill: "forwards" },
  );

  // 4) shadow on the table: small & faint while airborne, tight when close
  const shadowAnim = shadow.animate(
    [
      { offset: 0, opacity: 0.55, transform: "scale(1)" },
      { offset: 0.06, opacity: 0.6, transform: "scale(1.02)" },
      { offset: 0.46, opacity: 0.16, transform: "scale(.5)" },
      { offset: LAND, opacity: 0.75, transform: "scale(1)" },
      { offset: 0.875, opacity: 0.45, transform: "scale(.85)" },
      { offset: 0.935, opacity: 0.75, transform: "scale(1)" },
      { offset: 0.965, opacity: 0.6, transform: "scale(.95)" },
      { offset: 1, opacity: 0.7, transform: "scale(1)" },
    ],
    { duration: T, fill: "forwards" },
  );

  // 5) light pool brightens on impact
  const spotAnim = spot.animate(
    [
      { offset: 0, opacity: 0, scale: 0.7 },
      { offset: 0.2, opacity: 0.55, scale: 1 },
      { offset: LAND, opacity: 0.55, scale: 1 },
      { offset: LAND + 0.03, opacity: 1, scale: 1.15 },
      { offset: 1, opacity: 0.6, scale: 1 },
    ],
    { duration: T, fill: "forwards" },
  );

  // 6) shockwave ring + sparks at the moment of impact
  const impactDelay = T * LAND;
  if (coin_cnfg.impactRingEnabled) {
    ring.animate(
      [
        { opacity: 0.95, transform: "scale(.9)" },
        { opacity: 0, transform: `scale(${coin_cnfg.impactRingEndScale})` },
      ],
      {
        delay: impactDelay,
        duration: coin_cnfg.impactRingDurationMs,
        easing: "cubic-bezier(.1,.6,.3,1)",
        fill: "forwards",
      },
    );
  }

  const stageSize = stage.offsetWidth || 150;
  for (let i = 0; i < coin_cnfg.sparks; i++) {
    const sp = document.createElement("div");
    sp.className = "coin-spark";
    sp.style.setProperty("--spark-size", `${coin_cnfg.sparkSizePx}px`);
    stage.appendChild(sp);

    const ang = Math.random() * Math.PI * 2;
    const dist = stageSize * (0.55 + Math.random() * 0.75);
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist * 0.6 + stageSize * 0.25; // slight gravity

    sp.animate(
      [
        { opacity: 1, transform: "translate(0,0) scale(1)" },
        { opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.2)` },
      ],
      {
        delay: impactDelay + Math.random() * 60,
        duration:
          coin_cnfg.sparkDurationMinMs +
          Math.random() * coin_cnfg.sparkDurationVarianceMs,
        easing: "cubic-bezier(.1,.7,.3,1)",
        fill: "forwards",
      },
    );
  }

  // reveal the winner color exactly at touchdown (ring, sparks, light pool, coin glow)
  await wait(impactDelay);
  stage.style.setProperty("--impact-rgb", impactRgb.join(","));
  stage.style.setProperty("--impact-color", `#${impactHex}`);

  // light up the player who goes first the moment the coin touches down
  await wait(40);

  const winnerPanel = starter === "op" ? opPanel : mePanel;
  const loserPanel = starter === "op" ? mePanel : opPanel;
  winnerPanel.classList.add("winner");
  loserPanel.style.opacity = ".45";

  try {
    if (typeof tocar === "function") {
      log("coin landed.");
      // tocar("coin_land", false); // disabled on purpose
    }
  } catch (e) {
    console.warn(e);
  }

  // wait for bounces to finish
  await Promise.all([
    flightAnim.finished,
    spinAnim.finished,
    driftAnim.finished,
    shadowAnim.finished,
    spotAnim.finished,
  ]);

  log("Coin landed.", starter);

  // ---- slide coin aside, show result -------------------------------------
  const dir = -1;
  log("Sliding coin.", dir < 0 ? "towards me" : "towards opponent");

  stage.animate(
    [
      { transform: "translateX(0)" },
      { transform: `translateX(${dir * coin_cnfg.slideDistanceVw}vw)` },
    ],
    {
      duration: coin_cnfg.slideDurationMs,
      easing: "ease-out",
      fill: "forwards",
    },
  );

  await wait(coin_cnfg.slideDurationMs);

  result.innerHTML = resultText.replace(/\n/g, "<br>");

  log("Showing result:", resultText);

  result.animate(
    [
      {
        opacity: 0,
        transform: "translateY(-50%) translateX(-24px) scale(.9)",
      },
      {
        opacity: 1,
        transform: "translateY(-50%) translateX(0) scale(1)",
      },
    ],
    {
      duration: 450,
      easing: "ease-out",
      fill: "forwards",
    },
  );

  await wait(coin_cnfg.resultHoldMs);

  log("Closing overlay.");

  overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: coin_cnfg.outroFadeMs,
    fill: "forwards",
  });

  await wait(coin_cnfg.outroFadeMs);

  overlay.remove();

  log("Finished.");
}

async function displayGameEndCoin(
  outcome,
  extraLine = "",
  seconds = 10,
  endSound = null,
) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const autoReturn =
    typeof returntocustomizationatmatchend !== "undefined" &&
    returntocustomizationatmatchend === true;
  const tr = (key, fallback) => {
    try {
      const v = getTranslation(key);
      return typeof v === "string" && v && v !== key && v !== "undefined"
        ? v
        : fallback;
    } catch (e) {
      return fallback;
    }
  };
  const esc = (v) =>
    decodeAndStripHtml(String(v ?? ""))
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const fixColor = (c) => (!c ? "#ffffff" : c.startsWith("#") ? c : "#" + c);

  let overlay = null;
  try {
    document.getElementById("gwent-end-coin")?.remove();

    const rounds = (game && game.roundHistoryResults) || [];
    const winsMe = rounds.filter((r) => r.winner === player_me).length;
    const winsOp = rounds.filter((r) => r.winner === player_op).length;

    const head =
      outcome === "me"
        ? { txt: tr("game_end.coin.win", "Victory"), color: "#ffd978" }
        : outcome === "op"
          ? { txt: tr("game_end.coin.lose", "Defeat"), color: "#d9806f" }
          : { txt: tr("game_end.coin.draw", "Draw"), color: "#cdbd92" };

    const faces =
      outcome === "me"
        ? ["img/icons/notif_me_coin.png", "img/icons/notif_me_coin.png"]
        : outcome === "op"
          ? ["img/icons/notif_op_coin.png", "img/icons/notif_op_coin.png"]
          : [
              "img/icons/notif_op_coin_squirrel.png",
              "img/icons/notif_me_coin_squirrel.png",
            ];

    document.getElementById("gwent-end-coin-style")?.remove();
    const st = document.createElement("style");
    st.id = "gwent-end-coin-style";
    st.textContent = `
#gwent-end-coin{
    position:fixed; inset:0; z-index:999999999; box-sizing:border-box;
    display:flex; align-items:center; justify-content:center;
    padding:12vh 3vw 3vh; font-family:serif; text-align:center;
    pointer-events:auto; color:#d8bc7d;
    background:radial-gradient(ellipse at 50% 45%,
        rgba(48,33,12,.6) 0%, rgba(0,0,0,.9) 60%, rgba(0,0,0,.97) 100%);
}
#gwent-end-coin .ge-players{
    width:100%; display:flex; justify-content:space-between; align-items:flex-start;
    position:absolute; top:2vh; left:0; padding:0 2vw; box-sizing:border-box;
}
#gwent-end-coin .ge-p{
    display:flex; align-items:center; gap:1vw; padding:1vh 1vw; border-radius:12px;
    font-size:clamp(18px,1.5vw,32px); font-weight:600;
    background:color-mix(in srgb, var(--p-bg) 65%, rgba(0,0,0,.85));
    border:2px solid var(--p-color); color:var(--p-text);
    box-shadow:0 0 0 1px rgba(0,0,0,.9), 0 0 18px rgba(0,0,0,.8);
    transition:opacity .5s, box-shadow .5s, transform .5s;
}
#gwent-end-coin .ge-p.win{ transform:scale(1.07); box-shadow:0 0 0 1px #000, 0 0 32px var(--p-color); }
#gwent-end-coin .ge-p.lose{ opacity:.45; }
#gwent-end-coin .ge-p img.leader{ max-height:11vh; width:auto; border-radius:8px; }
#gwent-end-coin .ge-p img.faction{ width:clamp(28px,2vw,52px); height:auto; }
#gwent-end-coin .ge-p .pbadge{
    min-width:1.7em; height:1.7em; padding:0 .3em; box-sizing:border-box;
    display:flex; align-items:center; justify-content:center; border-radius:999px;
    background:var(--p-color); color:var(--p-text); font-weight:700;
}
#gwent-end-coin .ge-main{
    display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:4vw;
}
#gwent-end-coin .ge-stage{
    --size:clamp(130px,13vw,250px);
    position:relative; width:var(--size); height:var(--size);
    perspective:calc(var(--size) * 5); flex:none;
}
#gwent-end-coin .ge-glow{
    position:absolute; left:-90%; top:-90%; width:280%; height:280%; border-radius:50%;
    background:radial-gradient(circle, rgba(255,214,120,.32) 0%, rgba(255,214,120,.1) 38%, rgba(0,0,0,0) 68%);
    opacity:.8;
}
#gwent-end-coin .ge-coin{
    position:absolute; inset:0; transform-style:preserve-3d;
    filter:drop-shadow(0 0 14px rgba(255,214,120,.3)) drop-shadow(0 6px 10px rgba(0,0,0,.6));
}
#gwent-end-coin .ge-face{
    position:absolute; inset:0; width:100%; height:100%;
    object-fit:contain; backface-visibility:hidden;
}
#gwent-end-coin .ge-face.back{ transform:rotateY(180deg); }
#gwent-end-coin .ge-ring{
    position:absolute; inset:0; border-radius:50%; opacity:0;
    border:3px solid rgba(255,214,120,.95);
    box-shadow:0 0 24px rgba(255,214,120,.7), inset 0 0 24px rgba(255,214,120,.5);
}
#gwent-end-coin .ge-side{
    display:flex; flex-direction:column; align-items:center; gap:1.4vh;
    width:min(560px,86vw);
}
#gwent-end-coin .ge-title{
    margin:0; opacity:0; font-size:clamp(30px,3.2vw,66px); font-weight:700;
    letter-spacing:3px; text-transform:uppercase; text-shadow:0 0 10px #000, 0 0 22px #000;
}
#gwent-end-coin .ge-score{
    opacity:0; font-size:clamp(20px,1.8vw,38px); font-weight:700; color:#f3e3b0;
    text-shadow:0 0 10px #000;
}
#gwent-end-coin .ge-rounds{
    display:flex; flex-direction:column; gap:.4vh; width:100%;
    font-size:clamp(15px,1.2vw,26px); text-shadow:0 0 8px #000;
}
#gwent-end-coin .ge-row{
    display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:.8em;
    padding:.35em .8em; border-radius:8px; opacity:0;
    background:rgba(0,0,0,.45); border:1px solid rgba(216,188,125,.28);
}
#gwent-end-coin .ge-row .sm{ text-align:right; color:#9d9378; }
#gwent-end-coin .ge-row .so{ text-align:left; color:#9d9378; }
#gwent-end-coin .ge-row .mid{ color:#6f6650; }
#gwent-end-coin .ge-row.w-me .sm, #gwent-end-coin .ge-row.w-op .so{
    color:#ffe9a8; font-weight:700; text-shadow:0 0 10px rgba(255,214,120,.6);
}
#gwent-end-coin .ge-row .wipe{ grid-column:1 / -1; text-align:center; font-size:.8em; color:#c9806f; }
#gwent-end-coin .ge-extra{ opacity:0; color:#cdbd92; font-size:clamp(14px,1.1vw,24px); }
#gwent-end-coin .ge-count{
    opacity:0; display:flex; flex-direction:column; align-items:center; gap:.8vh;
    font-size:clamp(14px,1.1vw,24px); color:#cdbd92; text-shadow:0 0 10px #000;
}
#gwent-end-coin .ge-count b{ font-size:1.4em; color:#d8bc7d; font-variant-numeric:tabular-nums; }
#gwent-end-coin .ge-bar{ width:min(340px,60vw); height:5px; border-radius:3px; overflow:hidden; background:rgba(255,255,255,.12); }
#gwent-end-coin .ge-bar i{ display:block; height:100%; transform-origin:left center; background:#d8bc7d; }
#gwent-end-coin .ge-btn{
    opacity:0; cursor:pointer; font-family:inherit; font-size:clamp(16px,1.3vw,28px);
    padding:.5em 1.6em; border-radius:10px; color:#e9dbb4;
    background:linear-gradient(180deg, rgba(80,56,20,.95), rgba(32,22,8,.95));
    border:2px solid #d4af37; box-shadow:0 0 18px rgba(212,175,55,.25);
}
#gwent-end-coin .ge-btn:hover{ filter:brightness(1.2); }
`;
    document.head.appendChild(st);

    const mkPlayer = (side, p, wins) => {
      const baseColor = fixColor(map_results_color[p.leader.faction]);
      const d = document.createElement("div");
      d.className = `ge-p ${side}`;
      d.style.setProperty("--p-color", baseColor);
      d.style.setProperty("--p-bg", getDarkerHex(baseColor, 0.35));
      d.style.setProperty("--p-text", getContrastingTextColor(baseColor));
      const leader = document.createElement("img");
      leader.className = "leader";
      const lf = p.leader_init.filename;
      leader.src =
        lf === "Gaunter_Leader" || lf === "Gaunter_Leader2"
          ? `img/sm/neutral_${lf}.jpg`
          : `img/sm/${p.leader_init.faction}_${lf}.jpg`;
      const fac = document.createElement("img");
      fac.className = "faction";
      fac.src = `img/icons/deck_shield_${p.leader_init.faction}.png`;
      const nm = document.createElement("span");
      nm.textContent = decodeAndStripHtml(p.name);
      const badge = document.createElement("div");
      badge.className = "pbadge";
      badge.textContent = String(wins);
      if (side === "op") d.append(badge, nm, fac, leader);
      else d.append(leader, fac, nm, badge);
      return d;
    };

    overlay = document.createElement("div");
    overlay.id = "gwent-end-coin";
    overlay.setAttribute("role", "alertdialog");

    const players = document.createElement("div");
    players.className = "ge-players";
    const meP = mkPlayer("me", player_me, winsMe);
    const opP = mkPlayer("op", player_op, winsOp);
    players.append(meP, opP);

    // coin
    const stage = document.createElement("div");
    stage.className = "ge-stage";
    const glow = document.createElement("div");
    glow.className = "ge-glow";
    const coin = document.createElement("div");
    coin.className = "ge-coin";
    const front = document.createElement("img");
    front.className = "ge-face front";
    front.src = faces[0];
    const back = document.createElement("img");
    back.className = "ge-face back";
    back.src = faces[1];
    coin.append(front, back);
    const ring = document.createElement("div");
    ring.className = "ge-ring";
    stage.append(glow, coin, ring);

    // results
    const titleEl = document.createElement("h1");
    titleEl.className = "ge-title";
    titleEl.style.color = head.color;
    titleEl.textContent = head.txt;

    const scoreEl = document.createElement("div");
    scoreEl.className = "ge-score";
    scoreEl.innerHTML = `${esc(player_me.name)} ${winsMe} – ${winsOp} ${esc(player_op.name)}`;

    const roundsEl = document.createElement("div");
    roundsEl.className = "ge-rounds";
    rounds.forEach((r, i) => {
      const row = document.createElement("div");
      const cls =
        r.winner === player_me ? "w-me" : r.winner === player_op ? "w-op" : "";
      row.className = `ge-row ${cls}`;
      row.innerHTML =
        `<span class="sm">${esc(r.score_me)}</span>` +
        `<span class="mid">${esc(tr("game_end.texts.round", "Round "))}${i + 1}</span>` +
        `<span class="so">${esc(r.score_op)}</span>` +
        (r.wasWiped
          ? `<div class="wipe">${esc(tr("game_end.wiped.wiped", "Wiped"))} (${esc(
              tr(`game_end.wiped.res.${r.wipedreason}`, r.wipedreason || ""),
            )})</div>`
          : "");
      roundsEl.appendChild(row);
    });

    const extraEl = document.createElement("div");
    extraEl.className = "ge-extra";
    extraEl.innerHTML = esc(extraLine).replace(/\n/g, "<br>");

    const countEl = document.createElement("div");
    countEl.className = "ge-count";
    const countNum = document.createElement("b");
    countNum.textContent = String(seconds);
    const label = document.createElement("span");
    label.append(
      `${tr("game_end.coin.returning", "Returning to customization in")} `,
      countNum,
    );
    const bar = document.createElement("div");
    bar.className = "ge-bar";
    const fill = document.createElement("i");
    bar.appendChild(fill);
    countEl.append(label, bar);

    const btn = document.createElement("button");
    btn.className = "ge-btn";
    btn.textContent = tr("game_end.coin.return", "Return to customization");

    const side = document.createElement("div");
    side.className = "ge-side";
    side.append(titleEl, scoreEl, roundsEl);
    if (extraLine) side.appendChild(extraEl);
    if (autoReturn) side.appendChild(countEl);
    side.appendChild(btn);

    const main = document.createElement("div");
    main.className = "ge-main";
    main.append(stage, side);
    overlay.append(players, main);
    document.body.appendChild(overlay);

    const A = (el, frames, opts) =>
      el.animate(frames, { fill: "forwards", ...opts });

    A(overlay, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 });

    // FLIP: coin starts in the screen centre and slides to its place in the
    // layout while it spins, so both happen at the same time.
    await new Promise((r) => requestAnimationFrame(r));
    const rc = stage.getBoundingClientRect();
    const dx = window.innerWidth / 2 - (rc.left + rc.width / 2);
    const dy = window.innerHeight / 2 - (rc.top + rc.height / 2);

    const MOVE = 1100;
    try {
      if (typeof tocar === "function") tocar("coin_flip", false);
    } catch (e) {}
    A(
      stage,
      [
        { transform: `translate(${dx}px, ${dy}px) scale(1.35)` },
        { transform: "translate(0,0) scale(1)" },
      ],
      { duration: MOVE, easing: "cubic-bezier(.2,.8,.25,1)" },
    );
    const spin = A(
      coin,
      [{ transform: "rotateY(0deg)" }, { transform: `rotateY(${360 * 3}deg)` }],
      { duration: MOVE, easing: "cubic-bezier(.15,.7,.25,1)" },
    );

    const fadeUp = (el, delay) =>
      A(
        el,
        [
          { opacity: 0, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 350, delay, easing: "ease-out" },
      );
    // results start fading in while the coin is still travelling
    fadeUp(titleEl, MOVE * 0.45);
    fadeUp(scoreEl, MOVE * 0.45 + 120);
    roundsEl
      .querySelectorAll(".ge-row")
      .forEach((row, i) => fadeUp(row, MOVE * 0.45 + 220 + i * 120));
    const t = MOVE * 0.45 + 220 + rounds.length * 120;
    if (extraLine) fadeUp(extraEl, t);
    if (autoReturn) fadeUp(countEl, t + 100);
    fadeUp(btn, t + 100);

    await spin.finished;
    try {
      if (endSound && typeof tocar === "function") tocar(endSound, true);
    } catch (e) {}
    A(
      ring,
      [
        { opacity: 0.95, transform: "scale(.9)" },
        { opacity: 0, transform: "scale(2.1)" },
      ],
      { duration: 700, easing: "ease-out" },
    );
    if (outcome === "me") (meP.classList.add("win"), opP.classList.add("lose"));
    if (outcome === "op") (opP.classList.add("win"), meP.classList.add("lose"));

    // leave: button always, countdown only when auto return is enabled
    let leave;
    const left = new Promise((r) => (leave = r));
    btn.addEventListener("click", () => leave(), { once: true });

    if (autoReturn) {
      (async () => {
        await wait(Math.max(0, t + 450 - MOVE));
        fill.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
          duration: seconds * 1000,
          easing: "linear",
          fill: "both",
        });
        for (let n = seconds; n > 0; n--) {
          countNum.textContent = String(n);
          await wait(1000);
        }
        leave();
      })();
    }
    await left;
  } catch (e) {
    console.error("[GameEndCoin] failed", e);
  }

  try {
    if (overlay) {
      await overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 300,
        fill: "forwards",
      }).finished;
      overlay.remove();
    }
  } catch (e) {
    overlay?.remove();
  }
  game.returnToCustomization();
}

// toss an "fake" scoliatle coin after opponent pick first player
async function scol_fake_coin() {
  await displayCoinToss(
    game.firstPlayer.tag,
    {
      me: `img/icons/notif_${game.firstPlayer.tag}_coin_squirrel.png`,
      op: `img/icons/notif_${game.firstPlayer.tag}_coin_squirrel.png`,
    },
    `${map_results_txt.cheater}\n\n${map_results_txt[`_${game.firstPlayer.tag}`]}`,

    player_me.leader_init.filename,
    player_me.name,
    map_results_color[player_me.leader.faction],
    player_me.leader_init.faction,

    player_op.leader_init.filename,
    player_op.name,
    map_results_color[player_op.leader.faction],
    player_op.leader_init.faction,
  );
  return true;
}

// D20
("use strict");

async function displayD20Roll(resultValue = null, options = {}) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const {
    title = "",
    titleColor = "#d8bc7d",
    message = "",
    messageColor = "#d8bc7d",
  } = options;

  if (resultValue == null) {
    resultValue = Math.floor(Math.random() * 20) + 1;
  }

  resultValue = Math.max(1, Math.min(20, resultValue));

  let old = document.getElementById("gwent-d20-overlay");
  if (old) old.remove();

  if (!document.getElementById("gwent-d20-style")) {
    const style = document.createElement("style");
    style.id = "gwent-d20-style";

    style.textContent = `
#gwent-d20-overlay{
    position:fixed;
    inset:0;
    z-index:999999999;
    background:rgba(0,0,0,.82);
    display:flex;
    justify-content:center;
    align-items:center;
    pointer-events:none;
    font-family:serif;
}

.gwent-d20-box{
    width:min(40vw,520px);
    height:min(40vw,520px);

    background:
        linear-gradient(
            180deg,
            rgba(40,28,12,.95),
            rgba(10,8,5,.95)
        );

    border:3px solid #d4af37;
    border-radius:18px;

    box-shadow:
        0 0 40px rgba(0,0,0,.9),
        0 0 30px rgba(212,175,55,.25);

    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    position:relative;
    overflow:hidden;
}

.gwent-d20-title{
    position:absolute;
    top:24px;
    left:0;
    right:0;

    text-align:center;
    font-size:clamp(22px,2vw,40px);
    font-weight:bold;
    text-shadow:
        0 0 10px black,
        0 0 20px black;
    opacity:0;
}

.gwent-d20{
    width:min(18vw,220px);
    height:min(18vw,220px);
    object-fit:contain;

    filter:
        drop-shadow(0 0 20px rgba(212,175,55,.5))
        drop-shadow(0 0 8px rgba(0,0,0,.9));
}

.gwent-d20-result{
    margin-top:30px;
    color:#d8bc7d;
    font-size:clamp(30px,2.4vw,54px);
    opacity:0;

    text-shadow:
        0 0 12px black,
        0 0 24px black;
}

.gwent-d20-message{
    position:absolute;
    bottom:24px;
    left:20px;
    right:20px;

    text-align:center;
    font-size:clamp(18px,1.4vw,28px);
    text-shadow:
        0 0 10px black,
        0 0 20px black;
    opacity:0;
}
`;
    document.head.appendChild(style);
  }

  const overlay = document.createElement("div");
  overlay.id = "gwent-d20-overlay";

  const box = document.createElement("div");
  box.className = "gwent-d20-box";

  const titleEl = document.createElement("div");
  titleEl.className = "gwent-d20-title";
  titleEl.textContent = title;
  titleEl.style.color = titleColor;

  const dice = document.createElement("img");
  dice.className = "gwent-d20";

  const result = document.createElement("div");
  result.className = "gwent-d20-result";

  const messageEl = document.createElement("div");
  messageEl.className = "gwent-d20-message";
  messageEl.textContent = message;
  messageEl.style.color = messageColor;

  box.append(titleEl, dice, result, messageEl);

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function makeD20SVG(number) {
    return (
      "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 256 256">

    <polygon
        points="128,12 230,80 190,210 66,210 26,80"
        fill="#d4af37"
        stroke="#6b4f14"
        stroke-width="10"/>

    <polygon
        points="128,35 205,88 176,185 80,185 51,88"
        fill="#111"/>

    <text
        x="128"
        y="150"
        text-anchor="middle"
        font-size="72"
        fill="#d8bc7d"
        font-family="serif"
        font-weight="bold">
        ${number}
    </text>

</svg>
`)
    );
  }

  const textures = [];

  for (let i = 1; i <= 20; i++) {
    textures[i] = makeD20SVG(i);
  }

  dice.src = textures[1];

  if (title) {
    titleEl.animate(
      [
        { opacity: 0, transform: "translateY(-10px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 500,
        fill: "forwards",
      },
    );
  }

  await wait(150);

  if (typeof tocar === "function") {
    try {
      //           tocar("dice_roll", false);
    } catch (e) {}
  }

  const duration = 3000;
  const interval = 80;

  const spinAnim = dice.animate(
    [
      {
        transform: "translateY(0) rotate(0deg) scale(.75)",
      },
      {
        transform: "translateY(-30px) rotate(2160deg) scale(1.15)",
      },
      {
        transform: "translateY(0) rotate(2520deg) scale(1)",
      },
    ],
    {
      duration,
      easing: "cubic-bezier(.15,.8,.2,1)",
      fill: "forwards",
    },
  );

  const stopRollingAt = duration - 350;
  const start = performance.now();

  while (performance.now() - start < stopRollingAt) {
    dice.src = textures[Math.floor(Math.random() * 20) + 1];

    await wait(interval);
  }

  // Lock final value BEFORE animation ends
  dice.src = textures[resultValue];

  await spinAnim.finished;

  if (typeof tocar === "function") {
    try {
      //           tocar("dice_land", false);
    } catch (e) {}
  }

  result.textContent = getTranslation("ability_counter.d20.roll.done").replace(
    "%s",
    resultValue,
  );

  result.animate(
    [
      {
        opacity: 0,
        transform: "scale(.8)",
      },
      {
        opacity: 1,
        transform: "scale(1)",
      },
    ],
    {
      duration: 400,
      fill: "forwards",
    },
  );

  if (message) {
    messageEl.animate(
      [
        {
          opacity: 0,
          transform: "translateY(10px)",
        },
        {
          opacity: 1,
          transform: "translateY(0)",
        },
      ],
      {
        duration: 500,
        fill: "forwards",
      },
    );
  }

  await wait(2500);

  overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 500,
    fill: "forwards",
  });

  await wait(500);

  overlay.remove();

  return resultValue;
}

// displayD20Roll(1, {
//    title: "Attack monster",
//    titleColor: "#ffcc33",
//    message: "roll failure",
//    messageColor: "#ff6666"
//});

let _coinNoticeState = null;

function hideCoinNotice() {
  const st = _coinNoticeState;
  if (st) st.close(false);
}

async function displayCoinNotice(
  topic = "",
  reason = "",
  returntocustomization = null,
  options = {},
) {
  const {
    coinImage = null,
    onTick = null,
    onReturn = null,
    color = "#d8bc7d",
    countdownText = "Returning to customization in",
  } = options || {};

  // replace a notice that is already open
  if (_coinNoticeState) _coinNoticeState.close(false, true);
  document.getElementById("gwent-coin-notice")?.remove();

  if (!document.getElementById("gwent-coin-notice-style")) {
    const style = document.createElement("style");
    style.id = "gwent-coin-notice-style";
    style.textContent = `
#gwent-coin-notice{
    position:fixed; inset:0; z-index:999999999;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:2.2vh; padding:4vh 4vw; box-sizing:border-box;
    pointer-events:auto; font-family:serif; text-align:center;
    background:radial-gradient(ellipse at 50% 45%,
        rgba(48,33,12,.6) 0%, rgba(0,0,0,.9) 60%, rgba(0,0,0,.97) 100%);
    color:var(--cn-color);
}
#gwent-coin-notice .cn-stage{
    --size:clamp(130px,13vw,260px);
    position:relative; width:var(--size); height:var(--size);
    perspective:calc(var(--size) * 5);
}
#gwent-coin-notice .cn-glow{
    position:absolute; left:-90%; top:-90%; width:280%; height:280%; border-radius:50%;
    background:radial-gradient(circle, rgba(255,214,120,.34) 0%, rgba(255,214,120,.1) 38%, rgba(0,0,0,0) 68%);
    opacity:0;
}
#gwent-coin-notice .cn-shadow{
    position:absolute; left:10%; bottom:-14%; width:80%; height:18%; border-radius:50%;
    background:radial-gradient(ellipse, rgba(0,0,0,.85) 0%, rgba(0,0,0,0) 70%);
    opacity:0;
}
#gwent-coin-notice .cn-coin{
    position:absolute; inset:0; border-radius:50%; transform-style:preserve-3d;
    filter:drop-shadow(0 0 14px rgba(255,214,120,.3)) drop-shadow(0 6px 10px rgba(0,0,0,.6));
    opacity:0;
}
#gwent-coin-notice .cn-face{
    position:absolute; inset:0; width:100%; height:100%; border-radius:50%;
    object-fit:contain; backface-visibility:hidden;
}
#gwent-coin-notice .cn-face.drawn{
    background:
        radial-gradient(circle at 50% 50%, transparent 0 56%, rgba(0,0,0,.28) 57% 58%, transparent 59%),
        radial-gradient(circle at 35% 30%, #fff1b8 0%, #e2b955 38%, #a9791f 72%, #6d4a10 100%);
    border:calc(var(--size) * .035) solid #8a5f14;
    box-shadow:inset 0 0 calc(var(--size) * .09) rgba(0,0,0,.55);
    box-sizing:border-box;
}
#gwent-coin-notice .cn-face.drawn::after{
    content:"!"; position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    font-size:calc(var(--size) * .55); font-weight:700; color:#6d4a10;
    text-shadow:0 1px 0 rgba(255,241,184,.7), 0 -1px 0 rgba(0,0,0,.35);
}
#gwent-coin-notice .cn-face.back{ transform:rotateY(180deg); }
#gwent-coin-notice .cn-ring{
    position:absolute; inset:0; border-radius:50%; opacity:0;
    border:3px solid rgba(255,214,120,.95);
    box-shadow:0 0 24px rgba(255,214,120,.7), inset 0 0 24px rgba(255,214,120,.5);
}
#gwent-coin-notice .cn-topic{
    margin:0; opacity:0; max-width:min(900px,90vw);
    font-size:clamp(28px,3vw,64px); font-weight:700; letter-spacing:1px;
    text-shadow:0 0 10px #000, 0 0 22px #000;
}
#gwent-coin-notice .cn-reason{
    margin:0; opacity:0; max-width:min(760px,88vw); white-space:pre-line;
    font-size:clamp(18px,1.6vw,34px); line-height:1.35; color:#e9dbb4;
    text-shadow:0 0 10px #000, 0 0 18px #000;
}
#gwent-coin-notice .cn-count{
    opacity:0; display:flex; flex-direction:column; align-items:center; gap:1vh;
    font-size:clamp(16px,1.3vw,28px); color:#cdbd92;
    text-shadow:0 0 10px #000;
}
#gwent-coin-notice .cn-count b{ font-size:1.5em; color:var(--cn-color); font-variant-numeric:tabular-nums; }
#gwent-coin-notice .cn-bar{
    width:min(360px,60vw); height:6px; border-radius:3px; overflow:hidden;
    background:rgba(255,255,255,.12);
}
#gwent-coin-notice .cn-bar i{
    display:block; height:100%; width:100%; transform-origin:left center;
    background:var(--cn-color);
}
`;
    document.head.appendChild(style);
  }

  // ---- DOM ----
  const overlay = document.createElement("div");
  overlay.id = "gwent-coin-notice";
  overlay.style.setProperty("--cn-color", color);
  overlay.setAttribute("role", "alertdialog");
  overlay.setAttribute("aria-live", "assertive");

  const stage = document.createElement("div");
  stage.className = "cn-stage";
  const glow = document.createElement("div");
  glow.className = "cn-glow";
  const shadow = document.createElement("div");
  shadow.className = "cn-shadow";
  const coin = document.createElement("div");
  coin.className = "cn-coin";
  const makeFace = (cls) => {
    if (coinImage) {
      const img = document.createElement("img");
      img.className = `cn-face ${cls}`;
      img.src = coinImage;
      return img;
    }
    const d = document.createElement("div");
    d.className = `cn-face drawn ${cls}`;
    return d;
  };
  coin.append(makeFace("front"), makeFace("back"));
  const ring = document.createElement("div");
  ring.className = "cn-ring";
  stage.append(glow, shadow, coin, ring);

  const topicEl = document.createElement("h1");
  topicEl.className = "cn-topic";
  topicEl.textContent = decodeAndStripHtml(String(topic ?? ""));
  const reasonEl = document.createElement("p");
  reasonEl.className = "cn-reason";
  reasonEl.textContent = decodeAndStripHtml(String(reason ?? ""));

  const seconds = Math.max(0, Math.floor(Number(returntocustomization) || 0));
  const countEl = document.createElement("div");
  countEl.className = "cn-count";
  const countLabel = document.createElement("span");
  const countNum = document.createElement("b");
  countLabel.append(`${countdownText} `, countNum);
  const bar = document.createElement("div");
  bar.className = "cn-bar";
  const barFill = document.createElement("i");
  bar.appendChild(barFill);
  countEl.append(countLabel, bar);
  countNum.textContent = String(seconds);

  overlay.append(stage, topicEl, reasonEl);
  if (seconds > 0) overlay.appendChild(countEl);
  document.body.appendChild(overlay);

  // ---- state / closing ----
  let timer = null;
  let finished = false;
  let resolveDone;
  const done = new Promise((r) => (resolveDone = r));
  const state = {
    close: async (returned, instant = false) => {
      if (finished) return;
      finished = true;
      if (timer) clearInterval(timer);
      if (_coinNoticeState === state) _coinNoticeState = null;
      if (!instant) {
        try {
          await overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 400,
            fill: "forwards",
          }).finished;
        } catch (e) {}
      }
      overlay.remove();
      resolveDone(returned);
    },
  };
  _coinNoticeState = state;

  // ---- animation: backdrop fades in, coin drops in spinning, lands with a ring pulse ----
  const anim = (el, frames, opts) =>
    el.animate(frames, { fill: "forwards", ...opts });

  anim(overlay, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
  anim(glow, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 350 });

  anim(
    coin,
    [
      {
        opacity: 0,
        transform: "translateY(-45vh) scale(.35) rotateY(0deg)",
        offset: 0,
      },
      {
        opacity: 1,
        transform: "translateY(0) scale(1.12) rotateY(900deg)",
        offset: 0.62,
        easing: "ease-out",
      },
      {
        opacity: 1,
        transform: "translateY(-3vh) scale(1.02) rotateY(1080deg)",
        offset: 0.8,
        easing: "ease-in",
      },
      {
        opacity: 1,
        transform: "translateY(0) scale(1) rotateY(1080deg)",
        offset: 1,
      },
    ],
    { duration: 1300, delay: 250, easing: "cubic-bezier(.2,.7,.3,1)" },
  );
  anim(
    shadow,
    [
      { opacity: 0, transform: "scale(.4)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    {
      duration: 1000,
      delay: 700,
    },
  );
  // impact pulse when the coin lands
  anim(
    ring,
    [
      { opacity: 0.95, transform: "scale(.9)" },
      { opacity: 0, transform: "scale(2.1)" },
    ],
    { duration: 800, delay: 1350, easing: "ease-out" },
  );

  try {
    if (typeof tocar === "function") tocar("coin_flip", false);
  } catch (e) {}

  const fadeUp = (el, delay) =>
    anim(
      el,
      [
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 500, delay, easing: "ease-out" },
    );
  fadeUp(topicEl, 1500);
  fadeUp(reasonEl, 1750);
  if (seconds > 0) fadeUp(countEl, 2000);

  if (seconds > 0) {
    const startAt = performance.now() + 2000;
    let lastShown = seconds;
    barFill.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
      duration: seconds * 1000,
      delay: 2000,
      easing: "linear",
      fill: "both",
    });
    timer = setInterval(() => {
      const elapsed = (performance.now() - startAt) / 1000;
      if (elapsed < 0) return;
      const left = Math.max(0, Math.ceil(seconds - elapsed));
      if (left !== lastShown) {
        lastShown = left;
        countNum.textContent = String(left);
        try {
          if (typeof onTick === "function") onTick(left);
        } catch (e) {
          console.error("[CoinNotice] onTick", e);
        }
      }
      if (left <= 0) {
        clearInterval(timer);
        timer = null;
        (async () => {
          try {
            if (typeof onReturn === "function") await onReturn();
            else if (typeof returnToCustomization === "function")
              await returnToCustomization();
          } catch (e) {
            console.error("[CoinNotice] return to customization failed", e);
          }
          state.close(true);
        })();
      }
    }, 100);
  }

  return done;
}
// displayCoinNotice("Server update", "The match ended in a stalemate.\nThe game will restart.", 10, {
//   onReturn: () => { /* go back to customization */ },
// });
