"use strict";
loadingscreenupdate("Creating env vars!");
const debuglunchcustomcards = false; // if false when ready use: lunch_gwent_ui
let onYouTubeIframeAPIReady_status = false;
const showagile_and_alldescindeckmaker = false;
var init_button_show_patchnotes = true;
let _debug_volume = 50;
let videoMapLyrics = {};
// Shared queue for medic cards, do not modify!!
let medicrevivethat = [];
let custom_updater = false;
let twoPlayersConnected = false; //host alone
let extraJSON = [];
let displaynow = null;
let showbankms = 9000;
let gameended = false;
const medicdrawextrasecondswait = 2.2; // extraJson hold // no longer used
const medic_ability_revive_wait_a_second = 1.7 * 1000;
let ThatIsSpy = [
  "axii2_desc:",
  "spy",
  "sabotage",
  "axii2_desc_playable",
  "dopler",
  "yrden",
];
let bucket_max = 7;
let bucket_spawn_base = 6;
let bucket_spawn_per_lider_minus = 2;
let bucket_op_draw_per_power = 4.5;
//host alone
let players = {
  me: "You",
  op: "Opponent",
  noflag: "",
  sys: "Gwent Bot",
};
let fullscreenConfig = {
  localhost: false,
  else: true,
};

let OnGameStartDraw = 2;
let tooltipQueue = [];
let tooltipActive = false;
let ForGameStart = {
  unitscards: 22,
  special: 10,
  hero: 9,
};
let killoverpowercard = 999;
let medicsdraw = 1;
let darknessstorm_await = false;
let maxhealth = 2; // Dont change it, it also should do nothing
let thishandsize = 10;

let sendQueue = [];
let queueRunning = false;

let herocardsdb = [];
let herocardanim = true; // Disabled before i can fix aniamtion to be schorch like
let gameID = 0;
let turncount = 0;
let announce_turn_count = true;
const game_draw_force_rematch = true; // Keep it true because Gwent game cant and in stealmate

let SEND_INTERVAL_MS = 700; // change this to desired wait time

let ui_display_times = {
  socketready: 3000,
  hold_pause: {
    sleep: 78,
    needs: 6,
  },
  queue: [],
  is_running: false,
  is_busy: false,
  round_end_result: 2800,
  notyfication: 2200, // From async notification(name, duration) // a fail save value
  fadeSpeed: 150,
  checkDelay: 25,
  pass: 1320,
  turn: 1200,
  round_start: 1200,
  coin: 3200,
  faction_ability: 2700,
  show_me_that_card_you_have: 2900,
};

let RegisterMovesHold =
  3600 + SEND_INTERVAL_MS + ui_display_times.show_me_that_card_you_have; //If op passed wait before moves

let resync_now_apply = false;
let resync_contnet = {};
let resync_wait = 1000 * 0.01;

ui_display_times.is_transitioning = false;
let ongame_start_eval =
  'console.log("evaled start game");\n(function notificationRepeat() {\r\n  ui.notificationLoop();\r\n  setTimeout(notificationRepeat, ui_display_times.checkDelay);\r\n})();';

console.log(
  "Game Start Config",
  ForGameStart,
  "hand size:",
  thishandsize,
  "ui_display_times",
  ui_display_times,
  "ongame_start_eval",
  ongame_start_eval,
);
let spy = {
  spy: 2,
  aid: 5,
  sabotage: 1,
};
let powergain = {
  ForEachCardGain: 1.11,
  CountSelf: false,
  WeatherDebuffPercent: 0.25,
  Ceil: false,
  desc: null,
};
powergain.desc = `Card base power grows by ${powergain.ForEachCardGain} for each card in the row (${powergain.CountSelf ? "including itself" : "excluding itself"}). Card base power is not affected by weather, but its bonus power is reduced by ${Math.round((1 - powergain.WeatherDebuffPercent) * 100)}% under weather effects. Values are rounded ${powergain.Ceil ? "up" : "down"}.`;

let axii = {
  IfBasePowerUnder: 5,
  TakeAway: 2,
  desc: null,
};
axii.desc = `Each card in row under Axii effect that base power is less than ${axii.IfBasePowerUnder} will lose ${axii.TakeAway} power. Debuffs dont stack. Dont affect hero cards`;

console.log("Spy draw:", spy, "\nPowergain:", powergain, "\nAxii:", axii);

let nilfard_drawmaster = {
  // Minimum hand size check:
  // Effect only triggers if player has LESS than this many cards in hand
  handshort: 3,

  // Maximum bonus draws from graveyard:
  // Each unit in grave = +1 draw, capped at this value
  drawdead: 3,

  // Base number of cards always drawn from deck
  drawalive: 1,

  // (Legacy / currently unused in logic)
  // Previously used as fallback draw amount when graveyard was insufficient
  drawiffail: 0,

  // Starting hand penalty:
  // Player begins the game with fewer cards based on this value
  cardban: 0,
  drawextra: 1,
};

// Derived values:

// Player starts with (handshort - 1) fewer cards
// Example: handshort = 3 → start with 2 fewer cards
nilfard_drawmaster.cardban = -1 + nilfard_drawmaster.handshort;

// (Legacy formula, no longer used by current draw logic)
// Originally matched total fallback draw amount
nilfard_drawmaster.drawiffail =
  -1 + nilfard_drawmaster.drawdead + nilfard_drawmaster.drawalive;

console.log("nilfard_drawmaster", nilfard_drawmaster);

let gryffinschool_conf = {
  anim: "griffin",
  anim_hand: "griffin_hand",
  topic: "Choose a Witcher Sign",
};
let mtg_conf = {
  anim: "mtg",
  anim_hand: "mtg_hand",
  topic: "Pick a card to draw",
  random_max: 25,
  min_power: -7,
  max_power: 13,
  count_needed: 0, // count > count_needed
  shuffle_few_times: false,
  version: "24ab1a38ced21b1f047f5dc92ff88e60de73827a6663d4d3c0f1b2ca20ce9e68",
  daily_seed: true,
  unstable_mode: "random", // random/not-random/nonbe
};

function ArrayPickObjectForDay(arr) {
  const day = Math.floor(Clock.now() / 86400000); // UTC days since Unix epoch
  const index = day % arr.length;

  console.log("ArrayPickObjectForDay", {
    utcDay: day,
    index,
    object: arr[index],
  });

  return arr[index];
}
const pick_array = {
  lobby: [
    { id: "6U9gVpMHhiA", vol: 30 }, // The Mandragora
    { id: "yu197hlNWK0", vol: 90 }, // The Witcher 3: Wild Hunt OST - Skellige Tavern | Extended
    { id: "8o-JI8VRyKo", vol: 90 }, // Back On The Path
  ],
  game: [
    { id: "2Isa4ugEbZI", vol: 90 }, // A Story You Won't Believe
    { id: "FTsuevfvQ9w", vol: 47 }, // How About a Round of Gwent?
    { id: "M0sflDPa9zY", vol: 90 }, // Drink Up, There's More!
    { id: "UI3EdZNHB78", vol: 90 }, // Another Round For Everyone
  ],
};

let audio_cache = {};
let buttonmutemode = 1;
let button_is_second_sheet = 0;
// In game, match in progress
let audio_yt_vid_soundtrack = ArrayPickObjectForDay(pick_array.game).id; // wild hunt: "UE9fPWy1_o4" // How about round of gwent: "FTsuevfvQ9w"
let audio_yt_vid_soundtrack_volume = ArrayPickObjectForDay(pick_array.game).vol; // 100 for wild hunt, less for other
// Tavern (Deck menu)
let tavern_yt_vid = ArrayPickObjectForDay(pick_array.lobby).id; // The Witcher 3: Wild Hunt OST - Skellige Tavern | Extended
let tavern_yt_volume = ArrayPickObjectForDay(pick_array.lobby).vol;
let gaunter_lider = {
  extra_cards: 0.5,
  revive: 0.6,
};
let gaunter_lider_bringer_from_death = {
  revive: 0.6,
};
let waitMusicAudio = null;
let waitMusicPlaying = false;
let cachedWaitMusicBlobUrl = null;

const AUDIO_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
};

let WEAR_TEXTURE_CONFIG = {
  use: true,
  sm: {
    use: true,
    width: 411,
    height: 596,
    viewBox: "2 2 411 596",

    scratches: 40,
    spots: 80,

    scratchGridX: 8,
    scratchGridY: 5,
    scratchStepX: 64,
    scratchStepY: 96,
    scratchOffsetX: 32,
    scratchOffsetY: 48,

    spotGridX: 10,
    spotStepX: 52,
    spotStepY: 64,
    spotOffsetX: 26,
    spotOffsetY: 32,

    scratchLength: 50,
    scratchWidth: 2.2,
    spotRadius: 4.8,

    variation: 0.2,
  },

  lg: {
    use: false,
    width: 410,
    height: 775,
    viewBox: "0 0 410 775",

    scratches: 140,
    spots: 240,

    scratchGridX: 6,
    scratchStepX: 68,
    scratchStepY: 38,
    scratchOffsetX: 34,
    scratchOffsetY: 20,

    spotGridX: 8,
    spotStepX: 51,
    spotStepY: 34,
    spotOffsetX: 25,
    spotOffsetY: 18,

    // noticeably smaller
    scratchLength: 20,
    scratchWidth: 1.1,
    spotRadius: 1.3,

    variation: 0.1,
  },
};

async function cacheWaitMusic() {
  // Load the Blob (assuming you fetch it from server or have it)
  let response = await fetch("sfx/oldgwent/Inline.ogg");
  let blob = await response.blob();
  cachedWaitMusicBlobUrl = URL.createObjectURL(blob);
}
async function play_wait_music() {
  console.log("[WAITING]", "PLAY");
  if (waitMusicPlaying) return; // Already playing

  waitMusicPlaying = true;
  let url = cachedWaitMusicBlobUrl || "sfx/oldgwent/Inline.ogg";
  waitMusicAudio = new Audio(url);
  waitMusicAudio.loop = true;

  // Set volume to 60%
  waitMusicAudio.volume = 0.6;

  try {
    await waitMusicAudio.play();
  } catch (e) {
    console.error("Failed to play wait music:", e);
  }

  while (waitMusicPlaying) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (waitMusicAudio) {
    waitMusicAudio.pause();
    waitMusicAudio = null;
  }
}
function stop_wait_music() {
  console.log("[WAITING]", "STOP");
  waitMusicPlaying = false;
  if (waitMusicAudio) {
    waitMusicAudio.pause();
    waitMusicAudio = null;
  }
}
function monitorVolume() {
  if (waitMusicAudio) {
    waitMusicAudio.volume = buttonmutemode === 1 ? 0.6 : 0; // 60% or mute
  }
  // console.log("WAITING DEBUG", buttonmutemode);
  // Schedule the next call
  setTimeout(monitorVolume, 100);
}

cacheWaitMusic();
monitorVolume();

console.log("gaunter_lider", gaunter_lider);

let skellige_bond_conf = {
  power: 4,
};

let turn_skipper_conf = {
  perTurn: 0.35,
  actiavate: 1,
  chargeMax: 2,
  desc: null,
};
let scorch_stopper = {
  save_charge: 1,
  max: 5,
  break_shield_if_you_use: true,
};
let d20cloner = {
  perTurn: 0.16,
  actiavate: 1,
  chargeMax: 1,
  desc: null,
};
let syndicate_faction_clone = {
  nilfgaard: {
    name: "Nilfgaardian Empire",
  },
  scoiatael: {
    name: "Scoia'tael",
  },
  skellige: {
    name: "Skellige",
  },
  syndicate: {
    name: "Syndicate",
  },
  sky: {
    name: "Sky Kingdom",
  },
};
let map_results_txt = {
  _me: "You go first",
  _op: "Opponent goes first",
  _me_lambert: "Lambert lets you start the game",
  _op_lambert: "Lambert says that you suck!\nThe opponent starts the game!",
  _me_ancient: "Thu", // Thu = You // https://witcher.fandom.com/wiki/Elder_Speech
  _op_ancient: "Morvud", // Morvud = Enemy // https://witcher.fandom.com/wiki/Elder_Speech
  cheater: "Scoia'tael rigged the coin",
};
let map_results_color = {
  realms: "#1E224F",
  nilfgaard: "#ABAA27",
  scoiatael: "#0E790F",
  monsters: "#660101",
  skellige: "#54016C",
  sky: "#2D9DA0",
  syndicate: "#804400",
};
turn_skipper_conf.desc = `Let you skip turns, but gives your opponent 50/50 each skip to copy non-hero card from board. You need ${turn_skipper_conf.actiavate} charge to skip turn, you get ${turn_skipper_conf.perTurn} charges per your turn, up to ${turn_skipper_conf.chargeMax} max charge(s) stored!`;
d20cloner.desc = `Let you roll D20 for chance to get additional card from board, but what card you can get depends on roll result. Success on even roll. You need ${d20cloner.actiavate} charge to roll dice, you get ${d20cloner.perTurn} charges per your turn, up to ${d20cloner.chargeMax} max charge(s) stored!`;
let ThisDef = {
  name: "Default Config",

  env_vars: {
    showbankms: deepClone(showbankms),

    // players: {},

    fullscreenConfig: deepClone(fullscreenConfig),

    OnGameStartDraw: deepClone(OnGameStartDraw),
    medicsdraw: deepClone(medicsdraw),
    ThatIsSpy: deepClone(ThatIsSpy),
    bucket_max: deepClone(bucket_max),
    bucket_spawn_base: deepClone(bucket_spawn_base),
    bucket_spawn_per_lider_minus: deepClone(bucket_spawn_per_lider_minus),
    bucket_op_draw_per_power: deepClone(bucket_op_draw_per_power),

    ForGameStart: deepClone(ForGameStart),

    killoverpowercard: deepClone(killoverpowercard),
    darknessstorm_await: deepClone(darknessstorm_await),
    thishandsize: deepClone(thishandsize),
    herocardanim: deepClone(herocardanim),
    announce_turn_count: deepClone(announce_turn_count),

    SEND_INTERVAL_MS: deepClone(SEND_INTERVAL_MS),

    ui_display_times: deepClone(ui_display_times),

    RegisterMovesHold: deepClone(RegisterMovesHold),
    resync_wait: deepClone(resync_wait),

    spy: deepClone(spy),

    powergain: deepClone(powergain),

    axii: deepClone(axii),

    nilfard_drawmaster: deepClone(nilfard_drawmaster),

    gryffinschool_conf: {
      anim: deepClone(gryffinschool_conf.anim),
      anim_hand: deepClone(gryffinschool_conf.anim_hand),
    },

    mtg_conf: {
      anim: deepClone(mtg_conf.anim),
      anim_hand: deepClone(mtg_conf.anim_hand),
      random_max: deepClone(mtg_conf.random_max),
      min_power: deepClone(mtg_conf.min_power),
      max_power: deepClone(mtg_conf.max_power),
      count_needed: deepClone(mtg_conf.count_needed),
      shuffle_few_times: deepClone(mtg_conf.shuffle_few_times),
      version: deepClone(mtg_conf.version),
      daily_seed: deepClone(mtg_conf.daily_seed),
      unstable_mode: deepClone(mtg_conf.unstable_mode),
    },

    gaunter_lider: deepClone(gaunter_lider),
    gaunter_lider_bringer_from_death: deepClone(
      gaunter_lider_bringer_from_death,
    ),

    WEAR_TEXTURE_CONFIG: deepClone(WEAR_TEXTURE_CONFIG),

    skellige_bond_conf: deepClone(skellige_bond_conf),

    turn_skipper_conf: deepClone(turn_skipper_conf),

    d20cloner: deepClone(d20cloner),

    map_results_color: deepClone(map_results_color),
  },
};

function ordinal(n) {
  let j = n % 10;
  let k = n % 100;

  if (j === 1 && k !== 11) return `${n}${getUiStrng("ordinal.st")}`;
  if (j === 2 && k !== 12) return `${n}${getUiStrng("ordinal.nd")}`;
  if (j === 3 && k !== 13) return `${n}${getUiStrng("ordinal.rd")}`;

  return `${n}${getUiStrng("ordinal.th")}`;
}

let isconnectedtosession = false;
const texturePackBlobCache = new Map();
let texturePack = null;
function getTexturePackBlob(path) {
  if (!texturePack?.assets) return null;

  const fullPath = "assets/" + path;
  // console.log("Texture pack check", fullPath, texturePack);

  const blob = texturePack.assets[fullPath];
  if (!blob) return null;

  // cache blob URLs so we don't recreate them
  if (texturePackBlobCache.has(fullPath)) {
    return texturePackBlobCache.get(fullPath);
  }

  const url = URL.createObjectURL(blob);
  texturePackBlobCache.set(fullPath, url);

  return url;
}
let card = null;
const playBlock = {};

let previous_game_start_cards = null;
let med_draw = null;

let add_redraws = 0;
let white_flame_lg_faction = {
  me: null,
  op: null,
};

let yt_repeat_conf = null;
let yt_repeat_launch = {
  id: 0,
  vol: 0,
};
function translateDefinesJS() {
  // getUiStrngDefinesJS(key);

  players.me = getUiStrngDefinesJS("players.me");
  players.op = getUiStrngDefinesJS("players.op");
  players.sys = getUiStrngDefinesJS("players.sys");

  gryffinschool_conf.topic = getUiStrngDefinesJS("gryffinschool_conf.topic");
  mtg_conf.topic = getUiStrngDefinesJS("mtg_conf.topic");

  syndicate_faction_clone.nilfgaard.name =
    getUiStrngDefinesJS("factions.nilfgaard");

  syndicate_faction_clone.scoiatael.name =
    getUiStrngDefinesJS("factions.scoiatael");

  syndicate_faction_clone.skellige.name =
    getUiStrngDefinesJS("factions.skellige");

  syndicate_faction_clone.syndicate.name =
    getUiStrngDefinesJS("factions.syndicate");

  syndicate_faction_clone.sky.name = getUiStrngDefinesJS("factions.sky");

  map_results_txt._me = getUiStrngDefinesJS("map_results._me");

  map_results_txt._op = getUiStrngDefinesJS("map_results._op");

  map_results_txt._me_lambert = getUiStrngDefinesJS("map_results._me_lambert");

  map_results_txt._op_lambert = getUiStrngDefinesJS("map_results._op_lambert");

  map_results_txt.cheater = getUiStrngDefinesJS("map_results.cheater");
}
translateDefinesJS();

async function animatePopFromObject(elem, colorhex, aftercolorhex, isrestored) {
  return new Promise((resolve) => {
    if (!elem) {
      resolve();
      return;
    }

    const duration = 800;
    const rect = elem.getBoundingClientRect();

    // invisible instant flash
    const glow = document.createElement("div");
    glow.className = "crystal-glow";
    glow.style.backgroundColor = colorhex;

    glow.style.left = rect.left + rect.width / 2 + "px";

    glow.style.top = rect.top + rect.height / 2 + "px";

    document.body.appendChild(glow);

    const particles = [];

    for (let i = 0; i < 8; i++) {
      const hex = document.createElement("div");

      hex.className = "crystal-hex";
      hex.style.backgroundColor = colorhex;

      hex.style.left = rect.left + rect.width / 2 + "px";

      hex.style.top = rect.top + rect.height / 2 + "px";

      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 60;

      hex.style.setProperty("--x", Math.cos(angle) * distance + "px");

      hex.style.setProperty("--y", Math.sin(angle) * distance + "px");

      document.body.appendChild(hex);
      particles.push(hex);

      hex.classList.add(isrestored ? "hex-in" : "hex-out");
    }

    // crystal animation
    elem.classList.remove("crystal-break", "crystal-restore");

    // force restart animation
    void elem.offsetWidth;

    if (isrestored) {
      elem.classList.add("crystal-restore");

      setTimeout(() => {
        elem.classList.add("gem-on");
      }, 500);
    } else {
      elem.classList.add("crystal-break");

      setTimeout(() => {
        elem.classList.remove("gem-on");
      }, 120);
    }

    setTimeout(() => {
      elem.classList.remove("crystal-break", "crystal-restore");

      glow.remove();

      particles.forEach((p) => p.remove());

      resolve();
    }, duration);
  });
}
