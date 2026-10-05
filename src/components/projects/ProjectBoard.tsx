import { Plus } from 'lucide-react';
import { containerKey, countContainer, type WorkspaceIndex } from '../../lib/hierarchy';
import { useUi } from '../../store/ui';
import type { TodoistTask } from '../../types/todoist';
import { Count, EmptyState } from '../common/ui';
import { TaskTree } from '../tasks/TaskTree';

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
 * Tasks that are in no section come first, so nothing is hidden by the arrangement. The columns
 * scroll sideways on a narrow screen and each one keeps its own "add task here" button.
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

  if (columns.every((column) => column.tasks.length === 0) && sections.length === 0) {
    return <EmptyState title="No open tasks" />;
  }

  return (
    <div className="-mx-2 overflow-x-auto overscroll-x-contain px-2 pb-2">
      <div className="flex snap-x snap-mandatory items-start gap-3 sm:snap-none">
        {columns.map((column) => (
          <BoardColumn key={column.key} column={column} projectId={projectId} childrenOf={childrenOf} />
        ))}
      </div>
    </div>
  );
}

function BoardColumn({
  column,
  projectId,
  childrenOf,
}: {
  column: Column;
  projectId: string;
  childrenOf: (taskId: string) => TodoistTask[];
}) {
  const { openNewTask } = useUi();
  return (
    <section
      data-section-id={column.sectionId ?? undefined}
      className="w-[min(85vw,19rem)] shrink-0 snap-start scroll-mt-24 rounded-xl bg-black/[0.025] p-2"
    >
      <header className="flex items-center gap-2 px-1.5 py-1.5">
        <h3 className={`min-w-0 flex-1 break-words text-[13.5px] font-semibold ${column.muted ? 'text-ink-2' : 'text-ink'}`}>
          {column.title}
        </h3>
        <Count>{column.count}</Count>
        <button
          type="button"
          className="icon-btn"
          onClick={() => openNewTask({ projectId, sectionId: column.sectionId })}
          aria-label={`Add task to ${column.title}`}
          title="Add task here"
        >
          <Plus size={15} />
        </button>
      </header>

      {column.tasks.length === 0 ? (
        <button
          type="button"
          className="w-full rounded-lg border border-dashed border-line px-3 py-4 text-[12.5px] text-ink-3 hover:border-ink-3 hover:text-ink-2"
          onClick={() => openNewTask({ projectId, sectionId: column.sectionId })}
        >
          No tasks — add one
        </button>
      ) : (
        <div className="space-y-2">
          {column.tasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-line bg-surface px-1.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <TaskTree tasks={[task]} childrenOf={childrenOf} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
