import type { WorkspaceIndex } from './hierarchy';
import { plainText } from './text';
import type { TodoistTask } from '../types/todoist';

/**
 * Work the workspace has deliberately parked — a section called "Keep pending", or one on hold.
 *
 * A task there has no due date and no issue date on purpose: it is waiting for something, not
 * waiting to be scheduled. The No DD and No IDD checks therefore leave it alone, rather than
 * reporting a date as missing when nobody is expected to set one yet. Its CD still stands, since
 * every task was created on some day.
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
