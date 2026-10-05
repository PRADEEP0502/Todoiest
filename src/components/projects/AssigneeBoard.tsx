import type { WorkspaceIndex } from '../../lib/hierarchy';
import { UNASSIGNED } from '../../lib/metrics';
import { peopleForProject } from '../../lib/projectPeople';
import { byPriorityThenTime } from '../../lib/stats';
import { useWorkspace } from '../../store/workspace';
import type { TodoistTask, WorkspaceSnapshot } from '../../types/todoist';
import { Avatar, EmptyState } from '../common/ui';
import { BoardColumn, BoardScroller, type BoardTransfer } from '../tasks/BoardColumn';

/**
 * The project by holder: a column for each person on it, and one for the tasks nobody holds.
 *
 * Subtasks stand on their own here, because each one has its own holder in Todoist — a subtask
 * someone else was given would otherwise be hidden inside a card in another column. Dropping a card
 * in a column hands that task to that person; nothing else about it changes.
 */
export function AssigneeBoard({
  index,
  snapshot,
  projectId,
}: {
  index: WorkspaceIndex;
  snapshot: WorkspaceSnapshot;
  projectId: string;
}) {
  const { assignTask } = useWorkspace();
  const me = snapshot.user.id;
  const tasks = [...index.taskById.values()].filter((t) => t.project_id === projectId);

  // Everyone on the project in Todoist, plus anyone still holding a task here who has since left it.
  const holding = new Set(tasks.map((t) => t.responsible_uid).filter((id): id is string => !!id));
  const people = peopleForProject(snapshot, projectId);
  for (const id of holding) {
    if (!people.some((p) => p.id === id)) {
      const person = snapshot.people[id];
      if (person) people.push(person);
    }
  }

  const byHolder = new Map<string, TodoistTask[]>();
  for (const task of tasks) {
    const id = task.responsible_uid ?? UNASSIGNED;
    byHolder.set(id, [...(byHolder.get(id) ?? []), task]);
  }
  for (const list of byHolder.values()) list.sort(byPriorityThenTime);

  const columns = [
    ...people.map((person) => ({ id: person.id, name: person.name, tasks: byHolder.get(person.id) ?? [] })),
    // Last, because it is where work still waits to be given out.
    { id: UNASSIGNED, name: 'No holder', tasks: byHolder.get(UNASSIGNED) ?? [] },
  ];

  if (tasks.length === 0) return <EmptyState title="No open tasks" />;
  if (people.length === 0) {
    return (
      <EmptyState title="Nobody is on this project in Todoist">
        Todoist only records a holder for tasks in a shared project. Share the project, or assign its tasks, and the people will appear here.
      </EmptyState>
    );
  }

  // Dropping a card in another column hands the task to that person.
  const transfer: BoardTransfer = {
    columns: columns.map((column) => ({
      value: column.id,
      label: column.name,
      icon: column.id === UNASSIGNED ? undefined : <Avatar id={column.id} name={column.name} size={18} />,
    })),
    apply: (task, columnId) => assignTask(task, columnId === UNASSIGNED ? null : columnId),
    quick: people.some((person) => person.id === me) ? { label: 'Assign to me', value: me } : undefined,
    words: {
      verb: 'Hand over',
      field: 'Holder',
      action: 'Assign task',
      working: 'Assigning…',
      note: 'Only the holder changes. The task keeps its project, its section and its dates.',
    },
  };

  return (
    <BoardScroller>
      {columns.map((column) => (
        <BoardColumn
          key={column.id}
          columnId={column.id}
          title={column.name}
          muted={column.id === UNASSIGNED}
          mark={column.id === UNASSIGNED ? undefined : <Avatar id={column.id} name={column.name} size={20} />}
          count={column.tasks.length}
          tasks={column.tasks}
          // Each task stands alone in this arrangement, under whoever holds it.
          childrenOf={() => []}
          add={{ projectId, assigneeId: column.id === UNASSIGNED ? null : column.id }}
          transfer={transfer}
        />
      ))}
    </BoardScroller>
  );
}
