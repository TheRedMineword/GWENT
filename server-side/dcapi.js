const express = require('express');
const engine = require('./engine');
const betting = require('./betting');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.DC_API_KEY || 'change-me'; // shared secret, sent as x-api-key

function requireApiKey(req, res, next) {
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) {
    return res.status(401).end();
  }
  next();
}

// ---------------------------------------------------------------------------
// !register <id>
// GET /api/dc?mode=handleregisters&userid=$id&gwentid=<id>
// ---------------------------------------------------------------------------

function handleRegister(req, res) {
  const { userid, gwentid } = req.query;
  const ok = engine.register(userid, gwentid);
  return res.status(ok ? 200 : 404).end();
}

// ---------------------------------------------------------------------------
// scan — polled every 10s, drains the event queue.
// GET /api/dc?mode=scan  (requires x-api-key)
// ---------------------------------------------------------------------------

function handleScan(req, res) {
  const batch = engine.drainEvents();
  return res.status(200).json(batch);
}

// ---------------------------------------------------------------------------
// currency — trust-based, no approval step.
// GET /api/dc?mode=removecash&userid=$id&amount=$val  (requires x-api-key)
// ---------------------------------------------------------------------------

function handleRemoveCash(req, res) {
  const { userid, amount } = req.query;
  const amt = -Math.abs(Number(amount)); // always a removal on this mode
  const ok = engine.adjustCash(userid, amt);
  return res.status(ok ? 200 : 404).end();
}

// ---------------------------------------------------------------------------
// router — single /api/dc endpoint, dispatched by mode=
// ---------------------------------------------------------------------------

app.get('/api/dc', (req, res) => {
  const { mode } = req.query;

  switch (mode) {
    case 'handleregisters':
      return handleRegister(req, res);
    case 'handlebets':
      return betting.handleBet(req, res);
    case 'scan':
      return requireApiKey(req, res, () => handleScan(req, res));
    case 'removecash':
      return requireApiKey(req, res, () => handleRemoveCash(req, res));
    default:
      return res.status(404).end();
  }
});

app.listen(PORT, () => {
  console.log(`gwentbet api listening on :${PORT}`);
});

module.exports = { app, engine, betting };
