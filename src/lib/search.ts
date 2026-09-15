import type { Person, TodoistProject, TodoistSection, TodoistTask } from '../types/todoist';
import { type WorkspaceIndex, taskPath } from './hierarchy';

/** `path` always ends with the matched item's own name, e.g. Project → Section → Parent → Task. */
export type SearchResult =
  | { kind: 'project'; id: string; project: TodoistProject; path: string[] }
  | { kind: 'section'; id: string; section: TodoistSection; path: string[] }
  | { kind: 'task'; id: string; task: TodoistTask; path: string[] }
  | { kind: 'label'; id: string; name: string; count: number; path: string[] }
  | { kind: 'person'; id: string; person: Person; count: number; path: string[] };

/** Todoist task names may contain Markdown links and emphasis; show them as plain text. */
export function plainText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2');
}

const normalize = (s: string) => plainText(s).toLocaleLowerCase().normalize('NFKD');

/** Scores a name against every query word: 3 = starts with query, 2 = word starts with it, 1 = contains, 0 = no match. */
function score(name: string, words: string[], full: string): number {
  const text = normalize(name);
  if (!words.every((w) => text.includes(w))) return 0;
  if (text.startsWith(full)) return 3;
  if (words.every((w) => text.split(/[\s\-_/]+/).some((part) => part.startsWith(w)))) return 2;
  return 1;
}

interface SearchExtras {
  /** Label name → active task count. */
  labels?: Map<string, number>;
  /** People with their active task counts. */
  people?: { person: Person; count: number }[];
}

const LIMITS = { projects: 6, sections: 8, tasks: 25, labels: 5, people: 5 };

export function searchWorkspace(index: WorkspaceIndex, query: string, extras: SearchExtras = {}) {
  const full = normalize(query.trim());
  const words = full.split(/\s+/).filter(Boolean);
  if (!words.length) return { projects: [], sections: [], tasks: [], labels: [], people: [], total: 0 };

  const rank = <T extends SearchResult>(items: { item: T; s: number }[], max: number) =>
    items
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, max)
      .map((x) => x.item);

  const projects = rank(
    [...index.projectById.values()].map((project) => {
      const parent = project.parent_id ? index.projectById.get(project.parent_id) : undefined;
      return {
        item: { kind: 'project' as const, id: project.id, project, path: parent ? [parent.name, project.name] : [project.name] },
        s: score(project.name, words, full),
      };
    }),
    LIMITS.projects,
  );

  const sections = rank(
    [...index.sectionById.values()].map((section) => ({
      item: { kind: 'section' as const, id: section.id, section, path: [index.projectById.get(section.project_id)?.name ?? '', section.name] },
      s: score(section.name, words, full),
    })),
    LIMITS.sections,
  );

  const taskMatches = [...index.taskById.values()]
    .map((task) => ({ task, s: score(task.content, words, full) }))
    .filter((x) => x.s > 0);
  // Paths are only built for the tasks that are actually shown.
  const tasks = taskMatches
    .sort((a, b) => b.s - a.s)
    .slice(0, LIMITS.tasks)
    .map(({ task }) => ({ kind: 'task' as const, id: task.id, task, path: [...taskPath(index, task), plainText(task.content)] }));

  const labels = rank(
    [...(extras.labels ?? new Map<string, number>())].map(([name, count]) => ({
      item: { kind: 'label' as const, id: name, name, count, path: [name] },
      s: score(name, words, full),
    })),
    LIMITS.labels,
  );

  const people = rank(
    (extras.people ?? []).map(({ person, count }) => ({
      item: { kind: 'person' as const, id: person.id, person, count, path: [person.name] },
      s: Math.max(score(person.name, words, full), score(person.email, words, full)),
    })),
    LIMITS.people,
  );

  return { projects, sections, tasks, labels, people, total: projects.length + sections.length + taskMatches.length + labels.length + people.length };
}
