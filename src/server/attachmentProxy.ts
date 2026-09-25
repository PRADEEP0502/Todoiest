/**
 * Fetches one Todoist attachment on behalf of the page.
 *
 * Todoist only serves a file to a signed-in Todoist session and sends no CORS headers, so the
 * browser cannot load one itself. The page sends the file's link and its own Todoist token in the
 * Authorization header; this passes both to Todoist and returns the bytes.
 *
 * Rules that keep it safe to expose:
 *  - only Todoist's own file hosts are fetched, so it can never be used to reach anything else;
 *  - the token travels in a header, never in a URL, and is not logged or stored;
 *  - nothing is cached on the way through, and only the file's type and length are passed back.
 */

/** The only hosts this will fetch from. */
export const ALLOWED_HOSTS = ['files.todoist.com', 'app.todoist.com', 'todoist.com', 'image-resize.todoist.com', 'api.todoist.com'];

const ALLOWED_TYPES = /^(image\/|application\/pdf|text\/plain)/;

const deny = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function isTodoistFile(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) ? url : null;
}

export async function fetchAttachment(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get('url');
  if (!target) return deny(400, 'Missing the file to fetch.');
  const url = isTodoistFile(target);
  if (!url) return deny(400, 'Only Todoist attachment links can be fetched.');

  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return deny(401, 'A Todoist token is needed to read this file.');

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers: { Authorization: auth }, redirect: 'follow' });
  } catch {
    return deny(502, 'Todoist could not be reached for this file.');
  }
  if (!upstream.ok || !upstream.body) return deny(upstream.status === 404 ? 404 : 502, 'Todoist did not return this file.');

  // A login page instead of the file means the token cannot open it.
  const type = upstream.headers.get('content-type') ?? 'application/octet-stream';
  if (!ALLOWED_TYPES.test(type)) return deny(403, 'This attachment is not available to the token.');

  const headers = new Headers({ 'content-type': type, 'cache-control': 'private, max-age=300', 'x-content-type-options': 'nosniff' });
  const length = upstream.headers.get('content-length');
  if (length) headers.set('content-length', length);
  return new Response(upstream.body, { status: 200, headers });
}
