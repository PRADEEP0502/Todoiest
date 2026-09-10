import React from 'react';
import { useTaskStore } from '../store/TaskContext';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import { isTaskToday } from '../utils/dateUtils';
import { Calendar, Plus, CheckCircle2 } from 'lucide-react';

export const TodayPage: React.FC = () => {
  const { enrichedTasks, openCreateModal, searchQuery } = useTaskStore();

  const todayTasks = enrichedTasks.filter((t) => {
    if (t.is_completed) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.content.toLowerCase().includes(q) ||
        (t.project?.name || '').toLowerCase().includes(q)
      );
    }
    return isTaskToday(t.due?.date);
  });

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Today</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tasks scheduled for completion today.
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

      {/* Task List */}
      {todayTasks.length === 0 ? (
        <div className="p-10 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No tasks for today</p>
          <p className="text-xs text-slate-500 mt-0.5">You're all done with today's scheduled items.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todayTasks.map((task) => (
            <TaskItemRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
};
