"use strict";
// https://www.lddgo.net/en/encrypt/js // custom (keep logs and console outputs)
function _0x207c() {
  const _0x24dabd = [
    "removeItem",
    "[AUTH]\x20No\x20cached\x20credentials.",
    "https://drmineword-gwent.onrender.com",
    "auth-status",
    "reload",
    "parse",
    "\x0a\x20\x20\x20\x20\x20\x20\x20\x20<span>",
    "createElement",
    "1044513uzVquN",
    "7PqLZNS",
    "auth-status\x20",
    "trim",
    "div",
    "12184350dWaeLr",
    "[AUTH]\x20Cached\x20credentials\x20cleared.",
    "[AUTH]\x20Logging\x20out...",
    "getElementById",
    "878319RLdlyR",
    "POST",
    "[AUTH]\x20Trying\x20saved\x20credentials...",
    "50jKsMuk",
    "auth-overlay",
    "auth-password",
    "saved_auth",
    "value",
    "164103IdiIir",
    "style",
    "Authentication\x20server\x20unavailable.",
    "http://localhost:8081",
    "red",
    "appendChild",
    "stringify",
    "innerHTML",
    "Creating\x20account...",
    "[AUTH]\x20Login\x20response:",
    "[AUTH]\x20Auto\x20login\x20failed:",
    "auth-login",
    "\x0a\x20\x20\x20\x20\x20\x20\x20\x20",
    "setItem",
    "login",
    "json",
    "/api/login",
    "[AUTH]\x20Login\x20request:",
    "warn",
    "head",
    "className",
    "<div\x20class=\x22auth-spinner\x22></div>",
    "login-btn",
    "\x0a\x20\x20\x20\x20<div\x20class=\x22auth-box\x22>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22auth-logo\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20🔐\x0a\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<h2>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Authentication\x0a\x20\x20\x20\x20\x20\x20\x20\x20</h2>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22auth-subtitle\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Sign\x20in\x20to\x20continue\x0a\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<input\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20id=\x22auth-login\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20autocomplete=\x22username\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20placeholder=\x22Login\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<input\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20id=\x22auth-password\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20type=\x22password\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20autocomplete=\x22current-password\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20placeholder=\x22Password\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22auth-buttons\x22>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20id=\x22login-btn\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Login\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20id=\x22register-btn\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Register\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20<div\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20id=\x22auth-status\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20class=\x22auth-status\x20info\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Waiting\x20for\x20authentication...\x0a\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20",
    "8813562PmUgQu",
    "onclick",
    "port",
    "textContent",
    "Not\x20Logged\x20In",
    "8JDdvdU",
    "3099385wZEykq",
    "Account\x20created\x20successfully.",
    "Invalid\x20credentials.\x20Please\x20log\x20in\x20again.",
    "log",
    "\x0a#auth-overlay{\x0a\x20\x20\x20\x20position:fixed;\x0a\x20\x20\x20\x20inset:0;\x0a\x20\x20\x20\x20display:flex;\x0a\x20\x20\x20\x20align-items:center;\x0a\x20\x20\x20\x20justify-content:center;\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20radial-gradient(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20circle\x20at\x20top,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20rgba(80,120,255,.15),\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transparent\x2040%\x0a\x20\x20\x20\x20\x20\x20\x20\x20),\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(0,0,0,.75);\x0a\x0a\x20\x20\x20\x20backdrop-filter:blur(14px);\x0a\x0a\x20\x20\x20\x20z-index:999999;\x0a\x0a\x20\x20\x20\x20transition:opacity\x20.2s;\x0a}\x0a\x0a.auth-box{\x0a\x0a\x20\x20\x20\x20width:400px;\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(18,18,18,.92);\x0a\x0a\x20\x20\x20\x20border:\x0a\x20\x20\x20\x20\x20\x20\x20\x201px\x20solid\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.08\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20border-radius:20px;\x0a\x0a\x20\x20\x20\x20padding:28px;\x0a\x0a\x20\x20\x20\x20color:white;\x0a\x0a\x20\x20\x20\x20box-shadow:\x0a\x20\x20\x20\x20\x20\x20\x20\x200\x2025px\x2060px\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(0,0,0,.45);\x0a\x0a\x20\x20\x20\x20animation:\x0a\x20\x20\x20\x20\x20\x20\x20\x20authPop\x20.25s\x20ease;\x0a}\x0a\x0a@keyframes\x20authPop{\x0a\x0a\x20\x20\x20\x20from{\x0a\x20\x20\x20\x20\x20\x20\x20\x20opacity:0;\x0a\x20\x20\x20\x20\x20\x20\x20\x20transform:\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20translateY(15px)\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20scale(.97);\x0a\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20to{\x0a\x20\x20\x20\x20\x20\x20\x20\x20opacity:1;\x0a\x20\x20\x20\x20\x20\x20\x20\x20transform:\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20translateY(0)\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20scale(1);\x0a\x20\x20\x20\x20}\x0a}\x0a\x0a.auth-logo{\x0a\x0a\x20\x20\x20\x20text-align:center;\x0a\x0a\x20\x20\x20\x20font-size:40px;\x0a\x0a\x20\x20\x20\x20margin-bottom:10px;\x0a}\x0a\x0a.auth-box\x20h2{\x0a\x0a\x20\x20\x20\x20text-align:center;\x0a\x0a\x20\x20\x20\x20margin:0;\x0a}\x0a\x0a.auth-subtitle{\x0a\x0a\x20\x20\x20\x20text-align:center;\x0a\x0a\x20\x20\x20\x20opacity:.7;\x0a\x0a\x20\x20\x20\x20margin-top:5px;\x0a\x20\x20\x20\x20margin-bottom:20px;\x0a\x0a\x20\x20\x20\x20font-size:13px;\x0a}\x0a\x0a.auth-box\x20input{\x0a\x0a\x20\x20\x20\x20width:100%;\x0a\x0a\x20\x20\x20\x20box-sizing:border-box;\x0a\x0a\x20\x20\x20\x20padding:14px;\x0a\x0a\x20\x20\x20\x20margin-bottom:12px;\x0a\x0a\x20\x20\x20\x20border-radius:10px;\x0a\x0a\x20\x20\x20\x20border:\x0a\x20\x20\x20\x20\x20\x20\x20\x201px\x20solid\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.08\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.04\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20color:white;\x0a\x0a\x20\x20\x20\x20transition:.2s;\x0a}\x0a\x0a.auth-box\x20input:focus{\x0a\x0a\x20\x20\x20\x20outline:none;\x0a\x0a\x20\x20\x20\x20border-color:#4d8cff;\x0a\x0a\x20\x20\x20\x20box-shadow:\x0a\x20\x20\x20\x20\x20\x20\x20\x200\x200\x200\x203px\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2077,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20140,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.2\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a}\x0a\x0a.auth-buttons{\x0a\x0a\x20\x20\x20\x20display:flex;\x0a\x20\x20\x20\x20gap:10px;\x0a}\x0a\x0a.auth-buttons\x20button{\x0a\x0a\x20\x20\x20\x20flex:1;\x0a\x0a\x20\x20\x20\x20padding:13px;\x0a\x0a\x20\x20\x20\x20border:none;\x0a\x0a\x20\x20\x20\x20border-radius:10px;\x0a\x0a\x20\x20\x20\x20cursor:pointer;\x0a\x0a\x20\x20\x20\x20font-weight:600;\x0a\x0a\x20\x20\x20\x20transition:.15s;\x0a}\x0a\x0a.auth-buttons\x20button:hover{\x0a\x0a\x20\x20\x20\x20transform:\x0a\x20\x20\x20\x20\x20\x20\x20\x20translateY(-1px);\x0a}\x0a\x0a.auth-buttons\x20button:disabled{\x0a\x0a\x20\x20\x20\x20opacity:.6;\x0a\x20\x20\x20\x20cursor:not-allowed;\x0a}\x0a\x0a#login-btn{\x0a\x0a\x20\x20\x20\x20background:#34c759;\x0a\x20\x20\x20\x20color:white;\x0a}\x0a\x0a#register-btn{\x0a\x0a\x20\x20\x20\x20background:#3b82f6;\x0a\x20\x20\x20\x20color:white;\x0a}\x0a\x0a.auth-status{\x0a\x0a\x20\x20\x20\x20min-height:48px;\x0a\x0a\x20\x20\x20\x20margin-top:14px;\x0a\x0a\x20\x20\x20\x20display:flex;\x0a\x20\x20\x20\x20align-items:center;\x0a\x20\x20\x20\x20justify-content:center;\x0a\x0a\x20\x20\x20\x20gap:10px;\x0a\x0a\x20\x20\x20\x20border-radius:10px;\x0a\x0a\x20\x20\x20\x20padding:12px;\x0a\x0a\x20\x20\x20\x20font-size:14px;\x0a}\x0a\x0a.auth-status.info{\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2059,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20130,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20246,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.12\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a}\x0a\x0a.auth-status.error{\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2080,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2080,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.12\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20color:#ff8f8f;\x0a}\x0a\x0a.auth-status.success{\x0a\x0a\x20\x20\x20\x20background:\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2052,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20199,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x2089,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.12\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20color:#7dff9d;\x0a}\x0a\x0a.auth-spinner{\x0a\x0a\x20\x20\x20\x20width:16px;\x0a\x20\x20\x20\x20height:16px;\x0a\x0a\x20\x20\x20\x20border-radius:50%;\x0a\x0a\x20\x20\x20\x20border:\x0a\x20\x20\x20\x20\x20\x20\x20\x202px\x20solid\x0a\x20\x20\x20\x20\x20\x20\x20\x20rgba(\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20255,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.15\x0a\x20\x20\x20\x20\x20\x20\x20\x20);\x0a\x0a\x20\x20\x20\x20border-top-color:white;\x0a\x0a\x20\x20\x20\x20animation:\x0a\x20\x20\x20\x20\x20\x20\x20\x20authSpin\x20.8s\x20linear\x20infinite;\x0a}\x0a\x0a@keyframes\x20authSpin{\x0a\x0a\x20\x20\x20\x20to{\x0a\x20\x20\x20\x20\x20\x20\x20\x20transform:\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20rotate(360deg);\x0a\x20\x20\x20\x20}\x0a}\x0a",
    "application/json",
    "</span>\x0a\x20\x20\x20\x20",
    "info",
    "Please\x20enter\x20login\x20and\x20password.",
    "5501004NIKRlb",
    "register-btn",
    "error",
    "Authentication\x20successful.",
    "player-id-log_out",
    "[AUTH]\x20Credentials\x20cached.",
    "color",
    "Logging\x20in...",
    "body",
    "startsWith",
    "password",
    "forEach",
    "disabled",
    "localhost",
    "Trying\x20saved\x20credentials...",
    "success",
    "[AUTH]\x20Auto\x20login\x20success.",
    "[AUTH]\x20Failed\x20to\x20parse\x20cached\x20auth:",
  ];
  _0x207c = function () {
    return _0x24dabd;
  };
  return _0x207c();
}
const _0x507554 = _0x4000;
(function (_0x429ef3, _0x2e2466) {
  const _0x14be1a = _0x4000,
    _0x2cebdd = _0x429ef3();
  while (!![]) {
    try {
      const _0x2ddf2c =
        parseInt(_0x14be1a(0xde)) / 0x1 +
        (parseInt(_0x14be1a(0xea)) / 0x2) * (-parseInt(_0x14be1a(0x9d)) / 0x3) +
        parseInt(_0x14be1a(0xc4)) / 0x4 +
        -parseInt(_0x14be1a(0xbb)) / 0x5 +
        (parseInt(_0x14be1a(0xb5)) / 0x6) * (parseInt(_0x14be1a(0xdf)) / 0x7) +
        (-parseInt(_0x14be1a(0xba)) / 0x8) *
          (-parseInt(_0x14be1a(0xe7)) / 0x9) +
        -parseInt(_0x14be1a(0xe3)) / 0xa;
      if (_0x2ddf2c === _0x2e2466) break;
      else _0x2cebdd["push"](_0x2cebdd["shift"]());
    } catch (_0x2b3857) {
      _0x2cebdd["push"](_0x2cebdd["shift"]());
    }
  }
})(_0x207c, 0xbe89d);
const isLocalhost_login_reg =
    host[_0x507554(0xcd)](_0x507554(0xd1)) ||
    host[_0x507554(0xcd)]("127.0.0.1") ||
    host[_0x507554(0xcd)]("[::1]"),
  isElectronLauncher_login_reg =
    isLocalhost_login_reg && location[_0x507554(0xb7)] === "1111",
  api_url_login_reg = isElectronLauncher_login_reg
    ? _0x507554(0xd8)
    : isLocalhost_login_reg
      ? _0x507554(0xa0)
      : _0x507554(0xd8),
  logoutBtn = document[_0x507554(0xe6)](_0x507554(0xc8));
logoutBtn && (logoutBtn[_0x507554(0xb6)] = logout);
const AUTH_CACHE_KEY = _0x507554(0x9b);
let currentPlayerId = null;
function saveAuth(_0x4d0acb, _0x34e520) {
  const _0xd083bf = _0x507554;
  (localStorage[_0xd083bf(0xaa)](
    AUTH_CACHE_KEY,
    JSON[_0xd083bf(0xa3)]({ login: _0x4d0acb, password: _0x34e520 }),
  ),
    console[_0xd083bf(0xbe)](_0xd083bf(0xc9)));
}
function loadAuth() {
  const _0x433e4f = _0x507554;
  try {
    return JSON[_0x433e4f(0xdb)](localStorage["getItem"](AUTH_CACHE_KEY));
  } catch (_0x467aa3) {
    return (console["error"](_0x433e4f(0xd5), _0x467aa3), null);
  }
}
function clearAuth() {
  const _0x4a6c52 = _0x507554;
  (localStorage[_0x4a6c52(0xd6)](AUTH_CACHE_KEY),
    console["warn"](_0x4a6c52(0xe4)));
}
async function apiLogin(_0x500852, _0x196161, _0x22400e, _0x5bc3b4) {
  const _0x34b0ba = _0x507554;
  console[_0x34b0ba(0xbe)](_0x34b0ba(0xae), _0x22400e);
  const _0x36e8c9 = await fetch(_0x500852 + _0x34b0ba(0xad), {
      method: _0x34b0ba(0xe8),
      headers: { "Content-Type": _0x34b0ba(0xc0) },
      body: JSON[_0x34b0ba(0xa3)]({
        playerId: _0x196161,
        login: _0x22400e,
        password: _0x5bc3b4,
      }),
    }),
    _0x54aa47 = await _0x36e8c9[_0x34b0ba(0xac)]();
  return (console[_0x34b0ba(0xbe)](_0x34b0ba(0xa6), _0x54aa47), _0x54aa47);
}
async function apiRegister(_0x1a6323, _0xa683fc, _0x57bc40, _0x45ee5d) {
  const _0x13f88e = _0x507554;
  console["log"]("[AUTH]\x20Register\x20request:", _0x57bc40);
  const _0x9e8730 = await fetch(_0x1a6323 + "/api/register", {
      method: _0x13f88e(0xe8),
      headers: { "Content-Type": _0x13f88e(0xc0) },
      body: JSON[_0x13f88e(0xa3)]({
        playerId: _0xa683fc,
        login: _0x57bc40,
        password: _0x45ee5d,
      }),
    }),
    _0x82cebb = await _0x9e8730[_0x13f88e(0xac)]();
  return (
    console[_0x13f88e(0xbe)]("[AUTH]\x20Register\x20response:", _0x82cebb),
    _0x82cebb
  );
}
function setAuthBusy(_0x5e3c9a) {
  const _0x378e8b = _0x507554;
  [_0x378e8b(0xb3), "register-btn", _0x378e8b(0xa8), _0x378e8b(0xec)][
    _0x378e8b(0xcf)
  ]((_0x56b919) => {
    const _0x16bb90 = _0x378e8b,
      _0x2faa27 = document[_0x16bb90(0xe6)](_0x56b919);
    if (_0x2faa27) _0x2faa27[_0x16bb90(0xd0)] = _0x5e3c9a;
  });
}
function _0x4000(_0x4d94c9, _0x1fe7a1) {
  const _0x207c57 = _0x207c();
  return (
    (_0x4000 = function (_0x4000eb, _0x376482) {
      _0x4000eb = _0x4000eb - 0x9b;
      let _0x2800f8 = _0x207c57[_0x4000eb];
      return _0x2800f8;
    }),
    _0x4000(_0x4d94c9, _0x1fe7a1)
  );
}
function setAuthStatus(
  _0x4f797a,
  _0x30902e = _0x507554(0xc2),
  _0x208bf5 = ![],
) {
  const _0x27247d = _0x507554,
    _0x3eeefc = document[_0x27247d(0xe6)](_0x27247d(0xd9));
  if (!_0x3eeefc) return;
  ((_0x3eeefc[_0x27247d(0xb1)] = _0x27247d(0xe0) + _0x30902e),
    (_0x3eeefc["innerHTML"] =
      _0x27247d(0xa9) +
      (_0x208bf5 ? _0x27247d(0xb2) : "") +
      _0x27247d(0xdc) +
      _0x4f797a +
      _0x27247d(0xc1)));
}
function hideAuthOverlay() {
  const _0x11afb0 = _0x507554,
    _0x4ef34b = document["getElementById"]("auth-overlay");
  _0x4ef34b &&
    ((_0x4ef34b[_0x11afb0(0x9e)]["opacity"] = "0"),
    setTimeout(() => {
      _0x4ef34b["remove"]();
    }, 0xc8));
}
async function tryAutoLogin(_0x412970, _0x2a63ec) {
  const _0x475549 = _0x507554,
    _0x1df771 = loadAuth();
  if (!_0x1df771) return (console["log"](_0x475549(0xd7)), ![]);
  (console[_0x475549(0xbe)](_0x475549(0xe9)),
    setAuthStatus(_0x475549(0xd2), "info", !![]));
  try {
    const _0x18c77a = await apiLogin(
      _0x412970,
      _0x2a63ec,
      _0x1df771[_0x475549(0xab)],
      _0x1df771[_0x475549(0xce)],
    );
    if (_0x18c77a["ok"])
      return (
        updateLogoutButton(!![]),
        console["log"](_0x475549(0xd4)),
        setAuthStatus(_0x475549(0xc7), _0x475549(0xd3)),
        setTimeout(hideAuthOverlay, 0x190),
        !![]
      );
    return (
      console[_0x475549(0xaf)](_0x475549(0xa7), _0x18c77a["error"]),
      clearAuth(),
      setAuthStatus(_0x475549(0xbd), "error"),
      ![]
    );
  } catch (_0x5179d3) {
    return (
      console[_0x475549(0xc6)](
        "[AUTH]\x20Auto\x20login\x20exception:",
        _0x5179d3,
      ),
      clearAuth(),
      setAuthStatus(_0x475549(0x9f), _0x475549(0xc6)),
      ![]
    );
  }
}
function createAuthOverlay(_0x4fe9a3) {
  const _0x13f64c = _0x507554;
  if (document[_0x13f64c(0xe6)](_0x13f64c(0xeb))) return;
  const _0x153c82 = document[_0x13f64c(0xdd)](_0x13f64c(0xe2));
  ((_0x153c82["id"] = "auth-overlay"),
    (_0x153c82[_0x13f64c(0xa4)] = _0x13f64c(0xb4)),
    document[_0x13f64c(0xcc)][_0x13f64c(0xa2)](_0x153c82),
    (document[_0x13f64c(0xe6)](_0x13f64c(0xb3))["onclick"] = async () => {
      const _0x1459b4 = _0x13f64c,
        _0x271410 = document[_0x1459b4(0xe6)](_0x1459b4(0xa8))["value"][
          _0x1459b4(0xe1)
        ](),
        _0x66d528 = document[_0x1459b4(0xe6)](_0x1459b4(0xec))[_0x1459b4(0x9c)];
      if (!_0x271410 || !_0x66d528) {
        setAuthStatus(_0x1459b4(0xc3), _0x1459b4(0xc6));
        return;
      }
      (setAuthBusy(!![]),
        setAuthStatus(_0x1459b4(0xcb), _0x1459b4(0xc2), !![]));
      try {
        const _0x1ff087 = await apiLogin(
          _0x4fe9a3,
          currentPlayerId,
          _0x271410,
          _0x66d528,
        );
        _0x1ff087["ok"]
          ? (updateLogoutButton(!![]),
            saveAuth(_0x271410, _0x66d528),
            setAuthStatus("Login\x20successful.", _0x1459b4(0xd3)),
            setTimeout(hideAuthOverlay, 0x190))
          : setAuthStatus(
              _0x1ff087["error"] || "Login\x20failed.",
              _0x1459b4(0xc6),
            );
      } catch (_0x1239f4) {
        (console[_0x1459b4(0xc6)]("[AUTH]\x20Login\x20exception:", _0x1239f4),
          setAuthStatus(_0x1459b4(0x9f), "error"));
      }
      setAuthBusy(![]);
    }),
    (document[_0x13f64c(0xe6)](_0x13f64c(0xc5))["onclick"] = async () => {
      const _0x26b4c6 = _0x13f64c,
        _0x5074c2 = document["getElementById"](_0x26b4c6(0xa8))[
          _0x26b4c6(0x9c)
        ]["trim"](),
        _0x1676f2 =
          document["getElementById"]("auth-password")[_0x26b4c6(0x9c)];
      if (!_0x5074c2 || !_0x1676f2) {
        setAuthStatus(_0x26b4c6(0xc3), _0x26b4c6(0xc6));
        return;
      }
      (setAuthBusy(!![]),
        setAuthStatus(_0x26b4c6(0xa5), _0x26b4c6(0xc2), !![]));
      try {
        const _0xf27f10 = await apiRegister(
          _0x4fe9a3,
          currentPlayerId,
          _0x5074c2,
          _0x1676f2,
        );
        _0xf27f10["ok"]
          ? (updateLogoutButton(!![]),
            saveAuth(_0x5074c2, _0x1676f2),
            setAuthStatus(_0x26b4c6(0xbc), _0x26b4c6(0xd3)),
            setTimeout(hideAuthOverlay, 0x190))
          : setAuthStatus(
              _0xf27f10[_0x26b4c6(0xc6)] || "Registration\x20failed.",
              _0x26b4c6(0xc6),
            );
      } catch (_0x47bb85) {
        (console[_0x26b4c6(0xc6)](
          "[AUTH]\x20Register\x20exception:",
          _0x47bb85,
        ),
          setAuthStatus(
            "Authentication\x20server\x20unavailable.",
            _0x26b4c6(0xc6),
          ));
      }
      setAuthBusy(![]);
    }));
}
const style = document["createElement"](_0x507554(0x9e));
((style[_0x507554(0xb8)] = _0x507554(0xbf)),
  document[_0x507554(0xb0)]["appendChild"](style));
function updateLogoutButton(_0x425fdc = ![]) {
  const _0x3a7481 = _0x507554,
    _0x464d05 = document[_0x3a7481(0xe6)]("player-id-log_out");
  if (!_0x464d05) return;
  _0x425fdc
    ? ((_0x464d05[_0x3a7481(0x9e)][_0x3a7481(0xca)] = ""),
      (_0x464d05["textContent"] = "Log\x20Out"),
      (_0x464d05[_0x3a7481(0xd0)] = ![]))
    : ((_0x464d05[_0x3a7481(0x9e)][_0x3a7481(0xca)] = _0x3a7481(0xa1)),
      (_0x464d05[_0x3a7481(0xb8)] = _0x3a7481(0xb9)),
      (_0x464d05[_0x3a7481(0xd0)] = !![]));
}
function logout() {
  const _0x4e63d5 = _0x507554;
  (console["log"](_0x4e63d5(0xe5)), clearAuth(), location[_0x4e63d5(0xda)]());
}
updateLogoutButton(![]);
