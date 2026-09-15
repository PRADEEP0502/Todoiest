import { MessageSquare, Search, X } from 'lucide-react';
import { useState } from 'react';
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

/** Comments on active tasks, as stored in Todoist. Newest first. */
export function CommentsPage() {
  const now = useNow(60_000);
  const [range, setRange] = useState<Range>('all');
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

        const q = query.trim().toLocaleLowerCase();
        const shown = comments.filter((c) => {
          if (range === '24h' && !within(c, DAY)) return false;
          if (range === 'week' && !within(c, 7 * DAY)) return false;
          if (!q) return true;
          const task = index.taskById.get(c.task_id)!;
          const author = c.posted_uid ? (snapshot.people[c.posted_uid]?.name ?? '') : '';
          return `${c.content} ${task.content} ${author}`.toLocaleLowerCase().includes(q);
        });

        return (
          <>
            <PageHeader title="Comments" subtitle="Comment box — task comments from Todoist" />
            <div className="space-y-4">
              <div className="sm:max-w-xl">
                <MetricStrip
                  label="Comment totals"
                  size="md"
                  columns="grid-cols-3"
                  items={[
                    { label: 'Total Comments', value: comments.length, href: '#comments', note: 'on active tasks' },
                    { label: 'Recent', value: last24, href: '#comments', note: 'last 24 hours' },
                    { label: 'This week', value: lastWeek, href: '#comments', note: 'last 7 days' },
                  ]}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 basis-60">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                  <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search comments, tasks or people…" aria-label="Search comments" className="field pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden" />
                  {query && (
                    <button type="button" className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery('')} aria-label="Clear">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <Tabs label="Time range" value={range} onChange={setRange} options={[{ value: 'all', label: 'All' }, { value: '24h', label: 'Last 24 hours' }, { value: 'week', label: 'Last 7 days' }]} />
              </div>

              <div id="comments" className="panel overflow-hidden">
                {shown.length === 0 ? (
                  <EmptyState icon={<MessageSquare size={26} />} title={comments.length ? 'No comments match' : 'No comments yet'}>
                    {comments.length ? null : 'Comments added to tasks in Todoist appear here after the next sync.'}
                  </EmptyState>
                ) : (
                  <CommentList comments={shown} listKey={`${range}:${q}`} snapshot={snapshot} index={index} now={now} />
                )}
              </div>
            </div>
          </>
        );
      }}
    </Gate>
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
