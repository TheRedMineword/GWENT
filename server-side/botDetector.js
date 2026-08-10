const { UAParser } = require("ua-parser-js");
const { isbot } = require("isbot");

const HOSTING = [
    "amazon","aws",
    "google","gcp",
    "azure","microsoft",
    "oracle","oci",
    "digitalocean",
    "hetzner",
    "ovh",
    "linode",
    "vultr",
    "leaseweb",
    "contabo",
    "choopa",
    "scaleway",
    "upcloud",
    "akamai",
    "fastly",
    "cloudflare",
    "stackpath",
    "ibm cloud",
    "alibaba",
    "tencent",
    "huawei cloud",
    "exoscale",
    "online sas",
    "interserver",
    "hostwinds",
    "psychz",
    "quadranet",
    "colo",
    "serverhub",
    "m247",
    "it7",
    "i3d",
    "cdn77",
    "vps",
    "dedicated"
];

function containsHosting(str = "") {
    str = str.toLowerCase();
    return HOSTING.some(x => str.includes(x));
}

module.exports = function analyseBot(data = {}) {

    const headers = data.headers || {};
    const geo = data.geo || {};
    const proxy = data.proxy || {};

    const finger = data.finger || {};
    const native = data.native || {};

    const ua =
        finger.userAgent ||
        data.userAgent ||
        headers["user-agent"] ||
        "";

    const parser = new UAParser(ua);

    const browser = parser.getBrowser();
    const os = parser.getOS();
    const cpu = parser.getCPU();
    const device = parser.getDevice();

    const reasons = [];
    const suspicious = [];

    const breakdown = {
        crawler: 0,
        headless: 0,
        webdriver: 0,
        vpn: 0,
        proxy: 0,
        tor: 0,
        risk: 0,
        hosting: 0,
        headers: 0,
        uaMismatch: 0,
        language: 0,
        timezone: 0,
        plugins: 0,
        mimeTypes: 0,
        webgl: 0,
        canvas: 0,
        audio: 0,
        mobileHosting: 0
    };

    function add(category, points, reason) {
        breakdown[category] += points;
        suspicious.push(reason);
    }

    // ------------------------------------------------
    // User-Agent
    // ------------------------------------------------

    if (isbot(ua)) {
        add("crawler", 100, "Known crawler");
    }

    if (/Headless|PhantomJS|Playwright|Puppeteer/i.test(ua)) {
        add("headless", 100, "Headless browser");
    }

    // ------------------------------------------------
    // webdriver
    // ------------------------------------------------

    if (finger.webdriver || native.webdriver) {
        add("webdriver", 80, "navigator.webdriver=true");
    } else {
        reasons.push("WebDriver disabled");
    }

    // ------------------------------------------------
    // Proxy
    // ------------------------------------------------

    if (proxy.vpn === "yes")
        add("vpn", 35, "VPN detected");

    if (proxy.proxy === "yes")
        add("proxy", 35, "Proxy detected");

    if (proxy.tor === "yes")
        add("tor", 80, "TOR exit node");

    if ((proxy.risk || 0) >= 75)
        add("risk", 35, `High IP risk (${proxy.risk})`);
    else if ((proxy.risk || 0) >= 40)
        add("risk", 15, `Medium IP risk (${proxy.risk})`);

    // ------------------------------------------------
    // Hosting
    // ------------------------------------------------

    const network =
        `${geo.isp || ""} ${geo.org || ""} ${geo.as || ""}`;

    if (containsHosting(network)) {
        add("hosting", 40, "Hosting ASN");
    } else {
        reasons.push("Residential ISP");
    }

    if (
        device.type === "mobile" &&
        containsHosting(network)
    ) {
        add(
            "mobileHosting",
            35,
            "Mobile UA from hosting network"
        );
    }

    // ------------------------------------------------
    // Headers
    // ------------------------------------------------

    if (!headers["accept-language"])
        add("headers", 5, "Missing Accept-Language");

    if (!headers["sec-fetch-site"])
        add("headers", 5, "Missing Sec-Fetch-Site");

    if (!headers["sec-fetch-mode"])
       add("headers", 5, "Missing Sec-Fetch-Mode");

 //   if (!headers["sec-ch-ua"])
 //       add("headers", 5, "Missing Sec-CH-UA"); // Not really that usefull, will temponary disable

    // ------------------------------------------------
    // Language
    // ------------------------------------------------

    if (
        finger.languages &&
        headers["accept-language"]
    ) {

        const first =
            headers["accept-language"]
                .split(",")[0]
                .trim()
                .toLowerCase();

        if (
            finger.languages.length &&
            !finger.languages[0]
                .toLowerCase()
                .startsWith(first.slice(0, 2))
        ) {

            add(
                "language",
                15,
                "Browser language mismatch"
            );
        }
    }

    // ------------------------------------------------
    // Timezone
    // ------------------------------------------------

    const tz = finger.timezone || "";

 //   if (
 //       geo.country === "Poland" &&
 //       !tz.includes("Warsaw")
 //   ) {
  //      add(
 //           "timezone",
  //          10,
 //           "Timezone inconsistent with IP"
 //       );
  //  }

    // ------------------------------------------------
    // Plugins
    // ------------------------------------------------

    if (
        browser.name === "Chrome_a" &&
        (finger.plugins || []).length === 0
    ) {

        add(
            "plugins",
            15,
            "Chrome without plugins"
        );
    }

    if (
        browser.name === "Chrome_a" &&
        (finger.mimeTypes || []).length === 0 
    ) {

        add(
            "mimeTypes",
            10,
            "Chrome without mime types"
        );
    }

//if (
//    browser.name === "Chrome" &&
 //   finger.vendor !== "Google Inc."
//)
//    add("uaMismatch",20,"Chrome vendor mismatch");
    if (
    browser.name === "Firefox" &&
    headers["sec-ch-ua"]
)
    add("headers",25,"Firefox sent Chromium hints");
    if (
    browser.name==="Safari" &&
    os.name==="Windows"
)
    add("uaMismatch",40,"Impossible browser/OS");
    if (
    browser.name==="Chrome" &&
    ua.includes("Edg/")
)
    add("uaMismatch",15,"UA parser mismatch");

    // ------------------------------------------------
    // Graphics
    // ------------------------------------------------

    if (!data.canvasFingerprint)
        add("canvas", 6, "Canvas fingerprint missing");

    if (!data.audioFingerprint)
        add("audio", 6, "Audio fingerprint missing");

    if (
        !data.webglFingerprint ||
        !data.webglFingerprint.renderer
    ) {
        add("webgl", 10, "WebGL unavailable");
    }

    // ------------------------------------------------

    const score =
        Object.values(breakdown)
            .reduce((a, b) => a + b, 0);

    let verdict = "human";

    if (score >= 120)
        verdict = "bot";
    else if (score >= 70)
        verdict = "likely_bot";
    else if (score >= 35)
        verdict = "suspicious";

    const confidence =
        Math.max(
            0,
            Math.min(
                100,
                verdict === "human"
                    ? 100 - score
                    : score
            )
        );

    return {

        verdict,
        score,
        confidence,
        maxScore: 250,

        reasons,
        suspicious,

        parsed: {
            browser,
            os,
            cpu,
            device,
            detectRTC: finger.detectRTC
        },

        network: {
            country: geo.country,
            city: geo.city,
            isp: geo.isp,
            org: geo.org,
            as: geo.as,
            vpn: proxy.vpn,
            proxy: proxy.proxy,
            tor: proxy.tor,
            hosting: containsHosting(network),
            risk: proxy.risk
        },

        browser: {
            webdriver: !!finger.webdriver,
            visitorId: finger.visitorId,
            platform: finger.platform,
            vendor: finger.vendor,
            language: finger.language,
            languages: finger.languages,
            timezone: finger.timezone,
            plugins: (finger.plugins || []).length,
            mimeTypes: (finger.mimeTypes || []).length,
            deviceMemory: finger.deviceMemory,
            hardwareConcurrency: finger.hardwareConcurrency,
            touchPoints: finger.maxTouchPoints
        },

        graphics: {
            canvas: !!data.canvasFingerprint,
            audio: !!data.audioFingerprint,
            webglVendor: data.webglFingerprint?.vendor,
            webglRenderer: data.webglFingerprint?.renderer
        },

        native,

        headers: {
            userAgent: ua,
            acceptLanguage: headers["accept-language"] || null,
            secFetchSite: headers["sec-fetch-site"] || null,
            secFetchMode: headers["sec-fetch-mode"] || null,
            secFetchDest: headers["sec-fetch-dest"] || null,
            secCHUA: headers["sec-ch-ua"] || null,
            secCHPlatform: headers["sec-ch-ua-platform"] || null,
            secCHMobile: headers["sec-ch-ua-mobile"] || null
        },

        debug: {
            scoreBreakdown: breakdown
        }
    };
};
