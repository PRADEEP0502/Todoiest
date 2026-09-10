import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../store/TaskContext';
import { PriorityBadge } from '../common/PriorityBadge';
import { X, CheckCircle2, Calendar, Folder, Trash2, Flag } from 'lucide-react';
import type { TaskPriorityLevel } from '../../types/dashboard';

export const TaskDetailDrawer: React.FC = () => {
  const {
    selectedTaskId,
    selectedTask,
    closeTaskDetail,
    projects,
    handleUpdateTask,
    handleToggleComplete,
    handleDeleteTask,
  } = useTaskStore();

  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<TaskPriorityLevel>(1);
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      setContent(selectedTask.content);
      setDescription(selectedTask.description || '');
      setProjectId(selectedTask.project_id);
      setPriority(selectedTask.priority);
      setDueDate(selectedTask.due?.date || '');
    }
  }, [selectedTask]);

  if (!selectedTaskId || !selectedTask) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await handleUpdateTask(selectedTask.id, {
      content: content.trim(),
      description: description.trim(),
      project_id: projectId,
      priority,
      due_date: dueDate,
    });
    setIsSaving(false);
  };

  const isCompleted = selectedTask.is_completed;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={closeTaskDetail}
      />

      <div className="relative w-full max-w-md bg-white border-l border-slate-200 shadow-xl z-10 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {isCompleted ? 'Completed' : 'Active Task'}
            </span>
            <PriorityBadge priority={priority} size="xs" />
          </div>

          <button
            onClick={closeTaskDetail}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Task Name
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Notes & Details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add optional notes..."
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-slate-400" /> Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-slate-400" /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as TaskPriorityLevel)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value={4}>P1 · Urgent</option>
                <option value={3}>P2 · High</option>
                <option value={2}>P3 · Medium</option>
                <option value={1}>P4 · Normal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await handleToggleComplete(selectedTask.id);
                closeTaskDetail();
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isCompleted ? 'Reopen' : 'Complete'}</span>
            </button>

            <button
              onClick={async () => {
                if (window.confirm('Delete this task?')) {
                  await handleDeleteTask(selectedTask.id);
                  closeTaskDetail();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
