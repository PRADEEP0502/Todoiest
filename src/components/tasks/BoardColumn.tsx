import { CornerUpRight, Plus } from 'lucide-react';
import { useState, type DragEvent, type ReactNode } from 'react';
import { Modal } from '../common/Modal';
import { SearchSelect } from '../common/SearchSelect';
import { useUi } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { plainText, taskTitle } from '../../lib/text';
import { Count } from '../common/ui';
import { TaskTree } from './TaskTree';

/** Where a task can be dropped: one of the board's own columns. */
export interface BoardTarget {
  projectId: string;
  sectionId: string | null;
  label: string;
  /** The project, when the board spans more than one. */
  hint?: string;
}

export const targetKey = (target: { projectId: string; sectionId: string | null }) => `${target.projectId}:${target.sectionId ?? ''}`;

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
  /** Every column of this board, so a card can be sent to any of them. */
  targets: BoardTarget[];
}

/**
 * One column of a board: a heading that can take a new task, then its tasks as cards. A card can be
 * dragged into another column, and carries a "Move to" button as well, because dragging is not
 * possible on a touch screen.
 */
export function BoardColumn({ title, subtitle, count, muted, tasks, childrenOf, add, targets }: BoardColumnProps) {
  const { openNewTask } = useUi();
  const { index, moveTask } = useWorkspace();
  const [over, setOver] = useState(false);
  const addHere = () => openNewTask(add);

  const accepts = (e: DragEvent) => e.dataTransfer.types.includes('text/plain');

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData('text/plain');
    const task = id ? index?.taskById.get(id) : undefined;
    if (task) void moveTask(task, { projectId: add.projectId, sectionId: add.sectionId });
  };

  return (
    <section
      data-section-id={add.sectionId ?? undefined}
      onDragOver={(e) => {
        if (!accepts(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={onDrop}
      className={`w-[min(85vw,19rem)] shrink-0 snap-start scroll-mt-24 rounded-xl p-2 transition-colors ${
        over ? 'bg-accent/[0.08] ring-2 ring-accent/40' : 'bg-black/[0.025]'
      }`}
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
          {over ? 'Drop here' : 'No tasks — add one'}
        </button>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <BoardCard key={task.id} task={task} childrenOf={childrenOf} here={add} targets={targets} />
          ))}
        </div>
      )}
    </section>
  );
}

function BoardCard({
  task,
  childrenOf,
  here,
  targets,
}: {
  task: TodoistTask;
  childrenOf: (taskId: string) => TodoistTask[];
  here: { projectId: string; sectionId: string | null };
  targets: BoardTarget[];
}) {
  const [dragging, setDragging] = useState(false);
  const [moving, setMoving] = useState(false);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`group/card relative rounded-lg border border-line bg-surface px-1.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <TaskTree tasks={[task]} childrenOf={childrenOf} subtasksOpen />
      {targets.length > 1 && (
        <button
          type="button"
          className="icon-btn absolute bottom-1 right-1 opacity-60 hover:opacity-100 focus:opacity-100"
          onClick={() => setMoving(true)}
          aria-label={`Move “${taskTitle(plainText(task.content))}” to another section`}
          title="Move to another section"
        >
          <CornerUpRight size={14} />
        </button>
      )}
      {moving && <MoveTaskDialog task={task} here={here} targets={targets} onClose={() => setMoving(false)} />}
    </div>
  );
}

/** Sending a card to another column without dragging it — the way this works on a phone. */
function MoveTaskDialog({
  task,
  here,
  targets,
  onClose,
}: {
  task: TodoistTask;
  here: { projectId: string; sectionId: string | null };
  targets: BoardTarget[];
  onClose: () => void;
}) {
  const { moveTask } = useWorkspace();
  const [to, setTo] = useState(targetKey(here));
  const [busy, setBusy] = useState(false);

  const move = async () => {
    const target = targets.find((t) => targetKey(t) === to);
    if (!target) return onClose();
    setBusy(true);
    await moveTask(task, { projectId: target.projectId, sectionId: target.sectionId });
    onClose();
  };

  return (
    <Modal
      title={<>Move <span className="font-medium text-ink">{taskTitle(plainText(task.content))}</span></>}
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <button type="button" className="btn-primary" onClick={() => void move()} disabled={busy || to === targetKey(here)}>
            Move task
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        </>
      }
    >
      <label className="label" htmlFor="move-to">Section</label>
      <SearchSelect
        id="move-to"
        value={to}
        onChange={setTo}
        searchPlaceholder="Search sections…"
        options={targets.map((target) => ({
          value: targetKey(target),
          label: target.label,
          hint: targetKey(target) === targetKey(here) ? 'now' : target.hint,
          group: target.hint,
        }))}
      />
      <p className="mt-2 text-[12.5px] text-ink-3">Any subtasks move with it. Its dates, holder and comments stay as they are.</p>
    </Modal>
  );
}
