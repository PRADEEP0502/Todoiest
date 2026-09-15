import { AlarmClock, ListTree, Rows3, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { BarList } from '../components/charts/BarList';
import { Gate } from '../components/common/Gate';
import { EmptyState, Notice, PageHeader, Panel, Tabs } from '../components/common/ui';
import { GroupedTasks } from '../components/tasks/GroupedTasks';
import { TaskTable } from '../components/tasks/TaskTable';
import { useNow } from '../hooks/useNow';
import { href, navigate } from '../hooks/useRoute';
import { toDateKey } from '../lib/dates';
import { CATEGORIES, categoryOf, daysOverdue, describeCategory, type CategoryId } from '../lib/metrics';
import { isOverdue } from '../lib/stats';
import { useWorkspace } from '../store/workspace';

type View = 'table' | 'grouped';

export function OverduePage({ category }: { category: string | null }) {
  const { settings } = useWorkspace();
  const now = useNow(60_000);
  const [view, setView] = useState<View>('table');

  return (
    <Gate>
      {({ snapshot, index }) => {
        const rules = settings.rules;
        const todayKey = toDateKey(now);
        const byDays = rules.categoryBasis === 'days-overdue';
        const overdue = snapshot.tasks
          .filter((t) => isOverdue(t, todayKey))
          .sort((a, b) => (daysOverdue(b, todayKey) ?? 0) - (daysOverdue(a, todayKey) ?? 0) || b.priority - a.priority);

        const catOf = new Map(overdue.map((t) => [t.id, categoryOf(t, rules, index, todayKey)]));
        const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, overdue.filter((t) => catOf.get(t.id) === c.id).length])) as Record<CategoryId, number>;
        const uncategorised = overdue.filter((t) => !catOf.get(t.id)).length;

        const active = (CATEGORIES.some((c) => c.id === category) ? category : category === 'none' ? 'none' : 'all') as CategoryId | 'none' | 'all';
        const tasks = active === 'all' ? overdue : overdue.filter((t) => (catOf.get(t.id) ?? 'none') === active);

        const tabs = [
          { value: 'all', label: 'All overdue', count: overdue.length },
          ...CATEGORIES.map((c) => ({ value: c.id, label: c.label, count: counts[c.id] })),
          ...(!byDays && uncategorised ? [{ value: 'none', label: 'No category', count: uncategorised }] : []),
        ];

        return (
          <>
            <PageHeader title="Overdue" subtitle={`${overdue.length} active task${overdue.length === 1 ? '' : 's'} past their Todoist due date`} />

            {overdue.length === 0 ? (
              <div className="panel">
                <EmptyState icon={<AlarmClock size={26} />} title="Nothing is overdue">Every active task with a due date is on time.</EmptyState>
              </div>
            ) : (
              <div className="space-y-4">
                <Panel title="Overdue by category" icon={<TriangleAlert />} iconTone="danger" subtitle={byDays ? 'Days past the due date' : `Categories from Todoist ${rules.categoryBasis === 'labels' ? 'labels' : 'section names'} (change in Settings)`}>
                  <BarList
                    label="Overdue tasks by category"
                    unit="overdue tasks"
                    total={overdue.length}
                    labelWidth="narrow"
                    entries={CATEGORIES.map((c) => ({ id: c.id, label: c.label, value: counts[c.id], href: href.overdue(c.id), detail: describeCategory(c.id, rules) }))}
                  />
                </Panel>

                {!byDays && uncategorised > 0 && (
                  <Notice>
                    {uncategorised} overdue task{uncategorised === 1 ? ' has' : 's have'} no matching {rules.categoryBasis === 'labels' ? 'label' : 'section'}, so {uncategorised === 1 ? 'it is' : 'they are'} listed under “No category” instead of being guessed.
                  </Notice>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Tabs label="Overdue category" value={active} options={tabs} onChange={(v) => navigate(href.overdue(v === 'all' ? null : v))} />
                  <Tabs
                    label="Layout"
                    value={view}
                    onChange={setView}
                    options={[
                      { value: 'table', label: 'Table' },
                      { value: 'grouped', label: 'Project → Section' },
                    ]}
                  />
                </div>
                {active !== 'all' && active !== 'none' && <p className="text-[12.5px] text-ink-3">{describeCategory(active, rules)}</p>}

                <div className="panel overflow-hidden">
                  {tasks.length === 0 ? (
                    <EmptyState title="No tasks in this category" />
                  ) : view === 'table' ? (
                    <TaskTable
                      tasks={tasks}
                      listKey={`overdue:${active}`}
                      extra={{ header: 'Late by', cell: (t) => `${daysOverdue(t, todayKey) ?? 0} d` }}
                    />
                  ) : (
                    <div className="px-3 py-2">
                      <GroupedTasks tasks={tasks} viewKey={`overdue:${active}`} defaultOpen={tasks.length <= 40} />
                    </div>
                  )}
                </div>
                <p className="flex items-center gap-1.5 text-2xs text-ink-3">
                  {view === 'table' ? <Rows3 size={12} /> : <ListTree size={12} />}
                  Click a task to view details, comment or complete it. Section links open the task inside its project.
                </p>
              </div>
            )}
          </>
        );
      }}
    </Gate>
  );
}
