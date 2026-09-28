/**
 * Turning a pasted block into a list of task names.
 *
 * People paste from a notebook, a chat or a spreadsheet, so a line may arrive with a bullet, a
 * number or a checkbox in front of it. Those markers are dropped; the words are kept exactly as
 * they were written. Nothing here creates anything — the pasted text only becomes tasks when the
 * person asks for it.
 */

/** Todoist's own limit for a task name. */
export const MAX_TASK_LENGTH = 500;
/** As many as one paste may create at once, so a stray file cannot fire off thousands. */
export const MAX_BULK_TASKS = 100;

const MARKER = /^\s*(?:[-*•‣▪]|\d{1,3}[.)]|\[[ xX]?\])\s+/;

/** One line of the paste, ready to become a task. */
export interface BulkLine {
  /** Position in the paste, so each row keeps its own holder while the text is edited. */
  id: number;
  name: string;
}

/**
 * The tasks a pasted block describes: one per non-empty line, in the order they were written,
 * without bullets or numbering, never more than `MAX_BULK_TASKS`.
 */
export function parseBulkLines(text: string): BulkLine[] {
  const lines: BulkLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const name = raw.replace(MARKER, '').trim().slice(0, MAX_TASK_LENGTH);
    if (name) lines.push({ id: lines.length, name });
    if (lines.length >= MAX_BULK_TASKS) break;
  }
  return lines;
}

/** How many lines were left out because the paste was longer than we create in one go. */
export function droppedLines(text: string): number {
  const all = text.split(/\r?\n/).filter((raw) => raw.replace(MARKER, '').trim().length > 0).length;
  return Math.max(0, all - MAX_BULK_TASKS);
}

/** "10 tasks ready to create" — the count in words, for the preview and the button. */
export function describeCount(n: number, verb = 'ready to create'): string {
  return `${n} task${n === 1 ? '' : 's'} ${verb}`;
}
