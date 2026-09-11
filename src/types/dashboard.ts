import type { TodoistTask, TodoistProject, TodoistSection } from './todoist';

export type NavigationTab =
  | 'dashboard'
  | 'today'
  | 'upcoming'
  | 'projects'
  | 'completed'
  | 'settings';

export type TaskPriorityLevel = 4 | 3 | 2 | 1; // P1 (Urgent = 4), P2 (High = 3), P3 (Medium = 2), P4 (Normal = 1)

export interface DashboardMetrics {
  totalTasks: number;
  dueToday: number;
  overdue: number;
  completed: number;
}

export interface SyncState {
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSynced: Date | null;
  errorMessage?: string;
}

export interface EnrichedTask extends TodoistTask {
  project?: TodoistProject;
  section?: TodoistSection;
  isOverdue?: boolean;
  isToday?: boolean;
  daysOverdue?: number;
  priorityLabel: string;
}
