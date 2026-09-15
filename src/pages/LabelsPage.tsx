import { ArrowLeft, Tag } from 'lucide-react';
import { Gate } from '../components/common/Gate';
import { EmptyState, MetricStrip, PageHeader } from '../components/common/ui';
import { GroupedTasks } from '../components/tasks/GroupedTasks';
import { useNow } from '../hooks/useNow';
import { href, navigate } from '../hooks/useRoute';
import { labelRows } from '../lib/metrics';
import { projectColor } from '../lib/priority';
import { byPriorityThenTime } from '../lib/stats';

export function LabelsPage() {
  const now = useNow(60_000);
  return (
    <Gate>
      {({ snapshot }) => {
        const rows = labelRows(snapshot, now);
        return (
          <>
            <PageHeader title="Label Wise" subtitle={`${rows.length} label${rows.length === 1 ? '' : 's'} from Todoist`} />
            {rows.length === 0 ? (
              <div className="panel">
                <EmptyState icon={<Tag size={26} />} title="No labels">Labels created in Todoist appear here after the next sync.</EmptyState>
              </div>
            ) : (
              <div className="panel overflow-x-auto">
                <table className="w-full min-w-[520px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line bg-canvas text-left text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">
                      <th className="px-4 py-2 font-semibold">Label</th>
                      <th className="px-3 py-2 text-right font-semibold">Task count</th>
                      <th className="px-3 py-2 text-right font-semibold">Overdue</th>
                      <th className="px-3 py-2 text-right font-semibold">Completed (month)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((row) => (
                      <tr key={row.name} className="cursor-pointer hover:bg-canvas/60" onClick={() => navigate(href.label(row.name))}>
                        <td className="px-4 py-2.5">
                          <a href={href.label(row.name)} className="inline-flex items-center gap-2 font-medium text-ink hover:underline">
                            <Tag size={13} style={{ color: projectColor(row.color ?? 'grey') }} />
                            {row.name}
                          </a>
                        </td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${row.active ? 'text-ink' : 'text-ink-3'}`}>{row.active}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${row.overdue ? 'font-medium text-p1' : 'text-ink-3'}`}>{row.overdue}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${row.completed ? 'text-ink' : 'text-ink-3'}`}>{snapshot.completedStatus.ok ? row.completed : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        );
      }}
    </Gate>
  );
}

export function LabelPage({ label }: { label: string }) {
  const now = useNow(60_000);
  return (
    <Gate>
      {({ snapshot }) => {
        const same = (l: string) => l.toLocaleLowerCase() === label.toLocaleLowerCase();
        const row = labelRows(snapshot, now).find((r) => same(r.name));
        const tasks = snapshot.tasks.filter((t) => t.labels.some(same));
        return (
          <>
            <a href={href.labels()} className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-ink">
              <ArrowLeft size={13} /> Label Wise
            </a>
            <PageHeader
              title={
                <span className="flex items-center gap-2">
                  <Tag size={18} style={{ color: projectColor(row?.color ?? 'grey') }} />
                  {row?.name ?? label}
                </span>
              }
            />
            <div className="mb-4 sm:max-w-lg">
              <MetricStrip
                label="Label totals"
                size="md"
                columns="grid-cols-3"
                items={[
                  { label: 'Task count', value: row?.active ?? 0, href: '#label-tasks' },
                  { label: 'Overdue', value: row?.overdue ?? 0, href: href.overdue(), tone: 'danger' },
                  { label: 'Completed', value: snapshot.completedStatus.ok ? (row?.completed ?? 0) : null, href: href.completed(), note: 'this month' },
                ]}
              />
            </div>
            <div id="label-tasks" className="panel px-3 py-2">
              {tasks.length ? (
                <GroupedTasks tasks={tasks} viewKey={`label:${label}`} compare={byPriorityThenTime} defaultOpen={tasks.length <= 30} />
              ) : (
                <EmptyState title="No active tasks with this label" />
              )}
            </div>
          </>
        );
      }}
    </Gate>
  );
}
