import type { TodoistTask, WorkspaceSnapshot } from '../../types/todoist';
import type { DataSource } from './dataSource';
import { createDemoSnapshot } from './demoData';

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

/**
 * In-memory stand-in for Todoist, used for presentations. Changes last until the page reloads
 * and never touch a real account.
 */
export function createDemoSource(): DataSource {
  const state: WorkspaceSnapshot = createDemoSnapshot();
  let seq = 0;

  const find = (id: string): TodoistTask => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) throw new Error('Task not found. Sync to refresh.');
    return task;
  };

  /** A task plus all of its nested subtasks. */
  const withDescendants = (id: string): Set<string> => {
    const ids = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of state.tasks) {
        if (t.parent_id && ids.has(t.parent_id) && !ids.has(t.id)) {
          ids.add(t.id);
          grew = true;
        }
      }
    }
    return ids;
  };

  return {
    mode: 'demo',

    async sync(onStep, signal) {
      for (const step of ['projects', 'sections', 'tasks', 'completed'] as const) {
        onStep(step);
        await wait(180, signal);
      }
      return structuredClone({ ...state, syncedAt: new Date().toISOString() });
    },

    async createTask(input) {
      await wait(120);
      const projectId = input.project_id ?? state.user.inbox_project_id ?? state.projects[0].id;
      const task: TodoistTask = {
        id: `demo-new-${++seq}`,
        project_id: projectId,
        section_id: input.section_id ?? null,
        parent_id: input.parent_id ?? null,
        content: input.content,
        description: input.description ?? '',
        priority: input.priority ?? 1,
        due: input.due_date ? { date: input.due_date, string: '', is_recurring: false } : null,
        labels: input.labels ?? [],
        responsible_uid: null,
        note_count: 0,
        child_order: state.tasks.filter((t) => t.project_id === projectId).length + 1,
        checked: false,
        added_at: new Date().toISOString(),
        completed_at: null,
      };
      state.tasks.push(task);
      return structuredClone(task);
    },

    async updateTask(id, input) {
      await wait(120);
      const task = find(id);
      if (input.content !== undefined) task.content = input.content;
      if (input.description !== undefined) task.description = input.description;
      if (input.priority !== undefined) task.priority = input.priority;
      if (input.labels !== undefined) task.labels = input.labels;
      if (input.due_string === 'no date') task.due = null;
      if (input.due_date) task.due = { date: input.due_date, string: '', is_recurring: false };
      return structuredClone(task);
    },

    async moveTask(id, { project_id, section_id }) {
      await wait(120);
      for (const taskId of withDescendants(id)) {
        const task = find(taskId);
        task.project_id = project_id;
        task.section_id = section_id;
      }
      const task = find(id);
      task.parent_id = null;
      return structuredClone(task);
    },

    async completeTask(id) {
      await wait(120);
      const ids = withDescendants(id);
      const now = new Date().toISOString();
      for (const t of state.tasks.filter((t) => ids.has(t.id))) {
        state.completed.push({ ...t, checked: true, completed_at: now });
      }
      state.tasks = state.tasks.filter((t) => !ids.has(t.id));
    },

    async reopenTask(id) {
      await wait(120);
      const task = state.completed.find((t) => t.id === id);
      if (!task) return;
      state.completed = state.completed.filter((t) => t.id !== id);
      const parentOpen = task.parent_id && state.tasks.some((t) => t.id === task.parent_id);
      state.tasks.push({ ...task, checked: false, completed_at: null, parent_id: parentOpen ? task.parent_id : null });
    },

    async deleteTask(id) {
      await wait(120);
      const ids = withDescendants(id);
      state.tasks = state.tasks.filter((t) => !ids.has(t.id));
    },
  };
}
