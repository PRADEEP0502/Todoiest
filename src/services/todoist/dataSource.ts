import type { CreateTaskInput, MoveTaskInput, TodoistTask, UpdateTaskInput, WorkspaceSnapshot } from '../../types/todoist';

export type DataMode = 'live' | 'demo';

export type SyncStep = 'projects' | 'sections' | 'tasks' | 'completed';

export const SYNC_STEP_LABEL: Record<SyncStep, string> = {
  projects: 'Fetching projects…',
  sections: 'Fetching sections…',
  tasks: 'Fetching tasks…',
  completed: 'Fetching completed tasks…',
};

/**
 * Everything the UI needs from a workspace backend. The live implementation talks to Todoist;
 * the demo implementation keeps sample data in memory. The UI never knows which one it has.
 */
export interface DataSource {
  readonly mode: DataMode;
  sync(onStep: (step: SyncStep) => void, signal?: AbortSignal): Promise<WorkspaceSnapshot>;
  createTask(input: CreateTaskInput): Promise<TodoistTask>;
  updateTask(id: string, input: UpdateTaskInput): Promise<TodoistTask>;
  moveTask(id: string, input: { project_id: string; section_id: string | null }): Promise<TodoistTask>;
  completeTask(id: string): Promise<void>;
  reopenTask(id: string): Promise<void>;
  deleteTask(id: string): Promise<void>;
}

/** Start of the completed-task window loaded on every sync: this month, or this week if it began last month. */
export function completedWindowStart(now: Date): Date {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // back to Monday
  return weekStart < monthStart ? weekStart : monthStart;
}

/** Converts the dashboard's "section or no section" choice into the single destination `/move` expects. */
export function toMoveInput(projectId: string, sectionId: string | null): MoveTaskInput {
  return sectionId ? { section_id: sectionId } : { project_id: projectId };
}
