import React from 'react';
import { useTaskStore } from '../store/TaskContext';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import { FolderKanban, Folder, ChevronLeft, Plus, CheckCircle2 } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const {
    projects,
    tasks,
    enrichedTasks,
    selectedProjectId,
    setSelectedProjectId,
    openCreateModal,
  } = useTaskStore();

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  // Project task counts
  const projectStats = projects.map((p) => {
    const projTasks = tasks.filter((t) => !t.is_completed && t.project_id === p.id);
    return {
      ...p,
      taskCount: projTasks.length,
    };
  });

  const projectTasks = enrichedTasks.filter(
    (t) => !t.is_completed && t.project_id === selectedProjectId
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {activeProject ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSelectedProjectId(null)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                title="Back to All Projects"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {activeProject.name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {projectTasks.length} active tasks in this project
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-blue-600" />
                <span>Projects</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Organize and focus tasks by project.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => openCreateModal({ projectId: selectedProjectId || undefined })}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* VIEW: Single Project Tasks OR Project List */}
      {activeProject ? (
        <div className="space-y-2">
          {projectTasks.length === 0 ? (
            <div className="p-10 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">No active tasks</p>
              <p className="text-xs text-slate-500 mt-0.5">All tasks in this project are done.</p>
            </div>
          ) : (
            projectTasks.map((task) => (
              <TaskItemRow key={task.id} task={task} showProject={false} />
            ))
          )}
        </div>
      ) : (
        /* Clean Project List */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projectStats.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProjectId(p.id)}
              className="p-4 bg-white border border-slate-200/90 hover:border-blue-400 rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Folder className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {p.taskCount} task{p.taskCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                View →
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
