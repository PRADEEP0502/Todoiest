import { containerKey, countContainer, type WorkspaceIndex } from '../../lib/hierarchy';
import type { TodoistTask } from '../../types/todoist';
import { EmptyState } from '../common/ui';
import { BoardColumn, BoardScroller } from '../tasks/BoardColumn';

interface Column {
  key: string;
  title: string;
  muted?: boolean;
  sectionId: string | null;
  tasks: TodoistTask[];
  count: number;
}

/**
 * The project as a board: one column per section, its tasks as cards, the way Todoist lays it out.
 * Tasks that are in no section come first, so nothing is hidden by the arrangement, and empty
 * sections keep their column so a task can be added straight into them.
 */
export function ProjectBoard({ index, projectId }: { index: WorkspaceIndex; projectId: string }) {
  const sections = index.sectionsByProject.get(projectId) ?? [];
  const unsectioned = index.rootTasks.get(containerKey(projectId, null)) ?? [];
  const childrenOf = (id: string) => index.subtasks.get(id) ?? [];

  const columns: Column[] = [];
  if (unsectioned.length > 0 || sections.length === 0) {
    columns.push({
      key: 'no-section',
      title: sections.length === 0 ? 'Tasks' : 'No section',
      muted: sections.length > 0,
      sectionId: null,
      tasks: unsectioned,
      count: countContainer(index, projectId, null),
    });
  }
  for (const section of sections) {
    columns.push({
      key: section.id,
      title: section.name,
      sectionId: section.id,
      tasks: index.rootTasks.get(containerKey(projectId, section.id)) ?? [],
      count: countContainer(index, projectId, section.id),
    });
  }

  if (sections.length === 0 && unsectioned.length === 0) {
    return <EmptyState title="No open tasks" />;
  }

  return (
    <BoardScroller>
      {columns.map((column) => (
        <BoardColumn
          key={column.key}
          title={column.title}
          muted={column.muted}
          count={column.count}
          tasks={column.tasks}
          childrenOf={childrenOf}
          add={{ projectId, sectionId: column.sectionId }}
        />
      ))}
    </BoardScroller>
  );
}
