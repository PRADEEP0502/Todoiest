import { describe, expect, it } from 'vitest';
import { buildIndex } from './hierarchy';
import { agingOf, formatDays, holderAging, NO_HOLDER } from './aging';
import { taskDates } from './taskDates';
import type { TodoistTask } from '../types/todoist';

const task = (id: string, content: string, extra: { due?: string | null; responsible_uid?: string | null; added_at?: string | null } = {}): TodoistTask => ({
  id,
  project_id: 'p1',
  section_id: null,
  parent_id: null,
  content,
  description: '',
  priority: 1,
  due: extra.due ? { date: extra.due } : null,
  labels: [],
  responsible_uid: extra.responsible_uid ?? null,
  note_count: 0,
  child_order: Number(id.replace(/\D/g, '')) || 1,
  checked: false,
  added_at: extra.added_at ?? null,
  completed_at: null,
});

const index = (tasks: TodoistTask[]) =>
  buildIndex({ projects: [{ id: 'p1', name: 'P', color: 'blue', parent_id: null, child_order: 1 }], sections: [], tasks, workspaces: [] });

// The user's worked example: CD 15-08-2026, IDD 18-08-2026, today 21-09-2026.
const TODAY = new Date(2026, 8, 21, 10, 30);

const aging = (content: string, due: string | null, today = TODAY) =>
  agingOf(taskDates({ content, added_at: null, due: due ? { date: due } : null }), today);

describe('CD Age and IDD Age, counted up to today', () => {
  it('matches the worked example: CD Age 37 days, IDD Age 34 days', () => {
    expect(aging('15.08.26, Task, 18.08.26', '2026-08-25')).toEqual({ cdAge: 37, iddAge: 34 });
  });

  it('never depends on the due date', () => {
    const before = aging('15.08.26, Task, 18.08.26', '2026-08-25');
    expect(aging('15.08.26, Task, 18.08.26', '2026-10-30')).toEqual(before);
    expect(aging('15.08.26, Task, 18.08.26', null)).toEqual(before);
  });

  it('goes up by one each day, whatever the time of day', () => {
    const next = new Date(2026, 8, 22, 0, 5);
    expect(aging('15.08.26, Task, 18.08.26', null, next)).toEqual({ cdAge: 38, iddAge: 35 });
    expect(aging('15.08.26, Task, 18.08.26', null, new Date(2026, 8, 21, 23, 59))).toEqual({ cdAge: 37, iddAge: 34 });
  });

  it('reads the workspace’s unpadded style (18.8.26) the same way', () => {
    expect(aging('15.08.26, Task, 18.8.26', null)).toEqual({ cdAge: 37, iddAge: 34 });
  });

  it('leaves an age empty when its date is missing — nothing is estimated', () => {
    expect(aging('15.08.26, Task', null)).toEqual({ cdAge: 37, iddAge: null });
    expect(aging('Plain task', '2026-09-30')).toEqual({ cdAge: null, iddAge: null });
  });

  it('counts whole calendar days across month ends and daylight-saving changes', () => {
    expect(aging('27.10.26, Task, 30.10.26', null, new Date(2026, 10, 2, 9))).toEqual({ cdAge: 6, iddAge: 3 });
  });

  it('writes days with their unit', () => {
    expect(formatDays(3)).toBe('3 days');
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(0)).toBe('0 days');
    expect(formatDays(-2)).toBe('−2 days');
    expect(formatDays(3.5)).toBe('3.5 days');
    expect(formatDays(null)).toBe('—');
  });
});

describe('holder-wise aging', () => {
  const tasks = [
    task('1', '15.08.26, A, 18.08.26', { responsible_uid: 'u1', due: '2026-08-25' }), // CD Age 37, IDD Age 34
    task('2', '10.08.26, B, 12.08.26', { responsible_uid: 'u1', due: '2026-08-30' }), // CD Age 42, IDD Age 40
    task('3', '15.08.26, C', { responsible_uid: 'u1', due: '2026-08-25' }), //           CD Age 37, no IDD
    task('4', '01.08.26, D, 03.08.26', { responsible_uid: 'u2', due: '2026-08-05' }),
    task('5', '01.08.26, E, 02.08.26', { due: '2026-08-04' }), //                        no holder
  ];

  it('groups by current holder with each holder’s averages', () => {
    const groups = holderAging(tasks, index(tasks), { onlyWithIdd: true }, TODAY);
    const u1 = groups.find((g) => g.id === 'u1')!;
    expect(u1.rows.map((r) => r.task.id)).toEqual(['2', '1']); // oldest first, C hidden (no IDD)
    expect(u1.average).toEqual({ cdAge: 39.5, iddAge: 37 });
    expect(u1.withoutIdd).toBe(1);
    expect(groups.at(-1)!.id).toBe(NO_HOLDER);
  });

  it('can include tasks that have no issue date, which then show dashes', () => {
    const groups = holderAging(tasks, index(tasks), { onlyWithIdd: false }, TODAY);
    const u1 = groups.find((g) => g.id === 'u1')!;
    expect(u1.rows).toHaveLength(3);
    const c = u1.rows.find((r) => r.task.id === '3')!;
    expect(c.aging).toEqual({ cdAge: 37, iddAge: null });
  });

  it('leaves repeating (routine) tasks out, since they have no single creation or issue date', () => {
    const repeating: TodoistTask = { ...task('9', 'Daily report', { responsible_uid: 'u1' }), due: { date: '2026-08-25', is_recurring: true } };
    const all = [...tasks, repeating];
    const groups = holderAging(all, index(all), { onlyWithIdd: false }, TODAY);
    expect(groups.flatMap((g) => g.rows).some((r) => r.task.id === '9')).toBe(false);
  });
});
