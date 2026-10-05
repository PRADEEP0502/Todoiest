import { groupByProjectAndSection } from '../../lib/hierarchy';
import { useWorkspace } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { EmptyState, ProjectDot } from '../common/ui';
import { BoardColumn, BoardScroller, type BoardTarget } from './BoardColumn';

/**
 * Any list of tasks as a board: one column per section, in project order, each column saying which
 * project it belongs to. A person's list spans several projects, so the project is named on the
 * column rather than above it, and the columns stay in one sideways-scrolling row.
 */
export function TaskBoard({
  tasks,
  compare,
  addDefaults,
}: {
  tasks: TodoistTask[];
  compare?: (a: TodoistTask, b: TodoistTask) => number;
  /** Carried into a task added from a column heading — a person's own board hands it to them. */
  addDefaults?: { assigneeId?: string | null };
}) {
  const { index } = useWorkspace();
  if (!index) return null;
  const { groups, childrenOf } = groupByProjectAndSection(index, tasks, compare);
  if (groups.length === 0) return <EmptyState title="No tasks to show" />;

  // Where a card may be sent: every section of the projects on this board, including the ones
  // holding none of these tasks, so a task can be moved into an empty section too.
  const targets: BoardTarget[] = groups.flatMap((group) => [
    { projectId: group.project.id, sectionId: null, label: 'No section', hint: group.project.name },
    ...(index.sectionsByProject.get(group.project.id) ?? []).map((section) => ({
      projectId: group.project.id,
      sectionId: section.id,
      label: section.name,
      hint: group.project.name,
    })),
  ]);

  return (
    <BoardScroller>
      {groups.flatMap((group) =>
        group.sections.map((section) => (
          <BoardColumn
            key={`${group.project.id}:${section.section?.id ?? 'none'}`}
            title={section.section?.name ?? 'No section'}
            muted={!section.section}
            subtitle={
              <>
                <ProjectDot color={group.project.color} />
                <span className="truncate">{group.project.name}</span>
              </>
            }
            count={section.count}
            tasks={section.roots}
            childrenOf={childrenOf}
            add={{ projectId: group.project.id, sectionId: section.section?.id ?? null, ...addDefaults }}
            targets={targets}
          />
        )),
      )}
    </BoardScroller>
  );
}
