/**
 * Turns what someone said into task titles.
 *
 * People here speak Tamil, English, and Tanglish — Tamil written in English letters — often in one
 * sentence, often ungrammatical. This asks a model to write what they meant as short, professional
 * English task titles, keeping the names, numbers, dates and technical words exactly as spoken.
 *
 * Either Google's Gemini or OpenAI can do the writing, whichever key the server holds; Gemini is
 * used when both are set. The key stays here, never in the browser and never in a URL: the page
 * sends only the words it heard and gets back only the titles. Nothing is stored or logged.
 */

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

/** Longer than anyone dictates in one go; a guard, not a limit people will meet. */
export const MAX_SPEECH_LENGTH = 2000;
/** As many tasks as one spoken sentence may become. */
export const MAX_TASKS = 20;
export const MAX_TASK_LENGTH = 500;

const INSTRUCTIONS = `You turn spoken notes into task titles for a factory management dashboard.

The speaker mixes Tamil, English and Tanglish (Tamil written in English letters), and their grammar
is often loose. Work out what they actually want done and write it as clear, professional English.

Rules:
- One title per task. If the speech describes several tasks, return one title for each, in the order spoken.
- Keep every proper name, company name, project name, person, number, date and technical term exactly as spoken. Never translate a name.
- Be concise and use the imperative: "Prepare the quotation and send it to the MD".
- Do not invent detail that was not said, and do not drop detail that was.
- If you cannot tell what is being asked, return no tasks and one short question in English asking for the missing piece.

Answer as JSON: {"tasks": ["..."], "question": "..."} — "question" only when you have no tasks.`;

const deny = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

interface Rewritten {
  tasks: string[];
  question?: string;
}

/**
 * The JSON a model wrote, however it wrapped it. Most answer with plain JSON; some fence it in
 * backticks or add a line of their own, and a long answer can arrive cut short.
 */
export function parseModelJson(text: string): unknown {
  const body = text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(body);
  } catch {
    // Take the outermost object, in case something was said around it.
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(body.slice(start, end + 1));
      } catch {
        // Cut short: keep whichever titles are complete.
      }
    }
    const titles = [...body.matchAll(/"([^"]{4,})"/g)].map((m) => m[1]).filter((t) => !/^(tasks|question)$/.test(t));
    return titles.length ? { tasks: titles } : {};
  }
}

/** Keeps only what the page can use: a handful of short, non-empty titles. */
export function cleanResult(raw: unknown): Rewritten {
  const data = (raw ?? {}) as { tasks?: unknown; question?: unknown };
  const tasks = Array.isArray(data.tasks)
    ? data.tasks
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.replace(/^\s*(?:[-*•]|\d{1,2}[.)])\s*/, '').trim().slice(0, MAX_TASK_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_TASKS)
    : [];
  const question = typeof data.question === 'string' && data.question.trim() ? data.question.trim().slice(0, 300) : undefined;
  return tasks.length ? { tasks } : { tasks: [], question: question ?? 'That was not clear enough to make a task from. Please say it again.' };
}

/** A service that can be asked, and how to read what it answers. */
export interface Writer {
  name: 'gemini' | 'openai';
  ask: (said: string) => Promise<Response>;
  /** The JSON the model wrote, pulled out of that service's own envelope. */
  read: (body: unknown) => unknown;
}

/**
 * Models worth asking, best first. A free key is limited per model, so when one says it has had
 * enough the next is tried; the lite ones are listed because their free allowance is the largest.
 */
const GEMINI_PREFERRED = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
];

/**
 * The models this key may use, best first. Google renames and retires these, and a key only sees
 * some of them, so the list is asked for rather than assumed, and kept for the life of the server.
 */
let candidates: string[] | null = null;
let current = 0;

async function usableModels(key: string, fetcher: typeof fetch): Promise<string[]> {
  if (candidates?.length) return candidates;
  try {
    const response = await fetcher(new Request(`${GEMINI_URL}?pageSize=200`, { headers: { 'x-goog-api-key': key } }));
    if (response.ok) {
      const data = (await response.json()) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] };
      const offered = (data.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => (m.name ?? '').replace(/^models\//, ''))
        .filter((name) => name && !/embedding|aqa|vision|image|tts|live|thinking/i.test(name));
      const ranked = [
        ...GEMINI_PREFERRED.filter((want) => offered.includes(want)),
        ...offered.filter((name) => name.includes('flash') && !GEMINI_PREFERRED.includes(name)),
        ...offered.filter((name) => !name.includes('flash') && !GEMINI_PREFERRED.includes(name)),
      ];
      if (ranked.length) {
        candidates = ranked;
        current = 0;
        return ranked;
      }
    }
  } catch {
    // Fall through to the usual names; the request itself reports anything still wrong.
  }
  candidates = GEMINI_PREFERRED;
  current = 0;
  return candidates;
}

/** The model to ask right now. */
export async function geminiModel(key: string, fetcher: typeof fetch = fetch): Promise<string> {
  const models = await usableModels(key, fetcher);
  return models[Math.min(current, models.length - 1)];
}

/**
 * Moves to the next model this key may use, for when the one in hand is gone or has had its fill.
 * Returns false once they have all been tried.
 */
export function nextModel(): boolean {
  if (!candidates || current >= candidates.length - 1) return false;
  current += 1;
  return true;
}

/** Forgets everything learned about this key's models. */
export function forgetModel(): void {
  candidates = null;
  current = 0;
}

/** Whichever service the server has a key for; Gemini first, since its free tier suits this use. */
export function writerFor(keys: { gemini?: string; openai?: string }): Writer | null {
  const gemini = keys.gemini;
  if (gemini) {
    const call = (said: string, model: string) =>
      fetch(
        new Request(`${GEMINI_URL}/${model}:generateContent`, {
          method: 'POST',
          // The key travels as a header, so it is never part of a URL anywhere.
          headers: { 'x-goog-api-key': gemini, 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
            contents: [{ role: 'user', parts: [{ text: said }] }],
            // Room to spare: a cut-off answer is worse than a few unused tokens.
            generationConfig: { temperature: 0.2, maxOutputTokens: 1200, responseMimeType: 'application/json' },
          }),
        }),
      );
    return {
      name: 'gemini',
      ask: async (said) => {
        let response = await call(said, await geminiModel(gemini));
        // A model that has gone, has had its fill, or is swamped: move to the next this key may
        // use. Each has its own allowance and its own load, so the words still get written.
        const moveOn = [404, 429, 500, 503, 504];
        for (let tries = 0; tries < 4 && moveOn.includes(response.status); tries++) {
          if (response.status === 404) forgetModel();
          else if (!nextModel()) break;
          response = await call(said, await geminiModel(gemini));
        }
        return response;
      },
      read: (body) => {
        const data = body as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        return parseModelJson(data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '');
      },
    };
  }
  const openai = keys.openai;
  if (openai) {
    return {
      name: 'openai',
      ask: (said) =>
        fetch(
          new Request(OPENAI_URL, {
            method: 'POST',
            headers: { authorization: `Bearer ${openai}`, 'content-type': 'application/json' },
            body: JSON.stringify({
              model: OPENAI_MODEL,
              temperature: 0.2,
              max_tokens: 500,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: INSTRUCTIONS },
                { role: 'user', content: said },
              ],
            }),
          }),
        ),
      read: (body) => {
        const data = body as { choices?: { message?: { content?: string } }[] };
        return parseModelJson(data.choices?.[0]?.message?.content ?? '');
      },
    };
  }
  return null;
}

/** The keys the server was started with. Read here, so nothing on the page ever sees them. */
function serverKeys(): { gemini?: string; openai?: string } {
  // Vercel's edge and node runtimes both expose env this way; the browser never runs this file.
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  return { gemini: env.GEMINI_API_KEY || env.GOOGLE_API_KEY, openai: env.OPENAI_API_KEY };
}

export async function rewriteSpeech(request: Request, writer = writerFor(serverKeys())): Promise<Response> {
  if (request.method !== 'POST') return deny(405, 'Send the words as a POST.');
  if (!writer) return deny(503, 'Speech to task needs a key on the server: GEMINI_API_KEY (or OPENAI_API_KEY).');

  let text: string;
  try {
    const body = (await request.json()) as { text?: unknown };
    text = typeof body.text === 'string' ? body.text.trim() : '';
  } catch {
    return deny(400, 'The request was not readable.');
  }
  if (!text) return deny(400, 'Nothing was heard.');
  if (text.length > MAX_SPEECH_LENGTH) return deny(400, 'That is too long to turn into tasks.');

  // These models are busy often enough that one quiet retry is worth more than an error.
  const BUSY = [429, 500, 502, 503, 504];
  let upstream: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      upstream = await writer.ask(text);
    } catch {
      upstream = null;
    }
    if (upstream?.ok || (upstream && !BUSY.includes(upstream.status))) break;
    if (attempt === 0) await new Promise((wake) => setTimeout(wake, 900));
  }
  if (!upstream) return deny(502, 'The writing service could not be reached.');
  if (!upstream.ok) {
    // The code says what to do about it, without repeating anything the service said back, which
    // could carry account detail.
    const wrongKey = upstream.status === 401 || upstream.status === 403;
    const busy = BUSY.includes(upstream.status);
    return deny(
      wrongKey ? 503 : 502,
      busy
        ? `The writing service is busy right now (${upstream.status}). Try again in a moment.`
        : `The writing service refused the request (${upstream.status}).`,
    );
  }

  let parsed: unknown;
  try {
    parsed = writer.read(await upstream.json());
  } catch {
    // Nothing usable came back; the page asks the person to say it again rather than showing a fault.
    parsed = {};
  }

  return new Response(JSON.stringify(cleanResult(parsed)), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
