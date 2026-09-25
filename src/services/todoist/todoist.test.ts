import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseTitle } from '../../lib/cd';
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
        body: init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : init.body ? JSON.parse(String(init.body)) : undefined,
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
  child_order: 1,
  checked: false,
  added_at: null,
  completed_at: null,
  ...extra,
});

const now = () => new Date().toISOString();

afterEach(() => vi.unstubAllGlobals());

describe('live Todoist source (API v1)', () => {
  it('loads the workspace with the Sync API, then merges incremental changes by id', async () => {
    let syncCount = 0;
    const calls = mockTodoist({
      'POST /api/v1/sync': ({ body }) => {
        const form = body as Record<string, string>;
        syncCount++;
        if (form.sync_token === '*') {
          return {
            sync_token: 'tok-1',
            full_sync: true,
            user: { id: 'u1', full_name: 'Pradeep K', email: 'p@example.com' },
            workspaces: [{ id: '77', name: 'JPM' }],
            projects: [
              { id: 'p1', name: 'RV', color: 'blue', parent_id: null, child_order: 1, workspace_id: '77' },
              { id: 'p2', name: 'MANPOWER 🎯', color: 'red', parent_id: null, child_order: 2, workspace_id: '77' },
              { id: 'old', name: 'Archived', color: 'blue', parent_id: null, child_order: 3, is_archived: true },
            ],
            sections: [{ id: 's1', project_id: 'p2', name: 'Hiring', section_order: 1 }],
            items: [apiTask('t1', { responsible_uid: 'u9' }), apiTask('t2', { project_id: 'p2', section_id: 's1', priority: 4 })],
            notes: [
              {
                id: 'n1',
                item_id: 't2',
                posted_uid: 'u9',
                content: 'Two agencies shortlisted',
                posted_at: '2026-09-14T08:00:00Z',
                file_attachment: {
                  file_name: 'image.jpg',
                  file_type: 'image/jpeg',
                  file_url: 'https://files.todoist.com/user_upload/v2/1/file.jpg',
                  file_size: 109_724,
                  image: 'https://files.todoist.com/user_upload/v2/1/file.jpg',
                  image_width: 599,
                  image_height: 1280,
                  tn_m: ['https://image-resize.todoist.com/m.jpg', 288, 288],
                  upload_state: 'completed',
                },
              },
              { id: 'n2', item_id: 't2', posted_uid: 'u1', content: 'ok', posted_at: '2026-09-14T09:00:00Z' },
              // Still uploading, and one with no link at all: neither becomes an attachment.
              { id: 'n3', item_id: 't1', posted_uid: 'u1', content: 'uploading', posted_at: '2026-09-14T09:05:00Z', file_attachment: { file_name: 'wait.jpg', file_url: 'https://files.todoist.com/x.jpg', upload_state: 'pending' } },
              { id: 'n4', item_id: 't1', posted_uid: 'u1', content: 'no link', posted_at: '2026-09-14T09:06:00Z', file_attachment: { file_name: 'gone.jpg', file_type: 'image/jpeg' } },
            ],
            labels: [{ id: 'l1', name: 'urgent', color: 'red', order: 1 }],
            collaborators: [{ id: 'u9', full_name: 'Kavya', email: 'k@example.com' }],
          };
        }
        expect(form.sync_token).toBe('tok-1');
        return {
          sync_token: 'tok-2',
          full_sync: false,
          projects: [{ id: 'p2', name: 'MANPOWER (renamed)', color: 'red', parent_id: null, child_order: 2, workspace_id: '77' }],
          items: [apiTask('t1', { checked: true }), apiTask('t3', { project_id: 'p2', section_id: 's1', content: 'New task' })],
          notes: [{ id: 'n2', item_id: 't2', posted_uid: 'u1', content: 'ok', posted_at: null, is_deleted: true }],
        };
      },
      'GET /api/v1/tasks/completed/by_completion_date': () => ({
        items: [apiTask('done1', { checked: true, completed_at: now() }), apiTask('lost', { project_id: 'old' })],
        next_cursor: null,
      }),
      'GET /api/v1/activities': ({ query }) =>
        query.cursor
          ? page([{ id: 2, object_type: 'note', object_id: 'n1', event_type: 'added', event_date: now(), parent_project_id: 'p2', parent_item_id: 't2', initiator_id: 'u9', extra_data: { content: 'Two agencies shortlisted' } }])
          : page([{ id: 1, object_type: 'item', object_id: 'done1', event_type: 'completed', event_date: now(), parent_project_id: 'p1', parent_item_id: null, initiator_id: 'u1', extra_data: { content: 'Task done1' } }], 'next.page'),
    });

    const steps: SyncStep[] = [];
    const source = createLiveSource('  secret-token ');
    const snapshot = await source.sync((s) => steps.push(s));

    expect(steps).toEqual(['workspace', 'completed', 'activity']);
    expect(calls.every((c) => c.auth === 'Bearer secret-token')).toBe(true);
    const syncBody = calls.find((c) => c.path === '/api/v1/sync')!.body as Record<string, string>;
    expect(syncBody.sync_token).toBe('*');
    expect(JSON.parse(syncBody.resource_types)).toEqual(expect.arrayContaining(['projects', 'sections', 'items', 'notes', 'labels', 'collaborators']));

    const completedCall = calls.find((c) => c.path === '/api/v1/tasks/completed/by_completion_date')!;
    expect(new Date(completedCall.query.since).getTime()).toBeLessThan(Date.now());
    expect(new Date(completedCall.query.until).getTime()).toBeGreaterThan(Date.now());

    const activityCalls = calls.filter((c) => c.path === '/api/v1/activities');
    expect(activityCalls.map((c) => c.query.cursor ?? null)).toEqual([null, 'next.page']);
    expect(activityCalls[0].query.annotate_parents).toBe('true');
    expect(new Date(activityCalls[0].query.date_from).getTime()).toBeLessThan(Date.now());

    expect(snapshot.projects.map((p) => p.name)).toEqual(['RV', 'MANPOWER 🎯']);
    expect(snapshot.completed.map((t) => t.id)).toEqual(['done1']);
    expect(snapshot.people.u9.name).toBe('Kavya');
    expect(snapshot.tasks.find((t) => t.id === 't2')!.note_count).toBe(2);
    expect(snapshot.activity.map((e) => e.id).sort()).toEqual(['1', '2']);

    const index = buildIndex(snapshot);
    expect(index.groups.map((g) => g.name)).toEqual(['JPM']);
    expect(searchWorkspace(index, 'task t2').tasks[0].path).toEqual(['MANPOWER 🎯', 'Hiring', 'Task t2']);

    // Second sync: only changes come back — rename, completion, new task, deleted comment.
    const next = await source.sync(() => {});
    expect(syncCount).toBe(2);
    expect(next.projects.find((p) => p.id === 'p2')!.name).toBe('MANPOWER (renamed)');
    expect(next.tasks.map((t) => t.id).sort()).toEqual(['t2', 't3']);
    expect(next.comments.map((c) => c.id)).toEqual(['n1', 'n3', 'n4']);
    // A comment's file becomes the task's attachment, with Todoist's own links kept as given.
    const photo = snapshot.comments.find((c) => c.id === 'n1')!.attachment!;
    expect(photo).toMatchObject({
      name: 'image.jpg',
      type: 'image/jpeg',
      url: 'https://files.todoist.com/user_upload/v2/1/file.jpg',
      thumbnail: 'https://image-resize.todoist.com/m.jpg',
      width: 599,
      height: 1280,
      size: 109_724,
    });
    // No token is ever put into a file link.
    expect(JSON.stringify(photo)).not.toContain('secret-token');
    expect(snapshot.comments.find((c) => c.id === 'n2')!.attachment).toBeNull();
    // A file still uploading, or one without a link, is left out.
    expect(snapshot.comments.find((c) => c.id === 'n3')!.attachment).toBeNull();
    expect(snapshot.comments.find((c) => c.id === 'n4')!.attachment).toBeNull();

    expect(next.tasks.find((t) => t.id === 't2')!.note_count).toBe(1);
    expect(next.sections).toHaveLength(1);
  });

  it('keeps working when the activity log is not available on the Todoist plan', async () => {
    mockTodoist({
      'POST /api/v1/sync': () => ({ sync_token: 't', full_sync: true, user: { id: 'u1', full_name: 'A', email: 'a@x' }, projects: [], sections: [], items: [], notes: [], labels: [], collaborators: [] }),
      'GET /api/v1/tasks/completed/by_completion_date': () => ({ items: [], next_cursor: null }),
      'GET /api/v1/activities': () => new Response('{}', { status: 403 }),
    });
    const snapshot = await createLiveSource('tok').sync(() => {});
    expect(snapshot.activity).toEqual([]);
    expect(snapshot.activityStatus.ok).toBe(false);
    expect(snapshot.completedStatus.ok).toBe(true);
  });

  it('creates, updates, moves, completes, reopens, deletes and comments with the documented requests', async () => {
    const calls = mockTodoist({
      'POST /api/v1/tasks': ({ body }) => apiTask('new', body as Record<string, unknown>),
      'POST /api/v1/tasks/t1': ({ body }) => apiTask('t1', body as Record<string, unknown>),
      'POST /api/v1/tasks/t1/move': ({ body }) => apiTask('t1', body as Record<string, unknown>),
      'POST /api/v1/tasks/t1/close': () => undefined,
      'POST /api/v1/tasks/t1/reopen': () => undefined,
      'DELETE /api/v1/tasks/t1': () => undefined,
      'POST /api/v1/comments': ({ body }) => ({ id: 'c9', posted_uid: 'u1', content: (body as { content: string }).content, posted_at: '2026-09-14T10:00:00Z' }),
    });
    const source = createLiveSource('tok');

    await source.createTask({ content: 'Call vendor', project_id: 'p1', section_id: 's1', priority: 4, due_date: '2026-09-15' });
    await source.updateTask('t1', { content: 'Renamed', due_string: 'no date' });
    await source.moveTask('t1', { project_id: 'p1', section_id: 's2' });
    await source.moveTask('t1', { project_id: 'p3', section_id: null });
    await source.completeTask('t1');
    await source.reopenTask('t1');
    await source.deleteTask('t1');
    const comment = await source.addComment('t1', 'Done by Friday');

    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /api/v1/tasks',
      'POST /api/v1/tasks/t1',
      'POST /api/v1/tasks/t1/move',
      'POST /api/v1/tasks/t1/move',
      'POST /api/v1/tasks/t1/close',
      'POST /api/v1/tasks/t1/reopen',
      'DELETE /api/v1/tasks/t1',
      'POST /api/v1/comments',
    ]);
    expect(calls[0].body).toEqual({ content: 'Call vendor', project_id: 'p1', section_id: 's1', priority: 4, due_date: '2026-09-15' });
    expect(calls[1].body).toEqual({ content: 'Renamed', due_string: 'no date' });
    expect(calls[2].body).toEqual({ section_id: 's2' });
    expect(calls[3].body).toEqual({ project_id: 'p3' });
    expect(calls[7].body).toEqual({ task_id: 't1', content: 'Done by Friday' });
    expect(comment).toMatchObject({ id: 'c9', task_id: 't1', content: 'Done by Friday' });
  });

  it('creates projects and sections, and re-reads a task, with the documented requests', async () => {
    const calls = mockTodoist({
      'POST /api/v1/projects': ({ body }) => ({ id: 'p9', child_order: 1, parent_id: null, color: 'grey', ...(body as object) }),
      'POST /api/v1/sections': ({ body }) => ({ id: 's9', section_order: 1, ...(body as object) }),
      'GET /api/v1/tasks/t1': () => apiTask('t1', { due: { date: '2026-09-16', is_recurring: true } }),
    });
    const source = createLiveSource('tok');

    await source.createProject({ name: 'Plant Expansion', color: 'blue' });
    await source.createProject({ name: 'Team plan', workspace_id: '240513' });
    await source.createProject({ name: 'Sub', parent_id: 'p1' });
    const section = await source.createSection({ name: 'WEBSITE', project_id: 'p9' });
    const task = await source.getTask('t1');

    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /api/v1/projects',
      'POST /api/v1/projects',
      'POST /api/v1/projects',
      'POST /api/v1/sections',
      'GET /api/v1/tasks/t1',
    ]);
    expect(calls[0].body).toEqual({ name: 'Plant Expansion', color: 'blue' });
    // Documented as an integer, so numeric workspace ids are sent as numbers.
    expect(calls[1].body).toEqual({ name: 'Team plan', workspace_id: 240513 });
    expect(calls[2].body).toEqual({ name: 'Sub', parent_id: 'p1' });
    expect(calls[3].body).toEqual({ name: 'WEBSITE', project_id: 'p9' });
    expect(section.id).toBe('s9');
    expect(task.due?.is_recurring).toBe(true);
  });

  it('turns HTTP failures into readable errors', async () => {
    mockTodoist({ 'POST /api/v1/sync': () => new Response('{}', { status: 401 }) });
    const error = await createLiveSource('bad').sync(() => {}).catch((e) => e);
    expect(error).toBeInstanceOf(TodoistApiError);
    expect(error.status).toBe(401);
    expect(error.message).toMatch(/token/i);
  });
});

describe('demo source', () => {
  it('completes a parent together with its subtasks, logs it, and can reopen it', async () => {
    const source = createDemoSource();
    const before = await source.sync(() => {});
    const parent = before.tasks.find((t) => parseTitle(t.content).title === 'Develop LMS-style Onboarding System')!;

    await source.completeTask(parent.id);
    const after = await source.sync(() => {});
    expect(after.tasks.some((t) => t.id === parent.id || t.parent_id === parent.id)).toBe(false);
    expect(after.tasks).toHaveLength(before.tasks.length - 4);
    expect(after.completed.some((t) => t.id === parent.id)).toBe(true);
    expect(after.activity[0]).toMatchObject({ event_type: 'completed', object_id: parent.id });

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
