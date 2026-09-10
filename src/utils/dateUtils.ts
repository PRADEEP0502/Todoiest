import { format, isToday, isTomorrow, parseISO, startOfDay, addDays, differenceInDays } from 'date-fns';

export function parseTaskDueDate(dueDateString?: string | null): Date | null {
  if (!dueDateString) return null;
  try {
    if (dueDateString.length === 10) {
      const [year, month, day] = dueDateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return parseISO(dueDateString);
  } catch {
    return null;
  }
}

export function isTaskOverdue(dueDateString?: string | null): boolean {
  if (!dueDateString) return false;
  const date = parseTaskDueDate(dueDateString);
  if (!date) return false;
  const todayStart = startOfDay(new Date());
  return startOfDay(date) < todayStart;
}

export function isTaskToday(dueDateString?: string | null): boolean {
  if (!dueDateString) return false;
  const date = parseTaskDueDate(dueDateString);
  if (!date) return false;
  return isToday(date);
}

export function isTaskTomorrow(dueDateString?: string | null): boolean {
  if (!dueDateString) return false;
  const date = parseTaskDueDate(dueDateString);
  if (!date) return false;
  return isTomorrow(date);
}

export function getDaysOverdue(dueDateString?: string | null): number {
  if (!dueDateString) return 0;
  const date = parseTaskDueDate(dueDateString);
  if (!date) return 0;
  const diff = differenceInDays(startOfDay(new Date()), startOfDay(date));
  return Math.max(0, diff);
}

export function formatDueDateDisplay(dueDateString?: string | null): string {
  if (!dueDateString) return 'No due date';
  const date = parseTaskDueDate(dueDateString);
  if (!date) return dueDateString;

  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isTaskOverdue(dueDateString)) {
    const days = getDaysOverdue(dueDateString);
    return `${days}d overdue (${format(date, 'MMM d')})`;
  }
  return format(date, 'MMM d, yyyy');
}

export function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 30) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return format(date, 'MMM d, h:mm a');
}

export function getISOFormattedDate(offsetDays: number = 0): string {
  const target = addDays(new Date(), offsetDays);
  return format(target, 'yyyy-MM-dd');
}
