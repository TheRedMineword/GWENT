const BASE_ADD = 0.25;

const ability_data = {
  me: createAbility(),
  op: createAbility(),
};

let ABILITIES = {
  turn_skiper: {
    type: "skip",
    max: turn_skipper_conf.chargeMax,
    onClick: null,
    add: turn_skipper_conf.perTurn,
    start: 0,
  },
  keadwen_weather: {
    type: "skip",
    max: Math.floor(turn_skipper_conf.chargeMax / 2),
    onClick: null,
    add: Number((turn_skipper_conf.perTurn - 0.15).toFixed(2)),
    start: 0,
  },
  scorchstopper: {
    type: "antischorch",
    max: scorch_stopper.max,
    onClick: null,
    add: 0,
    start: scorch_stopper.max,
  },
  d20cloner: {
    type: "d20cloner",
    max: d20cloner.chargeMax,
    onClick: null,
    add: d20cloner.perTurn,
    start: 0,
  },
};

function createAbility() {
  return {
    enabled: false, // hidden by default
    type: null, // ability id/name
    current: 0,
    max: 9,
    onClick: null,
    add: 0,
    start: 0,
  };
}

/* ------------------------
 * TOOLTIP
 * ------------------------ */

function showSideTooltip(text, duration = 4200) {
  const tooltip = document.getElementById("side-tooltip");
  if (!tooltip) return;

  tooltip.textContent = text;

  // enable line breaks via CSS
  tooltip.style.whiteSpace = "pre-line";

  tooltip.classList.add("show");

  clearTimeout(tooltip.hideTimer);

  tooltip.hideTimer = setTimeout(() => {
    tooltip.classList.remove("show");
  }, duration);
}

/* ------------------------
 * SETUP
 * ------------------------ */

async function ability_setup(side, abilityId) {
  const config = ABILITIES[abilityId];

  if (!config) {
    console.error(`[ABILITY_SETUP] Unknown ability '${abilityId}'`);
    return false;
  }

  ability_data[side] = {
    enabled: true,
    type: abilityId,
    current: 0,
    max: config.max,
    onClick: config.onClick,
    add: config?.add, // || BASE_ADD,
    start: config?.start || 0,
  };

  ability_update(side);

  console.log(`[ABILITY_SETUP] ${side} -> ${abilityId}`);

  return true;
}

/* ------------------------
 * RESET / CLEAR
 * ------------------------ */

function ability_reset(side = null) {
  if (side) {
    ability_data[side] = createAbility();
    ability_update(side);
    return;
  }

  ability_data.me = createAbility();
  ability_data.op = createAbility();

  ability_update("me");
  ability_update("op");
}

/* ------------------------
 * ENABLE / DISABLE
 * ------------------------ */

function ability_enable(side) {
  ability_data[side].enabled = true;
  ability_update(side);
}

function ability_disable(side) {
  ability_data[side].enabled = false;
  ability_update(side);
}

/* ------------------------
 * UI UPDATE
 * ------------------------ */

function ability_update(side, gain = false) {
  const ability = ability_data[side];

  const meter = document.getElementById(`faction-ability-${side}`);
  const counter = document.getElementById(`faction-ability-count-${side}`);

  if (!meter || !counter) return;

  if (!ability.enabled) {
    meter.classList.add("hide");
    return;
  }

  meter.classList.remove("hide");

  const displayCount = Math.floor(ability.current);

  counter.textContent = displayCount;

  if (side === "me") {
    if (gain) {
      tocar("tf2/meter", false);

      showSideTooltip(
        `Your ability bar has filled (${ability.current}/${ability.max}). \nClick counter to use leader ability!`,
      );
    } else {
      showSideTooltip(
        `You have ${ability.current}/${ability.max} in your faction ability meter!`,
      );
    }
  }

  console.log(
    `[ABILITY_UPDATE]`,
    side,
    ability.current,
    "/",
    ability.max,
    ability.type,
  );
}

/* ------------------------
 * POWER CHANGES
 * ------------------------ */
async function set_start_power(side) {
  if (side === "me") {
    if (ability_data.me !== null) {
      ability_data.me.current = ability_data.me.start;
    }
  } else {
    if (ability_data.op !== null) {
      ability_data.op.current = ability_data.op.start;
    }
  }
  console.log("ABILITY START UPDATE", ability_data);
  ability_update(side);
  return ability_data[side];
}
function ability_add(side, value = BASE_ADD) {
  if (value < 0) {
    return ability_remove(side, Math.abs(value));
  }

  const ability = ability_data[side];
  const old = ability.current;

  ability.current = Number(
    Math.min(ability.max, ability.current + value).toFixed(2),
  );

  const oldDisplay = Math.floor(old);
  const newDisplay = Math.floor(ability.current);

  ability_update(side, newDisplay > oldDisplay);

  console.log(`[ABILITY_ADD] ${side}: ${old} -> ${ability.current}`);

  return old !== ability.current;
}

function ability_remove(side, value = BASE_ADD) {
  const ability = ability_data[side];
  const old = ability.current;

  ability.current = Number(Math.max(0, ability.current - value).toFixed(2));

  ability_update(side);

  console.log(`[ABILITY_REMOVE] ${side}: ${old} -> ${ability.current}`);

  return old !== ability.current;
}

function ability_remove_force(side, value = BASE_ADD) {
  const ability = ability_data[side];
  const old = ability.current;

  ability.current = Number((ability.current - value).toFixed(2));

  ability_update(side);

  console.log(`[ABILITY_REMOVE] ${side}: ${old} -> ${ability.current}`);

  return old !== ability.current;
}

/* ------------------------
 * CLICK HANDLER
 * ------------------------ */

function ability_activate(side) {
  const ability = ability_data[side];

  if (!ability.enabled) {
    return;
  }

  ability.config.onClick?.(side, ability);
}
/* ------------------------
 * INITIALIZE
 * ------------------------ */

function ability_init() {
  ["me", "op"].forEach((side) => {
    const meter = document.getElementById(`faction-ability-${side}`);

    if (!meter) return;

    meter.classList.add("hide");

    meter.addEventListener("click", () => {
      ability_activate(side);
    });
  });
}

document
  .getElementById("faction-ability-me")
  .addEventListener("click", async function (event) {
    console.log("Clicked faction-ability-me", ability_data, ability_data.me);
    // logic below
    tocar("card", false);
    if (
      ability_data.me.type === "turn_skiper" ||
      ability_data.me.type === "keadwen_weather"
    ) {
      if (ability_data.me.current < turn_skipper_conf.actiavate) {
        showSideTooltip(
          `You dont have enought energy to activate ability (${ability_data.me.current}/${ability_data.me.max})`,
        );
      } else {
        await ui.popup(
          "Yes",
          () => ability_turn_skiper(),
          "No",
          () => ability_turn_skipper_no(),
          "Skip your turn?",
          "Opponent will have 50/50 to copy card from board!",
        );
      }
    } else if (ability_data.me.type === "scorchstopper") {
      showSideTooltip(
        `You have ${ability_data.me.current}/${ability_data.me.max} of shield charges`,
      );
    } else if (ability_data.me.type === "d20cloner") {
      if (ability_data.me.current < d20cloner.actiavate) {
        showSideTooltip(
          `You dont have enought energy to activate ability (${ability_data.me.current}/${ability_data.me.max})`,
        );
      } else {
        await ui.popup(
          "Yes",
          () => ability_counter_d20__me(),
          "No",
          () => ability_turn_skipper_no(),
          "Roll the die to try and get another card?",
          "",
        );
      }
    }
  });
document
  .getElementById("faction-ability-op")
  .addEventListener("click", async function (event) {
    console.log("Clicked faction-ability-op", ability_data, ability_data.op);
    // logic below
    tocar("card", false);
    showSideTooltip(
      `Opponent have ${ability_data.op.current}/${ability_data.op.max}`,
    );
  });

////////////////////
// ABILITIES DICT //
///////////////////

// TURN SKIPPER
// payload = {type "SpecialAbility", cost: 1, data (seed: string, coin_toss: bool), leader: "turn_skiper"}
function getTurnSkiperCandidates() {
  var candidates = board.row
    .flatMap((r) => r.cards)
    .filter(
      (c) =>
        //        c.power > 0 &&
        c.hero === false && !c.abilities?.includes("aid"),
    );

  candidates.sort((a, b) => b.name.localeCompare(a.name));

  console.log(
    "[TURN_SKIPER] Candidates:",
    candidates.map((c) => ({
      name: c.name,
      filename: c.filename,
      power: c.power,
    })),
    candidates,
  );

  return candidates;
}
async function ability_turn_skiper() {
  //   alert("test");
  if (ability_remove("me", turn_skipper_conf.actiavate)) {
    console.log("[TURN_SKIPER] Ability started");

    const coin_toss = Math.random() < 0.5;

    var skip_turn_coin = `coin-${coin_toss}_player-me`;
    tocar("ability_use_from_counter", false);
    await ui.notification(skip_turn_coin, ui_display_times.faction_ability);
    console.log("[TURN_SKIPER] Coin toss:", coin_toss, skip_turn_coin);

    const payload = {
      type: "SpecialAbility",
      leader: "turn_skiper",
      cost: turn_skipper_conf.actiavate,
      data: {
        coin_toss, //,
        //          cand: []
      },
    };

    if (coin_toss) {
      const seed = `${gameID}_${turncount}_${Date.now()}_${Math.random()}`;

      payload.data.seed = utf8ToBase64(seed);

      console.log("[TURN_SKIPER] Seed generated:", payload.data.seed);

      const candidates = getTurnSkiperCandidates();
      console.log("[TURN_SKIPER] cand", candidates);
      //      payload.data.cand = candidates;

      if (candidates.length > 0) {
        const shuffled = shuffleSeeded(
          [...candidates],
          payload.data.seed,
          "TURN_SKIPER",
        ).array;

        const picked = shuffled[0];

        console.log("[TURN_SKIPER] Picked:", picked.name, picked.filename);

        await picked.animate2("turn_skip_clone_board");

        const cardData = Object.values(card_dict).find(
          (cd) => cd.filename === picked.filename,
        );

        if (cardData) {
          console.log(
            "[TURN_SKIPER] Creating copy for opponent:",
            cardData.name,
          );

          const copy = new Card(cardData, player_op);

          player_op.hand.addCard(copy);
        }
      }
    }

    console.log("[TURN_SKIPER] Sending payload:", payload);

    await comp_and_send(socket, JSON.stringify(payload));

    console.log("[TURN_SKIPER] Ending my turn");

    if (player_op.passed && !player_me.passed) {
      ui.enablePlayer(false);
      showTooltip(
        `The opponent synchronizes with the game, wait ${RegisterMovesHold / 1000} seconds, and think about the next move`,
      );
      ui.enablePlayer(false);
      await sleep(RegisterMovesHold);
      showTooltip(`You can play now again`);
      ui.enablePlayer(true);
      //         player_me.endTurn();
    }
    player_me.endTurn();
  } else {
    ability_turn_skipper_no();
  }
}
async function ability_turn_skiper_op(payload) {
  console.log("[TURN_SKIPER_OP] Payload received:", payload);

  const data = payload.data || {};

  var skip_turn_coin = `coin-${data.coin_toss}_player-op`;
  //  tocar("ability_use_from_counter", false);
  await ui.notification(skip_turn_coin, ui_display_times.faction_ability);
  if (data.coin_toss && data.seed) {
    console.log("[TURN_SKIPER_OP] Rebuilding selection using seed:", data.seed);

    const candidates = getTurnSkiperCandidates();

    if (candidates.length > 0) {
      const shuffled = shuffleSeeded(
        [...candidates],
        data.seed,
        "TURN_SKIPER",
      ).array;

      const picked = shuffled[0];

      console.log("[TURN_SKIPER_OP] Picked:", picked.name, picked.filename);

      await picked.animate2("turn_skip_clone_board");

      const cardData = Object.values(card_dict).find(
        (cd) => cd.filename === picked.filename,
      );

      if (cardData) {
        console.log("[TURN_SKIPER_OP] Creating copy:", cardData.name);

        const copy = new Card(cardData, player_me);

        player_me.hand.addCard(copy);
        await copy.animate("turn_skip_clone_hand");
      }
    }
  }

  console.log("[TURN_SKIPER_OP] Ending opponent turn");
  ability_remove("op", payload.cost);
  player_op.endTurn();
}
async function ability_turn_skipper_no() {
  await sleep(600);
  ui.enablePlayer(true);
  showSideTooltip(`You have ${ability_data.me.current}/${ability_data.me.max}`);
}

// D20 copy from board

async function ability_counter_d20__resolve(
  roll,
  owner,
  target,
  data = {},
  tag = owner.tag,
) {
  console.log(
    `[COUNTER_OP] START | roll=${roll} owner=${owner?.tag} target=${target?.tag} viewer=${tag}`,
  );

  // ====================
  // FAILURES
  // ====================

  if (roll === 1) {
    console.log("[COUNTER_OP] Critical failure");
    switch (tag) {
      case "me":
        try {
          showSideTooltip(
            'You rolled "1"\nOpponent draw an additional card!',
            3000,
          );
          player_op.deck.draw(player_op.hand);
          await sleep(2800);
        } catch (e) {}
        break;
      case "op":
        try {
          showSideTooltip('Opponent rolled "1"\nYou draw an additional card!');
          player_me.deck.draw(player_me.hand);
        } catch (e) {}
        break;
    }
    return;
  }

  if (roll === 20) {
    console.log("[COUNTER_OP] Natural 20 reserved");
    // MAGIC THE GATHERING ON STEREOIDS
    if (tag === "me") {
      let wrapper = { card: null };
      // Get cards directly from card_dict
      let filteredCards = Object.values(card_dict).filter((c) => {
        let strength = Number(c.strength);
        let count = Number(c.count);

        return (
          !isNaN(strength) &&
          !isNaN(count) &&
          count > mtg_conf.count_needed &&
          strength > mtg_conf.min_power &&
          strength < mtg_conf.max_power &&
          c.row !== "leader" //&&
          //c.deck !== "special" &&
          //c.deck !== "weather" &&	//Lets keep that

          //!c.witcher_sign &&
          //!c.token &&
          //!c.generated &&

          //!c.ability?.includes("hero")
        );
      });
      var seed_is = `${mtg_conf.daily_seed ? `${time_now_utc_to_b64()}` : ""}${mtg_conf.version}${turncount}${gameID}`;
      // Don't simulate opponent

      // Shuffle multiple times
      if (mtg_conf.shuffle_few_times) {
        for (let i = 0; i < 4; i++) {
          filteredCards.sort(() => Math.random() - 0.5);
        }
      }
      console.log(
        "MTG CARDS ",
        filteredCards,
        " OR ",
        filteredCards.slice(0, mtg_conf.random_max),
      );

      var tmp_c = shuffleSeeded(
        filteredCards,
        utf8ToBase64(seed_is),
        `MTG ABILITY Seeded from ${seed_is}`,
      );
      filteredCards = tmp_c.array;
      tmp_c = null;
      filteredCards = filteredCards.slice(
        0,
        Math.floor(mtg_conf.random_max * 2),
      );
      if (filteredCards.length <= 0) return;

      // Create TEMP cards for preview carousel
      let previewCards = filteredCards.map((data) => {
        return new Card(data, card.holder);
      });

      let container = {
        cards: previewCards,
      };

      await ui.queueCarousel(
        container,
        1,
        (c, i) => (wrapper.card = c.cards[i]),
        () => true,
        true,
        false,
        mtg_conf.topic,
      );

      let picked = wrapper.card;

      if (!picked) return;

      // Create REAL spawned copy
      let cardData = Object.values(card_dict).find(
        (c) => c.filename === picked.filename,
      );

      if (!cardData) return;

      let created = new Card(cardData, player_me);
      owner.hand.addCard(created);
      created.animate(mtg_conf.anim);
      //  card.animate(mtg_conf.anim);
    }
    return;
  }

  if (roll % 2 === 1) {
    console.log("[COUNTER_OP] Failed roll");
    return;
  }

  // ====================
  // SUCCESS TIERS
  // ====================

  let reveal = true;
  let maxPower = 5;
  let allowHero = false;

  if (roll >= 2 && roll <= 8) {
    reveal = true;
    maxPower = 5;

    console.log(
      `[COUNTER_OP] LOW SUCCESS | reveal=${reveal} maxPower=${maxPower}`,
    );
  } else if (roll >= 10 && roll <= 14) {
    reveal = false;
    maxPower = 9;

    console.log(
      `[COUNTER_OP] MEDIUM SUCCESS | reveal=${reveal} maxPower=${maxPower}`,
    );
  } else if (roll >= 16 && roll <= 18) {
    reveal = false;
    maxPower = 14;
    allowHero = true;

    console.log(
      `[COUNTER_OP] HIGH SUCCESS | reveal=${reveal} maxPower=${maxPower} allowHero=${allowHero}`,
    );
  }

  let shouldReveal = reveal;

  console.log(
    `[COUNTER_OP] Visual reveal=${shouldReveal} (base=${reveal}, viewer=${tag})`,
  );

  // ====================
  // FIND TARGETS
  // ====================

  let candidates = board.row
    .flatMap((r) => r.cards)
    .filter((c) => {
      if (!allowHero && c.hero) return false;
      return c.power <= maxPower;
    });

  candidates.sort((a, b) => {
    const name = a.filename.localeCompare(b.filename);
    if (name !== 0) return name;

    return a.power - b.power;
  });

  console.log(
    `[COUNTER_OP] Candidates found: ${candidates.length}`,
    candidates.map((c) => ({
      name: c.name,
      power: c.power,
      hero: c.hero,
      file: c.filename,
    })),
  );

  if (!candidates.length) {
    console.warn("[COUNTER_OP] No valid candidates");
    return;
  }

  // ====================
  // SEEDED PICK
  // ====================

  console.log(`[COUNTER_OP] Using remote seed: ${data.seed}`);

  const shuffled = shuffleSeeded(
    [...candidates],
    data.seed,
    "COUNTER_OP",
  ).array;

  const picked = shuffled[0];

  console.log(`[COUNTER_OP] Picked card:`, {
    name: picked.name,
    power: picked.power,
    hero: picked.hero,
    filename: picked.filename,
  });

  // ====================
  // REVEAL ANIMATION
  // ====================
  if (tag === "me") {
    shouldReveal = true;
  }
  if (shouldReveal) {
    console.log(`[COUNTER_OP] Showing reveal animation for ${picked.name}`);

    await picked.animate2("turn_skip_clone_board");
  }

  // ====================
  // CREATE COPY
  // ====================

  const cardData = Object.values(card_dict).find(
    (cd) => cd.filename === picked.filename,
  );

  if (!cardData) {
    console.error(
      `[COUNTER_OP] Failed to locate card data for ${picked.filename}`,
    );
    return;
  }

  console.log(
    `[COUNTER_OP] Creating copy of ${cardData.name} for ${owner.tag}`,
  );

  const copy = new Card(cardData, owner);

  owner.hand.addCard(copy);

  console.log(
    `[COUNTER_OP] Copy added to hand. Hand size=${owner.hand.cards.length}`,
  );

  if (shouldReveal) {
    console.log(`[COUNTER_OP] Showing hand animation for ${copy.name}`);

    await copy.animate("turn_skip_clone_hand");
  }

  console.log("[COUNTER_OP] END");
}

async function ability_counter_d20__me() {
  ui.enablePlayer(false);
  if (!ability_remove("me", d20cloner.actiavate)) {
    ability_turn_skipper_no();
    return false;
  }
  tocar("ability_use_from_counter", false);
  let roll = Math.floor(Math.random() * 20) + 1;
  // debug
  //roll = 20;

  await displayD20Roll(roll, {
    title: "Fate Roll",
    titleColor: "#ffcc33",
    message:
      roll === 1
        ? "Critical Failure"
        : roll === 20
          ? "Natural 20!"
          : roll % 2 === 0
            ? "Success"
            : "Failure",

    messageColor:
      roll === 1
        ? "#ff0000"
        : roll === 20
          ? "#ffd700" // gold
          : roll % 2 === 0
            ? "#66ff66"
            : "#ff6666",
  });
  var seed = utf8ToBase64(
    `${gameID}_${turncount}_${roll}_ClientRandomSeed:${client_random_strng}_${utf8ToBase64(`Random:${random_string_gen()}`)}`,
  );

  console.log(`[COUNTER_OP] Generated seed: ${atob(seed)}`, seed);
  const payload = {
    type: "SpecialAbility",
    leader: ability_data.me.type,
    cost: d20cloner.actiavate,
    data: {
      roll,
      seed,
    },
    hand: { before: serializeCards(player_me.hand.cards), after: null },
  };

  await ability_counter_d20__resolve(
    roll,
    player_me,
    player_op,
    payload.data,
    "me",
  );
  payload.hand.after = serializeCards(player_me.hand.cards);
  await comp_and_send(socket, JSON.stringify(payload));
  if (player_op.passed && !player_me.passed) {
    ui.enablePlayer(false);
    showTooltip(
      `The opponent synchronizes with the game, wait ${(RegisterMovesHold * 1.3) / 1000} seconds, and think about the next move`,
    );
    ui.enablePlayer(false);
    await sleep(RegisterMovesHold * 1.3);
    showTooltip(`You can play now again`);
    ui.enablePlayer(true);
    //         player_me.endTurn();
  }
  player_me.endTurn();
}

async function ability_counter_d20__op(payload) {
  ability_remove("op", payload.cost);
  const roll = payload.data.roll;

  await displayD20Roll(roll, {
    title: "Opponent roll dice for addtional cards",
    titleColor: "#ff3333",
    message:
      roll === 1
        ? "Critical Failure"
        : roll === 20
          ? "Natural 20!"
          : roll % 2 === 0
            ? "Success"
            : "Failure",

    messageColor:
      roll === 1
        ? "#ff0000"
        : roll === 20
          ? "#ffd700" // gold
          : roll % 2 === 0
            ? "#66ff66"
            : "#ff6666",
  });

  await ability_counter_d20__resolve(
    roll,
    player_op,
    player_me,
    payload.data,
    "op",
  );
  player_op.endTurn();
}
