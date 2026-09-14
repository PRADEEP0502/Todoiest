import type { TodoistProject, TodoistSection, TodoistTask } from '../types/todoist';
import { type WorkspaceIndex, taskPath } from './hierarchy';

/** `path` always ends with the matched item's own name, e.g. Project → Section → Task. */
export type SearchResult =
  | { kind: 'project'; id: string; project: TodoistProject; path: string[] }
  | { kind: 'section'; id: string; section: TodoistSection; path: string[] }
  | { kind: 'task'; id: string; task: TodoistTask; path: string[] };

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

export function searchWorkspace(index: WorkspaceIndex, query: string, limit = { projects: 6, sections: 8, tasks: 25 }) {
  const full = normalize(query.trim());
  const words = full.split(/\s+/).filter(Boolean);
  if (!words.length) return { projects: [], sections: [], tasks: [], total: 0 };

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
    limit.projects,
  );

  const sections = rank(
    [...index.sectionById.values()].map((section) => ({
      item: {
        kind: 'section' as const,
        id: section.id,
        section,
        path: [index.projectById.get(section.project_id)?.name ?? '', section.name],
      },
      s: score(section.name, words, full),
    })),
    limit.sections,
  );

  const taskMatches = [...index.taskById.values()]
    .map((task) => ({
      item: { kind: 'task' as const, id: task.id, task, path: [...taskPath(index, task), plainText(task.content)] },
      s: score(task.content, words, full),
    }))
    .filter((x) => x.s > 0);
  const tasks = rank(taskMatches, limit.tasks);

  return { projects, sections, tasks, total: projects.length + sections.length + taskMatches.length };
}
