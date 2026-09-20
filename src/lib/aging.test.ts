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

const aging = (content: string, due: string | null) => agingOf(taskDates({ content, added_at: null, due: due ? { date: due } : null }));

describe('aging between CD, IDD and DD', () => {
  it('matches the worked example: CD 15-08, IDD 18-08, DD 25-08', () => {
    expect(aging('15.08.26, Task, 18.08.26', '2026-08-25')).toEqual({ cdToIdd: 3, iddToDd: 7, cdToDd: 10 });
  });

  it('a new due date changes IDD → DD and CD → DD, and never CD → IDD', () => {
    // The same task after DD moves from 25-08 to 30-08.
    expect(aging('15.08.26, Task, 18.08.26', '2026-08-30')).toEqual({ cdToIdd: 3, iddToDd: 12, cdToDd: 15 });
  });

  it('reads the workspace’s unpadded style (18.8.26) the same way', () => {
    expect(aging('15.08.26, Task, 18.8.26', '2026-08-25')).toEqual({ cdToIdd: 3, iddToDd: 7, cdToDd: 10 });
  });

  it('leaves a span empty when one of its dates is missing — nothing is estimated', () => {
    expect(aging('15.08.26, Task', '2026-08-25')).toEqual({ cdToIdd: null, iddToDd: null, cdToDd: 10 });
    expect(aging('15.08.26, Task, 18.08.26', null)).toEqual({ cdToIdd: 3, iddToDd: null, cdToDd: null });
  });

  it('counts whole calendar days across month ends and daylight-saving changes', () => {
    expect(aging('30.03.26, Task, 01.04.26', '2026-04-30')).toEqual({ cdToIdd: 2, iddToDd: 29, cdToDd: 31 });
    expect(aging('27.10.26, Task, 30.10.26', '2026-11-02')).toEqual({ cdToIdd: 3, iddToDd: 3, cdToDd: 6 });
  });

  it('shows a span that runs backwards as negative rather than hiding it', () => {
    expect(aging('15.08.26, Task, 12.08.26', '2026-08-25').cdToIdd).toBe(-3);
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
    task('1', '15.08.26, A, 18.08.26', { responsible_uid: 'u1', due: '2026-08-25' }), // 3 / 7 / 10
    task('2', '10.08.26, B, 12.08.26', { responsible_uid: 'u1', due: '2026-08-30' }), // 2 / 18 / 20
    task('3', '15.08.26, C', { responsible_uid: 'u1', due: '2026-08-25' }), //           — / — / 10  (no IDD)
    task('4', '01.08.26, D, 03.08.26', { responsible_uid: 'u2', due: '2026-08-05' }), // 2 / 2 / 4
    task('5', '01.08.26, E, 02.08.26', { due: '2026-08-04' }), //                        no holder
  ];

  it('groups by current holder with each holder’s averages', () => {
    const groups = holderAging(tasks, index(tasks), { onlyWithIdd: true });
    const u1 = groups.find((g) => g.id === 'u1')!;
    expect(u1.rows.map((r) => r.task.id)).toEqual(['2', '1']); // longest total age first, C hidden (no IDD)
    expect(u1.average).toEqual({ cdToIdd: 2.5, iddToDd: 12.5, cdToDd: 15 });
    expect(u1.withoutIdd).toBe(1);
    expect(groups.at(-1)!.id).toBe(NO_HOLDER);
  });

  it('can include tasks that have no issue date, which then show dashes', () => {
    const groups = holderAging(tasks, index(tasks), { onlyWithIdd: false });
    const u1 = groups.find((g) => g.id === 'u1')!;
    expect(u1.rows).toHaveLength(3);
    const c = u1.rows.find((r) => r.task.id === '3')!;
    expect(c.aging).toEqual({ cdToIdd: null, iddToDd: null, cdToDd: 10 });
  });

  it('leaves repeating (routine) tasks out, since they have no single creation or issue date', () => {
    const repeating: TodoistTask = { ...task('9', 'Daily report', { responsible_uid: 'u1' }), due: { date: '2026-08-25', is_recurring: true } };
    const all = [...tasks, repeating];
    const groups = holderAging(all, index(all), { onlyWithIdd: false });
    expect(groups.flatMap((g) => g.rows).some((r) => r.task.id === '9')).toBe(false);
  });
});
