import { disclosureKey, useDisclosure } from '../../hooks/useDisclosure';
import type { TodoistTask } from '../../types/todoist';
import { TaskRow } from './TaskRow';

interface TaskTreeProps {
  tasks: TodoistTask[];
  childrenOf: (taskId: string) => TodoistTask[];
  pathOf?: (task: TodoistTask) => string[] | undefined;
  hideDue?: boolean;
  depth?: number;
  /** Subtasks start collapsed in the project hierarchy; filtered lists open them. */
  subtasksOpen?: boolean;
}

/** Tasks with their subtasks nested underneath; each parent can be collapsed. */
export function TaskTree({ tasks, childrenOf, pathOf, hideDue, depth = 0, subtasksOpen = false }: TaskTreeProps) {
  return (
    <div role="list">
      {tasks.map((task) => (
        <TaskNode key={task.id} task={task} childrenOf={childrenOf} pathOf={pathOf} hideDue={hideDue} depth={depth} subtasksOpen={subtasksOpen} />
      ))}
    </div>
  );
}

function TaskNode({ task, childrenOf, pathOf, hideDue, depth, subtasksOpen }: Omit<TaskTreeProps, 'tasks'> & { task: TodoistTask; depth: number }) {
  const children = childrenOf(task.id);
  const [open, toggle] = useDisclosure(disclosureKey.subtasks(task.id), subtasksOpen ?? false);
  return (
    <div role="listitem">
      <TaskRow
        task={task}
        depth={depth}
        path={pathOf?.(task)}
        hideDue={hideDue}
        subtaskCount={children.length}
        collapsed={!open}
        onToggle={toggle}
      />
      {children.length > 0 && open && (
        <TaskTree tasks={children} childrenOf={childrenOf} pathOf={pathOf} hideDue={hideDue} depth={depth + 1} subtasksOpen={subtasksOpen} />
      )}
    </div>
  );
}
