import { hasCd, hasIdd } from './cd';
import type { TodoistTask, WorkspaceSnapshot } from '../types/todoist';
import { daysBetween, dueDateKey, startOfDay, startOfMonth, toDateKey } from './dates';
import type { WorkspaceIndex } from './hierarchy';
import { completedSince, isDueToday, isOverdue } from './stats';

// Management metrics computed from Todoist data. The meaning of the A-categories and of
// "No CD" / "No IDD" is configured in Settings (see `MetricRules`) rather than assumed here.

export const CATEGORIES = [
  { id: 'a5', label: 'A-5', maxDays: 5 },
  { id: 'a10', label: 'A-10', maxDays: 10 },
  { id: 'a30', label: 'A-30', maxDays: 30 },
  { id: 'a30plus', label: 'A30+', maxDays: Infinity },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

/**
 * - `days-overdue`: derived from the Todoist due date — A-5 = 1–5 days past due, A-10 = 6–10,
 *   A-30 = 11–30, A30+ = more than 30. Tasks that are not overdue have no category.
 * - `labels`: a task belongs to a category when it carries the Todoist label mapped to it.
 * - `sections`: a task belongs to a category when its section has the mapped name.
 */
export type CategoryBasis = 'days-overdue' | 'labels' | 'sections';

export type DateCheckRule =
  | { kind: 'unset' }
  /** Title does not start with a creation date, e.g. "16.09.26, Task". */
  | { kind: 'no-cd' }
  /** Title does not end with an initial due date, e.g. "Task, 20.09.26". */
  | { kind: 'no-idd' }
  | { kind: 'without-label'; value: string }
  | { kind: 'with-label'; value: string }
  | { kind: 'in-section'; value: string }
  | { kind: 'no-deadline' }
  | { kind: 'description-missing'; value: string };

export type DateCheckId = 'noCd' | 'noIdd';

export const DATE_CHECKS: { id: DateCheckId; label: string }[] = [
  { id: 'noCd', label: 'No CD' },
  { id: 'noIdd', label: 'No IDD' },
];

export interface MetricRules {
  categoryBasis: CategoryBasis;
  /** Label or section name per category, used by the `labels` and `sections` bases. */
  categoryNames: Record<CategoryId, string>;
  noCd: DateCheckRule;
  noIdd: DateCheckRule;
}

export const DEFAULT_RULES: MetricRules = {
  categoryBasis: 'days-overdue',
  categoryNames: { a5: 'A-5', a10: 'A-10', a30: 'A-30', a30plus: 'A30+' },
  noCd: { kind: 'no-cd' },
  noIdd: { kind: 'no-idd' },
};

const same = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export function daysOverdue(task: TodoistTask, todayKey: string): number | null {
  const key = dueDateKey(task.due);
  if (!key) return null;
  const days = daysBetween(key, todayKey);
  return days > 0 ? days : null;
}

export function categoryOf(task: TodoistTask, rules: MetricRules, index: WorkspaceIndex, todayKey: string): CategoryId | null {
  switch (rules.categoryBasis) {
    case 'days-overdue': {
      const days = daysOverdue(task, todayKey);
      if (days === null) return null;
      return CATEGORIES.find((c) => days <= c.maxDays)!.id;
    }
    case 'labels':
      return CATEGORIES.find((c) => rules.categoryNames[c.id] && task.labels.some((l) => same(l, rules.categoryNames[c.id])))?.id ?? null;
    case 'sections': {
      const section = task.section_id ? index.sectionById.get(task.section_id) : undefined;
      return section ? (CATEGORIES.find((c) => rules.categoryNames[c.id] && same(section.name, rules.categoryNames[c.id]))?.id ?? null) : null;
    }
  }
}

export function describeCategory(id: CategoryId, rules: MetricRules): string {
  if (rules.categoryBasis === 'labels') return `Tasks with the label “${rules.categoryNames[id]}”`;
  if (rules.categoryBasis === 'sections') return `Tasks in sections named “${rules.categoryNames[id]}”`;
  return { a5: '1–5 days overdue', a10: '6–10 days overdue', a30: '11–30 days overdue', a30plus: 'More than 30 days overdue' }[id];
}

export function isDateCheckConfigured(rule: DateCheckRule): boolean {
  if (rule.kind === 'unset') return false;
  return 'value' in rule ? rule.value.trim().length > 0 : true;
}

export function matchesDateCheck(task: TodoistTask, rule: DateCheckRule, index: WorkspaceIndex): boolean {
  switch (rule.kind) {
    case 'unset':
      return false;
    case 'no-cd':
      return !hasCd(task.content);
    case 'no-idd':
      return !hasIdd(task.content);
    case 'without-label':
      return !task.labels.some((l) => same(l, rule.value));
    case 'with-label':
      return task.labels.some((l) => same(l, rule.value));
    case 'in-section': {
      const section = task.section_id ? index.sectionById.get(task.section_id) : undefined;
      return !!section && same(section.name, rule.value);
    }
    case 'no-deadline':
      return !task.deadline?.date;
    case 'description-missing':
      return !task.description.toLocaleLowerCase().includes(rule.value.trim().toLocaleLowerCase());
  }
}

export function describeDateCheck(rule: DateCheckRule): string {
  switch (rule.kind) {
    case 'unset':
      return 'Not set up yet';
    case 'no-cd':
      return 'Active tasks whose title has no creation date (DD.MM.YY)';
    case 'no-idd':
      return 'Active tasks whose title has no initial due date (…, DD.MM.YY)';
    case 'without-label':
      return `Active tasks without the label “${rule.value}”`;
    case 'with-label':
      return `Active tasks with the label “${rule.value}”`;
    case 'in-section':
      return `Active tasks in sections named “${rule.value}”`;
    case 'no-deadline':
      return 'Active tasks without a Todoist deadline';
    case 'description-missing':
      return `Active tasks whose description does not mention “${rule.value}”`;
  }
}

/** Every drill-down list the dashboard links to. */
export type MetricId = 'active' | 'no-due' | DateCheckId | CategoryId;

export function metricTasks(metric: MetricId, snapshot: WorkspaceSnapshot, index: WorkspaceIndex, rules: MetricRules, now: Date): TodoistTask[] {
  const todayKey = toDateKey(now);
  switch (metric) {
    case 'active':
      return snapshot.tasks;
    case 'no-due':
      return snapshot.tasks.filter((t) => !t.due);
    case 'noCd':
    case 'noIdd':
      return isDateCheckConfigured(rules[metric]) ? snapshot.tasks.filter((t) => matchesDateCheck(t, rules[metric], index)) : [];
    default:
      return snapshot.tasks.filter((t) => categoryOf(t, rules, index, todayKey) === metric);
  }
}

export interface TaskCounts {
  active: number;
  overdue: number;
  today: number;
  noDue: number;
  completed: number;
  comments: number;
}

const emptyCounts = (): TaskCounts => ({ active: 0, overdue: 0, today: 0, noDue: 0, completed: 0, comments: 0 });

export const UNASSIGNED = 'unassigned';

/**
 * Counts per holder (the task's responsible person). Tasks without a holder are grouped under
 * `unassigned`. Completed = holder's tasks completed this month; comments = comments they wrote.
 */
export function holderCounts(snapshot: WorkspaceSnapshot, now: Date): Map<string, TaskCounts> {
  const todayKey = toDateKey(now);
  const byHolder = new Map<string, TaskCounts>();
  const get = (id: string) => {
    let c = byHolder.get(id);
    if (!c) byHolder.set(id, (c = emptyCounts()));
    return c;
  };
  for (const t of snapshot.tasks) {
    const c = get(t.responsible_uid ?? UNASSIGNED);
    c.active++;
    if (isOverdue(t, todayKey)) c.overdue++;
    if (isDueToday(t, todayKey)) c.today++;
    if (!t.due) c.noDue++;
  }
  for (const t of completedSince(snapshot.completed, startOfMonth(now))) get(t.responsible_uid ?? UNASSIGNED).completed++;
  for (const comment of snapshot.comments) if (comment.posted_uid && byHolder.has(comment.posted_uid)) get(comment.posted_uid).comments++;
  return byHolder;
}

/** True when Todoist gave us anything to build a holder view from. */
export function hasHolderData(snapshot: WorkspaceSnapshot): boolean {
  return snapshot.tasks.some((t) => t.responsible_uid) || snapshot.completed.some((t) => t.responsible_uid);
}

export interface LabelRow extends TaskCounts {
  name: string;
  color: string | null;
}

/** Labels from Todoist plus any shared labels that only appear on tasks. */
export function labelRows(snapshot: WorkspaceSnapshot, now: Date): LabelRow[] {
  const todayKey = toDateKey(now);
  const rows = new Map<string, LabelRow>();
  const get = (name: string) => {
    const key = name.toLocaleLowerCase();
    let row = rows.get(key);
    if (!row) rows.set(key, (row = { name, color: null, ...emptyCounts() }));
    return row;
  };
  for (const label of snapshot.labels) get(label.name).color = label.color;
  for (const t of snapshot.tasks) {
    for (const name of t.labels) {
      const row = get(name);
      row.active++;
      if (isOverdue(t, todayKey)) row.overdue++;
      if (isDueToday(t, todayKey)) row.today++;
      if (!t.due) row.noDue++;
    }
  }
  for (const t of completedSince(snapshot.completed, startOfMonth(now))) for (const name of t.labels) get(name).completed++;
  return [...rows.values()].sort((a, b) => b.active - a.active || a.name.localeCompare(b.name));
}

export function completedToday(snapshot: WorkspaceSnapshot, now: Date): number {
  return completedSince(snapshot.completed, startOfDay(now)).length;
}
