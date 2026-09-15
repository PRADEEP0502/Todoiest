import type { WorkspaceSnapshot } from '../types/todoist';
import { describeActivity } from './activity';
import { addDays, dueDateKey, parseDateKey, toDateKey } from './dates';
import { taskPath, type WorkspaceIndex } from './hierarchy';
import { plainText } from './search';
import { isOverdue } from './stats';

// Todoist's REST/Sync APIs have no push channel for a browser dashboard, so notifications are
// generated at each sync from two real sources:
//   1. the Todoist activity log (task completed, added, changed, comment added, …)
//   2. due dates: a task becomes overdue at the end of its due day.
// Nothing is invented; read/unread state is kept on this device.

export interface Notification {
  id: string;
  at: Date;
  title: string;
  body: string;
  detail: string | null;
  kind: 'completed' | 'overdue' | 'comment' | 'added' | 'updated' | 'other';
  taskId: string | null;
  projectId: string | null;
  /** Who caused it (null for due-date notifications). */
  actorId: string | null;
}

const OVERDUE_LOOKBACK_DAYS = 7;

export function buildNotifications(snapshot: WorkspaceSnapshot, index: WorkspaceIndex, now: Date, { includeOwn }: { includeOwn: boolean }): Notification[] {
  const list: Notification[] = [];

  for (const event of snapshot.activity) {
    if (!includeOwn && event.initiator_id === snapshot.user.id) continue;
    const row = describeActivity(event, snapshot, index);
    let title: string;
    let kind: Notification['kind'];
    switch (row.kind) {
      case 'completed':
        [title, kind] = ['Task completed', 'completed'];
        break;
      case 'comment':
        if (event.event_type !== 'added') continue;
        [title, kind] = ['New comment', 'comment'];
        break;
      case 'added':
        [title, kind] = ['Task added', 'added'];
        break;
      case 'updated':
        [title, kind] = [row.action === 'Updated' ? 'Task updated' : row.action, 'updated'];
        break;
      case 'reopened':
        [title, kind] = ['Task reopened', 'updated'];
        break;
      case 'deleted':
        [title, kind] = ['Task deleted', 'other'];
        break;
      default:
        [title, kind] = [row.action, 'other'];
    }
    list.push({
      id: `activity:${event.id}`,
      at: row.at,
      title,
      body: row.kind === 'comment' ? `${row.user}: “${row.subject}”` : row.subject,
      detail: [row.kind === 'comment' ? row.context : row.user, row.projectName].filter(Boolean).join(' · ') || null,
      kind,
      taskId: row.taskId,
      projectId: row.projectId,
      actorId: row.userId,
    });
  }

  // A task due on day D becomes overdue at the start of D+1 (or at its due time, if it has one).
  const todayKey = toDateKey(now);
  const oldest = addDays(now, -OVERDUE_LOOKBACK_DAYS);
  for (const task of snapshot.tasks) {
    if (!isOverdue(task, todayKey) && !(task.due && task.due.date.length > 10 && new Date(task.due.date) < now && dueDateKey(task.due) === todayKey)) continue;
    const key = dueDateKey(task.due)!;
    const at = task.due!.date.length > 10 ? new Date(task.due!.date) : addDays(parseDateKey(key), 1);
    if (at < oldest || at > now) continue;
    list.push({
      id: `overdue:${task.id}:${task.due!.date}`,
      at,
      title: 'Task overdue',
      body: plainText(task.content),
      detail: taskPath(index, task).join(' › '),
      kind: 'overdue',
      taskId: task.id,
      projectId: task.project_id,
      actorId: null,
    });
  }

  return list.sort((a, b) => b.at.getTime() - a.at.getTime());
}
