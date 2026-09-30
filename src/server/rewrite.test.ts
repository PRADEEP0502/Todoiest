import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanResult, MAX_SPEECH_LENGTH, MAX_TASKS, rewriteSpeech } from './rewrite';

const KEY = 'sk-test-secret';
// An empty key stands for "the server has none"; the real environment is never consulted here.
const ask = (text: unknown, key = KEY, method = 'POST') =>
  rewriteSpeech(new Request('https://dash.example/api/rewrite', { method, ...(method === 'POST' ? { body: JSON.stringify({ text }) } : {}) }), key);

const reply = (content: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

afterEach(() => vi.unstubAllGlobals());

describe('turning speech into task titles', () => {
  it('sends the words to the model with the key in a header, and returns the titles', async () => {
    const calls: { url: string; auth: string | null; body: string }[] = [];
    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
      calls.push({ url: String(url), auth: new Headers(init.headers).get('authorization'), body: String(init.body) });
      return Promise.resolve(reply({ tasks: ['Update the JPM website'] }));
    });

    const response = await ask('JPM website update pannanum');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tasks: ['Update the JPM website'] });
    expect(calls[0].auth).toBe(`Bearer ${KEY}`);
    expect(calls[0].url).not.toContain(KEY);
    // The spoken words go up; nothing else about the workspace does.
    expect(calls[0].body).toContain('JPM website update pannanum');
  });

  it('never sends the key back to the page', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(reply({ tasks: ['Prepare the quotation'] })));
    const response = await ask('quotation ready pannu');
    const text = await response.text();
    expect(text).not.toContain(KEY);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('keeps several tasks in the order they were spoken', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(reply({ tasks: ['Prepare the quotation', 'Obtain MD approval', 'Send it to the Purchase Team'] })));
    expect(await (await ask('first quotation prepare pannanum, next MD approval vangikanum, apram purchase team ku send pannanum')).json()).toEqual({
      tasks: ['Prepare the quotation', 'Obtain MD approval', 'Send it to the Purchase Team'],
    });
  });

  it('asks for more when the words did not describe a task', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(reply({ tasks: [], question: 'Which machine do you mean?' })));
    expect(await (await ask('adhu venum')).json()).toEqual({ tasks: [], question: 'Which machine do you mean?' });
  });

  it('says plainly when the server has no key, so the page can fall back to plain dictation', async () => {
    const response = await ask('anything', '');
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/OPENAI_API_KEY/);
  });

  it('refuses an empty, over-long or badly formed request', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(reply({ tasks: ['x'] })));
    expect((await ask('   ')).status).toBe(400);
    expect((await ask('x'.repeat(MAX_SPEECH_LENGTH + 1))).status).toBe(400);
    expect((await ask('hello', KEY, 'GET')).status).toBe(405);
  });

  it('survives a model that fails or answers with nonsense', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })));
    const failed = await ask('hello');
    expect(failed.status).toBe(502);
    // The code comes back so the cause is knowable; nothing the service said does.
    expect((await failed.json()).error).toContain('500');
    vi.stubGlobal('fetch', () => Promise.resolve(reply('not json at all')));
    expect((await ask('hello')).status).toBe(502);
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    expect((await ask('hello')).status).toBe(502);
  });

  it('cleans what comes back: bullets off, blanks out, a sane number kept', () => {
    expect(cleanResult({ tasks: ['- Prepare the quotation', '  ', '2. Obtain MD approval', 42] })).toEqual({
      tasks: ['Prepare the quotation', 'Obtain MD approval'],
    });
    expect(cleanResult({ tasks: Array.from({ length: 40 }, (_, i) => `Task ${i}`) }).tasks).toHaveLength(MAX_TASKS);
    // Nothing usable: the page is told to ask again rather than shown an empty list.
    expect(cleanResult({}).question).toBeTruthy();
    expect(cleanResult({ tasks: [], question: 'Which pump?' })).toEqual({ tasks: [], question: 'Which pump?' });
  });
});
