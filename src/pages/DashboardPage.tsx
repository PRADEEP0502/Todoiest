import {
  AlarmClock,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CalendarOff,
  CalendarSearch,
  CircleCheckBig,
  Clock,
  FolderKanban,
  History,
  Hourglass,
  ListChecks,
  Siren,
  Timer,
  TriangleAlert,
  Users,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { BarList } from '../components/charts/BarList';
import { ActivityIcon } from '../components/common/ActivityIcon';
import { Gate } from '../components/common/Gate';
import { Avatar, Chip, Count, EmptyState, Headline, MetricStrip, Panel, ProjectDot, type Metric } from '../components/common/ui';
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
        const addedThisWeek = snapshot.tasks.filter((t) => t.added_at && now.getTime() - Date.parse(t.added_at) <= 7 * DAY).length;

        return (
          <div className="space-y-5">
            <div>
              <Headline fade={name}>{`${greeting(now)},`}</Headline>
              <p className="mt-1 text-[14px] text-ink-2">{formatLongDate(now)}</p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              {/* Hero card: one big figure with its context, in the style of the reference design. */}
              <a href={href.metric('active')} className="panel group relative flex flex-col px-6 pb-6 pt-5 transition-shadow hover:shadow-pill sm:px-7">
                <div className="flex items-center justify-between">
                  <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#3a3a3a]">Overview</h2>
                  <ArrowUpRight size={16} className="text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </div>
                <span className="mt-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-black/[0.045] text-ink-2">
                  <ListChecks size={26} strokeWidth={1.75} />
                </span>
                <span className="mt-6 text-[15px] font-medium text-ink-2">Total active tasks</span>
                <span className="mt-1 flex items-start gap-2">
                  <span className="num-fade text-[76px] font-semibold leading-[80px] tracking-[-0.055em] sm:text-[88px] sm:leading-[92px]">{snapshot.tasks.length}</span>
                </span>
                <span className="mt-4 flex flex-wrap items-center gap-2">
                  {overdue > 0 ? <Chip tone="bad">{overdue} overdue</Chip> : <Chip tone="good">Nothing overdue</Chip>}
                  {addedThisWeek > 0 && <Chip tone="good">↑ {addedThisWeek} added this week</Chip>}
                  <span className="text-[13px] text-ink-3">in {index.orderedProjects.length} projects</span>
                </span>
              </a>

              <MetricStrip
                label="Workspace totals"
                columns="grid-cols-2"
                items={[
                  { label: 'Due Today', icon: <CalendarCheck />, iconTone: 'info', value: dueToday, href: href.today(), note: 'tasks due today' },
                  { label: 'Overdue', icon: <AlarmClock />, value: overdue, href: href.overdue(), tone: 'danger', note: 'past due date' },
                  { label: 'No Due Date', icon: <CalendarOff />, iconTone: 'warn', value: count('no-due'), href: href.metric('no-due'), note: 'active tasks without a date' },
                  { label: 'Completed', icon: <CircleCheckBig />, iconTone: 'good', value: snapshot.completedStatus.ok ? completedToday(snapshot, now) : null, href: href.completed(), note: 'completed today' },
                ]}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div>
                <SubHeading icon={<TriangleAlert />} title="Overdue categories" link={{ to: href.overdue(), label: 'Open Overdue' }} />
                <MetricStrip
                  label="Overdue categories"
                  size="md"
                  columns="grid-cols-4"
                  items={CATEGORIES.map<Metric>((c) => ({
                    label: c.label,
                    icon: CATEGORY_ICON[c.id],
                    value: count(c.id),
                    href: href.metric(c.id),
                    note: shortCategoryNote(c.id, rules),
                    tone: 'danger',
                  }))}
                />
              </div>
              <div>
                <SubHeading icon={<CalendarSearch />} title="Date checks" link={{ to: href.settings(), label: 'Configure' }} />
                <MetricStrip
                  label="Date checks"
                  size="md"
                  columns="grid-cols-2"
                  items={DATE_CHECKS.map<Metric>((c) => ({
                    label: c.label,
                    icon: <CalendarSearch />,
                    iconTone: 'warn',
                    value: isDateCheckConfigured(rules[c.id]) ? count(c.id) : null,
                    href: isDateCheckConfigured(rules[c.id]) ? href.metric(c.id) : href.settings(),
                    note: isDateCheckConfigured(rules[c.id]) ? describeDateCheck(rules[c.id]) : 'Choose a rule in Settings',
                  }))}
                />
              </div>
            </div>

            <div className={`grid gap-4 ${holders.length ? 'lg:grid-cols-2' : ''}`}>
              <Panel
                title="Project-wise Active Tasks"
                icon={<FolderKanban />}
                iconTone="good"
                subtitle={`Top ${projects.length} of ${index.orderedProjects.length} projects by active tasks`}
                actions={<HeaderLink to={href.projects()}>View all</HeaderLink>}
              >
                {projects.length ? (
                  <BarList
                    label="Top projects by active tasks"
                    unit="active tasks"
                    total={snapshot.tasks.length}
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
                <Panel
                  title="Holder-wise Active Tasks"
                  icon={<Users />}
                  iconTone="info"
                  subtitle={`Top ${holders.length} people by active tasks${unassigned ? ` · ${unassigned} tasks have no holder` : ''}`}
                  actions={<HeaderLink to={href.holders()}>View all</HeaderLink>}
                >
                  <BarList
                    label="Top holders by active tasks"
                    unit="active tasks"
                    total={snapshot.tasks.length}
                    entries={holders.map(([id, c]) => {
                      const personName = snapshot.people[id]?.name ?? 'Unknown person';
                      return {
                        id,
                        label: personName,
                        value: c.active,
                        href: href.holder(id),
                        mark: <Avatar id={id} name={personName} size={22} />,
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
                icon={<Zap />}
                iconTone="warn"
                subtitle="Overdue first, then due today — most urgent priority first"
                actions={important.length > IMPORTANT_LIMIT ? <HeaderLink to={href.today()}>{`+${important.length - IMPORTANT_LIMIT} more`}</HeaderLink> : undefined}
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
                icon={<History />}
                subtitle="From the Todoist activity log"
                actions={<HeaderLink to={href.activity()}>View all</HeaderLink>}
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
                        <li key={row.id} className="flex items-start gap-3 px-2 py-2.5">
                          <span className="pt-0.5">
                            <ActivityIcon row={row} />
                          </span>
                          <span className="min-w-0 flex-1 text-[13px]">
                            <span className="flex items-baseline gap-2">
                              <span className="min-w-0 flex-1 truncate text-ink-2">
                                {row.user} · <span className="font-medium text-ink">{row.action}</span>
                              </span>
                              <span className="shrink-0 text-[12px] tabular-nums text-ink-3">{formatTime(row.at)}</span>
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

/** Icons escalate with lateness: a clock, a timer, an hourglass, then a siren. */
const CATEGORY_ICON: Record<(typeof CATEGORIES)[number]['id'], ReactNode> = {
  a5: <Clock />,
  a10: <Timer />,
  a30: <Hourglass />,
  a30plus: <Siren />,
};

/** Short note under a category number — the full rule is on the metric's own page. */
function shortCategoryNote(id: (typeof CATEGORIES)[number]['id'], rules: Parameters<typeof describeCategory>[1]): string {
  if (rules.categoryBasis !== 'days-overdue') return describeCategory(id, rules);
  return { a5: '1–5 days', a10: '6–10 days', a30: '11–30 days', a30plus: '30+ days' }[id];
}

function SubHeading({ title, icon, link }: { title: string; icon: ReactNode; link: { to: string; label: string } }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span aria-hidden className="text-ink-3 [&_svg]:h-[15px] [&_svg]:w-[15px]">{icon}</span>
      <h2 className="text-[13.5px] font-semibold text-ink-2">{title}</h2>
      <a href={link.to} className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-ink">
        {link.label} <ArrowRight size={12} />
      </a>
    </div>
  );
}

/** Small pill link in a card header — keeps cards compact instead of adding a footer strip. */
function HeaderLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <a
      href={to}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-black/[0.045] px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-black/[0.08] hover:text-ink"
    >
      {children} <ArrowRight size={13} />
    </a>
  );
}
