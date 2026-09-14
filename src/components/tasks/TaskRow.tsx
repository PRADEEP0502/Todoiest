import { Check, Flag, GitBranch, MessageSquare, Tag, User } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNow } from '../../hooks/useNow';
import { describeDue, dueTime } from '../../lib/dates';
import { PRIORITY_STYLE, toUiPriority } from '../../lib/priority';
import { plainText } from '../../lib/search';
import { useUi } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { Chevron } from '../common/ui';

interface TaskRowProps {
  task: TodoistTask;
  depth?: number;
  /** Show "Project › Section" under the task (for views that mix projects). */
  path?: string[];
  subtaskCount?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Hide the due date when the surrounding view already groups by date. */
  hideDue?: boolean;
}

const TONE_CLASS = { overdue: 'text-p1', today: 'text-accent', soon: 'text-ink-2', later: 'text-ink-3' } as const;

export function TaskRow({ task, depth = 0, path, subtaskCount = 0, collapsed = false, onToggle, hideDue }: TaskRowProps) {
  const { completeTask, snapshot } = useWorkspace();
  const { openTask } = useUi();
  const now = useNow();
  const [checking, setChecking] = useState(false);

  const priority = toUiPriority(task.priority);
  const style = PRIORITY_STYLE[priority];
  const due = hideDue ? null : describeDue(task.due, now);
  const assignee = task.responsible_uid ? snapshot?.collaborators[task.responsible_uid] : undefined;

  const meta: ReactNode[] = [];
  if (due) meta.push(<span key="due" className={`font-medium ${TONE_CLASS[due.tone]}`}>{due.label}</span>);
  else if (hideDue && dueTime(task.due)) meta.push(<span key="time" className="font-medium text-ink-2">{dueTime(task.due)}</span>);
  if (priority < 4)
    meta.push(
      <span key="p" className={`inline-flex items-center gap-0.5 font-medium ${style.text}`}>
        <Flag size={11} strokeWidth={2.5} />
        {style.label}
      </span>,
    );
  if (task.note_count > 0)
    meta.push(
      <span key="c" className="inline-flex items-center gap-1" title={`${task.note_count} comments`}>
        <MessageSquare size={11} />
        {task.note_count}
      </span>,
    );
  if (subtaskCount > 0)
    meta.push(
      <span key="s" className="inline-flex items-center gap-1" title={`${subtaskCount} subtasks`}>
        <GitBranch size={11} />
        {subtaskCount}
      </span>,
    );
  for (const label of task.labels)
    meta.push(
      <span key={`l-${label}`} className="inline-flex items-center gap-0.5">
        <Tag size={10} />
        {label}
      </span>,
    );
  if (assignee)
    meta.push(
      <span key="a" className="inline-flex items-center gap-1">
        <User size={11} />
        {assignee.name}
      </span>,
    );

  const complete = () => {
    if (checking) return;
    setChecking(true);
    // A brief tick so the click registers visually before the row leaves the list.
    setTimeout(() => completeTask(task.id), 180);
  };

  return (
    <div
      className="group relative flex items-start gap-2 rounded-md py-2 pr-2 transition-colors hover:bg-canvas"
      style={{ paddingLeft: depth * 28 + 4 }}
    >
      <span className="flex h-5 w-4 shrink-0 items-center justify-center">
        {onToggle && subtaskCount > 0 && (
          <button type="button" onClick={onToggle} aria-label={collapsed ? 'Show subtasks' : 'Hide subtasks'} className="rounded hover:bg-hover">
            <Chevron collapsed={collapsed} />
          </button>
        )}
      </span>

      <button
        type="button"
        role="checkbox"
        aria-checked={checking}
        aria-label={`Complete ${task.content}`}
        onClick={complete}
        className={`mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${style.ring} ${checking ? 'bg-accent !border-accent' : `${style.fill} hover:bg-accent-soft`}`}
      >
        <Check size={11} strokeWidth={3} className={checking ? 'text-white' : 'text-ink-3 opacity-0 group-hover:opacity-60'} />
      </button>

      <button type="button" onClick={() => openTask(task.id)} className="min-w-0 flex-1 text-left">
        <span className={`block break-words text-[14px] leading-5 ${checking ? 'text-ink-3 line-through' : 'text-ink'}`}>
          {plainText(task.content)}
        </span>
        {(meta.length > 0 || path) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] leading-4 text-ink-3">
            {meta}
            {path && path.length > 0 && <span className="truncate">{path.join(' › ')}</span>}
          </span>
        )}
      </button>
    </div>
  );
}
