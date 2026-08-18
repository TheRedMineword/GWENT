"use strict";

class PotionManager {
  constructor(board) {
    this.board = board;
    this.active_potions = {};
  }

  /**
   * Structure:
   * active_potions[player_id][potion_id] = {
   *   active: true,
   *   translation_key: "x",
   *   turns_left: 2,
   *   refresh_rows: {
   *     type: "ability/row",
   *     value: ["ability_name"]
   *   }
   * }
   */

  async addPotion(player_id, potion_id, potion) {
    if (!this.active_potions[player_id]) {
      this.active_potions[player_id] = {};
    }

    this.active_potions[player_id][potion_id] = {
      ...potion,
      active: true,
    };

    await this.refreshRows(player_id);

    return this.active_potions[player_id][potion_id];
  }
  /*
  await potions.addPotion(player_id, "magic_potion", {
  translation_key: "potion.magic",
  turns_left: 2,
  refresh_rows: {
    type: "ability", // or none
    value: ["magicthegathering"]
  }
});
*/

  async getPotion(player_id, potion_id) {
    return this.active_potions[player_id]?.[potion_id] ?? null;
  }
  getPotion_fast(player_id, potion_id) {
    return this.active_potions[player_id]?.[potion_id] ?? null;
  }

  async isEffectActive(player_id, potion_id) {
    const potion = await this.getPotion(player_id, potion_id);

    return Boolean(potion && potion.active === true && potion.turns_left > 0);
  }
  async getActivePotions_txt(player_id) {
    const potions = this.active_potions[player_id] ?? {};

    return Object.entries(potions)
      .filter(([_, potion]) => potion?.active)
      .map(([potion_id, potion]) =>
        getTranslation(potion.translation_key).replace("%s", potion.turns_left),
      )
      .join("\n");
  }
  async white_honey() {
    this.reset();
    for (const row of this.board.row) {
      await row.updateScore();
    }
    return true;
  }
  async endOfTurn(player_id) {
    const potions = this.active_potions[player_id];

    if (!potions) {
      return;
    }
    var force = false;
    for (const potion_id of Object.keys(potions)) {
      const potion = potions[potion_id];

      if (!potion.active) {
        continue;
      }

      potion.turns_left -= 1;
      var update = false;
      if (potion.turns_left <= 0) {
        potion.turns_left = 0;
        potion.active = false;
        update = true;
        force = true;
      } else if (potion.active) {
        update = true;
      }
    }

    if (update && !force) {
      await this.refreshRows(player_id); //, potion_id);
    }
    if (force) {
      for (const row of this.board.row) {
        row.updateScore();
      }
    }

    // Remove inactive potions.
    for (const potion_id of Object.keys(potions)) {
      if (!potions[potion_id].active) {
        delete potions[potion_id];
      }
    }

    // Remove empty player entry.
    if (Object.keys(potions).length === 0) {
      delete this.active_potions[player_id];
    }
  }

  async refreshRows(player_id, potion_id = null) {
    //  console.log("refreshRows(", player_id, potion_id, ")");

    if (!this.board?.row) {
      return;
    }

    const potions = this.active_potions[player_id] ?? {};

    for (const [activePotionId, potion] of Object.entries(potions)) {
      if (!potion?.active) {
        continue;
      }

      // If a specific potion was passed, only process that potion.
      if (potion_id && activePotionId !== potion_id) {
        continue;
      }

      this.board.row.forEach((row) => {
        if (this.rowMatchesPotion(row, activePotionId)) {
          //  console.log("POTION score update", activePotionId, row);
          row.updateScore();
        } else {
          //  console.log("POTION not score update", activePotionId, row);
        }
      });
    }
  }

  rowMatchesPotion(row, potion) {
    const potionDef = Object.values(viper_potions_defs).find(
      (def) => def.id === potion,
    );

    const { type, value } = potionDef?.json?.refresh_rows ?? {};

    switch (type) {
      case "ability":
        return (
          row.cards?.some((card) =>
            value?.some((ability) => card.abilities?.includes(ability)),
          ) ?? false
        );

      case "row":
        return value?.includes(row._id.short) ?? false;

      default:
        return false;
    }
  }

  async getActivePotions(player_id) {
    return this.active_potions[player_id] ?? {};
  }

  async clearPlayerPotions(player_id) {
    delete this.active_potions[player_id];

    await this.refreshRows(player_id);
  }

  async removePotion(player_id, potion_id) {
    const potions = this.active_potions[player_id];

    if (!potions?.[potion_id]) {
      return false;
    }

    delete potions[potion_id];

    if (Object.keys(potions).length === 0) {
      delete this.active_potions[player_id];
    }

    await this.refreshRows(player_id); //, potion_id);

    return true;
  }

  reset() {
    this.active_potions = {};
  }
  async hasActiveEffect(player_id) {
    const potions = this.active_potions[player_id] ?? {};

    return Object.values(potions).some(
      (potion) => potion?.active === true && potion?.turns_left > 0,
    );
  }
}
