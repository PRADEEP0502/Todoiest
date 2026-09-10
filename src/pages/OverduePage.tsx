import React from 'react';
import { useTasks } from '../hooks/useTasks';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { EmptyState } from '../components/common/EmptyState';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { getDaysOverdue } from '../utils/dateUtils';

export const OverduePage: React.FC = () => {
  const { overdueTasks, filters } = useTasks();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-rose-300 flex items-center gap-2.5">
            <AlertCircle className="w-6 h-6 text-rose-400" />
            <span>Overdue Tasks</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {overdueTasks.length} requiring resolution
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tasks past their targeted due date requiring priority escalation or rescheduling.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <TaskFilters
        search={filters.search}
        setSearch={filters.setSearch}
        priority={filters.priority}
        setPriority={filters.setPriority}
        projectId={filters.projectId}
        setProjectId={filters.setProjectId}
        sortBy={filters.sortBy}
        setSortBy={filters.setSortBy}
        sortOrder={filters.sortOrder}
        setSortOrder={filters.setSortOrder}
      />

      {/* Overdue Items List */}
      {overdueTasks.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          title="All caught up!"
          description="Zero overdue tasks in this project view. All commitments are currently on track."
        />
      ) : (
        <div className="space-y-2">
          {overdueTasks.map((task) => {
            const days = getDaysOverdue(task.due?.date);
            return (
              <div key={task.id} className="relative">
                <TaskItemRow task={task} />
                {days > 0 && (
                  <div className="hidden md:flex absolute right-24 top-1/2 -translate-y-1/2 items-center gap-1 text-[11px] font-semibold text-rose-400 pointer-events-none pr-2">
                    <span>{days}d overdue</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
