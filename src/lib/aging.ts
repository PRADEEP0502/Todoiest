import type { TodoistTask } from '../types/todoist';
import { daysBetween, toDateKey } from './dates';
import { isRoutineTask } from './routine';
import type { WorkspaceIndex } from './hierarchy';
import { taskDates, type TaskDates } from './taskDates';

/**
 * Aging, in whole calendar days, up to today:
 *
 *   CD Age   =  today − CD    how long ago the task was created
 *   IDD Age  =  today − IDD   how long ago it was issued
 *
 * Both grow by one every day on their own. CD and IDD never change, and DD takes no part, so
 * rescheduling a task never moves either age. A value is null when its date is missing.
 */
export interface Aging {
  cdAge: number | null;
  iddAge: number | null;
}

export function agingOf(dates: Pick<TaskDates, 'cdKey' | 'iddKey'>, today: Date): Aging {
  const todayKey = toDateKey(today);
  return {
    cdAge: dates.cdKey ? daysBetween(dates.cdKey, todayKey) : null,
    iddAge: dates.iddKey ? daysBetween(dates.iddKey, todayKey) : null,
  };
}

export interface AgingRow {
  task: TodoistTask;
  dates: TaskDates;
  aging: Aging;
  /** Routine work carries no CD/IDD, so it has no aging. */
  routine: boolean;
}

export const NO_HOLDER = 'unassigned';

export interface HolderAging {
  /** Holder id, or `unassigned`. */
  id: string;
  rows: AgingRow[];
  /** Tasks in `rows` that have an issue date; averages are over the tasks that have each value. */
  withIdd: number;
  withoutIdd: number;
  average: Aging;
}

const mean = (values: (number | null)[]): number | null => {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10 : null;
};

/**
 * Active tasks grouped by their current holder, each with its aging as of `today`. Oldest task
 * first inside a holder; holders with the most tasks first, "no holder" last.
 */
export function holderAging(tasks: TodoistTask[], index: WorkspaceIndex, { onlyWithIdd }: { onlyWithIdd: boolean }, today: Date): HolderAging[] {
  const byHolder = new Map<string, AgingRow[]>();
  for (const task of tasks) {
    const routine = isRoutineTask(task, index);
    const dates = taskDates(task);
    // Tasks that repeat have no single creation or issue date, so they take no part in aging.
    if (routine) continue;
    const id = task.responsible_uid ?? NO_HOLDER;
    const row: AgingRow = { task, dates, aging: agingOf(dates, today), routine };
    const list = byHolder.get(id);
    if (list) list.push(row);
    else byHolder.set(id, [row]);
  }

  const groups: HolderAging[] = [];
  for (const [id, all] of byHolder) {
    const withIdd = all.filter((r) => r.dates.iddKey).length;
    const rows = (onlyWithIdd ? all.filter((r) => r.dates.iddKey) : all).sort(
      (a, b) => (b.aging.cdAge ?? -Infinity) - (a.aging.cdAge ?? -Infinity) || a.task.child_order - b.task.child_order,
    );
    groups.push({
      id,
      rows,
      withIdd,
      withoutIdd: all.length - withIdd,
      average: {
        cdAge: mean(rows.map((r) => r.aging.cdAge)),
        iddAge: mean(rows.map((r) => r.aging.iddAge)),
      },
    });
  }
  return groups
    .filter((g) => g.rows.length > 0)
    .sort((a, b) => (a.id === NO_HOLDER ? 1 : b.id === NO_HOLDER ? -1 : b.rows.length - a.rows.length));
}

/** "3 days", "1 day", "0 days", "−2 days" — always with its unit, never a bare number. */
export function formatDays(days: number | null): string {
  if (days === null) return '—';
  const n = Math.abs(days);
  const shown = Number.isInteger(days) ? String(n) : n.toFixed(1);
  return `${days < 0 ? '−' : ''}${shown} ${n === 1 ? 'day' : 'days'}`;
}
