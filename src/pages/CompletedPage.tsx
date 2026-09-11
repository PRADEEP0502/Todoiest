import React, { useState, useMemo } from 'react';
import { useTaskStore } from '../store/TaskContext';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import { CheckCircle2 } from 'lucide-react';
import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';

type TimeFilter = 'all' | 'today' | 'this_week' | 'this_month';

export const CompletedPage: React.FC = () => {
  const { completedTasks, projects, sections, searchQuery } = useTaskStore();
  const [filter, setFilter] = useState<TimeFilter>('all');

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const sectionMap = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  const enrichedCompletedTasks = useMemo(() => {
    return completedTasks.map((t) => ({
      ...t,
      project: projectMap.get(t.project_id),
      section: t.section_id ? sectionMap.get(t.section_id) : undefined,
    }));
  }, [completedTasks, projectMap, sectionMap]);

  const filtered = useMemo(() => {
    return enrichedCompletedTasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContent = task.content.toLowerCase().includes(q);
        const matchesProject = (task.project?.name || '').toLowerCase().includes(q);
        const matchesSection = (task.section?.name || '').toLowerCase().includes(q);
        if (!matchesContent && !matchesProject && !matchesSection) return false;
      }

      if (filter === 'all') return true;

      const dateStr = task.completed_at || task.created_at;
      if (!dateStr) return true;

      try {
        const d = parseISO(dateStr);
        if (filter === 'today') return isToday(d);
        if (filter === 'this_week') return isThisWeek(d);
        if (filter === 'this_month') return isThisMonth(d);
      } catch {
        return true;
      }
      return true;
    });
  }, [enrichedCompletedTasks, filter, searchQuery]);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Completed Tasks</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            History of completed items.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as TimeFilter)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === item.id
                  ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="p-10 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
          <p className="text-sm font-semibold text-slate-800">No completed tasks</p>
          <p className="text-xs text-slate-500 mt-0.5">Completed tasks will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskItemRow key={task.id} task={task as any} />
          ))}
        </div>
      )}
    </div>
  );
};
