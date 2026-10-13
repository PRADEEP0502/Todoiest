import type { WorkspaceIndex } from './hierarchy';
import { plainText } from './text';
import type { TodoistTask } from '../types/todoist';

/**
 * Work the workspace has deliberately parked — a section called "Keep pending", or one on hold.
 *
 * A task there has no due date on purpose: it is waiting for something, not overdue to be
 * scheduled. The No DD check therefore leaves it alone, rather than reporting a date as missing
 * when nobody is expected to set one yet.
 *
 * The name is read from Todoist as the workspace writes it, emoji and all.
 */
const PARKED = /\b(?:pending|on hold)\b/i;

export function isPendingSection(name: string): boolean {
  return PARKED.test(plainText(name));
}

export function isPendingTask(task: TodoistTask, index: WorkspaceIndex): boolean {
  const section = task.section_id ? index.sectionById.get(task.section_id) : undefined;
  return !!section && isPendingSection(section.name);
}
