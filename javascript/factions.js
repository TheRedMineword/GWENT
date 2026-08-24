"use strict";

var factions = {
  realms: {
    name: "Northern Realms",
    factionAbility: (player) =>
      game.roundStart.push(async () => {
        if (
          game.roundCount > 1 &&
          game.roundHistory[game.roundCount - 2].winner === player
        ) {
          player.deck.draw(player.hand);
          await ui.notification("north", ui_display_times.faction_ability);
          await init_sync_hands();
        }
        return false;
      }),
    description: "Draw a card from your deck whenever you win a round.",
  },
  nilfgaard: {
    name: "Nilfgaardian Empire",
    description: "Wins any round that ends in a draw.",
  },
  monsters: {
    name: "Monsters",
    factionAbility: (player) =>
      game.roundEnd.push(() => {
        let units = board.row
          .filter((r, i) => (player === player_me) ^ (i < 3))
          .flatMap((r) =>
            r.cards.map((card, index) => ({
              card,
              row: r.id, // close/ranged/siege
              index, // position in row
            })),
          )
          .filter(({ card }) => card.isUnit());

        units.sort((a, b) => {
          const powerDiff = b.card.basePower - a.card.basePower;
          if (powerDiff) return powerDiff;

          const fileDiff = a.card.filename.localeCompare(b.card.filename);
          if (fileDiff) return fileDiff;

          const rowDiff = a.row.localeCompare(b.row);
          if (rowDiff) return rowDiff;

          return a.index - b.index;
        });

        if (units.length < 1) {
          return "fail not enougth cards";
        }

        let card = units[0].card;
        card.animate("stay");

        card.noRemove = true;

        game.roundStart.push(async () => {
          await ui.notification("monsters", ui_display_times.faction_ability);
          delete card.noRemove;
          return true;
        });
        return false;
      }),
    // OLD: description: "Keeps a random Unit Card out after each round."
    description: "Keeps the strongest Unit Card out after each round.",
  },
  scoiatael: {
    name: "Scoia'tael",
    factionAbility: (player) =>
      game.gameStart.push(async () => {
        if (player === player_me) {
          await ui.popup(
            getTranslation("scolpick.me"),
            () => (game.firstPlayer = player),
            getTranslation("scolpick.op"),
            () => (game.firstPlayer = player.opponent()),
            getTranslation("scolpick.huh"),
            getTranslation("scolpick.huh2"),
          );
          comp_and_send(
            socket,
            JSON.stringify({
              type: "scoiataelStart",
              first: game.firstPlayer.tag,
            }),
          );
          await scol_fake_coin();
        }
        return true;
      }),
    description: "Decides who takes first turn.",
  },
  skellige: {
    name: "Skellige",
    factionAbility: (player) =>
      game.roundStart.push(async () => {
        if (game.roundCount != 3) return false;

        await ui.notification(
          "skellige-" + player.tag,
          ui_display_times.faction_ability,
        );

        const units = player.grave.cards.filter((c) => c.isUnit());

        units.sort((a, b) => {
          const powerDiff = b.basePower - a.basePower;
          if (powerDiff !== 0) return powerDiff;
          return a.filename.localeCompare(b.filename);
        });

        const keptAbilities = new Set([
          "hero",
          "spy",
          "sabotage",
          "morale",
          "horn",
          "reinforce",
          "wshield",
          "bond",
          "resilience",
          "resilience_igni",
          "agile",

          // AXII FAMILY (kept alive)
          "axii",
          "axii2_desc",
          "axii2_desc_playable",
          "powergain",
          "aid",
        ]);

        const chosen = units.slice(0, 2);

        for (const c of chosen) {
          const before = [...c.abilities];

          // detect if unit had any "unsafe / non-kept" abilities
          const hadUnwantedAbilities = before.some(
            (a) => !keptAbilities.has(a),
          );

          // 1. strip ability strings
          c.abilities = c.abilities.filter((a) => keptAbilities.has(a));

          // 2. normalize lifecycle hooks safely
          if (!Array.isArray(c.placed)) c.placed = [];
          if (!Array.isArray(c.activated)) c.activated = [];
          if (!Array.isArray(c.removed)) c.removed = [];

          // 3. only hard-reset lifecycle hooks if sanitization actually happened
          if (hadUnwantedAbilities) {
            c.placed = [];
            c.activated = [];
            c.removed = [];
          }

          console.log(
            "[SKELLIGE CLEAN]",
            c.name,
            "abilities:",
            before,
            "→",
            c.abilities,
          );
        }

        await Promise.all(chosen.map((c) => board.toRow(c, player.grave)));

        return true;
      }),

    description:
      "The strongest 2 cards from the graveyard are placed on the battlefield at the start of the third round. Revived cards lose most abilities.",
  },
  syndicate: {
    name: "Syndicate",
    description: `Starts the game with the morale card on the board. \nCan create deck from Nilfgaardian Empire, Scoia'tael, Skellige, Syndicate, Sky Kingdom factions non-leader cards.`,
  },
  sky: {
    name: "Sky Kingdom",
    factionAbility: (player) =>
      game.roundEnd.push(() => {
        let units = board.row
          .filter((r, i) => (player === player_me) ^ (i < 3))
          .flatMap((r) =>
            r.cards.map((card, index) => ({
              card,
              row: r.id, // close/ranged/siege
              index, // position in row
            })),
          )
          .filter(({ card }) => card.isUnit());

        units.sort((a, b) => {
          const powerDiff = b.card.basePower - a.card.basePower;
          if (powerDiff) return powerDiff;

          const fileDiff = a.card.filename.localeCompare(b.card.filename);
          if (fileDiff) return fileDiff;

          const rowDiff = a.row.localeCompare(b.row);
          if (rowDiff) return rowDiff;

          return a.index - b.index;
        });

        if (units.length < 1) {
          return "fail not enougth cards";
        }
        let card = units[0].card;
        card.animate("stay_sky");

        card.noRemove = true;

        game.roundStart.push(async () => {
          await ui.notification("sky", ui_display_times.faction_ability);
          delete card.noRemove;
          return true;
        });
        return false;
      }),
    // OLD: description: "Keeps a random Unit Card out after each round."
    description:
      "Keeps the strongest Unit Card out after each round. Factions full of morale boosting cards.",
  },
};

const factions_base = deepClone(factions);
loadingscreenupdate(`Translating factions!`);
factions = translatefactionsdict();
loadingscreenupdate(`Loaded ${Object.keys(factions).length} factions!`);
