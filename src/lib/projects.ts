import type { TodoistProject, TodoistTask, WorkspaceSnapshot } from '../types/todoist';
import { disclosureKey } from './disclosure';
import { type ProjectNode, type WorkspaceIndex } from './hierarchy';
import { plainText } from './search';

export type ProjectFilter = 'all' | 'active' | 'recent';

/** "Recently used" = something happened in the project within this many days. */
export const RECENT_DAYS = 14;

export interface WorkloadEntry {
  project: TodoistProject;
  open: number;
}

/**
 * The busiest projects by open (pending) tasks, subtasks included. Projects with no open
 * tasks are left out; ties keep the sidebar order so the ranking is stable between syncs.
 */
export function topProjectsByOpenTasks(index: WorkspaceIndex, limit = 5): WorkloadEntry[] {
  return index.orderedProjects
    .map(({ project }) => ({ project, open: index.openByProject.get(project.id) ?? 0 }))
    .filter((entry) => entry.open > 0)
    .sort((a, b) => b.open - a.open || (index.projectRank.get(a.project.id) ?? 0) - (index.projectRank.get(b.project.id) ?? 0))
    .slice(0, limit);
}

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) || 0 : 0);

/**
 * Latest activity per project, taken from Todoist data: tasks added or changed, tasks completed,
 * and the project's creation. (Project `updated_at` is ignored — reordering projects touches it.)
 */
export function projectActivity(snapshot: Pick<WorkspaceSnapshot, 'projects' | 'tasks' | 'completed'>): Map<string, number> {
  const latest = new Map<string, number>();
  const bump = (projectId: string, at: number) => {
    if (at > (latest.get(projectId) ?? 0)) latest.set(projectId, at);
  };
  for (const project of snapshot.projects) bump(project.id, time(project.created_at));
  const touch = (task: TodoistTask) => bump(task.project_id, Math.max(time(task.updated_at), time(task.added_at), time(task.completed_at)));
  snapshot.tasks.forEach(touch);
  snapshot.completed.forEach(touch);
  return latest;
}

export function isRecentlyUsed(activity: Map<string, number>, projectId: string, now: Date): boolean {
  const at = activity.get(projectId) ?? 0;
  return at > 0 && now.getTime() - at <= RECENT_DAYS * 24 * 60 * 60 * 1000;
}

export interface FilteredProjects {
  nodes: ProjectNode[];
  counts: Record<ProjectFilter, number>;
  /** True when the list should keep the workspace grouping and indentation. */
  hierarchical: boolean;
}

export function filterProjects(
  index: WorkspaceIndex,
  activity: Map<string, number>,
  { query, filter, now }: { query: string; filter: ProjectFilter; now: Date },
): FilteredProjects {
  const all = index.orderedProjects;
  const active = (node: ProjectNode) => (index.openByProject.get(node.project.id) ?? 0) > 0;
  const recent = (node: ProjectNode) => isRecentlyUsed(activity, node.project.id, now);
  const counts = { all: all.length, active: all.filter(active).length, recent: all.filter(recent).length };

  const words = plainText(query).toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = (node: ProjectNode) => {
    if (!words.length) return true;
    const parent = node.project.parent_id ? index.projectById.get(node.project.parent_id)?.name ?? '' : '';
    const text = `${node.project.name} ${parent}`.toLocaleLowerCase();
    return words.every((w) => text.includes(w));
  };

  let nodes = all.filter((node) => matches(node) && (filter === 'all' || (filter === 'active' ? active(node) : recent(node))));
  if (filter === 'recent') nodes = [...nodes].sort((a, b) => (activity.get(b.project.id) ?? 0) - (activity.get(a.project.id) ?? 0));

  // Indented workspace groups only make sense for the complete list; a filtered list is flat.
  return { nodes, counts, hierarchical: filter === 'all' && words.length === 0 };
}

/**
 * Keys that must be open to show one item, and nothing else: its section (or the project's
 * "no section" block) plus every parent task above it.
 */
export function revealKeys(index: WorkspaceIndex, target: { taskId?: string | null; sectionId?: string | null }): string[] {
  const keys: string[] = [];
  if (target.sectionId && index.sectionById.has(target.sectionId)) keys.push(disclosureKey.section(target.sectionId));

  let task = target.taskId ? index.taskById.get(target.taskId) : undefined;
  if (!task) return keys;

  // Walk up to the top-level task; the section it lives in is the one to open.
  const seen = new Set<string>();
  while (task.parent_id && index.taskById.has(task.parent_id) && !seen.has(task.parent_id)) {
    seen.add(task.parent_id);
    keys.push(disclosureKey.subtasks(task.parent_id));
    task = index.taskById.get(task.parent_id)!;
  }
  if (task.section_id && index.sectionById.has(task.section_id)) keys.push(disclosureKey.section(task.section_id));
  else if (index.sectionsByProject.get(task.project_id)?.length) keys.push(disclosureKey.noSection(task.project_id));
  return keys;
}
