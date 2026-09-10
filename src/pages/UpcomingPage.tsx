import React from 'react';
import { useTaskStore } from '../store/TaskContext';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import { isTaskToday, isTaskTomorrow, parseTaskDueDate } from '../utils/dateUtils';
import { format, isThisWeek, isFuture } from 'date-fns';
import { Clock, Plus, CheckCircle2 } from 'lucide-react';
import type { EnrichedTask } from '../types/dashboard';

export const UpcomingPage: React.FC = () => {
  const { enrichedTasks, openCreateModal, searchQuery } = useTaskStore();

  const activeTasks = enrichedTasks.filter((t) => {
    if (t.is_completed) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.content.toLowerCase().includes(q) ||
        (t.project?.name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group tasks
  const tomorrowTasks: EnrichedTask[] = [];
  const thisWeekTasks: EnrichedTask[] = [];
  const laterTasks: EnrichedTask[] = [];

  activeTasks.forEach((t) => {
    if (!t.due?.date) {
      laterTasks.push(t);
      return;
    }
    if (isTaskToday(t.due.date)) {
      // today tasks can be checked in today view
      return;
    }
    if (isTaskTomorrow(t.due.date)) {
      tomorrowTasks.push(t);
      return;
    }
    const d = parseTaskDueDate(t.due.date);
    if (d && isThisWeek(d)) {
      thisWeekTasks.push(t);
    } else {
      laterTasks.push(t);
    }
  });

  const sections = [
    { title: 'Tomorrow', tasks: tomorrowTasks },
    { title: 'This Week', tasks: thisWeekTasks },
    { title: 'Later & Future', tasks: laterTasks },
  ].filter((s) => s.tasks.length > 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Upcoming</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tasks scheduled for upcoming days.
          </p>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="p-10 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No upcoming tasks</p>
          <p className="text-xs text-slate-500 mt-0.5">Plan ahead by adding upcoming deliverables.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((sec) => (
            <div key={sec.title} className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <h2 className="text-sm font-bold text-slate-800">{sec.title}</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  {sec.tasks.length}
                </span>
              </div>

              <div className="space-y-2">
                {sec.tasks.map((task) => (
                  <TaskItemRow key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
