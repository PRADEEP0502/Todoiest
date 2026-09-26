import { FolderKanban, ListTree, MessageSquare, Search, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BarList } from '../components/charts/BarList';
import { Gate } from '../components/common/Gate';
import { SearchField } from '../components/common/SearchField';
import { SearchSelect } from '../components/common/SearchSelect';
import { Avatar, EmptyState, Notice, PageHeader, Panel, ProjectDot, ShowMore } from '../components/common/ui';
import { CompletedList } from '../components/tasks/CompletedList';
import { GroupedTasks } from '../components/tasks/GroupedTasks';
import { ScopeKpis, scopeLists, VIEW_TITLE } from '../components/tasks/ScopeKpis';
import { useNow } from '../hooks/useNow';
import { usePaged } from '../hooks/usePaged';
import { href, navigate, type HolderView } from '../hooks/useRoute';
import { formatShortDate, formatTime, startOfMonth } from '../lib/dates';
import { taskPath, type WorkspaceIndex } from '../lib/hierarchy';
import { filterTasks } from '../lib/search';
import { plainText } from '../lib/text';
import { useUi } from '../store/ui';
import { hasHolderData, holderCounts, UNASSIGNED } from '../lib/metrics';
import { useWorkspace } from '../store/workspace';
import { byPriorityThenTime, completedSince } from '../lib/stats';
import type { TodoistComment, TodoistTask, WorkspaceSnapshot } from '../types/todoist';

const holderName = (snapshot: WorkspaceSnapshot, id: string) => (id === UNASSIGNED ? 'No holder' : (snapshot.people[id]?.name ?? 'Unknown person'));

/** Holder = the person Todoist lists as responsible for the task (task assignee in shared projects). */
export function HoldersPage() {
  const now = useNow(60_000);
  const [query, setQuery] = useState('');
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
        // The search box narrows the table and the phone cards to matching people.
        const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const listed = rows.filter(([id]) => {
          const text = `${holderName(snapshot, id)} ${snapshot.people[id]?.email ?? ''}`.toLowerCase();
          return words.every((w) => text.includes(w));
        });

        return (
          <>
            <PageHeader title="Holder Wise" subtitle={`${people.length} people hold active tasks`} />
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[13px] text-ink-2" htmlFor="holder-pick">Open a person</label>
                <SearchSelect
                  id="holder-pick"
                  className="w-auto min-w-60"
                  placeholder="Choose…"
                  searchPlaceholder="Search people…"
                  value=""
                  onChange={(id) => navigate(href.holder(id))}
                  options={rows.map(([id, c]) => ({
                    value: id,
                    label: holderName(snapshot, id),
                    hint: `${c.active} active`,
                    icon: <Avatar id={id} name={holderName(snapshot, id)} size={18} />,
                  }))}
                />
                <span className="text-[13px] text-ink-2 sm:ml-2">or narrow the list</span>
                <SearchField className="w-full sm:w-72" value={query} onChange={setQuery} label="Search holders" placeholder="Search holders by name or email…" />
              </div>

              <Panel title="Holder-wise Active Tasks" icon={<Users />} iconTone="info">
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

              {/* Phones: one card per person, so every figure is readable without scrolling sideways. */}
              {listed.length === 0 && (
                <div className="panel">
                  <EmptyState icon={<Search size={24} />} title={`No holder matches “${query.trim()}”`}>
                    <button type="button" className="text-accent hover:underline" onClick={() => setQuery('')}>Clear the search</button>
                  </EmptyState>
                </div>
              )}

              <ul className="space-y-2.5 sm:hidden">
                {listed.map(([id, c]) => (
                  <li key={id}>
                    <a href={href.holder(id)} className="panel block px-4 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <Avatar id={id} name={holderName(snapshot, id)} size={26} />
                        <span className="min-w-0 break-words text-[14px] font-semibold text-ink">{holderName(snapshot, id)}</span>
                      </span>
                      <span className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3">
                        {[
                          ['Active', c.active, false],
                          ['Overdue', c.overdue, true],
                          ['Due today', c.today, false],
                          ['No due date', c.noDue, false],
                          ['Completed', c.completed, false],
                          ['Comments', c.comments, false],
                        ].map(([label, value, danger]) => (
                          <span key={String(label)} className="block">
                            <span className="block text-2xs leading-4 text-ink-3">{label}</span>
                            <span className={`block text-[17px] font-semibold tabular-nums ${danger && Number(value) > 0 ? 'text-p1' : Number(value) ? 'text-ink' : 'text-ink-3'}`}>
                              {Number(value)}
                            </span>
                          </span>
                        ))}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className={`panel overflow-x-auto ${listed.length ? 'hidden sm:block' : 'hidden'}`}>
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
                    {listed.map(([id, c]) => (
                      <tr key={id} className="cursor-pointer hover:bg-canvas/60" onClick={() => navigate(href.holder(id))}>
                        <td className="px-4 py-2.5">
                          <a href={href.holder(id)} className="flex items-center gap-2 font-medium text-ink hover:underline">
                            <Avatar id={id} name={holderName(snapshot, id)} />
                            {holderName(snapshot, id)}
                          </a>
                        </td>
                        <Num v={c.active} to={href.holder(id)} />
                        <Num v={c.overdue} danger to={href.holder(id, { show: 'overdue' })} />
                        <Num v={c.today} to={href.holder(id, { show: 'today' })} />
                        <Num v={c.noDue} to={href.holder(id, { show: 'no-due' })} />
                        <Num v={c.completed} to={href.holder(id, { show: 'completed' })} />
                        <Num v={c.comments} to={href.holder(id, { show: 'comments' })} />
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

/** A figure in the holders table that opens that person's page already filtered to it. */
function Num({ v, danger, to }: { v: number; danger?: boolean; to: string }) {
  return (
    <td className="px-1.5 py-1 text-right">
      <a
        href={to}
        // The row itself also opens the person; this link wins with its own filter.
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex h-8 min-w-10 items-center justify-end rounded-lg px-2 tabular-nums transition-colors hover:bg-black/[0.05] ${danger && v > 0 ? 'font-medium text-p1' : v ? 'text-ink' : 'text-ink-3'}`}
      >
        {v}
      </a>
    </td>
  );
}

interface HolderPageProps {
  holderId: string;
  show: HolderView;
  projectId: string | null;
  sectionId: string | null;
}

/**
 * One person's work. Everything on this page is limited to that holder: the cards filter the list
 * below by state, and the project and section bars narrow it further — nothing opens the
 * company-wide views.
 */
export function HolderPage({ holderId, show, projectId, sectionId }: HolderPageProps) {
  const now = useNow(60_000);
  const { settings } = useWorkspace();
  const rules = settings.rules;
  // The search belongs to one person: opening another starts with a clear box.
  const [search, setSearch] = useState({ id: holderId, text: '' });
  const query = search.id === holderId ? search.text : '';
  const setQuery = (text: string) => setSearch({ id: holderId, text });
  const listRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // After picking a card or a bar, bring the filtered list into view.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [show, projectId, sectionId]);

  return (
    <Gate>
      {({ snapshot, index }) => {
        const name = holderName(snapshot, holderId);
        const isHolder = (t: TodoistTask) => (t.responsible_uid ?? UNASSIGNED) === holderId;
        const section = sectionId ? index.sectionById.get(sectionId) : undefined;
        // A section implies its project, so a section link alone is enough.
        const scopeProjectId = section?.project_id ?? projectId;
        const project = scopeProjectId ? index.projectById.get(scopeProjectId) : undefined;
        const inScope = (t: Pick<TodoistTask, 'project_id' | 'section_id'>) =>
          (!scopeProjectId || t.project_id === scopeProjectId) && (!sectionId || t.section_id === sectionId);

        const allTasks = snapshot.tasks.filter(isHolder);
        const tasks = allTasks.filter(inScope);
        const completed = completedSince(snapshot.completed, startOfMonth(now)).filter((t) => isHolder(t) && inScope(t));
        const comments =
          holderId === UNASSIGNED
            ? []
            : snapshot.comments.filter((c) => {
                if (c.posted_uid !== holderId) return false;
                const task = index.taskById.get(c.task_id);
                return !!task && inScope(task);
              });

        // Every card and every list of this person, in the chosen project/section only.
        const lists = scopeLists(tasks, index, rules, now);

        // Bars: the person's projects, and the sections of the chosen project (or of all of them).
        const byProject = new Map<string, number>();
        const bySection = new Map<string, number>();
        for (const t of allTasks) {
          byProject.set(t.project_id, (byProject.get(t.project_id) ?? 0) + 1);
          if (t.section_id && index.sectionById.has(t.section_id) && (!scopeProjectId || t.project_id === scopeProjectId)) {
            bySection.set(t.section_id, (bySection.get(t.section_id) ?? 0) + 1);
          }
        }
        const topProjects = [...byProject].sort((a, b) => b[1] - a[1]).slice(0, 6);
        const topSections = [...bySection].sort((a, b) => b[1] - a[1]).slice(0, 6);

        const link = (filter: { show?: HolderView; projectId?: string | null; sectionId?: string | null }) =>
          href.holder(holderId, { show, projectId: scopeProjectId, sectionId, ...filter });
        const card = (view: HolderView) => ({ href: link({ show: view }), selected: show === view });
        const scoped = !!scopeProjectId || !!sectionId;
        const count = show === 'completed' ? completed.length : show === 'comments' ? comments.length : lists[show].length;
        // The search box narrows whichever list is showing, inside this holder only.
        const found =
          show === 'completed'
            ? filterTasks(completed, query, index, snapshot.people).length
            : show === 'comments'
              ? comments.filter((c) => matchesComment(c, query, index)).length
              : filterTasks(lists[show], query, index, snapshot.people).length;

        return (
          <>
            <Breadcrumb trail={[{ label: 'Overall', to: href.dashboard() }, { label: 'Holder Wise', to: href.holders() }, { label: name }]} />
            <PageHeader
              title={
                <span className="flex items-center gap-2.5">
                  <Avatar id={holderId} name={name} size={28} />
                  {name}
                </span>
              }
              subtitle={holderId === UNASSIGNED ? 'Active tasks without a holder in Todoist' : snapshot.people[holderId]?.email}
              actions={
                <SearchSelect
                  aria-label="Switch person"
                  className="w-auto min-w-56"
                  searchPlaceholder="Search people…"
                  value={holderId}
                  onChange={(id) => navigate(href.holder(id))}
                  options={[...holderCounts(snapshot, now)].map(([id, c]) => ({
                    value: id,
                    label: holderName(snapshot, id),
                    hint: `${c.active} active`,
                    icon: <Avatar id={id} name={holderName(snapshot, id)} size={18} />,
                  }))}
                />
              }
            />

            <div className="space-y-4">
              <ScopeKpis
                name={name}
                lists={lists}
                completed={completed.length}
                comments={holderId === UNASSIGNED ? null : comments.length}
                rules={rules}
                card={card}
                scopeNote={project ? ` in ${project.name}` : undefined}
              />

              {allTasks.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Panel title="Project-wise tasks" icon={<FolderKanban />} iconTone="good" subtitle="Click a project to show only its tasks">
                    <BarList
                      label={`${name}: tasks by project`}
                      unit="active tasks"
                      total={allTasks.length}
                      selectedId={scopeProjectId}
                      entries={topProjects.map(([id, value]) => {
                        const p = index.projectById.get(id);
                        // Clicking the selected project again clears it.
                        const to = id === scopeProjectId ? link({ projectId: null, sectionId: null }) : link({ projectId: id, sectionId: null });
                        return { id, label: p?.name ?? 'Project', value, href: to, mark: <ProjectDot color={p?.color} /> };
                      })}
                    />
                  </Panel>
                  <Panel
                    title="Section-wise tasks"
                    icon={<ListTree />}
                    subtitle={topSections.length ? (project ? `Sections in ${project.name}` : 'Click a section to show only its tasks') : 'These tasks are not in sections'}
                  >
                    {topSections.length > 0 && (
                      <BarList
                        label={`${name}: tasks by section`}
                        unit="active tasks"
                        total={allTasks.length}
                        selectedId={sectionId}
                        entries={topSections.map(([id, value]) => {
                          const s = index.sectionById.get(id)!;
                          const p = index.projectById.get(s.project_id);
                          const to = id === sectionId ? link({ sectionId: null }) : link({ projectId: s.project_id, sectionId: id });
                          return { id, label: s.name, value, href: to, mark: <ProjectDot color={p?.color} />, detail: p?.name };
                        })}
                      />
                    )}
                  </Panel>
                </div>
              )}

              <section ref={listRef} className="scroll-mt-4">
                {/* Stays in view while scrolling a long list, so the search and filters are always at hand. */}
                <div className="sticky top-0 z-10 -mx-2 mb-2.5 flex flex-wrap items-center gap-2 bg-canvas/95 px-2 py-2 backdrop-blur">
                  <h2 className="text-[15px] font-semibold text-ink">
                    {VIEW_TITLE[show]}{' '}
                    <span className="font-normal text-ink-3">· {query.trim() ? `${found} of ${count}` : count}</span>
                  </h2>
                  {project && (
                    <a href={link({ projectId: null, sectionId: null })} className="filter-chip" title="Remove this filter">
                      <ProjectDot color={project.color} /> {project.name} <X size={12} />
                    </a>
                  )}
                  {section && (
                    <a href={link({ sectionId: null })} className="filter-chip" title="Remove this filter">
                      <ListTree size={12} /> {section.name} <X size={12} />
                    </a>
                  )}
                  {(scoped || show !== 'active') && (
                    <a href={href.holder(holderId)} className="text-[12.5px] font-medium text-ink-3 hover:text-ink">
                      Clear filters
                    </a>
                  )}
                  <SearchField
                    className="w-full sm:ml-auto sm:w-72"
                    value={query}
                    onChange={setQuery}
                    label={`Search tasks of ${name}`}
                    placeholder={show === 'comments' ? 'Search comments…' : `Search ${name}’s tasks…`}
                  />
                </div>
                {holderId === UNASSIGNED && show !== 'completed' && (
                  <div className="mb-2">
                    <Notice>Todoist has no holder for these tasks (they are unassigned, or in projects that are not shared).</Notice>
                  </div>
                )}
                <div className="panel px-3 py-2">
                  {count === 0 ? (
                    <EmptyState title={`${VIEW_TITLE[show]}: none for ${name}${scoped ? ' here' : ''}`} />
                  ) : found === 0 ? (
                    <EmptyState icon={<Search size={24} />} title={`Nothing matches “${query.trim()}”`}>
                      <button type="button" className="text-accent hover:underline" onClick={() => setQuery('')}>Clear the search</button>
                    </EmptyState>
                  ) : show === 'completed' ? (
                    <CompletedList tasks={filterTasks(completed, query, index, snapshot.people)} index={index} listKey={`${holderId}:${scopeProjectId}:${sectionId}:${query}`} />
                  ) : show === 'comments' ? (
                    <HolderComments comments={comments.filter((c) => matchesComment(c, query, index))} index={index} now={now} />
                  ) : (
                    // Open, so the whole list scrolls straight through without expanding each group.
                    <GroupedTasks
                      tasks={filterTasks(lists[show], query, index, snapshot.people)}
                      viewKey={`holder:${holderId}:${show}`}
                      compare={byPriorityThenTime}
                      defaultOpen
                    />
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

/** A comment matches when its text or its task's name has every word of the search. */
function matchesComment(comment: TodoistComment, query: string, index: WorkspaceIndex): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const task = index.taskById.get(comment.task_id);
  const text = `${plainText(comment.content)} ${task ? plainText(task.content) : ''}`.toLowerCase();
  return words.every((w) => text.includes(w));
}

/** Overall › Holder Wise › Person — each step back is one click. */
function Breadcrumb({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-3" aria-label="Breadcrumb">
      {trail.map((step, i) => (
        <span key={step.label} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>›</span>}
          {step.to ? (
            <a href={step.to} className="hover:text-ink hover:underline">{step.label}</a>
          ) : (
            <span className="font-medium text-ink-2" aria-current="page">{step.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Comments this person wrote, newest first, each with the task it belongs to. */
function HolderComments({ comments, index, now }: { comments: TodoistComment[]; index: WorkspaceIndex; now: Date }) {
  const { openTask } = useUi();
  const sorted = [...comments].sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''));
  const { visible, shown, total, more } = usePaged(sorted, 'holder-comments');
  return (
    <>
      <ul className="divide-y divide-black/[0.05]">
        {visible.map((c) => {
          const task = index.taskById.get(c.task_id)!;
          const at = c.posted_at ? new Date(c.posted_at) : null;
          return (
            <li key={c.id} className="flex items-start gap-3 px-2 py-2.5">
              <MessageSquare size={16} className="mt-0.5 shrink-0 text-p3" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block whitespace-pre-wrap break-words text-[13.5px] text-ink">{plainText(c.content)}</span>
                <button type="button" onClick={() => openTask(task.id)} className="mt-0.5 block max-w-full truncate text-left text-[12px] text-ink-3 hover:text-ink hover:underline">
                  on {plainText(task.content)} · {taskPath(index, task).join(' › ')}
                </button>
              </span>
              {at && (
                <span className="shrink-0 text-right text-[12px] tabular-nums text-ink-3">
                  {formatShortDate(at, now)}
                  <span className="block">{formatTime(at)}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <ShowMore shown={shown} total={total} onMore={more} />
    </>
  );
}
