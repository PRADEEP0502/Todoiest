import { fetchAttachment } from '../src/server/attachmentProxy';

// Todoist serves an attachment only to a signed-in Todoist session and sends no CORS headers, so
// the browser can neither show nor fetch one directly. This function stands in the middle: the
// page asks for a file with its own Todoist token in the Authorization header and gets the bytes
// back from its own origin. The token is never part of a URL, never logged and never stored.

export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return fetchAttachment(request);
}
