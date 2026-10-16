"use strict";
// Helpers for buttons & previews
// Adds card-view buttons under the Bank and Deck headings.
function positionButtonUnderHeading(heading, button) {
  const range = document.createRange();
  range.selectNodeContents(heading);

  const textRect = range.getBoundingClientRect();
  const parent = button.offsetParent;

  if (!parent || !textRect.width || !textRect.height) return;

  const parentRect = parent.getBoundingClientRect();

  const scaleX = parentRect.width / (parent.offsetWidth || 1);
  const scaleY = parentRect.height / (parent.offsetHeight || 1);

  const left =
    (textRect.left + textRect.width / 2 - parentRect.left) / scaleX -
    button.offsetWidth / 2;

  const top = (textRect.bottom - parentRect.top) / scaleY + 5;

  button.style.setProperty("left", `${left}px`, "important");
  button.style.setProperty("top", `${top}px`, "important");
}
function addDeckBankCarouselButtons() {
  const buttons = [
    {
      titleId: "card-bank-title",
      buttonId: "view-bank-cards-btn",
      label: "",
      ariaLabel: "View available bank cards",
      source: "bank",
    },
    {
      titleId: "card-deck-title",
      buttonId: "view-deck-cards-btn",
      label: "",
      ariaLabel: "View deck cards",
      source: "deck",
    },
  ];

  for (const config of buttons) {
    const heading = document.getElementById(config.titleId);

    if (!heading) {
      console.warn(`[CardCarousel] Heading not found: ${config.titleId}`);
      continue;
    }

    if (document.getElementById(config.buttonId)) continue;

    const button = document.createElement("button");

    button.id = config.buttonId;
    button.type = "button";
    button.className = "card-carousel-view-btn";
    button.title = config.ariaLabel;
    button.setAttribute("aria-label", config.ariaLabel);

    const img = document.createElement("img");
    img.src = "img/icons/anim_spy.png";
    img.alt = "";
    img.width = 24;
    img.height = 24;

    img.onerror = () => {
      img.remove();
      button.textContent = "👁";
    };

    button.appendChild(img);

    if (config.label) {
      button.appendChild(document.createTextNode(config.label));
    }

    button.addEventListener("click", async () => {
      if (typeof ShowDeckBankCarousel !== "function") {
        console.error("[CardCarousel] ShowDeckBankCarousel() is not defined.");
        return;
      }

      button.disabled = true;

      try {
        await ShowDeckBankCarousel(config.source);
      } catch (error) {
        console.error("[CardCarousel] Failed:", error);
      } finally {
        button.disabled = false;
      }
    });

    heading.insertAdjacentElement("afterend", button);

    const reposition = () => positionButtonUnderHeading(heading, button);

    requestAnimationFrame(reposition);
    window.addEventListener("resize", reposition);
  }
}
// Opens a carousel showing one copy of each available card.
// source: "deck", "bank", or "both"
async function ShowDeckBankCarousel(source = "both") {
  if (!["deck", "bank", "both"].includes(source)) {
    throw new TypeError('source must be "deck", "bank", or "both"');
  }

  const container = new CardContainer();
  const seen = new Set();

  const owner = typeof player_me !== "undefined" ? player_me : null;

  // Add a card only once, even if multiple copies exist.
  function addUniqueCard(cardOrData) {
    if (!cardOrData) return;

    const isCard = cardOrData instanceof Card;
    const data = isCard ? (cardOrData._raw ?? cardOrData) : cardOrData;

    const faction = cardOrData.faction ?? data.deck;
    const filename = cardOrData.filename ?? data.filename;

    const key = `${faction}:${filename}`;

    if (!filename || seen.has(key)) return;

    seen.add(key);

    container.cards.push(isCard ? cardOrData : new Card(data, owner));
  }

  // Convert DeckMaker entries into actual Card objects.
  function addDeckMakerCards(entries) {
    for (const entry of entries ?? []) {
      // Skip cards that are not available in this collection.
      if (!(Number(entry?.count) > 0)) continue;

      const cardData = card_dict[entry.index];

      if (cardData) {
        addUniqueCard(cardData);
      }
    }
  }

  const hasDeckMaker =
    typeof dm !== "undefined" &&
    Array.isArray(dm?.deck) &&
    Array.isArray(dm?.bank);

  if (hasDeckMaker) {
    if (source === "deck" || source === "both") {
      addDeckMakerCards(dm.deck);
    }

    if (source === "bank" || source === "both") {
      addDeckMakerCards(dm.bank);
    }
  } else if (source !== "bank") {
    // Fallback: show the current player's actual game deck.
    const playerCards =
      typeof player_me !== "undefined" ? (player_me?.deck?.cards ?? []) : [];

    playerCards.forEach(addUniqueCard);
  }

  // Fallback if the deck builder had no cards to show.
  if (
    container.cards.length === 0 &&
    source !== "bank" &&
    typeof player_me !== "undefined"
  ) {
    (player_me?.deck?.cards ?? []).forEach(addUniqueCard);
  }

  if (container.cards.length === 0) {
    showTooltip("No available cards to display.");
    return;
  }

  // Sort cards before displaying them.
  container.cards.sort((a, b) => Card.compare(a, b));
  // console.log("container.cards", container.cards);
  container.cards.sort((a, b) => {
    const c1 = {
      name: a.name,
      basePower: -Number(a._raw?.strength ?? a.basePower),
      faction: a.faction,
    };

    const c2 = {
      name: b.name,
      basePower: -Number(b._raw?.strength ?? b.basePower),
      faction: b.faction,
    };

    return Card.compare(c1, c2);
  });

  console.log(`[CARD CAROUSEL] Showing ${container.cards.length} unique cards`);

  // Open the existing carousel and wait until it closes.
  await ui.viewCardsInContainer(container);
}
//

// Deck helper, change lider
// https://fonts.google.com/icons?icon.query=settings&selected=Material+Symbols+Outlined:settings:FILL@0;wght@400;GRAD@0;opsz@24&icon.size=24&icon.color=%23FFFFFF
const SVG_settings_leader_change = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
    <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/>
</svg>`;
async function init_leader_hints() {
  (() => {
    const PRIVATE = {
      target: "#card-leader",
      image: "#card-leader > div",
      className: "leader-change-hint-overlay",
      styleId: "leader-change-hint-styles",
      svgVariable: "SVG_settings_leader_change",
    };

    const GLOBAL_NAME = "LeaderHint";
    window[GLOBAL_NAME]?.stop?.();

    let timer = null;
    let observer = null;
    let currentTarget = null;
    let currentOverlay = null;
    let styleElement = null;

    function getSvgSource() {
      try {
        return typeof SVG_settings_leader_change !== "undefined"
          ? SVG_settings_leader_change
          : null;
      } catch {
        return null;
      }
    }

    function createSvg() {
      const source = getSvgSource();
      let svg = null;

      if (typeof source === "string") {
        const template = document.createElement("template");
        template.innerHTML = source.trim();
        svg = template.content.querySelector("svg");
      } else if (
        source instanceof SVGElement &&
        source.tagName.toLowerCase() === "svg"
      ) {
        svg = source.cloneNode(true);
      }

      if (!svg) {
        console.warn("[LeaderHint] SVG source unavailable or invalid.");
        return null;
      }

      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");

      return svg;
    }

    function installStyles() {
      const c = LEADER_HINT_CONFIG;

      styleElement?.remove();

      styleElement = document.createElement("style");
      styleElement.id = PRIVATE.styleId;

      styleElement.textContent = `
      .${PRIVATE.className} {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        pointer-events: none;
        z-index: 10;

        transform: translate(
          ${c.horizontalOffset},
          ${c.verticalOffset}
        );

        mix-blend-mode: ${c.blendMode};
        opacity: ${c.opacityMax};

        animation: ${
          c.animate
            ? `leaderHintPulse ${c.pulseSeconds}s ease-in-out infinite alternate`
            : "none"
        };
      }

      .${PRIVATE.className} svg {
        display: block;
        width: ${c.size};
        height: ${c.size};
        min-width: ${c.minSize};
        min-height: ${c.minSize};
        max-width: ${c.maxSize};
        max-height: ${c.maxSize};
        object-fit: contain;
        overflow: visible;

        filter: ${
          c.glow
            ? `drop-shadow(0 0 5px ${c.glowColor})
               drop-shadow(0 0 12px ${c.glowColor})`
            : "none"
        };

        animation: ${
          c.animate
            ? `leaderHintSpin ${c.rotationSeconds}s linear infinite`
            : "none"
        };
      }

      @keyframes leaderHintPulse {
        from { opacity: ${c.opacityMin}; }
        to   { opacity: ${c.opacityMax}; }
      }

      @keyframes leaderHintSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    `;

      document.head.appendChild(styleElement);
    }

    function update() {
      if (!styleElement?.isConnected) {
        installStyles();
      } else {
        installStyles();
      }

      const card = document.querySelector(PRIVATE.target);
      const target = card?.querySelector(PRIVATE.image);

      if (!target) {
        currentOverlay?.remove();
        currentOverlay = null;
        currentTarget = null;
        return;
      }

      if (
        target === currentTarget &&
        currentOverlay?.parentElement === target
      ) {
        return;
      }

      currentOverlay?.remove();

      target
        .querySelectorAll(`:scope > .${PRIVATE.className}`)
        .forEach((el) => el.remove());

      const svg = createSvg();
      if (!svg) return;

      const overlay = document.createElement("div");
      overlay.className = PRIVATE.className;
      overlay.setAttribute("aria-hidden", "true");
      overlay.appendChild(svg);

      if (getComputedStyle(target).position === "static") {
        target.style.position = "relative";
      }

      target.appendChild(overlay);

      currentTarget = target;
      currentOverlay = overlay;

      if (LEADER_HINT_CONFIG.debug) {
        console.log("[LeaderHint] Overlay attached.", target);
      }
    }

    function stop() {
      if (timer !== null) clearInterval(timer);
      observer?.disconnect();
      currentOverlay?.remove();
      styleElement?.remove();

      timer = null;
      observer = null;
      currentTarget = null;
      currentOverlay = null;
      styleElement = null;

      if (window[GLOBAL_NAME]?.stop === stop) {
        delete window[GLOBAL_NAME];
      }
    }

    function start() {
      installStyles();
      update();

      observer = new MutationObserver(() => {
        const card = document.querySelector(PRIVATE.target);
        const target = card?.querySelector(PRIVATE.image);

        if (
          target !== currentTarget ||
          currentOverlay?.parentElement !== target
        ) {
          update();
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      timer = setInterval(
        update,
        Math.max(100, Number(LEADER_HINT_CONFIG.checkInterval) || 800),
      );

      window[GLOBAL_NAME] = {
        update,
        stop,
        restart() {
          stop();
          start();
        },
      };

      if (LEADER_HINT_CONFIG.debug) {
        console.log("[LeaderHint] Started.");
      }
    }

    start();
  })();
}
async function sync_update_deck_helper_leader__see_me_human_and_thats_also_very_long_function_name() {
  await LeaderHint.stop();
  try {
    await LeaderHint.update();
  } catch (e) {}
  if (LEADER_HINT_CONFIG.use) {
    try {
      await LeaderHint.start();
    } catch (e) {
      await init_leader_hints();
    }
  }
  return "OK";
}
init_leader_hints();
// ===================================

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
        ["kaedwen_siege_1", 3],
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
        ["black_archer_1", 2],
        ["archer_support", 2],
        ["assire", 1],
        ["decoy", 2],
        ["scorch", 1],
      ]),
    },
    {
      faction: "monsters",
      leader: getLeaderIndex("eredin_gold"),
      cards: getCardsIndex("monsters", [
        ["arachas_1", 3],
        ["arachas_behemoth", 1],
        ["ghoul", 3],
        ["nekker", 3],
        ["witch_velen", 1],
        ["witch_velen_1", 1],
        ["witch_velen_2", 1],
        ["bruxa", 1],
        ["ekkima", 1],
        ["fleder", 1],
        ["garkain", 1],
        ["katakan", 1],
        ["striga", 3],
        ["scary_puppy", 3],
        ["draug", 1],
        ["kayran", 1],
        ["leshen", 1],
        ["toad", 1],
        ["decoy", 2],
        ["scorch", 1],
      ]),
    },
    {
      faction: "scoiatael",
      leader: getLeaderIndex("francesca_hope_of_the_aen_seidhe"),
      cards: getCardsIndex("scoiatael", [
        ["dwarf", 3],
        ["elf_skirmisher_1", 3],
        ["havekar_nurse_2", 3],
        ["havekar_support_2", 3],
        ["dol_infantry_2", 3],
        ["mahakam_4", 3],
        ["wardancer", 2],
        ["vrihedd_brigade_1", 2],
        ["eithne", 1],
        ["iorveth", 1],
        ["isengrim", 1],
        ["saskia", 1],
        ["schirru", 1],
        ["decoy", 1],
        ["scorch", 1],
      ]),
    },
    {
      faction: "skellige",
      leader: getLeaderIndex("eist_tuirseach"),
      cards: getCardsIndex("skellige", [
        ["shield_maiden_2", 3],
        ["craite_warrior", 3],
        ["war_longship", 2],
        ["young_berserker", 3],
        ["light_longship", 3],
        ["cerys", 1],
        ["ermion", 1],
        ["hjalmar", 1],
        ["olaf", 1],
        ["gerry", 1],
        ["birna", 1],
        ["kambi", 1],
        ["draig", 1],
        ["mardroeme", 2],
        ["storm", 1],
        ["decoy", 1],
      ]),
    },
    {
      faction: "sky",
      leader: getLeaderIndex("darkness_storm_leader"),
      cards: getCardsIndex("sky", [
        ["guard", 3],
        ["chibi_mask", 3],
        ["krill", 3],
        ["arcadaoffun", 2],
        ["spirit", 2],
        ["redcrab", 2],
        ["crabspy", 2],
        ["tgc20", 2],
        ["custom!sky_vincent_guys", 3],
        ["steward", 1],
        ["rico", 1],
        ["danielle", 1],
        ["ranger", 1],
        ["aviary_medic", 1],
        ["custom!sky_vincent", 1],
        ["custom!sky_vincent_medic", 1],
      ]),
    },
    {
      faction: "syndicate",
      leader: getLeaderIndex("sigi_reuven"),
      // The dictionary has few playable Syndicate units,
      // so this template uses neutral cards to fill out the deck.
      cards: getCardsIndex("syndicate", [
        ["fisstech", 2],
        ["magister", 1],
        ["custom!s_moonlight", 2],
        ["decoy", 2],
        ["scorch", 1],
        ["horn", 1],
        ["clear", 1],
        ["mysterious_elf", 1],
        ["geralt", 1],
        ["ciri", 1],
        ["yennefer", 1],
        ["triss", 1],
        ["villen", 1],
        ["lambert", 1],
        ["eskel", 1],
        ["olgierd", 1],
        ["zoltan", 1],
        ["GryffinWitcher", 2],
        ["dopler", 2],
        ["roach", 1],
        ["gaunter_odimm_darkness", 2],
        ["dandelion", 1],
      ]),
    },
  ];
}

async function async_gen_premade_decks() {
  return gen_premade_decks();
}

let premade_deck = gen_premade_decks();

console.log("PREMADE DECKS", premade_deck);
