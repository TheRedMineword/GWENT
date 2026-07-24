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
  const DEBUG = true;
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

  if (!document.getElementById("gwent-coin-style")) {
    log("Injecting CSS.");

    const style = document.createElement("style");
    style.id = "gwent-coin-style";

    style.textContent = `
#gwent-coin-toss{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.82);
    overflow:hidden;
    z-index:999999999;
    pointer-events:none;
    font-family:serif;
}

.gwent-player{
    position:absolute;
    display:flex;
    align-items:center;
    gap:1vw;
    opacity:0;
    transition:opacity .8s;
    font-size:clamp(20px,1.6vw,34px);

    padding:1vh 1vw;
    border-radius:12px;

    /* 🔥 dark tinted fill */
    background: color-mix(in srgb, var(--p-bg) 65%, rgba(0,0,0,0.85));

    /* 🔥 strong readable outline */
    border:2px solid var(--p-color);

    /* 🔥 outer glow so it pops on dark background */
    box-shadow:
        0 0 0 1px rgba(0,0,0,0.9),
        0 0 18px rgba(0,0,0,0.8);
}

/* positions */
.gwent-player.me{
    left:2vw;
    bottom:2vh;
}

.gwent-player.op{
    right:2vw;
    top:2vh;
}

/* LEADER IMAGE */
.gwent-player .leader{
    height:auto;
    max-height:12vh;
    width:auto;

    border-radius:8px;

    box-shadow:0 0 12px rgba(0,0,0,0.6);
}

/* FACTION ICON */
.gwent-player .faction{
    width:clamp(28px,2vw,52px);
    height:auto;

    /* ❌ removed circle */
    border-radius:0;

    box-shadow:0 0 8px rgba(0,0,0,0.6);
}

/* NAME */
.gwent-player span{
    font-weight:600;
    letter-spacing:0.5px;
    color: var(--p-text);

    /* ❌ removed ugly glow/shadow */
    text-shadow: none;
}

/* COIN */
.coin-area{
    position:absolute;
    left:50%;
    top:50%;
    transform:translate(-50%,-50%);
}

.coin {
    position: relative;
    width: clamp(150px, 12vw, 300px);
    height: clamp(150px, 12vw, 300px);
    transform-style: preserve-3d;
}

.coin-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    top: 0;
    left: 0;
}

.coin-face.back {
    transform: rotateY(180deg);
}

.result {
    position: absolute;
    left: 130%;
    top: 50%;
    transform: translateY(-50%);

    width: 460px;      /* adjust as needed */
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

    if (leader !== "Gaunter_Leader") {
      leaderImg.src = `img/sm/${faction}_${leader}.jpg`;
    } else {
      leaderImg.src = `img/sm/neutral_Gaunter_Leader.jpg`;
    }

    const factionImg = document.createElement("img");
    factionImg.className = "faction";
    factionImg.src = `img/icons/deck_shield_${faction}.png`;

    const span = document.createElement("span");
    span.textContent = decodeAndStripHtml(name);
    span.style.color = textColor;

    // ✅ IMPORTANT: ordering fix
    if (side === "op") {
      // name - shield - leader
      div.append(span, factionImg, leaderImg);
    } else {
      // leader - shield - name
      div.append(leaderImg, factionImg, span);
    }

    console.log(
      "COIN ASSETS LEADER PFP",
      leaderImg.src,
      `${faction}_${leader}`,
    );

    return div;
  }

  const overlay = document.createElement("div");
  overlay.id = "gwent-coin-toss";

  overlay.append(
    makePlayer("me", meLeader, meFaction, meName, meColor),
    makePlayer("op", opLeader, opFaction, opName, opColor),
  );

  const coinArea = document.createElement("div");
  coinArea.className = "coin-area";

  const coin = document.createElement("div");
  coin.className = "coin";

  const front = document.createElement("img");
  front.className = "coin-face front";
  front.src = coinImages.me;

  const back = document.createElement("img");
  back.className = "coin-face back";
  back.src = coinImages.op;

  coin.append(front, back);

  coin.onerror = () => {
    console.warn("[CoinToss] Missing coin image:", coin.src);
  };

  const result = document.createElement("div");
  result.className = "result";

  coinArea.append(coin, result);

  overlay.appendChild(coinArea);

  document.body.appendChild(overlay);

  log("Overlay added.");

  const mePanel = overlay.querySelector(".me");

  const opPanel = overlay.querySelector(".op");

  await wait(50);

  mePanel.style.opacity = "1";
  opPanel.style.opacity = "1";

  log("Panels faded in.");

  await wait(700);

  try {
    if (typeof tocar === "function") {
      log("Playing coin_flip.");
      tocar("coin_flip", false);
    }
  } catch (e) {
    console.warn(e);
  }

  log("Starting spin.");

  const landOnOp = starter === "op";
  coin.src = landOnOp ? coinImages.op : coinImages.me;
  let landingcoin = landOnOp ? coinImages.op : coinImages.me;
  console.log("[COIN] land at end", landOnOp, coin.src);

  // ensure correct face BEFORE animation (no swapping later)
  coin.style.transform = "rotateY(0deg)";

  const spin = coin.animate(
    [
      { transform: "rotateY(0deg) rotateZ(0deg)" },
      {
        transform: `rotateY(${4320 + (landOnOp ? 180 : 0)}deg) rotateZ(720deg)`,
      },
    ],
    {
      duration: 3000,
      easing: "cubic-bezier(.15,.8,.2,1)",
      fill: "forwards",
    },
  );

  const front2 = coin.querySelector(".front");
  const back2 = coin.querySelector(".back");

  const landOnOp2 = starter === "op";
  coin.src = landOnOp2 ? coinImages.op : coinImages.me;
  const landingcoin2 = landOnOp2 ? coinImages.op : coinImages.me;

  console.log("2 COIN", landingcoin2, coin);

  // --- smooth swap before animation ends ---
  let swapped = false;
  const swapDelay = 3000 - 120; // 120ms before end

  setTimeout(() => {
    if (!swapped) {
      swapped = true;
      front2.src = landingcoin2;
      back2.src = landingcoin2;
    }
  }, swapDelay);

  // wait for animation to finish
  await spin.finished;

  // (optional safety fallback - usually not needed anymore)
  // front2.src = landingcoin2;
  // back2.src  = landingcoin2;

  // do nothing — image must NOT change after animation
  log("Coin landed.", starter, coin.src);
  try {
    if (typeof tocar === "function") {
      log("Playing coin_land.");
      //            tocar("coin_land", false); // disabled i dont want it
    }
  } catch (e) {
    console.warn(e);
  }

  const dir = -1;
  log("Sliding coin.", dir < 0 ? "towards me" : "towards opponent");

  coin.animate(
    [
      {
        transform: "translateX(0)",
      },
      {
        transform: `translateX(${dir * 10}vw)`,
      },
    ],
    {
      duration: 700,
      easing: "ease-out",
      fill: "forwards",
    },
  );

  await wait(700);

  result.innerHTML = resultText.replace(/\n/g, "<br>");

  log("Showing result:", resultText);

  result.animate(
    [
      {
        opacity: 0,
        transform: "translateY(-50%) scale(.8)",
      },
      {
        opacity: 1,
        transform: "translateY(-50%) scale(1)",
      },
    ],
    {
      duration: 400,
      fill: "forwards",
    },
  );

  await wait(2500);

  log("Closing overlay.");

  overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 500,
    fill: "forwards",
  });

  await wait(500);

  overlay.remove();

  log("Finished.");
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

  result.textContent = `Rolled: ${resultValue}`;

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
