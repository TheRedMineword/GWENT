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

      payload.data.seed = btoa(seed);

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
  tocar("ability_use_from_counter", false);
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
