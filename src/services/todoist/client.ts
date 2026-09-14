import type { Paginated } from '../../types/todoist';

export const TODOIST_API_BASE = 'https://api.todoist.com/api/v1';

/** Page size for list endpoints (the API maximum is 200). */
const PAGE_LIMIT = 200;
/** Safety stop so a misbehaving cursor can never loop forever. */
const MAX_PAGES = 50;

export class TodoistApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'TodoistApiError';
    this.status = status;
  }
}

type Query = Record<string, string | number | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

function describeStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Todoist rejected the request (400).';
    case 401:
      return 'Todoist token is invalid or expired. Update it in Settings.';
    case 403:
      return 'You do not have access to this Todoist resource.';
    case 404:
      return 'Not found in Todoist. It may have been deleted — sync to refresh.';
    case 429:
      return 'Todoist rate limit reached. Wait a minute and sync again.';
    default:
      return status >= 500 ? 'Todoist is having trouble right now. Try again shortly.' : `Todoist request failed (${status}).`;
  }
}

/** A thin, token-bound HTTP client for the Todoist API v1. */
export class TodoistClient {
  private readonly token: string;

  constructor(token: string) {
    this.token = token.trim();
  }

  async request<T>(path: string, { method = 'GET', query, body, signal }: RequestOptions = {}): Promise<T> {
    const url = new URL(TODOIST_API_BASE + path);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = { Authorization: `Bearer ${this.token}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      throw new TodoistApiError('Could not reach Todoist. Check your internet connection.', 0);
    }

    if (!response.ok) {
      let detail = '';
      try {
        const data = await response.json();
        detail = typeof data?.error === 'string' ? data.error : '';
      } catch {
        // Non-JSON error body; fall back to the status description.
      }
      const message = describeStatus(response.status);
      throw new TodoistApiError(detail && response.status === 400 ? `${message} ${detail}` : message, response.status);
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** Follows `next_cursor` until every page of a `{ results, next_cursor }` list is loaded. */
  async listAll<T>(path: string, query: Query = {}, signal?: AbortSignal): Promise<T[]> {
    const all: T[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const data: Paginated<T> = await this.request<Paginated<T>>(path, {
        query: { ...query, limit: PAGE_LIMIT, cursor },
        signal,
      });
      all.push(...data.results);
      cursor = data.next_cursor;
      if (!cursor) break;
    }
    return all;
  }
}
