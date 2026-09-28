import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchAttachment } from '../src/server/attachmentProxy';

// One small server for hosts that run a Node service (Render, Fly, a VPS): it serves the built
// dashboard and answers /api/attachment, the endpoint that fetches a Todoist file for the page.
// On Vercel the same endpoint runs as a function instead (api/attachment.ts); the logic is shared.

const PORT = Number(process.env.PORT ?? 10000);
const ROOT = resolve(process.env.STATIC_DIR ?? 'dist');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/** The file a request asks for, or null when it points outside the built site. */
export function fileFor(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const path = normalize(join(root, decoded));
  // normalize() resolves "..", so anything that leaves the root is refused.
  return path === root || path.startsWith(root + sep) ? path : null;
}

async function sendFile(res: ServerResponse, path: string, fallbackHtml: string): Promise<void> {
  let target = path;
  try {
    const info = await stat(target);
    if (info.isDirectory()) target = join(target, 'index.html');
    await stat(target);
  } catch {
    // Unknown path: the dashboard is a single page, so it renders the route itself.
    target = fallbackHtml;
  }
  const type = TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream';
  // The HTML must never be cached, or a new build is not picked up; the hashed assets can be.
  const cache = target === fallbackHtml || extname(target) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
  res.writeHead(200, { 'content-type': type, 'cache-control': cache, 'x-content-type-options': 'nosniff' });
  createReadStream(target).pipe(res);
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url ?? '/';
  if (url.startsWith('/api/attachment')) {
    const request = new Request(`http://localhost${url}`, { headers: { authorization: String(req.headers.authorization ?? '') } });
    const response = await fetchAttachment(request);
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => (headers[key] = value));
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  if (url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  const indexHtml = join(ROOT, 'index.html');
  const file = fileFor(ROOT, url);
  await sendFile(res, file ?? indexHtml, indexHtml);
}

export function start(port = PORT) {
  return createServer((req, res) => {
    handle(req, res).catch(() => {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Something went wrong.');
    });
  }).listen(port, () => console.log(`Dashboard on http://localhost:${port}`));
}

// Only when this file is the program: importing it (a test does) must not open a port.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
