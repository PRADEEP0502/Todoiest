import React from 'react';
import { useTaskStore } from '../store/TaskContext';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import { isTaskToday } from '../utils/dateUtils';
import { Calendar, Plus, CheckCircle2, Folder } from 'lucide-react';

export const TodayPage: React.FC = () => {
  const { enrichedTasks, openCreateModal, searchQuery, setSelectedProjectId } = useTaskStore();

  const todayTasks = enrichedTasks.filter((t) => {
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

  // Group tasks by project
  const projectGroups = React.useMemo(() => {
    const map = new Map<string, { project: any; tasks: typeof todayTasks }>();
    todayTasks.forEach((t) => {
      const projId = t.project_id;
      if (!map.has(projId)) {
        map.set(projId, { project: t.project, tasks: [] });
      }
      map.get(projId)!.tasks.push(t);
    });
    return Array.from(map.values());
  }, [todayTasks]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Today's Schedule</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Deliverables and executive tasks scheduled for today.
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
          <p className="text-sm font-semibold text-slate-800">No pending tasks for today</p>
          <p className="text-xs text-slate-500 mt-0.5">You're all caught up with today's scheduled items.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {projectGroups.map(({ project, tasks }) => (
            <div key={project?.id || 'unknown'} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                    {project?.name || 'Inbox'}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold">
                    {tasks.length}
                  </span>
                </div>
                {project?.id && (
                  <button
                    onClick={() => setSelectedProjectId(project.id)}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    View Project →
                  </button>
                )}
              </div>
              <div className="p-3 space-y-2">
                {tasks.map((task) => (
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

