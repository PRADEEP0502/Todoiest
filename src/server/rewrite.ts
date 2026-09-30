/**
 * Turns what someone said into task titles.
 *
 * People here speak Tamil, English, and Tanglish — Tamil written in English letters — often in one
 * sentence, often ungrammatical. This asks a model to write what they meant as short, professional
 * English task titles, keeping the names, numbers, dates and technical words exactly as spoken.
 *
 * The key lives here, never in the browser: the page sends only the words it heard, and gets back
 * only the titles. Nothing is stored or logged.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
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

/** The key the server was started with. Read here, so nothing on the page ever sees it. */
function serverKey(): string | undefined {
  // Vercel's edge and node runtimes both expose env this way; the browser never runs this file.
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.OPENAI_API_KEY;
}

export async function rewriteSpeech(request: Request, apiKey = serverKey()): Promise<Response> {
  if (request.method !== 'POST') return deny(405, 'Send the words as a POST.');
  if (!apiKey) return deny(503, 'Speech to task needs an OpenAI key on the server (OPENAI_API_KEY).');

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
    upstream = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: INSTRUCTIONS },
          { role: 'user', content: text },
        ],
      }),
    });
  } catch {
    return deny(502, 'The writing service could not be reached.');
  }
  if (!upstream.ok) return deny(upstream.status === 401 ? 503 : 502, 'The writing service refused the request.');

  let parsed: unknown;
  try {
    const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
    parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
  } catch {
    return deny(502, 'The writing service sent something unreadable.');
  }

  return new Response(JSON.stringify(cleanResult(parsed)), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
