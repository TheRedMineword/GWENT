async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const loadedFonts = new Map();

async function loadFont(url) {
  if (loadedFonts.has(url)) return loadedFonts.get(url);

  const name = "f_" + btoa(url).replace(/[^a-zA-Z0-9]/g, "");

  const font = new FontFace(name, `url(${url})`);

  await font.load();
  document.fonts.add(font);

  loadedFonts.set(url, name);

  return name;
}

async function drawText(ctx, obj) {
  const conf = obj.font_conf || {};

  const family = await loadFont(obj.font);

  const x = parseFloat((obj.pos.left || "0").replace(",", "."));
  const y = parseFloat((obj.pos.top || "0").replace(",", "."));

  const w = parseFloat((obj.size.width || "0").replace(",", "."));
  const h = parseFloat((obj.size.height || "0").replace(",", "."));

  const fontSize = conf.size || 24;

  ctx.save();

  ctx.font = `${conf.weight || 400} ${fontSize}px "${family}"`;
  ctx.fillStyle = conf.color || "#000";
  ctx.globalAlpha = conf.opacity ?? 1;

  ctx.textAlign = conf.align || "left";
  ctx.textBaseline = "alphabetic";

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

      const w = parseInt(item.size.width);
      const h = parseInt(item.size.height);

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
    card_json.push({
      _name: "faction_bar",
      type: "img",
      pos: {
        left: "11,0863px",
        top: "-4,0833px",
        right: null,
        bottom: null,
      },
      size: {
        width: "94,5236px",
        height: "690,8468px",
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

var blob = await renderTemplate(
  await DEBUGGER_make_json(
    false,
    "syndicate",
    "ranged",
    "muster",
    "img/sm/nilfgaard_fake_ciri.jpg",
    "Fake Ciri",
    6,
    "A girl...\nBut not Ciri",
  ),
  410,
  775,
);

console.log(blob); // Should print Blob { size: ..., type: "image/jpeg" }

var url_blob = URL.createObjectURL(blob);
console.log(url_blob);
fetch(url_blob);
