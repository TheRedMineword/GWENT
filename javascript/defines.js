"use strict";
let twoPlayersConnected = false; //host alone
let extraJSON = [];
let displaynow = null;
let showbankms = 9000;
let gameended = false;
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
  round_end_result: 2200,
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
  version: "sanidsayuftusidfgnyudsfgnudsf",
  daily_seed: true,
  unstable_mode: "random", // random/not-random/nonbe
};

let audio_cache = {};
let buttonmutemode = 1;
let button_is_second_sheet = 0;
// In game, match in progress
let audio_yt_vid_soundtrack = "FTsuevfvQ9w"; // wild hunt: "UE9fPWy1_o4" // How about round of gwent: "FTsuevfvQ9w"
let audio_yt_vid_soundtrack_volume = 47; // 100 for wild hunt, less for other
// Tavern (Deck menu)
let tavern_yt_vid = "yu197hlNWK0"; // The Witcher 3: Wild Hunt OST - Skellige Tavern | Extended
let tavern_yt_volume = 100;
let gaunter_lider = {
  extra_cards: 0.5,
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
turn_skipper_conf.desc = `Let you skip turns, but gives your opponent 50/50 each skip to copy non-hero card from board. You need ${turn_skipper_conf.actiavate} charge to skip turn, you get ${turn_skipper_conf.perTurn} charges per your turn, up to ${turn_skipper_conf.chargeMax} max charge(s) stored!`;

let ThisDef = {
  name: "Deafult Config",
  env_vars: {
    showbankms: 9000,
    players: { sys: "Gwent Bot" },
    fullscreenConfig: { localhost: false, else: true },
    OnGameStartDraw: 2,
    ForGameStart: { unitscards: 22, special: 10, hero: 9 },
    killoverpowercard: 999,
    darknessstorm_await: false,
    thishandsize: 10,
    herocardanim: true,
    announce_turn_count: true,
    SEND_INTERVAL_MS: 700,
    ui_display_times: {
      socketready: 3000,
      hold_pause: { sleep: 78, needs: 6 },
      queue: [],
      is_running: false,
      is_busy: false,
      round_end_result: 2200,
      notyfication: 2200,
      fadeSpeed: 150,
      checkDelay: 25,
      pass: 1320,
      turn: 1200,
      round_start: 1200,
      coin: 1200,
      faction_ability: 2700,
      show_me_that_card_you_have: 2900,
      is_transitioning: false,
    },
    RegisterMovesHold: 7200,
    resync_wait: 10,
    spy: { spy: 2, aid: 5, sabotage: 1 },
    powergain: {
      ForEachCardGain: 1.11,
      CountSelf: false,
      WeatherDebuffPercent: 0.25,
      Ceil: false,
    },
    axii: { IfBasePowerUnder: 5, TakeAway: 2, desc: null },
    nilfard_drawmaster: {
      handshort: 3,
      drawdead: 3,
      drawalive: 1,
      drawiffail: 3,
      cardban: 2,
      drawextra: 1,
    },
    gryffinschool_conf: {
      anim: "griffin",
      anim_hand: "griffin_hand",
      topic: "Choose a Witcher Sign",
    },
    mtg_conf: {
      anim: "mtg",
      anim_hand: "mtg_hand",
      topic: "Pick a card to draw",
      random_max: 25,
      min_power: -7,
      max_power: 13,
      count_needed: 0,
      shuffle_few_times: false,
      version: "sanidsayuftusidfgnyudsfgnudsf",
      daily_seed: true,
      unstable_mode: "random",
    },
    buttonmutemode: 1,
    button_is_second_sheet: 0,
    audio_yt_vid_soundtrack: "FTsuevfvQ9w",
    audio_yt_vid_soundtrack_volume: 47,
    tavern_yt_vid: "yu197hlNWK0",
    tavern_yt_volume: 100,
    gaunter_lider: { extra_cards: 0.5, revive: 0.6 },
    skellige_bond_conf: { power: 4 },
    turn_skipper_conf: {
      perTurn: 0.25,
      actiavate: 1,
      chargeMax: 2,
    },
  },
};

function ordinal(n) {
  let j = n % 10;
  let k = n % 100;

  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;

  return `${n}th`;
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
