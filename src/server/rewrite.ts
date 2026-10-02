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

/** Models that are worth asking, best first; any other `flash` model will do if none are offered. */
const GEMINI_PREFERRED = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];

/**
 * Which Gemini model this key may use. Google renames and retires these, and a key only sees some
 * of them, so the list is asked for rather than assumed, and remembered for the life of the server.
 */
let chosenModel: string | null = null;

export async function geminiModel(key: string, fetcher: typeof fetch = fetch): Promise<string> {
  if (chosenModel) return chosenModel;
  try {
    const response = await fetcher(new Request(`${GEMINI_URL}?pageSize=200`, { headers: { 'x-goog-api-key': key } }));
    if (response.ok) {
      const data = (await response.json()) as { models?: { name?: string; supportedGenerationMethods?: string[] }[] };
      const usable = (data.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => (m.name ?? '').replace(/^models\//, ''))
        .filter((name) => name && !/embedding|aqa|vision|image|tts|live/i.test(name));
      const best = GEMINI_PREFERRED.find((want) => usable.includes(want)) ?? usable.find((name) => name.includes('flash')) ?? usable[0];
      if (best) {
        chosenModel = best;
        return best;
      }
    }
  } catch {
    // Fall through to the usual name; the request itself will report anything still wrong.
  }
  return GEMINI_PREFERRED[0];
}

/** Forgets the chosen model, so the next request works out which one this key may use now. */
export function forgetModel(): void {
  chosenModel = null;
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
            generationConfig: { temperature: 0.2, maxOutputTokens: 600, responseMimeType: 'application/json' },
          }),
        }),
      );
    return {
      name: 'gemini',
      ask: async (said) => {
        const response = await call(said, await geminiModel(gemini));
        // The remembered model has gone: find out what this key may use now, and ask once more.
        if (response.status === 404) {
          forgetModel();
          return call(said, await geminiModel(gemini));
        }
        return response;
      },
      read: (body) => {
        const data = body as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');
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
        return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
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

  let upstream: Response;
  try {
    upstream = await writer.ask(text);
  } catch {
    return deny(502, 'The writing service could not be reached.');
  }
  // The code says what to do about it — 401 or 403 a wrong key, 429 no credit left — without
  // repeating anything the service said back, which could carry account detail.
  if (!upstream.ok) {
    const wrongKey = upstream.status === 401 || upstream.status === 403;
    return deny(wrongKey ? 503 : 502, `The writing service refused the request (${upstream.status}).`);
  }

  let parsed: unknown;
  try {
    parsed = writer.read(await upstream.json());
  } catch {
    return deny(502, 'The writing service sent something unreadable.');
  }

  return new Response(JSON.stringify(cleanResult(parsed)), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
