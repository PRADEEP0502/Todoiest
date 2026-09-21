/**
 * Every task carries two dates in its Todoist title, in the workspace's existing style:
 *
 *     15.08.26, Develop an LMS-style Onboarding System, 18.8.26
 *      ↑ CD — the day the task was created          ↑ IDD — the issue date, entered once
 *
 * CD is filled in by the dashboard when the task is created; IDD is entered by a person, once.
 * Both are then LOCKED: renaming the task, moving it or rescheduling it never rewrites either
 * date. Only the due date (DD, Todoist's own field) stays editable.
 *
 * Dates are read the way people write them — `15.08.26`, `18.8.26`, `18.08.2026` — and always
 * kept exactly as written, so a stored date is never reformatted or "corrected".
 */

/**
 * A day written with dots, dashes or slashes — 15.08.26, 18.8.26, 19-09-26, 18/08/2026 — or with
 * commas, 13,08,26. Commas only with two-digit day and month, so a list like "3,4,5" is not a date.
 */
const DATE = String.raw`(?:\d{1,2}[./-]\d{1,2}[./-]|\d{2},\d{2},)(?:\d{4}|\d{2})`;
/** Todoist's "* " heading marker, which sits in front of everything else. */
const HEADING = /^\*\s+/;
/** Bold or italic wrapping the whole name, as in "* **24.07.26,6T mechine**". */
const EMPHASIS = /^(\*\*|__|\*|_)([\s\S]+)\1$/;
/** A leading date: "DD.MM.YY," — also written "DD.MM.YY." or with only a space after it. */
const CD_PREFIX = new RegExp(`^(${DATE})(?:\\s*[,.]\\s*|\\s+)`);
/** A trailing ", DD.MM.YY". The comma is what separates it from a date inside the sentence. */
const IDD_SUFFIX = new RegExp(`\\s*,\\s*(${DATE})\\s*$`);

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A title's markup taken off the front and back — the heading marker and any emphasis wrapping
 * the whole name — so the dates can be read, and put back exactly as they were when it is saved.
 */
function peel(content: string): { mark: string; fence: string; body: string } {
  const trimmed = content.trim();
  const mark = HEADING.exec(trimmed)?.[0] ?? '';
  const rest = trimmed.slice(mark.length);
  const wrapped = EMPHASIS.exec(rest);
  return { mark, fence: wrapped?.[1] ?? '', body: (wrapped?.[2] ?? rest).trim() };
}

export interface TitleDates {
  /** Creation date as written in the title, or null when the title carries none. */
  cd: string | null;
  /** The task title with both dates taken off. */
  title: string;
  /** Issue date as written in the title, or null when the title carries none. */
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

/**
 * The day a Todoist timestamp falls on, in the reader's own time zone, as DD.MM.YY. Used for the
 * creation stamp (a moment in time, unlike a due date, which is a calendar day). The same rule
 * serves both what is shown and what is written back, so a creation date can never shift.
 */
export function cdFromTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : formatCd(at);
}

/**
 * A date written in a title ("15.08.26", "18.8.26", "18.08.2026") as `YYYY-MM-DD`, or null when it
 * is not a real calendar day. Two-digit years mean 20xx.
 */
export function titleDateToKey(written: string | null | undefined): string | null {
  // The same separator has to be used twice, so "1.2-26" is not read as a date.
  const m = /^(\d{1,2})([./,-])(\d{1,2})\2(\d{4}|\d{2})$/.exec((written ?? '').trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[3]);
  const year = m[4].length === 2 ? 2000 + Number(m[4]) : Number(m[4]);
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Splits "15.08.26, Develop LMS Portal, 18.8.26" into its two dates and the title between them. */
export function parseTitle(content: string): TitleDates {
  // A heading marker and bold markers sit outside the dates; they stay part of the title.
  const { mark, fence, body } = peel(content);
  let rest = body;
  const front = CD_PREFIX.exec(rest);
  const cd = front && titleDateToKey(front[1]) ? front[1] : null;
  if (front && cd) rest = rest.slice(front[0].length);
  const back = IDD_SUFFIX.exec(rest);
  const idd = back && titleDateToKey(back[1]) ? back[1] : null;
  if (back && idd) rest = rest.slice(0, back.index);
  return { cd, title: `${mark}${fence}${rest.trim()}${fence}`, idd };
}

/** Puts a title back together with its dates, without ever doubling one that is already there. */
export function buildTitle({ cd, title, idd }: TitleDates): string {
  const { mark, fence, body } = peel(parseTitle(title).title);
  return `${mark}${fence}${cd ? `${cd}, ` : ''}${body}${idd ? `, ${idd}` : ''}${fence}`;
}

export const hasCd = (content: string) => parseTitle(content).cd !== null;
export const hasIdd = (content: string) => parseTitle(content).idd !== null;

/**
 * The title to send to Todoist for a task being created now. CD comes from the clock. IDD is
 * only what a person entered (`iddKey`, `YYYY-MM-DD`) — it is never worked out from the due date.
 * Routine work is left alone: a task that repeats has no single creation or issue date.
 */
export function titleForNewTask(title: string, now: Date, iddKey: string | null, routine = false): string {
  const typed = parseTitle(title);
  return buildTitle({
    // Someone typing their own dates keeps them; otherwise the clock supplies CD.
    cd: typed.cd ?? (routine ? null : formatCd(now)),
    title: typed.title,
    idd: typed.idd ?? (routine ? null : cdFromApiDate(iddKey)),
  });
}

/**
 * The title to send to Todoist for a task being saved. CD and IDD are locked:
 *  - a date already in the stored title always stays, exactly as written;
 *  - a missing CD is filled in once from when Todoist says the task was added;
 *  - a missing IDD is filled in once, only from a date a person entered (`iddKey`);
 *  - a date typed into the name box is dropped, never recorded.
 * The dashboard never guesses a date it did not see, and adds nothing to routine work.
 */
export function titleForSavedTask(
  stored: { content: string; addedAt: string | null; routine?: boolean },
  typedTitle: string,
  iddKey: string | null,
): string {
  const current = parseTitle(stored.content);
  const typed = parseTitle(typedTitle);
  return buildTitle({
    cd: current.cd ?? (stored.routine ? null : cdFromTimestamp(stored.addedAt)),
    title: typed.title,
    idd: current.idd ?? (stored.routine ? null : cdFromApiDate(iddKey)),
  });
}

/**
 * Safety net for every save: true only when no date that was stored in `before` has been changed
 * or removed in `after`. A save that fails this is refused, whatever the cause.
 */
export function lockedDatesIntact(before: string, after: string): boolean {
  const was = parseTitle(before);
  const now = parseTitle(after);
  return (was.cd === null || was.cd === now.cd) && (was.idd === null || was.idd === now.idd);
}
