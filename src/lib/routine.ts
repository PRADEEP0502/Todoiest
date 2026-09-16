import type { WorkspaceIndex } from './hierarchy';
import type { TodoistTask } from '../types/todoist';

/**
 * Routine work — the tasks that come back every day or week — is kept out of the creation-date and
 * first-due-date checks: a task that repeats has no single day it arrived on or was first due.
 *
 * Two things mark it, both taken from Todoist rather than guessed: the task repeats, or it sits in
 * a section the workspace named for its routines.
 */
const ROUTINE_SECTION = /routine/i;

export function isRoutineSection(name: string): boolean {
  return ROUTINE_SECTION.test(name);
}

export function isRoutineTask(task: TodoistTask, index: WorkspaceIndex): boolean {
  if (task.due?.is_recurring) return true;
  const section = task.section_id ? index.sectionById.get(task.section_id) : undefined;
  return !!section && isRoutineSection(section.name);
}
