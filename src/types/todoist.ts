// Todoist REST API v2 entity types

export interface TodoistDue {
  date: string; // YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  string?: string;
  is_recurring?: boolean;
  datetime?: string;
  timezone?: string;
}

export interface TodoistTask {
  id: string;
  project_id: string;
  section_id?: string | null;
  content: string;
  description: string;
  is_completed: boolean;
  labels: string[];
  order: number;
  priority: 1 | 2 | 3 | 4; // 1: Natural (P4), 2: High (P3), 3: Very High (P2), 4: Urgent (P1)
  due?: TodoistDue | null;
  url?: string;
  comment_count?: number;
  created_at: string;
  creator_id?: string;
  assignee_id?: string | null;
  completed_at?: string | null;
}

export interface TodoistProject {
  id: string;
  name: string;
  color?: string;
  parent_id?: string | null;
  order: number;
  comment_count?: number;
  is_shared?: boolean;
  is_favorite?: boolean;
  is_inbox_project?: boolean;
  is_team_inbox?: boolean;
  url?: string;
  view_style?: 'list' | 'board';
}

export interface TodoistLabel {
  id: string;
  name: string;
  color?: string;
  order?: number;
  is_favorite?: boolean;
}

export interface CreateTaskPayload {
  content: string;
  description?: string;
  project_id?: string;
  section_id?: string;
  labels?: string[];
  priority?: 1 | 2 | 3 | 4;
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
  assignee_id?: string;
}

export interface UpdateTaskPayload {
  content?: string;
  description?: string;
  project_id?: string;
  labels?: string[];
  priority?: 1 | 2 | 3 | 4;
  due_string?: string;
  due_date?: string;
  due_datetime?: string;
  assignee_id?: string;
}

export interface TodoistUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}
