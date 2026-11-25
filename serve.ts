// Dapur Kilat — serve.ts: server statis kecil untuk main lokal (Node 22, stdlib saja).
//   node serve.ts [--port 8080]
// Melayani game/ di http://localhost:8080. Bukan bagian dari game yang dinilai;
// grader hanya menjalankan main.ts dan membaca game/ + screenshots/.
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const portArg = process.argv.indexOf('--port');
const port = portArg === -1 ? 8080 : Number(process.argv[portArg + 1]) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

createServer((req, res) => {
  let pathname = '/';
  try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); } catch { /* abaikan */ }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end('forbidden'); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
    const body = readFileSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream', 'content-length': body.length, 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log('Dapur Kilat di http://localhost:' + port));
