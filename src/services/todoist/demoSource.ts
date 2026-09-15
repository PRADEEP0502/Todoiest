import type { ActivityEvent, TodoistTask, WorkspaceSnapshot } from '../../types/todoist';
import { withCommentCounts, type DataSource } from './dataSource';
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
 * and never touch a real account. Every change is written to the demo activity log, the same
 * way Todoist records it, so Activity Logs and Notifications react to what you do.
 */
export function createDemoSource(): DataSource {
  const state: WorkspaceSnapshot = createDemoSnapshot();
  let seq = 0;

  const find = (id: string): TodoistTask => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) throw new Error('Task not found. Sync to refresh.');
    return task;
  };

  const log = (task: Pick<TodoistTask, 'id' | 'project_id' | 'content'>, eventType: string, extra: Record<string, unknown> = {}) => {
    const event: ActivityEvent = {
      id: `demo-live-${++seq}`,
      object_type: 'item',
      object_id: task.id,
      event_type: eventType,
      event_date: new Date().toISOString(),
      parent_project_id: task.project_id,
      parent_item_id: null,
      initiator_id: state.user.id,
      extra_data: { content: task.content, ...extra },
    };
    state.activity.unshift(event);
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

    loadCached: async () => null,

    async sync(onStep, signal) {
      for (const step of ['workspace', 'completed', 'activity'] as const) {
        onStep(step);
        await wait(220, signal);
      }
      return structuredClone({ ...state, tasks: withCommentCounts(state.tasks, state.comments), syncedAt: new Date().toISOString() });
    },

    async createTask(input) {
      await wait(120);
      const projectId = input.project_id ?? state.user.inbox_project_id ?? state.projects[0].id;
      const now = new Date().toISOString();
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
        added_at: now,
        updated_at: now,
        completed_at: null,
      };
      state.tasks.push(task);
      log(task, 'added');
      return structuredClone(task);
    },

    async updateTask(id, input) {
      await wait(120);
      const task = find(id);
      const extra: Record<string, unknown> = {};
      if (input.content !== undefined && input.content !== task.content) {
        extra.last_content = task.content;
        task.content = input.content;
      }
      if (input.description !== undefined) task.description = input.description;
      if (input.priority !== undefined) task.priority = input.priority;
      if (input.labels !== undefined) task.labels = input.labels;
      if (input.due_string === 'no date' || input.due_date) {
        extra.last_due_date = task.due?.date ?? null;
        extra.due_date = input.due_date ?? null;
        task.due = input.due_date ? { date: input.due_date, string: '', is_recurring: false } : null;
      }
      task.updated_at = new Date().toISOString();
      log(task, 'updated', extra);
      return structuredClone(task);
    },

    async moveTask(id, { project_id, section_id }) {
      await wait(120);
      for (const taskId of withDescendants(id)) {
        const task = find(taskId);
        task.project_id = project_id;
        task.section_id = section_id;
        task.updated_at = new Date().toISOString();
      }
      const task = find(id);
      task.parent_id = null;
      return structuredClone(task);
    },

    async completeTask(id) {
      await wait(120);
      const ids = withDescendants(id);
      const now = new Date().toISOString();
      const root = find(id);
      for (const t of state.tasks.filter((t) => ids.has(t.id))) {
        state.completed.push({ ...t, checked: true, completed_at: now, completed_by_uid: state.user.id });
      }
      state.tasks = state.tasks.filter((t) => !ids.has(t.id));
      log(root, 'completed');
    },

    async reopenTask(id) {
      await wait(120);
      const task = state.completed.find((t) => t.id === id);
      if (!task) return;
      state.completed = state.completed.filter((t) => t.id !== id);
      const parentOpen = task.parent_id && state.tasks.some((t) => t.id === task.parent_id);
      state.tasks.push({ ...task, checked: false, completed_at: null, parent_id: parentOpen ? task.parent_id : null });
      log(task, 'uncompleted');
    },

    async deleteTask(id) {
      await wait(120);
      const root = find(id);
      const ids = withDescendants(id);
      state.tasks = state.tasks.filter((t) => !ids.has(t.id));
      state.comments = state.comments.filter((c) => !ids.has(c.task_id));
      log(root, 'deleted');
    },

    async addComment(taskId, content) {
      await wait(120);
      const task = find(taskId);
      const comment = { id: `demo-comment-new-${++seq}`, task_id: taskId, posted_uid: state.user.id, content, posted_at: new Date().toISOString() };
      state.comments.push(comment);
      state.activity.unshift({
        id: `demo-live-${++seq}`,
        object_type: 'note',
        object_id: comment.id,
        event_type: 'added',
        event_date: comment.posted_at,
        parent_project_id: task.project_id,
        parent_item_id: taskId,
        initiator_id: state.user.id,
        extra_data: { content, parent_item_content: task.content },
      });
      return structuredClone(comment);
    },
  };
}
