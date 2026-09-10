import React, { useState } from 'react';
import type { EnrichedTask } from '../../types/dashboard';
import { useTaskStore } from '../../store/TaskContext';
import { PriorityBadge } from '../common/PriorityBadge';
import { Calendar, Check, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { formatDueDateDisplay } from '../../utils/dateUtils';

interface TaskItemRowProps {
  task: EnrichedTask;
  showProject?: boolean;
  onOpenDetail?: (taskId: string) => void;
  className?: string;
}

export const TaskItemRow: React.FC<TaskItemRowProps> = ({
  task,
  showProject = true,
  onOpenDetail,
  className = '',
}) => {
  const {
    handleToggleComplete,
    handleDeleteTask,
    openTaskDetail,
  } = useTaskStore();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckboxClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    await handleToggleComplete(task.id);
    setIsProcessing(false);
  };

  const handleRowClick = () => {
    if (onOpenDetail) {
      onOpenDetail(task.id);
    } else {
      openTaskDetail(task.id);
    }
  };

  const isCompleted = task.is_completed;
  const isOverdue = !isCompleted && task.isOverdue;

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-slate-50/90 border rounded-xl transition-all cursor-pointer select-none shadow-sm ${
        isCompleted
          ? 'opacity-60 bg-slate-50 border-slate-200'
          : isOverdue
          ? 'border-red-200 bg-red-50/30'
          : 'border-slate-200/90 hover:border-slate-300'
      } ${className}`}
    >
      {/* Left side: Checkbox + Content */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Simple Checkbox */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          disabled={isProcessing}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
            isCompleted
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : task.priority === 4
              ? 'border-red-400 hover:bg-red-50'
              : task.priority === 3
              ? 'border-orange-400 hover:bg-orange-50'
              : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/50'
          }`}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Task Title & Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium tracking-tight ${
                isCompleted
                  ? 'line-through text-slate-400'
                  : 'text-slate-900 group-hover:text-blue-700'
              }`}
            >
              {task.content}
            </span>
          </div>

          <div className="flex items-center gap-2.5 mt-0.5 text-xs text-slate-500">
            {showProject && task.project && (
              <span className="font-medium text-slate-600">
                {task.project.name}
              </span>
            )}

            {showProject && task.project && task.due?.date && <span>·</span>}

            {task.due?.date && (
              <span
                className={`flex items-center gap-1 font-medium ${
                  isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'
                }`}
              >
                {isOverdue && <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
                <span>{task.due.string || formatDueDateDisplay(task.due.date)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Priority + Action Icons */}
      <div className="flex items-center gap-2.5 shrink-0">
        <PriorityBadge priority={task.priority} shortText size="xs" />

        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => openTaskDetail(task.id)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
            title="Edit task"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleDeleteTask(task.id)}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
