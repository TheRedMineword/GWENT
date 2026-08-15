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

let Client, GatewayIntentBits, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle;

try {
  ({ Client, GatewayIntentBits, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js"));
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

let client = null;
let ready = false;

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
    const discordId = registerByPlayer.get(playerId);

    if (!discordId) {
      continue;
    }

    const opponentId = playerIds.find(
      (pid) => pid !== playerId
    );

    const opponentDiscordId = opponentId
      ? registerByPlayer.get(opponentId)
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

      me: await buildSnapshot(
        discordId,
        meBet
      ),

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
        await unbAdjustBalance(
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
  bonusAmount
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

    await channel.send({
      content: `\uD83D\uDCB0 A Gwent bet went unmatched and the loser's stake is up for grabs: **${amount}** cash total${bonusText}. First to click claims it!`,
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
    await unbAdjustBalance(
      interaction.user.id,
      amount,
      "Gwent free money claim (unmatched bet, solo loss)"
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
  if (!ready) {
    return;
  }

  const sessionId =
    ws.sessionId;

  if (
    !sessionId ||
    !deps.sessions[sessionId]
  ) {
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
        await unbAdjustBalance(
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
      await unbAdjustBalance(
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
      `Incomplete bet bookkeeping for session ${sessionId}`
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
        await unbAdjustBalance(
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
    `Payout for session ${sessionId}: pot=${pot} lowestScore=${lowestScore} bonus=${bonusPercent}% -> payout=${payout}`
  );

  /*
   * Pay winner.
   *
   * IMPORTANT:
   * The session is already locked and bets are already removed
   * from the active Map, so a duplicate event cannot perform
   * another payout.
   */
  try {
    await unbAdjustBalance(
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
      `Payout failed for session ${sessionId}:`,
      e.message
    );

    await dm(
      winnerBet.discordId,
      `\u26A0\uFE0F You won, but crediting your **${payout}** payout failed. Please contact an admin.`
    );
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


function handleHelp(message) {
  return message.reply(
    [
      "**Gwent Discord commands**",

      `\`${usage("registerclient")}\` - link your Discord account to a connected game client`,

      "`!gwentunregister` - clear your registration",

      `\`${usage("gwentbet")}\` - escrow cash as your match stake`,

      "`!gwentstatus` - show your registration/bet state",

      // "`!gwentinventory` - show your UnbelievaBoat inventory",

      // "`!gwentleaderboard [count]` - show the top cash balances (default 5, max 15)",

      "`!gwenthelp` - show this message",
    ].join("\n")
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