// handshakeGen.js - builds api-js/handshake.js (new obfuscated output on EVERY request)
const crypto = require("crypto");

const TOKEN_TTL_MS = 190 * 60 * 60 * 1000;
const MAX_TOKENS_PER_IP = 60;
const FORK_WARNING_MS = 12000;
const MISMATCH_WARNING_MS = 20000;
const LEARN_MORE_URL = "https://gwent.localplayer.dev/forks";

const tokens = new Map(); // token -> { ip, exp }
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [t, m] of tokens) if (m.exp < now) tokens.delete(t);
}, 60000);
sweep.unref();

function issueToken(ip) {
  let n = 0;
  for (const m of tokens.values()) if (m.ip === ip) n++;
  if (n >= MAX_TOKENS_PER_IP) {
    // drop this ip's oldest tokens instead of refusing
    for (const [t, m] of tokens) { if (m.ip === ip) { tokens.delete(t); if (--n < MAX_TOKENS_PER_IP) break; } }
  }
  const t = crypto.randomBytes(24).toString("hex");
  tokens.set(t, { ip, exp: Date.now() + TOKEN_TTL_MS });
  return t;
}

function verifyToken(token, ip) {
  const m = token && tokens.get(String(token));
  return !!(m && m.exp > Date.now() && m.ip === ip);
}

function clearTokens() { tokens.clear(); }

// ---------- obfuscation helpers ----------
const rnd = (n) => crypto.randomInt(n);
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function pick(a) { return a[rnd(a.length)]; }

function build({ token, clientVersion, serverVersion, ignorefork }) {
  const used = new Set();
  const id = () => {
    const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
    let s;
    do { s = a[rnd(a.length)] + crypto.randomBytes(2 + rnd(3)).toString("hex"); } while (used.has(s));
    used.add(s);
    return s;
  };
  const junk = () => {
    const v = id(), a = rnd(9000) + 100, b = rnd(9000) + 100;
    return pick([
      `var ${v}=${a}^${b};`,
      `var ${v}=(${a}+${b})%${2 + rnd(97)};`,
      `var ${v}=[${a},${b}].length;`,
      `var ${v}=typeof ${id()};`,
      `if(${a}<${b - 100 - rnd(50)}){${id()}=${a}}`.replace(/^if\(.*$/, `var ${v}=${a}>${b}?${a}:${b};`),
    ]);
  };

  // two decoder flavours, picked per request
  const D = id();
  const flavour = rnd(2);
  const decoderSrc = flavour === 0
    ? `function ${D}(a,k){var r='';for(var i=0;i<a.length;i++)r+=String.fromCharCode(a[i]^k);return r}`
    : `function ${D}(a,k){return a.map(function(c){return String.fromCharCode((c-k+256)%256)}).join('')}`;
  const S = (str) => {
    const k = 1 + rnd(254);
    const bytes = [...Buffer.from(str, "utf8")];
    const arr = flavour === 0 ? bytes.map((c) => c ^ k) : bytes.map((c) => (c + k) % 256);
    return `${D}([${arr}],${k})`;
  };

  // token: split into chunks, stored shuffled, reassembled via lookup table
  const chunks = token.match(/.{1,5}/g);
  const order = chunks.map((_, i) => i);
  const placed = shuffle(order.slice());
  const store = placed.map((i) => S(chunks[i]));
  const lookup = order.map((i) => placed.indexOf(i));
  const [A, L, T, ADD, TOAST, HOSTS, OK, NAME, WR] = [id(), id(), id(), id(), id(), id(), id(), id(), id()];
  const cls = { w: id(), c: id(), i: id(), t: id(), s: id(), b: id(), x: id(), p: id() };
  const kIn = id(), kPr = id();
  const css =
    `.${cls.w}{position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;flex-direction:column;gap:10px;align-items:flex-end;pointer-events:none;font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}` +
    `.${cls.c}{pointer-events:auto;position:relative;overflow:hidden;display:flex;gap:12px;align-items:flex-start;box-sizing:border-box;width:310px;max-width:calc(100vw - 32px);padding:13px 34px 16px 14px;color:#e9ecf5;background:linear-gradient(135deg,#1d2030,#13151f);border:1px solid rgba(255,255,255,.08);border-left:3px solid var(--a);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.5);backdrop-filter:blur(8px);animation:${kIn} .35s cubic-bezier(.2,.8,.2,1)}` +
    `.${cls.i}{flex:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--a);color:#13151f;font-weight:800;font-size:14px}` +
    `.${cls.t}{font-weight:650;font-size:13.5px;letter-spacing:.1px}` +
    `.${cls.s}{margin-top:3px;font-size:12px;opacity:.7}` +
    `.${cls.b}{display:inline-block;margin-top:9px;padding:5px 12px;border-radius:999px;background:rgba(124,200,255,.14);color:#7cc8ff;text-decoration:none;font-weight:600;font-size:12px;transition:background .15s}` +
    `.${cls.b}:hover{background:rgba(124,200,255,.28)}` +
    `.${cls.x}{position:absolute;top:6px;right:8px;padding:2px 6px;background:none;border:0;color:#fff;opacity:.4;cursor:pointer;font-size:18px;line-height:1}` +
    `.${cls.x}:hover{opacity:1}` +
    `.${cls.p}{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--a);opacity:.85;transform-origin:left;animation:${kPr} linear forwards}` +
    `@keyframes ${kIn}{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}` +
    `@keyframes ${kPr}{to{transform:scaleX(0)}}` +
    `@media (prefers-reduced-motion:reduce){.${cls.c}{animation:none}}`;

  const mismatch = clientVersion < serverVersion;
  const hosts = (ignorefork || []).map((d) => String(d).toLowerCase().trim()).filter(Boolean);

  const body = `
${junk()}
${decoderSrc}
${junk()}
var ${A}=[${store.join(",")}];
var ${L}=[${lookup}];
var ${T}=${L}.map(function(i){return ${A}[i]}).join('');
var ${NAME}=${S("authtokensocket")};
${junk()}
try{Object.defineProperty(window,${NAME},{value:${T},writable:false,configurable:false,enumerable:false})}catch(e){}
var ${HOSTS}=[${hosts.map(S).join(",")}];
var ${WR}=null;
function ${ADD}(kind,title,sub,linkTxt,href,ms){
  if(!${WR}){
    var st=document.createElement('style');st.textContent=${S(css)};
    (document.head||document.documentElement).appendChild(st);
    ${WR}=document.createElement('div');${WR}.className=${S(cls.w)};document.body.appendChild(${WR});
  }
  var c=document.createElement('div');c.className=${S(cls.c)};
  c.style.setProperty('--a',kind?'#ff5d5d':'#ffb020');
  var ic=document.createElement('div');ic.className=${S(cls.i)};ic.textContent='!';c.appendChild(ic);
  var bd=document.createElement('div');
  var t=document.createElement('div');t.className=${S(cls.t)};t.textContent=title;bd.appendChild(t);
  if(sub){var s=document.createElement('div');s.className=${S(cls.s)};s.textContent=sub;bd.appendChild(s)}
  if(linkTxt){var a=document.createElement('a');a.className=${S(cls.b)};a.textContent=linkTxt;a.href=href;a.target='_blank';a.rel='noopener noreferrer';bd.appendChild(a)}
  c.appendChild(bd);
  var gone=false;
  function rm(){if(gone)return;gone=true;c.style.transition='opacity .25s,transform .25s';c.style.opacity='0';c.style.transform='translateX(24px)';setTimeout(function(){if(c.remove)c.remove()},280)}
  var x=document.createElement('button');x.className=${S(cls.x)};x.textContent=String.fromCharCode(215);x.onclick=rm;c.appendChild(x);
  var pr=document.createElement('div');pr.className=${S(cls.p)};pr.style.animationDuration=ms+'ms';c.appendChild(pr);
  ${WR}.appendChild(c);
  setTimeout(rm,ms);
}
function ${TOAST}(){
  ${junk()}
  var h=String(location.hostname).toLowerCase(),${OK}=false;
  for(var i=0;i<${HOSTS}.length;i++){var x=${HOSTS}[i];if(h===x||h.slice(-x.length-1)==='.'+x){${OK}=true;break}}
  if(!${OK}){${ADD}(0,${S("TheRedMineword/GWENT fork detected?")},null,${S("Learn More About This Warning")},${S(LEARN_MORE_URL)},${FORK_WARNING_MS})}
  ${mismatch ? `${ADD}(1,${S("Socket version mismatch")},${S(`Client expects v${clientVersion}, server is v${serverVersion}. Please refresh.`)},null,null,${MISMATCH_WARNING_MS});
  try{console.warn(${S("[GWENT] socket version mismatch")})}catch(e){}` : ""}
}
if(document.body)${TOAST}();else document.addEventListener('DOMContentLoaded',${TOAST});
`;
  const wrappers = [
    (b) => `(function(){${b}})();`,
    (b) => `!function(){${b}}();`,
    (b) => `void function(){${b}}();`,
  ];
  return pick(wrappers)(body);
}

module.exports = { issueToken, verifyToken, clearTokens, build };