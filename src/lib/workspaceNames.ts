import type { WorkspaceIndex } from './hierarchy';
import { plainText, taskTitle } from './text';
import type { WorkspaceSnapshot } from '../types/todoist';

/** How many names are worth sending; beyond this they stop helping and only cost. */
const LIMIT = 80;
/** Words in task titles that look like a name of something: JPM, 6T, LMS, AT2, V3. */
const NAMEY = /^(?:[A-Z][A-Za-z]*\d+[A-Za-z]*|[A-Z]{2,}|\d+[A-Z]+)$/;

/**
 * The names this workspace actually uses — its projects, sections, people, and the short
 * machine-and-system names that run through its task titles.
 *
 * Speech recognition spells these by ear ("JBM" for JPM, "6D" for 6T), so they are sent with the
 * words to be rewritten and the model matches what it heard against them. Nothing is hardcoded:
 * the list is whatever Todoist last synced.
 */
export function workspaceNames(index: WorkspaceIndex | null, snapshot: WorkspaceSnapshot | null): string[] {
  if (!index || !snapshot) return [];
  const names = new Set<string>();
  for (const node of index.orderedProjects) names.add(plainText(node.project.name));
  for (const sections of index.sectionsByProject.values()) for (const section of sections) names.add(plainText(section.name));
  for (const person of Object.values(snapshot.people)) names.add(person.name);
  // Short all-caps or letter-and-number words from task titles: the machines and systems people say.
  for (const task of snapshot.tasks) {
    for (const word of taskTitle(task.content).split(/[\s,./:;()[\]–—-]+/)) {
      if (word.length >= 2 && word.length <= 12 && NAMEY.test(word)) names.add(word);
    }
  }
  return [...names].map((n) => n.trim()).filter(Boolean).slice(0, LIMIT);
}
