import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../store/TaskContext';
import { getISOFormattedDate } from '../../utils/dateUtils';
import { X, Plus, Calendar, Flag, Folder, Layers } from 'lucide-react';
import type { TaskPriorityLevel } from '../../types/dashboard';

export const TaskCreateModal: React.FC = () => {
  const {
    isCreateModalOpen,
    closeCreateModal,
    createModalDefaults,
    projects,
    sections,
    handleCreateTask,
  } = useTaskStore();

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [priority, setPriority] = useState<TaskPriorityLevel>(1);
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available sections for the currently selected project
  const projectSections = sections.filter((s) => s.project_id === projectId);

  useEffect(() => {
    if (isCreateModalOpen) {
      setTitle('');
      setError(null);
      const initialProjId = createModalDefaults.projectId || projects[0]?.id || '';
      setProjectId(initialProjId);
      setSectionId(createModalDefaults.sectionId || '');
      setPriority(createModalDefaults.priority || 1);
      setDueDate(createModalDefaults.dueDate || getISOFormattedDate(0));
    }
  }, [isCreateModalOpen, createModalDefaults, projects]);

  // When project changes, update section if previous section belongs to another project
  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    const validSection = sections.find((s) => s.project_id === newProjId && s.id === sectionId);
    if (!validSection) {
      setSectionId('');
    }
  };

  if (!isCreateModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const success = await handleCreateTask({
      content: title.trim(),
      project_id: projectId || undefined,
      section_id: sectionId || undefined,
      priority,
      due_date: dueDate || undefined,
    });

    setIsSubmitting(false);
    if (success) {
      closeCreateModal();
    } else {
      setError('Failed to create task. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Add New Task</h2>
          <button
            onClick={closeCreateModal}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Task Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Project & Section Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-slate-400" /> Project
              </label>
              <select
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Section / Heading
              </label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">(No Section / General)</option>
                {projectSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority & Due Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-slate-400" /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as TaskPriorityLevel)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value={4}>P1 · Urgent (Red)</option>
                <option value={3}>P2 · High (Orange)</option>
                <option value={2}>P3 · Medium (Blue)</option>
                <option value={1}>P4 · Normal (Slate)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeCreateModal}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
