import {
  AlarmClock,
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  CircleCheckBig,
  Clock,
  Hourglass,
  ListChecks,
  LockKeyhole,
  MessageSquare,
  Siren,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { MetricStrip } from '../common/ui';
import type { HolderView } from '../../hooks/useRoute';
import { toDateKey } from '../../lib/dates';
import type { WorkspaceIndex } from '../../lib/hierarchy';
import { CATEGORIES, categoryOf, isMissingDate, shortCategoryNote, type CategoryId, type MetricRules } from '../../lib/metrics';
import { isDueToday, isOverdue } from '../../lib/stats';
import type { TodoistTask } from '../../types/todoist';

/** What each card opens, and the heading of the list it opens. */
export const VIEW_TITLE: Record<HolderView, string> = {
  active: 'All active tasks',
  overdue: 'Overdue tasks',
  today: 'Due today',
  'no-due': 'Tasks with no due date',
  completed: 'Completed this month',
  comments: 'Comments written',
  'no-cd': 'Tasks without a Creation Date (CD)',
  'no-idd': 'Tasks without an Issue Date (IDD)',
  'no-dd': 'Tasks without a Due Date (DD)',
  a5: 'Overdue · A-5',
  a10: 'Overdue · A-10',
  a30: 'Overdue · A-30',
  a30plus: 'Overdue · A30+',
};

/** Icons escalate with lateness, as on the dashboard: a clock, a timer, an hourglass, then a siren. */
const CATEGORY_ICON: Record<CategoryId, ReactNode> = {
  a5: <Clock />,
  a10: <Timer />,
  a30: <Hourglass />,
  a30plus: <Siren />,
};

export type ScopeLists = Record<Exclude<HolderView, 'completed' | 'comments'>, TodoistTask[]>;

/**
 * The list behind every card, worked out from the tasks of one scope — a person, or a project.
 * Whatever the card shows is exactly what its list holds, because both come from here.
 */
export function scopeLists(tasks: TodoistTask[], index: WorkspaceIndex, rules: MetricRules, now: Date): ScopeLists {
  const todayKey = toDateKey(now);
  return {
    active: tasks,
    overdue: tasks.filter((t) => isOverdue(t, todayKey)),
    today: tasks.filter((t) => isDueToday(t, todayKey)),
    'no-due': tasks.filter((t) => isMissingDate('dd', t, index)),
    // Nothing written in Todoist: no CD or IDD in the title, no due date.
    'no-cd': tasks.filter((t) => isMissingDate('cd', t, index)),
    'no-idd': tasks.filter((t) => isMissingDate('idd', t, index)),
    'no-dd': tasks.filter((t) => isMissingDate('dd', t, index)),
    ...(Object.fromEntries(CATEGORIES.map((c) => [c.id, tasks.filter((t) => categoryOf(t, rules, index, todayKey) === c.id)])) as Record<CategoryId, TodoistTask[]>),
  };
}

export interface ScopeCard {
  href: string;
  selected: boolean;
}

/**
 * The KPI cards of one scope: totals, then the dates a task is missing, then how late the overdue
 * ones are. The holder page and the project page share this, so both read the same way.
 */
export function ScopeKpis({
  name,
  lists,
  completed,
  comments,
  rules,
  card,
  scopeNote,
}: {
  /** Used in the screen-reader label of each strip, e.g. "Meena R" or "LMS Portal". */
  name: string;
  lists: ScopeLists;
  completed: number;
  /** Comments written in this scope, or null when the scope has none to show. */
  comments: number | null;
  rules: MetricRules;
  card: (view: HolderView) => ScopeCard;
  /** Added to the "Overdue categories" heading, e.g. " in MD & PRADEEP". */
  scopeNote?: string;
}) {
  return (
    <>
      <MetricStrip
        label={`${name}: totals`}
        size="md"
        columns={comments === null ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'}
        items={[
          { label: 'Active Tasks', icon: <ListChecks />, value: lists.active.length, ...card('active') },
          { label: 'Completed', icon: <CircleCheckBig />, iconTone: 'good', value: completed, note: 'this month', ...card('completed') },
          { label: 'Overdue', icon: <AlarmClock />, value: lists.overdue.length, tone: 'danger', ...card('overdue') },
          { label: 'Due Today', icon: <CalendarCheck />, iconTone: 'info', value: lists.today.length, ...card('today') },
          { label: 'No Due Date', icon: <CalendarOff />, iconTone: 'warn', value: lists['no-due'].length, ...card('no-due') },
          ...(comments === null ? [] : [{ label: 'Comments', icon: <MessageSquare />, iconTone: 'info' as const, value: comments, note: 'written', ...card('comments') }]),
        ]}
      />

      {lists.active.length > 0 && (
        <MetricStrip
          label={`${name}: tasks missing CD, IDD or DD`}
          size="md"
          columns="grid-cols-1 sm:grid-cols-3"
          items={[
            { label: 'No CD', icon: <CalendarPlus />, iconTone: 'info', value: lists['no-cd'].length, note: 'no Creation Date', ...card('no-cd') },
            { label: 'No IDD', icon: <LockKeyhole />, iconTone: 'warn', value: lists['no-idd'].length, note: 'no Issue Date', ...card('no-idd') },
            { label: 'No DD', icon: <CalendarClock />, iconTone: 'good', value: lists['no-dd'].length, note: 'no Due Date', ...card('no-dd') },
          ]}
        />
      )}

      {lists.active.length > 0 && (
        <div>
          <h2 className="mb-2.5 flex items-center gap-2 text-[13.5px] font-semibold text-ink-2">
            <TriangleAlert size={15} className="text-ink-3" aria-hidden />
            Overdue categories
            <span className="font-normal text-ink-3">
              · {lists.overdue.length} late{scopeNote}
            </span>
          </h2>
          <MetricStrip
            label={`${name}: overdue categories`}
            size="md"
            columns="grid-cols-2 lg:grid-cols-4"
            items={CATEGORIES.map((c) => ({
              label: c.label,
              icon: CATEGORY_ICON[c.id],
              value: lists[c.id].length,
              note: shortCategoryNote(c.id, rules),
              tone: 'danger' as const,
              ...card(c.id),
            }))}
          />
        </div>
      )}
    </>
  );
}
