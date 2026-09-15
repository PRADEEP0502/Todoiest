import type { CreateTaskInput, MoveTaskInput, TodoistTask, UpdateTaskInput } from '../../types/todoist';
import type { TodoistClient } from './client';

const MAX_COMPLETED_PAGES = 20;

const taskPath = (id: string) => `/tasks/${encodeURIComponent(id)}`;

/** One active task (GET /tasks/{id}) — used to pick up a recurring task's next date after completing it. */
export function getTask(client: TodoistClient, id: string): Promise<TodoistTask> {
  return client.request<TodoistTask>(taskPath(id));
}

export function createTask(client: TodoistClient, input: CreateTaskInput): Promise<TodoistTask> {
  return client.request<TodoistTask>('/tasks', { method: 'POST', body: input });
}

/** Updates content, description, priority, due date or labels. Use `moveTask` to change project/section. */
export function updateTask(client: TodoistClient, id: string, input: UpdateTaskInput): Promise<TodoistTask> {
  return client.request<TodoistTask>(taskPath(id), { method: 'POST', body: input });
}

/** Moves a task to another project, section, or parent. Pass exactly one destination. */
export function moveTask(client: TodoistClient, id: string, input: MoveTaskInput): Promise<TodoistTask> {
  return client.request<TodoistTask>(`${taskPath(id)}/move`, { method: 'POST', body: input });
}

export async function closeTask(client: TodoistClient, id: string): Promise<void> {
  await client.request<unknown>(`${taskPath(id)}/close`, { method: 'POST' });
}

export async function reopenTask(client: TodoistClient, id: string): Promise<void> {
  await client.request<unknown>(`${taskPath(id)}/reopen`, { method: 'POST' });
}

export async function deleteTask(client: TodoistClient, id: string): Promise<void> {
  await client.request<unknown>(taskPath(id), { method: 'DELETE' });
}

/**
 * Tasks completed within [since, until). Todoist limits the window to 3 months.
 * This endpoint pages with `{ items, next_cursor }` rather than `results`.
 */
export async function getCompletedTasks(
  client: TodoistClient,
  since: Date,
  until: Date,
  signal?: AbortSignal,
): Promise<TodoistTask[]> {
  const all: TodoistTask[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_COMPLETED_PAGES; page++) {
    const data: { items: TodoistTask[]; next_cursor: string | null } = await client.request(
      '/tasks/completed/by_completion_date',
      { query: { since: since.toISOString(), until: until.toISOString(), limit: 200, cursor }, signal },
    );
    all.push(...data.items);
    cursor = data.next_cursor;
    if (!cursor) break;
  }
  return all;
}
