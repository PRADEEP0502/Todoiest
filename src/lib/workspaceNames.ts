import type { WorkspaceIndex } from './hierarchy';
import { plainText, taskTitle } from './text';
import type { WorkspaceSnapshot } from '../types/todoist';

/** How many names are worth sending; beyond this they stop helping and only cost. */
const LIMIT = 80;
/** Room kept for each kind, so a long list of sections cannot crowd out the machine names. */
const SHARE = { machines: 30, projects: 22, sections: 16, people: 12 };
/** Words in task titles that look like the name of a thing: JPM, 6T, LMS, AT2, V3. */
const NAMEY = /^(?:[A-Z][A-Za-z]*\d+[A-Za-z]*|[A-Z]{2,}|\d+[A-Z]+)$/;

const SPLIT = /[\s,./:;()[\]–—-]+/;

/**
 * The names this workspace actually uses — its projects, sections, people, and the short
 * machine-and-system names that run through its task titles.
 *
 * Speech recognition spells these by ear ("JBM" for JPM, "6D" for 6T), so they are sent with the
 * words to be rewritten and the model matches what it heard against them. Nothing is hardcoded:
 * the list is whatever Todoist last synced. Each kind gets its own share of the room, because the
 * machine names are the ones speech mangles most and a long project list must not crowd them out.
 */
export function workspaceNames(index: WorkspaceIndex | null, snapshot: WorkspaceSnapshot | null): string[] {
  if (!index || !snapshot) return [];

  const machines = new Set<string>();
  for (const task of snapshot.tasks) {
    for (const word of taskTitle(task.content).split(SPLIT)) {
      if (word.length >= 2 && word.length <= 12 && NAMEY.test(word)) machines.add(word);
    }
  }
  const projects = index.orderedProjects.map((node) => plainText(node.project.name));
  const sections = [...index.sectionsByProject.values()].flat().map((section) => plainText(section.name));
  const people = Object.values(snapshot.people).map((person) => person.name);

  const taken = new Set<string>();
  const add = (candidates: Iterable<string>, room: number) => {
    let used = 0;
    for (const raw of candidates) {
      const name = raw.trim();
      if (!name || taken.has(name) || used >= room) continue;
      taken.add(name);
      used += 1;
      if (taken.size >= LIMIT) return;
    }
  };

  add(machines, SHARE.machines);
  add(projects, SHARE.projects);
  add(sections, SHARE.sections);
  add(people, SHARE.people);
  // Whatever room is left over goes to the rest, longest-standing first.
  add([...projects, ...sections, ...people], LIMIT);

  return [...taken];
}
