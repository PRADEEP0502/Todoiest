/**
 * Every task carries two dates in its Todoist title, in the workspace's existing style:
 *
 *     16.09.26, Develop LMS Portal, 20.09.26
 *      ↑ CD — the day the task was created        ↑ IDD — the first due date it was ever given
 *
 * Both are written once and then left alone. Renaming the task, moving it to another project or
 * rescheduling it never rewrites either date, so the title keeps saying when the work arrived and
 * when it was first meant to be done, however often the live due date changes afterwards.
 */

/** A leading "DD.MM.YY," (with or without a space after the comma). */
const CD_PREFIX = /^(\d{2}\.\d{2}\.\d{2}),[ \t]*/;
/** A trailing ", DD.MM.YY". The comma is what separates it from a date inside the sentence. */
const IDD_SUFFIX = /,[ \t]*(\d{2}\.\d{2}\.\d{2})[ \t]*$/;

const pad = (n: number) => String(n).padStart(2, '0');

export interface TitleDates {
  /** Creation date, DD.MM.YY, or null when the title carries none. */
  cd: string | null;
  /** The task title with both dates taken off. */
  title: string;
  /** Initial due date, DD.MM.YY, or null when the title carries none. */
  idd: string | null;
}

/** A date as DD.MM.YY, from the local clock. */
export function formatCd(date: Date): string {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${pad(date.getFullYear() % 100)}`;
}

/** A Todoist date ("2026-09-20", or a timestamp) as DD.MM.YY, read as written rather than shifted by time zone. */
export function cdFromApiDate(value: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec((value ?? '').trim());
  return match ? `${match[3]}.${match[2]}.${match[1].slice(2)}` : null;
}

/** Splits "16.09.26, Develop LMS Portal, 20.09.26" into its two dates and the title between them. */
export function parseTitle(content: string): TitleDates {
  let rest = content.trim();
  const front = CD_PREFIX.exec(rest);
  const cd = front ? front[1] : null;
  if (front) rest = rest.slice(front[0].length);
  const back = IDD_SUFFIX.exec(rest);
  const idd = back ? back[1] : null;
  if (back) rest = rest.slice(0, back.index);
  return { cd, title: rest.trim(), idd };
}

/** Puts a title back together with its dates, without ever doubling one that is already there. */
export function buildTitle({ cd, title, idd }: TitleDates): string {
  const bare = parseTitle(title).title;
  return `${cd ? `${cd}, ` : ''}${bare}${idd ? `, ${idd}` : ''}`;
}

export const hasCd = (content: string) => parseTitle(content).cd !== null;
export const hasIdd = (content: string) => parseTitle(content).idd !== null;

/**
 * The title to send to Todoist for a task being created now, with the due date it is being given.
 * Routine work is left alone — a task that repeats has no single creation or first due date.
 */
export function titleForNewTask(title: string, now: Date, dueDate: string | null, routine = false): string {
  const typed = parseTitle(title);
  return buildTitle({
    // Someone typing their own dates keeps them; otherwise the clock and the due date supply them.
    cd: typed.cd ?? (routine ? null : formatCd(now)),
    title: typed.title,
    idd: typed.idd ?? (routine ? null : cdFromApiDate(dueDate)),
  });
}

/**
 * The title to send to Todoist for a task being saved. The dates already in the title win; a
 * missing CD is filled in from when Todoist says the task was added, and a missing IDD only from a
 * due date being set on a task that had none — the dashboard never guesses a date it did not see,
 * and it adds nothing at all to routine work.
 */
export function titleForSavedTask(
  stored: { content: string; addedAt: string | null; hasDueDate: boolean; routine?: boolean },
  typedTitle: string,
  dueDate: string | null,
): string {
  const current = parseTitle(stored.content);
  const typed = parseTitle(typedTitle);
  const firstDueDate = !stored.hasDueDate && dueDate ? cdFromApiDate(dueDate) : null;
  return buildTitle({
    cd: current.cd ?? typed.cd ?? (stored.routine ? null : cdFromApiDate(stored.addedAt)),
    title: typed.title,
    idd: current.idd ?? typed.idd ?? (stored.routine ? null : firstDueDate),
  });
}
