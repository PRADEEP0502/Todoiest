import { dueDateKey } from './dates';
import { toApiPriority, type UiPriority } from './priority';
import type { TodoistTask, UpdateTaskInput } from '../types/todoist';

/** What a form says about a task; only the parts a save can change. */
export interface EditedTask {
  /** The title to send, dates and all — worked out by `titleForSavedTask`. */
  content: string;
  description: string;
  dueDate: string | null;
  priority: UiPriority;
  /**
   * Who holds it, when the form is about that at all. Left out, the holder is not touched: a form
   * that only moves a due date must never hand the task back to nobody.
   */
  assigneeId?: string | null;
}

/**
 * What actually changed, as Todoist's update request. Only fields that differ are sent, so a save
 * never rewrites something the person did not touch — and nothing at all is sent when nothing
 * changed.
 */
export function taskChanges(task: TodoistTask, edited: EditedTask): UpdateTaskInput {
  const changes: UpdateTaskInput = {};
  if (edited.content !== task.content) changes.content = edited.content;
  if (edited.description.trim() !== task.description.trim()) changes.description = edited.description.trim();
  if (toApiPriority(edited.priority) !== task.priority) changes.priority = toApiPriority(edited.priority);
  if (edited.dueDate !== dueDateKey(task.due)) {
    if (edited.dueDate) changes.due_date = edited.dueDate;
    // Todoist clears a due date by being told so in words.
    else changes.due_string = 'no date';
  }
  if (edited.assigneeId !== undefined && edited.assigneeId !== (task.responsible_uid ?? null)) changes.assignee_id = edited.assigneeId;
  return changes;
}
