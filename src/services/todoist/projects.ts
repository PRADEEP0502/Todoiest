import type { CreateProjectInput, CreateSectionInput, TodoistProject, TodoistSection } from '../../types/todoist';
import type { TodoistClient } from './client';

/** Creates a project (POST /projects). With `workspace_id` it becomes a team-workspace project. */
export function createProject(client: TodoistClient, input: CreateProjectInput): Promise<TodoistProject> {
  const { workspace_id, ...rest } = input;
  // The API documents workspace_id as an integer; Todoist workspace ids are numeric strings.
  const body = workspace_id ? { ...rest, workspace_id: /^\d+$/.test(workspace_id) ? Number(workspace_id) : workspace_id } : rest;
  return client.request<TodoistProject>('/projects', { method: 'POST', body });
}

/** Creates a section inside a project (POST /sections). */
export function createSection(client: TodoistClient, input: CreateSectionInput): Promise<TodoistSection> {
  return client.request<TodoistSection>('/sections', { method: 'POST', body: input });
}
