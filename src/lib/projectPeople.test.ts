import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../services/todoist/demoData';
import type { TodoistTask, WorkspaceSnapshot } from '../types/todoist';
import { peopleForProject } from './projectPeople';

const task = (id: string, projectId: string, holder: string | null): TodoistTask => ({
  id,
  project_id: projectId,
  section_id: null,
  parent_id: null,
  content: id,
  description: '',
  priority: 1,
  due: null,
  labels: [],
  responsible_uid: holder,
  note_count: 0,
  child_order: 1,
  checked: false,
  added_at: null,
  completed_at: null,
});

const snapshot = (over: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot => ({
  user: { id: 'u1', full_name: 'Pradeep', email: 'p@x' },
  workspaces: [],
  projects: [],
  sections: [],
  tasks: [],
  completed: [],
  labels: [],
  comments: [],
  activity: [],
  activityStatus: { ok: true },
  completedStatus: { ok: true },
  people: {
    u1: { id: 'u1', name: 'Pradeep', email: 'p@x' },
    u2: { id: 'u2', name: 'Vanitha', email: 'v@x' },
    u3: { id: 'u3', name: 'Kumar', email: 'k@x' },
    u4: { id: 'u4', name: 'Suresh', email: 's@x' },
  },
  peopleByProject: {},
  syncedAt: '',
  ...over,
});

const names = (s: WorkspaceSnapshot, projectId: string, include?: string | null) => peopleForProject(s, projectId, { include }).map((p) => p.name);

describe('who can hold a task in a project', () => {
  it('lists only the people Todoist puts on that project', () => {
    const s = snapshot({ peopleByProject: { A: ['u1', 'u2', 'u3'], B: ['u1', 'u4'] } });
    expect(names(s, 'A')).toEqual(['Kumar', 'Pradeep', 'Vanitha']);
    expect(names(s, 'B')).toEqual(['Pradeep', 'Suresh']);
  });

  it('adds anyone already holding a task there, open or completed', () => {
    const s = snapshot({
      peopleByProject: { A: ['u1'] },
      tasks: [task('t1', 'A', 'u2'), task('t2', 'B', 'u4')],
      completed: [task('t3', 'A', 'u3')],
    });
    expect(names(s, 'A')).toEqual(['Kumar', 'Pradeep', 'Vanitha']);
    // A holder in another project does not leak in.
    expect(names(s, 'A')).not.toContain('Suresh');
  });

  it('leaves out everyone with no tie to the project', () => {
    const s = snapshot({ peopleByProject: { A: ['u1'] } });
    expect(names(s, 'A')).toEqual(['Pradeep']);
    expect(names(s, 'unknown-project')).toEqual([]);
  });

  it('keeps the person a task is already held by, even if they have left the project', () => {
    const s = snapshot({ peopleByProject: { A: ['u1'] } });
    expect(names(s, 'A', 'u4')).toEqual(['Pradeep', 'Suresh']);
  });

  it('ignores an id with no person behind it', () => {
    const s = snapshot({ peopleByProject: { A: ['u1', 'ghost'] } });
    expect(names(s, 'A')).toEqual(['Pradeep']);
  });

  it('works on the demo workspace, and differs between projects', () => {
    const demo = createDemoSnapshot(new Date(2026, 8, 29, 9, 0));
    const rv = peopleForProject(demo, 'p-rv').map((p) => p.name);
    const manpower = peopleForProject(demo, 'p-manpower').map((p) => p.name);
    expect(rv.length).toBeGreaterThan(0);
    expect(manpower.length).toBeGreaterThan(0);
    expect(rv).not.toEqual(manpower);
    // Everyone listed is someone the workspace knows.
    for (const name of [...rv, ...manpower]) expect(Object.values(demo.people).some((p) => p.name === name)).toBe(true);
  });
});
