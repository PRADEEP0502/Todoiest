import { useCollapse } from '../../hooks/useCollapse';
import type { TodoistTask } from '../../types/todoist';
import { TaskRow } from './TaskRow';

interface TaskTreeProps {
  tasks: TodoistTask[];
  childrenOf: (taskId: string) => TodoistTask[];
  pathOf?: (task: TodoistTask) => string[] | undefined;
  hideDue?: boolean;
  depth?: number;
}

/** Tasks with their subtasks nested underneath; each parent can be collapsed. */
export function TaskTree({ tasks, childrenOf, pathOf, hideDue, depth = 0 }: TaskTreeProps) {
  return (
    <div role="list">
      {tasks.map((task) => (
        <TaskNode key={task.id} task={task} childrenOf={childrenOf} pathOf={pathOf} hideDue={hideDue} depth={depth} />
      ))}
    </div>
  );
}

function TaskNode({ task, childrenOf, pathOf, hideDue, depth }: Omit<TaskTreeProps, 'tasks'> & { task: TodoistTask; depth: number }) {
  const children = childrenOf(task.id);
  const [collapsed, toggle] = useCollapse(`task:${task.id}`);
  return (
    <div role="listitem">
      <TaskRow
        task={task}
        depth={depth}
        path={pathOf?.(task)}
        hideDue={hideDue}
        subtaskCount={children.length}
        collapsed={collapsed}
        onToggle={toggle}
      />
      {children.length > 0 && !collapsed && (
        <TaskTree tasks={children} childrenOf={childrenOf} pathOf={pathOf} hideDue={hideDue} depth={depth + 1} />
      )}
    </div>
  );
}
