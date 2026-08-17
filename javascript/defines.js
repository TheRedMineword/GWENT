"use strict";
loadingscreenupdate("Creating env vars!");
let allowdiscordintegration = true;
const discord_cards = {
  "Poor Fucking Infantry": "discord_poor_infantry",
};
let discord_cards_array = [];
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
let syndicate_spawn_start_card_id = "4001";
let syndicate_spawn_start_card_row = "close";
let it_is_me_an_doppler = null;
const passmedicpercard = 1500;
const medicdrawextrasecondswait = 2.2; // extraJson hold // no longer used
const medic_ability_revive_wait_a_second = 1.7 * 1000;
let ThatIsSpy = [
  "axii2_desc",
  "spy",
  "sabotage",
  "axii2_desc_playable",
  "dopler",
  "yrden",
];
let bucket_max = 7;
let bucket_spawn_base = 6;
let bucket_spawn_per_lider_minus = 2;
let bucket_op_draw_per_power = 4.65;
let bucket_cards_strenght = {
  bigger: 3,
  smaller: 12,
};
let bond_config = {
  use: true,

  // Decay starts after this many bonds for every card
  bond_start: 3,

  // How quickly additional bonds lose value
  decay: 0.4,

  // Stronger cards decay even faster
  power_threshold: 5,

  // Optional total/base-strength safety cap
  power_cap: true,
  max_ratio: 2.4,
};
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
  // desc: null,
};
//powergain.desc = `Card base power grows by ${powergain.ForEachCardGain} for each card in the row (${powergain.CountSelf ? "including itself" : "excluding itself"}). Card base power is not affected by weather, but its bonus power is reduced by ${Math.round((1 - powergain.WeatherDebuffPercent) * 100)}% under weather effects. Values are rounded ${powergain.Ceil ? "up" : "down"}.`;

let axii = {
  IfBasePowerUnder: 5,
  TakeAway: 2,
  // desc: null,
};
//axii.desc = `Each card in row under Axii effect that base power is less than ${axii.IfBasePowerUnder} will lose ${axii.TakeAway} power. Debuffs dont stack. Dont affect hero cards`;

console.log("Spy draw:", spy, "\nPowergain:", powergain, "\nAxii:", axii);

let card_of_the_day = {
  run: false,
  reset: {
    zone: "UTC",
    at: 7,
  },
  card: {
    range: "0 < x < 14",
    banned_abilities: ["hero"],
    banned_deck: ["weather"],
    banned_rows: ["leader"],
    add_extra: 1,
    countover: 0,
  },
  pick: 4,
  seed: "swfjlmdsfgthkdsi",
};

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
let viperSchool_conf = {
  anim: "griffin",
  anim_hand: "griffin_hand",
  topic: "Choose a Witcher Sign",
};
let viper_potions_defs = {
  potion_jaskolka: {
    id: "spypotion",
    affects: {
      me: true,
      op: true,
    },
    json: {
      translation_key: "potions.spypotion",
      turns_left: 5,
      refresh_rows: {
        type: "none",
        value: null,
      },
    },
  },
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
  //  desc: null,
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
  // desc: null,
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
//turn_skipper_conf.desc = `Let you skip turns, but gives your opponent 50/50 each skip to copy non-hero card from board. You need ${turn_skipper_conf.actiavate} charge to skip turn, you get ${turn_skipper_conf.perTurn} charges per your turn, up to ${turn_skipper_conf.chargeMax} max charge(s) stored!`;
//d20cloner.desc = `Let you roll D20 for chance to get additional card from board, but what card you can get depends on roll result. Success on even roll. You need ${d20cloner.actiavate} charge to roll dice, you get ${d20cloner.perTurn} charges per your turn, up to ${d20cloner.chargeMax} max charge(s) stored!`;

let card_name_class = {
  foltest_copper: "royal_%g",
  foltest_bronze: "royal_%g",
  foltest_silver: "royal_%g",
  foltest_gold: "royal_%g",
  foltest_son_of_medell: "royal_%g",
  emhyr_copper: "royal_%g",
  emhyr_silver: "royal_%g",
  emhyr_gold: "royal_%g",
  emhyr_invader_of_the_north: "royal_%g",
  eredin_rider: "commander_%g",
  eredin_silver: "commander_%g",
  eredin_gold: "commander_%g",
  eredin_king: "royal_%g",
  eredin_the_treacherous: "commander_%g",
  eredin_bucket: "commander_%g",
  mysterious_elf: "elf_%g",
  decoy: "special_%g",
  "custom!Decoy2": "monster_%g",
  frost: "special_%g",
  ciri: "elderblood_%g",
  clear: "special_%g",
  horn: "special_%g",
  dandelion: "bard_%g",
  emiel: "monster_%g",
  geralt: "witcher_%g",
  fog: "special_%g",
  scorch: "special_%g",
  rain: "special_%g",
  triss: "magic_%g",
  vesemir: "witcher_%g",
  villen: "monster_%g",
  yennefer: "sorcerer_%g",
  zoltan: "dwarf_%g",
  olgierd: "warrior_%g",
  gaunter_odimm: "monster_%g",
  gaunter_odimm_darkness: "monster_%g",
  Gaunter_Leader: "monster_%g",
  Gaunter_Leader2: "monster_%g",
  cow: "cow_%g",
  chort: "monster_%g",
  ballista: "siege_%g",
  blue_stripes: "soldier_%g",
  catapult_1: "siege_%g",
  crinfrid: "soldier_%g",
  dethmold: "sorcerer_%g",
  banner_nurse: "medic_%g",
  esterad: "royal_%g",
  natalis: "commander_%g",
  kaedwen_siege_1: "soldier_%g",
  keira: "sorcerer_%g",
  philippa: "sorcerer_%g",
  poor_infantry: "soldier_%g",
  discord_poor_infantry: "soldier_%g",
  stennis: "royal_%g",
  redania_1: "soldier_%g",
  sheldon: "dwarf_%g",
  siege_tower: "siege_%g",
  siegfried: "warrior_%g",
  dijkstra: "spy_%g",
  sheala: "sorcerer_%g",
  thaler: "spy_%g",
  sabrina: "sorcerer_%g",
  vernon: "commander_%g",
  vernontemeria_call: "commander_%g",
  ves: "soldier_%g",
  yarpen: "dwarf_%g",
  trebuchet_1: "siege_%g",
  albrich: "soldier_%g",
  assire: "sorcerer_%g",
  black_archer_1: "soldier_%g",
  cahir: "commander_%g",
  cynthia: "spy_%g",
  archer_support: "soldier_%g",
  fringilla: "sorcerer_%g",
  heavy_zerri: "siege_%g",
  imperal_brigade: "soldier_%g",
  letho: "witcher_%g",
  lethosabotage: "witcher_%g",
  menno: "commander_%g",
  morteisen: "spy_%g",
  moorvran: "commander_%g",
  nauzicaa_2: "soldier_%g",
  puttkammer: "commander_%g",
  rainfarn: "commander_%g",
  renuald: "commander_%g",
  rotten: "siege_%g",
  shilard: "spy_%g",
  siege_engineer: "soldier_%g",
  siege_support: "siege_%g",
  stefan: "commander_%g",
  sweers: "soldier_%g",
  tibor: "commander_%g",
  vanhemar: "sorcerer_%g",
  vattier: "spy_%g",
  sab: "assasin_%g",
  vreemde: "soldier_%g",
  young_emissary: "soldier_%g",
  zerri: "siege_%g",
  arachas_1: "monster_%g",
  arachas_behemoth: "monster_%g",
  poroniec: "monster_%g",
  celaeno_harpy: "monster_%g",
  cockatrice: "monster_%g",
  witch_velen: "monster_%g",
  witch_velen_1: "monster_%g",
  witch_velen_2: "monster_%g",
  draug: "monster_%g",
  earth_elemental: "monster_%g",
  endrega: "monster_%g",
  fiend: "monster_%g",
  fire_elemental: "monster_%g",
  fogling: "monster_%g",
  forktail: "monster_%g",
  frightener: "monster_%g",
  gargoyle: "monster_%g",
  ghoul: "monster_%g",
  gravehag: "monster_%g",
  gryffin: "monster_%g",
  harpy: "monster_%g",
  frost_giant: "monster_%g",
  imlerith: "commander_%g",
  kayran: "monster_%g",
  leshen: "monster_%g",
  nekker: "monster_%g",
  mighty_maiden: "monster_%g",
  bruxa: "monster_%g",
  ekkima: "monster_%g",
  fleder: "monster_%g",
  garkain: "monster_%g",
  katakan: "monster_%g",
  werewolf: "monster_%g",
  wyvern: "monster_%g",
  toad: "monster_%g",
  hym: "monster_%g",
  nightwraith: "monster_%g",
  noonwraith: "monster_%g",
  deatheatr: "monster_%g",
  beast_of_tussant: "monster_%g",
  dopler: "monster_%g",
  reveal_dopler: "monster_%g",
  krill: "monster_%g",
  thedevil: "monster_%g",
  kambi: "monster_%g",
  francesca_silver: "royal_%g",
  francesca_gold: "royal_%g",
  francesca_copper: "royal_%g",
  francesca_bronze: "royal_%g",
  francesca_hope_of_the_aen_seidhe: "royal_%g",
  ciaran: "elf_%g",
  barclay: "dwarf_%g",
  dennis: "dwarf_%g",
  dol_archer: "elf_%g",
  dol_infantry_2: "elf_%g",
  dwarf: "dwarf_%g",
  eithne: "elf_%g",
  elf_skirmisher_1: "elf_%g",
  filavandrel: "elf_%g",
  havekar_nurse_2: "elf_%g",
  havekar_support_2: "rottenfruit_%g",
  ida: "elf_%g",
  Ida_Emean_d20: "elf_%g",
  iorveth: "hebitch_%g",
  scol_sab: "hebitch_%g",
  isengrim: "elf_%g",
  mahakam_4: "dwarf_%g",
  milva: "warrior_%g",
  riordain: "elf_%g",
  saskia: "warrior_%g",
  toruviel: "elf_%g",
  vrihedd_cadet: "elf_%g",
  vrihedd_brigade_1: "elf_%g",
  yaevinn: "elf_%g",
  berserker: "berserker_%g",
  young_berserker: "berserker_%g",
  vildkaarl: "berserker_%g",
  young_vildkaarl: "berserker_%g",
  svalblod: "berserker_%g",
  svalblod_change: "berserker_%g",
  birna: "commander_%g",
  bad_lady: "sabotage_%g",
  blueboy: "warrior_%g",
  cerys: "royal_%g",
  brokva_archer: "soldier_%g",
  dimun_pirate: "warrior_%g",
  shield_maiden_2: "warrior_%g",
  heymaey: "bard_%g",
  tordarroch: "dwarf_%g",
  craite_warrior: "warrior_%g",
  donar: "warrior_%g",
  draig: "bard_%g",
  ermion: "sorcerer_%g",
  hemdall: "warrior_%g",
  hjalmar: "commander_%g",
  holger: "commander_%g",
  light_longship: "ship_%g",
  war_longship: "ship_%g",
  madmad_lugos: "warrior_%g",
  mardroeme: "special_%g",
  olaf: "warrior_%g",
  storm: "special_%g",
  svanrige: "warrior_%g",
  udalryk: "royal_%g",
  udalryka_leader: "commander_%g",
  crach_an_craite: "commander_%g",
  king_bran: "royal_%g",
  eist_tuirseach: "royal_%g",
  Arnjolf_the_Patricide: "warrior_%g",
  wardancer: "warrior_%g",
  schirru: "warrior_%g",
  gerry: "special_%g",
  aidhorn: "banner_%g",
  spice_trader: "spicetrader_%g",
  roach: "roach_%g",
  axii: "magic_%g",
  axii_p: "magic_%g",
  aard: "magic_%g",
  yrden: "magic_%g",
  igni: "magic_%g",
  quen: "magic_%g",
  wshield: "witcher_%g",
  cos: "magic_%g",
  lambert: "witcher_%g",
  eskel: "witcher_%g",
  GryffinWitcher: "witcher_%g",
  keadwen_weather: "special_%g",
  radovid_stern: "royal_%g",
  fake_ciri: "royal_%g",
  whitefrost: "special_%g",
  temeriacall: "special_%g",
  temeriamoral: "soldier_%g",
  temeriamoral_1: "soldier_%g",
  temeriabluestripe: "soldier_%g",
  temeriabluestripe_2: "soldier_%g",
  guard: "guard_%g",
  fisstech: "special_%g",
  sigi_reuven: "spy_%g",
  king_of_beggers: "spy_%g",
  magister: "assasin_%g",
  "custom!power_place": "magic_%g",
  "custom!m_moonlight": "event_%g",
  "custom!s_moonlight": "siege_%g",
  "custom!deatheatersmoon": "magic_%g",
  "custom!nightwraithsmoon": "magic_%g",
  steward: "sky_guide_s_%g",
  chibi_mask: "sky_item_%g",
  rico: "sky_spirit_%g",
  arcadaoffun: "sky_spirit_%g",
  fortunedrum: "sky_item_%g",
  spirit: "sky_spirit_%g",
  danielle: "sky_skykid_%g",
  redcrab: "siege_%g",
  crabspy: "spy_%g",
  darkstorm: "special_%g",
  darkness_storm_leader: "royal_%g",
  ranger: "medic_%g",
  tgc20: "magic_%g",
  elder_wasteland: "royal_%g",
  colorguide: "sky_guide_e_%g",
  colorcollab: "sky_guide_e_%g",
  aviary_medic: "sky_skykid_%g",
  vault_elder_s2e: "royal_%g",
  natureguide: "sky_guide_e_%g",
  naturecollab: "sky_guide_e_%g",
  skyfest: "sky_guide_e_%g",
  "custom!traveling_spirit": "event_%g",
  "custom!skyseason": "siege_%g",
  "custom!sky_vincent": "sky_guide_s_%g",
  "custom!vincent_painting_power": "sky_guide_s_%g",
  "custom!sky_vincent_guys": "sky_spirit_%g",
  "custom!sky_vincent_medic": "sky_spirit_%g",
  valley_twins: "royal_%g",
  sunbather_pink: "sky_spirit_%g",
  bluebird_a: "sky_item_%g",
  bluebird_b: "warrior_%g",
  bluebird_sad: "sky_spirit_%g",
  striga: "monster_%g",
  viperwitcher: "witcher_%g",
  potion_jaskolka: "potion_%g",
};
let classDecorators = {
  undefined: { prefix: "⩫<", suffix: ">⩫" },
  none: { prefix: "⩫<", suffix: ">⩫" },

  royal: { prefix: "♔ ", suffix: "" },
  commander: { prefix: "⟪", suffix: "⟫" },
  soldier: { prefix: "[", suffix: "]" },
  witcher: { prefix: "⚔ ", suffix: "" },
  witcheress: { prefix: "⚔ ", suffix: "" },
  sorcerer: { prefix: "✦ ", suffix: " ✦" },
  elderblood: { prefix: "⟨", suffix: "⟩" },
  magic: { prefix: "✧", suffix: "✧" },
  monster: { prefix: "☾ ", suffix: " ☽" },
  rottenfruit: { prefix: "⫵ ", suffix: " ⫵" },
  warrior: { prefix: "⚔ ", suffix: "" },
  berserker: { prefix: "ᛒ ", suffix: "" },
  dwarf: { prefix: "⛏ ", suffix: "" },
  elf: { prefix: "❧ ", suffix: "" },
  spy: { prefix: "⌁", suffix: "⌁" },
  siege: { prefix: "▣ ", suffix: "" },
  ship: { prefix: "⚓ ", suffix: "" },
  bard: { prefix: "♪ ", suffix: " ♪" },
  special: { prefix: "★ ", suffix: " ★" },
  event: { prefix: "‹", suffix: "›" },
  hebitch: { prefix: "「", suffix: "」" },
  banner: { prefix: "⚑ ", suffix: "" },
  spicetrader: { prefix: "✧ ", suffix: "" },
  cow: { prefix: "🐄 ", suffix: "" },

  sky_spirit: { prefix: "✦ ", suffix: " ✦" },
  guard: { prefix: "🛡 ", suffix: "" },
  sky_guide_e: { prefix: "‹", suffix: "›" },
  sky_guide_s: { prefix: "❖ ", suffix: "" },
  sky_skykid: { prefix: "☀ ", suffix: "" },
  sky_item: { prefix: "◇ ", suffix: "" },

  medic: { prefix: "✚ ", suffix: "" },
  healer: { prefix: "✚ ", suffix: "" },
  sabotage: { prefix: "⚠ ", suffix: "" },
  assasin: { prefix: "† ", suffix: "" },
  roach: { prefix: "‹", suffix: "›" },
  potion: { prefix: "🧪 ", suffix: "" },
};
let card_gender = {
  mysterious_elf: "male",
  dandelion: "male",
  emiel: "male",
  geralt: "male",
  vesemir: "male",
  villen: "male",
  zoltan: "male",
  olgierd: "male",
  gaunter_odimm: "male",
  gaunter_odimm_darkness: "male",
  Gaunter_Leader: "male",
  Gaunter_Leader2: "male",
  lambert: "male",
  eskel: "male",
  GryffinWitcher: "male",

  ciri: "female",
  triss: "female",
  yennefer: "female",

  foltest_copper: "male",
  foltest_bronze: "male",
  foltest_silver: "male",
  foltest_gold: "male",
  foltest_son_of_medell: "male",

  blue_stripes: "male",
  crinfrid: "male",
  dethmold: "male",
  esterad: "male",
  natalis: "male",
  poor_infantry: "male",
  discord_poor_infantry: "male",
  stennis: "male",
  redania_1: "male",
  sheldon: "male",
  siegfried: "male",
  dijkstra: "male",
  thaler: "male",
  vernon: "male",
  ves: "female",
  yarpen: "male",
  albrich: "male",

  banner_nurse: "female",
  keira: "female",
  philippa: "female",
  sheala: "female",
  sabrina: "female",

  emhyr_copper: "male",
  emhyr_silver: "male",
  emhyr_gold: "male",
  emhyr_invader_of_the_north: "male",

  albrich: "male",
  cahir: "male",
  letho: "male",
  menno: "male",
  morteisen: "male",
  moorvran: "male",
  puttkammer: "male",
  rainfarn: "male",
  renuald: "male",
  shilard: "male",
  stefan: "male",
  sweers: "male",
  tibor: "male",
  vanhemar: "male",
  vattier: "male",
  vreemde: "male",
  young_emissary: "male",
  fake_ciri: "female",

  assire: "female",
  cynthia: "female",
  fringilla: "female",
  nauzicaa_2: "female",

  eredin_rider: "male",
  eredin_silver: "male",
  eredin_gold: "male",
  eredin_king: "male",
  eredin_the_treacherous: "male",
  imlerith: "male",

  witch_velen: "female",
  witch_velen_1: "female",
  witch_velen_2: "female",
  gravehag: "female",

  Ida_Emean_d20: "female",
  francesca_silver: "female",
  francesca_gold: "female",
  francesca_copper: "female",
  francesca_bronze: "female",
  francesca_hope_of_the_aen_seidhe: "female",

  ciaran: "male",
  barclay: "male",
  dennis: "male",
  dol_archer: "female",
  dol_infantry_2: "female",
  dwarf: "male",
  eithne: "female",
  elf_skirmisher_1: "female",
  filavandrel: "male",
  iorveth: "male",
  isengrim: "male",
  mahakam_4: "male",
  milva: "female",
  riordain: "male",
  saskia: "female",
  toruviel: "female",
  vrihedd_cadet: "male",
  vrihedd_brigade_1: "male",
  yaevinn: "male",

  birna: "female",
  bad_lady: "female",
  blueboy: "male",
  cerys: "female",
  brokva_archer: "male",
  dimun_pirate: "male",
  shield_maiden_2: "female",
  heymaey: "male",
  tordarroch: "male",
  craite_warrior: "male",
  donar: "male",
  draig: "male",
  ermion: "male",
  hemdall: "male",
  hjalmar: "male",
  holger: "male",
  madmad_lugos: "male",
  olaf: "male",
  svanrige: "male",
  udalryk: "male",
  udalryka_leader: "male",
  crach_an_craite: "male",
  king_bran: "male",
  eist_tuirseach: "male",
  Arnjolf_the_Patricide: "male",
  schirru: "male",
  gerry: "male",

  sab: "male",
  cos: "female",
  sigi_reuven: "male",
  king_of_beggers: "male",
  magister: "male",
  roach: "female",
  aidhorn: "male",

  steward: "male",
  rico: "male",
  arcadaoffun: "male",
  danielle: "female",
  ranger: "male",
  elder_wasteland: "male",
  colorguide: "female",
  colorcollab: "male",
  aviary_medic: "female",
  vault_elder_s2e: "male",
  natureguide: "female",
  naturecollab: "male",
  skyfest: "female",

  "custom!sky_vincent": "male",
  "custom!vincent_painting_power": "male",
  "custom!sky_vincent_guys": "male",
  "custom!sky_vincent_medic": "male",
};
card_gender.undefined = "male";
let ThisDef = {
  name: "Default Config",

  env_vars: {
    allowdiscordintegration: deepClone(allowdiscordintegration),
    showbankms: deepClone(showbankms),

    // players: {},

    fullscreenConfig: deepClone(fullscreenConfig),

    OnGameStartDraw: deepClone(OnGameStartDraw),
    medicsdraw: deepClone(medicsdraw),
    ThatIsSpy: deepClone(ThatIsSpy),
    card_of_the_day: deepClone(card_of_the_day),
    bucket_max: deepClone(bucket_max),
    bucket_spawn_base: deepClone(bucket_spawn_base),
    bucket_spawn_per_lider_minus: deepClone(bucket_spawn_per_lider_minus),
    bucket_op_draw_per_power: deepClone(bucket_op_draw_per_power),
    bucket_cards_strenght: deepClone(bucket_cards_strenght),
    bond_config: deepClone(bond_config),
    syndicate_spawn_start_card_id: deepClone(syndicate_spawn_start_card_id),
    syndicate_spawn_start_card_row: deepClone(syndicate_spawn_start_card_row),

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
    viperSchool_conf: deepClone(viperSchool_conf),

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
    clock_config: deepClone(clock_config),
    card_name_class: deepClone(card_name_class),
    classDecorators: deepClone(classDecorators),
    card_gender: deepClone(card_gender),
    viper_potions_defs: deepClone(viper_potions_defs),
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
function show_end_turn_notif() {
  //  showTooltip(getUiStrng("end_turn").replace("%s", ordinal(turncount - 1)));
  pushMessage(
    formatMessage2(
      getUiStrng("end_turn").replace("%s", ordinal(turncount - 1)),
    ),
    2560,
  );
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

let wait_extra = 0;
async function resolve_extrajson_procces() {
  console.log("extraJSON vibe check:", extraJSON.length, extraJSON, {
    medicrevive: med_draw === 1,
    extrajson: extraJSON.length > 0,
  });
  wait_extra = 0;
  if (extraJSON.length > 0) {
    const total = extraJSON.length;
    if (med_draw === 1) {
      wait_extra = extraJSON.length;
      console.log("extraJson medic wait pass", passmedicpercard, wait_extra, {
        type: "medicrevivedata",
        data: extraJSON,
      });
      await resolve_pass_at_extrajson(medic_ability_revive_wait_a_second);
      comp_and_send(
        socket,
        JSON.stringify({ type: "medicrevivedata", data: extraJSON }),
      );
      med_draw = 0;
      extraJSON.length = 0;
    } else {
      for (let i = 0; i < total; i++) {
        const payload = extraJSON[i];

        // base hold + extra 500ms for each next packet
        const delay =
          RegisterMovesHold + i * 500 + medicdrawextrasecondswait * 1000;

        console.log(`Hold before send extraJSON ${i + 1}/${total}`, payload);

        showTooltip(
          getUiStrng("sync.hold_progress")
            .replace("%x", i + 1)
            .replace("%y", total)
            .replace("%s", delay / 1000),
        );
        showsync(delay);
        await new Promise((resolve) => setTimeout(resolve, delay));

        comp_and_send(socket, payload);
      }
    }
    extraJSON = [];
  }
  return true;
}
let ignore_usage_duration_of_card_if_pass = false;
async function resolve_pass_post_extrajson(leaderextar = 0) {
  console.log(
    "resolve_pass_post_extrajson",
    leaderextar,
    "do it?",
    player_op.passed && !player_me.passed,
  );
  if (player_op.passed && !player_me.passed) {
    var wait = RegisterMovesHold;
    if (leaderextar > 0) {
      if (!ignore_usage_duration_of_card_if_pass) {
        wait = leaderextar + wait + 1000;
      } else {
        ignore_usage_duration_of_card_if_pass = false;
      }
    }
    wait = wait + wait_extra * passmedicpercard;
    console.log("resolve_pass_post_extrajson is", wait, leaderextar);
    ui.enablePlayer(false);
    showTooltip(getUiStrng("sync.sync").replace("%s", wait / 1000));
    ui.enablePlayer(false);
    showsync(wait);
    await sleep(wait);
    showTooltip(getUiStrng("sync.end"));
    ui.enablePlayer(true);
  }
  wait_extra = 0;
  return true;
}
async function resolve_pass_at_extrajson(ms) {
  var wait2 = ms;
  showTooltip(getUiStrng("sync.sync").replace("%s", wait2 / 1000));
  showsync(wait2);
  await sleep(wait2);
  //showTooltip(getUiStrng("sync.end"));
  return true;
}
function getAverageScore(roundHistoryResults) {
  if (!roundHistoryResults?.length) return 0;

  const total = roundHistoryResults.reduce(
    (sum, round) => sum + round.score_me + round.score_op,
    0,
  );

  return total / (roundHistoryResults.length * 2);
}
