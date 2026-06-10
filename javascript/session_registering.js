"use strict";
// https://www.lddgo.net/en/encrypt/js // custom (keep logs and console outputs)
const _0x518757 = _0x24b9;
(function (_0x198e19, _0x5c055b) {
  const _0x88fed1 = _0x24b9,
    _0x10b3d7 = _0x198e19();
  while (!![]) {
    try {
      const _0x45ce9b =
        -parseInt(_0x88fed1(0x87)) / 0x1 +
        parseInt(_0x88fed1(0x78)) / 0x2 +
        -parseInt(_0x88fed1(0x74)) / 0x3 +
        (-parseInt(_0x88fed1(0x68)) / 0x4) *
          (-parseInt(_0x88fed1(0xba)) / 0x5) +
        (-parseInt(_0x88fed1(0x9e)) / 0x6) * (parseInt(_0x88fed1(0x91)) / 0x7) +
        parseInt(_0x88fed1(0xaa)) / 0x8 +
        (parseInt(_0x88fed1(0xaf)) / 0x9) * (-parseInt(_0x88fed1(0xa2)) / 0xa);
      if (_0x45ce9b === _0x5c055b) break;
      else _0x10b3d7["push"](_0x10b3d7["shift"]());
    } catch (_0x4fe193) {
      _0x10b3d7["push"](_0x10b3d7["shift"]());
    }
  }
})(_0x21df, 0x85563);
const isLocalhost_login_reg =
    host[_0x518757(0x89)](_0x518757(0x92)) ||
    host["startsWith"](_0x518757(0xa1)) ||
    host["startsWith"](_0x518757(0xbb)),
  isElectronLauncher_login_reg =
    isLocalhost_login_reg && location[_0x518757(0xb0)] === _0x518757(0xa5),
  api_url_login_reg = isElectronLauncher_login_reg
    ? "https://drmineword-gwent.onrender.com"
    : isLocalhost_login_reg
      ? _0x518757(0x8b)
      : "https://drmineword-gwent.onrender.com",
  logoutBtn = document[_0x518757(0x72)]("player-id-log_out");
logoutBtn && (logoutBtn[_0x518757(0x7c)] = logout);
const AUTH_CACHE_KEY = "saved_auth";
let currentPlayerId = null;
function saveAuth(_0x2ccf14, _0x4f3bc3) {
  const _0x38230c = _0x518757;
  (localStorage[_0x38230c(0xbf)](
    AUTH_CACHE_KEY,
    JSON[_0x38230c(0xb2)]({ login: _0x2ccf14, password: _0x4f3bc3 }),
  ),
    console[_0x38230c(0xb3)](_0x38230c(0xbc)));
}
function loadAuth() {
  const _0x18d51c = _0x518757;
  try {
    return JSON[_0x18d51c(0x8a)](localStorage[_0x18d51c(0x83)](AUTH_CACHE_KEY));
  } catch (_0xdf6286) {
    return (console[_0x18d51c(0xb6)](_0x18d51c(0x7e), _0xdf6286), null);
  }
}
function clearAuth() {
  const _0x423f87 = _0x518757;
  (localStorage[_0x423f87(0xb7)](AUTH_CACHE_KEY),
    console[_0x423f87(0x7f)](_0x423f87(0x6f)));
}
async function apiLogin(_0x1fe082, _0x1ca7b0, _0x5c3d4d, _0x2313c) {
  const _0x163cd2 = _0x518757;
  console[_0x163cd2(0xb3)](_0x163cd2(0x70), _0x5c3d4d);
  const _0x293aff = await fetch(_0x1fe082 + _0x163cd2(0x9c), {
      method: _0x163cd2(0xb8),
      headers: { "Content-Type": _0x163cd2(0x99) },
      body: JSON[_0x163cd2(0xb2)]({
        playerId: _0x1ca7b0,
        login: _0x5c3d4d,
        password: _0x2313c,
      }),
    }),
    _0x1d8781 = await _0x293aff["json"]();
  return (console[_0x163cd2(0xb3)](_0x163cd2(0x76), _0x1d8781), _0x1d8781);
}
async function apiRegister(_0x35ad4f, _0x33510c, _0x65b54c, _0x2dad65) {
  const _0x391452 = _0x518757;
  console["log"](_0x391452(0xad), _0x65b54c);
  const _0x41518b = await fetch(_0x35ad4f + "/api/register", {
      method: _0x391452(0xb8),
      headers: { "Content-Type": _0x391452(0x99) },
      body: JSON["stringify"]({
        playerId: _0x33510c,
        login: _0x65b54c,
        password: _0x2dad65,
      }),
    }),
    _0x204908 = await _0x41518b[_0x391452(0x90)]();
  return (console[_0x391452(0xb3)](_0x391452(0x7b), _0x204908), _0x204908);
}
function setAuthBusy(_0x1254d4) {
  const _0x3ce1e7 = _0x518757;
  ["login-btn", _0x3ce1e7(0xbd), _0x3ce1e7(0x98), _0x3ce1e7(0xbe)]["forEach"](
    (_0x3f0500) => {
      const _0x4015e1 = _0x3ce1e7,
        _0x5059fd = document[_0x4015e1(0x72)](_0x3f0500);
      if (_0x5059fd) _0x5059fd[_0x4015e1(0x85)] = _0x1254d4;
    },
  );
}
function setAuthStatus(
  _0x58deef,
  _0x9f8b91 = _0x518757(0x79),
  _0x1096f0 = ![],
) {
  const _0x4ad28c = _0x518757,
    _0x1cac95 = document[_0x4ad28c(0x72)](_0x4ad28c(0xc4));
  if (!_0x1cac95) return;
  ((_0x1cac95["className"] = _0x4ad28c(0x95) + _0x9f8b91),
    (_0x1cac95[_0x4ad28c(0x9b)] =
      _0x4ad28c(0xac) +
      (_0x1096f0 ? _0x4ad28c(0xae) : "") +
      _0x4ad28c(0x75) +
      _0x58deef +
      "</span>\x0a\x20\x20\x20\x20"));
}
function _0x21df() {
  const _0x51ffc5 = [
    "1111",
    "[AUTH]\x20Login\x20exception:",
    "Please\x20enter\x20login\x20and\x20password.",
    "{}.constructor(\x22return\x20this\x22)(\x20)",
    "exception",
    "8492696WJmRHu",
    "[AUTH]\x20Logging\x20out...",
    "\x0a\x20\x20\x20\x20\x20\x20\x20\x20",
    "[AUTH]\x20Register\x20request:",
    "<div\x20class=\x22auth-spinner\x22></div>",
    "451269qVrIsI",
    "port",
    "toString",
    "stringify",
    "log",
    "prototype",
    "style",
    "error",
    "removeItem",
    "POST",
    "apply",
    "1041820QQQJDp",
    "[::1]",
    "[AUTH]\x20Credentials\x20cached.",
    "register-btn",
    "auth-password",
    "setItem",
    "return\x20(function()\x20",
    "Login\x20failed.",
    "[AUTH]\x20Register\x20exception:",
    "div",
    "auth-status",
    "12awzjBe",
    "value",
    "success",
    "length",
    "color",
    "red",
    "trace",
    "[AUTH]\x20Cached\x20credentials\x20cleared.",
    "[AUTH]\x20Login\x20request:",
    "login-btn",
    "getElementById",
    "auth-overlay",
    "2239164pmnwlw",
    "\x0a\x20\x20\x20\x20\x20\x20\x20\x20<span>",
    "[AUTH]\x20Login\x20response:",
    "body",
    "1786424PuayMx",
    "info",
    "Authentication\x20server\x20unavailable.",
    "[AUTH]\x20Register\x20response:",
    "onclick",
    "__proto__",
    "[AUTH]\x20Failed\x20to\x20parse\x20cached\x20auth:",
    "warn",
    "(((.+)+)+)+$",
    "console",
    "Log\x20Out",
    "getItem",
    "createElement",
    "disabled",
    "login",
    "479048ApBKOE",
    "remove",
    "startsWith",
    "parse",
    "http://localhost:8081",
    "textContent",
    "table",
    "appendChild",
    "search",
    "json",
    "225281cFvsmo",
    "localhost",
    "bind",
    "[AUTH]\x20Trying\x20saved\x20credentials...",
    "auth-status\x20",
    "[AUTH]\x20Auto\x20login\x20success.",
    "\x0a#auth-overlay{\x0a\x20\x20\x20\x20position:fixed;\x0a\x20\x20\x20\x20inset:0;\x0a\x20\x20\x20\x20display:flex;\x0a\x20\x20\x20\x20align-items:center;\x0a\x20\x20\x20\x20justify-content:center;\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20radial-gradient(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20circle\x20at\x20top,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20rgba(80,120,255,.15),\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transparent\x2040%\x0a\x20\x20\x20\x20\x20\x20\x20\x20),\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(0,0,0,.75);\x0a\x0a\x20\x20\x20\x20backdrop-filter:blur(14px);\x0a\x0a\x20\x20\x20\x20z-index:999999;\x0a\x0a\x20\x20\x20\x20transition:opacity\x20.2s;\x0a}\x0a\x0a.auth-box{\x0a\x0a\x20\x20\x20\x20width:400px;\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(18,18,18,.92);\x0a\x0a\x20\x20\x20\x20border:\x0a\x20\x20\x20\x20\x20\x20\x20\x201px\x20solid\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.08\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20border-radius:20px;\x0a\x0a\x20\x20\x20\x20padding:28px;\x0a\x0a\x20\x20\x20\x20color:white;\x0a\x0a\x20\x20\x20\x20box-shadow:\x0a\x20\x20\x20\x20\x20\x20\x20\x200\x2025px\x2060px\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(0,0,0,.45);\x0a\x0a\x20\x20\x20\x20animation:\x0a\x20\x20\x20\x20\x20\x20\x20\x20authPop\x20.25s\x20ease;\x0a}\x0a\x0a@keyframes\x20authPop{\x0a\x0a\x20\x20\x20\x20from{\x0a\x20\x20\x20\x20\x20\x20\x20\x20opacity:0;\x0a\x20\x20\x20\x20\x20\x20\x20\x20transform:\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20translateY(15px)\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20scale(.97);\x0a\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20to{\x0a\x20\x20\x20\x20\x20\x20\x20\x20opacity:1;\x0a\x20\x20\x20\x20\x20\x20\x20\x20transform:\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20translateY(0)\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20scale(1);\x0a\x20\x20\x20\x20}\x0a}\x0a\x0a.auth-logo{\x0a\x20\x20\x20\x20display:flex;\x0a\x20\x20\x20\x20justify-content:center;\x0a\x20\x20\x20\x20align-items:center;\x0a\x20\x20\x20\x20margin-bottom:10px;\x0a}\x0a\x0a.auth-logo\x20img{\x0a\x20\x20\x20\x20width:70px;\x0a\x20\x20\x20\x20height:70px;\x0a\x20\x20\x20\x20display:block;\x0a}\x0a\x0a.auth-box\x20h2{\x0a\x0a\x20\x20\x20\x20text-align:center;\x0a\x0a\x20\x20\x20\x20margin:0;\x0a}\x0a\x0a.auth-subtitle{\x0a\x0a\x20\x20\x20\x20text-align:center;\x0a\x0a\x20\x20\x20\x20opacity:.7;\x0a\x0a\x20\x20\x20\x20margin-top:5px;\x0a\x20\x20\x20\x20margin-bottom:20px;\x0a\x0a\x20\x20\x20\x20font-size:13px;\x0a}\x0a\x0a.auth-box\x20input{\x0a\x0a\x20\x20\x20\x20width:100%;\x0a\x0a\x20\x20\x20\x20box-sizing:border-box;\x0a\x0a\x20\x20\x20\x20padding:14px;\x0a\x0a\x20\x20\x20\x20margin-bottom:12px;\x0a\x0a\x20\x20\x20\x20border-radius:10px;\x0a\x0a\x20\x20\x20\x20border:\x0a\x20\x20\x20\x20\x20\x20\x20\x201px\x20solid\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.08\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.04\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20color:#CCBBAA;\x0a\x0a\x20\x20\x20\x20transition:.2s;\x0a}\x0a\x0a.auth-box\x20input:focus{\x0a\x0a\x20\x20\x20\x20outline:none;\x0a\x0a\x20\x20\x20\x20border-color:#4d8cff;\x0a\x0a\x20\x20\x20\x20box-shadow:\x0a\x20\x20\x20\x20\x20\x20\x20\x200\x200\x200\x203px\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2077,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20140,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.2\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a}\x0a\x0a.auth-box\x20input::placeholder{\x0a\x20\x20\x20\x20color:rgba(204,187,170,.75);\x0a}\x0a\x0a.auth-buttons{\x0a\x0a\x20\x20\x20\x20display:flex;\x0a\x20\x20\x20\x20gap:10px;\x0a}\x0a\x0a.auth-buttons\x20button{\x0a\x0a\x20\x20\x20\x20flex:1;\x0a\x0a\x20\x20\x20\x20padding:13px;\x0a\x0a\x20\x20\x20\x20border:none;\x0a\x0a\x20\x20\x20\x20border-radius:10px;\x0a\x0a\x20\x20\x20\x20cursor:pointer;\x0a\x0a\x20\x20\x20\x20font-weight:600;\x0a\x0a\x20\x20\x20\x20transition:.15s;\x0a}\x0a\x0a.auth-buttons\x20button:hover{\x0a\x0a\x20\x20\x20\x20transform:\x0a\x20\x20\x20\x20\x20\x20\x20\x20translateY(-1px);\x0a}\x0a\x0a.auth-buttons\x20button:disabled{\x0a\x0a\x20\x20\x20\x20opacity:.6;\x0a\x20\x20\x20\x20cursor:not-allowed;\x0a}\x0a\x0a#login-btn{\x0a\x0a\x20\x20\x20\x20background:#34c759;\x0a\x20\x20\x20\x20color:white;\x0a}\x0a\x0a#register-btn{\x0a\x0a\x20\x20\x20\x20background:#3b82f6;\x0a\x20\x20\x20\x20color:white;\x0a}\x0a\x0a.auth-status{\x0a\x0a\x20\x20\x20\x20min-height:48px;\x0a\x0a\x20\x20\x20\x20margin-top:14px;\x0a\x0a\x20\x20\x20\x20display:flex;\x0a\x20\x20\x20\x20align-items:center;\x0a\x20\x20\x20\x20justify-content:center;\x0a\x0a\x20\x20\x20\x20gap:10px;\x0a\x0a\x20\x20\x20\x20border-radius:10px;\x0a\x0a\x20\x20\x20\x20padding:12px;\x0a\x0a\x20\x20\x20\x20font-size:14px;\x0a}\x0a\x0a.auth-status.info{\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2059,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20130,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20246,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.12\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a}\x0a\x0a.auth-status.error{\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2080,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2080,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.12\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20color:#ff8f8f;\x0a}\x0a\x0a.auth-status.success{\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2052,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20199,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2089,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.12\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20color:#7dff9d;\x0a}\x0a\x0a.auth-spinner{\x0a\x0a\x20\x20\x20\x20width:16px;\x0a\x20\x20\x20\x20height:16px;\x0a\x0a\x20\x20\x20\x20border-radius:50%;\x0a\x0a\x20\x20\x20\x20border:\x0a\x20\x20\x20\x20\x20\x20\x20\x202px\x20solid\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.15\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20border-top-color:white;\x0a\x0a\x20\x20\x20\x20animation:\x0a\x20\x20\x20\x20\x20\x20\x20\x20authSpin\x20.8s\x20linear\x20infinite;\x0a}\x0a\x0a@keyframes\x20authSpin{\x0a\x0a\x20\x20\x20\x20to{\x0a\x20\x20\x20\x20\x20\x20\x20\x20transform:\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20rotate(360deg);\x0a\x20\x20\x20\x20}\x0a}\x0a",
    "auth-login",
    "application/json",
    "constructor",
    "innerHTML",
    "/api/login",
    "Trying\x20saved\x20credentials...",
    "132kBYFbw",
    "trim",
    "Invalid\x20credentials.\x20Please\x20log\x20in\x20again.",
    "127.0.0.1",
    "20qmNoPP",
    "head",
    "Not\x20Logged\x20In",
  ];
  _0x21df = function () {
    return _0x51ffc5;
  };
  return _0x21df();
}
function hideAuthOverlay() {
  const _0x5ec064 = _0x518757,
    _0x558cdf = document[_0x5ec064(0x72)](_0x5ec064(0x73));
  _0x558cdf &&
    ((_0x558cdf[_0x5ec064(0xb5)]["opacity"] = "0"),
    setTimeout(() => {
      const _0xd4e2af = _0x5ec064;
      _0x558cdf[_0xd4e2af(0x88)]();
    }, 0xc8));
}
async function tryAutoLogin(_0x379a54, _0x2234bc) {
  const _0x4a7b3b = _0x518757,
    _0x412643 = loadAuth();
  if (!_0x412643)
    return (
      console[_0x4a7b3b(0xb3)]("[AUTH]\x20No\x20cached\x20credentials."),
      ![]
    );
  (console[_0x4a7b3b(0xb3)](_0x4a7b3b(0x94)),
    setAuthStatus(_0x4a7b3b(0x9d), _0x4a7b3b(0x79), !![]));
  try {
    const _0x43f4bb = await apiLogin(
      _0x379a54,
      _0x2234bc,
      _0x412643[_0x4a7b3b(0x86)],
      _0x412643["password"],
    );
    if (_0x43f4bb["ok"])
      return (
        updateLogoutButton(!![]),
        console[_0x4a7b3b(0xb3)](_0x4a7b3b(0x96)),
        setAuthStatus("Authentication\x20successful.", _0x4a7b3b(0x6a)),
        setTimeout(hideAuthOverlay, 0x190),
        !![]
      );
    return (
      console[_0x4a7b3b(0x7f)](
        "[AUTH]\x20Auto\x20login\x20failed:",
        _0x43f4bb[_0x4a7b3b(0xb6)],
      ),
      clearAuth(),
      setAuthStatus(_0x4a7b3b(0xa0), _0x4a7b3b(0xb6)),
      ![]
    );
  } catch (_0xc9d6be) {
    return (
      console["error"]("[AUTH]\x20Auto\x20login\x20exception:", _0xc9d6be),
      clearAuth(),
      setAuthStatus(_0x4a7b3b(0x7a), "error"),
      ![]
    );
  }
}
function createAuthOverlay(_0x2d71f5) {
  const _0x1a999a = _0x518757;
  if (document[_0x1a999a(0x72)]("auth-overlay")) return;
  const _0x1a68da = document[_0x1a999a(0x84)](_0x1a999a(0xc3));
  ((_0x1a68da["id"] = _0x1a999a(0x73)),
    (_0x1a68da[_0x1a999a(0x9b)] =
      "\x0a\x20\x20\x20\x20<div\x20class=\x22auth-box\x22>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22auth-logo\x22>\x0a\x20\x20\x20\x20\x20\x20<img\x0a\x20\x20\x20\x20\x20\x20\x20\x20src=\x22img/icons/lock_51dp_CCBBAA.svg\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20alt=\x22Passkey\x22\x0a\x20\x20\x20\x20\x20\x20>\x0a\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<h2>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Authentication\x0a\x20\x20\x20\x20\x20\x20\x20\x20</h2>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22auth-subtitle\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Sign\x20in\x20to\x20continue\x0a\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<input\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20id=\x22auth-login\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20autocomplete=\x22username\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20placeholder=\x22Login\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<input\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20id=\x22auth-password\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20type=\x22password\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20autocomplete=\x22current-password\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20placeholder=\x22Password\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22auth-buttons\x22>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20id=\x22login-btn\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Login\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20id=\x22register-btn\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Register\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20id=\x22auth-status\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20class=\x22auth-status\x20info\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Waiting\x20for\x20authentication...\x0a\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20"),
    document[_0x1a999a(0x77)]["appendChild"](_0x1a68da),
    (document[_0x1a999a(0x72)](_0x1a999a(0x71))[_0x1a999a(0x7c)] = async () => {
      const _0x498002 = _0x1a999a,
        _0x5a89b9 =
          document[_0x498002(0x72)]("auth-login")[_0x498002(0x69)][
            _0x498002(0x9f)
          ](),
        _0x5789e3 = document[_0x498002(0x72)](_0x498002(0xbe))[_0x498002(0x69)];
      if (!_0x5a89b9 || !_0x5789e3) {
        setAuthStatus(_0x498002(0xa7), _0x498002(0xb6));
        return;
      }
      (setAuthBusy(!![]), setAuthStatus("Logging\x20in...", "info", !![]));
      try {
        const _0x48c6a8 = await apiLogin(
          _0x2d71f5,
          currentPlayerId,
          _0x5a89b9,
          _0x5789e3,
        );
        _0x48c6a8["ok"]
          ? (updateLogoutButton(!![]),
            saveAuth(_0x5a89b9, _0x5789e3),
            setAuthStatus("Login\x20successful.", "success"),
            setTimeout(hideAuthOverlay, 0x190))
          : setAuthStatus(
              _0x48c6a8[_0x498002(0xb6)] || _0x498002(0xc1),
              "error",
            );
      } catch (_0x179828) {
        (console["error"](_0x498002(0xa6), _0x179828),
          setAuthStatus(_0x498002(0x7a), _0x498002(0xb6)));
      }
      setAuthBusy(![]);
    }),
    (document["getElementById"](_0x1a999a(0xbd))[_0x1a999a(0x7c)] =
      async () => {
        const _0x4747b9 = _0x1a999a,
          _0x3102cf = document["getElementById"](_0x4747b9(0x98))[
            _0x4747b9(0x69)
          ]["trim"](),
          _0x2a46a3 = document[_0x4747b9(0x72)](_0x4747b9(0xbe))[
            _0x4747b9(0x69)
          ];
        if (!_0x3102cf || !_0x2a46a3) {
          setAuthStatus(_0x4747b9(0xa7), _0x4747b9(0xb6));
          return;
        }
        (setAuthBusy(!![]),
          setAuthStatus("Creating\x20account...", _0x4747b9(0x79), !![]));
        try {
          const _0x5d457b = await apiRegister(
            _0x2d71f5,
            currentPlayerId,
            _0x3102cf,
            _0x2a46a3,
          );
          _0x5d457b["ok"]
            ? (updateLogoutButton(!![]),
              saveAuth(_0x3102cf, _0x2a46a3),
              setAuthStatus("Account\x20created\x20successfully.", "success"),
              setTimeout(hideAuthOverlay, 0x190))
            : setAuthStatus(
                _0x5d457b[_0x4747b9(0xb6)] || "Registration\x20failed.",
                _0x4747b9(0xb6),
              );
        } catch (_0xd96194) {
          (console[_0x4747b9(0xb6)](_0x4747b9(0xc2), _0xd96194),
            setAuthStatus(_0x4747b9(0x7a), "error"));
        }
        setAuthBusy(![]);
      }));
}
const style = document["createElement"]("style");
((style[_0x518757(0x8c)] = _0x518757(0x97)),
  document[_0x518757(0xa3)][_0x518757(0x8e)](style));
function _0x24b9(_0x143029, _0x5bee25) {
  const _0x4ba76f = _0x21df();
  return (
    (_0x24b9 = function (_0x14ce89, _0x4c1598) {
      _0x14ce89 = _0x14ce89 - 0x68;
      let _0x29ef13 = _0x4ba76f[_0x14ce89];
      return _0x29ef13;
    }),
    _0x24b9(_0x143029, _0x5bee25)
  );
}
function updateLogoutButton(_0x43c7c9 = ![]) {
  const _0x48f51d = _0x518757,
    _0x30bdc0 = (function () {
      let _0xa5a288 = !![];
      return function (_0x39e70d, _0x3b91bb) {
        const _0x2c663e = _0xa5a288
          ? function () {
              const _0x23341d = _0x24b9;
              if (_0x3b91bb) {
                const _0x266520 = _0x3b91bb[_0x23341d(0xb9)](
                  _0x39e70d,
                  arguments,
                );
                return ((_0x3b91bb = null), _0x266520);
              }
            }
          : function () {};
        return ((_0xa5a288 = ![]), _0x2c663e);
      };
    })(),
    _0x239d1d = _0x30bdc0(this, function () {
      const _0x94e7a3 = _0x24b9;
      return _0x239d1d["toString"]()
        ["search"](_0x94e7a3(0x80))
        [_0x94e7a3(0xb1)]()
        [_0x94e7a3(0x9a)](_0x239d1d)
        [_0x94e7a3(0x8f)](_0x94e7a3(0x80));
    });
  _0x239d1d();
  const _0x25c926 = (function () {
      let _0x4c4e50 = !![];
      return function (_0x191ae0, _0x5441c6) {
        const _0x3aa5d1 = _0x4c4e50
          ? function () {
              if (_0x5441c6) {
                const _0x3b0a18 = _0x5441c6["apply"](_0x191ae0, arguments);
                return ((_0x5441c6 = null), _0x3b0a18);
              }
            }
          : function () {};
        return ((_0x4c4e50 = ![]), _0x3aa5d1);
      };
    })(),
    _0x4ed828 = _0x25c926(this, function () {
      const _0x1c0fe0 = _0x24b9;
      let _0x7fbce9;
      try {
        const _0x1cdf8b = Function(_0x1c0fe0(0xc0) + _0x1c0fe0(0xa8) + ");");
        _0x7fbce9 = _0x1cdf8b();
      } catch (_0x2ca513) {
        _0x7fbce9 = window;
      }
      const _0x4c6bca = (_0x7fbce9["console"] =
          _0x7fbce9[_0x1c0fe0(0x81)] || {}),
        _0x4c0550 = [
          _0x1c0fe0(0xb3),
          _0x1c0fe0(0x7f),
          _0x1c0fe0(0x79),
          "error",
          _0x1c0fe0(0xa9),
          _0x1c0fe0(0x8d),
          _0x1c0fe0(0x6e),
        ];
      for (
        let _0x1bd309 = 0x0;
        _0x1bd309 < _0x4c0550[_0x1c0fe0(0x6b)];
        _0x1bd309++
      ) {
        const _0x1f6f1a =
            _0x25c926[_0x1c0fe0(0x9a)][_0x1c0fe0(0xb4)][_0x1c0fe0(0x93)](
              _0x25c926,
            ),
          _0x1ea230 = _0x4c0550[_0x1bd309],
          _0x5b5c34 = _0x4c6bca[_0x1ea230] || _0x1f6f1a;
        ((_0x1f6f1a[_0x1c0fe0(0x7d)] = _0x25c926[_0x1c0fe0(0x93)](_0x25c926)),
          (_0x1f6f1a[_0x1c0fe0(0xb1)] =
            _0x5b5c34[_0x1c0fe0(0xb1)][_0x1c0fe0(0x93)](_0x5b5c34)),
          (_0x4c6bca[_0x1ea230] = _0x1f6f1a));
      }
    });
  _0x4ed828();
  const _0x24a578 = document["getElementById"]("player-id-log_out");
  if (!_0x24a578) return;
  _0x43c7c9
    ? ((_0x24a578[_0x48f51d(0xb5)][_0x48f51d(0x6c)] = ""),
      (_0x24a578["textContent"] = _0x48f51d(0x82)),
      (_0x24a578[_0x48f51d(0x85)] = ![]))
    : ((_0x24a578[_0x48f51d(0xb5)]["color"] = _0x48f51d(0x6d)),
      (_0x24a578[_0x48f51d(0x8c)] = _0x48f51d(0xa4)),
      (_0x24a578[_0x48f51d(0x85)] = !![]));
}
function logout() {
  const _0x452ca9 = _0x518757;
  (console[_0x452ca9(0xb3)](_0x452ca9(0xab)),
    clearAuth(),
    location["reload"]());
}
updateLogoutButton(![]);
