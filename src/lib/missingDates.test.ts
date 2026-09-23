import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../services/todoist/demoData';
import type { TodoistTask } from '../types/todoist';
import { buildIndex } from './hierarchy';
import { DEFAULT_RULES, holderCounts, isMissingDate, metricTasks, UNASSIGNED } from './metrics';

const task = (id: string, content: string, due: string | null, extra: Partial<TodoistTask> = {}): TodoistTask => ({
  id,
  project_id: 'p1',
  section_id: null,
  parent_id: null,
  content,
  description: '',
  priority: 1,
  due: due ? { date: due } : null,
  labels: [],
  responsible_uid: null,
  note_count: 0,
  child_order: Number(id.replace(/\D/g, '')) || 1,
  checked: false,
  added_at: '2026-08-15T09:00:00Z',
  completed_at: null,
  ...extra,
});

const index = (tasks: TodoistTask[]) =>
  buildIndex({ projects: [{ id: 'p1', name: 'P', color: 'blue', parent_id: null, child_order: 1 }], sections: [], tasks, workspaces: [] });

const missing = (t: TodoistTask, all = [t]) => ({
  cd: isMissingDate('cd', t, index(all)),
  idd: isMissingDate('idd', t, index(all)),
  dd: isMissingDate('dd', t, index(all)),
});

describe('No CD / No IDD / No DD — only when the date is really missing', () => {
  it('Task A: CD, IDD and DD all present → in none of the three', () => {
    expect(missing(task('1', '15.08.26, Task A, 18.08.26', '2026-08-25'))).toEqual({ cd: false, idd: false, dd: false });
  });

  it('Task B: IDD empty → only in No IDD', () => {
    expect(missing(task('2', '15.08.26, Task B', '2026-08-25'))).toEqual({ cd: false, idd: true, dd: false });
  });

  it('Task C: CD and DD empty → in No CD and No DD', () => {
    expect(missing(task('3', 'Task C, 18.08.26', null))).toEqual({ cd: true, idd: false, dd: true });
  });

  it('never treats a date as missing because of how it was written', () => {
    const written = [
      '* **24.07.26,6T mechine**', //                                heading + bold
      '* 12.06.26,**Despatch ASST- 1 No’s,25.06.26**', //            bold starting after the CD
      '24.07.26, Water leakage,6T mechine cooling line water leakage.15.8.26', // IDD after a full stop
      '31.07.26, Manpower sources, regular updates need in comment box 17.08.26', // IDD after a space
      '08.08.26, additional tank stirror,we need additional tank stirror.15/9/26', // slashes
      '13,08,26,Flow meter,A flow meter needs to be installed.', //  commas
      '19-09-26. P1 machine dyes are dosing automatically.', //       dashes
    ];
    for (const content of written) expect(isMissingDate('cd', task('9', content, null), index([task('9', content, null)])), content).toBe(false);
    for (const content of written.slice(1, 5)) expect(isMissingDate('idd', task('9', content, null), index([task('9', content, null)])), content).toBe(false);
  });

  it('DD is Todoist’s due date, with or without a time', () => {
    expect(isMissingDate('dd', task('4', 'x', '2026-08-25T10:00:00'), index([]))).toBe(false);
    expect(isMissingDate('dd', task('5', 'x', '2026-08-25T04:30:00Z'), index([]))).toBe(false);
    expect(isMissingDate('dd', task('6', 'x', null), index([]))).toBe(true);
  });
});

describe('a card’s count and the list it opens agree', () => {
  const NOW = new Date(2026, 8, 22, 9, 0);
  const snapshot = createDemoSnapshot(NOW);
  const idx = buildIndex(snapshot);

  it('dashboard No CD / No IDD / No Due Date: the list is exactly the tasks missing that date', () => {
    const noCd = metricTasks('noCd', snapshot, idx, DEFAULT_RULES, NOW);
    const noIdd = metricTasks('noIdd', snapshot, idx, DEFAULT_RULES, NOW);
    const noDd = metricTasks('no-due', snapshot, idx, DEFAULT_RULES, NOW);
    expect(noCd).toEqual(snapshot.tasks.filter((t) => isMissingDate('cd', t, idx)));
    expect(noIdd).toEqual(snapshot.tasks.filter((t) => isMissingDate('idd', t, idx)));
    expect(noDd).toEqual(snapshot.tasks.filter((t) => isMissingDate('dd', t, idx)));
    // And nothing listed has the date.
    expect(noDd.every((t) => !t.due)).toBe(true);
  });

  it('holder No due date count matches that holder’s list', () => {
    for (const [id, c] of holderCounts(snapshot, NOW)) {
      const mine = snapshot.tasks.filter((t) => (t.responsible_uid ?? UNASSIGNED) === id);
      expect(c.noDue, id).toBe(mine.filter((t) => isMissingDate('dd', t, idx)).length);
    }
  });
});
