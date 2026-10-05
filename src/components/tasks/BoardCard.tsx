import { Check, CornerUpRight, Flag, GitBranch, GripVertical, Lock, MessageSquare, Paperclip, Pencil, Plus } from 'lucide-react';
import { useState, type DragEvent, type ReactNode } from 'react';
import { useNow } from '../../hooks/useNow';
import { agingOf } from '../../lib/aging';
import { attachmentCount } from '../../lib/attachments';
import { describeDue } from '../../lib/dates';
import { PRIORITY_STYLE, toUiPriority } from '../../lib/priority';
import { isRoutineTask } from '../../lib/routine';
import { taskDates } from '../../lib/taskDates';
import { isUncompletable, plainText } from '../../lib/text';
import { useUi } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { Avatar } from '../common/ui';

/** An age in the narrow space of a card: "51d", or nothing at all when there is no date behind it. */
const shortAge = (days: number | null) => (days === null ? undefined : `${Number.isInteger(days) ? days : days.toFixed(1)}d`);

const DUE_TONE = {
  overdue: 'bg-danger-soft text-p1',
  today: 'bg-accent-soft text-accent',
  soon: 'bg-black/[0.05] text-ink-2',
  later: 'bg-black/[0.04] text-ink-3',
} as const;

/**
 * A task as a board card: its name, then the three dates it is judged by, then who holds it and
 * what is attached to it. Everything is one glance deep — the dates sit in fixed columns so a
 * column of cards reads down as a table, and anything a task does not have simply leaves its place
 * empty rather than shifting the rest.
 */
export function BoardCard({
  task,
  subtasks,
  onMove,
}: {
  task: TodoistTask;
  /** This task's own subtasks, shown folded underneath. */
  subtasks: TodoistTask[];
  /** Opens the "move to another section" dialog; absent when there is nowhere else to go. */
  onMove?: () => void;
}) {
  const { completeTask, snapshot, index } = useWorkspace();
  const { openTask, openNewTask } = useUi();
  const now = useNow();
  const [checking, setChecking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [openSubtasks, setOpenSubtasks] = useState(false);

  const heading = isUncompletable(task.content);
  const dates = taskDates(task);
  const routine = index ? isRoutineTask(task, index) : false;
  const priority = toUiPriority(task.priority);
  const style = PRIORITY_STYLE[priority];
  const due = describeDue(task.due, now);
  const assignee = task.responsible_uid ? snapshot?.people[task.responsible_uid] : undefined;
  const files = snapshot ? attachmentCount(snapshot.comments, task.id) : 0;
  const cd = dates.cdFrom === 'title' ? dates.cd : null;
  const age = agingOf({ cdKey: dates.cdFrom === 'title' ? dates.cdKey : null, iddKey: dates.iddKey }, now);
  const showDates = !routine && (cd || dates.idd || dates.dd);

  const complete = () => {
    if (checking || heading) return;
    setChecking(true);
    // A brief tick so the click registers visually before the card leaves the column.
    setTimeout(() => completeTask(task.id), 180);
  };

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDragging(true);
  };

  return (
    <article
      data-task-id={task.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => setDragging(false)}
      className={`group/card relative scroll-mt-24 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:-translate-y-px hover:border-line-strong hover:shadow-card ${
        dragging ? 'rotate-[0.6deg] opacity-50 shadow-pop' : ''
      }`}
    >
      {/* A thread of colour down the edge for anything urgent; nothing at all for P4. */}
      {priority < 4 && <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${style.bar}`} />}

      <div className="px-3 py-2.5 pl-3.5">
        <div className="flex items-start gap-2">
          {heading ? (
            <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center" aria-hidden>
              <span className="h-1.5 w-1.5 rounded-full bg-ink-3" />
            </span>
          ) : (
            <button
              type="button"
              role="checkbox"
              aria-checked={checking}
              aria-label={`Complete ${plainText(dates.title)}`}
              onClick={complete}
              className={`mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${style.ring} ${
                checking ? '!border-accent bg-accent' : `${style.fill} hover:bg-accent-soft`
              }`}
            >
              <Check size={11} strokeWidth={3} className={checking ? 'text-white' : 'text-ink-3 opacity-0 group-hover/card:opacity-60'} />
            </button>
          )}

          <button type="button" onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
            <h4
              className={`break-words text-[13.5px] font-semibold leading-[18px] tracking-[-0.005em] ${
                checking ? 'text-ink-3 line-through' : 'text-ink'
              }`}
            >
              {plainText(dates.title)}
            </h4>
          </button>

          {/* On a pointer, the handles appear on hover, so a resting card is only its content.
              A touch screen has no hover, so there they are always there. */}
          <span className="-mr-1 flex shrink-0 items-center transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100">
            <button
              type="button"
              onClick={() => openNewTask({ parentId: task.id })}
              aria-label={`Add subtask to ${plainText(dates.title)}`}
              title="Add subtask"
              className="icon-btn h-7 w-7"
            >
              <Plus size={14} />
            </button>
            {onMove && (
              <button
                type="button"
                onClick={onMove}
                aria-label={`Move ${plainText(dates.title)} to another section`}
                title="Move to another section"
                className="icon-btn h-7 w-7"
              >
                <CornerUpRight size={14} />
              </button>
            )}
            <span className="hidden cursor-grab text-ink-3 sm:inline-flex" title="Drag to another section" aria-hidden>
              <GripVertical size={14} />
            </span>
          </span>
        </div>

        {showDates && (
          <div className="mt-2 grid grid-cols-3 gap-x-2 rounded-lg bg-black/[0.022] px-2 py-1.5">
            <DateCell label="CD" value={cd} age={shortAge(age.cdAge)} locked />
            <DateCell label="IDD" value={dates.idd} age={shortAge(age.iddAge)} locked />
            <DateCell label="DD" value={dates.dd} />
          </div>
        )}

        {(due || priority < 4 || task.labels.length > 0 || files > 0 || task.note_count > 0 || subtasks.length > 0 || assignee) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-3">
            {due && <span className={`rounded-full px-1.5 py-0.5 font-medium ${DUE_TONE[due.tone]}`}>{due.label}</span>}
            {priority < 4 && (
              <span className={`inline-flex items-center gap-0.5 font-medium ${style.text}`}>
                <Flag size={11} strokeWidth={2.5} />
                {style.label}
              </span>
            )}
            {task.labels.slice(0, 2).map((label) => (
              <span key={label} className="truncate rounded-full bg-black/[0.045] px-1.5 py-0.5 text-ink-2">
                {label}
              </span>
            ))}
            {task.labels.length > 2 && <span>+{task.labels.length - 2}</span>}

            <span className="ml-auto inline-flex items-center gap-2">
              {files > 0 && <Tally icon={<Paperclip size={11} />} value={files} title={`${files} attachment${files > 1 ? 's' : ''}`} />}
              {task.note_count > 0 && <Tally icon={<MessageSquare size={11} />} value={task.note_count} title={`${task.note_count} comments`} />}
              {subtasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenSubtasks((o) => !o)}
                  className="inline-flex items-center gap-1 rounded hover:text-ink"
                  aria-expanded={openSubtasks}
                  title={openSubtasks ? 'Hide subtasks' : 'Show subtasks'}
                >
                  <GitBranch size={11} />
                  {subtasks.length}
                </button>
              )}
              {assignee && (
                <span className="inline-flex items-center gap-1 text-ink-2" title={assignee.name}>
                  <Avatar id={assignee.id} name={assignee.name} size={16} />
                  <span className="max-w-[7rem] truncate">{assignee.name}</span>
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {subtasks.length > 0 && openSubtasks && (
        <ul className="border-t border-line bg-black/[0.015] px-3 py-1.5 pl-3.5">
          {subtasks.map((child) => (
            <li key={child.id}>
              <button
                type="button"
                onClick={() => openTask(child.id)}
                className="flex w-full items-start gap-2 rounded px-1 py-1 text-left hover:bg-black/[0.03]"
              >
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                <span className="min-w-0 break-words text-[12.5px] leading-4 text-ink-2">{plainText(taskDates(child).title)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** One of CD, IDD, DD: the label, the date under it, and for the locked two, how long ago it was. */
function DateCell({ label, value, age, locked = false }: { label: string; value: string | null; age?: string; locked?: boolean }) {
  return (
    <span className="min-w-0">
      <span className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
        {label}
        {locked ? <Lock size={8} strokeWidth={2.5} /> : <Pencil size={8} strokeWidth={2.5} className="text-accent" />}
      </span>
      <span className={`block truncate text-[11.5px] font-medium tabular-nums ${value ? 'text-ink-2' : 'text-ink-3'}`}>{value ?? '—'}</span>
      {locked && <span className="block truncate text-[10.5px] tabular-nums text-ink-3">{age ?? ' '}</span>}
    </span>
  );
}

function Tally({ icon, value, title }: { icon: ReactNode; value: number; title: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      {icon}
      {value}
    </span>
  );
}
