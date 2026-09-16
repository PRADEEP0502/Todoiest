import { CalendarDays, Clock, FolderKanban, MessageSquare, MessagesSquare, Search, User, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Gate } from '../components/common/Gate';
import { Avatar, EmptyState, MetricStrip, PageHeader, ProjectDot, ShowMore, Tabs } from '../components/common/ui';
import { usePaged } from '../hooks/usePaged';
import { useNow } from '../hooks/useNow';
import { href } from '../hooks/useRoute';
import { formatDayHeading, formatTime, toDateKey } from '../lib/dates';
import type { WorkspaceIndex } from '../lib/hierarchy';
import { plainText } from '../lib/search';
import { useUi } from '../store/ui';
import type { TodoistComment, WorkspaceSnapshot } from '../types/todoist';

type Range = 'all' | '24h' | 'week';
const DAY = 24 * 60 * 60 * 1000;
const ALL = 'all';
const UNKNOWN = 'unknown';

/** Comments on active tasks, as stored in Todoist. Newest first. */
export function CommentsPage() {
  const now = useNow(60_000);
  const [range, setRange] = useState<Range>('all');
  const [person, setPerson] = useState(ALL);
  const [project, setProject] = useState(ALL);
  const [query, setQuery] = useState('');

  return (
    <Gate>
      {({ snapshot, index }) => {
        const comments = snapshot.comments
          .filter((c) => index.taskById.has(c.task_id))
          .sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''));
        const within = (c: TodoistComment, ms: number) => !!c.posted_at && now.getTime() - Date.parse(c.posted_at) <= ms;
        const last24 = comments.filter((c) => within(c, DAY)).length;
        const lastWeek = comments.filter((c) => within(c, 7 * DAY)).length;
        const projectOf = (c: TodoistComment) => index.taskById.get(c.task_id)!.project_id;

        // Only the people and projects that actually have comments, the busiest first.
        const tally = (of: (c: TodoistComment) => string) => {
          const counts = new Map<string, number>();
          for (const c of comments) counts.set(of(c), (counts.get(of(c)) ?? 0) + 1);
          return [...counts].sort((a, b) => b[1] - a[1]);
        };
        const people = tally((c) => c.posted_uid ?? UNKNOWN).map(([id, count]) => ({
          id,
          count,
          name: id === UNKNOWN ? 'Unknown person' : (snapshot.people[id]?.name ?? 'Unknown person'),
        }));
        const projects = tally(projectOf).map(([id, count]) => ({ id, count, name: index.projectById.get(id)?.name ?? 'Unknown project' }));

        const q = query.trim().toLocaleLowerCase();
        const shown = comments.filter((c) => {
          if (range === '24h' && !within(c, DAY)) return false;
          if (range === 'week' && !within(c, 7 * DAY)) return false;
          if (person !== ALL && (c.posted_uid ?? UNKNOWN) !== person) return false;
          if (project !== ALL && projectOf(c) !== project) return false;
          if (!q) return true;
          const task = index.taskById.get(c.task_id)!;
          const author = c.posted_uid ? (snapshot.people[c.posted_uid]?.name ?? '') : '';
          return `${c.content} ${task.content} ${author}`.toLocaleLowerCase().includes(q);
        });
        const filtered = range !== 'all' || person !== ALL || project !== ALL || q.length > 0;
        const clearAll = () => {
          setRange('all');
          setPerson(ALL);
          setProject(ALL);
          setQuery('');
        };

        return (
          <>
            <PageHeader title="Comments" subtitle="Comment box — task comments from Todoist" />
            <div className="space-y-4">
              <div className="sm:max-w-xl">
                <MetricStrip
                  label="Comment totals"
                  size="md"
                  columns="grid-cols-1 sm:grid-cols-3"
                  items={[
                    { label: 'Total Comments', icon: <MessagesSquare />, iconTone: 'info', value: comments.length, href: '#comments', note: 'on active tasks' },
                    { label: 'Recent', icon: <Clock />, iconTone: 'good', value: last24, href: '#comments', note: 'last 24 hours' },
                    { label: 'This week', icon: <CalendarDays />, value: lastWeek, href: '#comments', note: 'last 7 days' },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-0 flex-1 basis-60">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search comments, tasks or people…"
                      aria-label="Search comments"
                      className="field pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                      <button type="button" className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery('')} aria-label="Clear">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <Tabs
                    label="Time range"
                    value={range}
                    onChange={setRange}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: '24h', label: 'Last 24 hours' },
                      { value: 'week', label: 'Last 7 days' },
                    ]}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <FilterSelect id="comment-person" icon={<User size={14} />} label="Filter by person" value={person} onChange={setPerson} all={`Everyone (${comments.length})`} options={people} />
                  <FilterSelect id="comment-project" icon={<FolderKanban size={14} />} label="Filter by project" value={project} onChange={setProject} all={`All projects (${comments.length})`} options={projects} />
                  <span className="ml-auto text-[12.5px] font-medium text-ink-2">
                    {filtered ? `${shown.length} of ${comments.length} comments` : `${comments.length} comments`}
                  </span>
                  {filtered && (
                    <button type="button" className="btn-ghost h-8" onClick={clearAll}>
                      <X size={14} /> Clear filters
                    </button>
                  )}
                </div>
              </div>

              <div id="comments" className="panel overflow-hidden">
                {shown.length === 0 ? (
                  <EmptyState icon={<MessageSquare size={26} />} title={comments.length ? 'No comments match' : 'No comments yet'}>
                    {comments.length ? null : 'Comments added to tasks in Todoist appear here after the next sync.'}
                  </EmptyState>
                ) : (
                  <CommentList comments={shown} listKey={`${range}:${person}:${project}:${q}`} snapshot={snapshot} index={index} now={now} />
                )}
              </div>
            </div>
          </>
        );
      }}
    </Gate>
  );
}

/** One dropdown of the people or projects that have comments, each with how many it holds. */
function FilterSelect({
  id,
  icon,
  label,
  value,
  onChange,
  all,
  options,
}: {
  id: string;
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  all: string;
  options: { id: string; name: string; count: number }[];
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span aria-hidden className="shrink-0 text-ink-3">
        {icon}
      </span>
      <select id={id} aria-label={label} className="field h-8 w-auto max-w-[14rem] py-0 text-[13px]" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>{all}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.count})
          </option>
        ))}
      </select>
    </span>
  );
}

function CommentList({ comments, listKey, snapshot, index, now }: { comments: TodoistComment[]; listKey: string; snapshot: WorkspaceSnapshot; index: WorkspaceIndex; now: Date }) {
  const { openTask } = useUi();
  const { visible, shown, total, more } = usePaged(comments, listKey);
  const dayOf = (c: TodoistComment) => (c.posted_at ? toDateKey(new Date(c.posted_at)) : '');
  return (
    <>
      <ul>
        {visible.map((c, i) => {
          const task = index.taskById.get(c.task_id)!;
          const project = index.projectById.get(task.project_id);
          const section = task.section_id ? index.sectionById.get(task.section_id) : undefined;
          const author = c.posted_uid ? snapshot.people[c.posted_uid] : undefined;
          const at = c.posted_at ? new Date(c.posted_at) : null;
          const heading = at && (i === 0 || dayOf(visible[i - 1]) !== dayOf(c)) ? formatDayHeading(at, now) : null;
          return (
            <li key={c.id}>
              {heading && <div className="border-b border-line bg-canvas/60 px-4 py-1.5 text-[12px] font-semibold text-ink-2">{heading}</div>}
              <div className="flex gap-3 border-b border-line px-4 py-3">
                <Avatar id={c.posted_uid ?? 'unknown'} name={author?.name ?? '?'} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[13px] font-semibold text-ink">{author?.name ?? 'Unknown person'}</span>
                    {at && <span className="text-[12px] text-ink-3">{formatTime(at)}</span>}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] text-ink">{plainText(c.content)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
                    <button type="button" onClick={() => openTask(task.id)} className="font-medium text-ink-2 hover:underline">
                      {plainText(task.content)}
                    </button>
                    <span className="inline-flex items-center gap-1">
                      <ProjectDot color={project?.color} size={6} />
                      <a href={href.project(task.project_id, { taskId: task.id })} className="hover:underline">
                        {[project?.name, section?.name].filter(Boolean).join(' › ')}
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ShowMore shown={shown} total={total} onMore={more} />
    </>
  );
}
