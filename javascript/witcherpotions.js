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

  async isEffectActive(player_id, potion_id) {
    const potion = await this.getPotion(player_id, potion_id);

    return Boolean(potion && potion.active === true && potion.turns_left > 0);
  }

  async endOfTurn(player_id) {
    const potions = this.active_potions[player_id];

    if (!potions) {
      return;
    }

    for (const potion_id of Object.keys(potions)) {
      const potion = potions[potion_id];

      if (!potion.active) {
        continue;
      }

      potion.turns_left -= 1;

      if (potion.turns_left <= 0) {
        potion.turns_left = 0;
        potion.active = false;

        // Keep this here so row effects can be removed later.
        await this.refreshRows(player_id, potion_id);
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
    if (!this.board?.row) {
      return;
    }

    const potions = this.active_potions[player_id] ?? {};

    if ((potions?.refresh_rows?.type ?? "none") === "none") {
      return;
    }

    this.board.row.forEach((row) => {
      let shouldRefresh = false;

      // Existing card-based refresh
      if (
        row.cards?.some((card) => card.abilities?.includes("magicthegathering"))
      ) {
        shouldRefresh = true;
      }

      // Potion-specific refresh
      for (const [activePotionId, potion] of Object.entries(potions)) {
        if (!potion.active) {
          continue;
        }

        // If a specific potion was passed, only process that potion.
        if (potion_id && activePotionId !== potion_id) {
          continue;
        }

        if (this.rowMatchesPotion(row, potion)) {
          shouldRefresh = true;
        }
      }

      if (shouldRefresh) {
        row.updateScore();
      }
    });
  }

  async rowMatchesPotion(row, potion) {
    if (!potion?.refresh_rows) {
      return false;
    }

    const { type, value } = potion.refresh_rows;

    switch (type) {
      case "ability":
        return row.cards?.some((card) =>
          value?.some((ability) => card.abilities?.includes(ability)),
        );

      case "row":
        return value?.includes(row.id);

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

    await this.refreshRows(player_id, potion_id);

    return true;
  }

  reset() {
    this.active_potions = {};
  }
}
