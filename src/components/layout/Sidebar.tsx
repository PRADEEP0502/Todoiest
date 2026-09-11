import React from 'react';
import { useTaskStore } from '../../store/TaskContext';
import type { NavigationTab } from '../../types/dashboard';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  FolderKanban,
  CheckCircle2,
  Settings,
  CheckSquare2,
  Folder,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    metrics,
    projects,
    tasks,
    selectedProjectId,
    setSelectedProjectId,
    isDemoMode,
    toggleDemoMode,
  } = useTaskStore();

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'today',
      label: 'Today',
      icon: <Calendar className="w-4 h-4" />,
      badge: metrics.dueToday,
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <FolderKanban className="w-4 h-4" />,
      badge: projects.length,
    },
    {
      id: 'completed',
      label: 'Completed',
      icon: <CheckCircle2 className="w-4 h-4" />,
      badge: metrics.completed,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 select-none">
      {/* Product Branding */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-500/20 shrink-0">
          <CheckSquare2 className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
            TaskFlow
          </h1>
          <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
            Simple Task Management
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Tabs */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id && selectedProjectId === null;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedProjectId(null);
                  setCurrentTab(item.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-blue-200/60 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Todoist Projects in Sidebar */}
        <div className="space-y-1 pt-2 border-t border-slate-100">
          <div className="px-3 flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Todoist Projects
            </span>
            <button
              onClick={() => {
                setSelectedProjectId(null);
                setCurrentTab('projects');
              }}
              className="text-[10px] text-blue-600 hover:underline font-semibold"
            >
              All
            </button>
          </div>

          <div className="space-y-0.5">
            {projects.map((project) => {
              const isSelected = currentTab === 'projects' && selectedProjectId === project.id;
              const projectTaskCount = tasks.filter(
                (t) => !t.is_completed && t.project_id === project.id
              ).length;

              return (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setCurrentTab('projects');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate text-left">{project.name}</span>
                  </div>

                  {projectTaskCount > 0 && (
                    <span className="text-[10px] font-mono text-slate-400 pl-1">
                      {projectTaskCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Area: Settings & Mode */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        <button
          onClick={() => {
            setSelectedProjectId(null);
            setCurrentTab('settings');
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentTab === 'settings'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </button>

        {/* Clean Mode Pill */}
        <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] flex items-center justify-between">
          <span className="font-medium text-slate-600">Mode:</span>
          <button
            onClick={() => toggleDemoMode(!isDemoMode)}
            className={`font-semibold px-2 py-0.5 rounded text-[10px] transition-colors ${
              isDemoMode
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            }`}
            title="Click to toggle Demo Mode / Live Todoist"
          >
            {isDemoMode ? 'DEMO MODE' : 'LIVE TODOIST'}
          </button>
        </div>
      </div>
    </aside>
  );
};
