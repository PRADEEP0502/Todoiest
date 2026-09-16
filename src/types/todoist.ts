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
  /** Personal WebSocket URL Todoist uses to push "something changed" notices. Contains the token. */
  websocket_url?: string | null;
}

export interface TodoistWorkspace {
  id: string;
  name: string;
  is_deleted?: boolean;
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
  created_at?: string | null;
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
  /** Todoist "deadline" (date only), separate from the due date. */
  deadline?: { date: string } | null;
  labels: string[];
  /** Holder: the collaborator responsible for the task. Only set in shared projects. */
  responsible_uid: string | null;
  /** Filled in by the dashboard from loaded comments (the Sync API does not send it). */
  note_count: number;
  child_order: number;
  checked: boolean;
  is_deleted?: boolean;
  added_at: string | null;
  updated_at?: string | null;
  completed_at: string | null;
  added_by_uid?: string | null;
  completed_by_uid?: string | null;
}

export interface TodoistLabel {
  id: string;
  name: string;
  color: string;
  order: number | null;
  is_deleted?: boolean;
}

/** A task comment (called a "note" in the Sync API). */
export interface TodoistComment {
  id: string;
  task_id: string;
  posted_uid: string | null;
  content: string;
  posted_at: string | null;
  is_deleted?: boolean;
}

/** A person who can hold tasks or write comments. */
export interface Person {
  id: string;
  name: string;
  email: string;
}

export type ActivityObjectType = 'item' | 'note' | 'project' | 'section';

/** One entry of the Todoist activity log (`GET /activities`). */
export interface ActivityEvent {
  id: string;
  object_type: ActivityObjectType;
  object_id: string;
  /** e.g. added, updated, completed, uncompleted, deleted, archived, shared. */
  event_type: string;
  event_date: string;
  parent_project_id: string | null;
  parent_item_id: string | null;
  initiator_id: string | null;
  extra_data: Record<string, unknown> | null;
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

export interface CreateProjectInput {
  name: string;
  /** Creates a sub-project. */
  parent_id?: string;
  /** Todoist color name, e.g. "blue". */
  color?: string;
  /** Creates the project in this team workspace instead of the personal space. */
  workspace_id?: string;
}

export interface CreateSectionInput {
  name: string;
  project_id: string;
}

export interface MoveTaskInput {
  project_id?: string;
  section_id?: string;
  parent_id?: string;
}

/** Whether an optional part of the workspace could be loaded (plans and permissions vary). */
export type Availability = { ok: true } | { ok: false; reason: string };

/** Everything the dashboard renders, produced by one sync. */
export interface WorkspaceSnapshot {
  user: TodoistUser;
  workspaces: TodoistWorkspace[];
  projects: TodoistProject[];
  sections: TodoistSection[];
  /** Active (not completed) tasks, subtasks included. */
  tasks: TodoistTask[];
  /** Tasks completed since the start of the current month (or week, if earlier). */
  completed: TodoistTask[];
  labels: TodoistLabel[];
  comments: TodoistComment[];
  /** Activity log for the last 7 days, newest first. */
  activity: ActivityEvent[];
  activityStatus: Availability;
  completedStatus: Availability;
  /** Everyone we know a name for: collaborators, workspace members and the account owner. */
  people: Record<string, Person>;
  syncedAt: string;
}
