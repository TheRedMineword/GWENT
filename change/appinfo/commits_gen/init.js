import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Paths
const ASSETS_DIR = "C:/Users/LENOVO/Desktop/GWENT/img";

const EXIFTOOL =
  "C:/Users/LENOVO/Desktop/GWENT/change/appinfo/commits_gen/exiftool-13.58_64/exiftool.exe";

const MAGICK =
  "C:/Users/LENOVO/Desktop/GWENT/change/appinfo/commits_gen/exiftool-13.58_64/ImageMagick-7.1.2-Q16-HDRI/magick.exe";

const max_magic = "411x800";

// ----------------------
// 1. CLEAN METADATA
// ----------------------
try {
  console.log("Cleaning JPG/PNG metadata...\n");

  execSync(
    `"${EXIFTOOL}" -overwrite_original -r -XMP= -Photoshop:All= "${ASSETS_DIR}" -ext jpg -ext jpeg -ext png`,
    { stdio: "inherit" }
  );

  console.log("\nMetadata cleanup finished.\n");
} catch (err) {
  console.error("ExifTool error:", err.message);
}

// ----------------------
// 2. SAFE RESIZE (LG + SM)
// ----------------------
function processFolder(folder) {
  const files = fs
    .readdirSync(folder)
    .filter(f => f.toLowerCase().endsWith(".jpg"));

  for (const file of files) {
    const full = path.join(folder, file);
    const temp = path.join(folder, "__tmp__.jpg");

    const originalSize = fs.statSync(full).size;

    try {
      execSync(
        `"${MAGICK}" "${full}" -resize "${max_magic}>" -units PixelsPerInch -density 96 "${temp}"`,
        { stdio: "ignore" }
      );

      const newSize = fs.statSync(temp).size;

      if (newSize > 0 && newSize < originalSize) {
        fs.renameSync(temp, full);
        console.log(`Optimized: ${folder}/${file}   !!`);
      } else {
        fs.unlinkSync(temp);
        console.log(`Skipped: ${folder}/${file}`);
      }
    } catch (err) {
      console.log(`Failed: ${file}`);

      if (fs.existsSync(temp)) {
        fs.unlinkSync(temp);
      }
    }
  }
}

// Run both folders
console.log("Standardizing /lg...\n");
processFolder(`${ASSETS_DIR}/lg`);

console.log("\nStandardizing /sm...\n");
processFolder(`${ASSETS_DIR}/sm`);

console.log("\nAll done.");