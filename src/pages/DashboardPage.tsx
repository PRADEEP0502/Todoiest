import React from 'react';
import { useTaskStore } from '../store/TaskContext';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import { isTaskToday } from '../utils/dateUtils';
import { CheckSquare, Calendar, AlertCircle, CheckCircle2, Plus, Folder, Layers, ChevronRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    metrics,
    projects,
    sections,
    tasks,
    enrichedTasks,
    setCurrentTab,
    setSelectedProjectId,
    openCreateModal,
    searchQuery,
  } = useTaskStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning, Pradeep 👋';
    if (hour < 18) return 'Good Afternoon, Pradeep 👋';
    return 'Good Evening, Pradeep 👋';
  };

  // Filter tasks matching search or today
  const filteredTodayTasks = enrichedTasks.filter((t) => {
    if (t.is_completed) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.content.toLowerCase().includes(q) ||
        (t.project?.name || '').toLowerCase().includes(q) ||
        (t.section?.name || '').toLowerCase().includes(q)
      );
    }
    return isTaskToday(t.due?.date);
  });

  // Group today's tasks by project
  const todayProjectsMap = new Map<string, { project: any; tasks: typeof filteredTodayTasks }>();
  filteredTodayTasks.forEach((t) => {
    const projId = t.project_id;
    if (!todayProjectsMap.has(projId)) {
      todayProjectsMap.set(projId, { project: t.project, tasks: [] });
    }
    todayProjectsMap.get(projId)!.tasks.push(t);
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {getGreeting()}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Here is your Todoist workspace status and execution agenda for today.
        </p>
      </div>

      {/* 4 Summary Stat Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* TOTAL TASKS */}
        <div
          onClick={() => setCurrentTab('projects')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            {metrics.totalTasks}
          </p>
          <span className="text-[11px] text-slate-400">{projects.length} active projects</span>
        </div>

        {/* TODAY */}
        <div
          onClick={() => setCurrentTab('today')}
          className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 shadow-2xs cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Today</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-2">
            {metrics.dueToday}
          </p>
          <span className="text-[11px] text-slate-400">Scheduled for today</span>
        </div>

        {/* OVERDUE */}
        <div
          onClick={() => setCurrentTab('today')}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs"
        >
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
          className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-4 shadow-2xs cursor-pointer transition-colors"
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

      {/* Today's Work Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Today's Work</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              {filteredTodayTasks.length}
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

        {filteredTodayTasks.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-500 shadow-2xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 text-sm">No pending tasks for today!</p>
            <p className="text-slate-500 mt-0.5">Your schedule for today is completely clear.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(todayProjectsMap.values()).map(({ project, tasks: pTasks }) => (
              <div key={project?.id || 'other'} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 px-1">
                  <Folder className="w-3.5 h-3.5 text-blue-600" />
                  <span>{project?.name || 'General Project'}</span>
                  <span className="text-[11px] font-mono text-slate-400 font-normal">
                    ({pTasks.length} task{pTasks.length === 1 ? '' : 's'})
                  </span>
                </div>

                <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
                  {pTasks.map((task) => (
                    <TaskItemRow key={task.id} task={task} showProject={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projects Overview Grid */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Todoist Projects & Headings</h2>
          </div>
          <button
            onClick={() => {
              setSelectedProjectId(null);
              setCurrentTab('projects');
            }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            View All Projects →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((proj) => {
            const projSections = sections.filter((s) => s.project_id === proj.id);
            const projTasks = tasks.filter((t) => !t.is_completed && t.project_id === proj.id);

            return (
              <div
                key={proj.id}
                onClick={() => {
                  setSelectedProjectId(proj.id);
                  setCurrentTab('projects');
                }}
                className="p-3.5 bg-white border border-slate-200 hover:border-blue-400 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {proj.name}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  {projSections.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500">
                      <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{projSections.length} sections:</span>
                      <span className="text-slate-700 font-medium truncate max-w-[170px]">
                        {projSections.map((s) => s.name).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    <strong className="text-slate-800 font-semibold">{projTasks.length}</strong> active tasks
                  </span>
                  <span className="text-blue-600 font-medium group-hover:underline">Open →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
