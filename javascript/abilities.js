"use strict";

function findAvengerTarget(cardName) {
  console.log('findAvengerTarget("', cardName, '");');
  var ret = card_dict.find((c) => c.avenger === cardName);
  if (!ret) {
    ret = card_dict.find((c) => c.avenger === "HiIamDopler");
  }
  return ret;
}
function findReinforceTargets(cardName) {
  console.log('findReinforceTargets("', cardName, '");');

  return card_dict.filter(
    (c) => c.reinforce && c.reinforce.owner_name === cardName,
  );
}
function time_now_utc_to_b64() {
  // Get UTC date parts only (day-level uniqueness)
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  // stable per-day string
  const dateStr = `${year}-${month}-${day}`;

  // base64 encode
  return utf8ToBase64(dateStr);
}
let magicthegathering_stable = null;
if (mtg_conf.unstable_mode === "random") {
  magicthegathering_stable =
    "This card is unstable, each turn it power will change in most of the time negative numbers (On averge power will be -3.27) ";
} else if (mtg_conf.unstable_mode === "unrandom") {
  magicthegathering_stable =
    "This card is unstable, after picking card it power will drop to -3 ";
}
const NotPickUpAbilities = [
  "axii2_desc",
  // "gryffinSchool",
  // "magicthegathering",
  // "tgc_portal",
  // "reinforce",
  // "wshield",
  "DontPickMeUp",
];

function waitForMedicRevive() {
  return new Promise((resolve) => {
    const check = () => {
      if (medicrevivethat.length > 0) {
        // Remove immediately so no other medic can take it
        const revive = medicrevivethat.shift();
        resolve(revive);
      } else {
        setTimeout(check, 10);
      }
    };

    check();
  });
}

loadingscreenupdate(`Preparing ability_dict`);

var ability_dict = {
  DontPickMeUp: {
    description: "",
  },
  clear: {
    name: "",
    description: "",
  },
  frost: {
    name: "",
    description: "",
  },
  fog: {
    name: "",
    description: "",
  },
  rain: {
    name: "",
    description: "",
  },
  storm: {
    name: "",
    description: "",
  },
  hero: {
    name: "",
    description: "",
  },
  decoy: {
    name: "",
    description: "",
  },
  decoy2: {
    name: "",
    description: "",
  },
  all_rows: {
    name: "",
    description: "",
  },
  wshield: {
    name: "",
    description: "",
    placed: async (card) => await card.animate("wshield"),
  },
  quen_desc: {
    name: "",
    description: "",
  },
  yrden: {
    name: "",
    description: "",
    placed: async (card) => {
      card.holder = card.holder.opponent();
      await card.animate("debuff");
    },
  },
  horn: {
    name: "",
    description: "",
    placed: async (card) => await card.animate("horn"),
  },
  darkstormegen: {
    name: "",
    description: "",
    placed: async (card) => await card.animate("darkstrom"),
  },
  mardroeme: {
    name: "",
    description: "",
    placed: async (card, row) => {
      let berserkers = row.findCards((c) => c.abilities.includes("berserker"));
      await Promise.all(
        berserkers.map(
          async (c) => await ability_dict["berserker"].placed(c, row),
        ),
      );
    },
  },
  berserker: {
    name: "",
    description: "",
    placed: async (card, row) => {
      if (row.effects.mardroeme === 0) return;

      row.removeCard(card);

      const isYoung = card.name_muster.includes("Young");
      const transformedName = isYoung
        ? "Transformed Young Vildkaarl"
        : "Transformed Vildkaarl";

      const targetData = Object.values(card_dict).find(
        (c) => c.name_muster === transformedName,
      );

      if (!targetData) {
        console.warn("No transformed card found for:", card.name);
        return;
      }
      var Mutatant = new Card(targetData, card.holder);
      await row.addCard(Mutatant);
      try {
        Mutatant.animate("avenger_spawn_creature");
      } catch (e) {
        console.error(targetData, Mutatant, e, "BERSERKS");
      }
    },
  },
  scorch: {
    name: "",
    description: "",

    activated: async (card) => {
      await ability_dict["scorch"].placed(card);
      await board.toGrave(card, card.holder.hand);
    },

    placed: async (card, row) => {
      if (
        (card.holder?.leader?.abilities?.[0] === "scorchstopper" ||
          card.holder?.leader?.abilities?.[0] === "scorch_stopper") &&
        scorch_stopper.break_shield_if_you_use
      ) {
        tocar("round_lose", false);
        ability_data[card.holder.tag].current = 0;
        console.log(
          "SCORCH REST VALUES!!",
          ability_data,
          ability_data[card.holder.tag],
        );
        ability_update(card.holder.tag);
      }
      // Temporarily remove the scorch card itself from consideration
      if (row !== undefined) {
        row.cards.splice(row.cards.indexOf(card), 1);
      }

      await ability_dict_resolveScorch(board.row, false);

      // Put it back
      if (row !== undefined) {
        row.cards.push(card);
      }
    },
  },
  scorch_c: {
    name: "",
    description: "",
    placed: async (card) => {
      if (
        (card.holder?.leader?.abilities?.[0] === "scorchstopper" ||
          card.holder?.leader?.abilities?.[0] === "scorch_stopper") &&
        scorch_stopper.break_shield_if_you_use
      ) {
        tocar("round_lose", false);
        ability_data[card.holder.tag].current = 0;
        console.log(
          "SCORCH REST VALUES!!",
          ability_data,
          ability_data[card.holder.tag],
        );
        ability_update(card.holder.tag);
      }
      await ability_dict_resolveScorch(
        [board.getRow(card, "close", card.holder.opponent())],
        true,
      );
    },
  },

  scorch_r: {
    name: "",
    description: "",
    placed: async (card) => {
      if (
        (card.holder?.leader?.abilities?.[0] === "scorchstopper" ||
          card.holder?.leader?.abilities?.[0] === "scorch_stopper") &&
        scorch_stopper.break_shield_if_you_use
      ) {
        tocar("round_lose", false);
        ability_data[card.holder.tag].current = 0;
        console.log(
          "SCORCH REST VALUES!!",
          ability_data,
          ability_data[card.holder.tag],
        );
        ability_update(card.holder.tag);
      }
      await ability_dict_resolveScorch(
        [board.getRow(card, "ranged", card.holder.opponent())],
        true,
      );
    },
  },

  scorch_s: {
    name: "",
    description: "",
    placed: async (card) => {
      if (
        (card.holder?.leader?.abilities?.[0] === "scorchstopper" ||
          card.holder?.leader?.abilities?.[0] === "scorch_stopper") &&
        scorch_stopper.break_shield_if_you_use
      ) {
        tocar("round_lose", false);
        ability_data[card.holder.tag].current = 0;
        console.log(
          "SCORCH REST VALUES!!",
          ability_data,
          ability_data[card.holder.tag],
        );
        ability_update(card.holder.tag);
      }
      await ability_dict_resolveScorch(
        [board.getRow(card, "siege", card.holder.opponent())],
        true,
      );
    },
  },
  scorch_a: {
    name: "",
    description: "",
    placed: async (card, row) => {
      if (
        (card.holder?.leader?.abilities?.[0] === "scorchstopper" ||
          card.holder?.leader?.abilities?.[0] === "scorch_stopper") &&
        scorch_stopper.break_shield_if_you_use
      ) {
        tocar("round_lose", false);
        ability_data[card.holder.tag].current = 0;
        console.log(
          "SCORCH REST VALUES!!",
          ability_data,
          ability_data[card.holder.tag],
        );
        ability_update(card.holder.tag);
      }
      var names_of_rows = {
        melee: "close",
        ranged: "ranged",
      };
      await ability_dict_resolveScorch(
        [
          board.getRow(
            card,
            names_of_rows[row._id.short],
            card.holder.opponent(),
          ),
        ],
        true,
      );
    },
  },
  scorchstopper: {
    description: ``,
  },
  agile: {
    name: "",
    description: "",
  },
  muster: {
    name: "",
    description: "",
    placed: async (card) => {
      let i = card.name_muster.indexOf("-");
      let cardName =
        i === -1 ? card.name_muster : card.name_muster.substring(0, i);
      let pred = (c) => c.name_muster.startsWith(cardName);
      let units = card.holder.hand
        .getCards(pred)
        .map((x) => [card.holder.hand, x])
        .concat(
          card.holder.deck.getCards(pred).map((x) => [card.holder.deck, x]),
        );
      if (units.length === 0) return;
      await card.animate("muster");
      await Promise.all(
        units.map(
          async (p) =>
            await board.addCardToRow(p[1], p[1].row, p[1].holder, p[0]),
        ),
      );
    },
  },
  spy: {
    name: "",
    description: ``,
    placed: async (card) => {
      await card.animate("spy");
      for (let i = 0; i < spy.spy; i++) {
        if (card.holder.deck.cards.length > 0)
          await card.holder.deck.draw(card.holder.hand);
      }
      card.holder = card.holder.opponent();
    },
  },
  sabotage: {
    name: "",
    description: ``,
    placed: async (card) => {
      await card.animate("sab");
      for (let i = 0; i < spy.sabotage; i++) {
        if (card.holder.deck.cards.length > 0)
          await card.holder.deck.draw(card.holder.hand);
      }
      card.holder = card.holder.opponent();
    },
  },
  resilience: {
    name: "",
    description: "",
    placed: async (card) => {
      game.roundEnd.push(async () => {
        card.noRemove = true;
        await card.animate("resilience");

        //		game.roundStart.push(async () => {
        //			delete card.noRemove;
        //			return true;
        //		});
      });
    },
  },
  resilience_igni: {
    name: "",
    description: "",
    placed: async (card) => {
      card.noRemove = "0";
      game.roundEnd.push(async () => {
        if (card.noRemove === "0") {
          await card.animate("resilience");
        }
        //		game.roundStart.push(async () => {
        //			delete card.noRemove;
        //			return true;
        //		}); it also dont work bruh
      });
    },
  },
  aard: {
    name: "",
    description: "",
    placed: async (card, row) => {
      // Row this card was played on
      //	console.log("AARD PLAY", card, row)
      const myRow = row;
      //	console.log("AARD PLAY", card, board.getRow(card, "close", card.holder), board.getRow(card, "ranged", card.holder))

      let enemyRow;
      let targetRow;

      if (myRow === board.getRow(card, "close", card.holder)) {
        enemyRow = board.getRow(card, "close", card.holder.opponent());
        targetRow = board.getRow(card, "ranged", card.holder.opponent());
      } else if (myRow === board.getRow(card, "ranged", card.holder)) {
        enemyRow = board.getRow(card, "ranged", card.holder.opponent());
        targetRow = board.getRow(card, "siege", card.holder.opponent());
      } else {
        await board.toGrave(card, card.holder.hand);
        return;
      }

      const units = enemyRow.findCards((c) => c.isUnit());

      if (units.length > 0) {
        //	await Promise.all(
        //	units.map(async c => await c.animate("knockback"))
        //	);

        await Promise.all(
          units.map(async (c) => {
            if (
              c.abilities.includes("reinforce") ||
              c.abilities.includes("muster") ||
              c.abilities.includes("medic") ||
              c.abilities.includes("medic_n") ||
              c.abilities.includes("sabotage") ||
              c.abilities.includes("spy") ||
              c.abilities.includes("gryffinSchool") ||
              c.abilities.includes("magicthegathering") ||
              c.abilities.includes("tgc_portal") ||
              c.abilities.includes("hero") ||
              c.abilities.includes("scorch_c") ||
              c.abilities.includes("scorch_r") ||
              c.abilities.includes("scorch_s") ||
              c.abilities.includes("scorch")
            ) {
              console.log("AARD SKIPPED ", c, " becuase it had bad abilities");
            } else {
              //	await board.moveToNoEffects(c, targetRow, enemyRow); // not worky here
              // Move cards wich effects listed above
              //	await board.moveTo(c, targetRow, enemyRow);
              await c.animate("aard");
              await board.moveTo(c, targetRow, enemyRow);
              try {
                c.animate("knockback");
              } catch (e) {}
            }
          }),
        );
      }

      //	await board.toGrave(card, card.holder.hand);
    },
    weight: (card) => {
      const opponent = card.holder.opponent();

      const closeUnits = board
        .getRow(card, "close", opponent)
        .cards.filter((c) => c.isUnit()).length;

      const rangedUnits = board
        .getRow(card, "ranged", opponent)
        .cards.filter((c) => c.isUnit()).length;

      return Math.max(closeUnits, rangedUnits);
    },
  },
  aid: {
    name: "",
    description: ``,
    placed: async (card) => {
      await card.animate("aid");
      console.log(
        "AID CARD PAYLOD",
        card,
        "by:",
        card.holder.id,
        "me id:",
        player_me.id,
      );
      // await player_me.deck.draw(player_me.hand);

      if (player_me.deck.cards.length)
        for (let i = 0; i < spy.aid; i++) {
          console.log("me draw");
          try {
            await player_me.deck.draw(player_me.hand);
          } catch (e) {
            console.log("Is empty deck? got error", e);
          }
        }
      if (player_op.deck.cards.length)
        for (let i = 0; i < spy.aid; i++) {
          console.log("enemy draw");
          try {
            await player_op.deck.draw(player_op.hand);
          } catch (e) {
            console.log("Is empty deck? got error", e);
          }
        }
      if (card.holder.id === player_me.id) {
        console.log("is my card extra draw");
        try {
          await player_me.deck.draw(player_me.hand);
        } catch (e) {
          console.log("Is empty deck? got error", e);
        }
      }
      if (card.holder.id === player_op.id) {
        console.log("is not card extra draw");
        try {
          await player_op.deck.draw(player_op.hand);
        } catch (e) {
          console.log("Is empty deck? got error", e);
        }
      }
    },
  },
  axii: {
    name: "",
    description: ``,
    placed: async (card) => {
      try {
        // Find axii card data by filename
        const targetData = Object.values(card_dict).find(
          (c) => c.filename === "axii",
        );

        if (!targetData) {
          console.warn("Axii card not found in card_dict");
          return;
        }
        await card.animate("axii");
        // Create new card for opponent
        const opponent = card.holder.opponent();
        const spawned = new Card(targetData, opponent);

        // Add to opponent close row
        await board.addCardToRow(spawned, "close", opponent);
        //  card.holder = card.holder.opponent();
      } catch (e) {
        console.log("Axii ability error:", e);
      }
    },
  },
  axii2_desc: {
    name: "",
    description: ``,
    placed: async (card) => {
      await card.animate("debuff");
      card.holder = card.holder.opponent();
    },
  },
  axii2_desc_playable: {
    name: "",
    description: ``,
    placed: async (card) => {
      await card.animate("debuff");
      //for (let i=0;i< spy.spy ;i++) {
      //	if (card.holder.deck.cards.length > 0)
      //		await card.holder.deck.draw(card.holder.hand);
      //}
      card.holder = card.holder.opponent();
    },
  },
  gryffinSchool: {
    name: "",
    description: "",
    placed: async (card) => {
      let wrapper = { card: null };

      // Don't simulate opponent
      if (player_me.id !== card.holder.id) {
        card.animate(gryffinschool_conf.anim);
        console.log("Opponent played Gryffin School, waiting for sync.");
        return;
      }

      if (!witcher_signs || witcher_signs.length <= 0) return;

      // Create TEMP cards for preview carousel
      let previewCards = witcher_signs.map((sign) => {
        return new Card(sign, card.holder);
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
        gryffinschool_conf.topic,
      );

      let picked = wrapper.card;

      if (!picked) return;

      // Create REAL spawned copy
      let cardData = Object.values(card_dict).find(
        (c) => c.filename === picked.filename,
      );

      if (!cardData) return;

      let created = new Card(cardData, card.holder);

      card.holder.hand.addCard(created);
      created.animate(gryffinschool_conf.anim_hand);
      card.animate(gryffinschool_conf.anim);
    },
  },
  magicthegathering: {
    name: "",
    description: ``,
    placed: async (card) => {
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
      if (player_me.id !== card.holder.id) {
        card.animate(mtg_conf.anim);
        console.log("Opponent played mtg, waiting for sync.");
        if (!mtg_conf.shuffle_few_times) {
          console.log(
            `Op cards for this GameID and turn to pick from: `,
            shuffleSeeded(
              filteredCards,
              utf8ToBase64(seed_is),
              `MTG ABILITY Seeded from ${seed_is}`,
            ).array.slice(0, mtg_conf.random_max),
            `\nMTG ABILITY Seeded from ${seed_is}`,
          );
        }
        return;
      }

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
      filteredCards = filteredCards.slice(0, mtg_conf.random_max);
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

      let created = new Card(cardData, card.holder);

      card.holder.hand.addCard(created);
      created.animate(mtg_conf.anim_hand);
      card.animate(mtg_conf.anim);
    },
  },
  tgc_portal: {
    name: "",
    description: ``,
    placed: async (card) => {
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
          c.row !== "leader" &&
          c.deck === "sky" &&
          c.ability !== "tgc_portal" //&&
          //c.deck !== "weather" &&	//Lets keep that

          //!c.witcher_sign &&
          //!c.token &&
          //!c.generated &&

          //!c.ability?.includes("hero")
        );
      });
      var seed_is = `${mtg_conf.daily_seed ? `${time_now_utc_to_b64()}` : ""}${mtg_conf.version}${turncount}${gameID}`;
      // Don't simulate opponent
      if (player_me.id !== card.holder.id) {
        card.animate(mtg_conf.anim);
        console.log("Opponent played mtg, waiting for sync.");
        if (!mtg_conf.shuffle_few_times) {
          console.log(
            `Op cards for this GameID and turn to pick from: `,
            shuffleSeeded(
              filteredCards,
              utf8ToBase64(seed_is),
              `MTG ABILITY Seeded from ${seed_is}`,
            ).array.slice(0, mtg_conf.random_max),
            `\nMTG ABILITY Seeded from ${seed_is}`,
          );
        }
        return;
      }

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
      filteredCards = filteredCards.slice(0, mtg_conf.random_max);
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

      let created = new Card(cardData, card.holder);

      card.holder.hand.addCard(created);
      created.animate(mtg_conf.anim_hand);
      card.animate(mtg_conf.anim);
    },
  },
  dopler: {
    name: "",
    description: "",

    placed: async (card, row) => {
      try {
        card.animate2("dopler");

        // ====================================
        // GET ENEMY FACTION
        // ====================================

        let enemyFaction = null;
        let seed_real_id = "aaa";
        if (player_me.id !== card.holder.id) {
          enemyFaction = player_me.leader.faction;
        } else {
          enemyFaction = player_op.leader.faction;
        }

        console.log("[DOPLER] Enemy faction:", enemyFaction);

        // ====================================
        // FIND VALID TARGETS
        // ====================================

        let filteredCards = Object.values(card_dict).filter((c) => {
          let strength = Number(c.strength);

          // always exclude leaders
          if (c.row === "leader") return false;

          // syndicate = all factions allowed (ignore faction filter)
          if (enemyFaction === "syndicate") {
            console.log("[DOPLER WARN] IS SINDICATE");
            return (
              c.deck !== "neutral" &&
              Object.keys(syndicate_faction_clone).includes(c.deck) &&
              !isNaN(strength) &&
              strength >= 7 &&
              strength <= 15 &&
              c.row !== "agile" &&
              !c.token &&
              !c.generated
            );
          } else {
            // normal faction filtering
            console.log("[DOPLER WARN] IS NOT SINDICATE");
            return (
              c.deck === enemyFaction &&
              !isNaN(strength) &&
              strength >= 7 &&
              strength <= 15 &&
              c.row !== "agile" &&
              !c.token &&
              !c.generated
            );
          }
        });

        // ====================================
        // FALLBACK
        // ====================================

        if (!filteredCards.length) {
          console.warn(
            "[DOPLER] No valid faction cards found, using fallback.",
          );

          let fallback = Object.values(card_dict).find(
            (c) => c.filename === "leshen",
          );

          if (fallback) filteredCards = [fallback];
        }

        // ====================================
        // SEEDED SHUFFLE
        // ====================================

        var seed_is = `${mtg_conf.version}${turncount}${enemyFaction}`;

        let shuffled = shuffleSeeded(
          filteredCards,
          utf8ToBase64(seed_is),
          `dopler seeded from ${seed_is}`,
        ).array;

        // ====================================
        // PICK TARGET
        // ====================================

        let picked = shuffled[0];

        console.log("[DOPLER] Picked:", picked);
        console.log("[DOPLER] Picked:", picked.name);

        // ====================================
        // CREATE NEW CARD COPY
        // ====================================

        let fakeData = structuredClone(picked);

        // keep Dopler identity
        fakeData.name = "Dopler";

        // keep copied artwork
        fakeData.filename = picked.filename;

        // hero + avenger
        fakeData.ability = "hero dopavenger";

        // custom avenger target
        // fakeData.avenger = "dopler_negative";

        // mark generated
        fakeData.is_dopler_generated = true;

        let spawned = new Card(fakeData, card.holder.opponent());
        console.log("[DOPLER] spawned", fakeData, spawned);
        await sleep(1600);
        // ====================================
        // REMOVE ORIGINAL FOREVER
        // ====================================

        if (row) row.removeCard(card);

        // completely erase card
        card.removed = [];
        card.abilities = [];
        card.basePower = 0;
        card.power = 0;

        // ====================================
        // SPAWN COPY ON ENEMY FIELD
        // ====================================

        await board.addCardToRow(spawned, picked.row, card.holder.opponent());

        await spawned.animate("dopavenger");
      } catch (e) {
        console.log("[DOPLER ERROR]", e);
      }
    },

    weight: () => 40,
  },
  reinforce: {
    name: "",
    description: "",

    placed: async (card) => {
      var tasks = [];
      try {
        card.animate("muster2");
        console.log("[REINFORCE] running for:", card.name);

        const targets = findReinforceTargets(card.filename);

        if (!targets || targets.length === 0) {
          console.warn("[REINFORCE] No reinforce targets for:", card.name);
          return;
        }

        for (const targetData of targets) {
          let spawnCount = Number(targetData.reinforce?.spawn_count || 1);

          for (let i = 0; i < spawnCount; i++) {
            tasks.push(
              (async () => {
                let spawned = new Card(targetData, card.holder);

                console.log("[REINFORCE] spawning:", targetData.name);

                await board.addCardToRow(spawned, targetData.row, card.holder);
                await sleep(3);
                await spawned.animate("reinforce");
              })(),
            );
          }
          await Promise.all(tasks); // if cards x, card y ....
        }
        //await Promise.all(tasks); // if all cards at once
      } catch (e) {
        console.log("[REINFORCE ERROR]", e);
      }
    },

    weight: () => 35,
  },
  medic: {
    name: "",
    description: "",
    placed: async (card) => {
      if (card.holder.id === player_me.id) {
        med_draw = 1;
        await sleep(200);
      }

      let grave = board.getRow(card, "grave", card.holder);

      // Use medicsdraw if defined, otherwise default to 1
      var reviveCount = typeof medicsdraw === "number" ? medicsdraw : 1;
      if (
        player_me.leader?.abilities?.[0] === "mediclove" ||
        player_op.leader?.abilities?.[0] === "mediclove"
      ) {
        reviveCount++;
        // await ui.notification("medicextra", ui_display_times.faction_ability);
      }

      for (let revive = 0; revive < reviveCount; revive++) {
        let units = card.holder.grave
          .findCards((c) => c.isUnit())
          .filter((c) => c.row !== "NaR");

        if (units.length <= 0) break;

        let wrapper = { card: null };
        var res = null;
        if (game.randomRespawn) {
          units.sort((a, b) => {
            const powerDiff = b.basePower - a.basePower;
            if (powerDiff !== 0) return powerDiff;
            return a.filename.localeCompare(b.filename);
          });

          res = units[0];
        } else if (card.holder.controller instanceof ControllerOpponent) {
          console.log(
            "Opponent has played a medic, wait for him to choose which card to respawn",
          );
          await sleep(medic_ability_revive_wait_a_second);
          let reviveData = await waitForMedicRevive();
          console.log("reviveData 1", reviveData);
          reviveData = grave.cards.filter(
            (c) => c.filename === reviveData.card,
          )[0];
          console.log("reviveData 2", reviveData);
          if (!reviveData) break;

          res = reviveData;

          // if (!res) break;
        } else {
          await ui.queueCarousel(
            card.holder.grave,
            1,
            (c, i) => (wrapper.card = c.cards[i]),
            (c) => c.isUnit(),
            true,
          );
          res = wrapper.card;
        }

        if (!res) break;
        console.log("Medic revived:", res.filename);
        // Wait until something is assigned to this medic.
        // waitForMedicRevive() should shift() the first entry from medicrevivethat.
        // Send the revive choice to the opponent if this is our client.
        if (
          card.holder.id === player_me.id &&
          !(card.holder.controller instanceof ControllerOpponent)
        ) {
          extraJSON.push(
            //    JSON.stringify({
            {
              type: "medicDraw",
              card: res.filename,
            },
            //   }),
          );

          console.log(
            "extra json now",
            extraJSON,
            JSON.stringify({
              type: "medicDraw",
              card: res.filename,
            }),
          );
        }

        // On the remote client, wait for the owner to tell us which card was revived.
        if (card.holder.controller instanceof ControllerOpponent) {
          grave.removeCard(res);
          grave.addCard(res);

          await res.animate("medic");
          await res.autoplay(grave);
        } else {
          grave.removeCard(res);
          grave.addCard(res);

          await res.animate("medic");
          await res.autoplay(grave);
        }
      }

      return;
    },
  },
  medic_n: {
    name: "",
    description: "",
    placed: async (card) => {
      if (card.holder.id === player_me.id) {
        med_draw = 1;
        await sleep(200);
      }

      let grave = board.getRow(card, "grave", card.holder);

      // Use medicsdraw if defined, otherwise default to 1
      var reviveCount = typeof medicsdraw === "number" ? medicsdraw : 1;
      if (
        player_me.leader?.abilities?.[0] === "mediclove" ||
        player_op.leader?.abilities?.[0] === "mediclove"
      ) {
        reviveCount++;
        // await ui.notification("medicextra", ui_display_times.faction_ability);
      }

      for (let revive = 0; revive < reviveCount; revive++) {
        let units = card.holder.grave
          .findCards((c) => c.isUnit())
          .filter((c) => c.row !== "NaR");

        if (units.length <= 0) break;

        let wrapper = { card: null };
        var res = null;
        if (game.randomRespawn) {
          units.sort((a, b) => {
            const powerDiff = b.basePower - a.basePower;
            if (powerDiff !== 0) return powerDiff;
            return a.filename.localeCompare(b.filename);
          });

          res = units[0];
        } else if (card.holder.controller instanceof ControllerOpponent) {
          console.log(
            "Opponent has played a medic, wait for him to choose which card to respawn",
          );
          await sleep(medic_ability_revive_wait_a_second);
          let reviveData = await waitForMedicRevive();
          console.log("reviveData 1", reviveData);
          reviveData = grave.cards.filter(
            (c) => c.filename === reviveData.card,
          )[0];
          console.log("reviveData 2", reviveData);
          if (!reviveData) break;

          res = reviveData;

          // if (!res) break;
        } else {
          await ui.queueCarousel(
            card.holder.grave,
            1,
            (c, i) => (wrapper.card = c.cards[i]),
            (c) => c.isUnit(),
            true,
          );
          res = wrapper.card;
        }

        if (!res) break;
        console.log("Medic revived:", res.filename);
        // Wait until something is assigned to this medic.
        // waitForMedicRevive() should shift() the first entry from medicrevivethat.
        // Send the revive choice to the opponent if this is our client.
        if (
          card.holder.id === player_me.id &&
          !(card.holder.controller instanceof ControllerOpponent)
        ) {
          extraJSON.push(
            //    JSON.stringify({
            {
              type: "medicDraw",
              card: res.filename,
            },
            //   }),
          );

          console.log(
            "extra json now",
            extraJSON,
            JSON.stringify({
              type: "medicDraw",
              card: res.filename,
            }),
          );
        }

        // On the remote client, wait for the owner to tell us which card was revived.
        if (card.holder.controller instanceof ControllerOpponent) {
          grave.removeCard(res);
          grave.addCard(res);

          await res.animate("necromancy");
          await res.autoplay(grave);
        } else {
          grave.removeCard(res);
          grave.addCard(res);

          await res.animate("necromancy");
          await res.autoplay(grave);
        }
      }

      return;
    },
  },
  morale: {
    name: "",
    description: "",
    placed: async (card) => await card.animate("morale"),
  },
  powergain: {
    name: "",
    description: "", //powergain.desc,
    placed: async (card) => await card.animate("powergain"),
  },
  bond: {
    name: "",
    description: "",
    placed: async (card) => {
      let bonds = board
        .getRow(card, card.row, card.holder)
        .findCards((c) => c.name === card.name);
      if (bonds.length > 1)
        await Promise.all(bonds.map((c) => c.animate("bond")));
    },
  },
  avenger: {
    name: "",
    description: "",
    removed: async (card) => {
      try {
        console.log("Avenger script running");

        const targetData = findAvengerTarget(card.filename);

        if (!targetData) {
          console.warn("No avenger target found for:", card.name);
          return;
        }

        let bdf = new Card(targetData, card.holder);
        console.log("AVENGER bdf/target data", bdf, targetData);

        bdf.removed.push(() =>
          setTimeout(() => bdf.holder.grave.removeCard(bdf), 1001),
        );

        await board.addCardToRow(bdf, targetData.row, card.holder);
        await bdf.animate("avenger_spawn_creature");
      } catch (e) {
        console.log(e);
      }
    },
    weight: () => 50,
  },
  dopavenger: {
    name: "",
    description: "",
    removed: async (card) => {
      try {
        console.log("Avenger script running");

        const targetData = findAvengerTarget("card.filename");

        if (!targetData) {
          console.warn("No avenger target found for:", card.name);
          return;
        }

        let bdf = new Card(targetData, card.holder);
        console.log("AVENGER bdf/target data", bdf, targetData);

        bdf.removed.push(() =>
          setTimeout(() => bdf.holder.grave.removeCard(bdf), 1001),
        );

        await board.addCardToRow(bdf, targetData.row, card.holder);
        await bdf.animate("dopler_spawn_creature");
      } catch (e) {
        console.log(e);
      }
    },
    weight: () => 50,
  },
  //	avenger_kambi: {
  //		name: "",
  //		description: "",
  //		removed: async card => {
  //			try {
  //			console.log("kambi")
  //			let bdf = new Card(card_dict[197], card.holder);
  //		bdf.removed.push( () => setTimeout( () => bdf.holder.grave.removeCard(bdf), 1001) );
  //			await board.addCardToRow(bdf, "close", card.holder);
  //			} catch (e) {
  //				console.log(e);
  //			}
  //		},
  //	weight: () => 50
  //},
  avenger_kambi: {
    name: "",
    description: "",
    removed: async (card) => {
      try {
        console.log("kambi");

        const targetData = findAvengerTarget(card.filename);

        if (!targetData) {
          console.warn("No avenger target found for:", card.name);
          return;
        }

        let bdf = new Card(targetData, card.holder);

        bdf.removed.push(() =>
          setTimeout(() => bdf.holder.grave.removeCard(bdf), 1001),
        );

        await board.addCardToRow(bdf, "close", card.holder);
      } catch (e) {
        console.log(e);
      }
    },
    weight: () => 50,
  },
  foltest_king: {
    description: "",
    activated: async (card) => {
      let out = card.holder.deck.findCard(
        (c) => c.name_muster === "Impenetrable Fog",
      );
      if (out) await out.autoplay(card.holder.deck);
    },
    weight: (card, ai) => ai.weightWeatherFromDeck(card, "fog"),
  },
  keadwen_weather: {
    description: ``,

    activated: async (card) => {
      const holder = card.holder;

      const fog = holder.deck.findCard(
        (c) => c.name_muster === "Impenetrable Fog",
      );

      // always consume leader charge first or guarantee consumption
      const isPlayer = holder.id === player_me.id;
      ability_remove_force(isPlayer ? "me" : "op", 1);

      if (fog) {
        await fog.autoplay(holder.deck);
      }
    },

    weight: (card, ai) => ai.weightWeatherFromDeck(card, "fog"),
  },
  foltest_lord: {
    description: "",
    activated: async () => {
      tocar("clear", false);
      await weather.clearWeather();
    },
    weight: (card, ai) => ai.weightCard({ row: "weather", name: "" }),
  },
  foltest_siegemaster: {
    description: "",
    activated: async (card) =>
      await board.getRow(card, "siege", card.holder).leaderHorn(),
    weight: (card, ai) =>
      ai.weightHornRow(card, board.getRow(card, "siege", card.holder)),
  },
  foltest_steelforged: {
    description: "",
    activated: async (card) => await ability_dict["scorch_s"].placed(card),
    weight: (card, ai, max) => ai.weightScorchRow(card, max, "siege"),
  },
  foltest_son: {
    description: "",
    activated: async (card) => await ability_dict["scorch_r"].placed(card),
    weight: (card, ai, max) => ai.weightScorchRow(card, max, "ranged"),
  },
  emhyr_imperial: {
    description: "",
    activated: async (card) => {
      let out = card.holder.deck.findCard(
        (c) => c.name_muster === "Torrential Rain",
      );
      if (out) await out.autoplay(card.holder.deck);
    },
    weight: (card, ai) => ai.weightWeatherFromDeck(card, "rain"),
  },
  nilf_drawmaster: {
    description: "",
    activated: async (card) => {
      console.log("nilf_drawmaster");

      let player = card.holder;

      // Stop if hand already big enough
      if (player.hand.cards.length >= nilfard_drawmaster.handshort) return;

      let grave = player_me.grave;
      let deck = player_me.deck;

      console.log("grave and deck", grave, deck);

      let graveUnits = grave.findCards((c) => c.isUnit());

      // How many bonus draws we get from "dead"
      let bonusDraws = Math.min(graveUnits.length, nilfard_drawmaster.drawdead);

      // Total draws = base + bonus from grave
      let totalDraws = nilfard_drawmaster.drawalive + bonusDraws;

      console.log(
        "Drawing:",
        totalDraws,
        "(base:",
        nilfard_drawmaster.drawalive,
        "+ bonus:",
        bonusDraws,
        ")",
      );

      // Draw everything from deck
      for (let i = 0; i < totalDraws; i++) {
        if (deck.cards.length > 0) await deck.draw(player.hand);
      }
    },
  },
  temeria_call: {
    description: "",
    activated: async (card) => {
      var is_allowed = false;
      if (card.holder.tag === "me") {
        is_allowed = player_op.passed;
      } else {
        is_allowed = player_me.passed;
      }
      console.log("TEMERIAAAAAAA", is_allowed, card.holder.tag);
      if (is_allowed) {
        return false;
      }
      // Find Temeria in card_dict
      const targetData = Object.values(card_dict).find(
        (c) => c.id === "1032",
        // alternatively: c.filename === "temeriacall"
      );

      if (!targetData) {
        console.warn("Temeria card not found");
        return;
      }

      // Create a fresh copy for the leader's owner
      const spawned = new Card(targetData, card.holder);

      // Place it in the close combat row
      await board.addCardToRow(spawned, "close", card.holder);
      if (card.holder.tag === "me") {
        player_me.setPassed(true);
      } else {
        player_op.setPassed(true);
      }
    },
  },
  darkness_storm_leader: {
    description: "",
    activated: async (card) => {
      // Find the card data in card_dict
      const targetData = Object.values(card_dict).find(
        (c) => c.filename === "darkstorm",
      );

      if (!targetData) {
        console.warn("Darkness Storm card not found");
        return;
      }

      // Create cards from thin air
      const myStorm = new Card(targetData, player_me);
      const opStorm = new Card(targetData, player_op);

      // Spawn onto close rows
      await Promise.all([
        board.addCardToRow(myStorm, "close", player_me),
        board.addCardToRow(opStorm, "close", player_op),
      ]);
      await ui.notification("darkstorm", ui_display_times.faction_ability);
    },
  },
  turn_skiper: {
    description: "", //turn_skipper_conf.desc,
  },
  d20cloner: {
    description: "", //d20cloner.desc,
  },
  gaunter_neutral_leader: {
    description: ``,
    activated: async (card) => {
      const me = player_me;
      const op = player_op;

      const myDraws = Math.floor(
        me.grave.cards.length * gaunter_lider.revive + 1,
      );
      const opDraws = Math.floor(
        op.grave.cards.length * gaunter_lider.revive + 1,
      );
      await ui.notification("gaunter", ui_display_times.faction_ability);
      for (let i = 0; i < myDraws; i++)
        if (me.deck.cards.length) await me.deck.draw(me.hand);

      for (let i = 0; i < opDraws; i++)
        if (op.deck.cards.length) await op.deck.draw(op.hand);

      await Promise.resolve();
    },
  },
  emhyr_emperor: {
    description: "",
    activated: async (card) => {
      // Wait for the opponent to close the carousel
      if (card.holder.controller instanceof ControllerOpponent) {
        await new Promise((resolve) => {
          const handleMessage = async (event) => {
            const data = await recv_and_decomp(event);
            if (data.type === "containerClosed") {
              resolve(true);
            }
          };
          socket.addEventListener("message", handleMessage);
        });

        return;
      }
      let container = new CardContainer();
      container.cards = card.holder
        .opponent()
        .hand.findCardsRandom(() => true, 3);
      Carousel.curr.cancel();
      await ui.viewCardsInContainer(container);
    },
    weight: (card) => {
      let count = card.holder.opponent().hand.cards.length;
      return count === 0 ? 0 : Math.max(10, 10 * (8 - count));
    },
  },
  emhyr_whiteflame: {
    description: "",
  },
  emhyr_whiteflame2: {
    description: "",
    activated: async (card, deck) => {},
  },
  emhyr_relentless: {
    description: "",
    activated: async (card) => {
      let resp = null;
      let grave = board.getRow(card, "grave", card.holder.opponent());
      if (grave.findCards((c) => c.isUnit()).length === 0) return;

      if (card.holder.controller instanceof ControllerOpponent) {
        const newCard = await new Promise((resolve) => {
          showSideTooltip("Waiting for opponent to draw a card");
          const handleMessage = async (event) => {
            const data = await recv_and_decomp(event);

            if (data.type === "addCardHand") {
              // Edit by Rick: Previously this would try to choose the card based on replicated index.
              // But it looks like the array order isn't synchronized so now using filename instead.
              // OLD: const drawnCard = grave.cards.filter(c => c.isUnit())[data.index]
              const drawnCard = grave.cards.filter(
                (c) => c.filename === data.card,
              )[0];

              if (drawnCard) {
                drawnCard.holder = player_op;
                resolve(drawnCard);
              }
            }
          };
          socket.addEventListener("message", handleMessage);
        });
        newCard.holder = player_op;
        board.toHand(newCard, grave);
        return;
      }

      Carousel.curr.cancel();
      await ui.queueCarousel(
        grave,
        1,
        (c, i) => {
          let newCard = c.cards[i];
          const resp = c.cards[i];
          extraJSON.push(
            JSON.stringify({ type: "addCardHand", card: resp.filename }),
          );

          console.log(
            "extra json now",
            extraJSON,
            JSON.stringify({ type: "addCardHand", card: resp.filename }),
          );
          newCard.holder = card.holder;
          board.toHand(newCard, grave);

          // Edit by Rick: Adding a line here to actually return the card object, otherwise the gwent.js edit can't read filename.
          return newCard;
        },
        (c) => c.isUnit(),
        true,
      );
    },
    weight: (card, ai, max, data) =>
      ai.weightMedic(data, 0, card.holder.opponent()),
  },
  emhyr_invader: {
    // Edit by Rick: Modified to explain the altered effect that doesn't cause desyncs.
    // OLD: description: "",
    description: "",
    gameStart: () => (game.randomRespawn = true),
  },
  eredin_commander: {
    description: "",
    activated: async (card) =>
      await board.getRow(card, "close", card.holder).leaderHorn(),
    weight: (card, ai) =>
      ai.weightHornRow(card, board.getRow(card, "close", card.holder)),
  },
  eredin_bringer_of_death: {
    name: "",
    description: "",

    activated: async (card) => {
      if (!card.holder.grave.cards.length) {
        card.holder.tag === "me" ? player_me.endRound() : player_op.endRound();
        return;
      }

      let newCard;

      if (card.holder.controller instanceof ControllerOpponent) {
        // don't wait for containerClosed

        const sourceCard = card.holder.grave.cards.find((c) => c.isUnit());
        if (!sourceCard) return;

        // create a fresh copy
        const cardData = Object.values(card_dict).find(
          (cd) => cd.filename === sourceCard.filename,
        );

        if (!cardData) return;

        newCard = new Card(cardData, card.holder);

        // cosmetic hand counter if needed
        const op_counter = document.getElementById("hand-count-op");
        if (op_counter) op_counter.innerHTML = player_op.hand.cards.length + 1;

        card.holder.hand.addCard(newCard);

        return;
      }

      Carousel.curr.exit();

      await ui.queueCarousel(
        card.holder.grave,
        1,
        (c, i) => (newCard = c.cards[i]),
        (c) => c.isUnit(),
        false,
        false,
      );

      if (newCard) await board.toHand(newCard, card.holder.grave);
    },

    weight: (card, ai, max, data) => ai.weightMedic(data, 0, card.holder),
  },
  eredin_destroyer: {
    description: "",

    activated: async (card) => {
      let hand = board.getRow(card, "hand", card.holder);
      let deck = {
        ...player_me.deck,
        cards: [...player_me.deck.cards],
      };
      deck.cards.sort((a, b) => a.name.localeCompare(b.name));

      console.log("[EREDIN_DESTROYER] Ability activated.", hand, deck);

      // Don't simulate opponent
      if (player_me.id !== card.holder.id) {
        console.log(
          "[EREDIN_DESTROYER] Opponent played card, waiting for sync.",
        );
        return;
      }

      if (hand.cards.length < 2) {
        console.log("FAILED NOT ENOUGHT CARDS");
        return false;
      }

      if (Carousel.curr) Carousel.curr.exit();

      // =========================
      // BANISH CARD 1
      // =========================
      console.log("[EREDIN_DESTROYER] Choosing first card to banish.", hand);

      await ui.queueCarousel(
        hand,
        1,
        (c, i) => {
          let removed = c.cards[i];

          console.log(
            "[EREDIN_DESTROYER] Banishing card 1:",
            removed.name || removed.filename,
          );

          // Permanently remove card
          c.removeCard(removed);

          if (Carousel.curr) Carousel.curr.update();

          return removed;
        },
        () => true,
        false,
        false,
        "Choose card to banish (1/2)",
      );

      await new Promise((r) => setTimeout(r, 300));

      // =========================
      // BANISH CARD 2
      // =========================
      console.log("[EREDIN_DESTROYER] Choosing second card to banish.", hand);

      await ui.queueCarousel(
        hand,
        1,
        (c, i) => {
          let removed = c.cards[i];

          console.log(
            "[EREDIN_DESTROYER] Banishing card 2:",
            removed.name || removed.filename,
          );

          // Permanently remove card
          c.removeCard(removed);

          if (Carousel.curr) Carousel.curr.update();

          return removed;
        },
        () => true,
        false,
        false,
        "Choose card to banish (2/2)",
      );

      await new Promise((r) => setTimeout(r, 300));

      // =========================
      // CHOOSE CARD TO COPY
      // =========================
      console.log("[EREDIN_DESTROYER] Choosing card from deck to copy.", deck);

      let wrapper = { card: null };

      await ui.queueCarousel(
        deck,
        1,
        (c, i) => {
          wrapper.card = c.cards[i];

          console.log(
            "[EREDIN_DESTROYER] Selected deck card:",
            wrapper.card.name || wrapper.card.filename,
          );

          return c.cards[i];
        },
        () => true,
        true,
        false,
        "Choose a card to create a copy of",
      );

      if (!wrapper.card) {
        console.log("[EREDIN_DESTROYER] No card selected.");
        return;
      }

      // =========================
      // CREATE COPY
      // =========================
      let copiedData = Object.values(card_dict).find(
        (cd) => cd.filename === wrapper.card.filename,
      );

      if (!copiedData) {
        console.log(
          "[EREDIN_DESTROYER] Failed to find card data for:",
          wrapper.card.filename,
        );
        return;
      }

      let created = new Card(copiedData, card.holder);

      console.log(
        "[EREDIN_DESTROYER] Creating copy:",
        created.name || created.filename,
      );

      card.holder.hand.addCard(created);

      console.log("[EREDIN_DESTROYER] Ability finished.");
    },

    weight: (card, ai) => {
      let cards = ai
        .discardOrder(card)
        .splice(0, 2)
        .filter((c) => c.basePower < 7);

      if (cards.length < 2) return 0;

      return 30;
    },
  },
  eredin_king: {
    description: "",
    activated: async (card) => {
      let deck = board.getRow(card, "deck", card.holder);

      // Wait for the opponent to choose which weather card to play
      if (card.holder.controller instanceof ControllerOpponent) {
        const card = await new Promise((resolve) => {
          try {
            showSideTooltip("Waiting for opponent to pick weather card");
          } catch (e) {}
          const handleMessage = async (event) => {
            const data = await recv_and_decomp(event);
            if (data.type === "weatherDraw") {
              const drawnCard = deck.cards.filter(
                (c) => c.faction === "weather" && c.filename === data.card,
              )[0];
              if (drawnCard) {
                resolve(drawnCard);
              }
            }
          };
          socket.addEventListener("message", handleMessage);
        });
        board.toWeather(card, deck);
      } else {
        //        med_draw = "EredinKIng";
        await sleep(100);
        Carousel.curr.cancel();
        await ui.queueCarousel(
          deck,
          1,
          (c, i) => {
            const resp = c.cards[i]; // captures selected card (i hope, didnt dig into it)

            board.toWeather(resp, deck);

            extraJSON.push(
              JSON.stringify({ type: "weatherDraw", card: resp.filename }),
            );

            console.log(
              "extra json now",
              extraJSON,
              JSON.stringify({ type: "weatherDraw", card: resp.filename }),
            );
          },
          (c) => c.faction === "weather",
          true,
        );
      }
    },
    weight: (card, ai, max) => ability_dict["eredin_king"].helper(card).weight,
    helper: (card) => {
      let weather = card.holder.deck.cards
        .filter((c) => c.row === "weather")
        .reduce(
          (a, c) => (a.map((c) => c.name).includes(c.name) ? a : a.concat([c])),
          [],
        );

      let out,
        weight = -1;
      weather.forEach((c) => {
        let w = card.holder.controller.weightWeatherFromDeck(c, c.abilities[0]);
        if (w > weight) {
          weight = w;
          out = c;
        }
      });
      return { card: out, weight: weight };
    },
  },
  eredin_treacherous: {
    description: "",
    gameStart: () => (game.doubleSpyPower = true),
  },
  francesca_queen: {
    description: "",
    activated: async (card) => await ability_dict["scorch_c"].placed(card),
    weight: (card, ai, max) => ai.weightScorchRow(card, max, "close"),
  },
  francesca_beautiful: {
    description: "",
    activated: async (card) =>
      await board.getRow(card, "ranged", card.holder).leaderHorn(),
    weight: (card, ai) =>
      ai.weightHornRow(card, board.getRow(card, "ranged", card.holder)),
  },
  francesca_daisy: {
    description: "",
    placed: (card) =>
      game.gameStart.push(() => {
        let draw = card.holder.deck.removeCard(0);
        card.holder.hand.addCard(draw);
        return true;
      }),
  },
  francesca_pureblood: {
    description: "",
    activated: async (card) => {
      let out = card.holder.deck.findCard(
        (c) => c.name_muster === "Biting Frost",
      );
      if (out) await out.autoplay(card.holder.deck);
    },
    weight: (card, ai) => ai.weightWeatherFromDeck(card, "frost"),
  },
  francesca_hope: {
    description: "",
    activated: async (card) => {
      let close = board.getRow(card, "close");
      let ranged = board.getRow(card, "ranged");
      let cards = ability_dict["francesca_hope"].helper(card);
      await Promise.all(
        cards.map(
          async (p) =>
            await board.moveTo(p.card, p.row === close ? ranged : close, p.row),
        ),
      );
    },
    weight: (card) => {
      let cards = ability_dict["francesca_hope"].helper(card);
      return cards.reduce((a, c) => a + c.weight, 0);
    },
    helper: (card) => {
      let close = board.getRow(card, "close");
      let ranged = board.getRow(card, "ranged");
      return validCards(close).concat(validCards(ranged));
      function validCards(cont) {
        return cont
          .findCards((c) => c.row === "agile")
          .filter((c) => dif(c, cont) > 0)
          .map((c) => ({ card: c, row: cont, weight: dif(c, cont) }));
      }
      function dif(card, source) {
        return (
          (source === close ? ranged : close).calcCardScore(card) - card.power
        );
      }
    },
  },
  mediclove: {
    description: "",
  },
  crach_an_craite: {
    description: "",
    activated: async (card) => {
      // Edit by Rick: Everything below is new.
      // Previous version let both clients individually add the cards back to the deck at random positions. Problematic as then the next deck draw (e.g. Spy cards) will draw a different card per client.
      // This would be subject to desyncs to matter the below board.toDeck() implementation as decks are specifically implemented via overrides in gwent.js to always add new cards at a random index.
      // Secondly, graveyard order is inconsistent between clients so even if these cards are returned to the bottom of the deck you run the risk of *eventually* drawing these inconsistently ordered cards.
      // First I tried fixing this with sockets (both clients run the visual logic but afterwards the OP dictates both players' new decks similar to the start of the round after card redraw is implemented).
      // Had some input await issues there so plan B (current) is to just sort the graveyards and then append them to the end of each player's deck.
      // OLD: Promise.all(card.holder.grave.cards.map(c => board.toDeck(c, card.holder.grave)));
      // OLD: await Promise.all(card.holder.opponent().grave.cards.map(c => board.toDeck(c, card.holder.opponent().grave)));

      // Deterministic: sort grave cards by filename so both clients iterate same order.
      const meGraveSorted = [...card.holder.grave.cards].sort((a, b) =>
        (a.filename || "").localeCompare(b.filename || ""),
      );
      const opGraveSorted = [...card.holder.opponent().grave.cards].sort(
        (a, b) => (a.filename || "").localeCompare(b.filename || ""),
      );

      // Helper to move a card visually then deterministically append to bottom of the deck.
      const moveToDeckBottom = async (c, holder) => {
        const source = holder.grave;
        const deck = holder.deck;

        // Run the existing translateTo visual step (same as moveTo does).
        // moveTo used 'await translateTo(...)' in gwent.js — translateTo is synchronous-ish but awaiting is harmless.
        await translateTo(c, source, deck);

        // Remove the card from the source container (updates arrays + DOM).
        // This mirrors what moveTo did (source.removeCard(card)).
        source.removeCard(c);

        // Keep card metadata consistent.
        c.holder = holder;

        // Append to the bottom of the deck array deterministically.
        deck.cards.push(c);

        // Ensure visual representation matches the deck array (use existing deck helpers).
        deck.addCardElement();
        deck.resize();
      };
      // Move all my grave cards to bottom (deterministic order).
      for (const c of meGraveSorted) {
        await moveToDeckBottom(c, card.holder);
      }

      // Move all opponent grave cards to bottom (deterministic order).
      console.log("opGraveSorted", opGraveSorted);
      for (const c of opGraveSorted) {
        await moveToDeckBottom(c, card.holder.opponent());
      }

      // Tried shuffle but clients desynced
      //var start = player_me.deck.cards
      ///player_me.deck.cards = shuffleSeeded(player_me.deck.cards, `${Math.random().toString(36).substring(2, 36)}${player_me.ThatPlayerId}_-_-_${JSON.stringify(serializeCards(player_me.deck.cards))}`).array
      //console.log("DECK SHUFFLED?", "me", start !== player_me.deck.cards, "Was", serializeCards(start), "is", serializeCards(player_me.deck.cards))
      // Looks like this dont work:
      // var start2 = player_op.deck.cards
      // player_op.deck.cards = shuffleSeeded(player_op.deck.cards, `${JSON.stringify(serializeCards(player_op.deck.cards))}`).array
      // console.log("DECK SHUFFLED?", "op", start2 !== player_op.deck.cards, "Was", serializeCards(start2), "is", serializeCards(player_op.deck.cards))

      // Small async yield so any pending UI/handlers can process; not a hack, just a safe tick.
      await Promise.resolve();
    },
    weight: (card, ai, max, data) => {
      if (game.roundCount < 2) return 0;
      let medics = card.holder.hand.findCard((c) =>
        c.abilities.includes("medic"),
      );
      if (medics !== undefined) return 0;
      let spies = card.holder.hand.findCard((c) => c.abilities.includes("spy"));
      if (spies !== undefined) return 0;
      if (
        card.holder.hand.findCard((c) => c.abilities.includes("decoy")) !==
          undefined &&
        (data.medic.length ||
          (data.spy.length &&
            card.holder.deck.findCard((c) => c.abilities.includes("medic")) !==
              undefined))
      )
        return 0;
      return 15;
    },
  },
  king_bran: {
    description: "",
  },
  eist_tuirseach: {
    description: "",
    activated: async (card) => {
      let out = card.holder.deck.findCard(
        (c) => c.name_muster === "Skellige Storm",
      );
      if (out) await out.autoplay(card.holder.deck);
    },
    weight: (card, ai) => ai.weightWeatherFromDeck(card, "rain"),
  },
  skellige_berserk_reward: {
    description: "",
    activated: async (card) => {
      let rows = [
        board.getRow(card, "close", card.holder),
        board.getRow(card, "ranged", card.holder),
        board.getRow(card, "siege", card.holder),
      ];

      let bestRow = null;
      let bestCount = 0;

      for (let row of rows) {
        let count = row.findCards((c) =>
          c.abilities?.includes("berserker"),
        ).length;

        if (count > bestCount) {
          bestCount = count;
          bestRow = row;
        }
      }

      if (!bestRow || bestCount === 0) return;
      // placeholder card
      let targetData = Object.values(card_dict).find(
        (c) => c.filename === "svalblod_change",
      );

      if (!targetData) return;
      if (board.getRow(card, "ranged", card.holder) === bestRow) {
        targetData.row = "ranged";
      } else if (board.getRow(card, "siege", card.holder) === bestRow) {
        targetData.row = "siege";
      } else {
        targetData.row = "close";
      }
      // console.log("BEST ROW", bestRow, targetData, targetData.row);
      let spawned = new Card(targetData, card.holder);

      bestRow.addCard(spawned);
      spawned.animate("reinforce");
    },
  },
  skellige_bond_summoner: {
    description: ``,

    activated: async (card) => {
      console.log("[SKELLIGE_BOND_SUMMONER]", player_me.id, card.holder.id);

      if (player_me.id !== card.holder.id) return;

      let hand = card.holder.hand;

      let discardable = hand.findCards(
        (c) => c.basePower > skellige_bond_conf.power,
      );

      if (!discardable.length) {
        //    showTooltip("You lack valid cards to banish");
        return;
      }

      if (Carousel.curr) Carousel.curr.exit();

      // =========================
      // CHOOSE CARD TO BANISH
      // =========================

      let banished = null;

      await ui.queueCarousel(
        hand,
        1,
        (c, i) => {
          banished = c.cards[i];

          console.log(
            "[SKELLIGE_BOND_SUMMONER] Banishing:",
            banished.name || banished.filename,
          );

          // One-way ticket to hell
          c.removeCard(banished);

          if (Carousel.curr) Carousel.curr.update();

          return banished;
        },
        (candidate) => candidate.basePower >= skellige_bond_conf.power,
        false,
        false,
        "Choose card to banish",
      );

      if (!banished) return;

      await new Promise((r) => setTimeout(r, 300));

      // =========================
      // FIND BOND TARGETS
      // =========================

      let faction = card.holder.leader.faction;

      let bondCards = Object.values(card_dict).filter((cd) => {
        let abilities =
          typeof cd.ability === "string" ? cd.ability.split(" ") : [];

        return (
          abilities.includes("bond") &&
          (cd.deck === faction || cd.deck === "neutral") &&
          !cd.token &&
          !cd.generated
        );
      });

      if (!bondCards.length) {
        console.log(
          "[SKELLIGE_BOND_SUMMONER] No valid Tight Bond cards found.",
        );
        return;
      }

      // =========================
      // CHOOSE CARD TO CREATE
      // =========================

      let wrapper = { card: null };

      let preview = bondCards.map((data) => new Card(data, card.holder));

      await ui.queueCarousel(
        { cards: preview },
        1,
        (c, i) => {
          wrapper.card = c.cards[i];

          console.log(
            "[SKELLIGE_BOND_SUMMONER] Selected:",
            wrapper.card.name || wrapper.card.filename,
          );

          return wrapper.card;
        },
        () => true,
        true,
        false,
        "Choose Tight Bond card",
      );

      if (!wrapper.card) return;

      // =========================
      // CREATE COPY
      // =========================

      let cardData = Object.values(card_dict).find(
        (cd) => cd.filename === wrapper.card.filename,
      );

      if (!cardData) {
        console.log(
          "[SKELLIGE_BOND_SUMMONER] Failed to find card data for:",
          wrapper.card.filename,
        );
        return;
      }

      let created = new Card(cardData, card.holder);

      console.log(
        "[SKELLIGE_BOND_SUMMONER] Creating:",
        created.name || created.filename,
      );

      card.holder.hand.addCard(created);

      await created.animate("reinforce");

      console.log("[SKELLIGE_BOND_SUMMONER] Ability finished.");
    },

    weight: (card, ai) => {
      let valid = ai.hand.cards.filter(
        (c) => c.basePower > skellige_bond_conf.power,
      );

      if (!valid.length) return 0;

      return 30;
    },
  },
  time_round_reverse: {
    description: ``,
    activated: async (card) => {
      const _game = game;
      console.log(
        "TIME CHANGER",
        _game,
        game.roundHistory.length,
        game.roundHistory.length === 0,
      );

      if (game.roundHistory.length === 0) {
        showSideTooltip("Gaunter failed to revert time!");
        return false;
      }
      await ui.notification("gaunter2", ui_display_times.faction_ability);
      // Remove previous round from history
      _game.roundHistory.pop();
      game.roundHistoryResults[game.roundHistoryResults.length - 1] = {
        ...game.roundHistoryResults[game.roundHistoryResults.length - 1],
        wasWiped: true,
        wipedreason: "gaunter_revert",
      };
      _game.roundCount--;

      // Refund one gem to each player
      //    player_me.health = Math.min(player_me.health + 1, maxhealth);
      //    player_op.health = Math.min(player_op.health + 1, maxhealth);

      //    player_me.updateHealth?.();
      //   player_op.updateHealth?.();
      if (player_me.health < 2) {
        var docid = document.getElementById(`gem${player_me.health}-` + "me");
        //  .classList.add("gem-on");
        animatePopFromObject(docid, "#C14842", "#953530", true);
        player_me.health += 1;
        //   warn_screen("+1 life me");
      }
      if (player_op.health < 2) {
        var docid2 = document.getElementById(`gem${player_op.health}-` + "op");
        //  .classList.add("gem-on");
        animatePopFromObject(docid2, "#C14842", "#953530", true);
        player_op.health += 1;
        // warn_screen("+1 life op");
      }
      const meGrave = [...player_me.grave.cards];
      const opGrave = [...player_op.grave.cards];

      // Pick resurrection targets BEFORE moving cards.
      const meRes = meGrave.filter(
        () => Math.random() < gaunter_lider_bringer_from_death.revive,
      );
      const opRes = opGrave.filter(
        () => Math.random() < gaunter_lider_bringer_from_death.revive,
      );
      console.log("TIME CHANGER: REVIVER", meRes);
      // Return all cards to the bottom.
      const moveToDeckBottom = async (card, holder) => {
        const { grave: source, deck } = holder;

        await translateTo(card, source, deck);

        source.removeCard(card);
        card.holder = holder;

        deck.cards.push(card);
        deck.addCardElement();
      };

      await Promise.all([
        ...meGrave.map((card) => moveToDeckBottom(card, player_me)),
        ...opGrave.map((card) => moveToDeckBottom(card, player_op)),
      ]);

      // Resize once per deck instead of once per card.
      player_me.deck.resize();
      player_op.deck.resize();

      // Shuffle afterwards.
      //player_me.deck.shuffle();
      //player_op.deck.shuffle();
      player_me.deck.cards = shuffleSeeded(
        player_me.deck.cards,
        utf8ToBase64(random_string_gen()),
        `Shuffle deck`,
      ).array;

      // Give the copied cards.
      for (const cz of meRes) {
        var cardData_c = Object.values(card_dict).find(
          (c) => c.filename === cz.filename,
        );
        var cc = new Card(cardData_c, player_me);
        player_me.hand.addCard(cc);
        cc.animate("reinforce");
      }

      // Reserve the opponent's hand slot until the payload arrives.
      for (const c of opRes) {
        player_op.hand.cards.push({});
        // Later:
        // payload.cards.push(c);
      }

      if (card.holder.id === player_me.id) {
        resync_now_apply = true;
      }
      await init_sync_hands();
      if (!resync_now_apply) {
        //  showSideTooltip("sync");
        await sleep(3000);
        await resycn_recive(resync_contnet);
      }
      console.log("Rever time done");
      return true;
    },
  },
  thedevil: {
    name: ``,
    description: ``,
    placed: async (card, row) => {
      let wrapper = { card: null };

      let preview = [...card.holder.deck.cards]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      if (preview.length === 0) return;

      // Show selection
      await ui.queueCarousel(
        { cards: preview },
        1,
        (c, i) => (wrapper.card = c.cards[i]),
        () => true,
        true,
        false,
        "Choose a card to draw",
      );

      let picked = wrapper.card;
      if (!picked) return;

      // Save filename globally if needed
      // lastChosenDeckCard = picked.filename;
      pickedfakecard = { a: true, b: picked.filename };

      // Find the real card in the deck
      let realCard = card.holder.deck.cards.find(
        (c) => c.filename === picked.filename,
      );

      if (!realCard) return;

      // Draw it
      card.holder.deck.removeCard(realCard);
      card.holder.hand.addCard(realCard);
      realCard.animate("reinforce");
      row.removeCard(card);
    },
  },
};
loadingscreenupdate(`Adding resolveScorch to ability_dict`);
const ability_dict_resolveScorch = async (rows, require10 = true) => {
  let targets = [];

  if (!require10) {
    // Classic scorch: strongest unit(s) on entire board

    const maxUnits = rows
      .map((r) => [r, r.maxUnits()])
      .filter(([, units]) => units.length > 0);

    if (maxUnits.length === 0) return;

    const maxPower = Math.max(...maxUnits.map(([, units]) => units[0].power));

    targets = maxUnits
      .filter(([, units]) => units[0].power === maxPower)
      .flatMap(([row, units]) => units.map((unit) => [row, unit]));
  } else {
    // Row scorch: strongest unit(s) in rows with total >= 10

    targets = rows
      .map((row) => [row, row.maxUnits()])
      .filter(([row, units]) => units.length > 0 && row.total >= 10)
      .flatMap(([row, units]) => units.map((unit) => [row, unit]));
  }

  if (targets.length === 0) return;

  // Deterministic ordering
  targets.sort((a, b) => {
    const [rowA, cardA] = a;
    const [rowB, cardB] = b;

    // 1. Player
    const player = (cardA.holder?.ThatPlayerId || "").localeCompare(
      cardB.holder?.ThatPlayerId || "",
    );
    if (player) return player;

    // 2. Card name
    if (cardA.name !== cardB.name) return cardA.name < cardB.name ? -1 : 1;

    // 3. Row
    if (rowA.type !== rowB.type) return rowA.type < rowB.type ? -1 : 1;

    // 4. Power
    if (cardA.power !== cardB.power) return cardA.power - cardB.power;

    // 5. Base power
    if (cardA.basePower !== cardB.basePower)
      return cardA.basePower - cardB.basePower;

    // 6. Hero
    if (cardA.hero !== cardB.hero)
      return Number(cardA.hero) - Number(cardB.hero);

    // 7. Ability string
    const abilA = cardA.abilities.join(",");
    const abilB = cardB.abilities.join(",");
    if (abilA !== abilB) return abilA < abilB ? -1 : 1;

    return 0;
  });

  console.log("scorch targets", targets);

  const saved = [];
  const scorched = [];

  for (const [row, unit] of targets) {
    const leader = unit.holder?.leader;
    const tag = leader?.holder?.tag;

    const hasShield =
      leader?.abilities?.includes("scorch_stopper") ||
      leader?.abilities?.includes("scorchstopper");

    const hasCharge =
      tag != null && ability_data[tag]?.current >= scorch_stopper.save_charge;

    if (hasShield && hasCharge) {
      ability_remove(tag, scorch_stopper.save_charge);

      saved.push([row, unit]);
    } else {
      scorched.push([row, unit]);
    }
  }

  await Promise.all([
    ...saved.map(async ([, unit]) => {
      //  console.log("Saved:", unit);
      await unit.animate2("scorch_fail");
    }),

    ...scorched.map(async ([, unit]) => {
      await unit.animate("scorch", true, false);
    }),
  ]);

  await Promise.all(scorched.map(([row, unit]) => board.toGrave(unit, row)));
};

async function playFakeCard(filename) {
  console.log("========== playFakeCard ==========");

  // Find card
  var cardData = card_dict.find((c) => c.filename === filename);
  if (!cardData) {
    console.error("[FAKE] Card not found:", filename);
    return;
  }
  var place_me = deepClone(cardData);
  place_me.strength = 0;
  place_me.ability = ""; //hero";
  place_me.row = "close";
  //place_me.deck = "neutral"
  place_me.isDecoy = false;
  place_me.isDecoyMath = false;
  place_me.isSide = false;
  place_me.hero = false;

  // Create fake card
  const fakeCard = new Card(cardData, player_op);
  const fakeCard2 = new Card(place_me, player_op);

  console.log("[FAKE] Card created:", fakeCard, fakeCard2);

  //
  player_op.hand.addCard(fakeCard2);

  console.log("[FAKE] Added to temporary hand.");

  // Preview
  try {
    console.log("[FAKE] Preview...");
    ui.showPreviewVisuals(fakeCard);

    await wait(ui_display_times.show_me_that_card_you_have || 1000);

    ui.hidePreview(fakeCard);
  } catch (e) {
    console.warn("[FAKE] Preview failed:", e);
  }

  // Target row
  const row = board.row[2];

  if (!row) {
    console.error("[FAKE] Target row not found.");
    return;
  }

  //handElem.appendChild(fakeCard2.elem);

  // Force browser layout
  //fakeCard2.elem.getBoundingClientRect();
  //await wait(0);
  console.log("[FAKE] Moving to board...");
  await board.moveTo(fakeCard2, row, player_op.hand);

  console.log("[FAKE] Card on board.");

  // Wait before devil appears
  await wait(1000);

  console.log("[FAKE] Playing Devil animation...");

  try {
    fakeCard2.devilAnimate();
  } catch (e) {
    console.warn("[FAKE] devil animate failed:", e);
  }

  // Wait for animation
  await wait(1000);

  console.log("[FAKE] Removing fake card...");

  try {
    row.removeCard(fakeCard2);
  } catch (e) {
    console.error("[FAKE] row.removeCard failed:", e);

    try {
      board.removeCard(fakeCard2);
    } catch (e2) {
      console.error("[FAKE] board.removeCard failed:", e2);
    }
  }
  try {
    let realCard = player_op.deck.cards.find((c) => c.filename === filename);

    //if (!realCard) return;

    // Draw it
    player_op.deck.removeCard(realCard);
    player_op.hand.addCard(realCard);
  } catch (e) {
    console.error("[FAKE] hando deck", e);
  }
  console.log("[FAKE] Done.");
  console.log("========== END playFakeCard ==========");
  //fakeHand.elem.remove();
}

const ability_dict_base = deepClone(ability_dict);
loadingscreenupdate(`Translating ability_dict`);
ability_dict = translateabilitydict();
loadingscreenupdate(
  `ability_dict lenght is ${Object.keys(ability_dict).length}!`,
);
