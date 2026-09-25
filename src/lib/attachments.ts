import type { TodoistAttachment, TodoistComment } from '../types/todoist';

/**
 * Files people attach to a task in Todoist. Todoist keeps them on the task's comments, so the
 * attachments of a task are the files of its comments, oldest comment first.
 */
export interface TaskAttachment extends TodoistAttachment {
  /** The comment the file was posted with, for "who added this". */
  commentId: string;
  postedUid: string | null;
  postedAt: string | null;
}

/** True for a file that can be shown as a picture. */
export function isImage(file: Pick<TodoistAttachment, 'type' | 'image'>): boolean {
  return !!file.image || (file.type ?? '').startsWith('image/');
}

/** What to load for a preview: the thumbnail Todoist made, else the image itself. */
export function previewUrl(file: TodoistAttachment): string | null {
  return file.thumbnail ?? file.image ?? (isImage(file) ? file.url : null);
}

/** The attachments of one task, in the order they were posted. */
export function taskAttachments(comments: TodoistComment[], taskId: string): TaskAttachment[] {
  return comments
    .filter((c) => c.task_id === taskId && c.attachment)
    .sort((a, b) => (a.posted_at ?? '').localeCompare(b.posted_at ?? ''))
    .map((c) => ({ ...c.attachment!, commentId: c.id, postedUid: c.posted_uid, postedAt: c.posted_at }));
}

/** How many files are attached to each task, for the small paper-clip on a task row. */
export function attachmentCounts(comments: TodoistComment[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of comments) if (c.attachment) counts.set(c.task_id, (counts.get(c.task_id) ?? 0) + 1);
  return counts;
}

// Task rows ask one by one; counting the whole list once per sync keeps a long list cheap.
const cache = new WeakMap<TodoistComment[], Map<string, number>>();

/** How many files are attached to one task. */
export function attachmentCount(comments: TodoistComment[], taskId: string): number {
  let counts = cache.get(comments);
  if (!counts) cache.set(comments, (counts = attachmentCounts(comments)));
  return counts.get(taskId) ?? 0;
}
