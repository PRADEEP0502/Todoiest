import { describe, expect, it } from 'vitest';
import { createDemoSnapshot } from '../services/todoist/demoData';
import type { TodoistProject, TodoistSection, TodoistTask, WorkspaceSnapshot } from '../types/todoist';
import { buildIndex, containerKey, countContainer, descendantsOf, groupByProjectAndSection, taskPath } from './hierarchy';
import { searchWorkspace } from './search';

const NOW = new Date(2026, 8, 14, 9, 0); // Monday 14 Sep 2026, 09:00

function task(partial: Partial<TodoistTask> & Pick<TodoistTask, 'id' | 'project_id'>): TodoistTask {
  return {
    section_id: null,
    parent_id: null,
    content: partial.id,
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
    ...partial,
  };
}

const project = (id: string, name: string, extra: Partial<TodoistProject> = {}): TodoistProject => ({
  id,
  name,
  color: 'blue',
  parent_id: null,
  child_order: 1,
  ...extra,
});

const section = (id: string, projectId: string, name: string, order = 1): TodoistSection => ({ id, project_id: projectId, name, section_order: order });

describe('buildIndex with the demo workspace', () => {
  const snapshot = createDemoSnapshot(NOW);
  const index = buildIndex(snapshot);

  it('groups team workspace projects before personal projects', () => {
    expect(index.groups.map((g) => g.name)).toEqual(['JPM', 'Personal']);
    const jpm = index.groups[0].roots.map((n) => n.project.name);
    expect(jpm).toEqual(['RV', 'MANPOWER 🎯', 'PROJECTS 🎯🎯', 'Finance & Accounts']);
    expect(index.groups[1].roots[0].project.name).toBe('Inbox');
  });

  it('nests sub-projects under their parent by id', () => {
    const finance = index.groups[0].roots.find((n) => n.project.id === 'p-finance')!;
    expect(finance.children.map((c) => c.project.name)).toEqual(['Vendor Payments']);
    expect(index.orderedProjects.findIndex((n) => n.project.id === 'p-vendor')).toBe(
      index.orderedProjects.findIndex((n) => n.project.id === 'p-finance') + 1,
    );
  });

  it('keeps sections in Todoist order inside their project', () => {
    expect(index.sectionsByProject.get('p-projects')!.map((s) => s.name)).toEqual(['ON BOARD PROCESS', 'WEBSITE', 'MANPOWER', 'ERP Rollout']);
  });

  it('never confuses sections that share a name', () => {
    const followUps = [...index.sectionById.values()].filter((s) => s.name === 'Follow-ups');
    expect(followUps).toHaveLength(2);
    expect(new Set(followUps.map((s) => s.project_id)).size).toBe(2);
    for (const s of followUps) {
      const tasks = index.rootTasks.get(containerKey(s.project_id, s.id)) ?? [];
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks.every((t) => t.section_id === s.id && t.project_id === s.project_id)).toBe(true);
    }
  });

  it('nests subtasks under their parent and counts them', () => {
    const lms = [...index.taskById.values()].find((t) => t.content === 'Develop LMS-style Onboarding System')!;
    expect(index.subtasks.get(lms.id)!.map((t) => t.content)).toEqual(['Define module list with HR', 'Record welcome video from MD', 'Choose LMS platform']);
    expect(descendantsOf(index, lms.id)).toHaveLength(3);
    const onboarding = index.sectionsByProject.get('p-projects')![0];
    expect(index.rootTasks.get(containerKey('p-projects', onboarding.id))).toHaveLength(5);
    expect(countContainer(index, 'p-projects', onboarding.id)).toBe(8); // 5 tasks + 3 subtasks
  });

  it('counts every open task exactly once', () => {
    const total = [...index.openByProject.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(snapshot.tasks.length);
  });

  it('builds hierarchy paths for display', () => {
    const sub = [...index.taskById.values()].find((t) => t.content === 'Choose LMS platform')!;
    expect(taskPath(index, sub)).toEqual(['PROJECTS 🎯🎯', 'ON BOARD PROCESS', 'Develop LMS-style Onboarding System']);
  });
});

describe('dynamic data: the index reflects whatever Todoist returns', () => {
  const base = (): WorkspaceSnapshot => createDemoSnapshot(NOW);

  it('shows a brand-new project → section → task with no code changes', () => {
    const snap = base();
    snap.projects.push(project('new-p', 'NEW PROJECT', { child_order: 99 }));
    snap.sections.push(section('new-s', 'new-p', 'NEW SECTION'));
    snap.tasks.push(task({ id: 'new-t', project_id: 'new-p', section_id: 'new-s', content: 'NEW TASK' }));
    const index = buildIndex(snap);

    expect(index.groups.find((g) => g.id === 'personal')!.roots.map((n) => n.project.name)).toContain('NEW PROJECT');
    expect(index.sectionsByProject.get('new-p')!.map((s) => s.name)).toEqual(['NEW SECTION']);
    expect(index.rootTasks.get(containerKey('new-p', 'new-s'))!.map((t) => t.content)).toEqual(['NEW TASK']);
  });

  it('reflects renames, moves and deletions', () => {
    const snap = base();
    const renamed = snap.sections.find((s) => s.name === 'WEBSITE')!;
    renamed.name = 'Website 2.0';
    const moved = snap.tasks.find((t) => t.content === 'Finalise homepage copy')!;
    const target = snap.sections.find((s) => s.name === 'Site Visits')!;
    moved.project_id = target.project_id;
    moved.section_id = target.id;
    snap.projects = snap.projects.filter((p) => p.id !== 'p-guide');

    const index = buildIndex(snap);
    expect(index.sectionById.get(renamed.id)!.name).toBe('Website 2.0');
    expect(index.rootTasks.get(containerKey(target.project_id, target.id))!.map((t) => t.id)).toContain(moved.id);
    expect(index.rootTasks.get(containerKey('p-projects', renamed.id))!.map((t) => t.id)).not.toContain(moved.id);
    expect(index.projectById.has('p-guide')).toBe(false);
    expect(index.sectionsByProject.has('p-guide')).toBe(false);
    expect(index.groups.flatMap((g) => g.roots).some((n) => n.project.id === 'p-guide')).toBe(false);
  });

  it('falls back to "no section" when a task points at a missing section', () => {
    const index = buildIndex({
      workspaces: [],
      projects: [project('p', 'P')],
      sections: [],
      tasks: [task({ id: 't', project_id: 'p', section_id: 'gone' })],
    });
    expect(index.rootTasks.get(containerKey('p', null))!.map((t) => t.id)).toEqual(['t']);
  });

  it('treats a subtask whose parent is gone as a top-level task', () => {
    const index = buildIndex({
      workspaces: [],
      projects: [project('p', 'P')],
      sections: [],
      tasks: [task({ id: 'child', project_id: 'p', parent_id: 'completed-parent' })],
    });
    expect(index.rootTasks.get(containerKey('p', null))!.map((t) => t.id)).toEqual(['child']);
  });

  it('survives malformed parent cycles in projects', () => {
    const index = buildIndex({
      workspaces: [],
      projects: [project('a', 'A', { parent_id: 'b' }), project('b', 'B', { parent_id: 'a' }), project('c', 'C')],
      sections: [],
      tasks: [],
    });
    expect(index.orderedProjects.map((n) => n.project.id)).toEqual(['c']);
  });
});

describe('groupByProjectAndSection', () => {
  it('groups a subset as Project → Section in sidebar order, nesting subtasks present in the subset', () => {
    const snap = createDemoSnapshot(NOW);
    const index = buildIndex(snap);
    const lms = snap.tasks.find((t) => t.content === 'Develop LMS-style Onboarding System')!;
    const subset = [...snap.tasks.filter((t) => t.parent_id === lms.id), lms, snap.tasks.find((t) => t.content === 'Inspect RV plant safety compliance')!];

    const { groups, childrenOf } = groupByProjectAndSection(index, subset);
    expect(groups.map((g) => g.project.name)).toEqual(['RV', 'PROJECTS 🎯🎯']);
    expect(groups[1].sections.map((s) => s.section?.name)).toEqual(['ON BOARD PROCESS']);
    expect(groups[1].sections[0].roots.map((t) => t.id)).toEqual([lms.id]);
    expect(childrenOf(lms.id)).toHaveLength(3);
    expect(groups[1].count).toBe(4);
  });
});

describe('large workspace', () => {
  it('handles many projects, sections and tasks correctly and quickly', () => {
    const projects: TodoistProject[] = [];
    const sections: TodoistSection[] = [];
    const tasks: TodoistTask[] = [];
    for (let p = 0; p < 80; p++) {
      projects.push(project(`p${p}`, `Project ${p}`, { child_order: 80 - p, workspace_id: p % 2 ? 'w1' : null, parent_id: p % 10 === 9 ? `p${p - 1}` : null }));
      for (let s = 0; s < 8; s++) {
        // Every project reuses the same section names.
        sections.push(section(`p${p}s${s}`, `p${p}`, `Section ${s}`, 8 - s));
        for (let t = 0; t < 12; t++) {
          const id = `p${p}s${s}t${t}`;
          tasks.push(task({ id, project_id: `p${p}`, section_id: `p${p}s${s}`, child_order: 12 - t }));
          if (t % 4 === 0) tasks.push(task({ id: `${id}-sub`, project_id: `p${p}`, section_id: `p${p}s${s}`, parent_id: id }));
        }
      }
    }

    const started = performance.now();
    const index = buildIndex({ workspaces: [{ id: 'w1', name: 'Team' }], projects, sections, tasks });
    const elapsed = performance.now() - started;

    expect(tasks.length).toBe(80 * 8 * 15);
    expect(index.orderedProjects).toHaveLength(80);
    expect(index.groups.map((g) => g.name)).toEqual(['Team', 'Personal']);
    expect(index.openByProject.get('p42')).toBe(8 * 15);
    expect(countContainer(index, 'p42', 'p42s3')).toBe(15);
    expect(index.sectionsByProject.get('p0')!.map((s) => s.id)).toEqual(['p0s7', 'p0s6', 'p0s5', 'p0s4', 'p0s3', 'p0s2', 'p0s1', 'p0s0']);
    expect(index.rootTasks.get(containerKey('p0', 'p0s0'))![0].id).toBe('p0s0t11');
    expect(searchWorkspace(index, 'section 3').sections).toHaveLength(8); // capped, but all distinct ids
    expect(elapsed).toBeLessThan(500);
  });
});
