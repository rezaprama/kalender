/**
 * Node fallback for local preview when workerd cannot start (e.g. an outdated
 * Visual C++ runtime on Windows). Mirrors production routing: files in dist/
 * first, then the Worker handler. Compresses text like Cloudflare does, so local
 * performance measurements are comparable. Run `npm run build` first.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { route } from '../src/worker.ts';

const TYPES: Record<string, string> = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const port = Number(process.env.PORT ?? 8788);

function send(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, status: number, headers: Record<string, string>, body: Buffer): void {
  const type = headers['content-type'] ?? headers['Content-Type'] ?? '';
  const accept = String(req.headers['accept-encoding'] ?? '');
  if (body.length > 1024 && /text|json|javascript|xml|svg|calendar/.test(type)) {
    if (/\bbr\b/.test(accept)) { headers['Content-Encoding'] = 'br'; body = brotliCompressSync(body); }
    else if (/\bgzip\b/.test(accept)) { headers['Content-Encoding'] = 'gzip'; body = gzipSync(body); }
    headers.Vary = 'Accept-Encoding';
  }
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  const file = normalize(join('dist', decodeURIComponent(url.pathname)));
  if (file.startsWith('dist') && !url.pathname.startsWith('/_') && (await stat(file).catch(() => null))?.isFile()) {
    const immutable = url.pathname.startsWith('/assets/');
    send(req, res, 200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600' }, await readFile(file));
    return;
  }
  const response = route(new Request(url, { method: req.method, headers: req.headers as Record<string, string> }));
  send(req, res, response.status, Object.fromEntries(response.headers), Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`Kalender (Node preview) on http://localhost:${port}`));
