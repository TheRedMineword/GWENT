"use strict"
// Pretend its obscufated becuase when i tried to do it, always failed
const LIBRARIES = [
    {
        name: "UAParser",
        url: "javascript/browser/src/ua-parser.min.js"
    },
    {
        name: "FingerprintJS",
        url: "javascript/browser/src/fp.min.js"
    },
    {
        name: "DetectRTC",
        url: "javascript/browser/src/DetectRTC.min.js"
    }
];

async function loadLIBRARIESsrc(url) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = url;
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function loadLibraries() {
    await Promise.allSettled(
        LIBRARIES.map(lib => loadLIBRARIESsrc(lib.url))
    );
}

async function nativecheck() {
    const nav = globalThis.navigator ?? {};
    const win = globalThis;

    // Safely query an API/property without throwing.
    const has = (name) => {
        try {
            return name in nav && !!nav[name];
        } catch {
            return false;
        }
    };

    // Notification is a global, not navigator.Notification.
    let notifications = "unsupported";
    try {
        if ("Notification" in win && win.Notification) {
            notifications = win.Notification.permission ?? "unknown";
        }
    } catch {
        notifications = "unavailable";
    }

    // Storage estimate can fail or be unavailable.
    let storageEstimate = null;
    try {
        if (nav.storage?.estimate) {
            storageEstimate = await nav.storage.estimate();
        }
    } catch {
        storageEstimate = null;
    }

    // Battery API is optional and can reject.
    let battery = null;
    try {
        if (typeof nav.getBattery === "function") {
            const b = await nav.getBattery();

            battery = {
                charging: b?.charging ?? null,
                chargingTime: b?.chargingTime ?? null,
                dischargingTime: b?.dischargingTime ?? null,
                level: b?.level ?? null
            };
        }
    } catch {
        battery = null;
    }

    // Optional API support/capability information.
    let permissions = false;
    try {
        permissions = !!nav.permissions;
    } catch {}

    let webgl = false;
    try {
        const canvas = document.createElement("canvas");
        webgl =
            !!canvas.getContext("webgl") ||
            !!canvas.getContext("experimental-webgl");
    } catch {}

    let mediaDevices = false;
    let mediaDevicesEnumerate = false;

    try {
        mediaDevices = !!nav.mediaDevices;
        mediaDevicesEnumerate =
            typeof nav.mediaDevices?.enumerateDevices === "function";
    } catch {}

    return {
        // Core automation signal
        webdriver: !!nav.webdriver,

        // Browser capabilities
        pdfViewer: !!nav.pdfViewerEnabled,
        bluetooth: has("bluetooth"),
        usb: has("usb"),
        serial: has("serial"),
        hid: has("hid"),
        gpu: has("gpu"),

        // Platform APIs
        serviceWorker: has("serviceWorker"),
        credentials: has("credentials"),
        clipboard: has("clipboard"),

        // Media
        mediaDevices,
        mediaDevicesEnumerate,

        // Notifications:
        // "unsupported" is NOT a bot signal.
        notifications,

        // Permissions API availability
        permissions,

        // Storage
        storageEstimate,

        // Battery
        battery,

        // Additional capability
        webgl
    };
}

async function collectFingerprint() {

    await loadLibraries();

    const result = {};

    result.userAgent = navigator.userAgent;
    result.languages = navigator.languages;
    result.language = navigator.language;
    result.platform = navigator.platform;
    result.vendor = navigator.vendor;

    result.webdriver = navigator.webdriver;
    result.cookieEnabled = navigator.cookieEnabled;
    result.onLine = navigator.onLine;
    result.deviceMemory = navigator.deviceMemory;
    result.hardwareConcurrency = navigator.hardwareConcurrency;
    result.maxTouchPoints = navigator.maxTouchPoints;

    result.screen = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio
    };

    result.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    result.timeOffset = new Date().getTimezoneOffset();

    result.plugins = [...navigator.plugins].map(p => p.name);

    result.mimeTypes = [...navigator.mimeTypes].map(m => m.type);

    if (window.UAParser) {
        result.uaParser = new UAParser().getResult();
    }

    if (window.DetectRTC) {
        result.detectRTC = {
            browser: DetectRTC.browser,
            osName: DetectRTC.osName,
            osVersion: DetectRTC.osVersion,
            isMobile: DetectRTC.isMobileDevice,
            hasWebcam: DetectRTC.hasWebcam,
            hasMicrophone: DetectRTC.hasMicrophone,
            hasSpeakers: DetectRTC.hasSpeakers,
            isWebRTCSupported: DetectRTC.isWebRTCSupported
        };
    }

    if (window.FingerprintJS) {
        const fp = await FingerprintJS.load();
        const data = await fp.get();

        result.visitorId = data.visitorId;
        result.fpComponents = data.components;
    }

    return result;
}


function canvasFingerprint() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    ctx.textBaseline = "top";
    ctx.font = "16px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 5, 80, 40);

    ctx.fillStyle = "#069";
    ctx.fillText("Bot Check", 2, 20);

    return canvas.toDataURL();
}

function webglFingerprint() {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) return null;

    const ext = gl.getExtension("WEBGL_debug_renderer_info");

    return {
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null,
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null
    };
}

async function audioFingerprint() {
    try {
        const ctx = new OfflineAudioContext(1, 44100, 44100);

        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = 1000;

        const compressor = ctx.createDynamicsCompressor();

        osc.connect(compressor);
        compressor.connect(ctx.destination);

        osc.start();

        const buffer = await ctx.startRendering();

        return Array.from(buffer.getChannelData(0))
            .slice(0, 128)
            .join(",");
    } catch {
        return null;
    }
}
async function fp_payload_builder(){
    return {
    finger: await collectFingerprint(),
    audioFingerprint: await audioFingerprint(),
    webglFingerprint: await webglFingerprint(),
    canvasFingerprint:await canvasFingerprint(),
    native: await nativecheck()
    }
}
async function init_scan_is_human(
    apiUrl = "https://drmineword-gwent.onrender.com/api/bot-check",
    configUrl = "javascript/browser/config.json"
) {
    try {
        // Load config
        const configRes = await fetch(configUrl);

        if (!configRes.ok) {
            throw new Error(`Failed to load config (${configRes.status})`);
        }

        const config = await configRes.json();

        // Build fingerprint payload
        const payload = await fp_payload_builder();

        // Send scan request
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`Bot API returned ${res.status}`);
        }

        const data = await res.json();
        const result = data.result ?? {};

        const failures = [];

        // -----------------------------
        // Verdict
        // -----------------------------
        if (
            Array.isArray(config.allowedVerdicts) &&
            !config.allowedVerdicts.includes(result.verdict)
        ) {
            failures.push(`Verdict "${result.verdict}" not allowed`);
        }

        // -----------------------------
        // Score
        // -----------------------------
        if (
            typeof config.maxScore === "number" &&
            result.score > config.maxScore
        ) {
            failures.push(
                `Score ${result.score}/${result.maxScore} exceeds ${config.maxScore}`
            );
        }

        // -----------------------------
        // Confidence
        // -----------------------------
        if (
            typeof config.minConfidence === "number" &&
            result.confidence < config.minConfidence
        ) {
            failures.push(
                `Confidence ${result.confidence}% below ${config.minConfidence}%`
            );
        }

        // -----------------------------
        // VPN
        // -----------------------------
        if (
            config.allowVPN === false &&
            result.network?.vpn !== "no"
        ) {
            failures.push(`VPN detected (${result.network?.vpn})`);
        }

        // -----------------------------
        // Hosting
        // -----------------------------
        if (
            config.allowHosting === false &&
            result.network?.hosting === true
        ) {
            failures.push("Hosting provider detected");
        }

        // -----------------------------
        // Network risk
        // -----------------------------
        if (
            typeof config.maxNetworkRisk === "number" &&
            (result.network?.risk ?? 0) > config.maxNetworkRisk
        ) {
            failures.push(
                `Network risk ${result.network.risk} exceeds ${config.maxNetworkRisk}`
            );
        }

        // -----------------------------
        // WebDriver
        // -----------------------------
        if (
            config.allowWebDriver === false &&
            (
                result.browser?.webdriver ||
                result.native?.webdriver
            )
        ) {
            failures.push("WebDriver detected");
        }

        // -----------------------------
        // Graphics
        // -----------------------------
        if (config.requireCanvas && !result.graphics?.canvas) {
            failures.push("Canvas unavailable");
        }

        if (config.requireAudio && !result.graphics?.audio) {
            failures.push("Audio fingerprint unavailable");
        }

        if (config.requireWebGL && !result.graphics?.webglRenderer) {
            failures.push("WebGL unavailable");
        }

        // -----------------------------
        // Suspicious checks
        // -----------------------------
        if (
            config.failOnSuspicious &&
            Array.isArray(result.suspicious) &&
            result.suspicious.length
        ) {
            failures.push(...result.suspicious);
        }

        return {
            success: true,
            human: failures.length < 2, // So for some time we will let 1 failure go past bot check
            verdict: result.verdict,
            score: result.score,
            confidence: result.confidence,
            failures,
            reasons: result.reasons ?? [],
            visitorId: result.browser?.visitorId,
            data
        };

    } catch (err) {
        console.error("Human scan failed:", err);

        return {
            success: false,
            human: false,
            failures: [err.message],
            data: null
        };
    }
}



function show_captcha(reportText = "Report feedback") {
    return new Promise((resolve) => {

        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "fixed",
            inset: "0",
            background: "rgba(8,7,4,.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(2px)",
            zIndex: "999999",
            padding: "12px",
            boxSizing: "border-box"
        });

        const box = document.createElement("div");
        Object.assign(box.style, {
            width: "min(760px,95vw)",
            maxWidth: "95vw",
            maxHeight: "95vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "linear-gradient(#efe5c7,#d8c7a5)",
            border: "2px solid #6d5731",
            borderRadius: "8px",
            color: "#2b2318",
            fontFamily: "Georgia, serif",
            boxShadow: "0 15px 40px rgba(0,0,0,.65)"
        });

        // ----------------------------------------------------
        // Header
        // ----------------------------------------------------

        const header = document.createElement("div");
        header.textContent = "Searching for Intelligent Life Forms";

        Object.assign(header.style, {
            background: "#6d5731",
            color: "#f7e8c4",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "20px",
            padding: "12px",
            flexShrink: "0"
        });

        // ----------------------------------------------------
        // Body
        // ----------------------------------------------------

        const body = document.createElement("div");

Object.assign(body.style, {
    padding: "18px 20px",
    flexShrink: "0",
    color: "#2b2318",
    fontSize: "16px",
    lineHeight: "1.5",
    textAlign: "center",
    textShadow: "0 1px 0 rgba(255,255,255,.25)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
});

        body.innerHTML = `
<b>Is our anti-bot system acting up?</b><br><br>
Prove you are human.<br>
<b>Place the squirrel on the real tree.</b>
`;

        // ----------------------------------------------------
        // Captcha
        // ----------------------------------------------------

        const captcha = document.createElement("div");

        Object.assign(captcha.style, {
            position: "relative",
            height: "min(240px,35vh)",
            margin: "0 20px",
            overflow: "hidden",
            border: "2px solid #594726",
            background: "#16220f",
            flexShrink: "0"
        });

        const targetIndex = Math.floor(Math.random() * 9);
        let targetTree = null;

        for (let i = 0; i < 9; i++) {

            const tree = document.createElement("img");
            tree.src = "img/captcha/tree.png";

            const x = 20 + i * 78 + (Math.random() * 14 - 7);

            Object.assign(tree.style, {
                position: "absolute",
                width: "95px",
                left: x + "px",
                bottom: "38px",
                pointerEvents: "none",
                userSelect: "none"
            });

            if (i === targetIndex) {

                Object.assign(tree.style, {
                    opacity: ".95",
                    filter: "brightness(.95) contrast(1)",
                    transform: "scale(1)"
                });

                targetTree = tree;

            } else {

                Object.assign(tree.style, {
                    opacity: (.18 + Math.random() * .28).toFixed(2),
                    filter: `
                        brightness(${.45 + Math.random() * .35})
                        contrast(${.45 + Math.random() * .4})
                        blur(${Math.random() * 1.2}px)
                        saturate(.4)
                        hue-rotate(${Math.random() * 30 - 15}deg)
                    `,
                    transform: `
                        scaleX(${Math.random() > .5 ? -1 : 1})
                        rotate(${Math.random() * 18 - 9}deg)
                        skewX(${Math.random() * 10 - 5}deg)
                        scale(${.82 + Math.random() * .25})
                    `
                });

            }

            captcha.appendChild(tree);
        }

        // ----------------------------------------------------
        // Noise
        // ----------------------------------------------------

        if (!document.getElementById("captchaNoiseStyle")) {

            const style = document.createElement("style");
            style.id = "captchaNoiseStyle";

            style.textContent = `
@keyframes captchaNoise{
    from{background-position:0 0;}
    to{background-position:256px 256px;}
}
`;

            document.head.appendChild(style);
        }

        const noise = document.createElement("div");

        Object.assign(noise.style, {
            position: "absolute",
            inset: "0",
            background: "url(img/captcha/noise.webp)",
            opacity: ".14",
            mixBlendMode: "screen",
            animation: "captchaNoise .45s steps(5) infinite",
            pointerEvents: "none"
        });

        captcha.appendChild(noise);

        // ----------------------------------------------------
        // Squirrel
        // ----------------------------------------------------

        const squirrel = document.createElement("img");

        squirrel.src = "img/captcha/squirel.png";

        Object.assign(squirrel.style, {
            position: "absolute",
            width: "78px",
            left: "0px",
            bottom: "14px",
            pointerEvents: "none",
            userSelect: "none",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))"
        });

        captcha.appendChild(squirrel);

        // ----------------------------------------------------
        // Slider
        // ----------------------------------------------------

        const slider = document.createElement("input");

        slider.type = "range";
        slider.min = 0;
        slider.max = 1000;
        slider.value = 0;

        Object.assign(slider.style, {
            width: "calc(100% - 40px)",
            margin: "16px 20px 8px",
            flexShrink: "0"
        });

        slider.oninput = () => {

            const max = captcha.clientWidth - squirrel.offsetWidth;

            squirrel.style.left =
                (slider.value / 1000) * max + "px";

        };

        // ----------------------------------------------------
        // Buttons
        // ----------------------------------------------------

        function makeButton(label) {

            const btn = document.createElement("button");

            btn.textContent = label;

            Object.assign(btn.style, {
                minWidth: "120px",
                padding: "8px 16px",
                background: "#7a5b2e",
                color: "#f6edd8",
                border: "1px solid #4f3d22",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold"
            });

            btn.onmouseenter = () => btn.style.background = "#98733c";
            btn.onmouseleave = () => btn.style.background = "#7a5b2e";

            return btn;
        }

        const buttons = document.createElement("div");

        Object.assign(buttons.style, {
            display: "flex",
            justifyContent: "center",
            padding: "12px 20px 18px",
            flexShrink: "0"
        });

        const verify = makeButton("Verify");

        verify.onclick = () => {

            const squirrelCenter =
                squirrel.offsetLeft + squirrel.offsetWidth / 2;

            const treeCenter =
                targetTree.offsetLeft + targetTree.offsetWidth / 2;

            overlay.remove();

            resolve(Math.abs(squirrelCenter - treeCenter) < 45);

        };

        buttons.appendChild(verify);

        // ----------------------------------------------------
        // Footer
        // ----------------------------------------------------

        const footer = document.createElement("div");

        Object.assign(footer.style, {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            padding: "0 20px 18px",
            fontSize: "13px",
            color: "#5d4e36",
            flexWrap: "wrap",
            flexShrink: "0"
        });

        const left = document.createElement("div");
        left.textContent =
            "You are human? Share feedback to improve our system";

        const copy = makeButton("COPY REPORT");

        copy.style.minWidth = "140px";
        copy.style.fontSize = "13px";
        copy.style.padding = "6px 12px";

        copy.onclick = async () => {

            try {

                await navigator.clipboard.writeText(reportText);

                copy.textContent = "COPIED";

                setTimeout(() => {
                    copy.textContent = "COPY REPORT";
                }, 1200);

            } catch {}

        };

        footer.append(left, copy);

        // ----------------------------------------------------

        box.append(
            header,
            body,
            captcha,
            slider,
            buttons,
            footer
        );

        overlay.appendChild(box);
        document.body.appendChild(overlay);

    });
}