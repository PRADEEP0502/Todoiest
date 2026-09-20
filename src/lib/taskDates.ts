import type { TodoistTask } from '../types/todoist';
import { cdFromTimestamp, parseTitle, titleDateToKey } from './cd';
import { dueDateKey, dueTime, formatTime } from './dates';

/**
 * The three dates a task shows, and which of them can change:
 *
 *   CD  — Creation Date   LOCKED     filled in once, when the task is created
 *   IDD — Issue Date      LOCKED     entered by a person once; never editable after that
 *   DD  — Due Date        EDITABLE   Todoist's own due date, changed whenever it is rescheduled
 *
 * CD and IDD live in the task title in Todoist ("15.08.26, Task name, 18.8.26"), so they survive
 * every sync and every edit made here; DD is the task's real due date.
 */
export interface TaskDates {
  /** The task name with the two dates taken off. */
  title: string;
  /** Creation date as DD-MM-YYYY, or null when it cannot be known. */
  cd: string | null;
  /** The same day as `YYYY-MM-DD`, for calculations. */
  cdKey: string | null;
  /** Time of day the task was created, when Todoist says so and it belongs to `cd`. */
  cdTime: string | null;
  /** Where `cd` came from: written in the title, or read from Todoist's own creation stamp. */
  cdFrom: 'title' | 'todoist' | null;
  /** Issue date as DD-MM-YYYY, or null while none has been entered. */
  idd: string | null;
  iddKey: string | null;
  /** Current due date as DD-MM-YYYY, or null when the task has none. */
  dd: string | null;
  ddKey: string | null;
  /** Time of day of the due date, if it has one. */
  ddTime: string | null;
}

/** "2026-09-25" → "25-09-2026". */
export function longFromDateKey(key: string | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** A date written in a title ("16.09.26", "8.9.26") as DD-MM-YYYY, or null if it is not a real day. */
export function longFromTitleDate(written: string | null): string | null {
  return longFromDateKey(titleDateToKey(written));
}

export function taskDates(task: Pick<TodoistTask, 'content' | 'added_at' | 'due'>): TaskDates {
  const parsed = parseTitle(task.content);
  const titleKey = titleDateToKey(parsed.cd);
  // A task made straight in Todoist has no CD in its title yet; its own creation stamp stands in.
  const stampKey = titleDateToKey(cdFromTimestamp(task.added_at));
  const cdKey = titleKey ?? stampKey;
  const created = task.added_at ? new Date(task.added_at) : null;
  const iddKey = titleDateToKey(parsed.idd);
  const ddKey = dueDateKey(task.due);

  return {
    title: parsed.title,
    cd: longFromDateKey(cdKey),
    cdKey,
    cdTime: created && cdKey === stampKey ? formatTime(created) : null,
    cdFrom: titleKey ? 'title' : stampKey ? 'todoist' : null,
    idd: longFromDateKey(iddKey),
    iddKey,
    dd: longFromDateKey(ddKey),
    ddKey,
    ddTime: dueTime(task.due),
  };
}
