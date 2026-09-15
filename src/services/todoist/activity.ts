import type { ActivityEvent, ActivityObjectType, Paginated, Person, TodoistComment, TodoistUser } from '../../types/todoist';
import type { TodoistClient } from './client';

const MAX_ACTIVITY_PAGES = 10;

interface RawActivity {
  id: number | string | null;
  object_type: ActivityObjectType;
  object_id: string | number;
  event_type: string;
  event_date: string;
  parent_project_id: string | number | null;
  parent_item_id: string | number | null;
  initiator_id: string | number | null;
  extra_data: Record<string, unknown> | null;
}

const str = (v: string | number | null | undefined) => (v == null ? null : String(v));

/**
 * Activity log events on or after `since`, newest first (GET /activities). Parent names and
 * comment text are requested so events stay readable after the task itself is gone.
 * Availability and history length depend on the Todoist plan.
 */
export async function getActivity(client: TodoistClient, since: Date, signal?: AbortSignal): Promise<ActivityEvent[]> {
  const events: ActivityEvent[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_ACTIVITY_PAGES; page++) {
    const data: Paginated<RawActivity> = await client.request<Paginated<RawActivity>>('/activities', {
      query: { date_from: since.toISOString(), annotate_parents: 'true', annotate_notes: 'true', limit: 200, cursor },
      signal,
    });
    for (const raw of data.results) {
      events.push({
        // Some events have no numeric id; build a stable one so read-state and de-duplication work.
        id: raw.id != null ? String(raw.id) : `${raw.object_type}:${raw.object_id}:${raw.event_type}:${raw.event_date}`,
        object_type: raw.object_type,
        object_id: String(raw.object_id),
        event_type: raw.event_type,
        event_date: raw.event_date,
        parent_project_id: str(raw.parent_project_id),
        parent_item_id: str(raw.parent_item_id),
        initiator_id: str(raw.initiator_id),
        extra_data: raw.extra_data,
      });
    }
    cursor = data.next_cursor;
    if (!cursor) break;
  }
  return events;
}

/** Adds a comment to a task (POST /comments). */
export async function createComment(client: TodoistClient, taskId: string, content: string): Promise<TodoistComment> {
  const raw = await client.request<{ id: string; posted_uid: string | null; content: string; posted_at: string | null }>('/comments', {
    method: 'POST',
    body: { task_id: taskId, content },
  });
  return { id: String(raw.id), task_id: taskId, posted_uid: str(raw.posted_uid), content: raw.content, posted_at: raw.posted_at };
}

export function getUser(client: TodoistClient, signal?: AbortSignal): Promise<TodoistUser> {
  return client.request<TodoistUser>('/user', { signal });
}

/** Members of a team workspace — used to name holders and activity authors who share no project with us. */
export async function getWorkspaceUsers(client: TodoistClient, workspaceId: string, signal?: AbortSignal): Promise<Person[]> {
  const people: Person[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 20; page++) {
    const data: { has_more: boolean; next_cursor: string | null; workspace_users: { user_id: string; user_email: string; full_name: string; is_deleted: boolean }[] } =
      await client.request('/workspaces/users', { query: { workspace_id: workspaceId, limit: 200, cursor }, signal });
    for (const u of data.workspace_users) {
      if (!u.is_deleted) people.push({ id: String(u.user_id), name: u.full_name, email: u.user_email });
    }
    cursor = data.has_more ? data.next_cursor : null;
    if (!cursor) break;
  }
  return people;
}
