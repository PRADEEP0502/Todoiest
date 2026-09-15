import { Flag } from 'lucide-react';
import { usePaged } from '../../hooks/usePaged';
import { useNow } from '../../hooks/useNow';
import { describeDue } from '../../lib/dates';
import { PRIORITY_STYLE, toUiPriority } from '../../lib/priority';
import { plainText } from '../../lib/search';
import { useUi } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { ProjectDot, ShowMore } from '../common/ui';
import { href } from '../../hooks/useRoute';

interface TaskTableProps {
  tasks: TodoistTask[];
  /** Resets paging when the list changes (e.g. a new filter). */
  listKey: string;
  /** Optional right-most column, e.g. days overdue. */
  extra?: { header: string; cell: (task: TodoistTask) => string };
}

/** Flat task list with Project, Section, Due, Priority and Holder columns; paged 50 at a time. */
export function TaskTable({ tasks, listKey, extra }: TaskTableProps) {
  const { index, snapshot } = useWorkspace();
  const { openTask } = useUi();
  const now = useNow(60_000);
  const { visible, shown, total, more } = usePaged(tasks, listKey);
  if (!index || !snapshot) return null;

  // Written out in full so Tailwind can see both class names.
  const cols = extra ? 'md:grid-cols-[minmax(0,1fr)_9rem_9rem_6rem_3.5rem_7rem_4.5rem]' : 'md:grid-cols-[minmax(0,1fr)_9rem_9rem_6rem_3.5rem_7rem]';

  return (
    <div>
      <div className={`hidden gap-3 border-b border-line bg-canvas px-4 py-2 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 md:grid ${cols}`}>
        <span>Task</span>
        <span>Project</span>
        <span>Section</span>
        <span>Due date</span>
        <span>Priority</span>
        <span>Holder</span>
        {extra && <span className="text-right">{extra.header}</span>}
      </div>
      <ul className="divide-y divide-line">
        {visible.map((task) => {
          const project = index.projectById.get(task.project_id);
          const section = task.section_id ? index.sectionById.get(task.section_id) : undefined;
          const parent = task.parent_id ? index.taskById.get(task.parent_id) : undefined;
          const due = describeDue(task.due, now);
          const priority = toUiPriority(task.priority);
          const holder = task.responsible_uid ? snapshot.people[task.responsible_uid]?.name : undefined;
          return (
            <li key={task.id} className={`grid gap-x-3 gap-y-0.5 px-4 py-2.5 hover:bg-canvas/60 ${cols}`}>
              <button type="button" onClick={() => openTask(task.id)} className="min-w-0 text-left">
                <span className="block break-words text-[13.5px] text-ink hover:underline">{plainText(task.content)}</span>
                {parent && <span className="block truncate text-[12px] text-ink-3">↳ {plainText(parent.content)}</span>}
                <span className="mt-0.5 block truncate text-[12px] text-ink-3 md:hidden">
                  {[project?.name, section?.name].filter(Boolean).join(' › ')}
                  {due ? ` · ${due.label}` : ''}
                  {priority < 4 ? ` · P${priority}` : ''}
                  {holder ? ` · ${holder}` : ''}
                  {extra ? ` · ${extra.cell(task)}` : ''}
                </span>
              </button>
              <a href={project ? href.project(project.id) : undefined} className="hidden min-w-0 items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-ink md:flex">
                <ProjectDot color={project?.color} size={7} />
                <span className="truncate">{project?.name ?? '—'}</span>
              </a>
              <a
                href={project ? href.project(project.id, { sectionId: section?.id, taskId: task.id }) : undefined}
                className="hidden truncate text-[12.5px] text-ink-3 hover:text-ink md:block"
              >
                {section?.name ?? '—'}
              </a>
              <span className={`hidden text-[12.5px] md:block ${due?.tone === 'overdue' ? 'font-medium text-p1' : 'text-ink-2'}`}>{due?.label ?? '—'}</span>
              <span className={`hidden items-center gap-0.5 text-[12.5px] font-medium md:flex ${PRIORITY_STYLE[priority].text}`}>
                {priority < 4 && <Flag size={11} strokeWidth={2.5} />}P{priority}
              </span>
              <span className="hidden truncate text-[12.5px] text-ink-2 md:block">{holder ?? '—'}</span>
              {extra && <span className="hidden text-right text-[12.5px] tabular-nums text-ink-2 md:block">{extra.cell(task)}</span>}
            </li>
          );
        })}
      </ul>
      <ShowMore shown={shown} total={total} onMore={more} />
    </div>
  );
}
