import { describe, expect, it } from 'vitest';
import { parseTitle } from './cd';
import { createDemoSnapshot } from '../services/todoist/demoData';
import type { TodoistProject, TodoistSection, TodoistTask, WorkspaceSnapshot } from '../types/todoist';
import { disclosureKey } from './disclosure';
import { buildIndex } from './hierarchy';
import { filterProjects, isRecentlyUsed, projectActivity, revealKeys, topProjectsByOpenTasks } from './projects';

const NOW = new Date(2026, 8, 14, 9, 0);
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

const project = (id: string, name: string, extra: Partial<TodoistProject> = {}): TodoistProject => ({
  id,
  name,
  color: 'blue',
  parent_id: null,
  child_order: 1,
  ...extra,
});

const task = (id: string, projectId: string, extra: Partial<TodoistTask> = {}): TodoistTask => ({
  id,
  project_id: projectId,
  section_id: null,
  parent_id: null,
  content: id,
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

function snapshotWith(projects: TodoistProject[], tasks: TodoistTask[], sections: TodoistSection[] = []): WorkspaceSnapshot {
  return { ...createDemoSnapshot(NOW), workspaces: [], projects, sections, tasks, completed: [] };
}

describe('topProjectsByOpenTasks', () => {
  it('ranks projects by open tasks (subtasks included), top 5 only, skipping empty projects', () => {
    const projects = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, i) => project(id, `P-${id}`, { child_order: i }));
    const counts: Record<string, number> = { a: 2, b: 9, c: 0, d: 5, e: 7, f: 1, g: 3 };
    const tasks = Object.entries(counts).flatMap(([pid, n]) => Array.from({ length: n }, (_, i) => task(`${pid}${i}`, pid)));
    tasks.push(task('a-sub', 'a', { parent_id: 'a0' }), task('a-sub2', 'a', { parent_id: 'a0' })); // a now has 4

    const top = topProjectsByOpenTasks(buildIndex(snapshotWith(projects, tasks)), 5);
    expect(top.map((e) => [e.project.name, e.open])).toEqual([
      ['P-b', 9],
      ['P-e', 7],
      ['P-d', 5],
      ['P-a', 4],
      ['P-g', 3],
    ]);
  });

  it('updates the ranking when Todoist data changes — nothing is hardcoded', () => {
    const snap = createDemoSnapshot(NOW);
    const before = topProjectsByOpenTasks(buildIndex(snap));
    expect(before).toHaveLength(5);

    snap.projects.push(project('brand-new', 'NEW PROJECT', { child_order: 999 }));
    for (let i = 0; i < 50; i++) snap.tasks.push(task(`n${i}`, 'brand-new'));
    const after = topProjectsByOpenTasks(buildIndex(snap));
    expect(after[0]).toMatchObject({ open: 50 });
    expect(after[0].project.name).toBe('NEW PROJECT');
    expect(after.slice(1).map((e) => e.project.id)).toEqual(before.slice(0, 4).map((e) => e.project.id));
  });

  it('breaks ties by sidebar order so the chart does not reshuffle between syncs', () => {
    const projects = [project('x', 'X', { child_order: 2 }), project('y', 'Y', { child_order: 1 })];
    const top = topProjectsByOpenTasks(buildIndex(snapshotWith(projects, [task('1', 'x'), task('2', 'y')])));
    expect(top.map((e) => e.project.id)).toEqual(['y', 'x']);
  });
});

describe('project activity and filters', () => {
  const projects = [
    project('busy', 'Marketing', { child_order: 1, created_at: ago(200) }),
    project('idle', 'Old Office Move', { child_order: 2, created_at: ago(200) }),
    project('fresh', 'New Plant', { child_order: 3, created_at: ago(1) }),
    project('child', 'Social Media', { child_order: 1, parent_id: 'busy', created_at: ago(200) }),
  ];
  const tasks = [
    task('t1', 'busy', { updated_at: ago(3), added_at: ago(40) }),
    task('t2', 'child', { added_at: ago(90), updated_at: ago(90) }),
  ];
  const snap = { ...snapshotWith(projects, tasks), completed: [task('done', 'idle', { completed_at: ago(30) })] };
  const index = buildIndex(snap);
  const activity = projectActivity(snap);

  it('uses the latest task change, completion or project creation', () => {
    expect(activity.get('busy')).toBe(Date.parse(ago(3)));
    expect(activity.get('idle')).toBe(Date.parse(ago(30)));
    expect(activity.get('fresh')).toBe(Date.parse(ago(1)));
    expect(isRecentlyUsed(activity, 'busy', NOW)).toBe(true);
    expect(isRecentlyUsed(activity, 'idle', NOW)).toBe(false);
  });

  it('filters all / active / recently used and counts each', () => {
    const all = filterProjects(index, activity, { query: '', filter: 'all', now: NOW });
    expect(all.counts).toEqual({ all: 4, active: 2, recent: 2 });
    expect(all.hierarchical).toBe(true);
    expect(all.nodes.map((n) => n.project.id)).toEqual(['busy', 'child', 'idle', 'fresh']);

    const active = filterProjects(index, activity, { query: '', filter: 'active', now: NOW });
    expect(active.nodes.map((n) => n.project.id)).toEqual(['busy', 'child']);
    expect(active.hierarchical).toBe(false);

    const recent = filterProjects(index, activity, { query: '', filter: 'recent', now: NOW });
    expect(recent.nodes.map((n) => n.project.id)).toEqual(['fresh', 'busy']); // most recent first
  });

  it('searches project names and parent names, case-insensitively', () => {
    const byName = filterProjects(index, activity, { query: 'office', filter: 'all', now: NOW });
    expect(byName.nodes.map((n) => n.project.id)).toEqual(['idle']);
    expect(byName.hierarchical).toBe(false);
    const byParent = filterProjects(index, activity, { query: 'marketing', filter: 'all', now: NOW });
    expect(byParent.nodes.map((n) => n.project.id)).toEqual(['busy', 'child']);
    expect(filterProjects(index, activity, { query: 'zzz', filter: 'all', now: NOW }).nodes).toEqual([]);
  });
});

describe('revealKeys', () => {
  const snap = createDemoSnapshot(NOW);
  const index = buildIndex(snap);

  it('opens only the section and parent tasks above a nested subtask', () => {
    const sub = snap.tasks.find((t) => t.content === 'Choose LMS platform')!;
    const parent = snap.tasks.find((t) => parseTitle(t.content).title === 'Develop LMS-style Onboarding System')!;
    expect(revealKeys(index, { taskId: sub.id })).toEqual([disclosureKey.subtasks(parent.id), disclosureKey.section(parent.section_id!)]);
  });

  it('opens a section by id', () => {
    const website = snap.sections.find((s) => s.name === 'WEBSITE')!;
    expect(revealKeys(index, { sectionId: website.id })).toEqual([disclosureKey.section(website.id)]);
  });

  it('opens the "No section" block only when the project also has sections', () => {
    const inboxTask = snap.tasks.find((t) => t.project_id === 'p-inbox')!;
    expect(revealKeys(index, { taskId: inboxTask.id })).toEqual([]); // Inbox has no sections: tasks always visible

    const extra = { ...snap, tasks: [...snap.tasks, task('loose', 'p-rv')] };
    expect(revealKeys(buildIndex(extra), { taskId: 'loose' })).toEqual([disclosureKey.noSection('p-rv')]);
  });

  it('returns nothing for a task that no longer exists', () => {
    expect(revealKeys(index, { taskId: 'gone' })).toEqual([]);
  });
});
