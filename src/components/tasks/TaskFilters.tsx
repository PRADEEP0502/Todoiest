import React from 'react';
import { useTaskStore } from '../../store/TaskContext';
import type { TaskPriorityLevel } from '../../types/dashboard';
import { Search, ArrowUpDown, X } from 'lucide-react';

interface TaskFiltersProps {
  search: string;
  setSearch: (s: string) => void;
  priority: TaskPriorityLevel | 'all';
  setPriority: (p: TaskPriorityLevel | 'all') => void;
  projectId?: string | null;
  setProjectId: (id: string | null) => void;
  sortBy: 'due_date' | 'priority' | 'created' | 'alphabetical';
  setSortBy: (s: 'due_date' | 'priority' | 'created' | 'alphabetical') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (o: 'asc' | 'desc') => void;
  showProjectFilter?: boolean;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  search,
  setSearch,
  priority,
  setPriority,
  projectId,
  setProjectId,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  showProjectFilter = true,
}) => {
  const { projects } = useTaskStore();

  const hasActiveFilters = search || priority !== 'all' || (projectId && projectId !== 'all');

  const clearFilters = () => {
    setSearch('');
    setPriority('all');
    setProjectId(null);
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter tasks by name, description, or label..."
          className="w-full pl-9 pr-8 py-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Controls Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Project Selector */}
        {showProjectFilter && (
          <select
            value={projectId || 'all'}
            onChange={(e) => setProjectId(e.target.value === 'all' ? null : e.target.value)}
            className="px-2.5 py-2 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-brand-500 cursor-pointer"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {/* Priority Filter */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setPriority('all')}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
              priority === 'all'
                ? 'bg-slate-800 text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setPriority(4)}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
              priority === 4
                ? 'bg-rose-500/20 text-rose-300 font-semibold'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            P1
          </button>
          <button
            onClick={() => setPriority(3)}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
              priority === 3
                ? 'bg-amber-500/20 text-amber-300 font-semibold'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            P2
          </button>
          <button
            onClick={() => setPriority(2)}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
              priority === 2
                ? 'bg-sky-500/20 text-sky-300 font-semibold'
                : 'text-slate-400 hover:text-sky-400'
            }`}
          >
            P3
          </button>
          <button
            onClick={() => setPriority(1)}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
              priority === 1
                ? 'bg-slate-700/40 text-slate-200 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            P4
          </button>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1">
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer pr-1"
          >
            <option value="due_date" className="bg-slate-900 text-slate-200">Due Date</option>
            <option value="priority" className="bg-slate-900 text-slate-200">Priority</option>
            <option value="created" className="bg-slate-900 text-slate-200">Created</option>
            <option value="alphabetical" className="bg-slate-900 text-slate-200">Name</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="text-[11px] text-slate-400 hover:text-slate-200 px-1 font-mono"
            title={`Sort order: ${sortOrder.toUpperCase()}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2 py-1"
            title="Clear filters"
          >
            <X className="w-3 h-3" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>
    </div>
  );
};
