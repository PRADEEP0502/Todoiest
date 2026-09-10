import React from 'react';
import { useTaskStore } from '../../store/TaskContext';
import { formatRelativeTime } from '../../utils/dateUtils';
import { Search, RefreshCw, Plus, Check } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    syncState,
    syncNow,
    isDemoMode,
    apiToken,
    openCreateModal,
    setCurrentTab,
  } = useTaskStore();

  const isSyncing = syncState.status === 'syncing';
  const isConnected = !isDemoMode && !!apiToken && syncState.status !== 'error';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks..."
          className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Right Header Status, Sync & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Connection Status Pill */}
        {isDemoMode ? (
          <div
            onClick={() => setCurrentTab('settings')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-semibold cursor-pointer hover:bg-amber-100 transition-colors"
            title="Interactive Demo Mode active. Click to view Settings."
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="hidden sm:inline">DEMO MODE</span>
          </div>
        ) : isConnected ? (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Todoist Connected</span>
            </div>
            <span className="hidden md:inline text-[11px] text-slate-400">
              Synced {formatRelativeTime(syncState.lastSynced)}
            </span>
          </div>
        ) : (
          <button
            onClick={() => setCurrentTab('settings')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium hover:bg-red-100 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>⚠ Todoist Not Connected</span>
          </button>
        )}

        {/* Sync Button */}
        <button
          onClick={() => syncNow()}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          title="Synchronize tasks with Todoist"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          <span className="hidden sm:inline">
            {isSyncing ? 'Syncing...' : 'Sync'}
          </span>
        </button>

        {/* + Add Task Primary Button */}
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>
    </header>
  );
};
