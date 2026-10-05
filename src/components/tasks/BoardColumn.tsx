import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useUi } from '../../store/ui';
import type { TodoistTask } from '../../types/todoist';
import { Count } from '../common/ui';
import { TaskTree } from './TaskTree';

/** The sideways-scrolling strip the columns sit in; one column fills a phone screen at a time. */
export function BoardScroller({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-2 overflow-x-auto overscroll-x-contain px-2 pb-2">
      <div className="flex snap-x snap-mandatory items-start gap-3 sm:snap-none">{children}</div>
    </div>
  );
}

export interface BoardColumnProps {
  title: string;
  /** Where this column's tasks live, when the board spans more than one project. */
  subtitle?: ReactNode;
  count: number;
  muted?: boolean;
  tasks: TodoistTask[];
  childrenOf: (taskId: string) => TodoistTask[];
  /** Where a task added from this column's heading goes. */
  add: { projectId: string; sectionId: string | null; assigneeId?: string | null };
}

/** One column of a board: a heading that can take a new task, then its tasks as cards. */
export function BoardColumn({ title, subtitle, count, muted, tasks, childrenOf, add }: BoardColumnProps) {
  const { openNewTask } = useUi();
  const addHere = () => openNewTask(add);
  return (
    <section
      data-section-id={add.sectionId ?? undefined}
      className="w-[min(85vw,19rem)] shrink-0 snap-start scroll-mt-24 rounded-xl bg-black/[0.025] p-2"
    >
      <header className="flex items-center gap-2 px-1.5 py-1.5">
        <h3 className="min-w-0 flex-1">
          <span className={`block break-words text-[13.5px] font-semibold ${muted ? 'text-ink-2' : 'text-ink'}`}>{title}</span>
          {subtitle && <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">{subtitle}</span>}
        </h3>
        <Count>{count}</Count>
        <button type="button" className="icon-btn" onClick={addHere} aria-label={`Add task to ${title}`} title="Add task here">
          <Plus size={15} />
        </button>
      </header>

      {tasks.length === 0 ? (
        <button
          type="button"
          className="w-full rounded-lg border border-dashed border-line px-3 py-4 text-[12.5px] text-ink-3 hover:border-ink-3 hover:text-ink-2"
          onClick={addHere}
        >
          No tasks — add one
        </button>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-line bg-surface px-1.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <TaskTree tasks={[task]} childrenOf={childrenOf} subtasksOpen />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
