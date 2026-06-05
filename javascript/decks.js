"use strict";

const GLOBAL_DECKS = ["neutral", "special", "weather"];
const MIN_UNITS = 22;
const TARGET_TOTAL = 42;
const MIN_WEATHER = 5;

const TARGET_HERO_RATIO = 0.2;
const TARGET_SPECIAL_RATIO = 0.15;
const TARGET_NEUTRAL_RATIO = 0.25;

// Calculate if you don't already have it elsewhere
const MAX_SPECIAL = Math.floor(TARGET_TOTAL * TARGET_SPECIAL_RATIO);

// ======================================================
// STRING HELPERS
// ======================================================

function STRNG_lowercase(value) {
  return String(value ?? "").toLowerCase();
}

function string_pos(haystack, needle) {
  return STRNG_lowercase(haystack).indexOf(STRNG_lowercase(needle));
}

// ======================================================
// RANDOM HELPERS
// ======================================================

function random(max) {
  return Math.random() * max;
}

function irandom(max) {
  return Math.floor(Math.random() * (max + 1));
}

function irandom_range(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choose(array) {
  if (!Array.isArray(array) || array.length === 0) return null;

  return array[Math.floor(Math.random() * array.length)];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ======================================================
// CARD LOOKUP
// ======================================================

function getLeaderIndex(name) {
  return card_dict.findIndex(
    (card) =>
      card.row === "leader" &&
      STRNG_lowercase(card.name) === STRNG_lowercase(name),
  );
}

function getCardIndex(name, requestedCount = 1) {
  const cards = card_dict.filter(
    (card) =>
      card.row !== "leader" &&
      STRNG_lowercase(card.name) === STRNG_lowercase(name),
  );

  if (!cards.length) {
    console.warn("Card not found:", name);
    return null;
  }

  const maxCount = cards.reduce(
    (sum, card) => sum + Number(card.count || 0),
    0,
  );

  const finalCount = Math.min(requestedCount, maxCount);

  if (requestedCount > maxCount) {
    console.warn(
      `${name}: requested ${requestedCount}, max available ${maxCount}`,
    );
  }

  const index = card_dict.findIndex(
    (card) =>
      card.row !== "leader" &&
      STRNG_lowercase(card.name) === STRNG_lowercase(name),
  );

  return [index, finalCount];
}

function STRNG_lowercase(name) {
  //console.log("STRNGLOWER", name)
  try {
    return name.toLowerCase();
  } catch (e) {
    return name;
  }
}
function getCardIndex(name, requestedCount = 1) {
  //	console.log("getCardIndex", name, requestedCount)
  const cards = card_dict.filter(
    (card) =>
      STRNG_lowercase(card.name) === STRNG_lowercase(name) &&
      card.row !== "leader",
  );

  if (!cards.length) {
    console.warn("Card not found:", name);
    return null;
  }

  // max copies available in card database
  const maxCount = cards.reduce((sum, card) => {
    return sum + Number(card.count || 0);
  }, 0);

  const finalCount = Math.min(requestedCount, maxCount);

  if (requestedCount > maxCount) {
    console.warn(
      `${name}: requested ${requestedCount}, max is ${maxCount}. Using ${finalCount}.`,
    );
  }

  // use first matching card index
  const index = card_dict.findIndex(
    (card) =>
      STRNG_lowercase(card.name) === STRNG_lowercase(name) &&
      card.row !== "leader",
  );

  return [index, finalCount];
}

function getCardsIndex_return_more(faction, cards, minUnits = MIN_UNITS) {
  const result = [];
  const usedCards = {};

  let unitCount = 0;
  let heroCount = 0;
  let specialCount = 0;
  let weatherCount = 0;
  let totalCards = 0;

  const MIN_WEATHER = 1;
  const MAX_WEATHER = 2;

  const MIN_SPECIAL = 2;
  const MAX_SPECIAL = Math.floor(TARGET_TOTAL * TARGET_SPECIAL_RATIO);

  // =====================================================
  // CARD TYPES
  // =====================================================

  function isUnit(card) {
    return (
      card.row &&
      card.row !== "leader" &&
      card.deck !== "special" &&
      card.deck !== "weather"
    );
  }

  function isHero(card) {
    return card.ability?.toLowerCase().includes("hero");
  }

  function isWeather(card) {
    return card.deck === "weather";
  }

  function isSpecial(card) {
    return card.deck === "special";
  }

  // =====================================================
  // COUNTS
  // =====================================================

  function getMaxCount(name) {
    //	return card_dict
    //		.filter(c =>
    //			STRNG_lowercase(c.name) === STRNG_lowercase(name)
    //		)
    //		.reduce(
    //			(sum, c) => sum + Number(c.count || 0),
    //			0
    //		);
    var index_tmp = getCardIndex(name);
    var maxCount = card_dict[index_tmp[0]].count;
    var isMax = parseInt(maxCount);
    console.log("isMax", isMax);
    return isMax;
  }

  function getCurrentCount(name) {
    return usedCards[name] || 0;
  }

  function canAddCard(name) {
    return getCurrentCount(name) < getMaxCount(name);
  }

  // =====================================================
  // ADD CARD
  // =====================================================

  function addCard(name, count, sampleCard) {
    if (count <= 0) return false;

    const existing = result.find(
      (r) => STRNG_lowercase(r[0]) === STRNG_lowercase(name),
    );

    if (existing) existing[1] += count;
    else result.push([name, count]);

    usedCards[name] = getCurrentCount(name) + count;

    totalCards += count;

    if (isUnit(sampleCard)) unitCount += count;

    if (isHero(sampleCard)) heroCount += count;

    if (isSpecial(sampleCard)) specialCount += count;

    if (isWeather(sampleCard)) weatherCount += count;

    return true;
  }

  // =====================================================
  // AVAILABLE CARDS
  // =====================================================

  function getAvailableCards(filterFn) {
    return card_dict.filter((card) => {
      if (card.row === "leader") return false;

      if (Number(card.count || 0) <= 0) return false;

      if (!filterFn(card)) return false;

      if (!canAddCard(card.name)) return false;

      return true;
    });
  }

  function tryAddRandom(pool, maxAdd = 1) {
    if (!pool.length) return false;

    const card = choose(pool);

    if (!card) return false;

    const freeSlots = getMaxCount(card.name) - getCurrentCount(card.name);

    if (freeSlots <= 0) return false;

    const addCount = Math.min(irandom_range(1, maxAdd), freeSlots);

    return addCard(card.name, addCount, card);
  }

  // =====================================================
  // USER CARDS
  // =====================================================

  for (const [name, requestedCount] of cards) {
    const matchingCards = card_dict.filter(
      (card) =>
        card.row !== "leader" &&
        STRNG_lowercase(card.name) === STRNG_lowercase(name),
    );

    if (!matchingCards.length) {
      console.warn("Card not found:", name);
      continue;
    }

    const factionCards = matchingCards.filter((card) => card.deck === faction);

    const neutralCards = matchingCards.filter((card) =>
      GLOBAL_DECKS.includes(card.deck),
    );

    const usableCards = factionCards.length ? factionCards : neutralCards;

    if (!usableCards.length) continue;

    const maxCount = usableCards.reduce(
      (sum, card) => sum + Number(card.count || 0),
      0,
    );

    const finalCount = Math.min(requestedCount, maxCount);

    addCard(name, finalCount, usableCards[0]);
  }

  // =====================================================
  // MINIMUM UNITS
  // =====================================================

  while (unitCount < minUnits) {
    let added = tryAddRandom(
      getAvailableCards(
        (card) => card.deck === faction && isUnit(card) && !isHero(card),
      ),
      3,
    );

    if (!added) {
      added = tryAddRandom(
        getAvailableCards((card) => card.deck === "neutral" && isUnit(card)),
        2,
      );
    }

    if (!added) break;
  }

  // =====================================================
  // GUARANTEE WEATHER
  // =====================================================

  while (weatherCount < MIN_WEATHER && totalCards < TARGET_TOTAL) {
    const added = tryAddRandom(getAvailableCards(isWeather), 1);

    if (!added) break;
  }

  // =====================================================
  // GUARANTEE SPECIALS
  // =====================================================

  while (specialCount < MIN_SPECIAL && totalCards < TARGET_TOTAL) {
    const added = tryAddRandom(getAvailableCards(isSpecial), 1);

    if (!added) break;
  }

  // =====================================================
  // FILL REMAINING SLOTS
  // =====================================================

  while (totalCards < TARGET_TOTAL) {
    const heroLimit = ForGameStart.hero;

    const neutralLimit = Math.floor(TARGET_TOTAL * TARGET_NEUTRAL_RATIO);

    const currentNeutralCount = result.reduce((sum, [name, count]) => {
      const card = card_dict.find(
        (c) => STRNG_lowercase(c.name) === STRNG_lowercase(name),
      );

      if (card && card.deck === "neutral") return sum + count;

      return sum;
    }, 0);

    const candidatePools = [];

    candidatePools.push(
      getAvailableCards(
        (card) => card.deck === faction && isUnit(card) && !isHero(card),
      ),
    );

    if (heroCount < heroLimit) {
      candidatePools.push(
        getAvailableCards((card) => card.deck === faction && isHero(card)),
      );

      candidatePools.push(
        getAvailableCards((card) => card.deck === "neutral" && isHero(card)),
      );
    }

    if (currentNeutralCount < neutralLimit) {
      candidatePools.push(
        getAvailableCards((card) => card.deck === "neutral" && isUnit(card)),
      );
    }

    if (weatherCount < MAX_WEATHER) {
      candidatePools.push(getAvailableCards(isWeather));
    }

    if (specialCount < MAX_SPECIAL) {
      candidatePools.push(getAvailableCards(isSpecial));
    }

    const validPools = candidatePools.filter((pool) => pool.length);

    if (!validPools.length) break;

    const pool = choose(validPools);

    if (!tryAddRandom(pool, 2)) break;
  }

  console.log({
    faction,
    unitCount,
    heroCount,
    specialCount,
    weatherCount,
    totalCards,
  });

  return result;
}

function getCardsIndex(faction, cards) {
  console.log("RICHER CARDS INPUT", faction, cards);

  cards = getCardsIndex_return_more(faction, cards);

  console.log("RICHER CARDS", faction, cards);

  return cards.map((card) => getCardIndex(card[0], card[1])).filter(Boolean);
}

function gen_premade_decks() {
  return [
    {
      faction: "realms",
      leader: getLeaderIndex("Foltest - Lord Commander of the North"),
      cards: getCardsIndex("realms", [
        ["Blue Stripes Commando", 3],
        ["Catapult", 2],
        ["Crinfrid Reavers Dragon Hunter", 3],
        ["Poor Fucking Infantry", 4],
        ["Sigismund Dijkstra", 1],
        ["Thaler", 1],
        ["Vernon Roche", 1],
        ["John Natalis", 1],
        ["Philippa Eilhart", 1],
        ["Trebuchet", 2],
        ["Kaedweni Siege Expert", 5], // capped automatically to 3
        ["Decoy", 2],
        ["Commander's Horn", 1],
        ["Scorch", 1],
      ]),
    },

    {
      faction: "nilfgaard",
      leader: getLeaderIndex("Emhyr var Emreis - the White Flame"),
      cards: getCardsIndex("nilfgaard", [
        ["Impera Brigade Guard", 4],
        ["Nausicaa Cavalry Rider", 3],
        ["Young Emissary", 2],
        ["Stefan Skellen", 1],
        ["Shilard Fitz-Oesterlen", 1],
        ["Menno Coehoorn", 1],
        ["Letho of Gulet", 1],
        ["Morvran Voorhis", 1],
        ["Tibor Eggebracht", 1],
        ["Siege Engineer", 1],
        ["Heavy Zerrikanian Fire Scorpion", 1],
        ["Decoy", 2],
        ["Scorch", 1],
      ]),
    },

    {
      faction: "monsters",
      leader: getLeaderIndex("Eredin - Destroyer of Worlds"),
      cards: getCardsIndex("monsters", [
        ["Arachas ", 3],
        ["Ghoul", 3],
        ["Nekker", 3],
        ["Crone - Brewess", 1],
        ["Crone - Weavess", 1],
        ["Crone - Whispess", 1],
        ["Vampire - Bruxa", 1],
        ["Vampire - Ekimmara", 1],
        ["Vampire - Fleder", 1],
        ["Vampire - Garkain", 1],
        ["Kayran", 1],
        ["Leshen", 1],
        ["Imlerith", 1],
        ["Draug", 1],
        ["Scorch", 1],
        ["Biting Frost", 2],
      ]),
    },

    {
      faction: "scoiatael",
      leader: getLeaderIndex("Francesca Findabair - Hope of the Aen Seidhe"),
      cards: getCardsIndex("scoiatael", [
        ["Dol Blathanna Scout", 3],
        ["Dwarven Skirmisher", 3],
        ["Elven Skirmisher", 3],
        ["Havekar Smuggler", 3],
        ["Mahakaman Defender", 5],
        ["Milva", 1],
        ["Iorveth", 1],
        ["Saesenthessis", 1],
        ["Isengrim Faoiltiarna", 1],
        ["Yaevinn", 1],
        ["Ciaran aep Easnillien", 1],
        ["Decoy", 2],
        ["Commander's Horn", 1],
      ]),
    },

    {
      faction: "skellige",
      leader: getLeaderIndex("Eist Tuirseach — King Of Citra"),
      cards: getCardsIndex("skellige", [
        ["Clan an Craite Warrior", 3],
        ["Young Berserker", 3],
        ["Light Longship", 3],
        ["War Longship", 2],
        ["Cerys", 1],
        ["Cerys - Clan Drummond Shield Maiden", 3],
        ["Hjalmar", 1],
        ["Ermion", 1],
        ["Olaf", 1],
        ["Kambi", 1],
        ["Birna Bran", 1],
        ["Draig Bon-Dhu", 1],
        ["Mardroeme", 2],
        ["Skellige Storm", 1],
      ]),
    },

    // Work in progress
    {
      faction: "sky",
      leader: getLeaderIndex("darkness_storm_leader"), // change later when better leader
      cards: getCardsIndex("sky", [["Royal Guard", 3]]),
    },
  ];
}
async function async_gen_premade_decks() {
  return gen_premade_decks();
}
let premade_deck = gen_premade_decks();

console.log("PREMADE DECKS", premade_deck);
