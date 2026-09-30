import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanResult, MAX_SPEECH_LENGTH, MAX_TASKS, rewriteSpeech, writerFor } from './rewrite';

const GEMINI_KEY = 'gemini-test-secret';
const OPENAI_KEY = 'sk-test-secret';

const gemini = writerFor({ gemini: GEMINI_KEY })!;
const openai = writerFor({ openai: OPENAI_KEY })!;

const ask = (text: unknown, writer = gemini, method = 'POST') =>
  rewriteSpeech(new Request('https://dash.example/api/rewrite', { method, ...(method === 'POST' ? { body: JSON.stringify({ text }) } : {}) }), writer);

const geminiReply = (content: unknown) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(content) }] } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
const openaiReply = (content: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200, headers: { 'content-type': 'application/json' } });

/** Records what went out, since the request is built as a whole Request here. */
const capture = (reply: Response) => {
  const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
  vi.stubGlobal('fetch', async (request: Request) => {
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => (headers[k] = v));
    calls.push({ url: request.url, headers, body: await request.clone().text() });
    return reply.clone();
  });
  return calls;
};

afterEach(() => vi.unstubAllGlobals());

describe('turning speech into task titles', () => {
  it('asks Gemini, with the key in a header and never in the link', async () => {
    const calls = capture(geminiReply({ tasks: ['Update the JPM website'] }));
    const response = await ask('JPM website update pannanum');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tasks: ['Update the JPM website'] });
    expect(calls[0].headers['x-goog-api-key']).toBe(GEMINI_KEY);
    expect(calls[0].url).not.toContain(GEMINI_KEY);
    expect(calls[0].body).toContain('JPM website update pannanum');
  });

  it('asks OpenAI the same way when that is the key the server has', async () => {
    const calls = capture(openaiReply({ tasks: ['Prepare the quotation'] }));
    expect(await (await ask('quotation ready pannu', openai)).json()).toEqual({ tasks: ['Prepare the quotation'] });
    expect(calls[0].headers.authorization).toBe(`Bearer ${OPENAI_KEY}`);
    expect(calls[0].url).not.toContain(OPENAI_KEY);
  });

  it('prefers Gemini when the server holds both keys', () => {
    expect(writerFor({ gemini: GEMINI_KEY, openai: OPENAI_KEY })?.name).toBe('gemini');
    expect(writerFor({ openai: OPENAI_KEY })?.name).toBe('openai');
    expect(writerFor({})).toBeNull();
  });

  it('never sends a key back to the page', async () => {
    capture(geminiReply({ tasks: ['Prepare the quotation'] }));
    const response = await ask('quotation ready pannu');
    expect(await response.text()).not.toContain(GEMINI_KEY);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('keeps several tasks in the order they were spoken', async () => {
    capture(geminiReply({ tasks: ['Prepare the quotation', 'Obtain MD approval', 'Send it to the Purchase Team'] }));
    expect(await (await ask('first quotation prepare pannanum, next MD approval vangikanum, apram purchase team ku send pannanum')).json()).toEqual({
      tasks: ['Prepare the quotation', 'Obtain MD approval', 'Send it to the Purchase Team'],
    });
  });

  it('asks for more when the words did not describe a task', async () => {
    capture(geminiReply({ tasks: [], question: 'Which machine do you mean?' }));
    expect(await (await ask('adhu venum')).json()).toEqual({ tasks: [], question: 'Which machine do you mean?' });
  });

  it('says plainly when the server has no key, so the page can fall back to plain dictation', async () => {
    const response = await rewriteSpeech(new Request('https://dash.example/api/rewrite', { method: 'POST', body: JSON.stringify({ text: 'hello' }) }), null);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/GEMINI_API_KEY/);
  });

  it('refuses an empty, over-long or badly formed request', async () => {
    capture(geminiReply({ tasks: ['x'] }));
    expect((await ask('   ')).status).toBe(400);
    expect((await ask('x'.repeat(MAX_SPEECH_LENGTH + 1))).status).toBe(400);
    expect((await ask('hello', gemini, 'GET')).status).toBe(405);
  });

  it('says which code a refusal came with, and nothing the service said', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('quota exhausted for project 12345', { status: 429 })));
    const busted = await ask('hello');
    expect(busted.status).toBe(502);
    const { error } = await busted.json();
    expect(error).toContain('429');
    expect(error).not.toContain('project 12345');

    // A key the service will not take is worth saying apart from a service that is merely busy.
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 403 })));
    expect((await ask('hello')).status).toBe(503);

    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    expect((await ask('hello')).status).toBe(502);
  });

  it('survives an answer that is not the JSON it asked for', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not json at all' }] } }] }), { status: 200, headers: { 'content-type': 'application/json' } })),
    );
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
