import { getTasks } from './tasks';
import { getProjects } from './projects';
import { getSections } from './sections';
import { getLabels } from './labels';
import type { TodoistTask, TodoistProject, TodoistSection, TodoistLabel } from '../../types/todoist';

export interface SyncResult {
  tasks: TodoistTask[];
  projects: TodoistProject[];
  sections: TodoistSection[];
  labels: TodoistLabel[];
  timestamp: Date;
}

export async function fetchFullTodoistSync(token?: string): Promise<SyncResult> {
  const [tasks, projects, sections, labels] = await Promise.all([
    getTasks(undefined, token),
    getProjects(token),
    getSections(undefined, token).catch(() => [] as TodoistSection[]),
    getLabels(token).catch(() => [] as TodoistLabel[]),
  ]);

  return {
    tasks,
    projects,
    sections,
    labels,
    timestamp: new Date(),
  };
}

export async function testTodoistConnection(token?: string): Promise<{
  ok: boolean;
  message: string;
  projectCount?: number;
  sectionCount?: number;
  taskCount?: number;
}> {
  try {
    const [projects, sections, tasks] = await Promise.all([
      getProjects(token),
      getSections(undefined, token).catch(() => [] as TodoistSection[]),
      getTasks(undefined, token).catch(() => [] as TodoistTask[]),
    ]);

    return {
      ok: true,
      message: `Connected successfully! Found ${projects.length} projects, ${sections.length} sections, and ${tasks.length} tasks in Todoist.`,
      projectCount: projects.length,
      sectionCount: sections.length,
      taskCount: tasks.length,
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error.message || 'Connection failed. Please verify your Todoist API token.',
    };
  }
}
