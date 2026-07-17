const { UAParser } = require("ua-parser-js");
const { isbot } = require("isbot");

const HOSTING = [
    "amazon",
    "aws",
    "google",
    "azure",
    "microsoft",
    "oracle",
    "digitalocean",
    "hetzner",
    "ovh",
    "linode",
    "vultr",
    "datacamp",
    "choopa",
    "leaseweb",
    "contabo"
];

function containsHosting(str = "") {
    str = str.toLowerCase();
    return HOSTING.some(x => str.includes(x));
}

module.exports = function analyseBot(data) {

    const headers = data.headers || {};

    const ua =
        data.userAgent ||
        headers["user-agent"] ||
        "";

    const geo = data.geo || {};
    const proxy = data.proxy || {};

    const parser = new UAParser(ua);

    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    let score = 0;
    const reasons = [];

    if (isbot(ua)) {
        score += 100;
        reasons.push("Known crawler");
    }

    if (/Headless/i.test(ua)) {
        score += 100;
        reasons.push("Headless browser");
    }

    if (proxy.vpn === "yes") {
        score += 30;
        reasons.push("VPN");
    }

    if (proxy.proxy === "yes") {
        score += 30;
        reasons.push("Proxy");
    }

    if ((proxy.risk || 0) >= 50) {
        score += 20;
        reasons.push("High IP risk");
    }

    const network =
        `${geo.isp || ""} ${geo.org || ""} ${geo.as || ""}`;

    if (containsHosting(network)) {
        score += 40;
        reasons.push("Hosting ASN");
    }

    if (device.type === "mobile" && containsHosting(network)) {
        score += 35;
        reasons.push("Mobile device from hosting network");
    }

    if (!headers["accept-language"]) {
        score += 10;
        reasons.push("Missing Accept-Language");
    }

    if (!headers["sec-fetch-site"]) {
        score += 10;
        reasons.push("Missing Sec-Fetch");
    }

    let verdict = "human";

    if (score >= 80)
        verdict = "likely_bot";
    else if (score >= 40)
        verdict = "suspicious";

    return {

        verdict,
        score,
        reasons,

        parsed: {
            browser,
            os,
            device
        },

        network: {
            isp: geo.isp,
            org: geo.org,
            as: geo.as,
            country: geo.country,
            city: geo.city,
            vpn: proxy.vpn,
            proxy: proxy.proxy,
            risk: proxy.risk
        },

        headers: {
            acceptLanguage: !!headers["accept-language"],
            secFetch: !!headers["sec-fetch-site"],
            secCHUA: headers["sec-ch-ua"] || null,
            platform: headers["sec-ch-ua-platform"] || null
        }
    };

};