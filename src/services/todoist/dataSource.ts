import type {
  CreateProjectInput,
  CreateSectionInput,
  CreateTaskInput,
  MoveTaskInput,
  TodoistComment,
  TodoistProject,
  TodoistSection,
  TodoistTask,
  UpdateTaskInput,
  WorkspaceSnapshot,
} from '../../types/todoist';

export type DataMode = 'live' | 'demo';

export type SyncStep = 'workspace' | 'completed' | 'activity';

export const SYNC_STEP_LABEL: Record<SyncStep, string> = {
  workspace: 'Fetching projects, sections & tasks…',
  completed: 'Fetching completed tasks…',
  activity: 'Fetching activity log…',
};

/**
 * Everything the UI needs from a workspace backend. The live implementation talks to Todoist;
 * the demo implementation keeps sample data in memory. The UI never knows which one it has.
 */
export interface DataSource {
  readonly mode: DataMode;
  /** The last synced data saved on this device, for an instant first paint. */
  loadCached(): Promise<WorkspaceSnapshot | null>;
  sync(onStep: (step: SyncStep) => void, signal?: AbortSignal): Promise<WorkspaceSnapshot>;
  createTask(input: CreateTaskInput): Promise<TodoistTask>;
  updateTask(id: string, input: UpdateTaskInput): Promise<TodoistTask>;
  moveTask(id: string, input: { project_id: string; section_id: string | null }): Promise<TodoistTask>;
  completeTask(id: string): Promise<void>;
  reopenTask(id: string): Promise<void>;
  deleteTask(id: string): Promise<void>;
  addComment(taskId: string, content: string): Promise<TodoistComment>;
  /** Re-reads one task, e.g. a recurring task after completion moved it to its next date. */
  getTask(id: string): Promise<TodoistTask>;
  /**
   * Subscribes to live change notices, if the backend offers them. Returns a stop function,
   * or null when live updates are not available (then polling alone keeps things fresh).
   */
  watch?(handlers: { onChange: () => void; onStatus: (connected: boolean) => void }): (() => void) | null;
  createProject(input: CreateProjectInput): Promise<TodoistProject>;
  createSection(input: CreateSectionInput): Promise<TodoistSection>;
}

/** How far back the activity log is kept, so "7+ days" has something older to show. */
export const ACTIVITY_WINDOW_DAYS = 30;
/** The recent slice of that log: the "Last 7 days" tab, and what "7+ days" starts after. */
export const ACTIVITY_RECENT_DAYS = 7;

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

/** Todoist's Sync API does not send comment counts, so derive them from the loaded comments. */
export function withCommentCounts(tasks: TodoistTask[], comments: TodoistComment[]): TodoistTask[] {
  const counts = new Map<string, number>();
  for (const c of comments) counts.set(c.task_id, (counts.get(c.task_id) ?? 0) + 1);
  return tasks.map((t) => {
    const n = counts.get(t.id) ?? 0;
    return t.note_count === n ? t : { ...t, note_count: n };
  });
}
