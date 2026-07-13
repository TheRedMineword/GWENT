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

async function buildTravelingSpiritSmall(filename, data) {
  const arrive = new Date(data.when.arrive).getTime(); // ms
  const duration = Number(data.when.duration) * 1000; // sec -> ms
  const now = Clock.now();

  // choose card
  let card = card_dict.find((c) => c.id === "3034");

  // activate timer
  setupSpiritTimer(card, data);

  if (now < arrive || now >= arrive + duration) {
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

  return await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.95),
  );
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

async function rebuildCustomCardsMaps() {
  // reset every rebuild
  sm_custom_cards_map = {};
  lg_custom_cards_map = {};
  for (const url of custom_blob_urls.values()) {
    URL.revokeObjectURL(url);
  }

  custom_blob_urls.clear();

  for (const card of Object.values(card_dict)) {
    if (!card?.filename?.startsWith("custom!")) continue;

    const assets = card.customassets || {};

    //
    // SMALL
    //
    if (assets.sm) {
      switch (assets.sm.type) {
        case "url":
          sm_custom_cards_map[card.filename] = assets.sm.url;
          break;

        case "build":
          // placeholder
          sm_custom_cards_map[card.filename] = null;
          break;
        case "timed_a":
          sm_custom_cards_map[card.filename] = ArrayPickObjectForDay(
            card.customassets.sm.timed,
          );
          break;
        case "ts":
          const ts = await (
            await fetch("img/c_builder/traveling_spirits/arrive.json")
          ).json();

          await buildTravelingSpiritSmall("custom!traveling_spirit", ts);
          break;
      }
    }

    //
    // LARGE
    //
    if (assets.lg) {
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
