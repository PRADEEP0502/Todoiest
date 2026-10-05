import { containerKey, countContainer, type WorkspaceIndex } from '../../lib/hierarchy';
import { useWorkspace } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { EmptyState } from '../common/ui';
import { BoardColumn, BoardScroller, type BoardTransfer } from '../tasks/BoardColumn';

interface Column {
  id: string;
  title: string;
  muted?: boolean;
  sectionId: string | null;
  tasks: TodoistTask[];
  count: number;
}

const NO_SECTION = 'none';

/**
 * The project as a board: one column per section, its tasks as cards, the way Todoist lays it out.
 * Tasks that are in no section come first, so nothing is hidden by the arrangement, and empty
 * sections keep their column so a task can be added — or dropped — straight into them.
 */
export function ProjectBoard({ index, projectId }: { index: WorkspaceIndex; projectId: string }) {
  const { moveTask } = useWorkspace();
  const sections = index.sectionsByProject.get(projectId) ?? [];
  const unsectioned = index.rootTasks.get(containerKey(projectId, null)) ?? [];
  const childrenOf = (id: string) => index.subtasks.get(id) ?? [];

  const columns: Column[] = [];
  if (unsectioned.length > 0 || sections.length === 0) {
    columns.push({
      id: NO_SECTION,
      title: sections.length === 0 ? 'Tasks' : 'No section',
      muted: sections.length > 0,
      sectionId: null,
      tasks: unsectioned,
      count: countContainer(index, projectId, null),
    });
  }
  for (const section of sections) {
    columns.push({
      id: section.id,
      title: section.name,
      sectionId: section.id,
      tasks: index.rootTasks.get(containerKey(projectId, section.id)) ?? [],
      count: countContainer(index, projectId, section.id),
    });
  }

  if (sections.length === 0 && unsectioned.length === 0) {
    return <EmptyState title="No open tasks" />;
  }

  // Dropping a card in another column moves the task into that section.
  const transfer: BoardTransfer = {
    columns: [
      ...(sections.length === 0 || unsectioned.length > 0 ? [] : [{ value: NO_SECTION, label: 'No section' }]),
      ...columns.map((column) => ({ value: column.id, label: column.title })),
    ],
    apply: (task, columnId) => moveTask(task, { projectId, sectionId: columnId === NO_SECTION ? null : columnId }),
    words: {
      verb: 'Move',
      field: 'Section',
      action: 'Move task',
      working: 'Moving…',
      note: 'Any subtasks move with it. Its dates, holder and comments stay as they are.',
    },
  };

  return (
    <BoardScroller>
      {columns.map((column) => (
        <BoardColumn
          key={column.id}
          columnId={column.id}
          title={column.title}
          muted={column.muted}
          count={column.count}
          tasks={column.tasks}
          childrenOf={childrenOf}
          add={{ projectId, sectionId: column.sectionId }}
          transfer={transfer}
        />
      ))}
    </BoardScroller>
  );
}
