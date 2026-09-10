import { todoistFetch } from './client';
import type { TodoistTask, CreateTaskPayload, UpdateTaskPayload } from '../../types/todoist';

export interface TaskQueryParams {
  project_id?: string;
  section_id?: string;
  label?: string;
  filter?: string;
  lang?: string;
  ids?: string;
}

export async function getTasks(params?: TaskQueryParams, token?: string): Promise<TodoistTask[]> {
  return todoistFetch<TodoistTask[]>('/tasks', {
    method: 'GET',
    params: params as Record<string, any>,
    token,
  });
}

export async function getTask(taskId: string, token?: string): Promise<TodoistTask> {
  return todoistFetch<TodoistTask>(`/tasks/${taskId}`, {
    method: 'GET',
    token,
  });
}

export async function createTask(payload: CreateTaskPayload, token?: string): Promise<TodoistTask> {
  return todoistFetch<TodoistTask>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload,
  token?: string
): Promise<TodoistTask> {
  return todoistFetch<TodoistTask>(`/tasks/${taskId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
}

export async function closeTask(taskId: string, token?: string): Promise<boolean> {
  await todoistFetch<void>(`/tasks/${taskId}/close`, {
    method: 'POST',
    token,
  });
  return true;
}

export async function reopenTask(taskId: string, token?: string): Promise<boolean> {
  await todoistFetch<void>(`/tasks/${taskId}/reopen`, {
    method: 'POST',
    token,
  });
  return true;
}

export async function deleteTask(taskId: string, token?: string): Promise<boolean> {
  await todoistFetch<void>(`/tasks/${taskId}`, {
    method: 'DELETE',
    token,
  });
  return true;
}
