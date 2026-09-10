import React from 'react';
import { useTaskStore } from '../store/TaskContext';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import { isTaskToday } from '../utils/dateUtils';
import { CheckSquare, Calendar, AlertCircle, CheckCircle2, Plus } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    metrics,
    enrichedTasks,
    setCurrentTab,
    openCreateModal,
    searchQuery,
  } = useTaskStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning 👋';
    if (hour < 18) return 'Good Afternoon 👋';
    return 'Good Evening 👋';
  };

  // Filter today's tasks
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
    <div className="space-y-6 max-w-5xl">
      {/* Top Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {getGreeting()}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Here is a quick summary of your tasks for today.
        </p>
      </div>

      {/* 4 Summary Stat Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* TOTAL TASKS */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            {metrics.totalTasks}
          </p>
          <span className="text-[11px] text-slate-400">All workspace items</span>
        </div>

        {/* TODAY */}
        <div
          onClick={() => setCurrentTab('today')}
          className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-xl p-4 shadow-xs cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Today</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-2">
            {metrics.dueToday}
          </p>
          <span className="text-[11px] text-slate-400">Due today</span>
        </div>

        {/* OVERDUE */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-red-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-2">
            {metrics.overdue}
          </p>
          <span className="text-[11px] text-slate-400">Past target date</span>
        </div>

        {/* COMPLETED */}
        <div
          onClick={() => setCurrentTab('completed')}
          className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-xl p-4 shadow-xs cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-2">
            {metrics.completed}
          </p>
          <span className="text-[11px] text-slate-400">Finished tasks</span>
        </div>
      </div>

      {/* Today's Tasks Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Today's Tasks</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              {todayTasks.length}
            </span>
          </div>

          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>

        {todayTasks.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-500 shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 text-sm">All clear for today!</p>
            <p className="text-slate-500 mt-0.5">No pending tasks scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <TaskItemRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
