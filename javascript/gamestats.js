"use strict";
const UseGameStats = false;
//
// THIS FUNCTION WOULD ALLOW CLIENTS TO TELL SERVER GAME STATUS!
// Making it so server can generate some stats etc for player
// For this idea is scrapped but code remains
// Session id is static breaking history if 2+ games during one session
// On top of that, I dont have idea how to right add it to Gwent, while keeping game a safe place
// ~DrMineword
//
class gamestats {
  constructor(url) {
    this.url = String(url || "").replace(/\/+$/, "");
    this.enabled = !!this.url;
  }

  safeJson(value, seen = new WeakSet()) {
    if (value === null || value === undefined) {
      return value;
    }

    const type = typeof value;

    if (type === "string" || type === "number" || type === "boolean") {
      return value;
    }

    if (type === "bigint") {
      return Number(value);
    }

    if (type === "function" || type === "symbol") {
      return undefined;
    }

    if (type !== "object") {
      return undefined;
    }

    if (seen.has(value)) {
      return undefined;
    }

    seen.add(value);

    if (Array.isArray(value)) {
      const result = [];

      for (const item of value) {
        const converted = this.safeJson(item, seen);

        if (converted !== undefined) {
          result.push(converted);
        }
      }

      return result;
    }

    /*
     * Don't serialize DOM elements.
     */
    if (typeof Element !== "undefined" && value instanceof Element) {
      return undefined;
    }

    if (typeof Node !== "undefined" && value instanceof Node) {
      return undefined;
    }

    const result = {};

    for (const key of Object.keys(value)) {
      /*
       * These are known to be useless/expensive/circular
       * for game statistics.
       */
      if (key === "controller" || key === "holder" || key === "elem") {
        continue;
      }

      try {
        const converted = this.safeJson(value[key], seen);

        if (converted !== undefined) {
          result[key] = converted;
        }
      } catch {
        // Ignore properties that cannot be read.
      }
    }

    return result;
  }

  minimalCard(card) {
    if (card == null) {
      return null;
    }

    if (typeof card === "object") {
      return card.filename ?? null;
    }

    return card;
  }

  fullCard(card) {
    if (card == null) {
      return null;
    }

    if (typeof card !== "object") {
      return card;
    }

    const result = this.safeJson(card);

    return result ?? null;
  }

  boardState(full = false) {
    try {
      const state = {
        meTotal: Number(player_me?.total ?? 0),
        opTotal: Number(player_op?.total ?? 0),
        round: Number(game.roundHistoryResults.length + 1 ?? 1),
        passes: [player_me?.passed ?? false, player_op?.passed ?? false],

        weather: Array.isArray(weather?.cards)
          ? weather.cards.map((card) =>
              full ? this.fullCard(card) : this.minimalCard(card),
            )
          : [],

        rows: Array.isArray(board?.row)
          ? board.row.map((row) => ({
              id: row?.elem?.id ?? null,

              cards: Array.isArray(row?.cards)
                ? row.cards.map((card) =>
                    full ? this.fullCard(card) : this.minimalCard(card),
                  )
                : [],
            }))
          : [],

        myHandSize: player_me?.hand?.cards?.length ?? 0,

        opHandSize: player_op?.hand?.cards?.length ?? 0,
      };

      return state;
    } catch (e) {
      return {
        error: e?.message || String(e),
      };
    }
  }

  buildUrl(endpoint, params = {}) {
    const url = new URL(`${this.url}/${String(endpoint).replace(/^\/+/, "")}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  async request(endpoint, { params = {}, body = {} } = {}) {
    if (!this.enabled) {
      return null;
    }
    if (!UseGameStats) {
      return false;
    }

    const target = this.buildUrl(endpoint, params);

    try {
      const response = await fetch(target, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(body),

        keepalive: true,
      });

      if (!response.ok) {
        console.warn(`[gamestats] HTTP ${response.status}`);

        return null;
      }

      return await response.json().catch(() => null);
    } catch (e) {
      console.warn("[gamestats]", e?.message || e);

      return null;
    }
  }

  async turnEnd({
    userid,
    session,
    turn,

    full = false,

    extra = {},
  } = {}) {
    if (!userid || !session || turn === undefined || turn === null) {
      return null;
    }

    return this.request("/api/game_proggres", {
      params: {
        userid,
        session,
        turn,
      },

      body: {
        state: this.boardState(full),
        ...extra,
      },
    });
  }

  async roundEnd({
    userid,
    session,
    turn = null,
    round,
    full = false,
    extra = {},
  } = {}) {
    if (!userid || !session || round === undefined || round === null) {
      return null;
    }

    return this.request("/api/round_end", {
      params: {
        userid,
        session,
        turn,
        round,
      },

      body: {
        state: this.boardState(full),
        ...extra,
      },
    });
  }

  async gameEnd({
    userid,
    session,
    turn = null,
    round = null,
    result = null,
    full = false,
    extra = {},
  } = {}) {
    if (!userid || !session) {
      return null;
    }

    return this.request("/api/game_end", {
      params: {
        userid,
        session,
      },

      body: {
        turn,
        round,
        result,

        state: this.boardState(full),

        ...extra,
      },
    });
  }
}
