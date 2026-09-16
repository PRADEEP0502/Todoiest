/**
 * CD = Creation Date. Tasks created from the dashboard carry the date they were created at the
 * front of their Todoist title, in the workspace's existing style:
 *
 *     16.09.26, Develop LMS Portal
 *
 * The date is taken from the clock at the moment of creation and never changes afterwards —
 * editing the title, moving the task or changing its due date all leave it untouched.
 */

/** Matches a leading "DD.MM.YY," (with or without a space after the comma). */
const CD_PREFIX = /^(\d{2}\.\d{2}\.\d{2}),[ \t]*/;

const pad = (n: number) => String(n).padStart(2, '0');

/** Today's date as DD.MM.YY, from the local clock. */
export function formatCd(date: Date): string {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${pad(date.getFullYear() % 100)}`;
}

/** Splits "16.09.26, Title" into its creation date and the title itself. */
export function splitCd(content: string): { cd: string | null; title: string } {
  const match = CD_PREFIX.exec(content);
  return match ? { cd: match[1], title: content.slice(match[0].length) } : { cd: null, title: content };
}

export const hasCd = (content: string) => CD_PREFIX.test(content);

/** Puts a creation date in front of a title, without ever doubling one that is already there. */
export function withCd(title: string, cd: string): string {
  const { title: bare } = splitCd(title.trim());
  return `${cd}, ${bare}`;
}

/** The title to send to Todoist for a task being created now. */
export function titleWithCreationDate(title: string, now: Date): string {
  const typed = title.trim();
  // Someone typing their own date keeps it; otherwise today's date is added.
  return withCd(typed, splitCd(typed).cd ?? formatCd(now));
}
