import type { Person, WorkspaceSnapshot } from '../types/todoist';

/**
 * Who a task in one project can be handed to.
 *
 * Two things put someone on this list, both read from what Todoist synced:
 *  - Todoist lists them on the project (its collaborators), or
 *  - they already hold a task there, open or completed this month.
 *
 * Nobody else appears, so a dropdown never offers a person who has nothing to do with the project.
 * A newly assigned person is on the list as soon as that assignment arrives in a sync.
 */
export function peopleForProject(snapshot: WorkspaceSnapshot, projectId: string, { include }: { include?: string | null } = {}): Person[] {
  const ids = new Set(snapshot.peopleByProject?.[projectId] ?? []);
  for (const task of snapshot.tasks) if (task.project_id === projectId && task.responsible_uid) ids.add(task.responsible_uid);
  for (const task of snapshot.completed) if (task.project_id === projectId && task.responsible_uid) ids.add(task.responsible_uid);
  // Whoever already holds the task being edited stays on the list, even if they have since left.
  if (include) ids.add(include);

  return [...ids]
    .map((id) => snapshot.people[id])
    .filter((person): person is Person => !!person)
    .sort((a, b) => a.name.localeCompare(b.name));
}
