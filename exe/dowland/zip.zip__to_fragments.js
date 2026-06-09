const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const INPUT_FILE = 'C:/Users/LENOVO/Desktop/GWENT/exe/dowland/GWENT.zip';

const PUBLIC_DIR = path.join(__dirname, 'public');
const FRAGMENT_DIR = path.join(PUBLIC_DIR, 'fragment_map');

const CHUNK_SIZE = 1024 * 1024 * 5;

if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR);
}

if (!fs.existsSync(FRAGMENT_DIR)) {
    fs.mkdirSync(FRAGMENT_DIR, { recursive: true });
}

console.log('Reading ZIP...');

const fileBuffer = fs.readFileSync(INPUT_FILE);
const totalSize = fileBuffer.length;

const sha256 = crypto
    .createHash('sha256')
    .update(fileBuffer)
    .digest('hex');

const fragmentCount = Math.ceil(totalSize / CHUNK_SIZE);

console.log('Creating fragments...');

const fragments = [];

for (let i = 0; i < fragmentCount; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);

    const chunk = fileBuffer.slice(start, end);

    const filename = `fragment${i}.bin`;

    fs.writeFileSync(
        path.join(FRAGMENT_DIR, filename),
        chunk
    );

    fragments.push({
        id: i,
        file: `fragment_map/${filename}`,
        size: chunk.length
    });

    console.log(`Saved ${filename}`);
}

const indexData = {
    originalFile: 'GWENT_v.09.06.2026.zip',
    totalSize,
    fragmentCount,
    fragmentSize: CHUNK_SIZE,
    sha256,
    createdAt: new Date().toISOString(),
    fragments
};

fs.writeFileSync(
    path.join(PUBLIC_DIR, 'index.json'),
    JSON.stringify(indexData, null, 2)
);

console.log('index.json created');

const server = http.createServer((req, res) => {
    let filePath = path.join(
        PUBLIC_DIR,
        req.url === '/' ? 'index.html' : req.url
    );

    const ext = path.extname(filePath);

    const mimeTypes = {
        '.html': 'text/html',
        '.json': 'application/json',
        '.bin': 'application/octet-stream',
        '.js': 'text/javascript',
        '.css': 'text/css'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('404');
            return;
        }

        res.writeHead(200, {
            'Content-Type': contentType
        });

        res.end(content);
    });
});

server.listen(3000, () => {
    console.log('');
    console.log('SERVER RUNNING');
    console.log('http://localhost:3000');
});
