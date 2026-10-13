import { Check } from 'lucide-react';
import { useSelection } from '../../store/selection';
import { plainText } from '../../lib/text';
import type { TodoistTask } from '../../types/todoist';

/**
 * The box that picks a task out for an action on many at once.
 *
 * It keeps out of the way until it is wanted: on a pointer it appears when the task is hovered, and
 * once anything is picked every box stays visible so the rest can be added quickly. A touch screen
 * has no hover, so there the boxes are always there.
 */
export function SelectBox({ task, className = '' }: { task: TodoistTask; className?: string }) {
  const { has, toggle, count } = useSelection();
  const picked = has(task.id);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={picked}
      aria-label={`Select “${plainText(task.content)}”`}
      title="Select for a bulk action"
      onClick={(e) => {
        e.stopPropagation();
        toggle(task.id);
      }}
      className={`relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all before:absolute before:-inset-2.5 before:content-[''] ${
        picked ? 'border-accent bg-accent text-white' : 'border-line-strong bg-surface text-transparent hover:border-ink-3'
      } ${picked || count > 0 ? '' : 'opacity-0 touch:opacity-100 group-hover:opacity-100 group-hover/card:opacity-100 focus:opacity-100'} ${className}`}
    >
      <Check size={12} strokeWidth={3} />
    </button>
  );
}
