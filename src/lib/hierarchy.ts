import type { TodoistProject, TodoistSection, TodoistTask, WorkspaceSnapshot } from '../types/todoist';
import { plainText } from './text';

// Builds the Workspace → Project → Section → Task → Subtask structure from flat API lists.
// Every relationship is resolved by ID; names are only ever used for display.

export interface ProjectNode {
  project: TodoistProject;
  depth: number;
  children: ProjectNode[];
}

export interface ProjectGroup {
  /** Workspace id, or `personal`. */
  id: string;
  name: string;
  roots: ProjectNode[];
  projectCount: number;
}

export interface WorkspaceIndex {
  projectById: Map<string, TodoistProject>;
  sectionById: Map<string, TodoistSection>;
  taskById: Map<string, TodoistTask>;
  /** Sections of each project, in Todoist order. */
  sectionsByProject: Map<string, TodoistSection[]>;
  /** Top-level tasks per container (see `containerKey`), in Todoist order. */
  rootTasks: Map<string, TodoistTask[]>;
  /** Direct subtasks of each task, in Todoist order. */
  subtasks: Map<string, TodoistTask[]>;
  /** Open tasks (including subtasks) per project and per section. */
  openByProject: Map<string, number>;
  openBySection: Map<string, number>;
  groups: ProjectGroup[];
  /** Projects in sidebar order: grouped by workspace, parents before children. */
  orderedProjects: ProjectNode[];
  projectRank: Map<string, number>;
}

export const PERSONAL_GROUP_ID = 'personal';

/** Tasks live in a project and optionally a section; `null` section means "no section". */
export const containerKey = (projectId: string, sectionId: string | null) => `${projectId}::${sectionId ?? ''}`;

const byOrder = <T extends { child_order: number }>(a: T, b: T) => a.child_order - b.child_order;

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function increment<K>(map: Map<K, number>, key: K) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function buildIndex(snapshot: Pick<WorkspaceSnapshot, 'projects' | 'sections' | 'tasks' | 'workspaces'>): WorkspaceIndex {
  const projectById = new Map(snapshot.projects.map((p) => [p.id, p]));
  const sectionById = new Map<string, TodoistSection>();
  const taskById = new Map(snapshot.tasks.map((t) => [t.id, t]));

  // Sections — ignore any whose project is not visible (archived, deleted, no access).
  const sectionsByProject = new Map<string, TodoistSection[]>();
  for (const section of snapshot.sections) {
    if (!projectById.has(section.project_id)) continue;
    sectionById.set(section.id, section);
    push(sectionsByProject, section.project_id, section);
  }
  for (const list of sectionsByProject.values()) list.sort((a, b) => a.section_order - b.section_order);

  // Tasks.
  const rootTasks = new Map<string, TodoistTask[]>();
  const subtasks = new Map<string, TodoistTask[]>();
  const openByProject = new Map<string, number>();
  const openBySection = new Map<string, number>();
  for (const task of snapshot.tasks) {
    if (!projectById.has(task.project_id)) continue;
    // A section id that no longer resolves (deleted/archived section) falls back to "no section".
    const sectionId = task.section_id && sectionById.has(task.section_id) ? task.section_id : null;
    increment(openByProject, task.project_id);
    if (sectionId) increment(openBySection, sectionId);

    if (task.parent_id && taskById.has(task.parent_id)) push(subtasks, task.parent_id, task);
    else push(rootTasks, containerKey(task.project_id, sectionId), task);
  }
  for (const list of rootTasks.values()) list.sort(byOrder);
  for (const list of subtasks.values()) list.sort(byOrder);

  // Project tree, grouped by workspace.
  const childProjects = new Map<string | null, TodoistProject[]>();
  for (const project of snapshot.projects) {
    const parent = project.parent_id && projectById.has(project.parent_id) ? project.parent_id : null;
    push(childProjects, parent, project);
  }
  for (const list of childProjects.values()) {
    list.sort((a, b) => Number(b.inbox_project ?? false) - Number(a.inbox_project ?? false) || byOrder(a, b));
  }

  const buildNode = (project: TodoistProject, depth: number, seen: Set<string>): ProjectNode => {
    seen.add(project.id);
    const children = (childProjects.get(project.id) ?? [])
      .filter((child) => !seen.has(child.id)) // guards against malformed parent cycles
      .map((child) => buildNode(child, depth + 1, seen));
    return { project, depth, children };
  };

  const workspaceNames = new Map(snapshot.workspaces.map((w) => [String(w.id), w.name]));
  const groupsById = new Map<string, ProjectGroup>();
  const seen = new Set<string>();
  for (const root of childProjects.get(null) ?? []) {
    const groupId = root.workspace_id ? String(root.workspace_id) : PERSONAL_GROUP_ID;
    let group = groupsById.get(groupId);
    if (!group) {
      group = {
        id: groupId,
        name: groupId === PERSONAL_GROUP_ID ? 'Personal' : (workspaceNames.get(groupId) ?? 'Team workspace'),
        roots: [],
        projectCount: 0,
      };
      groupsById.set(groupId, group);
    }
    group.roots.push(buildNode(root, 0, seen));
  }

  // Team workspaces first (in the order Todoist returns them), then personal projects.
  const workspaceOrder = new Map(snapshot.workspaces.map((w, i) => [String(w.id), i]));
  const groups = [...groupsById.values()].sort((a, b) => {
    const rank = (g: ProjectGroup) => (g.id === PERSONAL_GROUP_ID ? Infinity : (workspaceOrder.get(g.id) ?? 1e6));
    return rank(a) - rank(b);
  });

  const orderedProjects: ProjectNode[] = [];
  const walk = (node: ProjectNode) => {
    orderedProjects.push(node);
    node.children.forEach(walk);
  };
  for (const group of groups) {
    const before = orderedProjects.length;
    group.roots.forEach(walk);
    group.projectCount = orderedProjects.length - before;
  }
  const projectRank = new Map(orderedProjects.map((node, i) => [node.project.id, i]));

  return {
    projectById,
    sectionById,
    taskById,
    sectionsByProject,
    rootTasks,
    subtasks,
    openByProject,
    openBySection,
    groups,
    orderedProjects,
    projectRank,
  };
}

/** All open tasks in a section (or the project's unsectioned area), including nested subtasks. */
export function countContainer(index: WorkspaceIndex, projectId: string, sectionId: string | null): number {
  if (sectionId) return index.openBySection.get(sectionId) ?? 0;
  let count = 0;
  const visit = (task: TodoistTask) => {
    count++;
    index.subtasks.get(task.id)?.forEach(visit);
  };
  index.rootTasks.get(containerKey(projectId, null))?.forEach(visit);
  return count;
}

/** Every descendant subtask of a task, depth-first. */
export function descendantsOf(index: WorkspaceIndex, taskId: string): TodoistTask[] {
  const out: TodoistTask[] = [];
  const visit = (id: string) => {
    for (const child of index.subtasks.get(id) ?? []) {
      out.push(child);
      visit(child.id);
    }
  };
  visit(taskId);
  return out;
}

export interface SectionGroup {
  section: TodoistSection | null;
  /** Tasks whose parent is not part of this group. */
  roots: TodoistTask[];
}

export interface ProjectTaskGroup {
  project: TodoistProject;
  sections: SectionGroup[];
  count: number;
}

/**
 * Groups an arbitrary subset of tasks (e.g. "due today") into Project → Section, keeping the
 * sidebar project order and Todoist section order. A task whose parent is also in the subset is
 * nested under that parent rather than listed separately.
 */
export function groupByProjectAndSection(
  index: WorkspaceIndex,
  tasks: TodoistTask[],
  compare: (a: TodoistTask, b: TodoistTask) => number = byOrder,
): { groups: ProjectTaskGroup[]; childrenOf: (taskId: string) => TodoistTask[] } {
  const ids = new Set(tasks.map((t) => t.id));
  const children = new Map<string, TodoistTask[]>();
  const byProject = new Map<string, Map<string, TodoistTask[]>>();
  const counts = new Map<string, number>();

  for (const task of tasks) {
    if (!index.projectById.has(task.project_id)) continue;
    increment(counts, task.project_id);
    if (task.parent_id && ids.has(task.parent_id)) {
      push(children, task.parent_id, task);
      continue;
    }
    const sectionKey = task.section_id && index.sectionById.has(task.section_id) ? task.section_id : '';
    let sections = byProject.get(task.project_id);
    if (!sections) byProject.set(task.project_id, (sections = new Map()));
    push(sections, sectionKey, task);
  }
  for (const list of children.values()) list.sort(compare);

  const sectionRank = (key: string) => (key ? (index.sectionById.get(key)?.section_order ?? 0) : -Infinity);
  const groups = [...byProject.entries()]
    .sort(([a], [b]) => (index.projectRank.get(a) ?? 0) - (index.projectRank.get(b) ?? 0))
    .map(([projectId, sections]) => ({
      project: index.projectById.get(projectId)!,
      count: counts.get(projectId) ?? 0,
      sections: [...sections.entries()]
        .sort(([a], [b]) => sectionRank(a) - sectionRank(b))
        .map(([key, roots]) => ({ section: key ? index.sectionById.get(key)! : null, roots: roots.sort(compare) })),
    }));

  return { groups, childrenOf: (taskId) => children.get(taskId) ?? [] };
}

/** "Project › Section › Parent task › …" for a task: every level above it, top first. */
export function taskPath(index: WorkspaceIndex, task: Pick<TodoistTask, 'project_id' | 'section_id' | 'parent_id'>): string[] {
  const path: string[] = [];
  const project = index.projectById.get(task.project_id);
  if (project) path.push(project.name);
  const section = task.section_id ? index.sectionById.get(task.section_id) : undefined;
  if (section) path.push(section.name);
  const parents: string[] = [];
  const seen = new Set<string>();
  for (let p = task.parent_id ? index.taskById.get(task.parent_id) : undefined; p && !seen.has(p.id); p = p.parent_id ? index.taskById.get(p.parent_id) : undefined) {
    seen.add(p.id);
    parents.unshift(plainText(p.content));
  }
  return [...path, ...parents];
}
