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
//const MAX_SPECIAL = 10;

// ======================================================
// STRING HELPERS
// ======================================================

function STRNG_lowercase(value) {
  try {
    return String(value ?? "").toLowerCase();
  } catch (e) {
    return value;
  }
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
// NOTE: the single source of truth for "which card is this" is now
// card.filename (not card.name, which is just the display label).
// Every lookup/tally below is keyed on filename for consistency.

function getLeaderIndex(name) {
  const index = card_dict.findIndex(
    (card) =>
      card.row === "leader" &&
      STRNG_lowercase(card.filename) === STRNG_lowercase(name),
  );

  if (index === -1) {
    console.warn(
      `getLeaderIndex: no leader found for "${name}". ` +
        `Check that this string matches a card.filename value in card_dict.`,
    );
  }

  return index;
}

function getCardIndex(name, requestedCount = 1) {
  const cards = card_dict.filter(
    (card) =>
      card.row !== "leader" &&
      STRNG_lowercase(card.filename) === STRNG_lowercase(name),
  );

  if (!cards.length) {
    console.warn("Card not found:", name);
    return null;
  }

  // max copies available in card database
  const maxCount = cards.reduce(
    (sum, card) => sum + Number(card.count || 0),
    0,
  );

  const finalCount = Math.min(requestedCount, maxCount);

  if (requestedCount > maxCount) {
    console.warn(
      `${name}: requested ${requestedCount}, max is ${maxCount}. Using ${finalCount}.`,
    );
  }

  // use first matching card index
  const index = card_dict.findIndex(
    (card) =>
      card.row !== "leader" &&
      STRNG_lowercase(card.filename) === STRNG_lowercase(name),
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
  // const MAX_SPECIAL = 10;

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
    const found = getCardIndex(name);

    if (!found) return 0;

    const maxCount = card_dict[found[0]].count;
    const isMax = parseInt(maxCount, 10);

    return Number.isNaN(isMax) ? 0 : isMax;
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
  // `name` here is always a filename — every caller below has been
  // updated to pass card.filename, not card.name.

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

      if (!canAddCard(card.filename)) return false;

      return true;
    });
  }

  function tryAddRandom(pool, maxAdd = 1) {
    if (!pool.length) return false;

    const card = choose(pool);

    if (!card) return false;

    const freeSlots =
      getMaxCount(card.filename) - getCurrentCount(card.filename);

    if (freeSlots <= 0) return false;

    const addCount = Math.min(irandom_range(1, maxAdd), freeSlots);

    return addCard(card.filename, addCount, card);
  }

  // =====================================================
  // USER CARDS
  // =====================================================

  for (const [name, requestedCount] of cards) {
    const matchingCards = card_dict.filter(
      (card) =>
        card.row !== "leader" &&
        STRNG_lowercase(card.filename) === STRNG_lowercase(name),
    );

    if (!matchingCards.length) {
      console.warn("Card not found:", name);
      continue;
    }

    var factionCards = null;
    if (faction === "syndicate") {
      factionCards = matchingCards.filter((card) =>
        Object.keys(syndicate_faction_clone).includes(card.deck),
      );
    } else {
      factionCards = matchingCards.filter((card) => card.deck === faction);
    }

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
    let added = null;

    if (faction === "syndicate") {
      added = tryAddRandom(
        getAvailableCards(
          (card) =>
            Object.keys(syndicate_faction_clone).includes(card.deck) &&
            isUnit(card) &&
            !isHero(card),
        ),
        3,
      );
    } else {
      added = tryAddRandom(
        getAvailableCards(
          (card) => card.deck === faction && isUnit(card) && !isHero(card),
        ),
        3,
      );
    }

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
  var times = 1;
  if (faction === "syndicate") {
    times = 1.45;
  }

  while (totalCards < Math.floor(TARGET_TOTAL * times)) {
    let heroLimit = typeof ForGameStart !== "undefined" ? ForGameStart.hero : 4;
    heroLimit = 4;

    const neutralLimit = Math.floor(TARGET_TOTAL * TARGET_NEUTRAL_RATIO);

    const currentNeutralCount = result.reduce((sum, [name, count]) => {
      const card = card_dict.find(
        (c) => STRNG_lowercase(c.filename) === STRNG_lowercase(name),
      );

      if (card && card.deck === "neutral") return sum + count;

      return sum;
    }, 0);

    const candidatePools = [];

    if (faction === "syndicate") {
      candidatePools.push(
        getAvailableCards(
          (card) =>
            Object.keys(syndicate_faction_clone).includes(card.deck) &&
            isUnit(card) &&
            !isHero(card),
        ),
      );

      if (heroCount < heroLimit) {
        candidatePools.push(
          getAvailableCards(
            (card) =>
              Object.keys(syndicate_faction_clone).includes(card.deck) &&
              isHero(card),
          ),
        );
      }

      candidatePools.push(
        getAvailableCards((card) => card.deck === "neutral" && isHero(card)),
      );
    } else {
      candidatePools.push(
        getAvailableCards((card) => isUnit(card) && !isHero(card)),
      );

      if (heroCount < heroLimit) {
        candidatePools.push(
          getAvailableCards((card) => card.deck === faction && isHero(card)),
        );
      }

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
      leader: getLeaderIndex("foltest_gold"),
      cards: getCardsIndex("realms", [
        ["blue_stripes", 3],
        ["catapult_1", 2],
        ["crinfrid", 3],
        ["poor_infantry", 4],
        ["dijkstra", 1],
        ["thaler", 1],
        ["vernon", 1],
        ["natalis", 1],
        ["philippa", 1],
        ["trebuchet_1", 2],
        ["kaedwen_siege_1", 5],
        ["decoy", 2],
        ["horn", 1],
        ["scorch", 1],
      ]),
    },
    {
      faction: "nilfgaard",
      leader: getLeaderIndex("emhyr_silver"),
      cards: getCardsIndex("nilfgaard", [
        ["imperal_brigade", 4],
        ["nauzicaa_2", 3],
        ["young_emissary", 2],
        ["stefan", 1],
        ["shilard", 1],
        ["menno", 1],
        ["letho", 1],
        ["moorvran", 1],
        ["tibor", 1],
        ["siege_engineer", 1],
        ["heavy_zerri", 1],
        ["decoy", 2],
        ["scorch", 1],
      ]),
    },

    {
      faction: "monsters",
      // TODO: verify this string matches a card.filename in card_dict —
      // it currently looks like a display name, not a filename.
      leader: getLeaderIndex("eredin_gold"),
      cards: getCardsIndex("monsters", []),
    },

    {
      faction: "scoiatael",
      // TODO: verify this string matches a card.filename in card_dict.
      leader: getLeaderIndex("francesca_hope_of_the_aen_seidhe"),
      cards: getCardsIndex("scoiatael", []),
    },

    {
      faction: "skellige",
      // TODO: verify this string matches a card.filename in card_dict.
      leader: getLeaderIndex("eist_tuirseach"),
      cards: getCardsIndex("skellige", []),
    },

    // Work in progress
    {
      faction: "sky",
      leader: getLeaderIndex("darkness_storm_leader"),
      cards: getCardsIndex("sky", []),
    },
    {
      faction: "syndicate",
      // TODO: change later when better leader; verify filename match.
      leader: getLeaderIndex("sigi_reuven"),
      cards: getCardsIndex("syndicate", []),
    },
  ];
}

async function async_gen_premade_decks() {
  return gen_premade_decks();
}

let premade_deck = gen_premade_decks();

console.log("PREMADE DECKS", premade_deck);
