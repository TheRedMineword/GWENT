"use strict";
function wearTexture(seed, size = "sm") {
  const cfg = WEAR_TEXTURE_CONFIG[size];
  if (!cfg) throw new Error(`Unknown wear texture size: ${size}`);

  const rand = mulberry32(hash(seed));

  const jitter = (v) => v + (rand() * 2 - 1) * cfg.variation * v;

  let scratches = "";
  let spots = "";

  for (let i = 0; i < cfg.scratches; i++) {
    const x1 = jitter(
      (i % cfg.scratchGridX) * cfg.scratchStepX + cfg.scratchOffsetX,
    );
    const y1 = jitter(
      Math.floor(i / cfg.scratchGridX) * cfg.scratchStepY + cfg.scratchOffsetY,
    );

    const angle = rand() * Math.PI * 2;
    const len = jitter(cfg.scratchLength);

    scratches += `
      <line
        x1="${x1}"
        y1="${y1}"
        x2="${x1 + Math.cos(angle) * len}"
        y2="${y1 + Math.sin(angle) * len}"
        stroke="white"
        stroke-width="${jitter(cfg.scratchWidth)}"
        stroke-opacity="${0.45 + rand() * 0.25}"
        stroke-linecap="round"
      />
    `;
  }

  for (let i = 0; i < cfg.spots; i++) {
    const cx = jitter((i % cfg.spotGridX) * cfg.spotStepX + cfg.spotOffsetX);
    const cy = jitter(
      Math.floor(i / cfg.spotGridX) * cfg.spotStepY + cfg.spotOffsetY,
    );

    spots += `
      <circle
        cx="${cx}"
        cy="${cy}"
        r="${jitter(cfg.spotRadius)}"
        fill="white"
        opacity="${0.14 + rand() * 0.16}"
      />
    `;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="${cfg.viewBox}"
     width="${cfg.width}"
     height="${cfg.height}">
  ${scratches}
  ${spots}
</svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str) {
  str = String(str);
  let h = 1779033703;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
