// Entity shapes returned by the Todoist API v1 (https://developer.todoist.com/api/v1/).
// Only the fields the dashboard uses are typed; the API returns more.

/** Todoist API priority: 4 = P1 (urgent) … 1 = P4 (normal). */
export type ApiPriority = 1 | 2 | 3 | 4;

export interface TodoistDue {
  /** `YYYY-MM-DD`, or `YYYY-MM-DDTHH:MM:SS[Z]` when the task has a time. */
  date: string;
  string?: string;
  lang?: string;
  is_recurring?: boolean;
  timezone?: string | null;
}

export interface TodoistUser {
  id: string;
  email: string;
  full_name: string;
  inbox_project_id?: string | null;
  avatar_medium?: string | null;
}

export interface TodoistWorkspace {
  id: string;
  name: string;
}

export interface TodoistProject {
  id: string;
  name: string;
  color: string;
  parent_id: string | null;
  child_order: number;
  is_archived?: boolean;
  is_deleted?: boolean;
  is_favorite?: boolean;
  is_shared?: boolean;
  inbox_project?: boolean;
  view_style?: string;
  /** Present only on projects that belong to a team workspace. */
  workspace_id?: string | null;
  folder_id?: string | null;
}

export interface TodoistSection {
  id: string;
  project_id: string;
  name: string;
  section_order: number;
  is_archived?: boolean;
  is_deleted?: boolean;
}

export interface TodoistTask {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  content: string;
  description: string;
  priority: ApiPriority;
  due: TodoistDue | null;
  labels: string[];
  responsible_uid: string | null;
  note_count: number;
  child_order: number;
  checked: boolean;
  is_deleted?: boolean;
  added_at: string | null;
  completed_at: string | null;
}

export interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number | null;
}

export interface TodoistCollaborator {
  id: string;
  name: string;
  email: string;
}

export interface Paginated<T> {
  results: T[];
  next_cursor: string | null;
}

export interface CreateTaskInput {
  content: string;
  description?: string;
  project_id?: string;
  section_id?: string | null;
  parent_id?: string | null;
  priority?: ApiPriority;
  /** `YYYY-MM-DD` */
  due_date?: string;
  labels?: string[];
}

export interface UpdateTaskInput {
  content?: string;
  description?: string;
  priority?: ApiPriority;
  /** `YYYY-MM-DD`. Use `due_string: "no date"` to clear. */
  due_date?: string;
  due_string?: string;
  labels?: string[];
}

export interface MoveTaskInput {
  project_id?: string;
  section_id?: string;
  parent_id?: string;
}

/** Everything the dashboard renders, fetched in one sync. */
export interface WorkspaceSnapshot {
  user: TodoistUser;
  workspaces: TodoistWorkspace[];
  projects: TodoistProject[];
  sections: TodoistSection[];
  tasks: TodoistTask[];
  /** Tasks completed since the start of the current month (or week, if earlier). */
  completed: TodoistTask[];
  labels: TodoistLabel[];
  /** Keyed by user id, merged across shared projects. */
  collaborators: Record<string, TodoistCollaborator>;
  syncedAt: string;
}
