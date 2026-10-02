import { afterEach, describe, expect, it, vi } from 'vitest';
import { beforeEach } from 'vitest';
import { cleanResult, forgetModel, geminiModel, MAX_SPEECH_LENGTH, MAX_TASKS, rewriteSpeech, writerFor } from './rewrite';

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
const capture = (reply: Response, models = ['gemini-2.0-flash']) => {
  const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
  vi.stubGlobal('fetch', async (request: Request) => {
    const headers: Record<string, string> = {};
    request.headers.forEach((v, k) => (headers[k] = v));
    calls.push({ url: request.url, headers, body: await request.clone().text() });
    // Listing the models comes first; everything after that is the question itself.
    if (request.method === 'GET') return modelList(models);
    return reply.clone();
  });
  return calls;
};

/** The call that carried the words, ignoring the one that asked which models exist. */
const question = (calls: { url: string; headers: Record<string, string>; body: string }[]) => calls.find((c) => c.body.includes('contents') || c.body.includes('messages'))!;

beforeEach(() => forgetModel());
afterEach(() => vi.unstubAllGlobals());

/** Gemini is asked which models the key may use before the first question. */
const modelList = (names: string[]) =>
  new Response(JSON.stringify({ models: names.map((name) => ({ name: `models/${name}`, supportedGenerationMethods: ['generateContent'] })) }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('turning speech into task titles', () => {
  it('asks Gemini, with the key in a header and never in the link', async () => {
    const calls = capture(geminiReply({ tasks: ['Update the JPM website'] }));
    const response = await ask('JPM website update pannanum');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tasks: ['Update the JPM website'] });
    const asked = question(calls);
    expect(asked.headers['x-goog-api-key']).toBe(GEMINI_KEY);
    expect(asked.url).not.toContain(GEMINI_KEY);
    expect(asked.body).toContain('JPM website update pannanum');
  });

  it('asks OpenAI the same way when that is the key the server has', async () => {
    const calls = capture(openaiReply({ tasks: ['Prepare the quotation'] }));
    expect(await (await ask('quotation ready pannu', openai)).json()).toEqual({ tasks: ['Prepare the quotation'] });
    expect(question(calls).headers.authorization).toBe(`Bearer ${OPENAI_KEY}`);
    expect(question(calls).url).not.toContain(OPENAI_KEY);
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

  it('uses a model the key actually has, and looks again when the one it knew is gone', async () => {
    // The key here has no 2.0; the best of what it does have is taken.
    const listed = capture(geminiReply({ tasks: ['Prepare the quotation'] }), ['gemini-1.5-pro', 'gemini-1.5-flash']);
    expect(await geminiModel(GEMINI_KEY)).toBe('gemini-1.5-flash');
    expect(listed[0].url).toContain('/models');

    // A model that has since been retired: the list is asked for again and the question repeated.
    forgetModel();
    let gone = true;
    const seen: string[] = [];
    vi.stubGlobal('fetch', async (request: Request) => {
      if (request.method === 'GET') return modelList(gone ? ['gemini-2.0-flash'] : ['gemini-flash-latest']);
      seen.push(request.url);
      if (gone) {
        gone = false;
        return new Response('', { status: 404 });
      }
      return geminiReply({ tasks: ['Prepare the quotation'] });
    });
    const response = await ask('quotation ready pannu');
    expect(response.status).toBe(200);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toContain('gemini-flash-latest');
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
