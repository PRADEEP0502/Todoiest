import type { TodoistTask } from '../types/todoist';
import { daysBetween } from './dates';
import { isRoutineTask } from './routine';
import type { WorkspaceIndex } from './hierarchy';
import { taskDates, type TaskDates } from './taskDates';

/**
 * Aging, in whole calendar days, between the three dates of a task:
 *
 *   CD → IDD   =  IDD − CD   how long the task waited from creation until it was issued
 *   IDD → DD   =  DD − IDD   the time planned from issue until it is due
 *   CD → DD    =  DD − CD    the total time from creation to due
 *
 * CD and IDD never change, so CD → IDD is fixed for good. Rescheduling changes only DD, so
 * IDD → DD and CD → DD are recalculated from the current due date every time.
 * A value is null whenever one of its two dates is missing — nothing is estimated.
 */
export interface Aging {
  cdToIdd: number | null;
  iddToDd: number | null;
  cdToDd: number | null;
}

const span = (from: string | null, to: string | null) => (from && to ? daysBetween(from, to) : null);

export function agingOf(dates: Pick<TaskDates, 'cdKey' | 'iddKey' | 'ddKey'>): Aging {
  return {
    cdToIdd: span(dates.cdKey, dates.iddKey),
    iddToDd: span(dates.iddKey, dates.ddKey),
    cdToDd: span(dates.cdKey, dates.ddKey),
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
  average: { cdToIdd: number | null; iddToDd: number | null; cdToDd: number | null };
}

const mean = (values: (number | null)[]): number | null => {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10 : null;
};

/**
 * Active tasks grouped by their current holder, each with its aging. Longest total aging first
 * inside a holder; holders with the most tasks first, "no holder" last.
 */
export function holderAging(tasks: TodoistTask[], index: WorkspaceIndex, { onlyWithIdd }: { onlyWithIdd: boolean }): HolderAging[] {
  const byHolder = new Map<string, AgingRow[]>();
  for (const task of tasks) {
    const routine = isRoutineTask(task, index);
    const dates = taskDates(task);
    // Tasks that repeat have no single creation or issue date, so they take no part in aging.
    if (routine) continue;
    const id = task.responsible_uid ?? NO_HOLDER;
    const row: AgingRow = { task, dates, aging: agingOf(dates), routine };
    const list = byHolder.get(id);
    if (list) list.push(row);
    else byHolder.set(id, [row]);
  }

  const groups: HolderAging[] = [];
  for (const [id, all] of byHolder) {
    const withIdd = all.filter((r) => r.dates.iddKey).length;
    const rows = (onlyWithIdd ? all.filter((r) => r.dates.iddKey) : all).sort(
      (a, b) => (b.aging.cdToDd ?? -Infinity) - (a.aging.cdToDd ?? -Infinity) || a.task.child_order - b.task.child_order,
    );
    groups.push({
      id,
      rows,
      withIdd,
      withoutIdd: all.length - withIdd,
      average: {
        cdToIdd: mean(rows.map((r) => r.aging.cdToIdd)),
        iddToDd: mean(rows.map((r) => r.aging.iddToDd)),
        cdToDd: mean(rows.map((r) => r.aging.cdToDd)),
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
