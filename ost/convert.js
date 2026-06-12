const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const FFMPEG =
  "C:\\Users\\LENOVO\\Desktop\\GWENT\\ost\\ffmpeg-7.1.1-full_build\\bin\\ffmpeg.exe";

const input = process.argv[2];

if (!input) {
  console.log("Usage:");
  console.log("node convert.js file.mp3");
  process.exit(1);
}

const basename = path.basename(input, path.extname(input));
const outputDir = path.join("output", basename);

fs.mkdirSync(outputDir, { recursive: true });

const ffmpeg = spawn(FFMPEG, [
  "-i",
  input,
  "-codec:a",
  "aac",
  "-b:a",
  "192k",
  "-hls_time",
  "10",
  "-hls_playlist_type",
  "vod",
  "-hls_segment_filename",
  path.join(outputDir, "segment_%03d.ts"),
  path.join(outputDir, "audio.m3u8"),
]);

ffmpeg.stdout.on("data", (d) => process.stdout.write(d));
ffmpeg.stderr.on("data", (d) => process.stderr.write(d));

ffmpeg.on("close", (code) => {
  console.log(`Finished with code ${code}`);
});