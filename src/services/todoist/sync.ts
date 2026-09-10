import { getTasks } from './tasks';
import { getProjects } from './projects';
import { getLabels } from './labels';
import type { TodoistTask, TodoistProject, TodoistLabel } from '../../types/todoist';

export interface SyncResult {
  tasks: TodoistTask[];
  projects: TodoistProject[];
  labels: TodoistLabel[];
  timestamp: Date;
}

export async function fetchFullTodoistSync(token?: string): Promise<SyncResult> {
  const [tasks, projects, labels] = await Promise.all([
    getTasks(undefined, token),
    getProjects(token),
    getLabels(token).catch(() => [] as TodoistLabel[]),
  ]);

  return {
    tasks,
    projects,
    labels,
    timestamp: new Date(),
  };
}

export async function testTodoistConnection(token?: string): Promise<{ ok: boolean; message: string; projectCount?: number }> {
  try {
    const projects = await getProjects(token);
    return {
      ok: true,
      message: `Successfully connected. Found ${projects.length} projects in your Todoist account.`,
      projectCount: projects.length,
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error.message || 'Connection failed. Please check your API token.',
    };
  }
}
