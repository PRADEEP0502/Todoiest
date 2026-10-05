import type { WorkspaceIndex } from './hierarchy';
import { plainText, taskTitle } from './text';
import type { WorkspaceSnapshot } from '../types/todoist';

/** How many names are worth sending; beyond this they stop helping and only cost. */
const LIMIT = 80;
/** Room kept for each kind, so one long list cannot crowd out the rest. */
const SHARE = { coined: 20, acronyms: 14, projects: 18, sections: 14, people: 10 };

const SPLIT = /[\s,./:;()[\]–—-]+/;
/** A coined name: capitals and digits together, short — 6T, 3T, AT2, V3, ST1, S4. */
const COINED = /^(?=.*\d)(?=.*[A-Z])[A-Z0-9]{2,5}$/;
/** An acronym: short and all capitals — JPM, LMS, HRMS, JSF. */
const ACRONYM = /^[A-Z]{2,5}$/;
/** Ordinary words that happen to be shouted in a title, and are no help as names. */
const SHOUTED = new Set([
  'AM', 'AND', 'ANY', 'ARE', 'BILL', 'CARD', 'COUNT', 'DAY', 'FAIR', 'FLOOR', 'FLOW', 'FOR', 'FROM',
  'HOLD', 'JOB', 'JOBS', 'MAN', 'MANY', 'MY', 'NEW', 'NO', 'NOT', 'OF', 'OIL', 'OPEN', 'OUR', 'OUT',
  'PAPER', 'PM', 'POWER', 'SOFT', 'THE', 'TOTAL', 'UPS', 'WITH', 'WORK',
]);

/**
 * The names this workspace actually uses — its coined names and acronyms, its projects, sections
 * and people.
 *
 * Speech recognition spells these by ear ("JBM" for JPM, "6D" for 6T), so they are sent with the
 * words to be rewritten and the model matches what it heard against them. Nothing is hardcoded:
 * the list is whatever Todoist last synced. Each kind gets its own share of the room, with the
 * coined machine names first, because those are the ones speech mangles most.
 */
export function workspaceNames(index: WorkspaceIndex | null, snapshot: WorkspaceSnapshot | null): string[] {
  if (!index || !snapshot) return [];

  const coined = new Set<string>();
  const acronyms = new Set<string>();
  for (const task of snapshot.tasks) {
    for (const word of taskTitle(task.content).split(SPLIT)) {
      if (COINED.test(word)) coined.add(word);
      else if (ACRONYM.test(word) && !SHOUTED.has(word)) acronyms.add(word);
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

  add(coined, SHARE.coined);
  add(acronyms, SHARE.acronyms);
  add(projects, SHARE.projects);
  add(sections, SHARE.sections);
  add(people, SHARE.people);
  // Whatever room is left over goes to the rest.
  add([...projects, ...sections, ...people, ...acronyms], LIMIT);

  return [...taken];
}
