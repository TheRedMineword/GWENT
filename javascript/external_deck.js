//"use strict";

class deck_importo_exporto1 {
  constructor() {
    console.log("Nothing to do here");
  }

  async legacy_deckFromJSON(json) {
    try {
      let deck;
      try {
        deck = JSON.parse(json);
      } catch (e) {
        warn_screen("Uploaded deck is not parsable!");
        return;
      }
      let warning = "";
      if (card_dict[deck.leader].row !== "leader")
        warning +=
          "'" +
          card_dict[deck.leader].name +
          "' is cannot be used as a leader\n";
      if (deck.faction != card_dict[deck.leader].deck)
        warning +=
          "Leader '" +
          card_dict[deck.leader].name +
          "' doesn't match deck faction '" +
          deck.faction +
          "'.\n";

      let cards = deck.cards
        .filter((c) => {
          let card = card_dict[c[0]];
          if (!card) {
            warning += "ID " + c[0] + " does not correspond to a card.\n";
            return false;
          }
          if (
            ![deck.faction, "neutral", "special", "weather"].includes(card.deck)
          ) {
            if (deck.faction !== "syndicate") {
              warning +=
                "'" +
                card.name +
                "' cannot be used in a deck of faction type '" +
                deck.faction +
                "'\n";
              return false;
            } else {
              //  return true;
            }
          }
          if (card.count < c[1]) {
            warning +=
              "Deck contains " +
              c[1] +
              "/" +
              card.count +
              " available " +
              card_dict[c[0]].name +
              " cards\n";
            return false;
          }
          return true;
        })
        .map((c) => ({
          index: c[0],
          count: Math.min(c[1], card_dict[c[0]].count),
        }));

      if (
        warning &&
        !(await warn_screen(
          `${warning}\n\n\Continue importing deck?`,
          "confirm",
        ))
      )
        return;
      dm.setFaction(deck.faction, true);
      comp_and_send(
        socket,
        JSON.stringify({
          type: "opChangeFaction",
          faction: deck.faction,
          info: { me_id: playerId, me_flag: country },
        }),
      );
      if (players.me !== "You") {
        comp_and_send(
          socket,
          JSON.stringify({
            type: "MyName",
            is: players.me,
          }),
        );
      }
      sendChatMessageStrig(`play wich ${factions[deck.faction].name} faction!`);
      if (
        card_dict[deck.leader].row === "leader" &&
        deck.faction === card_dict[deck.leader].deck
      ) {
        dm.leader = dm.leaders.find((c) => c.index === deck.leader);
        var tmp = dm.leader.card.deck + "_" + dm.leader.card.filename;

        if (dm.leader.card.filename === "Gaunter_Leader") {
          tmp = "neutral_Gaunter_Leader";
        }

        dm.leader_elem.children[1].style.backgroundImage = largeURL(tmp);
      }
      dm.makeBank(deck.faction, cards);
      dm.update();
    } catch (e) {
      warn_screen(`Failed to parse deck!\n${e.message}`);
    }
  }

  deckToJSON() {
    //console.log("cards leader", card_dict, dm.leader.card.index, dm.leader);

    const obj = {
      version: 2,
      faction: dm.faction,
      leader: dm.leader.card.id,
      cards: dm.deck
        .filter((x) => x.count > 0)
        .map((x) => {
          const card = card_dict[x.index];

          return [
            card.filename,
            x.count,
            {
              _name: card.name,
              _id: card.id,
              _deck: card.deck,
              _row: card.row,
              _strength: card.strength,
              _ability: card.ability,
              _filename: card.filename,
            },
          ];
        }),
    };

    return JSON.stringify(obj);
  }
  deckToLegacy(v2) {
    v2 = JSON.parse(v2);
    var legacy = {
      faction: v2.faction,
      leader: null,
      cards: [],
    };

    // Convert leader filename -> index
    let leader = card_dict.find((l) => l.id === v2.leader);
    leader = card_dict.findIndex((c) => c === leader);
    console.log("is leaader", leader);
    //  if (leader) {
    legacy.leader = leader;
    // }
    console.log("legacy", legacy);
    // Convert cards filename -> card_dict index
    legacy.cards = v2.cards
      .map((entry) => {
        const filename = entry[0];
        const count = entry[1];

        const index = card_dict.findIndex((c) => c.filename === filename);

        if (index === -1) {
          console.warn("Skipping invalid card:", filename);
          return null;
        }

        return [index, count];
      })
      .filter(Boolean);

    return JSON.stringify(legacy);
  }

  downloadDeck() {
    const json = this.deckToJSON();

    const str = "data:text/json;charset=utf-8," + encodeURIComponent(json);

    const hidden_elem = document.getElementById("download-json");

    hidden_elem.href = str;
    hidden_elem.download = "GwentDeck.json";
    hidden_elem.click();
  }

  uploadDeck() {
    const files = document.getElementById("add-file").files;

    if (files.length <= 0) return false;

    const fr = new FileReader();

    console.log("[DECK.U]", files, fr);

    fr.onload = (e) => {
      try {
        var version = 0;
        try {
          version = JSON.parse(e.target.result).version || 0;
        } catch (e) {
          console.warn("DECK.U warning? Is this legacy version?", e);
        }
        console.log(
          "[DECK.U]",
          "deckFromJSON",
          e.target.result,
          `v.${version}`,
        );
        if (version === 0) {
          this.legacy_deckFromJSON(e.target.result);
        } else {
          var leg = this.deckToLegacy(e.target.result);
          console.log("[DECK.U]", "deckFromJSON", leg);
          this.legacy_deckFromJSON(leg);
        }
      } catch (err) {
        console.log("[DECK.U] err", err);
        warn_screen("Uploaded deck is not formatted correctly!");
      }
    };

    fr.readAsText(files.item(0));
    document.getElementById("add-file").value = "";
  }
}

const deck_importo_exporto = new deck_importo_exporto1();
loadingscreenupdate(`Loaded deck_importo_exporto!`);
console.log("deck_importo_exporto", deck_importo_exporto);
