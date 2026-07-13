const fs = require("fs/promises");
const path = require("path");
const zlib = require("zlib");
const { promisify } = require("util");

const deflateRaw = promisify(zlib.deflateRaw);

const INPUT_DIR = "C:/Users/LENOVO/Desktop/GWENT/change/raw";
const OUTPUT_DIR = "C:/Users/LENOVO/Desktop/GWENT/change";

const JSON_INPUT = "C:/Users/LENOVO/Desktop/GWENT/img/c_builder/traveling_spirits/arrive-raw.json";
const JSON_OUTPUT = "C:/Users/LENOVO/Desktop/GWENT/img/c_builder/traveling_spirits/arrive.bin";

async function main() {
    const entries = await fs.readdir(INPUT_DIR, { withFileTypes: true });

    let totalOriginal = 0;
    let totalCompressed = 0;

    for (const entry of entries) {
        if (!entry.isFile()) continue;

        const inputPath = path.join(INPUT_DIR, entry.name);
        const outputPath = path.join(OUTPUT_DIR, `${entry.name}.bin`);

        const data = await fs.readFile(inputPath);

        const compressed = await deflateRaw(data, {
            level: zlib.constants.Z_BEST_COMPRESSION,
        });

        await fs.writeFile(outputPath, compressed);

        totalOriginal += data.length;
        totalCompressed += compressed.length;

        const ratio = (compressed.length / data.length * 100).toFixed(2);

        console.log(
            `${entry.name}\n` +
            `  ${data.length.toLocaleString()} B -> ${compressed.length.toLocaleString()} B (${ratio}%)`
        );
    }

    // Compress arrive-raw.json -> arrive.bin
    {
        const data = await fs.readFile(JSON_INPUT);

        const compressed = await deflateRaw(data, {
            level: zlib.constants.Z_BEST_COMPRESSION,
        });

        await fs.writeFile(JSON_OUTPUT, compressed);

        totalOriginal += data.length;
        totalCompressed += compressed.length;

        const ratio = (compressed.length / data.length * 100).toFixed(2);

        console.log(
            `arrive-raw.json\n` +
            `  ${data.length.toLocaleString()} B -> ${compressed.length.toLocaleString()} B (${ratio}%)`
        );
    }

    console.log("\nDone.");
    console.log(
        `Total: ${totalOriginal.toLocaleString()} B -> ${totalCompressed.toLocaleString()} B (${(totalCompressed / totalOriginal * 100).toFixed(2)}%)`
    );
}

main().catch(console.error);