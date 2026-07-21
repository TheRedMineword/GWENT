"use strict";
async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const isGitHubPages =
  window.location.hostname === "localhost" &&
  (window.location.port === "8080" || window.location.port === "8081");

const IMAGE_SOURCE_TS = isGitHubPages
  ? ""
  : "http://theredmineword.github.io/GWENT/";

const loadedFonts = new Map();

async function loadFont(url) {
  if (loadedFonts.has(url)) return loadedFonts.get(url);

  const promise = (async () => {
    const name = "f_" + btoa(url).replace(/[^a-zA-Z0-9]/g, "");

    const font = new FontFace(name, `url(${url})`);

    await font.load();
    document.fonts.add(font);

    await document.fonts.load(`16px "${name}"`);

    return name;
  })();

  loadedFonts.set(url, promise);

  return promise;
}

function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);

  const dw = img.width * scale;
  const dh = img.height * scale;

  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawMoonPhase(
  ctx,
  cx,
  cy,
  r,
  phase,
  litColor = "#dddddd",
  shadowColor = "#1a1a1a",
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // base: whole disc starts dark (fully opaque, so nothing can bleed through)
  ctx.fillStyle = shadowColor;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  const theta = phase * Math.PI * 2;
  const k = Math.cos(theta);
  const waxing = phase < 0.5;
  const a = r * Math.abs(k);

  const limbAnticlockwise = !waxing;
  const ellipseAnticlockwise = waxing ? k > 0 : k < 0;

  // build the lit-region path once, reuse it for both the fill and the crater clip
  function buildLitPath() {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, limbAnticlockwise);
    ctx.ellipse(
      cx,
      cy,
      a,
      r,
      0,
      Math.PI / 2,
      -Math.PI / 2,
      ellipseAnticlockwise,
    );
    ctx.closePath();
  }

  // fill the lit region
  buildLitPath();
  ctx.fillStyle = litColor;
  ctx.fill();

  // clip to the SAME lit region, then scatter craters — they physically cannot
  // land on the dark side now, regardless of alpha
  ctx.save();
  buildLitPath();
  ctx.clip();

  ctx.fillStyle = "rgba(80,80,80,0.18)";
  for (let i = 0; i < 60; i++) {
    const ang = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * (r - 8);
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(ang) * d,
      cy + Math.sin(ang) * d,
      Math.random() * 5 + 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore(); // remove crater clip

  ctx.restore(); // remove disc clip
}
async function buildMoonImage(time = Clock.now()) {
  const canvas = document.createElement("canvas");
  canvas.width = 309;
  canvas.height = 444;

  const ctx = canvas.getContext("2d");

  // Background
  const bg = await loadImage("img/sm/moonlight.jpg");
  drawCover(ctx, bg, 0, 0, 309, 444);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 120;

  // Moon glow
  const glow = ctx.createRadialGradient(
    cx,
    cy,
    radius * 0.8,
    cx,
    cy,
    radius * 1.6,
  );
  glow.addColorStop(0, "rgba(255,255,220,0.18)");
  glow.addColorStop(1, "rgba(255,255,220,0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Moon disc
  ctx.fillStyle = "#dddddd";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Simple craters
  ctx.fillStyle = "rgba(80,80,80,0.18)";
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * (radius - 8);

    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(a) * d,
      cy + Math.sin(a) * d,
      Math.random() * 5 + 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Moon phase
  // Moon phase
  // Moon phase
  const synodicMonth = 29.530588853;
  const knownNewMoon = 947182440000;

  const age =
    ((((time - knownNewMoon) / 86400000) % synodicMonth) + synodicMonth) %
    synodicMonth;

  const phase = age / synodicMonth;

  let phaseName;

  if (phase < 0.03 || phase > 0.97) {
    phaseName = "New Moon";
  } else if (phase < 0.22) {
    phaseName = "Waxing Crescent";
  } else if (phase < 0.28) {
    phaseName = "First Quarter";
  } else if (phase < 0.47) {
    phaseName = "Waxing Gibbous";
  } else if (phase < 0.53) {
    phaseName = "Full Moon";
  } else if (phase < 0.72) {
    phaseName = "Waning Gibbous";
  } else if (phase < 0.78) {
    phaseName = "Third Quarter";
  } else {
    phaseName = "Waning Crescent";
  }

  console.log({
    date: new Date(time),
    ageDays: age.toFixed(3),
    phase: phase.toFixed(4),
    phaseName,
  });

  drawMoonPhase(ctx, cx, cy, radius, phase, "#dddddd", "rgba(0,0,0,0.85)");

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function buildTravelingSpiritSmall(filename, data) {
  const arrive = new Date(data.when.arrive).getTime(); // ms
  const duration = Number(data.when.duration) * 1000; // sec -> ms
  const now = Clock.now();
  const PRELOAD_TIME = 4 * 60 * 60 * 1000;

  // choose card
  let card = card_dict.find((c) => c.id === "3034");

  // activate timer
  setupSpiritTimer(card, data);

  if (now < arrive - PRELOAD_TIME || now >= arrive + duration) {
    sm_custom_cards_map[filename] = `${IMAGE_SOURCE_TS}${data.no_spirit}`;
    lg_custom_cards_map[filename] = null;
    return data.no_spirit;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 309;
  canvas.height = 444;

  const ctx = canvas.getContext("2d");

  // Background
  const bg = await loadImage(
    `${IMAGE_SOURCE_TS}${data.images[data.when.behind]}`,
  );
  drawCover(ctx, bg, 0, 0, 309, 444);

  // Spirit
  const spirit = await loadImage(`${IMAGE_SOURCE_TS}${data.when.who}`);
  ctx.drawImage(spirit, (309 - 299) / 2, (444 - 411.125) / 2, 299, 411.125);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.95),
  );

  sm_custom_cards_map[filename] = URL.createObjectURL(blob);
  lg_custom_cards_map[filename] = null;

  return blob;
}

async function sky_spirit_sm_blob(images, filename) {
  const canvas = document.createElement("canvas");
  canvas.width = 309;
  canvas.height = 444;

  const ctx = canvas.getContext("2d");

  // Background
  const bg = await loadImage(images[0].back);
  drawCover(ctx, bg, 0, 0, 309, 444);

  // Spirit
  const spirit = await loadImage(images[1].face);
  ctx.drawImage(spirit, (309 - 299) / 2, (444 - 411.125) / 2, 299, 411.125);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.95),
  );

  sm_custom_cards_map[filename] = URL.createObjectURL(blob);
  lg_custom_cards_map[filename] = null;

  return blob;
}

async function drawText(ctx, obj) {
  const conf = obj.font_conf || {};

  const family = await loadFont(obj.font);
  await document.fonts.ready;

  const x = parseFloat((obj.pos.left || "0").replace(",", "."));
  const y = parseFloat((obj.pos.top || "0").replace(",", "."));

  const w = parseFloat((obj.size.width || "0").replace(",", "."));
  const h = parseFloat((obj.size.height || "0").replace(",", "."));

  const fontSize = conf.size || 24;

  ctx.save();

  console.log(ctx.font);
  console.log(ctx.measureText(obj.text).width);
  // ctx.font = `${conf.weight || 400} ${fontSize}px "${family}"`;
  ctx.font =
    `${conf.style || "normal"} ` +
    `${conf.weight || 400} ` +
    `${fontSize}px ` +
    `"${family}"`;
  ctx.fillStyle = conf.color || "#000";
  ctx.globalAlpha = conf.opacity ?? 1;

  ctx.textAlign = conf.align || "left";
  ctx.textBaseline = "alphabetic";
  //ctx.textBaseline = "top";

  if (conf.shadow) {
    ctx.shadowColor = conf.shadow.color || "#000";
    ctx.shadowBlur = conf.shadow.blur || 0;
    ctx.shadowOffsetX = conf.shadow.offset_x || 0;
    ctx.shadowOffsetY = conf.shadow.offset_y || 0;
  }

  const tracking = conf.tracking || 0;
  const leading = conf.leading || fontSize * 1.2;

  // ---------- Wrap with line breaks ----------
  const paragraphs = obj.text.split(/\r?\n/);

  const lines = [];

  for (const paragraph of paragraphs) {
    // Preserve empty lines
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/);

    let line = "";

    for (const word of words) {
      const test = line ? line + " " + word : word;

      const width =
        ctx.measureText(test).width + tracking * Math.max(test.length - 1, 0);

      if (width <= w || line === "") {
        line = test;
      } else {
        lines.push(line);
        line = word;
      }
    }

    if (line) lines.push(line);
  }

  // ---------- Vertical ----------
  const totalHeight = lines.length * leading;

  let startY = y;

  switch (conf.vertical_align || conf.valign) {
    case "middle":
      startY = y + (h - totalHeight) / 2;
      break;

    case "bottom":
      startY = y + h - totalHeight;
      break;
  }

  // ---------- Draw ----------
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];

    let tx = x;

    switch (conf.align) {
      case "center":
        tx = x + w / 2;
        break;

      case "right":
        tx = x + w;
        break;
    }

    const ty = startY + i * leading + fontSize;

    if (tracking === 0) {
      if (conf.stroke) {
        ctx.lineWidth = conf.stroke.width || 1;
        ctx.strokeStyle = conf.stroke.color || "#000";
        ctx.strokeText(text, tx, ty);
      }

      ctx.fillText(text, tx, ty);
    } else {
      const textWidth =
        ctx.measureText(text).width + tracking * (text.length - 1);

      let xx = tx;

      if (conf.align === "center") xx -= textWidth / 2;

      if (conf.align === "right") xx -= textWidth;

      for (const ch of text) {
        if (conf.stroke) {
          ctx.lineWidth = conf.stroke.width || 1;
          ctx.strokeStyle = conf.stroke.color || "#000";
          ctx.strokeText(ch, xx, ty);
        }

        ctx.fillText(ch, xx, ty);

        xx += ctx.measureText(ch).width + tracking;
      }
    }
  }

  ctx.restore();
}

async function renderTemplate(template, width, height) {
  //  console.log("render", template, width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  // optional white background
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  // draw by layer
  const items = [...template].sort((a, b) => (a.layer || 0) - (b.layer || 0));

  for (const item of items) {
    if (item.type === "img") {
      const img = await loadImage(item.file);

      const x = parseInt(item.pos.left || 0);
      const y = parseInt(item.pos.top || 0);

      let w = item.size.width === "auto" ? null : parseFloat(item.size.width);
      let h = item.size.height === "auto" ? null : parseFloat(item.size.height);

      // Preserve aspect ratio when one dimension is "auto"
      if (w === null && h === null) {
        w = img.width;
        h = img.height;
      } else if (w === null) {
        w = img.width * (h / img.height);
      } else if (h === null) {
        h = img.height * (w / img.width);
      }

      ctx.drawImage(img, x, y, w, h);

      ctx.drawImage(img, x, y, w, h);
    }

    if (item.type === "text") {
      await drawText(ctx, item);
    }
  }

  // console.log("render cabvas", canvas);
  return await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.95),
  );
}
async function buildCustomCard(data) {
  const template = card_dict.find((c) => c._replace_me === data.replace_me);
  const index = card_dict.findIndex((c) => c._replace_me === data.replace_me);
  if (!template) return null;
  card_dict[index] = data;
}
async function buildSeasonCard(season, data) {
  const template = card_dict.find((c) => c._replace_me === season.replace_me);
  const index = card_dict.findIndex((c) => c._replace_me === season.replace_me);
  console.warn("sky_season", template, index);
  if (!template) return null;

  // --- Build square icon as data URI ---
  const bg = await loadImage(`${IMAGE_SOURCE_TS}${data[season.behind]}`);

  const img = await loadImage(`${IMAGE_SOURCE_TS}${season.who}`);

  const canvas = document.createElement("canvas");
  canvas.width = 309;
  canvas.height = 444;

  const ctx = canvas.getContext("2d");

  // Draw background (cropped to square)
  drawCover(ctx, bg, 0, 0, 309, 444);

  // Draw foreground
  const scale = parseFloat(season.size_who || "100") / 100;

  const w = img.width * scale;
  const h = img.height * scale;

  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

  const dataUri = URL.createObjectURL(
    await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95)),
  );

  //console.log("SKY_SEASON", dataUri);
  // Clone template and replace values
  const card = {}; //structuredClone(template);
  var name = season.name;
  if (season._name_start_wich_season_of) {
    name = `Season of ${name}`;
  }
  card.name = name;
  card.deck = season.faction;
  card.row = season.row;
  card.strength = String(season.strenght);
  card.ability = season.abilities.card;
  card.filename = season.filename;
  card.id = season.id;
  card.count = String(0);
  card.customassets ??= {};
  card.customassets.lg ??= {};
  card.customassets.sm ??= {};
  // if (card.customassets?.lg) {
  card.customassets.lg.name = name;
  card.customassets.lg.desc = season.qoute;
  card.customassets.lg.ability = season.abilities.generator;
  // }

  // if (card.customassets?.sm) {
  card.customassets.sm.type = "url";
  card.customassets.sm.url = dataUri;
  card.count_monitor = {
    base: season.count,
    monitor: "based",
    id: `${season.replace_me}_countdown`,
    duration: {
      start: season.when.start,
      duration: Math.floor(
        (new Date(season.when.end) - new Date(season.when.start)) / 1000,
      ),
    },
  };
  // }
  if (index !== -1) {
    card_dict[index] = card;
  }
  return card;
}

async function DEBUGGER_make_json(
  is_hero,
  faction,
  row,
  ability,
  bacround_url,
  name,
  strenght,
  desc,
) {
  var card_json = [];
  if (is_hero) {
    card_json.push({
      _name: "hero-elem",
      type: "img",
      pos: {
        left: "-14,6296px",
        top: "-12,9815px",
        right: null,
        bottom: null,
      },
      size: {
        width: "232,1648px",
        height: "232,1648px",
      },
      file: "img/icons/power_hero.png",
      layer: 99,
    });
    // text
    card_json.push({
      _name: "card_power",
      type: "text",
      text: strenght.toString(),
      pos: {
        left: "16,6973px",
        top: "12,9037px",
        right: null,
        bottom: null,
      },
      size: {
        width: "87,156px",
        height: "92,6606px",
      },
      font: "img/c_builder/fonts/gwent/hinted-GWENT-ExtraBold.ttf",
      font_conf: {
        color: "#ffffff",
        size: 60,
        weight: 700,
        //   "style": "bold",

        align: "center",
        valign: "middle",

        //   "tracking": 20,
        //    "leading": 42,

        //   "case": "uppercase",

        //    "opacity": 1
      },
      layer: 100,
    });
  } else {
    card_json.push({
      _name: "normal-elem",
      type: "img",
      pos: {
        left: "-9,8879px",
        top: "-9,8879px",
        right: null,
        bottom: null,
      },
      size: {
        width: "215px",
        height: "215px",
      },
      file: "img/icons/power_normal.png",
      layer: 99,
    });
    // text
    card_json.push({
      _name: "card_power",
      type: "text",
      text: strenght.toString(),
      pos: {
        left: "14,633px",
        top: "24,0632px",
        right: null,
        bottom: null,
      },
      size: {
        width: "87,156px",
        height: "62,4395px",
      },
      font: "img/c_builder/fonts/gwent/hinted-GWENT-ExtraBold.ttf",
      font_conf: {
        color: "#000000",
        size: 60,
        weight: 700,
        //   "style": "bold",

        align: "center",
        valign: "middle",

        //   "tracking": 20,
        //    "leading": 42,

        //   "case": "uppercase",

        //    "opacity": 1
      },
      layer: 100,
    });
  }
  if (faction !== "neutral") {
    var sizes = {
      syndicate: {
        width: "94,5236px",
        height: "690,8468px",
      },
      sky: {
        width: "111,6125 px",
        height: "701,8821 px",
      },
      skellige: {
        width: "100px",
        height: "691,05px",
      },
      monsters: {
        width: "100px",
        height: "690,8852px",
      },
      scoiatael: {
        width: "100px",
        height: "690,2204 px",
      },
      realms: {
        width: "100px",
        height: "688,8352 px",
      },
      nilfgaard: {
        width: "100px",
        height: "689 px",
      },
    };
    var sizes2 = {
      syndicate: {
        left: "11,0863px",
        top: "-4,0833px",
      },
      sky: {
        left: "2,5419px",
        top: "-4,0833px",
      },
      skellige: {
        left: "8,3481 px",
        top: "-1,8879 px",
      },
      monsters: {
        left: "7,3552 px",
        top: "-1,7231 px",
      },
      scoiatael: {
        left: "8,3481 px",
        top: "-1,5583 px",
      },
      realms: {
        left: "7,0562 px",
        top: "-1,2287 px",
      },
      nilfgaard: {
        left: "7,6542 px",
        top: "-1,3935 px",
      },
    };
    card_json.push({
      _name: "faction_bar",
      type: "img",
      pos: {
        left: sizes2[faction].left,
        top: sizes2[faction].top,
        right: null,
        bottom: null,
      },
      size: {
        width: sizes[faction].width,
        height: sizes[faction].height,
      },
      file: `img/c_builder/bars/${faction}.png`,
      layer: 90,
    });
  }
  card_json.push({
    _name: "paper_for_text",
    type: "img",
    pos: {
      left: "-10,0098px",
      top: "575px", //575 px
      right: null,
      bottom: null,
    },
    size: {
      width: "430,0196px",
      height: "244px",
    },
    file: `img/c_builder/paper.png`,
    layer: 70,
  });

  card_json.push({
    _name: "card_name",
    type: "text",
    text: name,
    pos: {
      left: "89,0276px",
      top: "586,1239px",
      right: null,
      bottom: null,
    },
    size: {
      width: "321,9725px",
      height: "47,7064px",
    },
    font: "img/c_builder/fonts/acumin-pro/Acumin-BdPro.otf",
    font_conf: {
      color: "#000000",
      size: 29,
      weight: 700,
      //   "style": "bold",

      align: "center",
      valign: "middle",

      //   "tracking": 20,
      //    "leading": 42,

      //   "case": "uppercase",

      //    "opacity": 1
    },
    layer: 95,
  });

  card_json.push({
    _name: "card_qoute",
    type: "text",
    text: desc,
    pos: {
      left: "0px",
      top: "690,711px",
      right: null,
      bottom: null,
    },
    size: {
      width: "410px",
      height: "63,3028px",
    },
    font: "img/c_builder/fonts/Noto_Sans/NotoSans_ExtraCondensed-Medium.ttf",
    font_conf: {
      color: "#000000",
      size: 18,
      weight: 430,
      leading: 21.6,
      //      "style": "wide",

      align: "center",
      valign: "middle",

      //   "tracking": 20,
      //    "leading": 42,

      //   "case": "uppercase",

      //    "opacity": 1
    },
    layer: 95,
  });
  card_json.push({
    _name: `card_row_${row}`,
    type: "img",
    pos: {
      left: "5,5px",
      top: "207,7462px",
      right: null,
      bottom: null,
    },
    size: {
      width: "103,5505px",
      height: "102,4249px",
    },
    file: `img/icons/card_row_${row}.png`,
    layer: 91,
  });

  if (ability) {
    card_json.push({
      _name: `card_ability_${ability}`,
      type: "img",
      pos: {
        left: "5,5061px",
        top: "335,6726px",
        right: null,
        bottom: null,
      },
      size: {
        width: "100,4386px",
        height: "100,4386px",
      },
      file: `img/icons/card_ability_${ability}.png`,
      layer: 92,
    });
  }

  card_json.push({
    _name: `small_image`,
    type: "img",
    pos: {
      left: "0",
      top: "0",
      right: null,
      bottom: null,
    },
    size: {
      width: "410px",
      height: "588,5484px",
    },
    file: bacround_url,
    layer: 10,
  });

  console.log(card_json);
  return card_json;
}

//var url_blob = URL.createObjectURL(blob);
//console.log(url_blob);
//fetch(url_blob);

// database:
let sm_custom_cards_map = {};
let lg_custom_cards_map = {};
const custom_blob_urls = new Map();
let init_done = false;

// run
async function update_updater_on_rebuild(
  right_now,
  all_of_then,
  type,
  debug,
  full_debug,
) {
  let progress =
    Number.isInteger(right_now) &&
    Number.isInteger(all_of_then) &&
    all_of_then > 0
      ? Math.min(Math.max(right_now / all_of_then, 0), 1)
      : 0;
  progress = progress * 100;
  const x = 88;
  const y = 97;

  const value = x + (progress / 100) * (y - x);
  console.log(
    "Building cards ",
    `${right_now}/${all_of_then}##${type}/${debug} (${full_debug})\n${progress}% (${value})`,
  );
  if (custom_updater) {
    updateLoader(
      "Building cards!",
      value,
      `${right_now}/${all_of_then}##${type}/${debug}`,
    );
  } else {
    loadingscreenupdate(`Building cards: ${right_now}/${all_of_then}`);
  }
}

async function rebuildCustomCardsMaps() {
  // reset every rebuild
  sm_custom_cards_map = {};
  lg_custom_cards_map = {};
  for (const url of custom_blob_urls.values()) {
    URL.revokeObjectURL(url);
  }

  custom_blob_urls.clear();

  const txtRes = await fetch("img/c_builder/traveling_spirits/arrive.bin");

  const text = await decompressBase64(
    btoa(
      Array.from(new Uint8Array(await txtRes.arrayBuffer()), (b) =>
        String.fromCharCode(b),
      ).join(""),
    ),
  );

  const ts = JSON.parse(text);
  console.log("CARD BUILDER arrive.json", ts);

  console.log(ts.special_visitors, "visit");
  card_dict.push(...ts.special_visitors);

  update_updater_on_rebuild(
    0,
    "?",
    "sm",
    ts.season.filename.split("custom!")[1],
    ts.season.filename,
  );
  var s_res = await buildSeasonCard(ts.season, ts.images);
  console.log("BUILD CARDS SKY SEASON", s_res);
  var c_res = await buildCustomCard(ts._custom_card);
  console.log("BUILD CARDS CUSTOM CARD", c_res);

  timed_count_change = [];
  card_dict.forEach((card) => {
    const current = card.count_monitor;

    //  if (previous !== current) {

    switch (current?.monitor) {
      case "fullmoon":
        var lifetime = 30;
        var when_is = new Date(getNearestFullMoon(lifetime)).toISOString();
        card.count_monitor = {
          ...current,
          duration: {
            duration: Math.floor(lifetime * 60 * 60 * 2),
            start: when_is,
          },
          base: 1,
          monitor: "based",
          id: "id.fullmoon",
          msg: true,

          msg_data: {
            msg: `The light of the <color=#DDE8EB>Full Moon</color> illuminates the boards.\nUntil <color=#90D5FF><$enddatelocal></color>\n<color=#DDE8EB>Full Moon</color> happening at <color=#90D5FF>${formatLocalDate(getNearestFullMoon())}</color>`,
            display: 13000,
          },
        };
        console.log(`Its full moon ${JSON.stringify(card)} at ${when_is}`);
        break;
      case "newmoon":
        var lifetime = 30;
        var when_is = new Date(getNearestNewMoon(lifetime)).toISOString();
        card.count_monitor = {
          ...current,
          duration: {
            duration: Math.floor(lifetime * 60 * 60 * 2),
            start: when_is,
          },
          base: 1,
          monitor: "based",
          id: "id.newmoon",
          msg: true,

          msg_data: {
            msg: `The game board is shrouded in darkness; no <color=#DDE8EB>Moonlight</color> is comes from the sky.\nUntil <color=#90D5FF><$enddatelocal></color>\n<color=#DDE8EB>New Moon</color> happening at <color=#90D5FF>${formatLocalDate(getNearestNewMoon())}</color>`,
            display: 13000,
          },
        };
        console.log(`Its new moon ${JSON.stringify(card)} at ${when_is}`);
        break;
      default:
        // Unknown monitor
        break;
    }
  });
  card_dict.forEach((card) => {
    if (card.count_monitor) {
      loadingscreenupdate(
        `Checking timer for ${card.filename.split("custom!")[1]}!`,
      );
      pushTimedCount(card);
    }
  });

  var to_check = Object.values(card_dict).reduce(
    (count, card) => count + (card?.filename?.startsWith("custom!") ? 1 : 0),
    0,
  );
  to_check = to_check * 2;
  var now = 0;
  var name = null;
  for (const card of Object.values(card_dict)) {
    if (!card?.filename?.startsWith("custom!")) continue;
    name = card.filename;
    const assets = card.customassets || {};

    //
    // SMALL
    //
    if (assets.sm) {
      now = now + 1;
      update_updater_on_rebuild(
        now,
        to_check,
        "sm",
        name.split("custom!")[1],
        card.filename,
      );
      switch (assets.sm.type) {
        case "url":
          sm_custom_cards_map[card.filename] = assets.sm.url;
          break;

        case "build":
          var res = await renderTemplate(assets.sm.build, 410, 588, 5484);
          console.log(
            "[Builded:",
            res,
            "\n",
            assets.sm.build,
            "410px",
            "588,5484px",
          );
          sm_custom_cards_map[card.filename] = URL.createObjectURL(res);
          break;
        case "timed_a":
          sm_custom_cards_map[card.filename] = ArrayPickObjectForDay(
            card.customassets.sm.timed,
          );
          break;
        case "ts":
          await buildTravelingSpiritSmall("custom!traveling_spirit", ts);
          break;
        case "ts2":
          //  console.log("TS2", assets.sm.build, card.filename);
          await sky_spirit_sm_blob(assets.sm.build, card.filename);
          break;
        case "moon":
          var moon_blob = URL.createObjectURL(await buildMoonImage());
          sm_custom_cards_map[card.filename] = moon_blob;
          break;
      }
    }

    //
    // LARGE
    //
    if (assets.lg) {
      now = now + 1;
      update_updater_on_rebuild(
        now,
        to_check,
        "lg",
        name.split("custom!")[1],
        card.filename,
      );
      var text_name = null;
      var text_desc = null;
      if (assets.lg.txt_timed_a) {
        text_name = ArrayPickObjectForDay(assets.lg.name);
        text_desc = ArrayPickObjectForDay(assets.lg.desc);
      } else {
        text_name = assets.lg.name;
        text_desc = assets.lg.desc;
      }
      const json = await DEBUGGER_make_json(
        assets.lg.hero,
        card.deck,
        card.row,
        assets.lg.ability,
        sm_custom_cards_map[card.filename] || assets.sm?.url,
        text_name,
        card.strength,
        text_desc,
      );

      const blob = await renderTemplate(json, 410, 775);

      lg_custom_cards_map[card.filename] = blob;
    }
  }

  return {
    sm_custom_cards_map,
    lg_custom_cards_map,
  };
}

async function custom_card_builder_init() {
  var res = await rebuildCustomCardsMaps();
  console.log("Custom cards builded:", res);
  if (!init_done) {
    init_done = true;
    lunch_gwent_ui();
  }
  return res;
}
function getCustomCardBlob(size, filename) {
  const map =
    size === "sm"
      ? sm_custom_cards_map
      : size === "lg"
        ? lg_custom_cards_map
        : null;

  if (!map) return false;

  const asset = map[filename];

  if (!asset) return false;

  if (asset instanceof Blob) {
    if (!custom_blob_urls.has(asset)) {
      custom_blob_urls.set(asset, URL.createObjectURL(asset));
    }

    return custom_blob_urls.get(asset);
  }

  return asset;
}
console.log("Custom card builder ready, use: custom_card_builder_init()");
