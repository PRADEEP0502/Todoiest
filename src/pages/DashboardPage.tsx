import { ArrowRight, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Gate } from '../components/common/Gate';
import { Count, EmptyState, ProjectDot } from '../components/common/ui';
import { TaskRow } from '../components/tasks/TaskRow';
import { useNow } from '../hooks/useNow';
import { href } from '../hooks/useRoute';
import { formatLongDate, greeting, startOfMonth, toDateKey } from '../lib/dates';
import { taskPath } from '../lib/hierarchy';
import { byPriorityThenTime, completedSince, dashboardStats, isDueToday, isOverdue } from '../lib/stats';
import { useWorkspace } from '../store/workspace';

const TODAY_LIMIT = 8;

export function DashboardPage() {
  const { settings } = useWorkspace();
  const now = useNow(60_000);

  return (
    <Gate>
      {({ snapshot, index }) => {
        const todayKey = toDateKey(now);
        const stats = dashboardStats(snapshot, now);
        const name = settings.displayName.trim() || snapshot.user.full_name.split(' ')[0] || 'there';

        const todayWork = snapshot.tasks
          .filter((t) => isDueToday(t, todayKey) || isOverdue(t, todayKey))
          .sort((a, b) => Number(isOverdue(b, todayKey)) - Number(isOverdue(a, todayKey)) || byPriorityThenTime(a, b));

        const done = new Map<string, number>();
        for (const t of completedSince(snapshot.completed, startOfMonth(now))) done.set(t.project_id, (done.get(t.project_id) ?? 0) + 1);

        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">
                {greeting(now)}, {name} 👋
              </h1>
              <p className="mt-0.5 text-[13px] text-ink-2">{formatLongDate(now)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <Stat to={href.projects()} label="Total Tasks" value={stats.total} note={`across ${index.orderedProjects.length} projects`} />
              <Stat to={href.today()} label="Today" value={stats.today} note="due today" />
              <Stat to={href.today()} label="Overdue" value={stats.overdue} note="past due date" tone={stats.overdue > 0 ? 'text-p1' : undefined} />
              <Stat to={href.completed()} label="Completed" value={stats.completedToday} note={`today · ${stats.completedThisWeek} this week`} />
            </div>

            <section>
              <SectionHeading title="Today’s Work" count={todayWork.length} link={todayWork.length > TODAY_LIMIT ? { to: href.today(), label: 'View all' } : undefined} />
              <div className="panel px-2 py-1.5 sm:px-3">
                {todayWork.length === 0 ? (
                  <EmptyState title="Nothing due today">No overdue or due-today tasks. Enjoy the clear day.</EmptyState>
                ) : (
                  <>
                    {todayWork.slice(0, TODAY_LIMIT).map((task) => (
                      <TaskRow key={task.id} task={task} path={taskPath(index, task)} />
                    ))}
                    {todayWork.length > TODAY_LIMIT && (
                      <a href={href.today()} className="flex items-center gap-1 px-7 py-2 text-[13px] font-medium text-accent hover:underline">
                        {todayWork.length - TODAY_LIMIT} more in Today <ArrowRight size={13} />
                      </a>
                    )}
                  </>
                )}
              </div>
            </section>

            <section>
              <SectionHeading title="Projects" count={index.orderedProjects.length} link={{ to: href.projects(), label: 'All projects' }} />
              <div className="panel divide-y divide-line">
                {index.orderedProjects.map(({ project, depth }) => {
                  const open = index.openByProject.get(project.id) ?? 0;
                  const finished = done.get(project.id) ?? 0;
                  const pct = open + finished > 0 ? Math.round((finished / (open + finished)) * 100) : 0;
                  return (
                    <a key={project.id} href={href.project(project.id)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas">
                      <span className="flex min-w-0 flex-1 items-center gap-2.5" style={{ paddingLeft: depth * 16 }}>
                        {project.inbox_project ? <Inbox size={13} className="shrink-0 text-ink-3" /> : <ProjectDot color={project.color} />}
                        <span className="truncate text-[13.5px] text-ink">{project.name}</span>
                      </span>
                      <span className="w-16 text-right text-[12px] tabular-nums text-ink-2">{open} open</span>
                      <span className="hidden w-32 items-center gap-2 sm:flex" title={`${finished} completed this month`}>
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-hover">
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="w-8 text-right text-2xs tabular-nums text-ink-3">{pct}%</span>
                      </span>
                    </a>
                  );
                })}
              </div>
              <p className="mt-2 text-2xs text-ink-3">Progress = tasks completed this month ÷ (completed this month + still open).</p>
            </section>
          </div>
        );
      }}
    </Gate>
  );
}

function Stat({ to, label, value, note, tone }: { to: string; label: string; value: number; note: string; tone?: string }) {
  return (
    <a href={to} className="panel block px-4 py-3 transition-colors hover:border-line-strong">
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div className={`mt-1 text-[26px] font-semibold leading-8 tabular-nums tracking-[-0.02em] ${tone ?? 'text-ink'}`}>{value}</div>
      <div className="truncate text-2xs text-ink-3">{note}</div>
    </a>
  );
}

function SectionHeading({ title, count, link }: { title: string; count?: number; link?: { to: string; label: string } }): ReactNode {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
      {count !== undefined && <Count>{count}</Count>}
      {link && (
        <a href={link.to} className="ml-auto inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-accent">
          {link.label} <ArrowRight size={13} />
        </a>
      )}
    </div>
  );
}
