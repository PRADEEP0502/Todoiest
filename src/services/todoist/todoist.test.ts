import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildIndex } from '../../lib/hierarchy';
import { searchWorkspace } from '../../lib/search';
import { TodoistApiError } from './client';
import type { SyncStep } from './dataSource';
import { createDemoSource } from './demoSource';
import { createLiveSource } from './liveSource';

interface Call {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
  auth: string | null;
}

/** Fake Todoist API v1: answers by method + path and records every request. */
function mockTodoist(routes: Record<string, (call: Call) => unknown>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: URL | string, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const call: Call = {
        method: init.method ?? 'GET',
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: init.body ? JSON.parse(String(init.body)) : undefined,
        auth: new Headers(init.headers).get('Authorization'),
      };
      calls.push(call);
      const handler = routes[`${call.method} ${call.path}`];
      if (!handler) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
      const result = handler(call);
      if (result instanceof Response) return result;
      return new Response(result === undefined ? null : JSON.stringify(result), { status: result === undefined ? 204 : 200 });
    }),
  );
  return calls;
}

const page = <T,>(results: T[], next: string | null = null) => ({ results, next_cursor: next });

const apiTask = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  project_id: 'p1',
  section_id: null,
  parent_id: null,
  content: `Task ${id}`,
  description: '',
  priority: 1,
  due: null,
  labels: [],
  responsible_uid: null,
  note_count: 0,
  child_order: 1,
  checked: false,
  added_at: null,
  completed_at: null,
  ...extra,
});

afterEach(() => vi.unstubAllGlobals());

describe('live Todoist source (API v1)', () => {
  it('syncs projects, sections, tasks and completed tasks from the v1 endpoints, following cursors', async () => {
    const calls = mockTodoist({
      'GET /api/v1/user': () => ({ id: 'u1', full_name: 'Pradeep K', email: 'p@example.com' }),
      'GET /api/v1/workspaces': () => [{ id: '77', name: 'JPM' }],
      'GET /api/v1/projects': ({ query }) =>
        query.cursor
          ? page([{ id: 'p2', name: 'MANPOWER 🎯', color: 'red', parent_id: null, child_order: 2, workspace_id: '77' }])
          : page(
              [
                { id: 'p1', name: 'RV', color: 'blue', parent_id: null, child_order: 1, workspace_id: '77' },
                { id: 'old', name: 'Archived', color: 'blue', parent_id: null, child_order: 3, is_archived: true },
              ],
              'next.page',
            ),
      'GET /api/v1/sections': () => page([{ id: 's1', project_id: 'p2', name: 'Hiring', section_order: 1 }]),
      'GET /api/v1/tasks': () =>
        page([
          apiTask('t1', { responsible_uid: 'u9' }),
          apiTask('t2', { project_id: 'p2', section_id: 's1', priority: 4, note_count: 3 }),
        ]),
      'GET /api/v1/tasks/completed/by_completion_date': () => ({
        items: [apiTask('done1', { checked: true, completed_at: new Date().toISOString() }), apiTask('lost', { project_id: 'old' })],
        next_cursor: null,
      }),
      'GET /api/v1/labels': () => page([{ id: 'l1', name: 'urgent', color: 'red', order: 1 }]),
      'GET /api/v1/projects/p1/collaborators': () => page([{ id: 'u9', name: 'Kavya', email: 'k@example.com' }]),
    });

    const steps: SyncStep[] = [];
    const snapshot = await createLiveSource('  secret-token ').sync((s) => steps.push(s));

    expect(steps).toEqual(['projects', 'sections', 'tasks', 'completed']);
    expect(calls.every((c) => c.auth === 'Bearer secret-token')).toBe(true);
    expect(calls.filter((c) => c.path === '/api/v1/projects').map((c) => c.query.cursor ?? null)).toEqual([null, 'next.page']);
    expect(calls.find((c) => c.path === '/api/v1/tasks')!.query.limit).toBe('200');

    const completedCall = calls.find((c) => c.path === '/api/v1/tasks/completed/by_completion_date')!;
    expect(new Date(completedCall.query.since).getTime()).toBeLessThan(Date.now());
    expect(new Date(completedCall.query.until).getTime()).toBeGreaterThan(Date.now());

    expect(snapshot.projects.map((p) => p.name)).toEqual(['RV', 'MANPOWER 🎯']);
    expect(snapshot.completed.map((t) => t.id)).toEqual(['done1']);
    expect(snapshot.collaborators.u9.name).toBe('Kavya');

    const index = buildIndex(snapshot);
    expect(index.groups.map((g) => g.name)).toEqual(['JPM']);
    expect(searchWorkspace(index, 'task t2').tasks[0].path).toEqual(['MANPOWER 🎯', 'Hiring', 'Task t2']);
  });

  it('creates, updates, moves, completes, reopens and deletes tasks with the documented requests', async () => {
    const calls = mockTodoist({
      'POST /api/v1/tasks': ({ body }) => apiTask('new', body as Record<string, unknown>),
      'POST /api/v1/tasks/t1': ({ body }) => apiTask('t1', body as Record<string, unknown>),
      'POST /api/v1/tasks/t1/move': ({ body }) => apiTask('t1', body as Record<string, unknown>),
      'POST /api/v1/tasks/t1/close': () => undefined,
      'POST /api/v1/tasks/t1/reopen': () => undefined,
      'DELETE /api/v1/tasks/t1': () => undefined,
    });
    const source = createLiveSource('tok');

    await source.createTask({ content: 'Call vendor', project_id: 'p1', section_id: 's1', priority: 4, due_date: '2026-09-15' });
    await source.updateTask('t1', { content: 'Renamed', due_string: 'no date' });
    await source.moveTask('t1', { project_id: 'p1', section_id: 's2' });
    await source.moveTask('t1', { project_id: 'p3', section_id: null });
    await source.completeTask('t1');
    await source.reopenTask('t1');
    await source.deleteTask('t1');

    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /api/v1/tasks',
      'POST /api/v1/tasks/t1',
      'POST /api/v1/tasks/t1/move',
      'POST /api/v1/tasks/t1/move',
      'POST /api/v1/tasks/t1/close',
      'POST /api/v1/tasks/t1/reopen',
      'DELETE /api/v1/tasks/t1',
    ]);
    expect(calls[0].body).toEqual({ content: 'Call vendor', project_id: 'p1', section_id: 's1', priority: 4, due_date: '2026-09-15' });
    expect(calls[1].body).toEqual({ content: 'Renamed', due_string: 'no date' });
    expect(calls[2].body).toEqual({ section_id: 's2' });
    expect(calls[3].body).toEqual({ project_id: 'p3' });
  });

  it('turns HTTP failures into readable errors', async () => {
    mockTodoist({ 'GET /api/v1/user': () => new Response('{}', { status: 401 }) });
    const error = await createLiveSource('bad').sync(() => {}).catch((e) => e);
    expect(error).toBeInstanceOf(TodoistApiError);
    expect(error.status).toBe(401);
    expect(error.message).toMatch(/token/i);
  });
});

describe('demo source', () => {
  it('completes a parent together with its subtasks and can reopen it', async () => {
    const source = createDemoSource();
    const before = await source.sync(() => {});
    const parent = before.tasks.find((t) => t.content === 'Develop LMS-style Onboarding System')!;

    await source.completeTask(parent.id);
    const after = await source.sync(() => {});
    expect(after.tasks.some((t) => t.id === parent.id || t.parent_id === parent.id)).toBe(false);
    expect(after.tasks).toHaveLength(before.tasks.length - 4);
    expect(after.completed.some((t) => t.id === parent.id)).toBe(true);

    await source.reopenTask(parent.id);
    const reopened = await source.sync(() => {});
    expect(reopened.tasks.some((t) => t.id === parent.id)).toBe(true);
  });

  it('keeps each demo session isolated', async () => {
    const a = createDemoSource();
    const b = createDemoSource();
    const created = await a.createTask({ content: 'Only in A', project_id: 'p-rv' });
    expect((await a.sync(() => {})).tasks.some((t) => t.id === created.id)).toBe(true);
    expect((await b.sync(() => {})).tasks.some((t) => t.content === 'Only in A')).toBe(false);
  });
});
