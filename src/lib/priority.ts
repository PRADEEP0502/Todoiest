import type { ApiPriority } from '../types/todoist';

/** What people see: P1 is most urgent. Todoist's API stores P1 as 4. */
export type UiPriority = 1 | 2 | 3 | 4;

export const toUiPriority = (api: ApiPriority): UiPriority => (5 - api) as UiPriority;
export const toApiPriority = (ui: UiPriority): ApiPriority => (5 - ui) as ApiPriority;

export const PRIORITY_STYLE: Record<UiPriority, { label: string; text: string; ring: string; fill: string }> = {
  1: { label: 'P1', text: 'text-p1', ring: 'border-p1', fill: 'bg-p1/10' },
  2: { label: 'P2', text: 'text-p2', ring: 'border-p2', fill: 'bg-p2/10' },
  3: { label: 'P3', text: 'text-p3', ring: 'border-p3', fill: 'bg-p3/10' },
  4: { label: 'P4', text: 'text-ink-3', ring: 'border-line-strong', fill: 'bg-transparent' },
};

/** Todoist's named project colors. */
export const PROJECT_COLORS: Record<string, string> = {
  berry_red: '#b8255f',
  red: '#dc4c3e',
  orange: '#c77100',
  yellow: '#b29104',
  olive_green: '#949c31',
  lime_green: '#65a33a',
  green: '#369307',
  mint_green: '#42a393',
  teal: '#148fad',
  sky_blue: '#319dc0',
  light_blue: '#6988a4',
  blue: '#4180ff',
  grape: '#692ec2',
  violet: '#ca3fee',
  lavender: '#a4698c',
  magenta: '#e05095',
  salmon: '#c9766f',
  charcoal: '#808080',
  grey: '#999999',
  taupe: '#8f7a69',
};

export const projectColor = (name: string | undefined) => PROJECT_COLORS[name ?? ''] ?? '#999999';
