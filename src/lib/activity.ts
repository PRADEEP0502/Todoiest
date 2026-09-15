import type { ActivityEvent, WorkspaceSnapshot } from '../types/todoist';
import type { WorkspaceIndex } from './hierarchy';
import { plainText } from './search';

// Turns raw Todoist activity-log events into readable rows. Only fields Todoist actually sent are
// used; when a detail is missing the row says less rather than guessing.

export type ActivityKind = 'completed' | 'added' | 'updated' | 'deleted' | 'reopened' | 'comment' | 'project' | 'other';

export interface ActivityRow {
  id: string;
  at: Date;
  kind: ActivityKind;
  /** "Completed", "Due date changed", "Commented"… */
  action: string;
  user: string;
  userId: string | null;
  /** Task name, comment text, or project/section name. */
  subject: string;
  /** For comments: the task the comment is on. */
  context: string | null;
  taskId: string | null;
  projectId: string | null;
  projectName: string | null;
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() ? plainText(v) : null);
const has = (data: Record<string, unknown> | null, ...keys: string[]) => !!data && keys.some((k) => k in data);

function itemAction(event: ActivityEvent): [ActivityKind, string] {
  switch (event.event_type) {
    case 'completed':
      return ['completed', 'Completed'];
    case 'uncompleted':
      return ['reopened', 'Reopened'];
    case 'added':
      return ['added', 'Added'];
    case 'deleted':
      return ['deleted', 'Deleted'];
    case 'updated': {
      const d = event.extra_data;
      if (has(d, 'last_due_date', 'due_date')) return ['updated', 'Due date changed'];
      if (has(d, 'last_responsible_uid', 'responsible_uid')) return ['updated', 'Holder changed'];
      if (has(d, 'last_content')) return ['updated', 'Renamed'];
      if (has(d, 'last_description')) return ['updated', 'Description changed'];
      return ['updated', 'Updated'];
    }
    default:
      return ['other', capitalize(event.event_type)];
  }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

export function describeActivity(event: ActivityEvent, snapshot: WorkspaceSnapshot, index: WorkspaceIndex): ActivityRow {
  const d = event.extra_data;
  const projectId = event.parent_project_id ?? (event.object_type === 'project' ? event.object_id : null);
  const projectName = text(d?.parent_project_name) ?? (projectId ? (index.projectById.get(projectId)?.name ?? null) : null);
  const person = event.initiator_id ? snapshot.people[event.initiator_id] : undefined;
  const user = event.initiator_id === snapshot.user.id ? `${person?.name ?? snapshot.user.full_name} (you)` : (person?.name ?? (event.initiator_id ? 'A collaborator' : 'Todoist'));

  const base = { id: event.id, at: new Date(event.event_date), user, userId: event.initiator_id, projectId, projectName };

  if (event.object_type === 'item') {
    const [kind, action] = itemAction(event);
    const liveTask = index.taskById.get(event.object_id);
    const doneTask = snapshot.completed.find((t) => t.id === event.object_id);
    return {
      ...base,
      kind,
      action,
      subject: text(d?.content) ?? (liveTask ? plainText(liveTask.content) : doneTask ? plainText(doneTask.content) : 'A task'),
      context: null,
      taskId: liveTask ? liveTask.id : null,
    };
  }

  if (event.object_type === 'note') {
    const taskId = event.parent_item_id;
    const task = taskId ? index.taskById.get(taskId) : undefined;
    const action = event.event_type === 'added' ? 'Commented' : event.event_type === 'deleted' ? 'Deleted a comment' : 'Edited a comment';
    return {
      ...base,
      kind: 'comment',
      action,
      subject: text(d?.content) ?? 'Comment',
      context: text(d?.parent_item_content) ?? (task ? plainText(task.content) : null),
      taskId: task ? task.id : null,
    };
  }

  const name = text(d?.name) ?? (event.object_type === 'project' ? (index.projectById.get(event.object_id)?.name ?? null) : (index.sectionById.get(event.object_id)?.name ?? null));
  return {
    ...base,
    kind: event.object_type === 'project' ? 'project' : 'other',
    action: `${event.object_type === 'project' ? 'Project' : 'Section'} ${event.event_type.replace(/_/g, ' ')}`,
    subject: name ?? (event.object_type === 'project' ? 'A project' : 'A section'),
    context: null,
    taskId: null,
  };
}
