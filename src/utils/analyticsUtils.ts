import type { TodoistTask, TodoistProject } from '../types/todoist';
import type { DashboardMetrics } from '../types/dashboard';
import { isTaskOverdue, isTaskToday } from './dateUtils';
import { format, startOfWeek, addDays } from 'date-fns';

export function calculateMetrics(
  tasks: TodoistTask[],
  completedTasks: TodoistTask[] = []
): DashboardMetrics {
  const activeTasks = tasks.filter((t) => !t.is_completed);
  const totalTasks = activeTasks.length + completedTasks.length;
  
  const dueToday = activeTasks.filter((t) => isTaskToday(t.due?.date)).length;
  const overdue = activeTasks.filter((t) => isTaskOverdue(t.due?.date)).length;
  const urgentTasks = activeTasks.filter((t) => t.priority === 4).length;
  const totalCompleted = completedTasks.length;
  
  const completionRate =
    totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const avgDailyCompletion =
    totalCompleted > 0 ? Number((totalCompleted / 7).toFixed(1)) : 0;

  return {
    totalTasks,
    dueToday,
    overdue,
    completed: totalCompleted,
    completionRate,
    pendingTasks: activeTasks.length,
    urgentTasks,
    avgDailyCompletion,
  };
}

export interface WeeklyDataPoint {
  day: string;
  shortDay: string;
  completed: number;
  pending: number;
}

export function getWeeklyProductivityData(
  tasks: TodoistTask[],
  completedTasks: TodoistTask[]
): WeeklyDataPoint[] {
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const fullDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const now = new Date();
  const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });

  return daysOfWeek.map((shortDay, index) => {
    const dayDate = addDays(startOfCurrentWeek, index);
    const dayStr = format(dayDate, 'yyyy-MM-dd');

    const completedCount = completedTasks.filter((t) => {
      if (t.completed_at) {
        return t.completed_at.startsWith(dayStr);
      }
      return false;
    }).length;

    const pendingCount = tasks.filter((t) => {
      if (!t.is_completed && t.due?.date) {
        return t.due.date.startsWith(dayStr);
      }
      return false;
    }).length;

    return {
      day: fullDays[index],
      shortDay,
      completed: completedCount,
      pending: pendingCount,
    };
  });
}

export interface TaskDistributionItem {
  name: string;
  value: number;
  color: string;
}

export function getTaskDistributionData(
  tasks: TodoistTask[],
  completedTasks: TodoistTask[]
): TaskDistributionItem[] {
  const activeTasks = tasks.filter((t) => !t.is_completed);
  const overdueCount = activeTasks.filter((t) => isTaskOverdue(t.due?.date)).length;
  const todayCount = activeTasks.filter((t) => isTaskToday(t.due?.date)).length;
  const pendingOther = Math.max(0, activeTasks.length - overdueCount - todayCount);
  const completedCount = completedTasks.length;

  return [
    { name: 'Completed', value: completedCount, color: '#10b981' },
    { name: 'Due Today', value: todayCount, color: '#0ea5e9' },
    { name: 'Upcoming/Pending', value: pendingOther, color: '#64748b' },
    { name: 'Overdue', value: overdueCount, color: '#f43f5e' },
  ];
}

export interface ProjectWorkloadItem {
  id: string;
  name: string;
  color?: string;
  total: number;
  completed: number;
  pending: number;
  progress: number;
}

export function getProjectWorkload(
  projects: TodoistProject[],
  tasks: TodoistTask[],
  completedTasks: TodoistTask[]
): ProjectWorkloadItem[] {
  return projects.map((project) => {
    const projActive = tasks.filter((t) => !t.is_completed && t.project_id === project.id);
    const projCompleted = completedTasks.filter((t) => t.project_id === project.id);
    const total = projActive.length + projCompleted.length;
    const progress = total > 0 ? Math.round((projCompleted.length / total) * 100) : 0;

    return {
      id: project.id,
      name: project.name,
      color: project.color,
      total,
      completed: projCompleted.length,
      pending: projActive.length,
      progress,
    };
  });
}

export interface PriorityDistributionItem {
  name: string;
  count: number;
  color: string;
  percentage: number;
}

export function getPriorityDistribution(tasks: TodoistTask[]): PriorityDistributionItem[] {
  const activeTasks = tasks.filter((t) => !t.is_completed);
  const total = activeTasks.length || 1;

  const p1 = activeTasks.filter((t) => t.priority === 4).length;
  const p2 = activeTasks.filter((t) => t.priority === 3).length;
  const p3 = activeTasks.filter((t) => t.priority === 2).length;
  const p4 = activeTasks.filter((t) => t.priority === 1).length;

  return [
    { name: 'P1 · Urgent', count: p1, color: '#f43f5e', percentage: Math.round((p1 / total) * 100) },
    { name: 'P2 · High', count: p2, color: '#f59e0b', percentage: Math.round((p2 / total) * 100) },
    { name: 'P3 · Medium', count: p3, color: '#38bdf8', percentage: Math.round((p3 / total) * 100) },
    { name: 'P4 · Normal', count: p4, color: '#94a3b8', percentage: Math.round((p4 / total) * 100) },
  ];
}
