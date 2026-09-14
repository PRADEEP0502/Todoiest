import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Gate } from '../components/common/Gate';
import { EmptyState, PageHeader, ProjectDot } from '../components/common/ui';
import { useNow } from '../hooks/useNow';
import { href } from '../hooks/useRoute';
import { formatDayHeading, formatTime, toDateKey } from '../lib/dates';
import { plainText } from '../lib/search';
import { completedRangeStart, completedSince, type CompletedRange } from '../lib/stats';
import { useWorkspace } from '../store/workspace';
import type { TodoistTask } from '../types/todoist';

const RANGES: [CompletedRange, string][] = [
  ['today', 'Today'],
  ['week', 'This Week'],
  ['month', 'This Month'],
];

export function CompletedPage() {
  const [range, setRange] = useState<CompletedRange>('week');
  const now = useNow(60_000);
  const { reopenTask } = useWorkspace();

  return (
    <Gate>
      {({ snapshot, index }) => {
        const tasks = completedSince(snapshot.completed, completedRangeStart(range, now));
        const days = new Map<string, TodoistTask[]>();
        for (const task of tasks) {
          const key = toDateKey(new Date(task.completed_at!));
          days.set(key, [...(days.get(key) ?? []), task]);
        }

        return (
          <>
            <PageHeader
              title="Completed"
              subtitle={`${tasks.length} task${tasks.length === 1 ? '' : 's'} completed`}
              actions={
                <div className="inline-flex rounded-md border border-line bg-surface p-0.5" role="tablist" aria-label="Completed range">
                  {RANGES.map(([value, label]) => (
                    <button
                      key={value}
                      role="tab"
                      aria-selected={range === value}
                      onClick={() => setRange(value)}
                      className={`h-7 rounded px-3 text-[12.5px] font-medium transition-colors ${range === value ? 'bg-ink text-white' : 'text-ink-2 hover:bg-hover'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
            />

            {tasks.length === 0 ? (
              <div className="panel">
                <EmptyState icon={<CheckCircle2 size={26} />} title="No completed tasks in this period" />
              </div>
            ) : (
              <div className="panel overflow-hidden">
                <div className="hidden grid-cols-[1.25rem_minmax(0,1fr)_10rem_10rem_4.5rem_2rem] gap-3 border-b border-line bg-canvas px-4 py-2 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 md:grid">
                  <span />
                  <span>Task</span>
                  <span>Project</span>
                  <span>Section</span>
                  <span className="text-right">Time</span>
                  <span />
                </div>
                {[...days.entries()].map(([key, list]) => (
                  <div key={key}>
                    <div className="border-b border-line bg-canvas/60 px-4 py-1.5 text-[12px] font-semibold text-ink-2">
                      {formatDayHeading(new Date(list[0].completed_at!), now)} <span className="font-normal text-ink-3">· {list.length}</span>
                    </div>
                    {list.map((task) => {
                      const project = index.projectById.get(task.project_id);
                      const section = task.section_id ? index.sectionById.get(task.section_id) : undefined;
                      return (
                        <div
                          key={`${task.id}-${task.completed_at}`}
                          className="group grid grid-cols-[1.25rem_minmax(0,1fr)_2rem] items-start gap-x-2 border-b border-line px-4 py-2.5 last:border-b-0 md:grid-cols-[1.25rem_minmax(0,1fr)_10rem_10rem_4.5rem_2rem] md:items-center md:gap-x-3"
                        >
                          <CheckCircle2 size={16} className="mt-0.5 text-accent md:mt-0" />
                          <div className="min-w-0">
                            <div className="break-words text-[13.5px] text-ink-2">{plainText(task.content)}</div>
                            <div className="mt-0.5 truncate text-[12px] text-ink-3 md:hidden">
                              {[project?.name, section?.name].filter(Boolean).join(' › ')} · {formatTime(new Date(task.completed_at!))}
                            </div>
                          </div>
                          <a href={project ? href.project(project.id) : undefined} className="hidden min-w-0 items-center gap-1.5 truncate text-[12.5px] text-ink-2 hover:text-ink md:flex">
                            <ProjectDot color={project?.color} size={7} />
                            <span className="truncate">{project?.name ?? '—'}</span>
                          </a>
                          <span className="hidden truncate text-[12.5px] text-ink-3 md:block">{section?.name ?? '—'}</span>
                          <span className="hidden text-right text-[12px] tabular-nums text-ink-3 md:block">{formatTime(new Date(task.completed_at!))}</span>
                          <button
                            type="button"
                            onClick={() => reopenTask(task)}
                            className="icon-btn opacity-70 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                            title="Reopen task"
                            aria-label={`Reopen ${task.content}`}
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        );
      }}
    </Gate>
  );
}
