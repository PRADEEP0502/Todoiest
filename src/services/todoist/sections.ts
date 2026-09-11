import { todoistFetch } from './client';
import type { TodoistSection } from '../../types/todoist';

export async function getSections(projectId?: string, token?: string): Promise<TodoistSection[]> {
  return todoistFetch<TodoistSection[]>('/sections', {
    method: 'GET',
    params: projectId ? { project_id: projectId } : undefined,
    token,
  });
}

export async function getSection(sectionId: string, token?: string): Promise<TodoistSection> {
  return todoistFetch<TodoistSection>(`/sections/${sectionId}`, {
    method: 'GET',
    token,
  });
}

export async function createSection(
  payload: { name: string; project_id: string; order?: number },
  token?: string
): Promise<TodoistSection> {
  return todoistFetch<TodoistSection>('/sections', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function deleteSection(sectionId: string, token?: string): Promise<boolean> {
  await todoistFetch<void>(`/sections/${sectionId}`, {
    method: 'DELETE',
    token,
  });
  return true;
}
