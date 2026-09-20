import { FolderKanban, History, User } from 'lucide-react';
import { useState } from 'react';
import { Gate } from '../components/common/Gate';
import { ActivityIcon } from '../components/common/ActivityIcon';
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
const ALL = 'all';

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
  const [person, setPerson] = useState(ALL);
  const [project, setProject] = useState(ALL);
  const { openTask } = useUi();
  const { index } = useWorkspace();

  return (
    <Gate>
      {({ snapshot, index: idx }) => {
        const since = now.getTime() - (range === '24h' ? 1 : ACTIVITY_WINDOW_DAYS) * 24 * 60 * 60 * 1000;
        const all = snapshot.activity.filter((e) => Date.parse(e.event_date) >= since).map((e) => describeActivity(e, snapshot, idx));

        // Tally unique people and projects for filter dropdowns
        const peopleTally = new Map<string, { name: string; count: number }>();
        const projectTally = new Map<string, { name: string; count: number }>();
        for (const r of all) {
          const uid = r.userId ?? 'unknown';
          const prev = peopleTally.get(uid);
          peopleTally.set(uid, { name: r.user || 'Unknown person', count: (prev?.count ?? 0) + 1 });
          if (r.projectId) {
            const pp = projectTally.get(r.projectId);
            projectTally.set(r.projectId, { name: r.projectName ?? 'Unknown project', count: (pp?.count ?? 0) + 1 });
          }
        }
        const people = [...peopleTally].sort((a, b) => b[1].count - a[1].count).map(([id, v]) => ({ id, name: v.name, count: v.count }));
        const projects = [...projectTally].sort((a, b) => b[1].count - a[1].count).map(([id, v]) => ({ id, name: v.name, count: v.count }));

        const rows = all.filter((r) => {
          if (!KIND_MATCH[kind](r.kind)) return false;
          if (person !== ALL && (r.userId ?? 'unknown') !== person) return false;
          if (project !== ALL && r.projectId !== project) return false;
          return true;
        });
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
                <div className="flex flex-wrap items-center gap-2">
                  <ActivityFilterSelect id="activity-person" icon={<User size={14} />} label="Filter by person" value={person} onChange={setPerson} all={`Everyone (${all.length})`} options={people} />
                  <ActivityFilterSelect id="activity-project" icon={<FolderKanban size={14} />} label="Filter by project" value={project} onChange={setProject} all={`All projects (${all.length})`} options={projects} />
                  {(person !== ALL || project !== ALL) && (
                    <button type="button" className="btn-ghost h-8 text-[12.5px]" onClick={() => { setPerson(ALL); setProject(ALL); }}>
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="panel overflow-hidden">
                  {rows.length === 0 ? (
                    <EmptyState icon={<History size={26} />} title="No activity in this period" />
                  ) : (
                    <ActivityTable rows={rows} listKey={`${range}:${kind}:${person}:${project}`} now={now} onTask={(id) => index?.taskById.has(id) && openTask(id)} />
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
      <div className="hidden grid-cols-[5rem_9rem_11rem_minmax(0,1fr)_10rem] gap-3 border-b border-line bg-canvas px-4 py-2 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 md:grid">
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
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-b border-line px-4 py-2.5 last:border-b-0 md:grid-cols-[5rem_9rem_11rem_minmax(0,1fr)_10rem] md:items-center">
              <span className="flex items-center gap-2 text-[12.5px] tabular-nums text-ink-3 md:row-auto md:block">
                <span className="md:hidden">
                  <ActivityIcon row={row} />
                </span>
                {formatTime(row.at)}
              </span>
              <span className="min-w-0 md:contents">
                <span className="block truncate text-[13px] text-ink-2">
                  {row.userId ? <a href={href.holder(row.userId)} className="hover:underline">{row.user}</a> : row.user}
                  <span className="md:hidden"> · <span className={`font-medium ${ACTION_TONE[row.kind] ?? 'text-ink'}`}>{row.action}</span></span>
                </span>
                <span className={`hidden items-center gap-2 text-[13px] font-medium md:flex ${ACTION_TONE[row.kind] ?? 'text-ink'}`}>
                  <ActivityIcon row={row} />
                  {row.action}
                </span>
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

/** A labelled dropdown for narrowing the log to one person or one project. */
function ActivityFilterSelect({ id, icon, label, value, onChange, all, options }: {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: { id: string; name: string; count: number }[];
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-1.5 text-ink-3">
      {icon}
      <select id={id} aria-label={label} className="field w-auto max-w-[16rem]" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>{all}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name} ({o.count})</option>
        ))}
      </select>
    </label>
  );
}
