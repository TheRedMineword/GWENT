const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const cors = require("cors");

const ROOT_DIR =
    'C:/Users/LENOVO/Desktop/GWENT';

const OUTPUT_DIR =
    'C:/Users/LENOVO/Desktop/GWENT/change/appinfo';

const IGNORE_DIRS = new Set([
    'node_modules',
    '.git',
    '.github',
    'dist',
    'build',
    'exe',
    'commits_gen',
    'MyDecks',
    'gwent_cards',
    'fragment_map',
    'ffmpeg-7.1.1-full_build'
]);

const IGNORE_FILES = new Set([
    '.gitattributes',
    '.gitignore',

    'manifest.json',
    'latest-sha.txt',
    '.init.bat', '.replace.env', 'server.js', '.server.js',
    '.env',
    'session_registering_oryginal.js', 'invite.json', 'package.json', 'package-lock.json', 'index_ver_check_script.txt',
    'allowed_versions.json', 'convert.js'
]);

// =====================================================
// STABLE WALK
// =====================================================

function walk(
    dir,
    fileList = []
) {

    const entries =
        fs.readdirSync(dir, {
            withFileTypes: true
        });

    entries.sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    for (const entry of entries) {

        const fullPath =
            path.join(
                dir,
                entry.name
            );

        if (entry.isDirectory()) {
     //       console.log("ENTRY", entry.path, fullPath);
            if (
                IGNORE_DIRS.has(
                    entry.name
                )
            ) {
                if(fullPath === "C:\\Users\\LENOVO\\Desktop\\GWENT\\javascript\\PC_scripts\\node_modules"){
                } else {
                    console.log("IGNORE", fullPath);
                    continue;
                }
            }

            walk(
                fullPath,
                fileList
            );

        } else {

            if (
                IGNORE_FILES.has(
                    entry.name
                )
            ) {

                continue;
            }

            fileList.push(fullPath);
        }
    }

    return fileList;
}

// =====================================================
// SHA
// =====================================================

// IMPORTANT
// HASH RAW BYTES.
// EXACTLY SAME AS UPDATER.
//
function sha256Buffer(
    buffer
) {

    return crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');
}

function sha256File(filePath) {

    let buffer =
        fs.readFileSync(filePath);

    // IMPORTANT
    // Normalize text files to LF
    // to match GitHub RAW blobs.
    //
    const ext =
        path.extname(filePath)
            .toLowerCase();

    const textExtensions = new Set([
        '.js',
        '.json',
        '.html',
        '.css',
        '.txt',
        '.env',
        '.md',
        '.bat',
        '.yml',
        '.yaml'
    ]);

    if (textExtensions.has(ext)) {

        let text =
            buffer.toString('utf8');

        // CRLF -> LF
        text =
            text.replace(/\r\n/g, '\n');

        buffer =
            Buffer.from(
                text,
                'utf8'
            );
    }

    return sha256Buffer(buffer);
}

// =====================================================
// PATH NORMALIZE
// =====================================================

function normalizePath(
    filePath
) {

    return filePath
        .replace(/\\/g, '/')
        .replace(/^\/+/, '');
}

// =====================================================
// MAIN
// =====================================================

function main() {

    fs.mkdirSync(
        OUTPUT_DIR,
        {
            recursive: true
        }
    );

    const files =
        walk(ROOT_DIR)
            .sort((a, b) =>
                a.localeCompare(b)
            );

    const manifestFiles = [];

    const globalHash =
        crypto.createHash('sha256');

    for (const file of files) {

        const relative =
            normalizePath(
                path.relative(
                    ROOT_DIR,
                    file
                )
            );

        const stat =
            fs.statSync(file);

        const fileSha =
            sha256File(file);

        console.log(
            'FILE:',
            relative
        );

        console.log(
            'SHA:',
            fileSha
        );

        manifestFiles.push({
            path: relative,
            sha256: fileSha,
            size: stat.size
        });

        // IMPORTANT
        // STABLE HASH INPUTS
        globalHash.update(relative);
        globalHash.update(fileSha);
    }

    const finalSha =
        globalHash
            .digest('hex');

    let manifest = {
        sha: finalSha,
        generatedAt:
            new Date()
                .toISOString(),
        files: manifestFiles,
        totals: { size: getTotalSize(manifestFiles), files: manifestFiles.length }
    };
    manifest = JSON.stringify(manifest);
 //   console.log("MANIFEST\n", manifest);

    fs.writeFileSync(
        path.join(
            OUTPUT_DIR,
            'manifest.json'
        ),
        manifest,
        'utf8'
    );

    fs.writeFileSync(
        path.join(
            OUTPUT_DIR,
            'latest-sha.txt'
        ),
        finalSha,
        'utf8'
    );

    console.log('\nDONE');
    console.log(
        'FILES:',
        manifestFiles.length
    );

    console.log(
        'FINAL SHA:',
        finalSha
    );
    console.log(`TOTAL SIZE: ${JSON.stringify(getTotalSize(manifestFiles))}`)
}
function getTotalSize(files) {
  const bytes = files.reduce((sum, file) => sum + file.size, 0);

  return {
    b: bytes,
    mb: +(bytes / 1024 ** 2).toFixed(2),
    gb: +(bytes / 1024 ** 3).toFixed(2),
  };
}
main();