import { ArrowLeft, Users } from 'lucide-react';
import { BarList } from '../components/charts/BarList';
import { Gate } from '../components/common/Gate';
import { Avatar, EmptyState, MetricStrip, Notice, PageHeader, Panel, ProjectDot } from '../components/common/ui';
import { GroupedTasks } from '../components/tasks/GroupedTasks';
import { useNow } from '../hooks/useNow';
import { href, navigate } from '../hooks/useRoute';
import { hasHolderData, holderCounts, UNASSIGNED, type TaskCounts } from '../lib/metrics';
import { byPriorityThenTime } from '../lib/stats';
import type { WorkspaceSnapshot } from '../types/todoist';

const holderName = (snapshot: WorkspaceSnapshot, id: string) => (id === UNASSIGNED ? 'No holder' : (snapshot.people[id]?.name ?? 'Unknown person'));

/** Holder = the person Todoist lists as responsible for the task (task assignee in shared projects). */
export function HoldersPage() {
  const now = useNow(60_000);
  return (
    <Gate>
      {({ snapshot }) => {
        if (!hasHolderData(snapshot)) {
          return (
            <>
              <PageHeader title="Holder Wise" />
              <div className="panel">
                <EmptyState icon={<Users size={26} />} title="No holders in Todoist yet">
                  Todoist only records a holder when a task in a shared project is assigned to someone. Assign tasks in Todoist and they will appear here after the next sync.
                </EmptyState>
              </div>
            </>
          );
        }
        const rows = [...holderCounts(snapshot, now)].sort((a, b) => (a[0] === UNASSIGNED ? 1 : b[0] === UNASSIGNED ? -1 : b[1].active - a[1].active));
        const people = rows.filter(([id]) => id !== UNASSIGNED);

        return (
          <>
            <PageHeader title="Holder Wise" subtitle={`${people.length} people hold active tasks`} />
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="holder-select" className="text-[13px] text-ink-2">Select a person</label>
                <select id="holder-select" className="field w-auto min-w-56" value="" onChange={(e) => e.target.value && navigate(href.holder(e.target.value))}>
                  <option value="">Choose…</option>
                  {rows.map(([id, c]) => (
                    <option key={id} value={id}>
                      {holderName(snapshot, id)} — {c.active} active
                    </option>
                  ))}
                </select>
              </div>

              <Panel title="Holder-wise Active Tasks">
                <BarList
                  label="Active tasks by holder"
                  unit="active tasks"
                  total={snapshot.tasks.length}
                  entries={people.map(([id, c]) => ({
                    id,
                    label: holderName(snapshot, id),
                    value: c.active,
                    href: href.holder(id),
                    mark: <Avatar id={id} name={holderName(snapshot, id)} size={18} />,
                    detail: `${c.overdue} overdue`,
                  }))}
                />
              </Panel>

              <div className="panel overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line bg-canvas text-left text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                      <th className="px-4 py-2 font-semibold">Holder</th>
                      {['Active', 'Overdue', 'Due today', 'No due date', 'Completed (month)', 'Comments'].map((h) => (
                        <th key={h} className="px-3 py-2 text-right font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map(([id, c]) => (
                      <tr key={id} className="cursor-pointer hover:bg-canvas/60" onClick={() => navigate(href.holder(id))}>
                        <td className="px-4 py-2.5">
                          <a href={href.holder(id)} className="flex items-center gap-2 font-medium text-ink hover:underline">
                            <Avatar id={id} name={holderName(snapshot, id)} />
                            {holderName(snapshot, id)}
                          </a>
                        </td>
                        <Num v={c.active} />
                        <Num v={c.overdue} danger />
                        <Num v={c.today} />
                        <Num v={c.noDue} />
                        <Num v={c.completed} />
                        <Num v={c.comments} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      }}
    </Gate>
  );
}

function Num({ v, danger }: { v: number; danger?: boolean }) {
  return <td className={`px-3 py-2.5 text-right tabular-nums ${danger && v > 0 ? 'font-medium text-p1' : v ? 'text-ink' : 'text-ink-3'}`}>{v}</td>;
}

/** Selected user metrics: counts, then their work as Project → Section → Task. */
export function HolderPage({ holderId }: { holderId: string }) {
  const now = useNow(60_000);
  return (
    <Gate>
      {({ snapshot, index }) => {
        const name = holderName(snapshot, holderId);
        const counts: TaskCounts = holderCounts(snapshot, now).get(holderId) ?? { active: 0, overdue: 0, today: 0, noDue: 0, completed: 0, comments: 0 };
        const tasks = snapshot.tasks.filter((t) => (t.responsible_uid ?? UNASSIGNED) === holderId);
        const byProject = new Map<string, number>();
        const bySection = new Map<string, number>();
        for (const t of tasks) {
          byProject.set(t.project_id, (byProject.get(t.project_id) ?? 0) + 1);
          if (t.section_id && index.sectionById.has(t.section_id)) bySection.set(t.section_id, (bySection.get(t.section_id) ?? 0) + 1);
        }
        const topProjects = [...byProject].sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topSections = [...bySection].sort((a, b) => b[1] - a[1]).slice(0, 5);

        return (
          <>
            <a href={href.holders()} className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-ink">
              <ArrowLeft size={13} /> Holder Wise
            </a>
            <PageHeader
              title={
                <span className="flex items-center gap-2.5">
                  <Avatar id={holderId} name={name} size={28} />
                  {name}
                </span>
              }
              subtitle={holderId === UNASSIGNED ? 'Active tasks without a holder in Todoist' : snapshot.people[holderId]?.email}
              actions={
                <select className="field w-auto" value={holderId} onChange={(e) => navigate(href.holder(e.target.value))} aria-label="Switch person">
                  {[...holderCounts(snapshot, now).keys()].map((id) => (
                    <option key={id} value={id}>{holderName(snapshot, id)}</option>
                  ))}
                </select>
              }
            />

            <div className="space-y-4">
              <MetricStrip
                label={`${name}: totals`}
                size="md"
                columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
                items={[
                  { label: 'Active Tasks', value: counts.active, href: '#holder-tasks' },
                  { label: 'Completed', value: counts.completed, href: href.completed(), note: 'this month' },
                  { label: 'Overdue', value: counts.overdue, href: href.overdue(), tone: 'danger' },
                  { label: 'Due Today', value: counts.today, href: href.today() },
                  { label: 'No Due Date', value: counts.noDue, href: '#holder-tasks' },
                  { label: 'Comments', value: holderId === UNASSIGNED ? null : counts.comments, href: href.comments(), note: 'written' },
                ]}
              />

              {tasks.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel title="Project-wise tasks">
                    <BarList
                      label={`${name}: tasks by project`}
                      unit="active tasks"
                      total={tasks.length}
                      entries={topProjects.map(([id, value]) => {
                        const project = index.projectById.get(id);
                        return { id, label: project?.name ?? 'Project', value, href: href.project(id), mark: <ProjectDot color={project?.color} /> };
                      })}
                    />
                  </Panel>
                  <Panel title="Section-wise tasks" subtitle={topSections.length ? undefined : 'These tasks are not in sections'}>
                    {topSections.length > 0 && (
                      <BarList
                        label={`${name}: tasks by section`}
                        unit="active tasks"
                        total={tasks.length}
                        entries={topSections.map(([id, value]) => {
                          const section = index.sectionById.get(id)!;
                          const project = index.projectById.get(section.project_id);
                          return { id, label: section.name, value, href: href.project(section.project_id, { sectionId: id }), mark: <ProjectDot color={project?.color} />, detail: project?.name };
                        })}
                      />
                    )}
                  </Panel>
                </div>
              )}

              <section id="holder-tasks" className="scroll-mt-4">
                <h2 className="mb-2 text-[15px] font-semibold text-ink">Tasks by project and section</h2>
                {holderId === UNASSIGNED && <div className="mb-2"><Notice>Todoist has no holder for these tasks (they are unassigned, or in projects that are not shared).</Notice></div>}
                <div className="panel px-3 py-2">
                  {tasks.length ? (
                    <GroupedTasks tasks={tasks} viewKey={`holder:${holderId}`} compare={byPriorityThenTime} defaultOpen={tasks.length <= 30} />
                  ) : (
                    <EmptyState title="No active tasks" />
                  )}
                </div>
              </section>
            </div>
          </>
        );
      }}
    </Gate>
  );
}
