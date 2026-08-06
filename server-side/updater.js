const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const URLS = [
    "http://localhost:8080/server-side/engine.js",
    "https://theredmineword.github.io/GWENT/server-side/engine.js"
];

let engine;
let ctx;

async function loadEngine() {
console.warn("load engine");
    if (engine?.stop)
        await engine.stop(ctx);

    delete require.cache[require.resolve("./engine.js")];

    engine = require("./engine.js");

    if (engine.start)
        await engine.start(ctx);
    else
        await engine(ctx);
}

let lastHash = null;

function hash(s) {
    return crypto.createHash("sha256").update(s).digest("hex");
}

async function checkUpdate() {
    var url = URLS[0];
    if ((process.env?.updatermode ?? 1) === 1 ){
        url = URLS[1];
    }
    console.log(`update checker url ${url}`, URLS)
    const text = await (await fetch(url + "?t=" + Date.now())).text();
    const newHash = hash(text);
    console.warn("CHECK HASH", newHash === lastHash, newHash, lastHash);
    if (lastHash === null) {
        lastHash = newHash;
        return;
    }

    if (newHash === lastHash)
        return;

    lastHash = newHash;

    console.log("Engine updated!");

    fs.writeFileSync(path.join(__dirname, "engine.js"), text);

    await loadEngine();
}

async function forceUpdate() {
    await checkUpdate(true);
}

module.exports = async function(apps) {

    ctx = apps;

    await loadEngine();

    setInterval(checkUpdate, 3600000);
};

module.exports.forceUpdate = forceUpdate;