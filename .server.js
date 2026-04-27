const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");


const ROOT = process.cwd();
const PORT = 8080;

let totalRequests = 0;

/* =========================
   LOAD ENV REPLACEMENTS
========================= */

function applyEnvReplacements(text) {

  const envPath = path.join(ROOT, ".replace.env");

  if (!fs.existsSync(envPath)) {
    console.log("No replace.env found");
    return text;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  let result = text;

  console.log("Applying ENV replacements...");

  lines.forEach((line, index) => {

    if (!line.trim()) return;

    const eqIndex = line.indexOf("=");

    if (eqIndex === -1) {
      console.log(`Skipping invalid line ${index + 1}: ${line}`);
      return;
    }

    const key = line.slice(0, eqIndex);
    const value = line.slice(eqIndex + 1);

    console.log(`  [${index + 1}] Replace: "${key}" → "${value}"`);

    result = result.split(key).join(value);

  });

  return result;
}

/* =========================
   BINARY CHECK
========================= */

function isBinary(filePath) {

  const textExtensions = [
    ".html",".js",".css",".json",".txt",".md",".svg",
    ".xml",".csv",".env"
  ];

  const ext = path.extname(filePath).toLowerCase();

  return !textExtensions.includes(ext);
}


function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  const map = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".wasm": "application/wasm"
  };

  return map[ext] || "application/octet-stream";
}

/* =========================
   RESOLVE PATH
========================= */

function resolveFile(urlPath) {

  let clean = decodeURIComponent(urlPath.split("?")[0]);

  if (clean === "/") clean = "/index.html";

  let fullPath = path.join(ROOT, clean);

  console.log("Resolving:", clean);
  console.log("Initial path:", fullPath);

  // If directory → index.html
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(fullPath, "index.html");
    console.log("Directory detected →", fullPath);
  }

  // Try .html fallback
  if (!fs.existsSync(fullPath) && fs.existsSync(fullPath + ".html")) {
    fullPath = fullPath + ".html";
    console.log(".html fallback →", fullPath);
  }

  return fullPath;
}

/* =========================
   SERVER
========================= */

const server = http.createServer((req, res) => {

  totalRequests++;

  console.log("\n=============================");
  console.log("REQUEST #" + totalRequests);
  console.log("Time:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", req.headers);

  try {



    // Quick POST check for /.is_this_local_host
if (req.method === "POST" && req.url === "/.is_this_local_host") {
  console.log("Local host check triggered");
  console.log("GREETINGS FROM LOCAL HOST")

  // Example: pick a rare HTTP code for “true” response
  const TRUE_STATUS = 218; // just a random “rare” unused-ish code

  res.statusCode = TRUE_STATUS;
  res.setHeader("Content-Type", "application/json");

  // You can send any payload you like
  res.end(JSON.stringify({ localHost: true }));

  return; // stop further processing
}


    const filePath = resolveFile(req.url);

    console.log("Final resolved path:", filePath);

if (path.basename(filePath) === "elements.bin") {
    console.log("=== elements.bin requested ===");

    // 1. read compressed binary
    const raw = fs.readFileSync(filePath);

    console.log("[INFO] Decompressing gzip...");
    const decompressed = zlib.gunzipSync(raw);

    console.log("[INFO] Parsing JSON...");
    const data = JSON.parse(decompressed.toString("utf-8"));

    const replaceUrls = x => {
        if (typeof x === "string") {
            return x.replace(
                /https:\/\/theredmineword\.github\.io\/map/g,
                "http://localhost:8080/"
            );
        } else if (Array.isArray(x)) {
            return x.map(replaceUrls);
        } else if (x && typeof x === "object") {
            for (let k in x) x[k] = replaceUrls(x[k]);
            return x;
        }
        return x;
    };

    const processItem = item => {
        // 1. string handling
        if (typeof item === "string") {
            const match = item.match(/^data:application\/json;base64,(.+)$/);

            // base64 JSON → decode → replace → re-encode
            if (match) {
                const obj = JSON.parse(
                    Buffer.from(match[1], "base64").toString("utf-8")
                );

                const replacedObj = replaceUrls(obj);

                const jsonStr = JSON.stringify(replacedObj);
                const b64 = Buffer.from(jsonStr, "utf-8").toString("base64");

                return `data:application/json;base64,${b64}`;
            }

            // plain string → just replace
            return item.replace(
                /https:\/\/theredmineword\.github\.io\/map/g,
                "http://localhost:8080/"
            );
        }

        // 2. object → replace → encode to base64
        if (typeof item === "object" && item !== null) {
            const replacedObj = replaceUrls(item);

            const jsonStr = JSON.stringify(replacedObj);
            const b64 = Buffer.from(jsonStr, "utf-8").toString("base64");

            return `data:application/json;base64,${b64}`;
        }

        return item;
    };

    const output = data.map(processItem);

    console.log("[INFO] Done processing elements.bin");
}


    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {

      console.log("File FOUND → Serving");



      if (!isBinary(filePath)) {

        console.log("Text file detected → applying replacements");

        let data = fs.readFileSync(filePath, "utf8");

        data = applyEnvReplacements(data);

        res.statusCode = 200;
	res.setHeader("Content-Type", getContentType(filePath));
        res.end(data);

      } else {

  console.log("Binary file detected → streaming raw");

  res.statusCode = 200;
  res.setHeader("Content-Type", getContentType(filePath));

  fs.createReadStream(filePath)
    .on("error", (err) => {
      console.error("Stream error:", err);
      res.statusCode = 500;
      res.end("Stream error");
    })
    .pipe(res);

}

      return;
    }

    /* ===== 404 fallback ===== */

    const notFoundPath = path.join(ROOT, "404.html");

    if (fs.existsSync(notFoundPath)) {

      console.log("File NOT FOUND → serving 404.html");

      res.statusCode = 404;
      fs.createReadStream(notFoundPath).pipe(res);

    } else {

      console.log("File NOT FOUND → sending default 404");

      res.statusCode = 404;
      res.end("404 Not Found");
    }

  } catch (err) {

    console.error("SERVER ERROR:");
    console.error(err);

    res.statusCode = 502;
    res.end("502 Bad Gateway");
  }

});

server.listen(PORT, () => {
  console.log("=================================");
  console.log("Server started");
  console.log("Root:", ROOT);
  console.log("URL: http://localhost:" + PORT);
  console.log("=================================");
});