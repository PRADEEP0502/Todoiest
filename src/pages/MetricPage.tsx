import { ArrowLeft, Settings } from 'lucide-react';
import { useState } from 'react';
import { Gate } from '../components/common/Gate';
import { EmptyState, Notice, PageHeader, Tabs } from '../components/common/ui';
import { GroupedTasks } from '../components/tasks/GroupedTasks';
import { TaskTable } from '../components/tasks/TaskTable';
import { useNow } from '../hooks/useNow';
import { href } from '../hooks/useRoute';
import { toDateKey } from '../lib/dates';
import {
  CATEGORIES,
  DATE_CHECKS,
  daysOverdue,
  describeCategory,
  describeDateCheck,
  isDateCheckConfigured,
  metricTasks,
  type MetricId,
} from '../lib/metrics';
import { byPriorityThenTime } from '../lib/stats';
import { useWorkspace } from '../store/workspace';

const TITLES: Record<string, string> = {
  active: 'Total Active Tasks',
  'no-due': 'No Due Date',
  ...Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])),
  ...Object.fromEntries(DATE_CHECKS.map((c) => [c.id, c.label])),
};

/** The task list behind a dashboard metric card, as Project → Section → Task. */
export function MetricPage({ metric }: { metric: string }) {
  const { settings } = useWorkspace();
  const now = useNow(60_000);
  const [view, setView] = useState<'grouped' | 'table'>('grouped');

  if (!(metric in TITLES)) {
    return <EmptyState title="Unknown metric"><a className="text-accent hover:underline" href={href.dashboard()}>Back to dashboard</a></EmptyState>;
  }
  const id = metric as MetricId;
  const rules = settings.rules;
  const isCheck = id === 'noCd' || id === 'noIdd';
  const isCategory = CATEGORIES.some((c) => c.id === id);
  const description =
    id === 'active' ? 'Every open task in Todoist, subtasks included.' : id === 'no-due' ? 'Active tasks that have no due date in Todoist.' : isCheck ? describeDateCheck(rules[id]) : describeCategory(id as (typeof CATEGORIES)[number]['id'], rules);

  return (
    <Gate>
      {({ snapshot, index }) => {
        const tasks = [...metricTasks(id, snapshot, index, rules, now)].sort(byPriorityThenTime);
        const todayKey = toDateKey(now);
        return (
          <>
            <a href={href.dashboard()} className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-ink">
              <ArrowLeft size={13} /> Dashboard
            </a>
            <PageHeader
              title={`${TITLES[id]} · ${tasks.length}`}
              subtitle={description}
              actions={<Tabs label="Layout" value={view} onChange={setView} options={[{ value: 'grouped', label: 'Project → Section' }, { value: 'table', label: 'Table' }]} />}
            />

            {isCheck && !isDateCheckConfigured(rules[id as 'noCd' | 'noIdd']) ? (
              <div className="panel">
                <EmptyState icon={<Settings size={24} />} title={`${TITLES[id]} is not set up yet`}>
                  The dashboard does not guess what “{TITLES[id]}” means. Choose how it is recorded in Todoist (a label, a section, a missing deadline…) in{' '}
                  <a className="text-accent hover:underline" href={href.settings()}>Settings</a>.
                </EmptyState>
              </div>
            ) : (
              <>
                {id === 'active' && tasks.length > 40 && view === 'grouped' && (
                  <div className="mb-3">
                    <Notice>Projects start collapsed so large lists stay fast. Open a project to see its sections and tasks.</Notice>
                  </div>
                )}
                <div className="panel overflow-hidden">
                  {tasks.length === 0 ? (
                    <EmptyState title="No tasks" />
                  ) : view === 'grouped' ? (
                    <div className="px-3 py-2">
                      <GroupedTasks tasks={tasks} viewKey={`metric:${id}`} compare={byPriorityThenTime} defaultOpen={tasks.length <= 40} />
                    </div>
                  ) : (
                    <TaskTable tasks={tasks} listKey={`metric:${id}`} extra={isCategory && rules.categoryBasis === 'days-overdue' ? { header: 'Late by', cell: (t) => `${daysOverdue(t, todayKey) ?? 0} d` } : undefined} />
                  )}
                </div>
              </>
            )}
          </>
        );
      }}
    </Gate>
  );
}
