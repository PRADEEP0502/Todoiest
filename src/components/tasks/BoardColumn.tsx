import { Plus } from 'lucide-react';
import { useState, type DragEvent, type ReactNode } from 'react';
import { Modal } from '../common/Modal';
import { SearchSelect, type SearchOption } from '../common/SearchSelect';
import { useUi } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { plainText, taskTitle } from '../../lib/text';
import { Count } from '../common/ui';
import { BoardCard } from './BoardCard';

/**
 * What dropping a card in another column does on this board — move it to that section, or hand it
 * to that person. The board decides; a column only reports where the card landed.
 */
export interface BoardTransfer {
  /** Every column of this board, in the order they are drawn. */
  columns: (SearchOption & { value: string })[];
  /** Carries out the transfer. Returns once Todoist has been told. */
  apply: (task: TodoistTask, columnId: string) => Promise<boolean> | void;
  /** How the dialog reads: "Move"/"Section"/"Move task", or "Hand over"/"Holder"/"Assign task". */
  words: { verb: string; field: string; action: string; working: string; note: string };
  /** A column worth one click of its own, e.g. "Assign to me". */
  quick?: { label: string; value: string };
}

/** The sideways-scrolling strip the columns sit in; one column fills a phone screen at a time. */
export function BoardScroller({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-2 overflow-x-auto overscroll-x-contain px-2 pb-2">
      <div className="flex snap-x snap-mandatory items-start gap-3 sm:snap-none">{children}</div>
    </div>
  );
}

export interface BoardColumnProps {
  /** This column's place on the board, as `transfer.columns` names it. */
  columnId: string;
  title: string;
  /** What this column's heading says underneath — the project, or how many are late. */
  subtitle?: ReactNode;
  count: number;
  muted?: boolean;
  /** Shown before the title: a project dot, or the person's face. */
  mark?: ReactNode;
  tasks: TodoistTask[];
  childrenOf: (taskId: string) => TodoistTask[];
  /** Where a task added from this column's heading goes. */
  add: { projectId: string; sectionId?: string | null; assigneeId?: string | null };
  transfer: BoardTransfer;
}

/**
 * One column of a board: a heading that can take a new task, then its tasks as cards. A card can be
 * dragged into another column, and carries a button for the same thing as well, because dragging is
 * not possible on a touch screen.
 */
export function BoardColumn({ columnId, title, subtitle, count, muted, mark, tasks, childrenOf, add, transfer }: BoardColumnProps) {
  const { openNewTask } = useUi();
  const { index } = useWorkspace();
  const [over, setOver] = useState(false);
  const addHere = () => openNewTask(add);

  const accepts = (e: DragEvent) => e.dataTransfer.types.includes('text/plain');

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData('text/plain');
    const task = id ? index?.taskById.get(id) : undefined;
    if (task) void transfer.apply(task, columnId);
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
        {mark && <span className="shrink-0">{mark}</span>}
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
            <Card key={task.id} task={task} childrenOf={childrenOf} columnId={columnId} transfer={transfer} />
          ))}
        </div>
      )}
    </section>
  );
}

/** A card, with the dialog that sends it to another column when dragging is not an option. */
function Card({
  task,
  childrenOf,
  columnId,
  transfer,
}: {
  task: TodoistTask;
  childrenOf: (taskId: string) => TodoistTask[];
  columnId: string;
  transfer: BoardTransfer;
}) {
  const [sending, setSending] = useState(false);
  return (
    <>
      <BoardCard
        task={task}
        subtasks={childrenOf(task.id)}
        moveLabel={transfer.words.action}
        onMove={transfer.columns.length > 1 ? () => setSending(true) : undefined}
      />
      {sending && <TransferDialog task={task} columnId={columnId} transfer={transfer} onClose={() => setSending(false)} />}
    </>
  );
}

/** Sending a card to another column without dragging it — the way this works on a phone. */
function TransferDialog({
  task,
  columnId,
  transfer,
  onClose,
}: {
  task: TodoistTask;
  columnId: string;
  transfer: BoardTransfer;
  onClose: () => void;
}) {
  const [to, setTo] = useState(columnId);
  const [busy, setBusy] = useState(false);
  const { verb, field, action, working, note } = transfer.words;

  const send = async () => {
    if (to === columnId) return onClose();
    setBusy(true);
    await transfer.apply(task, to);
    onClose();
  };

  return (
    <Modal
      title={
        <span className="flex min-w-0 items-baseline gap-1">
          <span className="shrink-0">{verb}</span>
          <span className="truncate font-medium text-ink">{taskTitle(plainText(task.content))}</span>
        </span>
      }
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => void send()} disabled={busy || to === columnId}>
            {busy ? working : action}
          </button>
        </>
      }
    >
      <div className="flex items-end justify-between gap-2">
        <label className="label" htmlFor="board-transfer">{field}</label>
        {transfer.quick && transfer.quick.value !== columnId && (
          <button type="button" className="mb-1.5 text-[12px] font-medium text-accent hover:underline" onClick={() => setTo(transfer.quick!.value)}>
            {transfer.quick.label}
          </button>
        )}
      </div>
      <SearchSelect
        id="board-transfer"
        value={to}
        onChange={setTo}
        searchPlaceholder={`Search ${field.toLowerCase()}…`}
        options={transfer.columns.map((column) => ({ ...column, hint: column.value === columnId ? 'now' : column.hint }))}
      />
      <p className="mt-2 text-[12.5px] text-ink-3">{note}</p>
    </Modal>
  );
}
