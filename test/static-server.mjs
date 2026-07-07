// Tiny zero-dependency static file server used by the Playwright webServer.
// ES-module imports (extension.js) are blocked by the browser over file://,
// so the fixture must be served over http.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(fileURLToPath(import.meta.url), '..', '..')); // repo root
const port = process.env.PORT ? Number(process.env.PORT) : 5599;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
};

const server = http.createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/test/fixtures/roam-outline.html';
    const filePath = normalize(join(root, urlPath));
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      res.writeHead(403); res.end('forbidden'); return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': types[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(404); res.end('not found: ' + err.message);
  }
});

server.listen(port, () => console.log(`static server: http://localhost:${port} (root=${root})`));
