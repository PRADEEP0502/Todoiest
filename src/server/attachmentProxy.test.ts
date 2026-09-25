import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAttachment } from './attachmentProxy';

const ask = (url: string | null, auth: string | null = 'Bearer secret-token') =>
  fetchAttachment(
    new Request(`https://dash.example/api/attachment${url === null ? '' : `?url=${encodeURIComponent(url)}`}`, {
      headers: auth ? { authorization: auth } : {},
    }),
  );

const photo = (type = 'image/jpeg') => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': type, 'content-length': '3' } });

afterEach(() => vi.unstubAllGlobals());

describe('the attachment endpoint', () => {
  it('passes the token to Todoist in a header and returns the file', async () => {
    const calls: { url: string; auth: string | null }[] = [];
    vi.stubGlobal('fetch', (input: URL | string, init?: RequestInit) => {
      calls.push({ url: String(input), auth: new Headers(init?.headers).get('authorization') });
      return Promise.resolve(photo());
    });

    const response = await ask('https://files.todoist.com/user_upload/v2/1/file.jpg');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(calls[0].auth).toBe('Bearer secret-token');
    // The token is never put into the link itself.
    expect(calls[0].url).not.toContain('secret-token');
  });

  it('fetches Todoist hosts only, so it cannot be pointed elsewhere', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(photo()));
    for (const url of ['https://evil.example/steal.jpg', 'http://files.todoist.com/x.jpg', 'https://files.todoist.com.evil.example/x.jpg', 'file:///etc/passwd']) {
      const response = await ask(url);
      expect(response.status, url).toBe(400);
    }
    expect((await ask(null)).status).toBe(400);
  });

  it('needs a token', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(photo()));
    expect((await ask('https://files.todoist.com/a.jpg', null)).status).toBe(401);
    expect((await ask('https://files.todoist.com/a.jpg', 'secret-token')).status).toBe(401);
  });

  it('refuses anything that is not a file, such as a login page', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('<html>sign in</html>', { status: 200, headers: { 'content-type': 'text/html' } })));
    const response = await ask('https://files.todoist.com/a.jpg');
    expect(response.status).toBe(403);
  });

  it('answers plainly when Todoist fails or the file is gone', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 404 })));
    expect((await ask('https://files.todoist.com/a.jpg')).status).toBe(404);
    vi.stubGlobal('fetch', () => Promise.reject(new Error('network down')));
    expect((await ask('https://files.todoist.com/a.jpg')).status).toBe(502);
  });

  it('never lets a response be cached in a shared place', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(photo()));
    const response = await ask('https://files.todoist.com/a.jpg');
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
