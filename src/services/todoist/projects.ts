import type { TodoistCollaborator, TodoistProject, TodoistSection, TodoistUser, TodoistWorkspace } from '../../types/todoist';
import type { TodoistClient } from './client';

export function getUser(client: TodoistClient, signal?: AbortSignal): Promise<TodoistUser> {
  return client.request<TodoistUser>('/user', { signal });
}

/** Team workspaces the user belongs to. Personal-only accounts return an empty list. */
export function getWorkspaces(client: TodoistClient, signal?: AbortSignal): Promise<TodoistWorkspace[]> {
  return client.request<TodoistWorkspace[]>('/workspaces', { signal });
}

/** All active projects: personal ones and joined workspace projects. */
export async function getProjects(client: TodoistClient, signal?: AbortSignal): Promise<TodoistProject[]> {
  const projects = await client.listAll<TodoistProject>('/projects', {}, signal);
  return projects.filter((p) => !p.is_archived && !p.is_deleted);
}

/** All sections across every project (omit `projectId`), or for one project. */
export async function getSections(client: TodoistClient, projectId?: string, signal?: AbortSignal): Promise<TodoistSection[]> {
  const sections = await client.listAll<TodoistSection>('/sections', { project_id: projectId }, signal);
  return sections.filter((s) => !s.is_archived && !s.is_deleted);
}

export function getProjectCollaborators(
  client: TodoistClient,
  projectId: string,
  signal?: AbortSignal,
): Promise<TodoistCollaborator[]> {
  return client.listAll<TodoistCollaborator>(`/projects/${encodeURIComponent(projectId)}/collaborators`, {}, signal);
}
