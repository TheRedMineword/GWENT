const fs = require("fs");
const path = require("path");
const prettier = require("prettier");

const DIR = "C:/Users/LENOVO/Desktop/GWENT/javascript/";

async function beautifyFile(filePath) {
  if (path.basename(filePath) === "session_registering.js"){
    console.log("Ingored javascript:", filePath);
  } else {
  const code = fs.readFileSync(filePath, "utf8");

  const formatted = await prettier.format(code, {
    parser: "babel",
  });

  fs.writeFileSync(filePath, formatted, "utf8");
  console.log("Beautified:", path.basename(filePath), filePath);
}
}
async function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && entry.name.endsWith(".js")) {
      await beautifyFile(fullPath);
    }
  }
}

scanDirectory(DIR).then(() => {
beautifyFile("C:/Users/LENOVO/Desktop/GWENT/server.js");
  console.log("Done.");
});