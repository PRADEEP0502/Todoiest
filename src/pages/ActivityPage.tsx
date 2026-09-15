import { History } from 'lucide-react';
import { useState } from 'react';
import { Gate } from '../components/common/Gate';
import { EmptyState, Notice, PageHeader, ShowMore, Tabs } from '../components/common/ui';
import { usePaged } from '../hooks/usePaged';
import { useNow } from '../hooks/useNow';
import { href } from '../hooks/useRoute';
import { describeActivity, type ActivityKind, type ActivityRow } from '../lib/activity';
import { formatDayHeading, formatTime, toDateKey } from '../lib/dates';
import { ACTIVITY_WINDOW_DAYS } from '../services/todoist';
import { useUi } from '../store/ui';
import { useWorkspace } from '../store/workspace';

type Range = '24h' | 'week';
type KindFilter = 'all' | 'completed' | 'added' | 'updated' | 'comment';

const KIND_MATCH: Record<KindFilter, (k: ActivityKind) => boolean> = {
  all: () => true,
  completed: (k) => k === 'completed',
  added: (k) => k === 'added',
  updated: (k) => k === 'updated' || k === 'reopened' || k === 'deleted',
  comment: (k) => k === 'comment',
};

const ACTION_TONE: Partial<Record<ActivityKind, string>> = {
  completed: 'text-accent',
  deleted: 'text-danger',
  comment: 'text-p3',
};

export function ActivityPage() {
  const now = useNow(60_000);
  const [range, setRange] = useState<Range>('24h');
  const [kind, setKind] = useState<KindFilter>('all');
  const { openTask } = useUi();
  const { index } = useWorkspace();

  return (
    <Gate>
      {({ snapshot, index: idx }) => {
        const since = now.getTime() - (range === '24h' ? 1 : ACTIVITY_WINDOW_DAYS) * 24 * 60 * 60 * 1000;
        const all = snapshot.activity.filter((e) => Date.parse(e.event_date) >= since).map((e) => describeActivity(e, snapshot, idx));
        const rows = all.filter((r) => KIND_MATCH[kind](r.kind));
        const countOf = (k: KindFilter) => all.filter((r) => KIND_MATCH[k](r.kind)).length;

        return (
          <>
            <PageHeader title="Activity Logs" subtitle="Changes recorded by Todoist — who did what, and when" />

            {!snapshot.activityStatus.ok ? (
              <Notice tone="warning">{snapshot.activityStatus.reason} Nothing is shown here rather than an invented log.</Notice>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Tabs label="Time range" value={range} onChange={setRange} options={[{ value: '24h', label: 'Last 24 hours' }, { value: 'week', label: `Last ${ACTIVITY_WINDOW_DAYS} days` }]} />
                  <Tabs
                    label="Type"
                    value={kind}
                    onChange={setKind}
                    options={[
                      { value: 'all', label: 'All', count: countOf('all') },
                      { value: 'completed', label: 'Completed', count: countOf('completed') },
                      { value: 'added', label: 'Added', count: countOf('added') },
                      { value: 'updated', label: 'Changed', count: countOf('updated') },
                      { value: 'comment', label: 'Comments', count: countOf('comment') },
                    ]}
                  />
                </div>
                <div className="panel overflow-hidden">
                  {rows.length === 0 ? (
                    <EmptyState icon={<History size={26} />} title="No activity in this period" />
                  ) : (
                    <ActivityTable rows={rows} listKey={`${range}:${kind}`} now={now} onTask={(id) => index?.taskById.has(id) && openTask(id)} />
                  )}
                </div>
                <p className="text-2xs text-ink-3">
                  Source: Todoist activity log. Todoist records task additions, completions, deletions and changes to name, description, due date and holder, plus comments. How far back it goes depends on the Todoist plan.
                </p>
              </div>
            )}
          </>
        );
      }}
    </Gate>
  );
}

function ActivityTable({ rows, listKey, now, onTask }: { rows: ActivityRow[]; listKey: string; now: Date; onTask: (id: string) => void }) {
  const { visible, shown, total, more } = usePaged(rows, listKey);
  return (
    <>
      <div className="hidden grid-cols-[5rem_9rem_9rem_minmax(0,1fr)_10rem] gap-3 border-b border-line bg-canvas px-4 py-2 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 md:grid">
        <span>Time</span>
        <span>User</span>
        <span>Action</span>
        <span>Task</span>
        <span>Project</span>
      </div>
      {visible.map((row, i) => {
        const heading = i === 0 || toDateKey(visible[i - 1].at) !== toDateKey(row.at) ? formatDayHeading(row.at, now) : null;
        return (
          <div key={row.id}>
            {heading && <div className="border-b border-line bg-canvas/60 px-4 py-1.5 text-[12px] font-semibold text-ink-2">{heading}</div>}
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-b border-line px-4 py-2.5 last:border-b-0 md:grid-cols-[5rem_9rem_9rem_minmax(0,1fr)_10rem] md:items-start">
              <span className="text-[12.5px] tabular-nums text-ink-3 md:row-auto">{formatTime(row.at)}</span>
              <span className="min-w-0 md:contents">
                <span className="block truncate text-[13px] text-ink-2">
                  {row.user}
                  <span className="md:hidden"> · <span className={`font-medium ${ACTION_TONE[row.kind] ?? 'text-ink'}`}>{row.action}</span></span>
                </span>
                <span className={`hidden text-[13px] font-medium md:block ${ACTION_TONE[row.kind] ?? 'text-ink'}`}>{row.action}</span>
                <span className="block min-w-0">
                  {row.taskId ? (
                    <button type="button" onClick={() => onTask(row.taskId!)} className="text-left text-[13px] text-ink hover:underline">
                      {row.kind === 'comment' ? `“${row.subject}”` : row.subject}
                    </button>
                  ) : (
                    <span className="text-[13px] text-ink">{row.kind === 'comment' ? `“${row.subject}”` : row.subject}</span>
                  )}
                  {row.context && <span className="block truncate text-[12px] text-ink-3">on {row.context}</span>}
                  <span className="block truncate text-[12px] text-ink-3 md:hidden">{row.projectName}</span>
                </span>
                <span className="hidden truncate text-[12.5px] text-ink-2 md:block">
                  {row.projectId && row.projectName ? <a href={href.project(row.projectId)} className="hover:underline">{row.projectName}</a> : (row.projectName ?? '—')}
                </span>
              </span>
            </div>
          </div>
        );
      })}
      <ShowMore shown={shown} total={total} onMore={more} />
    </>
  );
}
