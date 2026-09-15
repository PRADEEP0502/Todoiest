import type { TodoistDue } from '../types/todoist';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as `YYYY-MM-DD`. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -((d.getDay() + 6) % 7));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Whole calendar days from `from` to `to` (DST-safe). */
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((parseDateKey(toKey).getTime() - parseDateKey(fromKey).getTime()) / DAY_MS);
}

/**
 * The local calendar date a due date falls on. Floating dates (`2026-09-14`, `2026-09-14T10:00:00`)
 * are already local; fixed-timezone datetimes end in `Z` and are converted.
 */
export function dueDateKey(due: TodoistDue | null | undefined): string | null {
  if (!due?.date) return null;
  if (/Z$|[+-]\d\d:\d\d$/.test(due.date)) return toDateKey(new Date(due.date));
  return due.date.slice(0, 10);
}

export function dueTime(due: TodoistDue | null | undefined): string | null {
  if (!due?.date || due.date.length <= 10) return null;
  const d = /Z$|[+-]\d\d:\d\d$/.test(due.date) ? new Date(due.date) : null;
  const [h, m] = d ? [d.getHours(), d.getMinutes()] : due.date.slice(11, 16).split(':').map(Number);
  return `${pad(h)}:${pad(m)}`;
}

export function formatShortDate(d: Date, now: Date): string {
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'later';

export function describeDue(due: TodoistDue | null | undefined, now: Date): { label: string; tone: DueTone } | null {
  const key = dueDateKey(due);
  if (!key) return null;
  const diff = daysBetween(toDateKey(now), key);
  const date = parseDateKey(key);
  let label: string;
  if (diff === 0) label = 'Today';
  else if (diff === 1) label = 'Tomorrow';
  else if (diff === -1) label = 'Yesterday';
  else if (diff > 1 && diff < 7) label = WEEKDAYS[date.getDay()];
  else label = formatShortDate(date, now);

  const time = dueTime(due);
  if (time) label += ` ${time}`;
  if (due?.is_recurring) label += ' ↻';

  const tone: DueTone = diff < 0 ? 'overdue' : diff === 0 ? 'today' : diff < 7 ? 'soon' : 'later';
  return { label, tone };
}

export interface DateBucket {
  id: string;
  label: string;
  sublabel?: string;
}

/** Groups a future due date into Today / Tomorrow / weekday / Next week / month. */
export function upcomingBucket(key: string, now: Date): DateBucket {
  const todayKey = toDateKey(now);
  const diff = daysBetween(todayKey, key);
  const date = parseDateKey(key);
  if (diff <= 0) return { id: 'today', label: 'Today', sublabel: formatShortDate(now, now) };
  if (diff === 1) return { id: 'tomorrow', label: 'Tomorrow', sublabel: formatShortDate(date, now) };
  if (diff < 7) return { id: key, label: WEEKDAYS[date.getDay()], sublabel: formatShortDate(date, now) };

  const nextWeekStart = addDays(startOfWeek(now), 7);
  const nextWeekEnd = addDays(nextWeekStart, 7);
  if (date < nextWeekEnd) {
    return {
      id: 'next-week',
      label: 'Next week',
      sublabel: `${formatShortDate(nextWeekStart, now)} – ${formatShortDate(addDays(nextWeekEnd, -1), now)}`,
    };
  }
  const monthId = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  const label = date.getFullYear() === now.getFullYear() ? MONTHS_LONG[date.getMonth()] : `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
  return { id: monthId, label };
}

export function formatDayHeading(d: Date, now: Date): string {
  const diff = daysBetween(toDateKey(now), toDateKey(d));
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  return `${WEEKDAYS[d.getDay()]}, ${formatShortDate(d, now)}`;
}

export function formatTime(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatRelative(iso: string | null, now: Date): string {
  if (!iso) return 'Never';
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return formatShortDate(new Date(iso), now);
}

/** "Today", "Yesterday", "3 days ago", "5 weeks ago" — for last-activity labels. */
export function formatDaysAgo(timestamp: number, now: Date): string {
  if (!timestamp) return '—';
  const days = daysBetween(toDateKey(new Date(timestamp)), toDateKey(now));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

export function greeting(now: Date): string {
  const h = now.getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}

export function formatLongDate(now: Date): string {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS_LONG[now.getMonth()]} ${now.getFullYear()}`;
}
