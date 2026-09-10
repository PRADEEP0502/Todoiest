import React, { useState } from 'react';
import { useTaskStore } from '../store/TaskContext';
import { useTasks } from '../hooks/useTasks';
import { TaskItemRow } from '../components/tasks/TaskItemRow';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { Plus, CheckSquare } from 'lucide-react';
import { getISOFormattedDate } from '../utils/dateUtils';

export const MyTasksPage: React.FC = () => {
  const { openCreateModal, handleCreateTask } = useTaskStore();
  const { tasks, filters } = useTasks();

  const [quickTitle, setQuickTitle] = useState('');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setIsQuickSubmitting(true);
    await handleCreateTask({
      content: quickTitle.trim(),
      due_date: getISOFormattedDate(0),
    });
    setQuickTitle('');
    setIsQuickSubmitting(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-brand-400" />
            <span>My Tasks</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {tasks.length}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete list of active deliverables, assignments, and milestones across all projects.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => openCreateModal()}
        >
          Add Task
        </Button>
      </div>

      {/* Quick Add Bar */}
      <form onSubmit={handleQuickAdd} className="relative">
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="+ Quick add task (e.g. 'Review security audit by Friday')... Press Enter to save"
          className="w-full pl-4 pr-24 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={!quickTitle.trim() || isQuickSubmitting}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all"
        >
          {isQuickSubmitting ? 'Adding...' : 'Add'}
        </button>
      </form>

      {/* Filter and Search Toolbar */}
      <TaskFilters
        search={filters.search}
        setSearch={filters.setSearch}
        priority={filters.priority}
        setPriority={filters.setPriority}
        projectId={filters.projectId}
        setProjectId={filters.setProjectId}
        sortBy={filters.sortBy}
        setSortBy={filters.setSortBy}
        sortOrder={filters.sortOrder}
        setSortOrder={filters.setSortOrder}
      />

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks match your criteria"
          description="All tasks in this view are completed or no tasks match the selected filters."
          actionText="Create New Task"
          onAction={() => openCreateModal()}
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItemRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
};
