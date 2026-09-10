import { todoistFetch } from './client';
import type { TodoistLabel } from '../../types/todoist';

export async function getLabels(token?: string): Promise<TodoistLabel[]> {
  return todoistFetch<TodoistLabel[]>('/labels', {
    method: 'GET',
    token,
  });
}
