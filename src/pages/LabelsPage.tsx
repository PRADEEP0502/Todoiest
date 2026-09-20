import { useState } from 'react';
import { AlarmClock, ArrowLeft, CircleCheckBig, ListChecks, Tag } from 'lucide-react';
import { Gate } from '../components/common/Gate';
import { EmptyState, MetricStrip, PageHeader } from '../components/common/ui';
import { GroupedTasks } from '../components/tasks/GroupedTasks';
import { useNow } from '../hooks/useNow';
import { href, navigate } from '../hooks/useRoute';
import { labelRows } from '../lib/metrics';
import { projectColor } from '../lib/priority';
import { CompletedList } from '../components/tasks/CompletedList';
import { startOfMonth, toDateKey } from '../lib/dates';
import { byPriorityThenTime, completedSince, isOverdue } from '../lib/stats';

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
              <>
              {/* Phones: one card per label instead of a table that needs sideways scrolling. */}
              <ul className="space-y-2.5 sm:hidden">
                {rows.map((row) => (
                  <li key={row.name}>
                    <a href={href.label(row.name)} className="panel block px-4 py-3.5">
                      <span className="flex items-center gap-2">
                        <Tag size={14} style={{ color: projectColor(row.color ?? 'grey') }} />
                        <span className="min-w-0 break-words text-[14px] font-semibold text-ink">{row.name}</span>
                      </span>
                      <span className="mt-3 grid grid-cols-3 gap-3">
                        {[
                          ['Task count', row.active, false],
                          ['Overdue', row.overdue, true],
                          ['Completed', snapshot.completedStatus.ok ? row.completed : null, false],
                        ].map(([label, value, danger]) => (
                          <span key={String(label)} className="block">
                            <span className="block text-2xs leading-4 text-ink-3">{label}</span>
                            <span className={`block text-[17px] font-semibold tabular-nums ${danger && Number(value) > 0 ? 'text-p1' : value ? 'text-ink' : 'text-ink-3'}`}>
                              {value === null ? '—' : Number(value)}
                            </span>
                          </span>
                        ))}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="panel hidden overflow-x-auto sm:block">
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
              </>
            )}
          </>
        );
      }}
    </Gate>
  );
}

type LabelView = 'active' | 'overdue' | 'completed';
const LABEL_VIEW_TITLE: Record<LabelView, string> = { active: 'Active tasks', overdue: 'Overdue tasks', completed: 'Completed this month' };

export function LabelPage({ label }: { label: string }) {
  const now = useNow(60_000);
  const [show, setShow] = useState<LabelView>('active');
  return (
    <Gate>
      {({ snapshot, index }) => {
        const same = (l: string) => l.toLocaleLowerCase() === label.toLocaleLowerCase();
        const row = labelRows(snapshot, now).find((r) => same(r.name));
        const tasks = snapshot.tasks.filter((t) => t.labels.some(same));
        const overdue = tasks.filter((t) => isOverdue(t, toDateKey(now)));
        const completed = completedSince(snapshot.completed, startOfMonth(now)).filter((t) => t.labels.some(same));
        const listed = show === 'overdue' ? overdue : tasks;
        const count = show === 'completed' ? completed.length : listed.length;
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
                columns="grid-cols-1 sm:grid-cols-3"
                items={[
                  { label: 'Task count', icon: <ListChecks />, value: tasks.length, onSelect: () => setShow('active'), selected: show === 'active' },
                  { label: 'Overdue', icon: <AlarmClock />, value: overdue.length, tone: 'danger', onSelect: () => setShow('overdue'), selected: show === 'overdue' },
                  {
                    label: 'Completed',
                    icon: <CircleCheckBig />,
                    iconTone: 'good',
                    value: snapshot.completedStatus.ok ? completed.length : null,
                    note: 'this month',
                    onSelect: () => setShow('completed'),
                    selected: show === 'completed',
                  },
                ]}
              />
            </div>
            <h2 className="mb-2.5 text-[15px] font-semibold text-ink">
              {LABEL_VIEW_TITLE[show]} <span className="font-normal text-ink-3">· {count}</span>
            </h2>
            <div className="panel px-3 py-2">
              {count === 0 ? (
                <EmptyState title={`${LABEL_VIEW_TITLE[show]}: none with this label`} />
              ) : show === 'completed' ? (
                <CompletedList tasks={completed} index={index} listKey={`label:${label}`} />
              ) : (
                <GroupedTasks tasks={listed} viewKey={`label:${label}:${show}`} compare={byPriorityThenTime} defaultOpen={listed.length <= 30} />
              )}
            </div>
          </>
        );
      }}
    </Gate>
  );
}
