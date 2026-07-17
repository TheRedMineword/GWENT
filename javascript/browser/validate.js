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
async function nativecheck(){
    return {
    webdriver: navigator.webdriver,
    pdfViewer: navigator.pdfViewerEnabled,
    bluetooth: !!navigator.bluetooth,
    usb: !!navigator.usb,
    serial: !!navigator.serial,
    hid: !!navigator.hid,
    gpu: !!navigator.gpu,
    serviceWorker: !!navigator.serviceWorker,
    credentials: !!navigator.credentials,
    clipboard: !!navigator.clipboard,
    mediaDevices: !!navigator.mediaDevices,
    notifications: Notification.permission,
    storageEstimate: await navigator.storage?.estimate?.(),
    battery: navigator.getBattery ? await navigator.getBattery() : null
}
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
            human: failures.length === 0,
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