import type { TodoistCollaborator, TodoistTask, WorkspaceSnapshot } from '../../types/todoist';
import { TodoistClient } from './client';
import { completedWindowStart, toMoveInput, type DataSource } from './dataSource';
import { getProjectCollaborators, getProjects, getSections, getUser, getWorkspaces } from './projects';
import {
  closeTask,
  createTask,
  deleteTask,
  getCompletedTasks,
  getLabels,
  getTasks,
  moveTask,
  reopenTask,
  updateTask,
} from './tasks';

/** Reads and writes the real Todoist account behind `token`. Todoist stays the source of truth. */
export function createLiveSource(token: string): DataSource {
  const client = new TodoistClient(token);

  return {
    mode: 'live',

    async sync(onStep, signal) {
      onStep('projects');
      const [user, workspaces, projects] = await Promise.all([
        getUser(client, signal),
        // Personal accounts without team workspaces may not have this endpoint available.
        getWorkspaces(client, signal).catch(() => []),
        getProjects(client, signal),
      ]);

      onStep('sections');
      const sections = await getSections(client, undefined, signal);

      onStep('tasks');
      const tasks = await getTasks(client, signal);

      onStep('completed');
      const now = new Date();
      const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const [completed, labels, collaborators] = await Promise.all([
        getCompletedTasks(client, completedWindowStart(now), until, signal).catch(() => [] as TodoistTask[]),
        getLabels(client, signal).catch(() => []),
        loadAssignees(client, tasks, signal),
      ]);

      // Completed tasks from archived/deleted projects have nowhere to show.
      const projectIds = new Set(projects.map((p) => p.id));

      const snapshot: WorkspaceSnapshot = {
        user,
        workspaces,
        projects,
        sections,
        tasks,
        completed: completed.filter((t) => projectIds.has(t.project_id)),
        labels,
        collaborators,
        syncedAt: new Date().toISOString(),
      };
      return snapshot;
    },

    createTask: (input) => createTask(client, input),
    updateTask: (id, input) => updateTask(client, id, input),
    moveTask: (id, { project_id, section_id }) => moveTask(client, id, toMoveInput(project_id, section_id)),
    completeTask: (id) => closeTask(client, id),
    reopenTask: (id) => reopenTask(client, id),
    deleteTask: (id) => deleteTask(client, id),
  };
}

/** Resolves assignee names, only for projects that actually have assigned tasks. */
async function loadAssignees(
  client: TodoistClient,
  tasks: TodoistTask[],
  signal?: AbortSignal,
): Promise<Record<string, TodoistCollaborator>> {
  const projectIds = [...new Set(tasks.filter((t) => t.responsible_uid).map((t) => t.project_id))];
  const lists = await Promise.all(
    projectIds.map((id) => getProjectCollaborators(client, id, signal).catch(() => [] as TodoistCollaborator[])),
  );
  const byId: Record<string, TodoistCollaborator> = {};
  for (const person of lists.flat()) byId[person.id] = person;
  return byId;
}

/** Verifies a token by loading the account it belongs to. */
export async function verifyToken(token: string): Promise<{ name: string; email: string }> {
  const user = await getUser(new TodoistClient(token));
  return { name: user.full_name, email: user.email };
}
