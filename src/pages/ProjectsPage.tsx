import React from 'react';
import { useTaskStore } from '../store/TaskContext';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import {
  FolderKanban,
  Folder,
  Layers,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  CheckCircle2,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const {
    projects,
    sections,
    tasks,
    enrichedTasks,
    selectedProjectId,
    setSelectedProjectId,
    openCreateModal,
    collapsedSections,
    toggleSectionCollapse,
    searchQuery,
  } = useTaskStore();

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  // Filter tasks matching search query
  const matchesSearch = (task: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      task.content.toLowerCase().includes(q) ||
      (task.project?.name || '').toLowerCase().includes(q) ||
      (task.section?.name || '').toLowerCase().includes(q)
    );
  };

  // If a project is selected, render the full project detail with dynamic sections
  if (activeProject) {
    const projectSections = sections.filter((s) => s.project_id === activeProject.id);
    const projectTasks = enrichedTasks.filter(
      (t) => !t.is_completed && t.project_id === activeProject.id && matchesSearch(t)
    );

    // Tasks without any section
    const generalTasks = projectTasks.filter((t) => !t.section_id);

    return (
      <div className="space-y-6 max-w-5xl">
        {/* Project Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedProjectId(null)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Back to All Projects"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {activeProject.name}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {projectSections.length} sections · {projectTasks.length} active tasks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreateModal({ projectId: activeProject.id })}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Dynamic Sections and Tasks Hierarchy */}
        {projectSections.length === 0 && generalTasks.length === 0 ? (
          <div className="p-10 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No tasks in this project</p>
            <p className="text-xs text-slate-500 mt-0.5">Add tasks or create sections in Todoist to populate.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dynamic Sections from Todoist */}
            {projectSections.map((section) => {
              const secTasks = projectTasks.filter((t) => t.section_id === section.id);
              const isCollapsed = !!collapsedSections[section.id];

              return (
                <div
                  key={section.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                >
                  {/* Section / Heading Title Bar (Collapsible) */}
                  <div
                    onClick={() => toggleSectionCollapse(section.id)}
                    className="flex items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-200/80 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-500">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </span>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        {section.name}
                      </h2>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 font-semibold">
                        {secTasks.length} {secTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateModal({ projectId: activeProject.id, sectionId: section.id });
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline px-2 py-1"
                      title={`Add task directly into ${section.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Section Tasks */}
                  {!isCollapsed && (
                    <div className="p-3 space-y-1.5">
                      {secTasks.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No tasks in this section.
                        </div>
                      ) : (
                        secTasks.map((task) => (
                          <TaskItemRow
                            key={task.id}
                            task={task}
                            showProject={false}
                            showSection={false}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* General Tasks (Without section) */}
            {generalTasks.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    General Tasks
                  </h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 font-semibold">
                    {generalTasks.length}
                  </span>
                </div>
                <div className="p-3 space-y-1.5">
                  {generalTasks.map((task) => (
                    <TaskItemRow
                      key={task.id}
                      task={task}
                      showProject={false}
                      showSection={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ALL PROJECTS VIEW
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-blue-600" />
            <span>Projects & Headings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Full dynamic Todoist hierarchy: Projects → Sections → Tasks.
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

      {/* Projects List with Expandable Sections preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((proj) => {
          const projSections = sections.filter((s) => s.project_id === proj.id);
          const projTasks = tasks.filter((t) => !t.is_completed && t.project_id === proj.id);

          return (
            <div
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              className="p-5 bg-white border border-slate-200 hover:border-blue-400 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Folder className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {proj.name}
                    </h2>
                  </div>

                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                    {projTasks.length} tasks
                  </span>
                </div>

                {/* Sections preview under project */}
                {projSections.length > 0 ? (
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Sections / Headings:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {projSections.map((sec) => {
                        const secTaskCount = tasks.filter(
                          (t) => !t.is_completed && t.section_id === sec.id
                        ).length;

                        return (
                          <span
                            key={sec.id}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium"
                          >
                            <Layers className="w-3 h-3 text-slate-400" />
                            <span>{sec.name}</span>
                            <span className="text-slate-400 font-mono text-[10px]">({secTaskCount})</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-3 italic">No sections created yet</p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Click to view and manage headings</span>
                <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                  Explore Project →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
