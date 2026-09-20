import { CircleCheckBig } from 'lucide-react';
import { usePaged } from '../../hooks/usePaged';
import { useNow } from '../../hooks/useNow';
import { formatShortDate, formatTime } from '../../lib/dates';
import { taskPath, type WorkspaceIndex } from '../../lib/hierarchy';
import { plainText } from '../../lib/text';
import type { TodoistTask } from '../../types/todoist';
import { ShowMore } from '../common/ui';

/** Completed tasks, newest first, each with where it lived and when it was done. */
export function CompletedList({ tasks, index, listKey }: { tasks: TodoistTask[]; index: WorkspaceIndex; listKey: string }) {
  const now = useNow(60_000);
  const sorted = [...tasks].sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
  const { visible, shown, total, more } = usePaged(sorted, listKey);
  return (
    <>
      <ul className="divide-y divide-black/[0.05]">
        {visible.map((task) => {
          const at = task.completed_at ? new Date(task.completed_at) : null;
          return (
            <li key={`${task.id}-${task.completed_at}`} className="flex items-start gap-3 px-2 py-2.5">
              <CircleCheckBig size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[14px] text-ink-2 line-through decoration-black/20">{plainText(task.content)}</span>
                <span className="block truncate text-[12px] text-ink-3">{taskPath(index, task).join(' › ')}</span>
              </span>
              {at && (
                <span className="shrink-0 text-right text-[12px] tabular-nums text-ink-3">
                  {formatShortDate(at, now)}
                  <span className="block">{formatTime(at)}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <ShowMore shown={shown} total={total} onMore={more} />
    </>
  );
}
