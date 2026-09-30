import { rewriteSpeech } from '../src/server/rewrite';

// Turns spoken Tamil, English or Tanglish into professional English task titles. The OpenAI key is
// read here from the server's environment (OPENAI_API_KEY) and never reaches the browser: the page
// sends the words it heard and receives only the titles.

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return rewriteSpeech(request);
}
