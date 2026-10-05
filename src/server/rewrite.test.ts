import { afterEach, describe, expect, it, vi } from 'vitest';
import { beforeEach } from 'vitest';
import { cleanResult, MAX_NAMES, namesHint, parseModelJson, forgetModel, geminiModel, MAX_SPEECH_LENGTH, MAX_TASKS, rewriteSpeech, writerFor } from './rewrite';

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

  it('tries once more when the model is merely busy, and then says so', async () => {
    // Overloaded, then fine: the words come back without the reader seeing a failure.
    let first = true;
    vi.stubGlobal('fetch', async (request: Request) => {
      if (request.method === 'GET') return modelList(['gemini-2.0-flash']);
      if (first) {
        first = false;
        return new Response('The model is overloaded', { status: 503 });
      }
      return geminiReply({ tasks: ['Prepare the quotation'] });
    });
    expect(await (await ask('quotation ready pannu')).json()).toEqual({ tasks: ['Prepare the quotation'] });

    // Busy both times: said plainly, as something to try again rather than a fault.
    vi.stubGlobal('fetch', async (request: Request) => (request.method === 'GET' ? modelList(['gemini-2.0-flash']) : new Response('', { status: 503 })));
    const busy = await ask('quotation ready pannu');
    expect(busy.status).toBe(502);
    expect((await busy.json()).error).toMatch(/busy right now \(503\)/);
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

  it('asks the person to say it again when nothing usable came back', async () => {
    vi.stubGlobal('fetch', async (request: Request) =>
      request.method === 'GET'
        ? modelList(['gemini-2.0-flash'])
        : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not json at all' }] } }] }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const response = await ask('hello');
    expect(response.status).toBe(200);
    const { tasks, question } = await response.json();
    expect(tasks).toEqual([]);
    expect(question).toBeTruthy();
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

describe('reading what the model wrote, however it wrapped it', () => {
  it('reads plain JSON', () => {
    expect(parseModelJson('{"tasks":["Update the JPM website"]}')).toEqual({ tasks: ['Update the JPM website'] });
  });

  it('reads JSON fenced in backticks, or with a line said around it', () => {
    expect(parseModelJson('```json\n{"tasks":["Prepare the quotation"]}\n```')).toEqual({ tasks: ['Prepare the quotation'] });
    expect(parseModelJson('Here you go:\n{"tasks":["Prepare the quotation"]}\nHope that helps.')).toEqual({ tasks: ['Prepare the quotation'] });
  });

  it('keeps the titles it can see when the answer was cut short', () => {
    const cut = '{"tasks":["Prepare the quotation","Obtain MD approval","Send it to the Purcha';
    expect((parseModelJson(cut) as { tasks: string[] }).tasks).toEqual(['Prepare the quotation', 'Obtain MD approval']);
  });

  it('gives nothing back when there is nothing in there', () => {
    expect(parseModelJson('')).toEqual({});
    expect(parseModelJson('sorry, I cannot')).toEqual({});
  });
});

describe('when one model has had its fill', () => {
  beforeEach(() => forgetModel());
  afterEach(() => vi.unstubAllGlobals());

  it('moves to the next model this key may use, and the words still get written', async () => {
    const asked: string[] = [];
    vi.stubGlobal('fetch', async (request: Request) => {
      if (request.method === 'GET') return modelList(['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash']);
      asked.push(request.url);
      // The first model is spent; the next one answers.
      if (asked.length === 1) return new Response('quota', { status: 429 });
      return geminiReply({ tasks: ['Prepare the quotation'] });
    });

    const response = await rewriteSpeech(
      new Request('https://dash.example/api/rewrite', { method: 'POST', body: JSON.stringify({ text: 'quotation ready pannu' }) }),
      writerFor({ gemini: 'gemini-test-secret' }),
    );
    expect(await response.json()).toEqual({ tasks: ['Prepare the quotation'] });
    expect(asked).toHaveLength(2);
    expect(asked[0]).toContain('gemini-2.0-flash:');
    expect(asked[1]).toContain('gemini-2.0-flash-lite');
  });

  it('moves on when a model is swamped, not only when it is spent', async () => {
    const asked: string[] = [];
    vi.stubGlobal('fetch', async (request: Request) => {
      if (request.method === 'GET') return modelList(['gemini-2.0-flash', 'gemini-2.0-flash-lite']);
      asked.push(request.url);
      // Gemini answers 503 "overloaded" for the first model; the next one is free.
      if (asked.length === 1) return new Response('overloaded', { status: 503 });
      return geminiReply({ tasks: ['Update the JPM website'] });
    });
    const response = await rewriteSpeech(
      new Request('https://dash.example/api/rewrite', { method: 'POST', body: JSON.stringify({ text: 'ஜேபிஎம் வெப்சைட்டை அப்டேட் பண்ணனும்' }) }),
      writerFor({ gemini: 'gemini-test-secret' }),
    );
    expect(await response.json()).toEqual({ tasks: ['Update the JPM website'] });
    expect(asked[1]).toContain('gemini-2.0-flash-lite');
  });

  it('carries Tamil to the model exactly as it was spoken', async () => {
    const said = 'கொட்டேஷன் தயார் பண்ணி எம்டி கிட்ட அனுப்பணும்';
    let sent = '';
    vi.stubGlobal('fetch', async (request: Request) => {
      if (request.method === 'GET') return modelList(['gemini-2.0-flash']);
      sent = await request.clone().text();
      return geminiReply({ tasks: ['Prepare the quotation and send it to the MD'] });
    });
    const response = await rewriteSpeech(
      new Request('https://dash.example/api/rewrite', { method: 'POST', body: JSON.stringify({ text: said }) }),
      writerFor({ gemini: 'gemini-test-secret' }),
    );
    expect(await response.json()).toEqual({ tasks: ['Prepare the quotation and send it to the MD'] });
    // The Tamil arrives whole, not as escapes or question marks.
    expect(JSON.parse(sent).contents[0].parts[0].text).toBe(said);
  });

  it('gives up once every model has said the same, and says it is busy', async () => {
    vi.stubGlobal('fetch', async (request: Request) =>
      request.method === 'GET' ? modelList(['gemini-2.0-flash', 'gemini-2.5-flash']) : new Response('quota', { status: 429 }),
    );
    const response = await rewriteSpeech(
      new Request('https://dash.example/api/rewrite', { method: 'POST', body: JSON.stringify({ text: 'quotation ready pannu' }) }),
      writerFor({ gemini: 'gemini-test-secret' }),
    );
    expect(response.status).toBe(502);
    expect((await response.json()).error).toMatch(/busy right now \(429\)/);
  });
});

describe('the workspace names sent along with the words', () => {
  it('puts them where the model can match a Tamil spelling against them', () => {
    const hint = namesHint(['JPM Billpassing', '6T mechine', 'Meenakshi sundaram']);
    expect(hint).toContain('JPM Billpassing');
    expect(hint).toContain('6T mechine');
    expect(hint).toMatch(/Tamil spelling/);
  });

  it('keeps the list sane: no blanks, no repeats, no runaway length', () => {
    expect(namesHint([])).toBe('');
    expect(namesHint('not a list')).toBe('');
    expect(namesHint([' RV ', 'RV', '', '   '])).toContain('RV');
    expect(namesHint([' RV ', 'RV'])).not.toMatch(/RV,\s*RV/);
    const many = namesHint(Array.from({ length: 200 }, (_, i) => `Name ${i}`));
    const listed = many.split(String.fromCharCode(10)).find((line) => line.startsWith('Name 0'))!;
    expect(listed.split(', ')).toHaveLength(MAX_NAMES);
    expect(namesHint(['x'.repeat(200)])).toContain('x'.repeat(60));
    expect(namesHint(['x'.repeat(200)])).not.toContain('x'.repeat(61));
  });
});
