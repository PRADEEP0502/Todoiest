import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { BarList } from '../components/charts/BarList';
import { Gate } from '../components/common/Gate';
import { Avatar, Count, EmptyState, MetricStrip, Panel, ProjectDot, type Metric } from '../components/common/ui';
import { TaskRow } from '../components/tasks/TaskRow';
import { useNow } from '../hooks/useNow';
import { href } from '../hooks/useRoute';
import { describeActivity } from '../lib/activity';
import { formatLongDate, formatTime, greeting, toDateKey } from '../lib/dates';
import { taskPath } from '../lib/hierarchy';
import {
  CATEGORIES,
  DATE_CHECKS,
  completedToday,
  describeCategory,
  describeDateCheck,
  hasHolderData,
  holderCounts,
  isDateCheckConfigured,
  metricTasks,
  UNASSIGNED,
} from '../lib/metrics';
import { topProjectsByOpenTasks } from '../lib/projects';
import { byPriorityThenTime, isDueToday, isOverdue } from '../lib/stats';
import { useWorkspace } from '../store/workspace';

const IMPORTANT_LIMIT = 8;
const DAY = 24 * 60 * 60 * 1000;

/** Home stays the same size however many projects exist: numbers → top-5 charts → today → last 24h. */
export function DashboardPage() {
  const { settings } = useWorkspace();
  const now = useNow(60_000);

  return (
    <Gate>
      {({ snapshot, index }) => {
        const rules = settings.rules;
        const todayKey = toDateKey(now);
        const name = settings.displayName.trim() || snapshot.user.full_name.split(' ')[0] || 'there';
        const count = (metric: Parameters<typeof metricTasks>[0]) => metricTasks(metric, snapshot, index, rules, now).length;

        const dueToday = snapshot.tasks.filter((t) => isDueToday(t, todayKey)).length;
        const overdue = snapshot.tasks.filter((t) => isOverdue(t, todayKey)).length;

        const projects = topProjectsByOpenTasks(index, 5);
        const holderStats = hasHolderData(snapshot) ? holderCounts(snapshot, now) : new Map();
        const unassigned = holderStats.get(UNASSIGNED)?.active ?? 0;
        const holders = holderStats.size
          ? [...holderStats]
              .filter(([id, c]) => id !== UNASSIGNED && c.active > 0)
              .sort((a, b) => b[1].active - a[1].active)
              .slice(0, 5)
          : [];

        const important = snapshot.tasks
          .filter((t) => isDueToday(t, todayKey) || isOverdue(t, todayKey))
          .sort((a, b) => Number(isOverdue(b, todayKey)) - Number(isOverdue(a, todayKey)) || byPriorityThenTime(a, b));

        const recent = snapshot.activity.filter((e) => now.getTime() - Date.parse(e.event_date) <= DAY);

        return (
          <div className="space-y-5">
            <div>
              <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">
                {greeting(now)}, {name} 👋
              </h1>
              <p className="mt-0.5 text-[13px] text-ink-2">{formatLongDate(now)}</p>
            </div>

            <MetricStrip
              label="Workspace totals"
              columns="grid-cols-2 sm:grid-cols-5"
              items={[
                { label: 'Total Active Tasks', value: snapshot.tasks.length, href: href.metric('active'), note: `in ${index.orderedProjects.length} projects`, wideOnMobile: true },
                { label: 'Due Today', value: dueToday, href: href.today() },
                { label: 'Overdue', value: overdue, href: href.overdue(), tone: 'danger' },
                { label: 'No Due Date', value: count('no-due'), href: href.metric('no-due') },
                { label: 'Completed', value: snapshot.completedStatus.ok ? completedToday(snapshot, now) : null, href: href.completed(), note: 'today' },
              ]}
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div>
                <SubHeading title="Overdue categories" link={{ to: href.overdue(), label: 'Open Overdue' }} />
                <MetricStrip
                  label="Overdue categories"
                  size="md"
                  columns="grid-cols-4"
                  items={CATEGORIES.map<Metric>((c) => ({
                    label: c.label,
                    value: count(c.id),
                    href: href.metric(c.id),
                    note: shortCategoryNote(c.id, rules),
                    tone: 'danger',
                  }))}
                />
              </div>
              <div>
                <SubHeading title="Date checks" link={{ to: href.settings(), label: 'Configure' }} />
                <MetricStrip
                  label="Date checks"
                  size="md"
                  columns="grid-cols-2"
                  items={DATE_CHECKS.map<Metric>((c) => ({
                    label: c.label,
                    value: isDateCheckConfigured(rules[c.id]) ? count(c.id) : null,
                    href: isDateCheckConfigured(rules[c.id]) ? href.metric(c.id) : href.settings(),
                    note: isDateCheckConfigured(rules[c.id]) ? describeDateCheck(rules[c.id]) : 'Not set up yet',
                  }))}
                />
              </div>
            </div>

            <div className={`grid gap-4 ${holders.length ? 'lg:grid-cols-2' : ''}`}>
              <Panel
                title="Project-wise Active Tasks"
                subtitle={`Top ${projects.length} of ${index.orderedProjects.length} projects by active tasks`}
                footer={<FooterLink to={href.projects()}>View All Projects</FooterLink>}
              >
                {projects.length ? (
                  <BarList
                    label="Top projects by active tasks"
                    unit="active tasks"
                    entries={projects.map(({ project, open }) => ({
                      id: project.id,
                      label: project.name,
                      value: open,
                      href: href.project(project.id),
                      mark: <ProjectDot color={project.color} />,
                      detail: `${index.sectionsByProject.get(project.id)?.length ?? 0} sections`,
                    }))}
                  />
                ) : (
                  <EmptyState title="No active tasks" />
                )}
              </Panel>

              {holders.length > 0 && (
                <Panel title="Holder-wise Active Tasks" subtitle={`Top ${holders.length} people by active tasks${unassigned ? ` · ${unassigned} tasks have no holder` : ''}`} footer={<FooterLink to={href.holders()}>View All Holders</FooterLink>}>
                  <BarList
                    label="Top holders by active tasks"
                    unit="active tasks"
                    entries={holders.map(([id, c]) => {
                      const personName = snapshot.people[id]?.name ?? 'Unknown person';
                      return {
                        id,
                        label: personName,
                        value: c.active,
                        href: href.holder(id),
                        mark: <Avatar id={id} name={personName} size={18} />,
                        detail: `${c.overdue} overdue`,
                      };
                    })}
                  />
                </Panel>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <Panel
                title={
                  <span className="flex items-center gap-2">
                    Today’s Important Tasks <Count>{important.length}</Count>
                  </span>
                }
                subtitle="Overdue first, then due today — most urgent priority first"
                footer={important.length > IMPORTANT_LIMIT ? <FooterLink to={href.today()}>{`${important.length - IMPORTANT_LIMIT} more in Today`}</FooterLink> : undefined}
              >
                {important.length === 0 ? (
                  <EmptyState title="Nothing due today">No overdue or due-today tasks.</EmptyState>
                ) : (
                  important.slice(0, IMPORTANT_LIMIT).map((task) => <TaskRow key={task.id} task={task} path={taskPath(index, task)} />)
                )}
              </Panel>

              <Panel
                title={
                  <span className="flex items-center gap-2">
                    Last 24 Hours <Count>{recent.length}</Count>
                  </span>
                }
                subtitle="From the Todoist activity log"
                footer={<FooterLink to={href.activity()}>Open Activity Logs</FooterLink>}
              >
                {!snapshot.activityStatus.ok ? (
                  <p className="px-2 py-6 text-center text-[13px] text-ink-3">{snapshot.activityStatus.reason}</p>
                ) : recent.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[13px] text-ink-3">No activity in the last 24 hours.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {recent.slice(0, 6).map((event) => {
                      const row = describeActivity(event, snapshot, index);
                      return (
                        <li key={row.id} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-2 px-2 py-2">
                          <span className="pt-px text-[12px] tabular-nums text-ink-3">{formatTime(row.at)}</span>
                          <span className="min-w-0 text-[13px]">
                            <span className="text-ink-2">
                              {row.user} · <span className="font-medium text-ink">{row.action}</span>
                            </span>
                            <span className="block truncate text-ink">{row.kind === 'comment' ? `“${row.subject}”` : row.subject}</span>
                            {(row.context || row.projectName) && (
                              <span className="block truncate text-[12px] text-ink-3">{[row.context, row.projectName].filter(Boolean).join(' · ')}</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        );
      }}
    </Gate>
  );
}

/** Short note under a category number — the full rule is on the metric's own page. */
function shortCategoryNote(id: (typeof CATEGORIES)[number]['id'], rules: Parameters<typeof describeCategory>[1]): string {
  if (rules.categoryBasis !== 'days-overdue') return describeCategory(id, rules);
  return { a5: '1–5 days', a10: '6–10 days', a30: '11–30 days', a30plus: '30+ days' }[id];
}

function SubHeading({ title, link }: { title: string; link: { to: string; label: string } }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <h2 className="text-[13px] font-semibold text-ink-2">{title}</h2>
      <a href={link.to} className="ml-auto text-[12px] text-ink-3 hover:text-accent">
        {link.label}
      </a>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a href={to} className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
      {children} <ArrowRight size={13} />
    </a>
  );
}
