import { Sun } from 'lucide-react';
import { Gate } from '../components/common/Gate';
import { Chevron, Count, EmptyState, PageHeader } from '../components/common/ui';
import { GroupedTasks } from '../components/tasks/GroupedTasks';
import { useDisclosure } from '../hooks/useDisclosure';
import { useNow } from '../hooks/useNow';
import { formatLongDate, toDateKey } from '../lib/dates';
import { byPriorityThenTime, isDueToday, isOverdue } from '../lib/stats';
import { useUi } from '../store/ui';

export function TodayPage() {
  const now = useNow(60_000);
  const { openNewTask } = useUi();
  // Overdue work is kept out of the main list and tucked into its own block, closed by default.
  const [overdueOpen, toggleOverdue] = useDisclosure('today:overdue', false);
  const overdueCollapsed = !overdueOpen;

  return (
    <Gate>
      {({ snapshot }) => {
        const todayKey = toDateKey(now);
        const today = snapshot.tasks.filter((t) => isDueToday(t, todayKey));
        const overdue = snapshot.tasks.filter((t) => isOverdue(t, todayKey));
        return (
          <>
            <PageHeader
              title="Today"
              subtitle={`${formatLongDate(now)} · ${today.length} task${today.length === 1 ? '' : 's'}`}
              actions={
                <button className="btn-secondary" onClick={() => openNewTask({ dueDate: todayKey })}>
                  Add for today
                </button>
              }
            />

            {overdue.length > 0 && (
              <div className="panel mb-4 px-3 py-2 sm:px-4">
                <button type="button" onClick={toggleOverdue} aria-expanded={!overdueCollapsed} className="flex w-full items-center gap-2 py-1 text-left">
                  <Chevron collapsed={overdueCollapsed} />
                  <span className="text-[14px] font-semibold text-p1">Overdue</span>
                  <Count>{overdue.length}</Count>
                  <span className="ml-auto text-2xs text-ink-3">{overdueCollapsed ? 'Show' : 'Hide'}</span>
                </button>
                {!overdueCollapsed && (
                  <div className="pt-1">
                    <GroupedTasks tasks={overdue} viewKey="today-overdue" compare={byPriorityThenTime} />
                  </div>
                )}
              </div>
            )}

            <div className="panel px-3 py-2 sm:px-4">
              {today.length === 0 ? (
                <EmptyState icon={<Sun size={26} />} title="No tasks due today">Tasks with today’s due date in Todoist will show up here.</EmptyState>
              ) : (
                <GroupedTasks tasks={today} viewKey="today" compare={byPriorityThenTime} hideDue />
              )}
            </div>
          </>
        );
      }}
    </Gate>
  );
}
