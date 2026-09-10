import React from 'react';
import { useTaskStore } from '../../store/TaskContext';
import type { NavigationTab } from '../../types/dashboard';
import {
  LayoutDashboard,
  Calendar,
  AlertCircle,
  FolderKanban,
  BarChart3,
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { currentTab, setCurrentTab, metrics } = useTaskStore();

  const mainTabs: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'today', label: 'Today', icon: <Calendar className="w-5 h-5" />, badge: metrics.dueToday },
    { id: 'overdue', label: 'Overdue', icon: <AlertCircle className="w-5 h-5" />, badge: metrics.overdue },
    { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  return (
    <div className="md:hidden">
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 z-40 flex items-center justify-around px-2">
        {mainTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center relative py-1 px-3 rounded-lg transition-colors ${
                isActive ? 'text-brand-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
