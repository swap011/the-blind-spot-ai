/**
 * Lightweight zero-dependency static web server for The Blind Spot application.
 * Run with: npm start (or node server.js)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Normalize URL
  let parsedUrl = req.url.split('?')[0];
  if (parsedUrl === '/') parsedUrl = '/index.html';

  const safePath = path.normalize(path.join(__dirname, parsedUrl));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });

    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  👁️  THE BLIND SPOT AI ASSISTANT`);
  console.log(`  Same Decisions. A Wider View.`);
  console.log(`  PromptWars @ Hack2skill Submission`);
  console.log(`======================================================`);
  console.log(`  🚀 Server running at: http://localhost:${PORT}`);
  console.log(`  Press Ctrl+C to terminate.\n`);
});
