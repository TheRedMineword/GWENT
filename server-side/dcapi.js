'use strict';

// server-side/dcapi.js
//
// Replaces dcbot.js. All Discord-facing work (slash/prefix commands, DMs,
// UnbelievaBoat REST calls, the free-money button, the gateway connection
// itself) has moved out of this process into a separate bot that talks to
// us over HTTP. This file keeps:
//
//   - the match-settlement brain (agree-on-winner, pot math, the score
//     bonus, solo-side forfeits) - it never touched Discord directly even
//     in dcbot.js, so it's unchanged in spirit
//   - the websocket pushes to the *game client* (discordintegration /
//     discordinventory) - also never touched Discord directly
//
// ...and swaps every place that used to call unbAdjustBalance()/dm()/
// postFreeMoneyMessage() directly for one of two things instead:
//
//   1. A write to dcstate's local cash ledger (display-only, see dcstate.js)
//   2. A "scan" event pushed onto dcstate's outbound queue, which the
//      external bot polls (GET /api/dc?mode=scan) and actually acts on
//      against real Discord/UnbelievaBoat.
//
// ---------------------------------------------------------------------------
// Env config (same shape as dcbot.js's, minus everything Discord-gateway
// specific):
//
//   dc_bot_integration_use=true       gates whether this module does
//                                      anything at all (same flag engine.js
//                                      already checks before requiring us)
//   dc_api_free_money_on_solo_loss    "false" to disable the solo-loss
//                                      forfeit-to-free-money behavior
//                                      (defaults on, same as dcbot.js)
//
// ---------------------------------------------------------------------------
// HTTP surface (mounted by engine.js at /api/dc - see the comment above
// `router` near the bottom of this file for exactly how):
//
//   GET /api/dc?mode=register&userid=<discordId>&gwentid=<playerId>&username=<optional>
//     Link a Discord user to a currently-connected game client. 1:1 both
//     ways (registering either side again just relinks, same as dcbot.js).
//
//   GET /api/dc?mode=unregister&userid=<discordId>
//     Clear a registration. Rejected if that client has an active bet on
//     an unresolved match.
//
//   GET /api/dc?mode=bet&userid=<discordId>&amount=<n>
//     Record a bet for the caller's registered client's current session.
//     IMPORTANT: this only records the bet - the external bot is expected
//     to have already checked the user's UnbelievaBoat balance and
//     deducted `amount` from it *before* calling this (mirrors how
//     dcbot.js's !gwentbet deducted first, recorded second). If the bot's
//     deduction fails, it should just never call this endpoint.
//
//   GET /api/dc?mode=status&userid=<discordId>
//     Current registration/session/bet snapshot, for a !gwentstatus-style
//     command.
//
//   GET /api/dc?mode=addcash&userid=<discordId>&amount=<n>
//   GET /api/dc?mode=removecash&userid=<discordId>&amount=<n>
//     Adjust dcstate's local (display-only) cash ledger. Call these AFTER
//     the bot has already moved the real UnbelievaBoat money itself (e.g.
//     from its own !gwentgiveaway/!gwenttip commands), purely to keep the
//     game client's UI in sync. Never moves real money on its own.
//
//   GET /api/dc?mode=cash&userid=<discordId>
//     Read the local cash ledger for one user.
//
//   GET /api/dc?mode=scan
//     Drain and return the outbound event queue (dm/free/addcash/offline -
//     see dcstate.js for the exact shapes). Poll this every ~10s.
//
//   GET /api/dc?mode=push&gwentid=<playerId>&type=<wsType>&payload=<json>
//     Generic escape hatch: relays { type, ...JSON.parse(payload) } to
//     that client's websocket as-is. Used for things dcapi.js has no
//     opinion about, e.g. forwarding a freshly-fetched UnbelievaBoat
//     inventory as a "discordinventory" message (dcbot.js used to fetch
//     and push that itself right after registration; now the bot fetches
//     it and pushes it through here instead).
//
//   GET /api/dc?mode=health
//     JSON health snapshot (same info exports.getHealth() returns).
//
// Every handler responds 200 with { ok: true, ... } on success or
// { ok: false, error: "<code>" } on failure - never a non-2xx for a
// well-formed-but-rejected request, so the bot doesn't need special-case
// HTTP status handling on top of checking `ok`.
// ---------------------------------------------------------------------------

const express = require('express');
const state = require('./dcstate');

function log(...args) {
  console.log('[dcapi]', ...args);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Same default/behavior as dcbot.js's FREE_MONEY_ON_SOLO_LOSS, just made
// env-configurable since there's no code deploy tying it to a constant
// anymore.
const FREE_MONEY_ON_SOLO_LOSS =
  String(process.env.dc_api_free_money_on_solo_loss ?? 'true').toLowerCase() !==
  'false';

const MAX_BONUS_PERCENT = 15;

const DM_REQUEST_COOLDOWN_MS = 5000;
const lastDmRequestAt = new Map(); // playerId -> timestamp

let ready = false;

const health = {
  startedAt: Date.now(),
};

// ---------------------------------------------------------------------------
// Websocket pushes to the game client (unchanged in spirit from dcbot.js -
// these never talked to Discord, just to `sendToClient`).
//
// buildSnapshot() is now synchronous: dcbot.js had to await a Discord REST
// call (fetchDiscordUser) here every time. We have no Discord connection of
// our own anymore, so we just read whatever username the bot last told us
// via mode=register's `username` param (state.getUsername) - best-effort,
// cosmetic, and fine if stale or missing.
// ---------------------------------------------------------------------------

function pushIntegration(playerId, payload) {
  const deps = state.getDeps();
  const ws = deps.playerSockets[playerId];

  if (!ws || typeof deps.sendToClient !== 'function') {
    return;
  }

  deps.sendToClient(ws, {
    type: 'discordintegration',
    ...payload,
  });
}

function buildSnapshot(discordId, bet) {
  if (!discordId) return null;

  return {
    id: discordId,
    username: state.getUsername(discordId),
    bet: bet || 0,
  };
}

function sessionPlayerIds(sessionId) {
  const deps = state.getDeps();
  const session = deps.sessions[sessionId];

  if (!session) return [];

  return session.players.map((p) => p.playerId);
}

// Sends both players in a session their own me/op view of the same event.
function broadcastSessionState(sessionId, actiontype, actionvalue, byDiscordId) {
  const playerIds = sessionPlayerIds(sessionId);
  const sessionBets = state.getSessionBets(sessionId);

  for (const playerId of playerIds) {
    const discordId = state.getDiscordIdForPlayer(playerId);
    const opponentId = playerIds.find((pid) => pid !== playerId);
    const opponentDiscordId = opponentId ? state.getDiscordIdForPlayer(opponentId) : null;

    const meBet = sessionBets[playerId]?.amount || 0;
    const opBet = (opponentId && sessionBets[opponentId]?.amount) || 0;

    pushIntegration(playerId, {
      actiontype,
      actionvalue,
      by: byDiscordId || null,
      betpool: meBet + opBet,
      me: discordId ? buildSnapshot(discordId, meBet) : null,
      op: opponentDiscordId ? buildSnapshot(opponentDiscordId, opBet) : null,
    });
  }
}

// ---------------------------------------------------------------------------
// Refund path. Ported from dcbot.js's refundSessionBets(), same
// claim-before-any-await locking via dcstate.claimSession(), same
// "delete the bets immediately, keep a local copy to finish the refund
// with" shape. The only real change: instead of awaiting
// unbAdjustBalanceWithRetry()+dm() per player, we synchronously enqueue an
// addcash + dm scan event per player and move on - there's nothing left to
// await, so there's no failure path to catch here anymore either. If the
// external bot fails to apply an addcash event, that's now its problem to
// retry/alert on, not ours; we've durably queued it.
// ---------------------------------------------------------------------------

function refundSessionBets(sessionId, reasonText) {
  if (state.isResolving(sessionId)) {
    log(`Skipping duplicate refund for session ${sessionId}`);
    return;
  }

  const sessionBets = state.getSessionBets(sessionId);
  if (!sessionBets || Object.keys(sessionBets).length === 0) {
    return;
  }

  // Claim the session BEFORE anything else. claimSession() itself is the
  // atomic check-and-set (see dcstate.js), so this is race-safe even
  // though we already peeked with isResolving() above.
  if (!state.claimSession(sessionId)) {
    log(`Skipping duplicate refund for session ${sessionId}`);
    return;
  }

  try {
    const taken = state.takeSessionBets(sessionId);
    if (!taken) return;

    const ids = Object.keys(taken);

    for (const [playerId, bet] of Object.entries(taken)) {
      const opponentId = ids.find((id) => id !== playerId);
      const opponentDiscordId = opponentId ? taken[opponentId].discordId : null;

      state.enqueueEvent({
        a: 'addcash',
        dc: bet.discordId,
        val: bet.amount,
        reason: 'Gwent bet refund',
      });

      state.enqueueEvent({
        a: 'dm',
        dc: bet.discordId,
        msg: `\uD83D\uDD01 Your Gwent bet of **${bet.amount}** was refunded. ${reasonText || ''}`,
      });

      pushIntegration(playerId, {
        actiontype: 'refund',
        actionvalue: bet.amount,
        by: null,
        betpool: 0,
        me: buildSnapshot(bet.discordId, 0),
        op: opponentDiscordId ? buildSnapshot(opponentDiscordId, 0) : null,
      });
    }

    state.clearMatch(sessionId);

    log(`Refund settlement completed for session ${sessionId}`);
  } finally {
    state.releaseSession(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Match result. Ported from dcbot.js's onMatchResult() - same dual-report/
// agree/disagree logic, same solo-side special cases, same score bonus
// math. Money movement is the only thing that changed: every
// unbAdjustBalanceWithRetry() call became an `addcash` scan event, every
// dm() call became a `dm` scan event, and postFreeMoneyMessage() became a
// `free` scan event.
//
// One real behavior change worth flagging: dcbot.js's postFreeMoneyMessage
// returned a synchronous success/failure it could use to fall back to a
// plain refund if the channel post failed. We can't get that signal back
// through a polled queue, so a solo-loss forfeit (when the flag is on)
// always enqueues a `free` event and never falls back to a refund here -
// if the external bot fails to post the claim message, it now owns
// deciding what to do about that (retry, alert an admin, refund itself,
// etc.) rather than dcapi.js silently refunding behind its back.
// ---------------------------------------------------------------------------

function onMatchResult(ws, data) {
  log(`onMatchResult received: player=${ws?.playerId} sessionId=${ws?.sessionId} data=${JSON.stringify(data)}`);

  if (!ready) {
    log('onMatchResult ignored: dcapi not ready.');
    return;
  }

  const deps = state.getDeps();
  const sessionId = ws.sessionId;

  if (!sessionId || !deps.sessions[sessionId]) {
    log(
      `onMatchResult ignored: no active session for player ${ws?.playerId} (sessionId=${sessionId}). If a payout/refund was expected, check whether the session was removed prematurely.`
    );
    return;
  }

  if (state.isResolving(sessionId)) {
    log(`Ignoring matchResult for already-resolving session ${sessionId}`);
    return;
  }

  const winnerId = data?.winner_id != null ? String(data.winner_id) : null;

  if (!winnerId) {
    log(
      `onMatchResult ignored: missing/empty winner_id from ${ws.playerId} in session ${sessionId} (data=${JSON.stringify(data)}).`
    );
    return;
  }

  const { reports, scores } = state.reportResult(
    sessionId,
    ws.playerId,
    winnerId,
    Number(data?.score)
  );

  log(`matchResult from ${ws.playerId} in session ${sessionId}: winner=${winnerId} score=${scores[ws.playerId]}`);

  const playerIds = sessionPlayerIds(sessionId);

  if (playerIds.length < 2) {
    // No opponent to reconcile with yet.
    return;
  }

  if (!playerIds.every((pid) => reports[pid])) {
    log(`Still waiting on second report for session ${sessionId}: reports so far=${JSON.stringify(reports)}`);
    return;
  }

  const [reportA, reportB] = playerIds.map((pid) => reports[pid]);

  // The two clients disagree. refundSessionBets() contains the actual
  // duplicate protection.
  if (reportA !== reportB || !playerIds.includes(reportA)) {
    log(`Match result mismatch in session ${sessionId}: ${reportA} vs ${reportB}`);
    refundSessionBets(sessionId, 'The two clients disagreed on the winner, so bets were refunded.');
    return;
  }

  // Both reports agree - claim the session BEFORE anything else, same as
  // the refund path above.
  if (!state.claimSession(sessionId)) {
    log(`Skipping duplicate payout for session ${sessionId}`);
    return;
  }

  // Captured outside the try block so the catch{} safety net below can
  // still see the bets that were in play even after they were pulled out
  // of active state.
  let capturedSessionBets = null;

  try {
    const sessionBets = state.getSessionBets(sessionId);
    capturedSessionBets = sessionBets;

    const taken = state.takeSessionBets(sessionId);
    const sessionScores = scores; // accumulated for this session, both players by now

    state.clearMatch(sessionId);

    if (!taken || Object.keys(taken).length === 0) {
      log(`No bets found for settled session ${sessionId}`);
      return;
    }

    const winnerPlayerId = reportA;
    const entries = Object.entries(taken);

    // ---- Only one side ever placed a bet ----
    if (entries.length === 1) {
      const [playerId, bet] = entries[0];
      const soloBettorWon = playerId === winnerPlayerId;

      const scoreValues = playerIds.map((pid) => sessionScores[pid] || 0);
      const lowestScore = Math.min(...scoreValues);
      const bonusPercent = Math.max(0, Math.min(MAX_BONUS_PERCENT, Math.floor(lowestScore)));

      if (soloBettorWon && FREE_MONEY_ON_SOLO_LOSS) {
        const winAmount = Math.ceil(bet.amount * (1 + bonusPercent / 100));
        const bonusAmount = winAmount - bet.amount;

        state.enqueueEvent({
          a: 'addcash',
          dc: bet.discordId,
          val: winAmount,
          reason:
            bonusPercent > 0
              ? `Gwent bet payout (opponent never bet, +${bonusPercent}% score bonus)`
              : 'Gwent bet payout (opponent never bet)',
        });

        state.enqueueEvent({
          a: 'dm',
          dc: bet.discordId,
          msg: `\uD83C\uDFC6 Your opponent never placed a bet, but you won the match, so your **${bet.amount}** stake was returned${
            bonusAmount > 0
              ? ` plus a ${bonusPercent}% score bonus, **+${bonusAmount}** extra (**${winAmount}** total)`
              : ''
          }.`,
        });

        pushIntegration(playerId, {
          actiontype: 'payout',
          actionvalue: winAmount,
          bonusPercent,
          by: bet.discordId,
          betpool: 0,
          me: buildSnapshot(bet.discordId, 0),
          op: null,
        });

        log(
          `Single-side win payout for session ${sessionId}: stake=${bet.amount} bonus=${bonusPercent}% (+${bonusAmount}) -> ${winAmount}`
        );
        return;
      }

      if (!soloBettorWon && FREE_MONEY_ON_SOLO_LOSS) {
        const freeMoneyAmount = Math.ceil(bet.amount * (1 + bonusPercent / 100));
        const bonusAmount = freeMoneyAmount - bet.amount;

        state.enqueueEvent({
          a: 'free',
          val: freeMoneyAmount,
          reason:
            bonusPercent > 0
              ? `Gwent solo-loss forfeit (stake ${bet.amount} + ${bonusPercent}% score bonus)`
              : 'Gwent solo-loss forfeit',
        });

        state.enqueueEvent({
          a: 'dm',
          dc: bet.discordId,
          msg: `\uD83D\uDCB0 Your opponent never placed a bet, and you lost the match, so your **${bet.amount}** stake was **not** refunded - it's now up for grabs in the free money channel (stake **${bet.amount}**${
            bonusAmount > 0 ? ` + ${bonusPercent}% score bonus, **${bonusAmount}** extra` : ''
          }, **${freeMoneyAmount}** total).`,
        });

        pushIntegration(playerId, {
          actiontype: 'solo_loss_forfeit',
          actionvalue: bet.amount,
          bonusPercent,
          by: null,
          betpool: 0,
          me: buildSnapshot(bet.discordId, 0),
          op: null,
        });

        log(
          `Solo-loss stake of ${bet.amount} + ${bonusPercent}% bonus (${bonusAmount}) = ${freeMoneyAmount} forfeited to the free money channel for session ${sessionId}`
        );
        return;
      }

      // Flag off (or solo win with the flag off): flat refund.
      state.enqueueEvent({
        a: 'addcash',
        dc: bet.discordId,
        val: bet.amount,
        reason: 'Gwent bet refund (opponent never bet)',
      });

      state.enqueueEvent({
        a: 'dm',
        dc: bet.discordId,
        msg: `\u2139\uFE0F Your opponent never placed a bet, so your **${bet.amount}** stake was returned.`,
      });

      pushIntegration(playerId, {
        actiontype: 'refund',
        actionvalue: bet.amount,
        by: null,
        betpool: 0,
        me: buildSnapshot(bet.discordId, 0),
        op: null,
      });

      log(`Single-side refund completed for session ${sessionId}`);
      return;
    }

    // ---- Both sides bet: normal payout ----
    const loserPlayerId = playerIds.find((pid) => pid !== winnerPlayerId);
    const winnerBet = taken[winnerPlayerId];
    const loserBet = taken[loserPlayerId];

    if (!winnerBet || !loserBet) {
      log(
        `Incomplete bet bookkeeping for session ${sessionId}: winnerPlayerId=${winnerPlayerId} loserPlayerId=${loserPlayerId} sessionBets=${JSON.stringify(
          taken
        )} - refunding whatever bets exist instead of paying out.`
      );

      for (const bet of Object.values(taken)) {
        state.enqueueEvent({
          a: 'addcash',
          dc: bet.discordId,
          val: bet.amount,
          reason: 'Gwent bet refund (incomplete bookkeeping)',
        });

        state.enqueueEvent({
          a: 'dm',
          dc: bet.discordId,
          msg: `\uD83D\uDD01 Your Gwent bet of **${bet.amount}** was refunded because the bet bookkeeping was incomplete.`,
        });
      }
      return;
    }

    const pot = winnerBet.amount + loserBet.amount;

    const scoreValues = playerIds.map((pid) => sessionScores[pid] || 0);
    const lowestScore = Math.min(...scoreValues);
    const bonusPercent = Math.max(0, Math.min(MAX_BONUS_PERCENT, Math.floor(lowestScore)));

    const payout = Math.ceil(pot * (1 + bonusPercent / 100));
    const bonusAmount = payout - pot;

    const reason = bonusPercent > 0 ? `Gwent bet payout (+${bonusPercent}% score bonus)` : 'Gwent bet payout';

    log(
      `Payout for session ${sessionId}: winner=${winnerBet.discordId} loser=${loserBet.discordId} winnerStake=${winnerBet.amount} loserStake=${loserBet.amount} pot=${pot} lowestScore=${lowestScore} bonus=${bonusPercent}% -> payout=${payout}`
    );

    // This is the answer to "how does a normal payout credit the winner's
    // real UnbelievaBoat balance": exactly the same `addcash` event shape
    // dcstate.js already documents (it carries a `dc` field), just with
    // the winner's discordId and the full payout amount. The loser gets a
    // dm only - their stake was already deducted from UnbelievaBoat when
    // the bet was placed (by the external bot, before it ever called
    // mode=bet), so there's nothing further to move for them here.
    state.enqueueEvent({
      a: 'addcash',
      dc: winnerBet.discordId,
      val: payout,
      reason,
    });

    state.enqueueEvent({
      a: 'dm',
      dc: winnerBet.discordId,
      msg: `\uD83C\uDFC6 You won the Gwent match! **+${payout}** credited (${pot} pot${
        bonusAmount > 0 ? ` + ${bonusPercent}% score bonus, ${bonusAmount} extra` : ''
      }).`,
    });

    state.enqueueEvent({
      a: 'dm',
      dc: loserBet.discordId,
      msg: `\uD83D\uDC94 You lost the Gwent match and your **${loserBet.amount}** stake.`,
    });

    pushIntegration(winnerPlayerId, {
      actiontype: 'payout',
      actionvalue: payout,
      bonusPercent,
      by: winnerBet.discordId,
      betpool: 0,
      me: buildSnapshot(winnerBet.discordId, 0),
      op: buildSnapshot(loserBet.discordId, 0),
    });

    pushIntegration(loserPlayerId, {
      actiontype: 'payout',
      actionvalue: -loserBet.amount,
      by: winnerBet.discordId,
      betpool: 0,
      me: buildSnapshot(loserBet.discordId, 0),
      op: buildSnapshot(winnerBet.discordId, 0),
    });

    log(`Payout settlement completed for session ${sessionId}`);
  } catch (e) {
    // Safety net for anything unexpected above. Without this, an
    // exception here would leave the bets already pulled out of active
    // state with nothing left to settle them from - log everything
    // needed to reconstruct what happened, and best-effort refund any
    // captured bets so at minimum nobody is out their stake.
    log(
      `UNEXPECTED ERROR settling session ${sessionId} (winner=${reportA}): ${e?.stack || e}. capturedSessionBets=${JSON.stringify(
        capturedSessionBets
      )}`
    );

    if (capturedSessionBets) {
      for (const bet of Object.values(capturedSessionBets)) {
        state.enqueueEvent({
          a: 'addcash',
          dc: bet.discordId,
          val: bet.amount,
          reason: 'Gwent bet refund (settlement crashed)',
        });

        state.enqueueEvent({
          a: 'dm',
          dc: bet.discordId,
          msg: `\u26A0\uFE0F Something went wrong settling your Gwent match, so your **${bet.amount}** stake was refunded rather than risk it being lost.`,
        });
      }
    } else {
      log(`No captured bets to safety-refund for session ${sessionId} - if money is missing here, it needs manual admin reconciliation.`);
    }
  } finally {
    state.releaseSession(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Registration / disconnect helpers
// ---------------------------------------------------------------------------

function clearRegistrationForPlayer(playerId, { notify = true } = {}) {
  const discordId = state.unregisterByPlayer(playerId);
  if (!discordId) return;

  lastDmRequestAt.delete(playerId);

  // Structural signal (bot should purge any local registration cache for
  // this user) plus a human-readable DM, same message dcbot.js sent.
  state.enqueueEvent({ a: 'offline', dc: discordId });

  if (notify) {
    state.enqueueEvent({
      a: 'dm',
      dc: discordId,
      msg: '\uD83D\uDD0C Your game client disconnected, so your Gwent registration was cleared. Run `!registerclient <id>` again next time you play.',
    });
  }
}

// ---------------------------------------------------------------------------
// Hooks called from engine.js (same interface dcbot.js exposed)
// ---------------------------------------------------------------------------

// Called for every player that leaves a session before it's resolved. Bets
// tied to that session are refunded.
async function onPlayerLeftSession(ws, sessionId) {
  if (!ready) return;
  if (!sessionId) return;

  refundSessionBets(sessionId, 'The match session ended before a result was recorded.');
}

// Called on socket close/error.
//
// IMPORTANT: do NOT check whether the session still has two players here -
// the session object can still contain both players when this callback
// executes. refundSessionBets() itself is responsible for making sure the
// session is only refunded once.
async function onDisconnect(ws) {
  if (!ready) return;

  if (ws.sessionId) {
    refundSessionBets(ws.sessionId, 'A player disconnected before the match finished.');
  }

  // Registration is separate from the bet settlement.
  // clearRegistrationForPlayer() is already idempotent because it removes
  // the registration before enqueueing any notification.
  clearRegistrationForPlayer(ws.playerId);
}

// Called when a client asks the server to DM its linked Discord user.
async function onDmRequest(ws, data) {
  if (!ready) return;

  const discordId = state.getDiscordIdForPlayer(ws.playerId);

  if (!discordId) {
    pushIntegration(ws.playerId, {
      actiontype: 'error',
      actionvalue: 'not_registered',
      by: null,
      betpool: 0,
      me: null,
      op: null,
    });
    return;
  }

  const now = Date.now();
  const last = lastDmRequestAt.get(ws.playerId) || 0;

  if (now - last < DM_REQUEST_COOLDOWN_MS) {
    return;
  }

  lastDmRequestAt.set(ws.playerId, now);

  const text = typeof data?.message === 'string' ? data.message.trim().slice(0, 1800) : '';
  if (!text) return;

  state.enqueueEvent({ a: 'dm', dc: discordId, msg: text });
}

// ---------------------------------------------------------------------------
// HTTP API - what the external bot actually calls.
// ---------------------------------------------------------------------------

function parseAmount(raw) {
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) ? n : null;
}

function handleRegister(req, res) {
  const discordId = String(req.query.userid || '').trim();
  const playerId = String(req.query.gwentid || '').trim();
  const username = req.query.username ? String(req.query.username).trim() : null;

  if (!discordId || !playerId) {
    return res.json({ ok: false, error: 'missing_params' });
  }

  const ok = state.register(discordId, playerId);
  if (!ok) {
    return res.json({ ok: false, error: 'client_not_connected' });
  }

  if (username) state.setUsername(discordId, username);

  const deps = state.getDeps();
  const ws = deps.playerSockets[playerId];

  if (ws?.sessionId) {
    broadcastSessionState(ws.sessionId, 'registered', null, discordId);
  } else {
    pushIntegration(playerId, {
      actiontype: 'registered',
      actionvalue: null,
      by: discordId,
      betpool: 0,
      me: buildSnapshot(discordId, 0),
      op: null,
    });
  }

  log(`Registered client ${playerId} <-> discord ${discordId}`);
  return res.json({ ok: true });
}

function handleUnregister(req, res) {
  const discordId = String(req.query.userid || '').trim();
  if (!discordId) return res.json({ ok: false, error: 'missing_params' });

  const playerId = state.getPlayerIdForDiscord(discordId);
  if (!playerId) return res.json({ ok: false, error: 'not_registered' });

  const deps = state.getDeps();
  const sessionId = deps.playerSockets[playerId]?.sessionId;

  if (sessionId && state.getSessionBets(sessionId)[playerId]) {
    return res.json({ ok: false, error: 'active_bet' });
  }

  state.unregisterByPlayer(playerId);
  lastDmRequestAt.delete(playerId);

  pushIntegration(playerId, {
    actiontype: 'unregistered',
    actionvalue: null,
    by: discordId,
    betpool: 0,
    me: null,
    op: null,
  });

  return res.json({ ok: true });
}

function handleBet(req, res) {
  const discordId = String(req.query.userid || '').trim();
  const amount = parseAmount(req.query.amount);

  if (!discordId) return res.json({ ok: false, error: 'missing_params' });
  if (amount === null || amount <= 0) return res.json({ ok: false, error: 'bad_amount' });

  const playerId = state.getPlayerIdForDiscord(discordId);
  if (!playerId) return res.json({ ok: false, error: 'not_registered' });

  const deps = state.getDeps();
  const ws = deps.playerSockets[playerId];
  if (!ws) return res.json({ ok: false, error: 'client_disconnected' });

  const sessionId = ws.sessionId;
  const session = sessionId ? deps.sessions[sessionId] : null;

  if (!session || session.players.length < 2) {
    return res.json({ ok: false, error: 'no_opponent' });
  }

  if (state.isResolving(sessionId)) {
    return res.json({ ok: false, error: 'settling' });
  }

  const total = state.placeBet(sessionId, playerId, discordId, amount);

  const opponentPlayerId = sessionPlayerIds(sessionId).find((pid) => pid !== playerId);
  const sessionBets = state.getSessionBets(sessionId);
  const opponentBet = opponentPlayerId && sessionBets[opponentPlayerId];

  broadcastSessionState(sessionId, 'bet_placed', amount, discordId);

  if (opponentBet) {
    broadcastSessionState(sessionId, 'both_bet', total + opponentBet.amount, null);
  }

  return res.json({ ok: true, total });
}

function handleStatus(req, res) {
  const discordId = String(req.query.userid || '').trim();
  if (!discordId) return res.json({ ok: false, error: 'missing_params' });

  const playerId = state.getPlayerIdForDiscord(discordId);
  if (!playerId) return res.json({ ok: true, registered: false });

  const deps = state.getDeps();
  const ws = deps.playerSockets[playerId];
  const connected = !!ws;
  const sessionId = ws?.sessionId || null;
  const bet = sessionId ? state.getSessionBets(sessionId)[playerId] || null : null;

  return res.json({
    ok: true,
    registered: true,
    playerId,
    connected,
    sessionId,
    bet: bet ? bet.amount : 0,
  });
}

function handleCashAdjust(req, res, sign) {
  const discordId = String(req.query.userid || '').trim();
  const amount = parseAmount(req.query.amount);

  if (!discordId) return res.json({ ok: false, error: 'missing_params' });
  if (amount === null || amount < 0) return res.json({ ok: false, error: 'bad_amount' });

  state.adjustCash(discordId, sign * amount);
  return res.json({ ok: true, balance: state.getCash(discordId) });
}

function handleCashRead(req, res) {
  const discordId = String(req.query.userid || '').trim();
  if (!discordId) return res.json({ ok: false, error: 'missing_params' });

  return res.json({ ok: true, balance: state.getCash(discordId) });
}

function handleScan(req, res) {
  return res.json({ ok: true, events: state.drainEvents() });
}

// Generic relay: forwards an arbitrary payload straight to one client's
// websocket. Lets the bot push things dcapi.js has no opinion about (e.g.
// an UnbelievaBoat inventory snapshot) without teaching this module
// anything about UnbelievaBoat's response shape.
function handlePush(req, res) {
  const playerId = String(req.query.gwentid || '').trim();
  const type = String(req.query.type || '').trim();
  const payloadRaw = req.query.payload;

  if (!playerId || !type) return res.json({ ok: false, error: 'missing_params' });

  const deps = state.getDeps();
  const ws = deps.playerSockets[playerId];
  if (!ws || typeof deps.sendToClient !== 'function') {
    return res.json({ ok: false, error: 'client_disconnected' });
  }

  let payload = {};
  if (payloadRaw) {
    try {
      payload = JSON.parse(payloadRaw);
    } catch (e) {
      return res.json({ ok: false, error: 'bad_payload_json' });
    }
  }

  deps.sendToClient(ws, { type, ...payload });
  return res.json({ ok: true });
}

function handleHealth(req, res) {
  return res.json(getHealth());
}

const router = express.Router();

// Single mode-dispatched endpoint, per the original design sketch
// (GET /api/dc?mode=...&...). engine.js mounts this with:
//
//   router.use("/api/dc", dcapi.router);
router.get('/', (req, res) => {

  const { key } = req.query;
if (key !== process.env.ADMIN_ENDPOINT_LOGIN){
return res.status(401).json({ ok: false, error: 'Whats the key?' });
}

  const mode = String(req.query.mode || '');

  switch (mode) {
    case 'register':
      return handleRegister(req, res);
    case 'unregister':
      return handleUnregister(req, res);
    case 'bet':
      return handleBet(req, res);
    case 'status':
      return handleStatus(req, res);
    case 'addcash':
      return handleCashAdjust(req, res, 1);
    case 'removecash':
      return handleCashAdjust(req, res, -1);
    case 'cash':
      return handleCashRead(req, res);
    case 'scan':
      return handleScan(req, res);
    case 'push':
      return handlePush(req, res);
    case 'health':
      return handleHealth(req, res);
    default:
      return res.status(400).json({ ok: false, error: 'unknown_mode' });
  }
});

// ---------------------------------------------------------------------------
// Public API (same shape dcbot.js exported, so engine.js's require() site
// only has to change what it requires, not how it calls it)
// ---------------------------------------------------------------------------

exports.init = async function init({ sessions, playerSockets, sendToClient }) {
  state.setDeps({ sessions, playerSockets, sendToClient });
  ready = true;
  log('dcapi ready (HTTP-driven Discord integration)');
};

exports.onMatchResult = onMatchResult;
exports.onPlayerLeftSession = onPlayerLeftSession;
exports.onDisconnect = onDisconnect;
exports.onDmRequest = onDmRequest;

exports.getHealth = function getHealth() {
  const now = Date.now();
  const deps = state.getDeps();

  return {
    ok: ready,
    uptimeSeconds: Math.floor((now - health.startedAt) / 1000),
    mode: 'http-api',
    state: {
      sessionsTracked: Object.keys(deps.sessions || {}).length,
      pendingScanEvents: state.drainEvents.length, // see note below
    },
  };
};

// NOTE: exports.getHealth() above intentionally does NOT drain the queue
// to report its length (that would make calling getHealth() lossy). If a
// queue-depth metric turns out to matter, add a non-destructive `peek`
// alongside drainEvents() in dcstate.js rather than calling drainEvents()
// here.

exports.stop = function stop() {
  ready = false;
};

exports.router = router;
