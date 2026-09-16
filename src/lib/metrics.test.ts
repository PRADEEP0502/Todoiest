import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../services/todoist/demoData';
import type { TodoistTask, WorkspaceSnapshot } from '../types/todoist';
import { describeActivity } from './activity';
import { addDays, toDateKey } from './dates';
import { buildIndex } from './hierarchy';
import { categoryOf, DEFAULT_RULES, holderCounts, labelRows, matchesDateCheck, metricTasks, UNASSIGNED, type MetricRules } from './metrics';
import { buildNotifications } from './notifications';
import { searchWorkspace } from './search';

const NOW = new Date(2026, 8, 14, 10, 0, 0);

const task = (id: string, extra: Partial<TodoistTask> = {}): TodoistTask => ({
  id,
  project_id: 'p1',
  section_id: null,
  parent_id: null,
  content: `Task ${id}`,
  description: '',
  priority: 1,
  due: null,
  labels: [],
  responsible_uid: null,
  note_count: 0,
  child_order: 1,
  checked: false,
  added_at: null,
  completed_at: null,
  ...extra,
});

const dueIn = (days: number) => ({ date: toDateKey(addDays(NOW, days)) });

function snapshotWith(tasks: TodoistTask[], extra: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
  return {
    user: { id: 'u1', full_name: 'Pradeep', email: 'p@x' },
    workspaces: [],
    projects: [{ id: 'p1', name: 'MD & PRADEEP', color: 'red', parent_id: null, child_order: 1 }],
    sections: [
      { id: 's1', project_id: 'p1', name: 'A-10', section_order: 1 },
      { id: 's2', project_id: 'p1', name: 'OUR REQUIREMENTS', section_order: 2 },
    ],
    tasks,
    completed: [],
    labels: [{ id: 'l1', name: 'A-5', color: 'red', order: 1 }],
    comments: [],
    activity: [],
    activityStatus: { ok: true },
    completedStatus: { ok: true },
    people: { u1: { id: 'u1', name: 'Pradeep', email: 'p@x' }, u2: { id: 'u2', name: 'MD', email: 'md@x' } },
    syncedAt: NOW.toISOString(),
    ...extra,
  };
}

describe('overdue categories', () => {
  it('buckets by days overdue: A-5 (1–5), A-10 (6–10), A-30 (11–30), A30+ (31+), and ignores tasks not overdue', () => {
    const tasks = [task('d0', { due: dueIn(0) }), task('d1', { due: dueIn(-1) }), task('d5', { due: dueIn(-5) }), task('d6', { due: dueIn(-6) }), task('d10', { due: dueIn(-10) }), task('d11', { due: dueIn(-11) }), task('d30', { due: dueIn(-30) }), task('d31', { due: dueIn(-31) }), task('none')];
    const snap = snapshotWith(tasks);
    const index = buildIndex(snap);
    const key = toDateKey(NOW);
    expect(Object.fromEntries(tasks.map((t) => [t.id, categoryOf(t, DEFAULT_RULES, index, key)]))).toEqual({
      d0: null,
      d1: 'a5',
      d5: 'a5',
      d6: 'a10',
      d10: 'a10',
      d11: 'a30',
      d30: 'a30',
      d31: 'a30plus',
      none: null,
    });
  });

  it('uses Todoist labels or section names when configured, without inventing a category', () => {
    const tasks = [task('lab', { labels: ['a-5'] }), task('sec', { section_id: 's1' }), task('plain', { due: dueIn(-40) })];
    const snap = snapshotWith(tasks);
    const index = buildIndex(snap);
    const key = toDateKey(NOW);
    const byLabel: MetricRules = { ...DEFAULT_RULES, categoryBasis: 'labels' };
    const bySection: MetricRules = { ...DEFAULT_RULES, categoryBasis: 'sections' };
    expect(tasks.map((t) => categoryOf(t, byLabel, index, key))).toEqual(['a5', null, null]);
    expect(tasks.map((t) => categoryOf(t, bySection, index, key))).toEqual([null, 'a10', null]);
  });
});

describe('date checks (No CD / No IDD)', () => {
  it('reads both dates out of the title, and follows a chosen rule instead when there is one', () => {
    const tasks = [
      task('a', { labels: ['CD'], content: '16.09.26, Task a, 20.09.26' }),
      task('b', { content: '16.09.26, Task b', deadline: { date: '2026-09-20' } }),
      task('c', { description: 'IDD: 20 Sep' }),
    ];
    const snap = snapshotWith(tasks);
    const index = buildIndex(snap);
    // Out of the box both checks read the dates the dashboard writes into the title.
    expect(metricTasks('noCd', snap, index, DEFAULT_RULES, NOW).map((t) => t.id)).toEqual(['c']);
    expect(metricTasks('noIdd', snap, index, DEFAULT_RULES, NOW).map((t) => t.id)).toEqual(['b', 'c']);

    expect(tasks.filter((t) => matchesDateCheck(t, { kind: 'without-label', value: 'cd' }, index)).map((t) => t.id)).toEqual(['b', 'c']);
    expect(tasks.filter((t) => matchesDateCheck(t, { kind: 'no-deadline' }, index)).map((t) => t.id)).toEqual(['a', 'c']);
    expect(tasks.filter((t) => matchesDateCheck(t, { kind: 'description-missing', value: 'IDD:' }, index)).map((t) => t.id)).toEqual(['a', 'b']);
    expect(metricTasks('noIdd', snap, index, { ...DEFAULT_RULES, noIdd: { kind: 'no-deadline' } }, NOW).map((t) => t.id)).toEqual(['a', 'c']);
  });
});

describe('holder and label counts', () => {
  it('counts per holder, keeps unassigned separate, and credits comments to their author', () => {
    const snap = snapshotWith(
      [task('1', { responsible_uid: 'u1', due: dueIn(-2) }), task('2', { responsible_uid: 'u1', due: dueIn(0) }), task('3', { responsible_uid: 'u2' }), task('4')],
      {
        completed: [task('c1', { responsible_uid: 'u2', checked: true, completed_at: NOW.toISOString() })],
        comments: [{ id: 'n1', task_id: '1', posted_uid: 'u2', content: 'Please close', posted_at: NOW.toISOString() }],
      },
    );
    const counts = holderCounts(snap, NOW);
    expect(counts.get('u1')).toMatchObject({ active: 2, overdue: 1, today: 1, noDue: 0 });
    expect(counts.get('u2')).toMatchObject({ active: 1, noDue: 1, completed: 1, comments: 1 });
    expect(counts.get(UNASSIGNED)).toMatchObject({ active: 1 });
  });

  it('lists every label, including labels that only appear on tasks', () => {
    const snap = snapshotWith([task('1', { labels: ['A-5', 'waiting'], due: dueIn(-3) }), task('2', { labels: ['waiting'] })]);
    const rows = labelRows(snap, NOW);
    expect(rows.map((r) => [r.name, r.active, r.overdue])).toEqual([
      ['waiting', 2, 1],
      ['A-5', 1, 1],
    ]);
  });
});

describe('activity, notifications and search on the demo workspace', () => {
  const snap = createDemoSnapshot(NOW);
  const index = buildIndex(snap);

  it('describes activity rows only from data Todoist provides', () => {
    const comment = snap.activity.find((e) => e.object_type === 'note')!;
    const row = describeActivity(comment, snap, index);
    expect(row).toMatchObject({ kind: 'comment', action: 'Commented' });
    expect(row.user).not.toBe('Todoist');
    expect(row.projectName).toBeTruthy();
  });

  it('builds notifications from activity and overdue due dates, newest first', () => {
    const list = buildNotifications(snap, index, NOW, { includeOwn: true });
    expect(list.some((n) => n.kind === 'overdue')).toBe(true);
    expect(list.some((n) => n.kind === 'comment')).toBe(true);
    expect(list.every((n, i) => i === 0 || list[i - 1].at >= n.at)).toBe(true);
    const others = buildNotifications(snap, index, NOW, { includeOwn: false });
    expect(others.some((n) => n.actorId === snap.user.id)).toBe(false);
  });

  it('shows the full nested path for a deep requirement', () => {
    const result = searchWorkspace(index, 'No IDD').tasks[0];
    expect(result.path).toEqual(['MD & PRADEEP', 'OUR REQUIREMENTS', 'TODOIST', 'Dashboard requirements', 'No Dates, metrics', 'No IDD']);
  });

  it('finds labels and people', () => {
    const results = searchWorkspace(index, 'kav', { people: Object.values(snap.people).map((person) => ({ person, count: 1 })), labels: new Map([['urgent', 3]]) });
    expect(results.people.map((p) => p.person.name)).toEqual(['Kavya S']);
    expect(searchWorkspace(index, 'urg', { labels: new Map([['urgent', 3]]) }).labels[0].name).toBe('urgent');
  });
});
