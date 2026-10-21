/**
 * Node fallback for local preview when workerd cannot start (e.g. an outdated
 * Visual C++ runtime on Windows). Mirrors production routing: files in dist/
 * first, then the Worker handler. Run `npm run build` first.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { route } from '../src/worker.ts';

const TYPES: Record<string, string> = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const port = Number(process.env.PORT ?? 8788);

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  const file = normalize(join('dist', decodeURIComponent(url.pathname)));
  if (file.startsWith('dist') && !url.pathname.startsWith('/_') && (await stat(file).catch(() => null))?.isFile()) {
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
    return;
  }
  const response = route(new Request(url, { method: req.method, headers: req.headers as Record<string, string> }));
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`Kalender (Node preview) on http://localhost:${port}`));
