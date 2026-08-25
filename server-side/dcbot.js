// server-side/dcbot.js
//
// Optional Discord integration for the Gwent server. Gated by:
//   dc_bot_integration_use=true
//   dc_bot={"token":"...","id":"...","economybot":"...","guild_id":"...","free_money_channel":"..."}
//   dc_bot_status=<url to a JSON array/object of bot statuses>   (optional)
//   dc_free_money_channel=<channel id>   (optional, alternative to cfg.free_money_channel)
//
// FREE_MONEY_ON_SOLO_LOSS (see const below, default true):
//   If only one side of a match ever placed a bet, and that lone
//   bettor goes on to LOSE, their stake is normally just refunded
//   (nobody to pay it out from). When this flag is on and a free
//   money channel is configured, the stake (plus the usual score
//   bonus) is instead posted there as a "givemecash:<amount>" button
//   claim - first click gets it, and the message is edited in place
//   to show who claimed it. Falls back to a refund if disabled, not
//   configured, or if posting the message fails for any reason.
//
//   The same flag also covers the WIN side of a solo bet: if the lone
//   bettor wins instead, there's no opponent stake to fund a normal
//   pot-based payout from, but with this flag on they still get the
//   usual score-based bonus credited on top of their own stake
//   (house-funded, same math as a normal payout) rather than a flat
//   break-even refund. With the flag off, a solo bet - win or lose -
//   is always just a flat refund of the stake.
//

// Discord commands (must be typed in the configured guild):
//   !registerclient <id>   Link your Discord account to a currently-connected
//                          game client (the id the game shows you). One
//                          Discord user <-> one client at a time. The link is
//                          cleared automatically when that client disconnects.
//   !gwentunregister        Manually clear your registration.
//   !gwentbet <amount>      Escrow <amount> cash from your UnbelievaBoat
//                          balance as your stake for the match your
//                          registered client is currently in. Can be called
//                          again to add more to an existing bet on the same
//                          match.
//   !gwentstatus             Show your current registration/bet state.
//   !gwentinventory          Show your UnbelievaBoat inventory items.
//   !gwentleaderboard [n]    Show the top n (default 5, max 15) cash balances.
//   !gwentgiveaway <amount>  Take <amount> cash out of YOUR balance and post
//                          it as a first-come-first-served claim in the free
//                          money channel. Refunded automatically if the post
//                          fails for any reason.
//   !gwentspawn <amount>    ADMIN ONLY. Posts <amount> freshly-created cash
//                          (not taken from anyone) as a claim in the free
//                          money channel.
//   !gwentcoinflip <amount> Flip a coin against the house for <amount> cash,
//                          double or nothing.
//   !gwenttip <@user> <amount>  Send <amount> of your own cash to another
//                          Discord user directly.
//   !gwenthelp               List all of the above.
//

// Game-client -> server websocket messages this module reacts to
// (handled in engine.js, which forwards them here):
//
//   { type: "matchResult", winner_id: "<playerId>", score: <number> }
//     Sent when a match ends. BOTH clients in the session need to send this
//     and agree on the winner before any payout happens - if they disagree
//     (or only one ever reports), bets are refunded instead of paid out.
//
//     `score` is an optional 0-15 performance number the reporting client
//     supplies for itself (score_p1 / score_p2, one per player). The LOWER
//     of the two players' scores is used as a payout bonus percentage
//     (capped at 15%) credited to the winner on top of the pot.
//
//   { type: "discord_dm_me", message: "<text>" }
//     Client asks the server to DM its registered Discord user the given
//     text. No-op if that client isn't registered.
//

// Server -> game-client websocket messages this module sends:
//
//   { type: "discordintegration", actiontype, actionvalue, betpool, by, me, op }
//     Pushed to a connected client whenever something bet/registration
//     related happens in their session, so the client UI can react.
//
//     - actiontype: "registered" | "unregistered" | "bet_placed" |
//                   "both_bet" | "payout" | "refund" | "error"
//     - actionvalue: whatever number/string is relevant to actiontype
//                    (bet amount, payout amount, error code, etc.)
//     - bonusPercent: only present on "payout" - the score-based bonus
//                    percentage (0-15) applied on top of the pot
//     - betpool: current total pot for the session (0 once resolved)
//     - by: the Discord id of whoever triggered the action, or null
//     - me / op: { id, username, bet } for this client / their opponent,
//                or null if that side isn't registered
//
//   { type: "discordinventory", items, page, totalPages, error? }
//     Pushed right after a successful !registerclient (a *second* message,
//     right after the "registered" discordintegration push above),
//     containing the linked Discord user's UnbelievaBoat inventory as
//     returned by GET /guilds/{guild}/users/{user}/inventory.
//

// State (registrations, pending bets, match reports) is kept in memory only,
// mirroring how engine.js keeps `sessions`/`players` in memory. It is NOT
// written into process.env - env vars are read-only config for a running
// process, not a place to persist mutable runtime state (they don't survive
// a restart and aren't shared across workers), so a plain in-memory Map is
// the right tool here. If you need bets to survive a server restart, swap
// the Maps below for reads/writes to your `database`/Xano layer.

let Client, GatewayIntentBits, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, EmbedBuilder;

try {
  ({ Client, GatewayIntentBits, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, EmbedBuilder } = require("discord.js"));
} catch (e) {
  // discord.js not installed - init() will log a clear error instead of crashing.
}

const UNB_BASE = "https://unbelievaboat.com/api/v1";

let cfg = {};

try {
  cfg = JSON.parse(process.env.dc_bot || "{}");
} catch (e) {
  console.error("[dcbot] Failed to parse dc_bot env var as JSON:", e.message);
}

const BOT_TOKEN = cfg.token;
const ECONOMY_TOKEN = cfg.economybot;
const GUILD_ID = cfg.guild_id;
const STATUS_URL = process.env.dc_bot_status;

/*
 * When true (the default): if a bet session only ever had ONE side
 * place a bet (the opponent never bet) AND that lone bettor goes on
 * to LOSE the match, their stake is NOT refunded. Instead it (plus
 * the usual score-based bonus) is posted as a first-come-first-served
 * claim to the free money channel below.
 *
 * When false, or when the channel isn't configured, or when posting
 * to the channel fails for any reason, this always falls back to the
 * old behavior: the lone bettor's stake is simply refunded.
 */
const FREE_MONEY_ON_SOLO_LOSS = true;

// Channel ID for the "free money" claim posts. Configure via either
// the dc_bot JSON blob (cfg.free_money_channel) or a plain env var.
const FREE_MONEY_CHANNEL_ID =
  cfg.free_money_channel ||
  process.env.dc_free_money_channel;

/*
 * Discord user IDs allowed to run admin-only commands (currently just
 * !gwentspawn), on top of anyone with the guild's Administrator
 * permission. Configure via either the dc_bot JSON blob
 * (cfg.admin_ids: ["123", "456"]) or a comma-separated env var.
 */
const ADMIN_IDS = new Set(
  [
    ...(Array.isArray(cfg.admin_ids) ? cfg.admin_ids : []),
    ...String(process.env.dc_bot_admin_ids || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ].map(String)
);

function isAdmin(message) {
  if (ADMIN_IDS.has(String(message.author.id))) {
    return true;
  }

  try {
    return !!message.member?.permissions?.has?.(
      PermissionsBitField.Flags.Administrator
    );
  } catch (e) {
    return false;
  }
}

/*
 * ---------- Daily lottery config ----------
 *
 * All configurable via the dc_bot JSON blob or plain env vars, same
 * pattern as everything above.
 *
 * PERSISTENCE: like the rest of this file, lottery state (pool,
 * entrants, etc.) lives in memory only - there's no database. To
 * survive a restart anyway, the status message posted in
 * LOTTERY_CHANNEL_ID is now an embed that doubles as a small save
 * file:
 *
 *   - Entrants are rebuilt from who currently holds LOTTERY_ROLE_ID.
 *     That role assignment lives in Discord, not this process, so it
 *     survives a restart intact. Since every entrant always pays
 *     exactly LOTTERY_TICKET_COST (no partial/multi-ticket joins),
 *     re-crediting each recovered entrant that exact amount is exact,
 *     not a guess.
 *   - The pool total is read back from the "Pool" field of the last
 *     posted status embed, which also captures any admin bonus added
 *     via !gwentlotteryadd (that has no other record anywhere).
 *
 * See restoreLotteryStateFromChannel() below. This is a best-effort
 * recovery, not a real datastore - it depends on the last status
 * message still being editable/found in the channel and reflects
 * state as of that last edit, not necessarily the instant before the
 * crash (though every join/leave/draw immediately re-edits it, so the
 * gap is normally milliseconds). If you need bets to survive with a
 * hard guarantee, this is the one part of the file that genuinely
 * wants a database.
 */

// Role that lottery entrants get while they're in the current round,
// and the role the bot reads to know who's eligible to win.
const LOTTERY_ROLE_ID =
  cfg.lottery_role_id ||
  process.env.dc_lottery_role_id;

// Channel where the bot keeps a single, continuously-edited status
// message with the pool/entrant/winner info.
const LOTTERY_CHANNEL_ID =
  cfg.lottery_channel_id ||
  process.env.dc_lottery_channel_id;

// Cost (in hand/cash, not bank) to buy one ticket.
const LOTTERY_TICKET_COST = Math.max(
  1,
  Number.parseInt(
    cfg.lottery_ticket_cost ??
      process.env.dc_lottery_ticket_cost ??
      100,
    10
  ) || 100
);

// Daily draw time, UTC. Hour is 0-23, minute is 0-59. Default: 00:00 UTC.
const LOTTERY_DRAW_HOUR_UTC =
  ((Number.parseInt(
    cfg.lottery_draw_hour_utc ??
      process.env.dc_lottery_draw_hour_utc ??
      0,
    10
  ) || 0) %
    24 +
    24) %
  24;

const LOTTERY_DRAW_MINUTE_UTC =
  ((Number.parseInt(
    cfg.lottery_draw_minute_utc ??
      process.env.dc_lottery_draw_minute_utc ??
      0,
    10
  ) || 0) %
    60 +
    60) %
  60;

// Every N entrants adds one more winner slot (round starts at 1 winner).
const LOTTERY_ENTRANTS_PER_WINNER = Math.max(
  1,
  Number.parseInt(
    cfg.lottery_entrants_per_winner ??
      process.env.dc_lottery_entrants_per_winner ??
      10,
    10
  ) || 10
);

let client = null;
let ready = false;

/*
 * ---------- Lottery runtime state ----------
 *
 * lotteryQueue serializes EVERY lottery operation (join, leave, admin
 * add-money, and draws - scheduled or manual) onto a single promise
 * chain, so two people clicking !gwentlottery at the same instant (or a
 * scheduled draw firing while someone is mid-join) never interleave.
 * Each operation only starts once the previous one has fully finished
 * (charge, role change, and status message update all settled), so
 * money is never charged/paid without the corresponding state update
 * landing, and vice versa.
 */
let lotteryQueue = Promise.resolve();

function queueLotteryOp(fn) {
  const run = lotteryQueue.then(fn, fn);

  // Swallow here so a failed op doesn't break the chain for the next
  // one - the real error is still returned to whoever called this.
  lotteryQueue = run.catch(() => {});

  return run;
}

let lotteryPool = 0;
let lotteryEntrants = new Map(); // discordId -> { amount, joinedAt }
let lotteryLastWinners = []; // [{ discordId, amount, ok }] from the most recent draw
let lotteryLocked = false; // true while a draw + role reset is in progress
let lotteryStatusMessageId = null;
let lotteryLastDrawDayKey = null; // "YYYY-MM-DD" (UTC) of the last scheduled draw, to avoid double-firing
let lotteryDrawIntervalHandle = null;

let deps = {
  sessions: {},
  playerSockets: {},
  sendToClient: null,
};

const intervals = [];

// discordUserId <-> playerId
// One-to-one, cleared on client disconnect.
const registerByDiscord = new Map();
const registerByPlayer = new Map();

// sessionId -> { [playerId]: { discordId, amount } }
const bets = new Map();

// sessionId -> { [playerId]: reportedWinnerPlayerId }
const matchReports = new Map();

// sessionId -> { [playerId]: reportedScore }
const matchScores = new Map();

const MAX_BONUS_PERCENT = 15;

// playerId -> last discord_dm_me timestamp
const lastDmRequestAt = new Map();

const DM_REQUEST_COOLDOWN_MS = 5000;

/*
 * IMPORTANT:
 *
 * A session can receive multiple engine events for the same disconnect.
 *
 * For example:
 *
 *   onDisconnect()
 *       |
 *       +--> refundSessionBets(sessionId)
 *
 *   onPlayerLeftSession()
 *       |
 *       +--> refundSessionBets(sessionId)
 *
 * The session can STILL contain both players when both callbacks execute.
 *
 * Therefore we cannot use:
 *
 *   session.players.length
 *
 * to decide whether the refund already happened.
 *
 * This Set is the settlement lock.
 *
 * Once a session starts refunding/paying out, it is considered resolved.
 * Any later event for the same sessionId is ignored.
 */
const resolvingSessions = new Set();

/*
 * Claim lock for free-money button messages (customId
 * "givemecash:<amount>"), same pattern as resolvingSessions above:
 * we add the message id to this Set BEFORE any await, so two people
 * clicking the button at the same instant can't both get paid.
 */
const claimedFreeMoneyMessages = new Set();

function log(...args) {
  var log = "[dcbot]: ";

  args.forEach((arg) => {
    try {
      log += JSON.stringify(arg);
    } catch {
      log += String(arg);
    }
  });

  try {
    console.log(log);
  } catch (e) {
    console.log("[dcbot]", ...args);
  }
}


// ---------- UnbelievaBoat helpers ----------

async function unbGetBalance(userId) {
  const res = await fetch(
    `${UNB_BASE}/guilds/${GUILD_ID}/users/${userId}`,
    {
      headers: {
        Authorization: ECONOMY_TOKEN,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `UnbelievaBoat GET balance ${res.status}: ${await res.text()}`
    );
  }

  return res.json();
}

async function unbAdjustBalance(userId, cashDelta, reason) {
  const res = await fetch(
    `${UNB_BASE}/guilds/${GUILD_ID}/users/${userId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: ECONOMY_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cash: cashDelta,
        reason: reason || "Gwent bet",
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `UnbelievaBoat PATCH balance ${res.status}: ${await res.text()}`
    );
  }

  return res.json();
}

/*
 * Same as unbAdjustBalance(), but retries on failure (network blip,
 * UnbelievaBoat rate limit/5xx, etc.) before giving up.
 *
 * This exists specifically as a fail-safe for money-moving calls where a
 * single transient failure means someone doesn't get paid (e.g. the
 * winner payout below) - we've seen at least one unreproduced report of
 * a winner not receiving their payout, and a bare unbAdjustBalance() call
 * has no way to tell a one-off blip apart from a real failure. Every
 * attempt (success or failure) is logged so a repeat can actually be
 * diagnosed from the logs instead of just "it didn't work".
 */
async function unbAdjustBalanceWithRetry(
  userId,
  cashDelta,
  reason,
  attempts = 3
) {
  let lastErr;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await unbAdjustBalance(
        userId,
        cashDelta,
        reason
      );

      log(
        `unbAdjustBalance OK (attempt ${attempt}/${attempts}) user=${userId} delta=${cashDelta} reason="${reason}" newCash=${result?.cash}`
      );

      return result;
    } catch (e) {
      lastErr = e;

      log(
        `unbAdjustBalance FAILED (attempt ${attempt}/${attempts}) user=${userId} delta=${cashDelta} reason="${reason}": ${e.message}`
      );

      if (attempt < attempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 400 * attempt)
        );
      }
    }
  }

  throw lastErr;
}

// GET /guilds/{guild}/users/{user}/inventory
// -> { page, totalPages, items: InventoryItem[] }

async function unbGetInventory(
  userId,
  { limit = 100, offset = 0 } = {}
) {
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const res = await fetch(
    `${UNB_BASE}/guilds/${GUILD_ID}/users/${userId}/inventory?${qs}`,
    {
      headers: {
        Authorization: ECONOMY_TOKEN,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `UnbelievaBoat GET inventory ${res.status}: ${await res.text()}`
    );
  }

  return res.json();
}

// GET /guilds/{guild}/users -> guild balance leaderboard

async function unbGetLeaderboard({
  limit = 10,
  sort = "cash",
} = {}) {
  const qs = new URLSearchParams({
    limit: String(limit),
    sort,
  });

  const res = await fetch(
    `${UNB_BASE}/guilds/${GUILD_ID}/users?${qs}`,
    {
      headers: {
        Authorization: ECONOMY_TOKEN,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `UnbelievaBoat GET leaderboard ${res.status}: ${await res.text()}`
    );
  }

  return res.json();
}


// ---------- Discord helpers ----------

async function dm(discordId, text) {
  if (!ready || !discordId) return;

  try {
    const user = await client.users.fetch(discordId);
    await user.send(text);
  } catch (e) {
    log(`Failed to DM ${discordId}:`, e.message);
  }
}

async function fetchDiscordUser(discordId) {
  if (!ready || !discordId) return null;

  const cached = client.users.cache.get(discordId);

  if (cached) {
    return cached;
  }

  try {
    return await client.users.fetch(discordId);
  } catch (e) {
    return null;
  }
}


// ---------- Daily lottery ----------

function lotteryWinnerCount() {
  const n = lotteryEntrants.size;

  if (n === 0) {
    return 0;
  }

  return (
    1 +
    Math.floor(
      n / LOTTERY_ENTRANTS_PER_WINNER
    )
  );
}

function lotteryConfigured() {
  return !!(
    LOTTERY_ROLE_ID &&
    LOTTERY_CHANNEL_ID
  );
}

/*
 * Fixed footer text on the lottery status embed. Doubles as a marker
 * so we can recognize "our" message (as opposed to some other bot
 * message in the channel) both when reusing it on a normal update and
 * when hunting for it to restore state after a restart.
 */
const LOTTERY_EMBED_FOOTER =
  "Gwent Daily Lottery status \u2014 auto-updated, do not edit";

function buildLotteryStatusEmbed(
  note
) {
  const winnerCount =
    Math.max(
      lotteryWinnerCount(),
      1
    );

  let share =
    lotteryEntrants.size > 0
      ? Math.floor(
          lotteryPool /
            winnerCount
        )
      : 0;

 // share = share * (cfg?.lottery_bonus ?? 1.6)

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("\uD83C\uDFB0 Gwent Daily Lottery")
    .setDescription(
      `Join with \`${usage("gwentlottery")}\``
    )
    .addFields(
      {
        name: "Pool",
        value: `**${lotteryPool}** cash`,
        inline: true,
      },
      {
        name: "Entrants",
        value: `**${lotteryEntrants.size}**`,
        inline: true,
      },
      {
        name: "Ticket cost",
        value: `**${LOTTERY_TICKET_COST}**`,
        inline: true,
      },
      {
        name: "Winner slots",
        value: `**${winnerCount}** (+1 every ${LOTTERY_ENTRANTS_PER_WINNER} entrant(s))`,
        inline: true,
      },
      {
        name: "Est. payout per winner",
        value: `**~${share}** (+${(((cfg?.lottery_bonus ?? 1.6) - 1) * 100).toFixed(2)}%)`,
        inline: true,
      },
      {
        name: "Next draw",
        value: `**${String(
          LOTTERY_DRAW_HOUR_UTC
        ).padStart(2, "0")}:${String(
          LOTTERY_DRAW_MINUTE_UTC
        ).padStart(2, "0")} UTC** daily`,
        inline: true,
      }
    )
    .setFooter({
      text: LOTTERY_EMBED_FOOTER,
    })
    .setTimestamp();

  if (lotteryLocked) {
    embed.addFields({
      name: "Status",
      value:
        "\u23F8\uFE0F Resetting after the last draw - joining is briefly locked.",
    });
  }

  if (
    lotteryLastWinners.length > 0
  ) {
    embed.addFields({
      name: "Last draw",
      value: lotteryLastWinners
        .map(
          (w) =>
            `<@${w.discordId}>: **${w.amount}**${
              w.ok
                ? ""
                : " (payout failed - contact an admin)"
            }`
        )
        .join("\n"),
    });
  }

  if (note) {
    embed.addFields({
      name: "Note",
      value: note,
    });
  }

  return embed;
}

/*
 * Pulls the pool total back out of a previously-posted status
 * message, for restore purposes. Understands the current embed format
 * (reads the "Pool" field) and falls back to regex-matching the old
 * plain-text format, so a message posted by a pre-embed version of
 * this bot can still be recovered/migrated instead of orphaned.
 */
function parseLotteryPoolFromMessage(
  message
) {
  const embed =
    message.embeds?.[0];

  if (embed) {
    const field =
      embed.fields?.find(
        (f) => f.name === "Pool"
      );

    if (field) {
      const n =
        Number.parseInt(
          String(
            field.value
          ).replace(/[^\d]/g, ""),
          10
        );

      if (Number.isFinite(n)) {
        return n;
      }
    }
  }

  if (message.content) {
    const match =
      message.content.match(
        /Pool:\s*\*\*([\d,]+)\*\*/
      );

    if (match) {
      const n =
        Number.parseInt(
          match[1].replace(/,/g, ""),
          10
        );

      if (Number.isFinite(n)) {
        return n;
      }
    }
  }

  return null;
}

/*
 * Finds "our" most recent lottery status message in the channel,
 * whether it's the current embed format or an older plain-text one.
 */
async function findLotteryStatusMessage(
  botClient,
  channel
) {
  const recent =
    await channel.messages.fetch({
      limit: 25,
    });

  return (
    recent.find(
      (m) =>
        m.author.id ===
          botClient.user.id &&
        m.embeds?.[0]?.footer
          ?.text ===
          LOTTERY_EMBED_FOOTER
    ) ||
    recent.find(
      (m) =>
        m.author.id ===
          botClient.user.id &&
        typeof m.content ===
          "string" &&
        m.content.includes(
          "Gwent Daily Lottery"
        )
    ) ||
    null
  );
}

async function updateLotteryStatusMessage(
  botClient,
  note
) {
  if (
    !lotteryConfigured() ||
    !ready
  ) {
    return;
  }

  const embed =
    buildLotteryStatusEmbed(
      note
    );

  const channel =
    await botClient.channels.fetch(
      LOTTERY_CHANNEL_ID
    );

  if (lotteryStatusMessageId) {
    try {
      const msg =
        await channel.messages.fetch(
          lotteryStatusMessageId
        );

      // content: "" clears any leftover plain-text body if this
      // message was originally posted by a pre-embed version of the
      // bot and is now being migrated in place.
      await msg.edit({
        content: "",
        embeds: [embed],
      });

      return;
    } catch (e) {
      log(
        "Lottery status message fetch/edit failed, will look for or create a new one:",
        e.message
      );

      lotteryStatusMessageId = null;
    }
  }

  /*
   * Per the "check that channel for the latest bot message" ask: reuse
   * our most recent message there instead of creating a fresh one on
   * every restart.
   */
  try {
    const mine =
      await findLotteryStatusMessage(
        botClient,
        channel
      );

    if (mine) {
      lotteryStatusMessageId =
        mine.id;

      await mine.edit({
        content: "",
        embeds: [embed],
      });

      return;
    }
  } catch (e) {
    log(
      "Lottery status message lookup failed:",
      e.message
    );
  }

  const sent = await channel.send({
    embeds: [embed],
  });

  lotteryStatusMessageId = sent.id;
}

/*
 * Runs once at startup (from initLottery(), before the first status
 * update is posted) to rebuild in-memory lottery state from what
 * survived the restart:
 *
 *   - lotteryEntrants: rebuilt from whoever currently holds
 *     LOTTERY_ROLE_ID. That's exact, since every entrant always pays
 *     exactly LOTTERY_TICKET_COST.
 *   - lotteryPool: read back from the "Pool" field of the last status
 *     message, so it also picks back up any !gwentlotteryadd bonus.
 *     Falls back to entrants * ticket cost if that message can't be
 *     found or parsed (in which case any bonus is unrecoverable and
 *     needs to be re-added manually).
 *
 * `joinedAt` for recovered entrants is set to "now" rather than their
 * real join time, since that timestamp isn't persisted anywhere and
 * isn't currently used for anything besides informational bookkeeping.
 */
async function restoreLotteryStateFromChannel(
  botClient
) {
  if (!lotteryConfigured()) {
    return;
  }

  try {
    const channel =
      await botClient.channels.fetch(
        LOTTERY_CHANNEL_ID
      );

    const mine =
      await findLotteryStatusMessage(
        botClient,
        channel
      );

    if (!mine) {
      log(
        "Lottery restore: no previous status message found in the channel - starting a fresh round (pool=0, entrants=0). If a round was actually in progress when the bot restarted, clear the lottery role manually and check the economy bot."
      );

      return;
    }

    lotteryStatusMessageId =
      mine.id;

    let restoredEntrants = 0;

    try {
      const guild =
        botClient.guilds.cache.get(
          GUILD_ID
        ) ||
        (await botClient.guilds.fetch(
          GUILD_ID
        ));

      await guild.members
        .fetch()
        .catch((e) =>
          log(
            "Lottery restore: guild.members.fetch() failed, entrant recovery may be incomplete:",
            e.message
          )
        );

      const role =
        await guild.roles.fetch(
          LOTTERY_ROLE_ID
        );

      if (role) {
        for (const id of role.members.keys()) {
          lotteryEntrants.set(
            id,
            {
              amount:
                LOTTERY_TICKET_COST,
              joinedAt: Date.now(),
            }
          );

          restoredEntrants++;
        }
      }
    } catch (e) {
      log(
        "Lottery restore: role member lookup failed, entrants could not be recovered:",
        e.message
      );
    }

    const bySize =
      restoredEntrants *
      LOTTERY_TICKET_COST;

    const parsedPool =
      parseLotteryPoolFromMessage(
        mine
      );

    if (parsedPool !== null) {
      lotteryPool = parsedPool;

      if (lotteryPool !== bySize) {
        log(
          `Lottery restore: last posted pool (${lotteryPool}) differs from entrants*ticket_cost (${bySize}) - likely includes a !gwentlotteryadd bonus (or the ticket cost changed since), keeping the posted total.`
        );
      }
    } else {
      lotteryPool = bySize;

      log(
        "Lottery restore: couldn't parse a pool total off the last status message, falling back to entrants * ticket cost. Any !gwentlotteryadd bonus added before the restart is unrecoverable - re-add it manually if needed."
      );
    }

    log(
      `Lottery restore: recovered ${restoredEntrants} entrant(s) currently holding the lottery role and a pool of ${lotteryPool} cash from the last status message in <#${LOTTERY_CHANNEL_ID}>.`
    );
  } catch (e) {
    log(
      "Lottery restore failed, starting a fresh round:",
      e.message
    );
  }
}

async function doLotteryJoin(
  message
) {
  if (!lotteryConfigured()) {
    return message.reply(
      "The lottery isn't configured on this server."
    );
  }

  if (lotteryLocked) {
    return message.reply(
      "The lottery is resetting after the last draw - try again in a moment."
    );
  }

  if (
    lotteryEntrants.has(
      message.author.id
    )
  ) {
    return message.reply(
      "You're already in this round's lottery."
    );
  }

  const member =
    await message.guild.members
      .fetch(message.author.id)
      .catch(() => null);

  if (!member) {
    return message.reply(
      "Couldn't verify your server membership."
    );
  }

  try {
    const balance =
      await unbGetBalance(
        message.author.id
      );

    if (
      (balance.cash ?? 0) <
      LOTTERY_TICKET_COST
    ) {
      return message.reply(
        `A ticket costs **${LOTTERY_TICKET_COST}** cash, you only have **${balance.cash}**.`
      );
    }
  } catch (e) {
    log(
      "Lottery join balance check failed:",
      e.message
    );

    return message.reply(
      "Couldn't reach the economy bot. Try again shortly."
    );
  }

  try {
    await unbAdjustBalanceWithRetry(
      message.author.id,
      -LOTTERY_TICKET_COST,
      "Gwent lottery ticket"
    );
  } catch (e) {
    log(
      "Lottery ticket charge failed:",
      e.message
    );

    return message.reply(
      "Couldn't take the ticket cost from your balance. Try again shortly."
    );
  }

  try {
    await member.roles.add(
      LOTTERY_ROLE_ID
    );
  } catch (e) {
    log(
      `Lottery role add failed for ${message.author.id}, refunding: ${e.message}`
    );

    try {
      await unbAdjustBalanceWithRetry(
        message.author.id,
        LOTTERY_TICKET_COST,
        "Gwent lottery ticket refund (role add failed)"
      );
    } catch (e2) {
      log(
        `CRITICAL: lottery join refund FAILED for ${message.author.id}: ${e2.message}. Manual admin reconciliation required.`
      );

      return message.reply(
        `\u26A0\uFE0F Took your **${LOTTERY_TICKET_COST}** but couldn't add the lottery role AND couldn't refund it. Please contact an admin immediately.`
      );
    }

    return message.reply(
      "Couldn't add the lottery role, so your ticket was refunded."
    );
  }

  lotteryEntrants.set(
    message.author.id,
    {
      amount: LOTTERY_TICKET_COST,
      joinedAt: Date.now(),
    }
  );

  lotteryPool += LOTTERY_TICKET_COST;

  log(
    `Lottery join: ${message.author.id} paid ${LOTTERY_TICKET_COST}, pool=${lotteryPool}, entrants=${lotteryEntrants.size}`
  );

  await updateLotteryStatusMessage(
    message.client
  ).catch((e) =>
    log(
      "Lottery status update after join failed:",
      e.message
    )
  );

  return message.reply(
    `\uD83C\uDFAB You're in! Pool is now **${lotteryPool}** cash across **${lotteryEntrants.size}** entrant(s).`
  );
}

async function doLotteryLeave(
  message
) {
  if (lotteryLocked) {
    return message.reply(
      "The lottery is resetting - try again shortly."
    );
  }

  const entry =
    lotteryEntrants.get(
      message.author.id
    );

  if (!entry) {
    return message.reply(
      "You're not in this round's lottery."
    );
  }

  lotteryEntrants.delete(
    message.author.id
  );

  lotteryPool -= entry.amount;

  const member =
    await message.guild.members
      .fetch(message.author.id)
      .catch(() => null);

  if (member) {
    await member.roles
      .remove(LOTTERY_ROLE_ID)
      .catch((e) =>
        log(
          `Lottery leave: role remove failed for ${message.author.id}:`,
          e.message
        )
      );
  }

  try {
    await unbAdjustBalanceWithRetry(
      message.author.id,
      entry.amount,
      "Gwent lottery ticket refund (left)"
    );
  } catch (e) {
    /*
     * Refund failed - put the bookkeeping back exactly as it was so
     * the money isn't just dropped from the pool, and tell the user
     * they're still in rather than claiming a refund that didn't
     * happen.
     */
    log(
      `CRITICAL: lottery leave refund FAILED for ${message.author.id}: ${e.message}`
    );

    lotteryEntrants.set(
      message.author.id,
      entry
    );

    lotteryPool += entry.amount;

    return message.reply(
      "Couldn't refund your ticket, so you're still in the lottery. Try again shortly."
    );
  }

  log(
    `Lottery leave: ${message.author.id} refunded ${entry.amount}, pool=${lotteryPool}, entrants=${lotteryEntrants.size}`
  );

  await updateLotteryStatusMessage(
    message.client
  ).catch(() => {});

  return message.reply(
    `Left the lottery, **${entry.amount}** refunded.`
  );
}

async function resetLotteryRound(
  botClient
) {
  const idsToClean = new Set(
    lotteryEntrants.keys()
  );

  try {
    const guild =
      botClient.guilds.cache.get(
        GUILD_ID
      ) ||
      (await botClient.guilds.fetch(
        GUILD_ID
      ));

    // Populate the member cache first - role.members below only reflects
    // cached members, and without this it can be empty even with the
    // GuildMembers intent on.
    await guild.members
      .fetch()
      .catch((e) =>
        log(
          "Lottery reset: guild.members.fetch() failed, role sweep may be incomplete:",
          e.message
        )
      );

    const role =
      await guild.roles.fetch(
        LOTTERY_ROLE_ID
      );

    if (role) {
      // Also sweep anyone holding the role who somehow isn't in our
      // tracked entrants (manual role grant, earlier bug, etc.) so a
      // stray role never permanently locks someone out of future
      // rounds.
      for (const id of role.members.keys()) {
        idsToClean.add(id);
      }
    }

    for (const id of idsToClean) {
      try {
        const member =
          await guild.members
            .fetch(id)
            .catch(() => null);

        if (
          member &&
          member.roles.cache.has(
            LOTTERY_ROLE_ID
          )
        ) {
          await member.roles.remove(
            LOTTERY_ROLE_ID
          );
        }
      } catch (e) {
        log(
          `Lottery reset: failed to remove role from ${id}:`,
          e.message
        );
      }
    }
  } catch (e) {
    log(
      "Lottery reset: role cleanup failed:",
      e.message
    );
  }

  lotteryEntrants.clear();
  lotteryPool = 0;

  log(
    "Lottery round reset: role cleared and pool/entrants zeroed."
  );
}

async function doLotteryDraw(
  trigger,
  botClient,
  triggeringMessage
) {
  if (!lotteryConfigured()) {
    log(
      "Lottery draw skipped: not configured."
    );

    return triggeringMessage?.reply(
      "The lottery isn't configured on this server."
    );
  }

  // Locked for the whole draw + reset so no join can land mid-draw.
  lotteryLocked = true;

  try {
    const entrantIds = [
      ...lotteryEntrants.keys(),
    ];

    log(
      `Lottery draw (${trigger}) starting: entrants=${entrantIds.length} pool=${lotteryPool}`
    );

    if (entrantIds.length === 0) {
      lotteryLastWinners = [];

      await updateLotteryStatusMessage(
        botClient,
        "No entrants this round - nobody to draw from."
      ).catch(() => {});

      return triggeringMessage?.reply(
        "No one is in the lottery right now."
      );
    }

    /*
     * Per the request, winners come from members who currently hold
     * the role - but only ones we also have a recorded ticket for, so
     * someone with the role manually added (or left over from a bug)
     * can't win without having actually paid in.
     */
    let candidateIds = entrantIds;

    try {
      const guild =
        botClient.guilds.cache.get(
          GUILD_ID
        ) ||
        (await botClient.guilds.fetch(
          GUILD_ID
        ));

      await guild.members
        .fetch()
        .catch((e) =>
          log(
            "Lottery draw: guild.members.fetch() failed, role check may be incomplete:",
            e.message
          )
        );

      const role =
        await guild.roles.fetch(
          LOTTERY_ROLE_ID
        );

      if (role) {
        const roleMemberIds = [
          ...role.members.keys(),
        ];

        const filtered =
          roleMemberIds.filter(
            (id) =>
              lotteryEntrants.has(
                id
              )
          );

        if (filtered.length > 0) {
          candidateIds = filtered;
        } else {
          log(
            `Lottery draw (${trigger}): no role holders matched tracked entrants, falling back to the tracked list.`
          );
        }
      }
    } catch (e) {
      log(
        `Lottery draw (${trigger}): role member fetch failed, falling back to tracked entrants:`,
        e.message
      );
    }

    const winnerCount = Math.min(
      lotteryWinnerCount(),
      candidateIds.length
    );

    const shuffled = [
      ...candidateIds,
    ];

    for (
      let i = shuffled.length - 1;
      i > 0;
      i--
    ) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [shuffled[i], shuffled[j]] = [
        shuffled[j],
        shuffled[i],
      ];
    }

    const winners = shuffled.slice(
      0,
      winnerCount
    );

    const pool = lotteryPool;

    const share = Math.floor(
      pool / winners.length
    );

    // Give any rounding remainder to the first winner instead of
    // letting it evaporate.
    const remainder =
      pool -
      share * winners.length;

    log(
      `Lottery draw (${trigger}): pool=${pool} winners=${JSON.stringify(
        winners
      )} share=${share} remainder=${remainder}`
    );

    const payoutResults = [];

    for (
      let i = 0;
      i < winners.length;
      i++
    ) {
      const winnerId = winners[i];

      let amount =
        share +
        (i === 0 ? remainder : 0);
      let b = amount;
      amount = Math.floor(amount * (cfg?.lottery_bonus ?? 1.6));

      try {
        await unbAdjustBalanceWithRetry(
          winnerId,
          amount,
          "Gwent lottery win"
        );

        payoutResults.push({
          discordId: winnerId,
          amount,
          ok: true,
        });

        await dm(
          winnerId,
          `\uD83C\uDF70 You won the lottery! **+${b}+${(((cfg?.lottery_bonus ?? 1.6) - 1) * 100).toFixed(2)}%, ${amount} in total!** cash credited.`
        );

        log(
          `Lottery payout OK: ${winnerId} +${amount}`
        );
      } catch (e) {
        payoutResults.push({
          discordId: winnerId,
          amount,
          ok: false,
          error: e.message,
        });

        log(
          `CRITICAL: lottery payout FAILED for ${winnerId} amount=${amount}: ${e.message}. Manual admin payout required.`
        );

        await dm(
          winnerId,
          `\u26A0\uFE0F You won the lottery, but crediting your **${amount}** failed even after retries. Please contact an admin.`
        );
      }
    }

    const failedPayouts =
      payoutResults.filter(
        (r) => !r.ok
      );

    if (
      failedPayouts.length > 0
    ) {
      try {
        const channel =
          await botClient.channels.fetch(
            LOTTERY_CHANNEL_ID
          );

        await channel.send(
          `\uD83D\uDEA8 **Lottery payout failure** - ${failedPayouts
            .map(
              (r) =>
                `<@${r.discordId}> (${r.amount})`
            )
            .join(
              ", "
            )} won but couldn't be paid automatically. Please pay manually.`
        );
      } catch (e) {
        log(
          "Also failed to post lottery payout-failure alert:",
          e.message
        );
      }
    }

    lotteryLastWinners =
      payoutResults;

    // Reset for the next round - clears the role from everyone and
    // zeroes the pool/entrants. Joins stay locked (lotteryLocked)
    // until this fully finishes.
    await resetLotteryRound(
      botClient
    );

    await updateLotteryStatusMessage(
      botClient
    ).catch((e) =>
      log(
        "Lottery status update after draw failed:",
        e.message
      )
    );

    return triggeringMessage?.reply(
      `Lottery drawn: ${winners.length} winner(s) sharing a pool of **${pool}**.`
    );
  } finally {
    lotteryLocked = false;
  }
}

async function handleLotteryJoin(
  message
) {
  return queueLotteryOp(() =>
    doLotteryJoin(message)
  );
}

async function handleLotteryLeave(
  message
) {
  return queueLotteryOp(() =>
    doLotteryLeave(message)
  );
}

async function handleLotteryStatus(
  message
) {
  if (!lotteryConfigured()) {
    return message.reply(
      "The lottery isn't configured on this server."
    );
  }

  return message.reply({
    embeds: [
      buildLotteryStatusEmbed(),
    ],
  });
}

async function handleLotteryOdds(
  message
) {
  if (!lotteryConfigured()) {
    return message.reply(
      "The lottery isn't configured on this server."
    );
  }

  const entry =
    lotteryEntrants.get(
      message.author.id
    );

  if (!entry) {
    return message.reply(
      `You're not in this round yet. Join with \`${usage(
        "gwentlottery"
      )}\` for **${LOTTERY_TICKET_COST}** cash.`
    );
  }

  const winnerCount = Math.max(
    lotteryWinnerCount(),
    1
  );

  const odds = (
    (Math.min(
      winnerCount,
      lotteryEntrants.size
    ) /
      lotteryEntrants.size) *
    100
  ).toFixed(1);

  return message.reply(
    `You're in with **${lotteryEntrants.size}** total entrant(s) and **${winnerCount}** winner slot(s) - roughly a **${odds}%** chance of winning something this round.`
  );
}

async function handleLotteryAddMoney(
  message,
  args
) {
  if (!isAdmin(message)) {
    return message.reply(
      "You need to be an admin to use this command."
    );
  }

  if (!lotteryConfigured()) {
    return message.reply(
      "The lottery isn't configured on this server."
    );
  }

  const amount =
    Number.parseInt(
      args[0],
      10
    );

  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return message.reply(
      `Usage: \`${usage("gwentlotteryadd")}\` - amount must be a positive whole number.`
    );
  }

  return queueLotteryOp(
    async () => {
      lotteryPool += amount;

      log(
        `Admin ${message.author.id} added ${amount} bonus to the lottery pool, new pool=${lotteryPool}`
      );

      await updateLotteryStatusMessage(
        message.client
      ).catch(() => {});

      return message.reply(
        `\u2705 Added **${amount}** bonus to the lottery pool. Pool is now **${lotteryPool}**.`
      );
    }
  );
}

async function handleLotteryDraw(
  message
) {
  if (!isAdmin(message)) {
    return message.reply(
      "You need to be an admin to use this command."
    );
  }

  return queueLotteryOp(() =>
    doLotteryDraw(
      "manual",
      message.client,
      message
    )
  );
}

function maybeRunScheduledLotteryDraw() {
  if (
    !lotteryConfigured() ||
    !ready
  ) {
    return;
  }

  const now = new Date();

  const dayKey =
    now.toISOString().slice(0, 10);

  if (
    now.getUTCHours() ===
      LOTTERY_DRAW_HOUR_UTC &&
    now.getUTCMinutes() ===
      LOTTERY_DRAW_MINUTE_UTC &&
    lotteryLastDrawDayKey !==
      dayKey
  ) {
    lotteryLastDrawDayKey = dayKey;

    log(
      `Scheduled lottery draw firing for ${dayKey} ${LOTTERY_DRAW_HOUR_UTC}:${LOTTERY_DRAW_MINUTE_UTC} UTC`
    );

    queueLotteryOp(() =>
      doLotteryDraw(
        "scheduled",
        client,
        null
      )
    ).catch((e) =>
      log(
        "Scheduled lottery draw failed:",
        e?.stack || e
      )
    );
  }
}

async function initLottery() {
  if (!lotteryConfigured()) {
    return;
  }

  log(
    `Lottery configured: role=${LOTTERY_ROLE_ID} channel=${LOTTERY_CHANNEL_ID} ticket=${LOTTERY_TICKET_COST} draw=${LOTTERY_DRAW_HOUR_UTC}:${LOTTERY_DRAW_MINUTE_UTC} UTC entrantsPerWinner=${LOTTERY_ENTRANTS_PER_WINNER}`
  );

  /*
   * Routed through queueLotteryOp so it's serialized against any
   * join/leave/draw command that happens to arrive while this is
   * running, the same way every other lottery operation is - restore
   * always finishes (or fails) before the next real command starts.
   */
  await queueLotteryOp(
    async () => {
      await restoreLotteryStateFromChannel(
        client
      );

      await updateLotteryStatusMessage(
        client
      ).catch((e) =>
        log(
          "Initial lottery status message failed:",
          e.message
        )
      );
    }
  ).catch((e) =>
    log(
      "Lottery restore/init failed:",
      e?.stack || e
    )
  );

  if (lotteryDrawIntervalHandle) {
    clearInterval(
      lotteryDrawIntervalHandle
    );
  }

  lotteryDrawIntervalHandle =
    setInterval(
      maybeRunScheduledLotteryDraw,
      30 * 1000
    );

  intervals.push(
    lotteryDrawIntervalHandle
  );
}


// ---------- Client-facing push helpers ----------

async function buildSnapshot(discordId, bet) {
  if (!discordId) return null;

  const user = await fetchDiscordUser(discordId);

  return {
    id: discordId,
    username: user
      ? user.globalName || user.username
      : null,
    bet: bet || 0,
  };
}

function pushIntegration(playerId, payload) {
  const ws = deps.playerSockets[playerId];

  if (!ws || typeof deps.sendToClient !== "function") {
    return;
  }

  deps.sendToClient(ws, {
    type: "discordintegration",
    ...payload,
  });
}

// Second ws message sent right after a successful registration:
// the linked Discord user's UnbelievaBoat inventory.

async function pushInventorySnapshot(playerId, discordId) {
  const ws = deps.playerSockets[playerId];

  if (!ws || typeof deps.sendToClient !== "function") {
    return;
  }

  if (!discordId) {
    return;
  }

  try {
    const inv = await unbGetInventory(discordId);
    const items = inv.items || [];

    deps.sendToClient(ws, {
      type: "discordinventory",
      items,
      page: inv.page ?? 1,
      totalPages: inv.totalPages ?? 1,
    });

    log(
      `Sent inventory snapshot to client ${playerId} (${discordId}): ${items.length} item(s)`
    );
  } catch (e) {
    log(
      `Inventory fetch failed for ${discordId}:`,
      e.message
    );

    deps.sendToClient(ws, {
      type: "discordinventory",
      items: [],
      page: 1,
      totalPages: 1,
      error: "fetch_failed",
    });
  }
}


// Sends both players in a session their own me/op view
// of the same event.

async function broadcastSessionState(
  sessionId,
  actiontype,
  actionvalue,
  byDiscordId
) {
  const playerIds = sessionPlayerIds(sessionId);
  const sessionBets = bets.get(sessionId) || {};

  for (const playerId of playerIds) {
    const ws = deps.playerSockets[playerId];

    if (!ws || typeof deps.sendToClient !== "function") {
      continue;
    }

    const discordId =
      registerByPlayer.get(playerId) || null;

    const opponentId = playerIds.find(
      (pid) => pid !== playerId
    );

    const opponentDiscordId = opponentId
      ? registerByPlayer.get(opponentId) || null
      : null;

    const meBet =
      sessionBets[playerId]?.amount || 0;

    const opBet =
      (opponentId && sessionBets[opponentId]?.amount) || 0;

    pushIntegration(playerId, {
      actiontype,
      actionvalue,
      by: byDiscordId || null,
      betpool: meBet + opBet,

      me: discordId
        ? await buildSnapshot(
            discordId,
            meBet
          )
        : null,

      op: opponentDiscordId
        ? await buildSnapshot(
            opponentDiscordId,
            opBet
          )
        : null,
    });
  }
}


// ---------- Core state helpers ----------

function sessionPlayerIds(sessionId) {
  const session = deps.sessions[sessionId];

  if (!session) {
    return [];
  }

  return session.players.map(
    (p) => p.playerId
  );
}


/*
 * Refund every bet in a session exactly once.
 *
 * IMPORTANT:
 *
 * We claim the session BEFORE the first await.
 *
 * This is what prevents:
 *
 *   onDisconnect()
 *       +
 *   onPlayerLeftSession()
 *
 * from both refunding the same bet.
 *
 * We also delete the bets immediately after claiming the session.
 * The local `sessionBets` object remains available to finish the refund.
 */

async function refundSessionBets(
  sessionId,
  reasonText
) {
  // Another callback already started resolving this session.
  if (resolvingSessions.has(sessionId)) {
    log(
      `Skipping duplicate refund for session ${sessionId}`
    );

    return;
  }

  const sessionBets = bets.get(sessionId);

  // No bets = nothing to refund.
  if (!sessionBets) {
    return;
  }

  /*
   * CLAIM THE SESSION BEFORE ANY await.
   *
   * JavaScript will execute this synchronously before another
   * async callback can get a chance to check the Set.
   */
  resolvingSessions.add(sessionId);

  /*
   * IMPORTANT:
   *
   * Everything below is wrapped in try/finally so resolvingSessions
   * is ALWAYS released once this function is done with the session -
   * on the normal path, and also if an unexpected error is thrown
   * partway through (e.g. a buildSnapshot()/pushIntegration() call
   * failing). Without this, a single error mid-refund would leave
   * the session permanently locked and every later refund/payout
   * attempt for it would just log "Skipping duplicate refund/payout"
   * forever.
   */
  try {
    /*
     * Remove the session from the active money state immediately.
     *
     * We intentionally keep the local `sessionBets` variable because
     * the refund operation still needs the bet information.
     */
    bets.delete(sessionId);

    const ids = Object.keys(sessionBets);

    for (const [playerId, bet] of Object.entries(sessionBets)) {
      const opponentId = ids.find(
        (id) => id !== playerId
      );

      const opponentDiscordId = opponentId
        ? sessionBets[opponentId].discordId
        : null;

      try {
        await unbAdjustBalanceWithRetry(
          bet.discordId,
          bet.amount,
          "Gwent bet refund"
        );

        await dm(
          bet.discordId,
          `\uD83D\uDD01 Your Gwent bet of **${bet.amount}** was refunded. ${
            reasonText || ""
          }`
        );
      } catch (e) {
        log(
          `Refund failed for ${bet.discordId} (session ${sessionId}):`,
          e.message
        );

        await dm(
          bet.discordId,
          `\u26A0\uFE0F Your Gwent bet of **${bet.amount}** should have been refunded but the economy API call failed. Please contact an admin.`
        );
      }

      pushIntegration(playerId, {
        actiontype: "refund",
        actionvalue: bet.amount,
        by: null,
        betpool: 0,

        me: await buildSnapshot(
          bet.discordId,
          0
        ),

        op: opponentDiscordId
          ? await buildSnapshot(
              opponentDiscordId,
              0
            )
          : null,
      });
    }

    matchReports.delete(sessionId);
    matchScores.delete(sessionId);

    log(
      `Refund settlement completed for session ${sessionId}`
    );
  } finally {
    resolvingSessions.delete(sessionId);
  }
}
// ---------- Registration / disconnect helpers ----------

function clearRegistrationForPlayer(
  playerId,
  { notify = true } = {}
) {
  const discordId = registerByPlayer.get(playerId);

  if (!discordId) {
    return;
  }

  registerByPlayer.delete(playerId);
  registerByDiscord.delete(discordId);
  lastDmRequestAt.delete(playerId);

  if (notify) {
    dm(
      discordId,
      "\uD83D\uDD0C Your game client disconnected, so your Gwent registration was cleared. Run `!registerclient <id>` again next time you play."
    );
  }
}


// ---------- Hooks called from engine.js ----------

// Called for every player that leaves a session before it's resolved.
// Bets tied to that session are refunded.

async function onPlayerLeftSession(
  ws,
  sessionId
) {
  if (!ready) {
    return;
  }

  if (!sessionId) {
    return;
  }

  await refundSessionBets(
    sessionId,
    "The match session ended before a result was recorded."
  );
}


// Called on socket close/error.
//
// IMPORTANT:
// Do NOT check whether the session still has two players here.
// The session object can still contain both players when this callback
// executes.
//
// refundSessionBets() itself is responsible for making sure the
// session is only refunded once.

async function onDisconnect(ws) {
  if (!ready) {
    return;
  }

  if (ws.sessionId) {
    await refundSessionBets(
      ws.sessionId,
      "A player disconnected before the match finished."
    );
  }

  // Registration is separate from the bet settlement.
  // clearRegistrationForPlayer() is already idempotent because it
  // removes the registration before sending the notification.
  clearRegistrationForPlayer(
    ws.playerId
  );
}


// ---------- Discord DM request ----------

// Called when a client asks the server to DM its linked Discord user.

async function onDmRequest(ws, data) {
  if (!ready) {
    return;
  }

  const discordId =
    registerByPlayer.get(ws.playerId);

  if (!discordId) {
    pushIntegration(ws.playerId, {
      actiontype: "error",
      actionvalue: "not_registered",
      by: null,
      betpool: 0,
      me: null,
      op: null,
    });

    return;
  }

  const now = Date.now();
  const last =
    lastDmRequestAt.get(ws.playerId) || 0;

  if (
    now - last <
    DM_REQUEST_COOLDOWN_MS
  ) {
    return;
  }

  lastDmRequestAt.set(
    ws.playerId,
    now
  );

  const text =
    typeof data?.message === "string"
      ? data.message.trim().slice(0, 1800)
      : "";

  if (!text) {
    return;
  }

  await dm(
    discordId,
    text
  );
}


// ---------- Free money channel ----------

/*
 * Posts a claimable "free money" message with a button to the
 * configured channel. The button's customId is "givemecash:<amount>"
 * so the interactionCreate handler (see handleFreeMoneyClaim below)
 * can read the amount straight off the button without any extra
 * lookup table. Returns true if the message was posted, false if it
 * wasn't (channel not configured, fetch/send error, client not
 * ready, etc.) so callers can fall back to a plain refund instead.
 */
async function postFreeMoneyMessage(
  amount,
  sessionId,
  baseAmount,
  bonusPercent,
  bonusAmount,
  customContent
) {
  if (
    !ready ||
    !client ||
    !ButtonBuilder
  ) {
    log(
      "Cannot post free money message - Discord client not ready."
    );

    return false;
  }

  if (!FREE_MONEY_CHANNEL_ID) {
    log(
      "dc_free_money channel is not configured (set cfg.free_money_channel or dc_free_money_channel) - skipping free money post."
    );

    return false;
  }

  try {
    const channel =
      await client.channels.fetch(
        FREE_MONEY_CHANNEL_ID
      );

    const row =
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(
            `givemecash:${amount}`
          )
          .setLabel(
            `Claim ${amount}`
          )
          .setStyle(
            ButtonStyle.Success
          )
      );

    const bonusText =
      bonusAmount > 0
        ? ` (stake **${baseAmount}** + ${bonusPercent}% score bonus, **${bonusAmount}** extra)`
        : "";

    const content =
      customContent ||
      `\uD83D\uDCB0 A Gwent bet went unmatched and the loser's stake is up for grabs: **${amount}** cash total${bonusText}. First to click claims it!`;

    await channel.send({
      content,
      components: [row],
    });

    return true;
  } catch (e) {
    log(
      `Failed to post free money message for session ${sessionId}:`,
      e.message
    );

    return false;
  }
}

/*
 * Handles clicks on "givemecash:<amount>" buttons.
 *
 * Claims the message id BEFORE any await (same reasoning as
 * resolvingSessions - two clicks arriving back-to-back must not both
 * pass the check), pays out the amount encoded in the button itself,
 * then edits the message so it visibly shows who claimed it and
 * removes the button so nobody else can try.
 */
async function handleFreeMoneyClaim(
  interaction
) {
  const amount = Number(
    interaction.customId.split(
      ":"
    )[1]
  );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    await interaction
      .reply({
        content:
          "\u26A0\uFE0F That claim button looks broken (bad amount).",
        ephemeral: true,
      })
      .catch(() => {});

    return;
  }

  const messageId =
    interaction.message.id;

  if (
    claimedFreeMoneyMessages.has(
      messageId
    )
  ) {
    await interaction
      .reply({
        content:
          "\u274C Someone already claimed this.",
        ephemeral: true,
      })
      .catch(() => {});

    return;
  }

  // Claim synchronously before any await below.
  claimedFreeMoneyMessages.add(
    messageId
  );

  try {
    await unbAdjustBalanceWithRetry(
      interaction.user.id,
      amount,
      "Gwent free money channel claim"
    );

    await interaction.update({
      content: `\u2705 **${amount}** claimed by <@${interaction.user.id}>!`,
      components: [],
    });
  } catch (e) {
    // Payout failed - release the claim so someone else (or the
    // same person) can try again instead of the money vanishing.
    claimedFreeMoneyMessages.delete(
      messageId
    );

    log(
      "Free money claim failed:",
      e.message
    );

    await interaction
      .reply({
        content:
          "\u26A0\uFE0F Something went wrong crediting that. Try again, or contact an admin.",
        ephemeral: true,
      })
      .catch(() => {});
  }
}


// ---------- Match result ----------

// Called when a client reports a match result.
//
// We wait for both players to report and require them to agree
// before paying out.

async function onMatchResult(
  ws,
  data
) {
  log(
    `onMatchResult received: player=${ws?.playerId} sessionId=${ws?.sessionId} data=${JSON.stringify(data)}`
  );

  if (!ready) {
    log("onMatchResult ignored: bot not ready.");

    return;
  }

  const sessionId =
    ws.sessionId;

  if (
    !sessionId ||
    !deps.sessions[sessionId]
  ) {
    /*
     * This report is now dropped on the floor - if the other client's
     * report already came in and was waiting on this one, that pending
     * report (and any bets tied to it) will just sit in `matchReports` /
     * `bets` until the session is cleaned up some other way (disconnect,
     * player-left). Logged loudly since a session vanishing out from
     * under a still-relevant match report is a plausible cause of a
     * "winner never got paid" bug that's otherwise hard to reproduce.
     */
    log(
      `onMatchResult ignored: no active session for player ${ws?.playerId} (sessionId=${sessionId}). If a payout/refund was expected, check whether the session was removed prematurely.`
    );

    return;
  }

  /*
   * If this session has already started a refund or payout,
   * ignore any duplicate matchResult messages.
   *
   * This check is especially important because the client may
   * report a result around the same time that disconnect/leave
   * events are being processed.
   */
  if (
    resolvingSessions.has(sessionId)
  ) {
    log(
      `Ignoring matchResult for already-resolving session ${sessionId}`
    );

    return;
  }

  const winnerId =
    data?.winner_id != null
      ? String(data.winner_id)
      : null;

  if (!winnerId) {
    log(
      `onMatchResult ignored: missing/empty winner_id from ${ws.playerId} in session ${sessionId} (data=${JSON.stringify(data)}).`
    );

    return;
  }

  const reports =
    matchReports.get(sessionId) || {};

  reports[ws.playerId] =
    winnerId;

  matchReports.set(
    sessionId,
    reports
  );

  const reportedScore =
    Number(data?.score);

  const scores =
    matchScores.get(sessionId) || {};

  scores[ws.playerId] =
    Number.isFinite(reportedScore)
      ? reportedScore
      : 0;

  matchScores.set(
    sessionId,
    scores
  );

  log(
    `matchResult from ${ws.playerId} in session ${sessionId}: winner=${winnerId} score=${scores[ws.playerId]}`
  );

  const playerIds =
    sessionPlayerIds(sessionId);

  if (playerIds.length < 2) {
    // No opponent to reconcile with yet.
    return;
  }

  if (
    !playerIds.every(
      (pid) => reports[pid]
    )
  ) {
    // Still waiting on the other report.
    log(
      `Still waiting on second report for session ${sessionId}: reports so far=${JSON.stringify(reports)}`
    );

    return;
  }

  const [reportA, reportB] =
    playerIds.map(
      (pid) => reports[pid]
    );

  /*
   * The two clients disagree.
   *
   * refundSessionBets() contains the actual duplicate protection.
   */
  if (
    reportA !== reportB ||
    !playerIds.includes(reportA)
  ) {
    log(
      `Match result mismatch in session ${sessionId}: ${reportA} vs ${reportB}`
    );

    await refundSessionBets(
      sessionId,
      "The two clients disagreed on the winner, so bets were refunded."
    );

    return;
  }

  /*
   * We have BOTH reports and they agree.
   *
   * Claim the session BEFORE any await.
   *
   * This is the payout equivalent of the refund lock.
   */
  if (
    resolvingSessions.has(sessionId)
  ) {
    log(
      `Skipping duplicate payout for session ${sessionId}`
    );

    return;
  }

  resolvingSessions.add(
    sessionId
  );

  /*
   * Captured outside the try block so the catch{} safety net below can
   * still see the bets that were in play even if the crash happens
   * after they were pulled out of the `bets` Map.
   */
  let capturedSessionBets = null;

  /*
   * Everything from here to the end of this function runs inside
   * try/finally so resolvingSessions.delete(sessionId) always fires -
   * on every return path below (missing bets, incomplete bookkeeping,
   * solo-side forfeit/refund, or a normal payout) and even if
   * something throws unexpectedly. Previously two of these paths
   * called a nonexistent `.remove()` on the Set (a TypeError) and two
   * others didn't release the lock at all, so a session could get
   * stuck "resolving" forever after its first settlement attempt.
   */
  try {

  /*
   * Take the bets out of active state immediately.
   *
   * This prevents another event from seeing the same active bets
   * while the economy API request below is running.
   */
  const sessionBets =
    bets.get(sessionId);

  capturedSessionBets = sessionBets;

  bets.delete(sessionId);

  /*
   * Match reports are no longer needed once the result has been
   * accepted for settlement.
   */
  matchReports.delete(
    sessionId
  );

  const sessionScores =
    matchScores.get(sessionId) || {};

  matchScores.delete(
    sessionId
  );

  if (!sessionBets) {
    log(
      `No bets found for settled session ${sessionId}`
    );
    return;
  }

  const winnerPlayerId =
    reportA;

  const entries =
    Object.entries(sessionBets);

  /*
   * Only one side ever placed a bet.
   * Return that stake instead of paying out a winner.
   */
  if (entries.length === 1) {
    const [playerId, bet] =
      entries[0];

    const soloBettorWon =
      playerId === winnerPlayerId;

    /*
     * The lone bettor placed a bet, had no opponent bet to match
     * against, and WON anyway.
     *
     * There's no opponent stake to fund a normal pot-based payout
     * from, so historically this just fell through to the same flat
     * refund as every other solo-bet case below - meaning a solo win
     * was worth exactly as much as a solo loss (or no match at all).
     *
     * When FREE_MONEY_ON_SOLO_LOSS is on, we instead credit the usual
     * score-based bonus on top of their own stake (house-funded, same
     * math as a normal payout / the solo-loss forfeit below) so a
     * solo win is actually rewarded instead of falling back to a
     * break-even refund.
     */
    if (
      soloBettorWon &&
      FREE_MONEY_ON_SOLO_LOSS
    ) {
      const scoreValues =
        playerIds.map(
          (pid) =>
            sessionScores[pid] || 0
        );

      const lowestScore =
        Math.min(...scoreValues);

      const bonusPercent =
        Math.max(
          0,
          Math.min(
            MAX_BONUS_PERCENT,
            Math.floor(lowestScore)
          )
        );

      const winAmount =
        Math.ceil(
          bet.amount *
            (1 + bonusPercent / 100)
        );

      const bonusAmount =
        winAmount - bet.amount;

      try {
        await unbAdjustBalanceWithRetry(
          bet.discordId,
          winAmount,
          bonusPercent > 0
            ? `Gwent bet payout (opponent never bet, +${bonusPercent}% score bonus)`
            : "Gwent bet payout (opponent never bet)"
        );

        await dm(
          bet.discordId,
          `\uD83C\uDFC6 Your opponent never placed a bet, but you won the match, so your **${bet.amount}** stake was returned${
            bonusAmount > 0
              ? ` plus a ${bonusPercent}% score bonus, **+${bonusAmount}** extra (**${winAmount}** total)`
              : ""
          }.`
        );
      } catch (e) {
        log(
          "Single-side win payout failed:",
          e.message
        );

        await dm(
          bet.discordId,
          `\u26A0\uFE0F You won, but crediting your **${winAmount}** stake + bonus failed. Please contact an admin.`
        );
      }

      pushIntegration(
        playerId,
        {
          actiontype: "payout",
          actionvalue: winAmount,
          bonusPercent,
          by: bet.discordId,
          betpool: 0,

          me: await buildSnapshot(
            bet.discordId,
            0
          ),

          op: null,
        }
      );

      log(
        `Single-side win payout for session ${sessionId}: stake=${bet.amount} bonus=${bonusPercent}% (+${bonusAmount}) -> ${winAmount}`
      );

      return;
    }

    /*
     * The lone bettor placed a bet, had no opponent bet to match
     * against, and LOST the match anyway.
     *
     * Normally (and still, when soloBettorWon, or when the feature
     * below is disabled/misconfigured) we just refund their stake -
     * there's no opponent bet to pay out from, so a wash is the
     * fairest default.
     *
     * When FREE_MONEY_ON_SOLO_LOSS is on, we instead forfeit that
     * stake (with the same score bonus a normal payout would get)
     * into the configured free-money channel as a first-come-first-
     * served claim, rather than refunding it.
     */
    if (
      !soloBettorWon &&
      FREE_MONEY_ON_SOLO_LOSS
    ) {
      const scoreValues =
        playerIds.map(
          (pid) =>
            sessionScores[pid] || 0
        );

      const lowestScore =
        Math.min(...scoreValues);

      const bonusPercent =
        Math.max(
          0,
          Math.min(
            MAX_BONUS_PERCENT,
            Math.floor(lowestScore)
          )
        );

      const freeMoneyAmount =
        Math.ceil(
          bet.amount *
            (1 + bonusPercent / 100)
        );

      const bonusAmount =
        freeMoneyAmount - bet.amount;

      const posted =
        await postFreeMoneyMessage(
          freeMoneyAmount,
          sessionId,
          bet.amount,
          bonusPercent,
          bonusAmount
        );

      if (posted) {
        await dm(
          bet.discordId,
          `\uD83D\uDCB0 Your opponent never placed a bet, and you lost the match, so your **${bet.amount}** stake was **not** refunded - it's now up for grabs in the free money channel (stake **${bet.amount}**${
            bonusAmount > 0
              ? ` + ${bonusPercent}% score bonus, **${bonusAmount}** extra`
              : ""
          }, **${freeMoneyAmount}** total).`
        );

        pushIntegration(
          playerId,
          {
            actiontype: "solo_loss_forfeit",
            actionvalue: bet.amount,
            bonusPercent,
            by: null,
            betpool: 0,

            me: await buildSnapshot(
              bet.discordId,
              0
            ),

            op: null,
          }
        );

        log(
          `Solo-loss stake of ${bet.amount} + ${bonusPercent}% bonus (${bonusAmount}) = ${freeMoneyAmount} forfeited to the free money channel for session ${sessionId}`
        );

        return;
      }

      /*
       * Posting to the free money channel failed (channel not
       * configured, fetch/send error, etc.) - fall through to the
       * normal refund below instead of silently eating the stake.
       */
      log(
        `Falling back to refund for session ${sessionId} because the free money post failed`
      );
    }

    try {
      await unbAdjustBalanceWithRetry(
        bet.discordId,
        bet.amount,
        "Gwent bet refund (opponent never bet)"
      );

      await dm(
        bet.discordId,
        `\u2139\uFE0F Your opponent never placed a bet, so your **${bet.amount}** stake was returned.`
      );
    } catch (e) {
      log(
        "Single-side refund failed:",
        e.message
      );

      await dm(
        bet.discordId,
        `\u26A0\uFE0F Your **${bet.amount}** stake should have been returned, but the economy API call failed. Please contact an admin.`
      );
    }

    pushIntegration(
      playerId,
      {
        actiontype: "refund",
        actionvalue: bet.amount,
        by: null,
        betpool: 0,

        me: await buildSnapshot(
          bet.discordId,
          0
        ),

        op: null,
      }
    );

    log(
      `Single-side refund completed for session ${sessionId}`
    );

    return;
  }

  const loserPlayerId =
    playerIds.find(
      (pid) =>
        pid !== winnerPlayerId
    );

  const winnerBet =
    sessionBets[winnerPlayerId];

  const loserBet =
    sessionBets[loserPlayerId];

  /*
   * Safety check.
   *
   * We already removed the bets from active state, so even if
   * something is wrong with bookkeeping, another event cannot
   * refund/payout them again.
   */
  if (
    !winnerBet ||
    !loserBet
  ) {
    log(
      `Incomplete bet bookkeeping for session ${sessionId}: winnerPlayerId=${winnerPlayerId} loserPlayerId=${loserPlayerId} sessionBets=${JSON.stringify(
        sessionBets
      )} - refunding whatever bets exist instead of paying out.`
    );

    /*
     * Refund whatever bets actually exist.
     *
     * We cannot call refundSessionBets() here because the bets
     * have intentionally already been removed from the Map.
     */
    for (
      const bet of Object.values(sessionBets)
    ) {
      try {
        await unbAdjustBalanceWithRetry(
          bet.discordId,
          bet.amount,
          "Gwent bet refund (incomplete bookkeeping)"
        );

        await dm(
          bet.discordId,
          `\uD83D\uDD01 Your Gwent bet of **${bet.amount}** was refunded because the bet bookkeeping was incomplete.`
        );
      } catch (e) {
        log(
          `Safety refund failed for ${bet.discordId}:`,
          e.message
        );

        await dm(
          bet.discordId,
          `\u26A0\uFE0F Your Gwent bet of **${bet.amount}** could not be automatically refunded. Please contact an admin.`
        );
      }
    }
    return;
  }

  const pot =
    winnerBet.amount +
    loserBet.amount;

  /*
   * Score-based bonus:
   *
   * The LOWER of the two self-reported scores becomes the
   * payout percentage, capped at MAX_BONUS_PERCENT.
   */
  const scoreValues =
    playerIds.map(
      (pid) =>
        sessionScores[pid] || 0
    );

  const lowestScore =
    Math.min(...scoreValues);

  const bonusPercent =
    Math.max(
      0,
      Math.min(
        MAX_BONUS_PERCENT,
        Math.floor(lowestScore)
      )
    );

  const payout =
    Math.ceil(
      pot *
        (1 + bonusPercent / 100)
    );

  const bonusAmount =
    payout - pot;

  const reason =
    bonusPercent > 0
      ? `Gwent bet payout (+${bonusPercent}% score bonus)`
      : "Gwent bet payout";

  log(
    `Payout for session ${sessionId}: winner=${winnerBet.discordId} loser=${loserBet.discordId} winnerStake=${winnerBet.amount} loserStake=${loserBet.amount} pot=${pot} lowestScore=${lowestScore} bonus=${bonusPercent}% -> payout=${payout}`
  );

  /*
   * Pay winner.
   *
   * IMPORTANT:
   * The session is already locked and bets are already removed
   * from the active Map, so a duplicate event cannot perform
   * another payout.
   *
   * This is the single highest-stakes money call in the whole file - if
   * it fails, both players' stakes are already gone (deducted when the
   * bets were placed) and the winner just doesn't get paid, with nothing
   * left in local state to retry from later. unbAdjustBalanceWithRetry
   * absorbs transient failures (network blips, momentary 5xx/429s from
   * UnbelievaBoat) that a bare call would not. If it still fails after
   * retries, we log everything needed to pay the winner manually and, if
   * a free money channel is configured, also post a visible alert there
   * so it doesn't just sit unnoticed in the logs.
   */
  try {
    await unbAdjustBalanceWithRetry(
      winnerBet.discordId,
      payout,
      reason
    );

    await dm(
      winnerBet.discordId,
      `\uD83C\uDFC6 You won the Gwent match! **+${payout}** credited (${pot} pot${
        bonusAmount > 0
          ? ` + ${bonusPercent}% score bonus, ${bonusAmount} extra`
          : ""
      }).`
    );

    await dm(
      loserBet.discordId,
      `\uD83D\uDC94 You lost the Gwent match and your **${loserBet.amount}** stake.`
    );
  } catch (e) {
    log(
      `CRITICAL: payout FAILED for session ${sessionId} after retries - winner=${winnerBet.discordId} amount=${payout} (pot=${pot}, bonus=${bonusPercent}%) loser=${loserBet.discordId} loserStake=${loserBet.amount}: ${e.message}. Manual admin payout required.`
    );

    await dm(
      winnerBet.discordId,
      `\u26A0\uFE0F You won, but crediting your **${payout}** payout failed even after retries. Please contact an admin and mention session \`${sessionId}\` so they can pay you manually.`
    );

    // Best-effort visible alert, on top of the log line above, so this
    // doesn't just get buried - this is exactly the failure mode behind
    // reports of a winner not getting their money.
    if (FREE_MONEY_CHANNEL_ID && ready && client) {
      try {
        const alertChannel = await client.channels.fetch(
          FREE_MONEY_CHANNEL_ID
        );

        await alertChannel.send(
          `\uD83D\uDEA8 **Payout failure** - <@${winnerBet.discordId}> won a Gwent match (session \`${sessionId}\`) and should have been credited **${payout}** cash, but the economy API call failed after retries. Please pay them manually. (loser: <@${loserBet.discordId}>, error: ${e.message})`
        );
      } catch (e2) {
        log(
          `Also failed to post payout-failure alert for session ${sessionId}:`,
          e2.message
        );
      }
    }
  }

  pushIntegration(
    winnerPlayerId,
    {
      actiontype: "payout",
      actionvalue: payout,
      bonusPercent,
      by: winnerBet.discordId,
      betpool: 0,

      me: await buildSnapshot(
        winnerBet.discordId,
        0
      ),

      op: await buildSnapshot(
        loserBet.discordId,
        0
      ),
    }
  );

  pushIntegration(
    loserPlayerId,
    {
      actiontype: "payout",
      actionvalue: -loserBet.amount,
      by: winnerBet.discordId,
      betpool: 0,

      me: await buildSnapshot(
        loserBet.discordId,
        0
      ),

      op: await buildSnapshot(
        winnerBet.discordId,
        0
      ),
    }
  );

  log(
    `Payout settlement completed for session ${sessionId}`
  );
  } catch (e) {
    /*
     * Safety net for anything unexpected above (a bug, a bad assumption,
     * a thrown error we didn't anticipate) that isn't already caught
     * locally. Without this, an exception here would just propagate out
     * of onMatchResult with the bets already pulled out of `bets` and
     * nothing left to settle them from later - money silently stuck in
     * limbo, which matches the "winner didn't get paid, couldn't
     * reproduce" bug report. Instead: log everything needed to
     * reconstruct what happened, and best-effort refund any captured
     * bets so at minimum nobody is out their stake.
     */
    log(
      `UNEXPECTED ERROR settling session ${sessionId} (winner=${reportA}): ${e?.stack || e}. capturedSessionBets=${JSON.stringify(
        capturedSessionBets
      )}`
    );

    if (capturedSessionBets) {
      for (const bet of Object.values(capturedSessionBets)) {
        try {
          await unbAdjustBalanceWithRetry(
            bet.discordId,
            bet.amount,
            "Gwent bet refund (settlement crashed)"
          );

          await dm(
            bet.discordId,
            `\u26A0\uFE0F Something went wrong settling your Gwent match, so your **${bet.amount}** stake was refunded rather than risk it being lost.`
          );

          log(
            `Safety-net refund succeeded for ${bet.discordId} (${bet.amount}) in session ${sessionId}`
          );
        } catch (e2) {
          log(
            `CRITICAL: safety-net refund FAILED for ${bet.discordId} amount=${bet.amount} session=${sessionId}: ${e2.message}. Manual admin reconciliation required.`
          );

          await dm(
            bet.discordId,
            `\u26A0\uFE0F Something went wrong settling your Gwent match and we could not automatically refund your **${bet.amount}** stake. Please contact an admin and mention session \`${sessionId}\`.`
          ).catch(() => {});
        }
      }
    } else {
      log(
        `No captured bets to safety-refund for session ${sessionId} - if money is missing here, it needs manual admin reconciliation.`
      );
    }
  } finally {
    resolvingSessions.delete(sessionId);
  }
}


// ---------- Discord command handling ----------

function usage(cmd) {
  const table = {
    registerclient:
      "!registerclient <id>",

    gwentbet:
      "!gwentbet <amount>",

    gwentgiveaway:
      "!gwentgiveaway <amount>",

    gwentspawn:
      "!gwentspawn <amount>",

    gwentcoinflip:
      "!gwentcoinflip <amount>",

 //   gwenttip:
 //     "!gwenttip <@user> <amount>",

    gwentlottery:
      "!gwentlottery",

    gwentlotteryleave:
      "!gwentlotteryleave",

    gwentlotterystatus:
      "!gwentlotterystatus",

    gwentlotteryodds:
      "!gwentlotteryodds",

    gwentlotteryadd:
      "!gwentlotteryadd <amount>",

    gwentlotterydraw:
      "!gwentlotterydraw",
  };

  return (
    table[cmd] ||
    `!${cmd}`
  );
}


async function handleRegisterClient(
  message,
  args
) {
  const playerId =
    (args[0] || "").trim();

  if (!playerId) {
    return message.reply(
      `Usage: \`${usage("registerclient")}\``
    );
  }

  const ws =
    deps.playerSockets[playerId];

  if (!ws) {
    return message.reply(
      "No connected game client with that id. Make sure the game is open and the id is correct."
    );
  }

  const conflictingDiscord =
    registerByPlayer.get(playerId);

  if (
    conflictingDiscord &&
    conflictingDiscord !==
      message.author.id
  ) {
    return message.reply(
      "That client id is already registered to another Discord user."
    );
  }

  const conflictingPlayer =
    registerByDiscord.get(
      message.author.id
    );

  if (
    conflictingPlayer &&
    conflictingPlayer !== playerId
  ) {
    return message.reply(
      `You're already registered to client \`${conflictingPlayer}\`. Run \`!gwentunregister\` first.`
    );
  }

  registerByDiscord.set(
    message.author.id,
    playerId
  );

  registerByPlayer.set(
    playerId,
    message.author.id
  );

  ws.dcUserId =
    message.author.id;

  await message.reply(
    `\u2705 Linked to client \`${playerId}\`. You can now use \`!gwentbet <amount>\` once you're in a match.`
  );

  log(
    `Registered client ${playerId} <-> discord ${message.author.id}`
  );

  if (ws.sessionId) {
    await broadcastSessionState(
      ws.sessionId,
      "registered",
      null,
      message.author.id
    );
  } else {
    pushIntegration(
      playerId,
      {
        actiontype: "registered",
        actionvalue: null,
        by: message.author.id,
        betpool: 0,

        me: await buildSnapshot(
          message.author.id,
          0
        ),

        op: null,
      }
    );
  }

  // Second ws message: push the linked Discord user's inventory.
  await pushInventorySnapshot(
    playerId,
    message.author.id
  );
}


async function handleUnregister(
  message
) {
  const playerId =
    registerByDiscord.get(
      message.author.id
    );

  if (!playerId) {
    return message.reply(
      "You're not registered."
    );
  }

  const sessionId =
    deps.playerSockets[playerId]
      ?.sessionId;

  if (
    sessionId &&
    bets.get(sessionId)?.[playerId]
  ) {
    return message.reply(
      "You have an active bet on your current match - it needs to finish (or the session end) before you can unregister."
    );
  }

  registerByDiscord.delete(
    message.author.id
  );

  registerByPlayer.delete(
    playerId
  );

  lastDmRequestAt.delete(
    playerId
  );

  pushIntegration(
    playerId,
    {
      actiontype: "unregistered",
      actionvalue: null,
      by: message.author.id,
      betpool: 0,
      me: null,
      op: null,
    }
  );

  return message.reply(
    "\u2705 Unregistered."
  );
}


async function handleBet(
  message,
  args
) {
  const playerId =
    registerByDiscord.get(
      message.author.id
    );

  if (!playerId) {
    return message.reply(
      "Register first with `!registerclient <id>`."
    );
  }

  const ws =
    deps.playerSockets[playerId];

  if (!ws) {
    return message.reply(
      "Your registered game client isn't connected anymore. Re-register with `!registerclient <id>`."
    );
  }

  const sessionId =
    ws.sessionId;

  const session =
    sessionId
      ? deps.sessions[sessionId]
      : null;

  if (
    !session ||
    session.players.length < 2
  ) {
    return message.reply(
      "You need to be in a match with an opponent connected before you can bet."
    );
  }

  /*
   * Do not allow new money operations after settlement has started.
   */
  if (
    sessionId &&
    resolvingSessions.has(sessionId)
  ) {
    return message.reply(
      "This match is already being settled. Please wait for it to finish."
    );
  }

  const amount =
    Number.parseInt(
      args[0],
      10
    );

  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return message.reply(
      `Usage: \`${usage("gwentbet")}\` - amount must be a positive whole number.`
    );
  }

  const sessionBets =
    bets.get(sessionId) || {};

  const existingBet =
    sessionBets[playerId];

  try {
    const balance =
      await unbGetBalance(
        message.author.id
      );

    if (
      (balance.cash ?? 0) <
      amount
    ) {
      return message.reply(
        `You only have **${balance.cash}** cash, which isn't enough to add **${amount}** to your bet.`
      );
    }

    await unbAdjustBalance(
      message.author.id,
      -amount,
      "Gwent bet"
    );
  } catch (e) {
    log(
      "Bet withdrawal failed:",
      e.message
    );

    return message.reply(
      "Couldn't reach the economy bot to place your bet. Try again shortly."
    );
  }

  if (existingBet) {
    existingBet.amount +=
      amount;
  } else {
    sessionBets[playerId] = {
      discordId:
        message.author.id,
      amount,
    };
  }

  bets.set(
    sessionId,
    sessionBets
  );

  const totalBet =
    sessionBets[playerId].amount;

  await message.reply(
    existingBet
      ? `\uD83D\uDCB0 Added **${amount}** to your bet. Total now: **${totalBet}**.`
      : `\uD83D\uDCB0 Bet placed: **${amount}** locked in.`
  );

  const opponentPlayerId =
    sessionPlayerIds(
      sessionId
    ).find(
      (pid) =>
        pid !== playerId
    );

  const opponentBet =
    opponentPlayerId &&
    sessionBets[
      opponentPlayerId
    ];

  await broadcastSessionState(
    sessionId,
    "bet_placed",
    amount,
    message.author.id
  );

  if (opponentBet) {
    const pot =
      totalBet +
      opponentBet.amount;

    await broadcastSessionState(
      sessionId,
      "both_bet",
      pot,
      null
    );

    await dm(
      message.author.id,
      `Both players have bet. Pot: **${pot}**. Good luck!`
    );

    await dm(
      opponentBet.discordId,
      `Both players have bet. Pot: **${pot}**. Good luck!`
    );
  }
}


async function handleStatus(
  message
) {
  const playerId =
    registerByDiscord.get(
      message.author.id
    );

  if (!playerId) {
    return message.reply(
      "Not registered. Use `!registerclient <id>`."
    );
  }

  const ws =
    deps.playerSockets[playerId];

  const connected =
    !!ws;

  const sessionId =
    ws?.sessionId;

  const bet =
    sessionId
      ? bets.get(sessionId)?.[
          playerId
        ]
      : null;

  return message.reply(
    [
      `Client: \`${playerId}\` (${connected ? "connected" : "disconnected"})`,
      sessionId
        ? `Session: \`${sessionId}\``
        : "Session: none",
      bet
        ? `Current bet: **${bet.amount}**`
        : "Current bet: none",
    ].join("\n")
  );
}


async function handleInventory(
  message
) {
  try {
    const inv =
      await unbGetInventory(
        message.author.id
      );

    const items =
      inv.items || [];

    log(
      `Inventory command for ${message.author.id}: ${items.length} item(s)`
    );

    if (!items.length) {
      return message.reply(
        "Your inventory is empty."
      );
    }

    const shown =
      items.slice(0, 15);

    const lines =
      shown.map(
        (it) =>
          `\u2022 ${it.name} x${it.quantity ?? 1}`
      );

    const more =
      items.length >
      shown.length
        ? `\n…and ${items.length - shown.length} more.`
        : "";

    return message.reply(
      `**Your inventory:**\n${lines.join("\n")}${more}`
    );
  } catch (e) {
    log(
      "Inventory command failed:",
      e.message
    );

    return message.reply(
      "Couldn't reach the economy bot to fetch your inventory."
    );
  }
}


async function handleLeaderboard(
  message,
  args
) {
  const limit =
    Math.min(
      Math.max(
        Number.parseInt(
          args[0],
          10
        ) || 5,
        1
      ),
      15
    );

  try {
    const data =
      await unbGetLeaderboard({
        limit,
      });

    const users =
      data.users ||
      data ||
      [];

    log(
      `Leaderboard command for ${message.author.id}: ${users.length} row(s)`
    );

    if (!users.length) {
      return message.reply(
        "Leaderboard is empty."
      );
    }

    const lines =
      users
        .slice(0, limit)
        .map(
          (u, i) =>
            `${i + 1}. <@${u.user_id}> - **${u.cash ?? u.total ?? 0}**`
        );

    return message.reply(
      `**Top ${lines.length} cash balances:**\n${lines.join("\n")}`
    );
  } catch (e) {
    log(
      "Leaderboard command failed:",
      e.message
    );

    return message.reply(
      "Couldn't reach the economy bot to fetch the leaderboard."
    );
  }
}


// ---------- Giveaway / spawn / coinflip / tip ----------

// User-funded: takes <amount> out of the caller's own balance and posts
// it to the free money channel as a first-come-first-served claim.

async function handleGiveaway(
  message,
  args
) {
  const amount =
    Number.parseInt(
      args[0],
      10
    );

  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return message.reply(
      `Usage: \`${usage("gwentgiveaway")}\` - amount must be a positive whole number.`
    );
  }

  if (!FREE_MONEY_CHANNEL_ID) {
    return message.reply(
      "The free money channel isn't configured, so giveaways are disabled."
    );
  }

  log(
    `Giveaway requested by ${message.author.id}: ${amount}`
  );

  try {
    const balance =
      await unbGetBalance(
        message.author.id
      );

    if (
      (balance.cash ?? 0) <
      amount
    ) {
      return message.reply(
        `You only have **${balance.cash}** cash, which isn't enough to give away **${amount}**.`
      );
    }

    await unbAdjustBalanceWithRetry(
      message.author.id,
      -amount,
      "Gwent giveaway (user funded)"
    );
  } catch (e) {
    log(
      "Giveaway withdrawal failed:",
      e.message
    );

    return message.reply(
      "Couldn't reach the economy bot to take that money from you. Try again shortly."
    );
  }

  const posted =
    await postFreeMoneyMessage(
      amount,
      `giveaway:${message.author.id}`,
      amount,
      0,
      0,
      `\uD83C\uDF81 <@${message.author.id}> is giving away **${amount}** cash! First to click claims it.`
    );

  if (!posted) {
    /*
     * We already took the money - if we can't post the claim message,
     * refund it immediately rather than letting it silently vanish.
     */
    try {
      await unbAdjustBalanceWithRetry(
        message.author.id,
        amount,
        "Gwent giveaway refund (post failed)"
      );

      log(
        `Refunded failed giveaway of ${amount} to ${message.author.id}`
      );
    } catch (e) {
      log(
        `CRITICAL: failed to refund failed giveaway of ${amount} to ${message.author.id}: ${e.message}. Manual admin reconciliation required.`
      );

      return message.reply(
        `\u26A0\uFE0F Took **${amount}** from you but failed to post the giveaway AND failed to refund it. Please contact an admin immediately.`
      );
    }

    return message.reply(
      "Couldn't post the giveaway message, so your money was refunded."
    );
  }

  log(
    `Giveaway posted: ${amount} from ${message.author.id} to the free money channel`
  );

  return message.reply(
    `\uD83C\uDF81 **${amount}** taken from your balance and posted to <#${FREE_MONEY_CHANNEL_ID}> - first click gets it!`
  );
}

// Admin-only: posts <amount> freshly-created cash (not taken from
// anyone) to the free money channel.

async function handleSpawnMoney(
  message,
  args
) {
  if (!isAdmin(message)) {
    return message.reply(
      "You need to be an admin to use this command."
    );
  }

  const amount =
    Number.parseInt(
      args[0],
      10
    );

  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return message.reply(
      `Usage: \`${usage("gwentspawn")}\` - amount must be a positive whole number.`
    );
  }

  if (!FREE_MONEY_CHANNEL_ID) {
    return message.reply(
      "The free money channel isn't configured."
    );
  }

  log(
    `Admin ${message.author.id} spawned ${amount} into the free money channel`
  );

  const posted =
    await postFreeMoneyMessage(
      amount,
      `admin-spawn:${message.author.id}`,
      amount,
      0,
      0,
      `\uD83C\uDF89 An admin dropped **${amount}** cash into this channel. First to click claims it!`
    );

  if (!posted) {
    return message.reply(
      "Failed to post the giveaway message. Check the bot's channel config/permissions."
    );
  }

  return message.reply(
    `\u2705 Spawned **${amount}** into <#${FREE_MONEY_CHANNEL_ID}>.`
  );
}

// Flip a coin against the house for <amount>, double or nothing.
// No opponent, no session, no database - just a direct economy call.

async function handleCoinflip(
  message,
  args
) {
  const amount =
    Number.parseInt(
      args[0],
      10
    );

  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return message.reply(
      `Usage: \`${usage("gwentcoinflip")}\` - amount must be a positive whole number.`
    );
  }

  try {
    const balance =
      await unbGetBalance(
        message.author.id
      );

    if (
      (balance.cash ?? 0) <
      amount
    ) {
      return message.reply(
        `You only have **${balance.cash}** cash, which isn't enough to flip **${amount}**.`
      );
    }
  } catch (e) {
    log(
      "Coinflip balance check failed:",
      e.message
    );

    return message.reply(
      "Couldn't reach the economy bot. Try again shortly."
    );
  }

  const won =
    Math.random() < 0.5;

  const delta =
    won ? amount : -amount;

  try {
    await unbAdjustBalanceWithRetry(
      message.author.id,
      delta,
      won
        ? "Gwent coinflip win"
        : "Gwent coinflip loss"
    );
  } catch (e) {
    log(
      "Coinflip settlement failed:",
      e.message
    );

    return message.reply(
      `\u26A0\uFE0F The coin landed, but crediting/debiting your **${amount}** failed. Please contact an admin.`
    );
  }

  log(
    `Coinflip: ${message.author.id} ${won ? "won" : "lost"} ${amount}`
  );

  return message.reply(
    won
      ? `\uD83E\uDE99 Heads up - you won! **+${amount}**.`
      : `\uD83E\uDE99 Tough luck - you lost **${amount}**.`
  );
}

// Send <amount> of your own cash directly to another Discord user.

async function handleTip(
  message,
  args
) {
  const target =
    message.mentions.users.first();

  const amount =
    Number.parseInt(
      args[1],
      10
    );

  if (
    !target ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return message.reply(
      `Usage: \`${usage("gwenttip")}\` - mention a user and give a positive whole amount.`
    );
  }

  if (
    target.id ===
    message.author.id
  ) {
    return message.reply(
      "You can't tip yourself."
    );
  }

  if (target.bot) {
    return message.reply(
      "You can't tip a bot."
    );
  }

  try {
    const balance =
      await unbGetBalance(
        message.author.id
      );

    if (
      (balance.cash ?? 0) <
      amount
    ) {
      return message.reply(
        `You only have **${balance.cash}** cash, which isn't enough to tip **${amount}**.`
      );
    }

    await unbAdjustBalanceWithRetry(
      message.author.id,
      -amount,
      `Gwent tip to ${target.id}`
    );
  } catch (e) {
    log(
      "Tip withdrawal failed:",
      e.message
    );

    return message.reply(
      "Couldn't reach the economy bot to take that money from you. Try again shortly."
    );
  }

  try {
    await unbAdjustBalanceWithRetry(
      target.id,
      amount,
      `Gwent tip from ${message.author.id}`
    );
  } catch (e) {
    /*
     * Money already taken from the sender - refund immediately rather
     * than stranding it.
     */
    log(
      `Tip credit to ${target.id} failed, refunding ${message.author.id}: ${e.message}`
    );

    try {
      await unbAdjustBalanceWithRetry(
        message.author.id,
        amount,
        "Gwent tip refund (credit failed)"
      );
    } catch (e2) {
      log(
        `CRITICAL: tip refund also failed for ${message.author.id}: ${e2.message}. Manual admin reconciliation required.`
      );

      return message.reply(
        `\u26A0\uFE0F Took **${amount}** from you but failed to send it AND failed to refund it. Please contact an admin immediately.`
      );
    }

    return message.reply(
      "Couldn't credit the recipient, so your money was refunded."
    );
  }

  log(
    `Tip: ${amount} from ${message.author.id} to ${target.id}`
  );

  return message.reply(
    `\uD83D\uDCB8 Sent **${amount}** to <@${target.id}>.`
  );
}


function handleHelp(message) {
  const lines = [
    "**Gwent Discord commands**",

    `\`${usage("registerclient")}\` - link your Discord account to a connected game client`,

    "`!gwentunregister` - clear your registration",

    `\`${usage("gwentbet")}\` - escrow cash as your match stake`,

    "`!gwentstatus` - show your registration/bet state",

    // "`!gwentinventory` - show your UnbelievaBoat inventory",

    // "`!gwentleaderboard [count]` - show the top cash balances (default 5, max 15)",

    `\`${usage("gwentgiveaway")}\` - give away your own cash in the free money channel`,

    `\`${usage("gwentcoinflip")}\` - flip a coin against the house, double or nothing`,

  //  `\`${usage("gwenttip")}\` - send cash to another user`,

    "`!gwenthelp` - show this message",
  ];

  if (lotteryConfigured()) {
    lines.push(
      "",
      "**Daily lottery**",

      `\`${usage("gwentlottery")}\` - buy a ticket (**${LOTTERY_TICKET_COST}** cash) for today's draw`,

      `\`${usage("gwentlotteryleave")}\` - leave this round and get refunded`,

      `\`${usage("gwentlotterystatus")}\` - show the current pool/entrants`,

      `\`${usage("gwentlotteryodds")}\` - show your odds this round`
    );
  }

  if (isAdmin(message)) {
    lines.push(
      "",
      `\`${usage("gwentspawn")}\` - (admin) drop fresh cash into the free money channel`
    );

    if (lotteryConfigured()) {
      lines.push(
        `\`${usage("gwentlotteryadd")}\` - (admin) add bonus cash to the lottery pool`,

        `\`${usage("gwentlotterydraw")}\` - (admin) force an immediate lottery draw`
      );
    }
  }

  return message.reply(
    lines.join("\n")
  );
}


// ---------- Discord message handling ----------

async function onMessageCreate(
  message
) {
  if (message.author.bot) {
    return;
  }

  if (
    message.guildId !==
    GUILD_ID
  ) {
    return;
  }

  if (
    !message.content.startsWith("!")
  ) {
    return;
  }

  const [
    cmdRaw,
    ...args
  ] =
    message.content
      .slice(1)
      .trim()
      .split(/\s+/);

  const cmd =
    cmdRaw.toLowerCase();

  try {
    if (
      cmd ===
      "registerclient"
    ) {
      return void (
        await handleRegisterClient(
          message,
          args
        )
      );
    }

    if (
      cmd ===
      "gwentunregister"
    ) {
      return void (
        await handleUnregister(
          message
        )
      );
    }

    if (
      cmd ===
      "gwentbet"
    ) {
      return void (
        await handleBet(
          message,
          args
        )
      );
    }

    if (
      cmd ===
      "gwentstatus"
    ) {
      return void (
        await handleStatus(
          message
        )
      );
    }

    // disabled:
    // if (cmd === "gwentinventory")
    //   return void (await handleInventory(message));

    // if (cmd === "gwentleaderboard")
    //   return void (await handleLeaderboard(message, args));

    if (
      cmd ===
      "gwentgiveaway"
    ) {
      return void (
        await handleGiveaway(
          message,
          args
        )
      );
    }

    if (
      cmd ===
      "gwentspawn"
    ) {
      return void (
        await handleSpawnMoney(
          message,
          args
        )
      );
    }

    if (
      cmd ===
      "gwentcoinflip"
    ) {
      return void (
        await handleCoinflip(
          message,
          args
        )
      );
    }

    if (
      cmd ===
      "gwenttip" && "a" ==="b"
    ) {
      return void (
        await handleTip(
          message,
          args
        )
      );
    }

    if (
      cmd ===
      "gwentlottery"
    ) {
      return void (
        await handleLotteryJoin(
          message
        )
      );
    }

    if (
      cmd ===
      "gwentlotteryleave"
    ) {
      return void (
        await handleLotteryLeave(
          message
        )
      );
    }

    if (
      cmd ===
      "gwentlotterystatus"
    ) {
      return void (
        await handleLotteryStatus(
          message
        )
      );
    }

    if (
      cmd ===
      "gwentlotteryodds"
    ) {
      return void (
        await handleLotteryOdds(
          message
        )
      );
    }

    if (
      cmd ===
      "gwentlotteryadd"
    ) {
      return void (
        await handleLotteryAddMoney(
          message,
          args
        )
      );
    }

    if (
      cmd ===
      "gwentlotterydraw"
    ) {
      return void (
        await handleLotteryDraw(
          message
        )
      );
    }

    if (
      cmd ===
      "gwenthelp"
    ) {
      return void handleHelp(
        message
      );
    }
  } catch (e) {
    log(
      `Command "${cmd}" threw:`,
      e
    );

    try {
      await message.reply(
        "Something went wrong handling that command."
      );
    } catch (e2) {}
  }
}


// ---------- Rotating bot status ----------

let statusList = [];

const ACTIVITY_TYPE_MAP =
  ActivityType
    ? {
        PLAYING:
          ActivityType.Playing,

        STREAMING:
          ActivityType.Streaming,

        LISTENING:
          ActivityType.Listening,

        WATCHING:
          ActivityType.Watching,

        COMPETING:
          ActivityType.Competing,

        CUSTOM:
          ActivityType.Custom,
      }
    : {};


function normalizeStatusList(
  json
) {
  const arr =
    Array.isArray(json)
      ? json
      : Object.values(
          json || {}
        );

  return arr.filter(
    (entry) =>
      entry &&
      typeof entry ===
        "object" &&
      !Array.isArray(
        entry
      ) &&
      typeof entry.name ===
        "string" &&
      entry.name.trim()
  );
}


function resolveStatusPlaceholders(
  text
) {
  if (!text) {
    return text;
  }

  const guild =
    ready &&
    GUILD_ID
      ? client.guilds.cache.get(
          GUILD_ID
        )
      : null;

  const playerCount =
    Object.keys(
      deps.playerSockets || {}
    ).length;

  const sessionCount =
    Object.keys(
      deps.sessions || {}
    ).length;

  const uptimeMinutes =
    client?.uptime
      ? Math.floor(
          client.uptime /
            60000
        )
      : 0;

  return text
    .replace(
      /\{guild\}/g,
      guild?.name ||
        "the server"
    )
    .replace(
      /\{members\}/g,
      guild
        ? String(
            guild.memberCount
          )
        : "0"
    )
    .replace(
      /\{players\}/g,
      String(
        playerCount
      )
    )
    .replace(
      /\{sessions\}/g,
      String(
        sessionCount
      )
    )
    .replace(
      /\{registered\}/g,
      String(
        registerByPlayer.size
      )
    )
    .replace(
      /\{uptime\}/g,
      `${uptimeMinutes}m`
    );
}


async function refreshStatusList() {
  if (!STATUS_URL) {
    return;
  }

  try {
    const res =
      await fetch(
        STATUS_URL,
        {
          cache:
            "no-store",
        }
      );

    if (!res.ok) {
      log(
        `Status fetch failed: ${res.status}`
      );

      return;
    }

    statusList =
      normalizeStatusList(
        await res.json()
      );

    log(
      `Loaded ${statusList.length} bot statuses from ${STATUS_URL}`
    );
  } catch (e) {
    log(
      "Status fetch error:",
      e.message
    );
  }
}


function applyRandomStatus() {
  if (
    !ready ||
    statusList.length ===
      0
  ) {
    return;
  }

  const entry =
    statusList[
      Math.floor(
        Math.random() *
          statusList.length
      )
    ];

  try {
    client.user.setPresence({
      activities: [
        {
          name:
            resolveStatusPlaceholders(
              entry.name
            ),

          type:
            ACTIVITY_TYPE_MAP[
              String(
                entry.type ||
                  "PLAYING"
              ).toUpperCase()
            ] ?? 0,

          url: entry.url,
        },
      ],

      status:
        entry.status ||
        "online",
    });
  } catch (e) {
    log(
      "Failed to set presence:",
      e.message
    );
  }
}


// ---------- Public API ----------

exports.init =
  async function init({
    sessions,
    playerSockets,
    sendToClient,
  }) {
    deps = {
      sessions,
      playerSockets,
      sendToClient,
    };

    if (!Client) {
      log(
        'discord.js is not installed. Run "npm install discord.js" to enable Discord integration.'
      );

      return;
    }

    if (
      !BOT_TOKEN ||
      !GUILD_ID ||
      !ECONOMY_TOKEN
    ) {
      log(
        "dc_bot env var is missing token/guild_id/economybot - integration disabled."
      );

      return;
    }

    client =
      new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          /*
           * Needed for the lottery: reading who currently holds the
           * lottery role (role.members) and adding/removing that role
           * both rely on the guild members cache being populated. This
           * is a privileged intent - it must also be turned on for the
           * bot under "Server Members Intent" in the Discord Developer
           * Portal (Bot page), or login will be rejected.
           */
          GatewayIntentBits.GuildMembers,
        ],
      });

    client.on(
      "messageCreate",
      onMessageCreate
    );

    client.on(
      "interactionCreate",
      (interaction) => {
        if (
          !interaction.isButton?.() ||
          !interaction.customId?.startsWith(
            "givemecash:"
          )
        ) {
          return;
        }

        handleFreeMoneyClaim(
          interaction
        ).catch((e) =>
          log(
            "Unhandled error in handleFreeMoneyClaim:",
            e.message
          )
        );
      }
    );

    client.on(
      "error",
      (e) =>
        log(
          "Discord client error:",
          e.message
        )
    );

    await client.login(
      BOT_TOKEN
    );

    ready = true;

    await initLottery();

    if (STATUS_URL) {
      await refreshStatusList();

      applyRandomStatus();

      intervals.push(
        setInterval(
          refreshStatusList,
          25 * 60 * 1000
        )
      );

      intervals.push(
        setInterval(
          applyRandomStatus,
          1 * 60 * 1000
        )
      );
    }
  };


exports.onMatchResult =
  onMatchResult;

exports.onPlayerLeftSession =
  onPlayerLeftSession;

exports.onDisconnect =
  onDisconnect;

exports.onDmRequest =
  onDmRequest;


exports.stop =
  function stop() {
    ready = false;

    for (
      const id of intervals
    ) {
      clearInterval(id);
    }

    intervals.length = 0;

    if (client) {
      client.destroy().catch(
        () => {}
      );

      client = null;
    }
  };