import type { TodoistTask, WorkspaceSnapshot } from '../types/todoist';
import { daysBetween, dueDateKey, startOfDay, startOfMonth, startOfWeek, toDateKey } from './dates';

export type CompletedRange = 'today' | 'week' | 'month';

export function completedRangeStart(range: CompletedRange, now: Date): Date {
  return range === 'today' ? startOfDay(now) : range === 'week' ? startOfWeek(now) : startOfMonth(now);
}

export function completedSince(tasks: TodoistTask[], since: Date): TodoistTask[] {
  return tasks
    .filter((t) => t.completed_at && new Date(t.completed_at) >= since)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
}

export const isDueToday = (task: TodoistTask, todayKey: string) => dueDateKey(task.due) === todayKey;

export function isOverdue(task: TodoistTask, todayKey: string): boolean {
  const key = dueDateKey(task.due);
  return key !== null && daysBetween(todayKey, key) < 0;
}

export function dashboardStats(snapshot: WorkspaceSnapshot, now: Date) {
  const todayKey = toDateKey(now);
  let today = 0;
  let overdue = 0;
  for (const task of snapshot.tasks) {
    if (isDueToday(task, todayKey)) today++;
    else if (isOverdue(task, todayKey)) overdue++;
  }
  return {
    total: snapshot.tasks.length,
    today,
    overdue,
    completedToday: completedSince(snapshot.completed, startOfDay(now)).length,
    completedThisWeek: completedSince(snapshot.completed, startOfWeek(now)).length,
  };
}

/** Sort for date-driven lists: most urgent priority first, then timed tasks by time, then Todoist order. */
export function byPriorityThenTime(a: TodoistTask, b: TodoistTask): number {
  return b.priority - a.priority || (a.due?.date ?? '').localeCompare(b.due?.date ?? '') || a.child_order - b.child_order;
}
