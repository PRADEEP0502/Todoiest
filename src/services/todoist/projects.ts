import { todoistFetch } from './client';
import type { TodoistProject } from '../../types/todoist';

export async function getProjects(token?: string): Promise<TodoistProject[]> {
  return todoistFetch<TodoistProject[]>('/projects', {
    method: 'GET',
    token,
  });
}

export async function getProject(projectId: string, token?: string): Promise<TodoistProject> {
  return todoistFetch<TodoistProject>(`/projects/${projectId}`, {
    method: 'GET',
    token,
  });
}

export async function createProject(
  payload: { name: string; color?: string; is_favorite?: boolean; parent_id?: string },
  token?: string
): Promise<TodoistProject> {
  return todoistFetch<TodoistProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function deleteProject(projectId: string, token?: string): Promise<boolean> {
  await todoistFetch<void>(`/projects/${projectId}`, {
    method: 'DELETE',
    token,
  });
  return true;
}
