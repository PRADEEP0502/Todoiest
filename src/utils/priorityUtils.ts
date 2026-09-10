import type { TaskPriorityLevel } from '../types/dashboard';

export interface PriorityMeta {
  level: TaskPriorityLevel;
  displayLabel: string;
  shortLabel: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
}

export const PRIORITY_MAP: Record<TaskPriorityLevel, PriorityMeta> = {
  4: {
    level: 4,
    displayLabel: 'P1 · Urgent',
    shortLabel: 'P1',
    badgeBg: 'bg-red-50',
    badgeBorder: 'border-red-200',
    badgeText: 'text-red-700',
    dotColor: 'bg-red-500',
  },
  3: {
    level: 3,
    displayLabel: 'P2 · High',
    shortLabel: 'P2',
    badgeBg: 'bg-orange-50',
    badgeBorder: 'border-orange-200',
    badgeText: 'text-orange-700',
    dotColor: 'bg-orange-500',
  },
  2: {
    level: 2,
    displayLabel: 'P3 · Medium',
    shortLabel: 'P3',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    badgeText: 'text-blue-700',
    dotColor: 'bg-blue-500',
  },
  1: {
    level: 1,
    displayLabel: 'P4 · Normal',
    shortLabel: 'P4',
    badgeBg: 'bg-slate-100',
    badgeBorder: 'border-slate-200',
    badgeText: 'text-slate-600',
    dotColor: 'bg-slate-400',
  },
};

export function getPriorityMeta(priority?: number | null): PriorityMeta {
  if (priority === 4 || priority === 3 || priority === 2 || priority === 1) {
    return PRIORITY_MAP[priority];
  }
  return PRIORITY_MAP[1];
}
