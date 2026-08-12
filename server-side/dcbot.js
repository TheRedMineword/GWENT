// server-side/dcbot.js
//
// Optional Discord integration for the Gwent server. Gated by:
//   dc_bot_integration_use=true
//   dc_bot={"token":"...","id":"...","economybot":"...","guild_id":"..."}
//   dc_bot_status=<url to a JSON array/object of bot statuses>   (optional)
//
// Discord commands (must be typed in the configured guild):
//   !registerclient <id>   Link your Discord account to a currently-connected
//                          game client (the id the game shows you). One
//                          Discord user <-> one client at a time. The link is
//                          cleared automatically when that client disconnects.
//   !gwentunregister        Manually clear your registration.
//   !gwentbet <amount>      Escrow <amount> cash from your UnbelievaBoat
//                          balance as your stake for the match your
//                          registered client is currently in.
//   !gwentstatus             Show your current registration/bet state.
//
// Game-client -> server websocket messages this module reacts to (handled in
// engine.js, which forwards them here):
//   { type: "matchResult", winner_id: "<playerId>" }
//     Sent when a match ends. BOTH clients in the session need to send this
//     and agree on the winner before any payout happens - if they disagree
//     (or only one ever reports), bets are refunded instead of paid out.
//   { type: "discord_dm_me", message: "<text>" }
//     Client asks the server to DM its registered Discord user the given
//     text. No-op if that client isn't registered.
//
// Server -> game-client websocket message this module sends:
//   { type: "discordintegration", actiontype, actionvalue, betpool, by, me, op }
//     Pushed to a connected client whenever something bet/registration
//     related happens in their session, so the client UI can react.
//     - actiontype: "registered" | "unregistered" | "bet_placed" |
//                   "both_bet" | "payout" | "refund" | "error"
//     - actionvalue: whatever number/string is relevant to actiontype
//                    (bet amount, payout amount, error code, etc.)
//     - betpool: current total pot for the session (0 once resolved)
//     - by: the Discord id of whoever triggered the action, or null
//     - me / op: { id, username, bet } for this client / their opponent,
//                or null if that side isn't registered
//
// State (registrations, pending bets, match reports) is kept in memory only,
// mirroring how engine.js keeps `sessions`/`players` in memory. It is NOT
// written into process.env - env vars are read-only config for a running
// process, not a place to persist mutable runtime state (they don't survive
// a restart and aren't shared across workers), so a plain in-memory Map is
// the right tool here. If you need bets to survive a server restart, swap
// the Maps below for reads/writes to your `database`/Xano layer.

let Client, GatewayIntentBits, ActivityType;
try {
  ({ Client, GatewayIntentBits, ActivityType } = require("discord.js"));
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

let client = null;
let ready = false;
let deps = { sessions: {}, playerSockets: {}, sendToClient: null };
const intervals = [];

// discordUserId <-> playerId (one-to-one, cleared on client disconnect)
const registerByDiscord = new Map();
const registerByPlayer = new Map();

// sessionId -> { [playerId]: { discordId, amount } }
const bets = new Map();
// sessionId -> { [playerId]: reportedWinnerPlayerId }
const matchReports = new Map();
// playerId -> last discord_dm_me timestamp (basic anti-spam)
const lastDmRequestAt = new Map();
const DM_REQUEST_COOLDOWN_MS = 5000;

function log(...args) {
  var log = "[dcbot]: "
  args.forEach((arg, i) => {
    try {
      log += JSON.stringify(arg);
    } catch {
      log += String(arg);
    }
  });
    try {
  console.log(log);
} catch (e){
  console.log("[dcbot]", ...args);
}
}

// ---------- UnbelievaBoat helpers ----------

async function unbGetBalance(userId) {
  const res = await fetch(`${UNB_BASE}/guilds/${GUILD_ID}/users/${userId}`, {
    headers: { Authorization: ECONOMY_TOKEN },
  });
  if (!res.ok) {
    throw new Error(`UnbelievaBoat GET balance ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function unbAdjustBalance(userId, cashDelta, reason) {
  const res = await fetch(`${UNB_BASE}/guilds/${GUILD_ID}/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: ECONOMY_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cash: cashDelta, reason: reason || "Gwent bet" }),
  });
  if (!res.ok) {
    throw new Error(`UnbelievaBoat PATCH balance ${res.status}: ${await res.text()}`);
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
  if (cached) return cached;
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
    username: user ? user.globalName || user.username : null,
    bet: bet || 0,
  };
}

function pushIntegration(playerId, payload) {
  const ws = deps.playerSockets[playerId];
  if (!ws || typeof deps.sendToClient !== "function") return;
  deps.sendToClient(ws, { type: "discordintegration", ...payload });
}

// Sends both players in a session their own me/op view of the same event.
async function broadcastSessionState(sessionId, actiontype, actionvalue, byDiscordId) {
  const playerIds = sessionPlayerIds(sessionId);
  const sessionBets = bets.get(sessionId) || {};

  for (const playerId of playerIds) {
    const discordId = registerByPlayer.get(playerId);
    if (!discordId) continue;

    const opponentId = playerIds.find((pid) => pid !== playerId);
    const opponentDiscordId = opponentId ? registerByPlayer.get(opponentId) : null;
    const meBet = sessionBets[playerId]?.amount || 0;
    const opBet = (opponentId && sessionBets[opponentId]?.amount) || 0;

    pushIntegration(playerId, {
      actiontype,
      actionvalue,
      by: byDiscordId || null,
      betpool: meBet + opBet,
      me: await buildSnapshot(discordId, meBet),
      op: opponentDiscordId ? await buildSnapshot(opponentDiscordId, opBet) : null,
    });
  }
}

// ---------- Core state helpers ----------

function sessionPlayerIds(sessionId) {
  const session = deps.sessions[sessionId];
  if (!session) return [];
  return session.players.map((p) => p.playerId);
}

async function refundSessionBets(sessionId, reasonText) {
  const sessionBets = bets.get(sessionId);
  if (!sessionBets) return;

  const ids = Object.keys(sessionBets);
  for (const [playerId, bet] of Object.entries(sessionBets)) {
    const opponentId = ids.find((id) => id !== playerId);
    const opponentDiscordId = opponentId ? sessionBets[opponentId].discordId : null;

    try {
      await unbAdjustBalance(bet.discordId, bet.amount, "Gwent bet refund");
      await dm(
        bet.discordId,
        `\uD83D\uDD01 Your Gwent bet of **${bet.amount}** was refunded. ${reasonText || ""}`,
      );
    } catch (e) {
      log(`Refund failed for ${bet.discordId} (session ${sessionId}):`, e.message);
      await dm(
        bet.discordId,
        `\u26A0\uFE0F Your Gwent bet of **${bet.amount}** should have been refunded but the economy API call failed. Please contact an admin.`,
      );
    }

    pushIntegration(playerId, {
      actiontype: "refund",
      actionvalue: bet.amount,
      by: null,
      betpool: 0,
      me: await buildSnapshot(bet.discordId, 0),
      op: opponentDiscordId ? await buildSnapshot(opponentDiscordId, 0) : null,
    });
  }

  bets.delete(sessionId);
  matchReports.delete(sessionId);
}

function clearRegistrationForPlayer(playerId, { notify = true } = {}) {
  const discordId = registerByPlayer.get(playerId);
  if (!discordId) return;
  registerByPlayer.delete(playerId);
  registerByDiscord.delete(discordId);
  lastDmRequestAt.delete(playerId);
  if (notify) {
    dm(discordId, "\uD83D\uDD0C Your game client disconnected, so your Gwent registration was cleared. Run `!registerclient <id>` again next time you play.");
  }
}

// ---------- Hooks called from engine.js ----------

// Called for every player that leaves a session before it's resolved
// (voluntary leave/cancel). Bets tied to that session are refunded.
async function onPlayerLeftSession(ws, sessionId) {
  if (!ready) return;
  await refundSessionBets(
    sessionId,
    "The match session ended before a result was recorded.",
  );
}

// Called on socket close/error. Refunds any bet tied to the player's current
// session and clears their Discord<->client registration.
async function onDisconnect(ws) {
  if (!ready) return;
  if (ws.sessionId) {
    await refundSessionBets(
      ws.sessionId,
      "A player disconnected before the match finished.",
    );
  }
  clearRegistrationForPlayer(ws.playerId);
}

// Called when a client asks the server to DM its linked Discord user.
async function onDmRequest(ws, data) {
  if (!ready) return;
  const discordId = registerByPlayer.get(ws.playerId);
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
  const last = lastDmRequestAt.get(ws.playerId) || 0;
  if (now - last < DM_REQUEST_COOLDOWN_MS) return;
  lastDmRequestAt.set(ws.playerId, now);

  const text = typeof data?.message === "string" ? data.message.trim().slice(0, 1800) : "";
  if (!text) return;

  await dm(discordId, text);
}

// Called when a client reports a match result. Waits for both players in the
// session to report and agree before paying out.
async function onMatchResult(ws, data) {
  if (!ready) return;
  const sessionId = ws.sessionId;
  if (!sessionId || !deps.sessions[sessionId]) return;

  const winnerId = data?.winner_id != null ? String(data.winner_id) : null;
  if (!winnerId) return;

  const reports = matchReports.get(sessionId) || {};
  reports[ws.playerId] = winnerId;
  matchReports.set(sessionId, reports);

  const playerIds = sessionPlayerIds(sessionId);
  if (playerIds.length < 2) return; // no opponent to reconcile with yet
  if (!playerIds.every((pid) => reports[pid])) return; // still waiting on the other report

  const [reportA, reportB] = playerIds.map((pid) => reports[pid]);
  const sessionBets = bets.get(sessionId);

  if (reportA !== reportB || !playerIds.includes(reportA)) {
    log(`Match result mismatch in session ${sessionId}: ${reportA} vs ${reportB}`);
    await refundSessionBets(sessionId, "The two clients disagreed on the winner, so bets were refunded.");
    matchReports.delete(sessionId);
    return;
  }

  const winnerPlayerId = reportA;
  matchReports.delete(sessionId);

  if (!sessionBets) return; // nobody bet on this match

  const entries = Object.entries(sessionBets);
  if (entries.length === 1) {
    // Only one side ever placed a bet - nothing to win, just return their stake.
    const [playerId, bet] = entries[0];
    try {
      await unbAdjustBalance(bet.discordId, bet.amount, "Gwent bet refund (opponent never bet)");
      await dm(bet.discordId, `\u2139\uFE0F Your opponent never placed a bet, so your **${bet.amount}** stake was returned.`);
    } catch (e) {
      log("Single-side refund failed:", e.message);
    }
    pushIntegration(playerId, {
      actiontype: "refund",
      actionvalue: bet.amount,
      by: null,
      betpool: 0,
      me: await buildSnapshot(bet.discordId, 0),
      op: null,
    });
    bets.delete(sessionId);
    return;
  }

  const loserPlayerId = playerIds.find((pid) => pid !== winnerPlayerId);
  const winnerBet = sessionBets[winnerPlayerId];
  const loserBet = sessionBets[loserPlayerId];

  if (!winnerBet || !loserBet) {
    // Shouldn't happen given the entries.length check above, but stay safe.
    await refundSessionBets(sessionId, "Bet bookkeeping was incomplete, so stakes were refunded.");
    return;
  }

  const pot = winnerBet.amount + loserBet.amount;

  try {
    await unbAdjustBalance(winnerBet.discordId, pot, "Gwent bet payout");
    await dm(winnerBet.discordId, `\uD83C\uDFC6 You won the Gwent match! **+${pot}** credited (your ${winnerBet.amount} stake + your opponent's ${loserBet.amount}).`);
    await dm(loserBet.discordId, `\uD83D\uDC94 You lost the Gwent match and your **${loserBet.amount}** stake.`);
  } catch (e) {
    log(`Payout failed for session ${sessionId}:`, e.message);
    await dm(winnerBet.discordId, `\u26A0\uFE0F You won, but crediting your **${pot}** payout failed. Please contact an admin.`);
  }

  pushIntegration(winnerPlayerId, {
    actiontype: "payout",
    actionvalue: pot,
    by: winnerBet.discordId,
    betpool: 0,
    me: await buildSnapshot(winnerBet.discordId, 0),
    op: await buildSnapshot(loserBet.discordId, 0),
  });
  pushIntegration(loserPlayerId, {
    actiontype: "payout",
    actionvalue: -loserBet.amount,
    by: winnerBet.discordId,
    betpool: 0,
    me: await buildSnapshot(loserBet.discordId, 0),
    op: await buildSnapshot(winnerBet.discordId, 0),
  });

  bets.delete(sessionId);
}

// ---------- Discord command handling ----------

function usage(cmd) {
  const table = {
    registerclient: "!registerclient <id>",
    gwentbet: "!gwentbet <amount>",
  };
  return table[cmd] || `!${cmd}`;
}

async function handleRegisterClient(message, args) {
  const playerId = (args[0] || "").trim();
  if (!playerId) return message.reply(`Usage: \`${usage("registerclient")}\``);

  const ws = deps.playerSockets[playerId];
  if (!ws) return message.reply("No connected game client with that id. Make sure the game is open and the id is correct.");

  const conflictingDiscord = registerByPlayer.get(playerId);
  if (conflictingDiscord && conflictingDiscord !== message.author.id) {
    return message.reply("That client id is already registered to another Discord user.");
  }

  const conflictingPlayer = registerByDiscord.get(message.author.id);
  if (conflictingPlayer && conflictingPlayer !== playerId) {
    return message.reply(`You're already registered to client \`${conflictingPlayer}\`. Run \`!gwentunregister\` first.`);
  }

  registerByDiscord.set(message.author.id, playerId);
  registerByPlayer.set(playerId, message.author.id);
  ws.dcUserId = message.author.id;

  await message.reply(`\u2705 Linked to client \`${playerId}\`. You can now use \`!gwentbet <amount>\` once you're in a match.`);

  if (ws.sessionId) {
    await broadcastSessionState(ws.sessionId, "registered", null, message.author.id);
  } else {
    pushIntegration(playerId, {
      actiontype: "registered",
      actionvalue: null,
      by: message.author.id,
      betpool: 0,
      me: await buildSnapshot(message.author.id, 0),
      op: null,
    });
  }
}

async function handleUnregister(message) {
  const playerId = registerByDiscord.get(message.author.id);
  if (!playerId) return message.reply("You're not registered.");

  const sessionId = deps.playerSockets[playerId]?.sessionId;
  if (sessionId && bets.get(sessionId)?.[playerId]) {
    return message.reply("You have an active bet on your current match - it needs to finish (or the session end) before you can unregister.");
  }

  registerByDiscord.delete(message.author.id);
  registerByPlayer.delete(playerId);
  lastDmRequestAt.delete(playerId);

  pushIntegration(playerId, {
    actiontype: "unregistered",
    actionvalue: null,
    by: message.author.id,
    betpool: 0,
    me: null,
    op: null,
  });

  return message.reply("\u2705 Unregistered.");
}

async function handleBet(message, args) {
  const playerId = registerByDiscord.get(message.author.id);
  if (!playerId) return message.reply("Register first with `!registerclient <id>`.");

  const ws = deps.playerSockets[playerId];
  if (!ws) return message.reply("Your registered game client isn't connected anymore. Re-register with `!registerclient <id>`.");

  const sessionId = ws.sessionId;
  const session = sessionId ? deps.sessions[sessionId] : null;
  if (!session || session.players.length < 2) {
    return message.reply("You need to be in a match with an opponent connected before you can bet.");
  }

  const amount = Number.parseInt(args[0], 10);
  if (!Number.isInteger(amount) || amount <= 0) {
    return message.reply(`Usage: \`${usage("gwentbet")}\` - amount must be a positive whole number.`);
  }

  const sessionBets = bets.get(sessionId) || {};
  if (sessionBets[playerId]) {
    return message.reply(`You already have **${sessionBets[playerId].amount}** on this match.`);
  }

  try {
    const balance = await unbGetBalance(message.author.id);
    if ((balance.cash ?? 0) < amount) {
      return message.reply(`You only have **${balance.cash}** cash, which isn't enough to bet **${amount}**.`);
    }

    await unbAdjustBalance(message.author.id, -amount, "Gwent bet");
  } catch (e) {
    log("Bet withdrawal failed:", e.message);
    return message.reply("Couldn't reach the economy bot to place your bet. Try again shortly.");
  }

  sessionBets[playerId] = { discordId: message.author.id, amount };
  bets.set(sessionId, sessionBets);

  await message.reply(`\uD83D\uDCB0 Bet placed: **${amount}** locked in.`);

  const opponentPlayerId = sessionPlayerIds(sessionId).find((pid) => pid !== playerId);
  const opponentBet = opponentPlayerId && sessionBets[opponentPlayerId];

  await broadcastSessionState(sessionId, "bet_placed", amount, message.author.id);

  if (opponentBet) {
    const pot = amount + opponentBet.amount;
    await broadcastSessionState(sessionId, "both_bet", pot, null);
    await dm(message.author.id, `Both players have bet. Pot: **${pot}**. Good luck!`);
    await dm(opponentBet.discordId, `Both players have bet. Pot: **${pot}**. Good luck!`);
  }
}

async function handleStatus(message) {
  const playerId = registerByDiscord.get(message.author.id);
  if (!playerId) return message.reply("Not registered. Use `!registerclient <id>`.");

  const ws = deps.playerSockets[playerId];
  const connected = !!ws;
  const sessionId = ws?.sessionId;
  const bet = sessionId ? bets.get(sessionId)?.[playerId] : null;

  return message.reply(
    [
      `Client: \`${playerId}\` (${connected ? "connected" : "disconnected"})`,
      sessionId ? `Session: \`${sessionId}\`` : "Session: none",
      bet ? `Current bet: **${bet.amount}**` : "Current bet: none",
    ].join("\n"),
  );
}

async function onMessageCreate(message) {
  if (message.author.bot) return;
  if (message.guildId !== GUILD_ID) return;
  if (!message.content.startsWith("!")) return;

  const [cmdRaw, ...args] = message.content.slice(1).trim().split(/\s+/);
  const cmd = cmdRaw.toLowerCase();

  try {
    if (cmd === "registerclient") return void (await handleRegisterClient(message, args));
    if (cmd === "gwentunregister") return void (await handleUnregister(message));
    if (cmd === "gwentbet") return void (await handleBet(message, args));
    if (cmd === "gwentstatus") return void (await handleStatus(message));
  } catch (e) {
    log(`Command "${cmd}" threw:`, e);
    try {
      await message.reply("Something went wrong handling that command.");
    } catch (e2) {}
  }
}

// ---------- Rotating bot status ----------
// dc_bot_status points at a JSON file that's a plain array of strings, e.g.
//   ["Gwent Ranked", "shuffling decks"]
// or an array of objects for more control, e.g.
//   [{"name":"Gwent Ranked","type":"WATCHING"}, {"name":"with cards","type":"PLAYING"}]
// Either shape works; strings are treated as { name, type: "PLAYING" }.

let statusList = [];

const ACTIVITY_TYPE_MAP = ActivityType
  ? {
      PLAYING: ActivityType.Playing,
      STREAMING: ActivityType.Streaming,
      LISTENING: ActivityType.Listening,
      WATCHING: ActivityType.Watching,
      COMPETING: ActivityType.Competing,
      CUSTOM: ActivityType.Custom,
    }
  : {};

function normalizeStatusList(json) {
  const arr = Array.isArray(json) ? json : Object.values(json || {});
  return arr
    .map((entry) => (typeof entry === "string" ? { name: entry, type: "PLAYING" } : entry))
    .filter((entry) => entry && entry.name);
}

async function refreshStatusList() {
  if (!STATUS_URL) return;
  try {
    const res = await fetch(STATUS_URL, { cache: "no-store" });
    if (!res.ok) {
      log(`Status fetch failed: ${res.status}`);
      return;
    }
    statusList = normalizeStatusList(await res.json());
    log(`Loaded ${statusList.length} bot statuses from ${STATUS_URL}`);
  } catch (e) {
    log("Status fetch error:", e.message);
  }
}

function applyRandomStatus() {
  if (!ready || statusList.length === 0) return;
  const entry = statusList[Math.floor(Math.random() * statusList.length)];
  try {
    client.user.setPresence({
      activities: [
        {
          name: entry.name,
          type: ACTIVITY_TYPE_MAP[String(entry.type || "PLAYING").toUpperCase()] ?? 0,
          url: entry.url,
        },
      ],
      status: entry.status || "online",
    });
  } catch (e) {
    log("Failed to set presence:", e.message);
  }
}

// ---------- Public API ----------

exports.init = async function init({ sessions, playerSockets, sendToClient }) {
  deps = { sessions, playerSockets, sendToClient };

  if (!Client) {
    log('discord.js is not installed. Run "npm install discord.js" to enable Discord integration.');
    return;
  }
  if (!BOT_TOKEN || !GUILD_ID || !ECONOMY_TOKEN) {
    log("dc_bot env var is missing token/guild_id/economybot - integration disabled.");
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on("messageCreate", onMessageCreate);
  client.on("error", (e) => log("Discord client error:", e.message));

  await client.login(BOT_TOKEN);
  ready = true;

  if (STATUS_URL) {
    await refreshStatusList();
    applyRandomStatus();
    intervals.push(setInterval(refreshStatusList, 25 * 60 * 1000));
    intervals.push(setInterval(applyRandomStatus, 1.25 * 60 * 1000));
  }
};

exports.onMatchResult = onMatchResult;
exports.onPlayerLeftSession = onPlayerLeftSession;
exports.onDisconnect = onDisconnect;
exports.onDmRequest = onDmRequest;

exports.stop = function stop() {
  ready = false;
  for (const id of intervals) clearInterval(id);
  intervals.length = 0;
  if (client) {
    client.destroy().catch(() => {});
    client = null;
  }
};