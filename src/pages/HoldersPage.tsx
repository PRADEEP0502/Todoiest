import { AlarmClock, ArrowLeft, CalendarCheck, CalendarClock, CalendarOff, CalendarPlus, ChevronDown, CircleCheckBig, FolderKanban, ListChecks, ListTree, LockKeyhole, MessageSquare, Search, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BarList } from '../components/charts/BarList';
import { Gate } from '../components/common/Gate';
import { Avatar, EmptyState, MetricStrip, Notice, PageHeader, Panel, ProjectDot, ShowMore } from '../components/common/ui';
import { CompletedList } from '../components/tasks/CompletedList';
import { GroupedTasks } from '../components/tasks/GroupedTasks';
import { useNow } from '../hooks/useNow';
import { usePaged } from '../hooks/usePaged';
import { href, navigate, type HolderView } from '../hooks/useRoute';
import { formatShortDate, formatTime, startOfMonth, toDateKey } from '../lib/dates';
import { taskPath, type WorkspaceIndex } from '../lib/hierarchy';
import { isRoutineTask } from '../lib/routine';
import { taskDates } from '../lib/taskDates';
import { plainText } from '../lib/text';
import { useUi } from '../store/ui';
import { hasHolderData, holderCounts, UNASSIGNED } from '../lib/metrics';
import { byPriorityThenTime, completedSince, isDueToday, isOverdue } from '../lib/stats';
import type { TodoistComment, TodoistTask, WorkspaceSnapshot } from '../types/todoist';

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
                <label className="text-[13px] text-ink-2">Select a person</label>
                <SearchableHolderSelect rows={rows} snapshot={snapshot} />
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
              <ul className="space-y-2.5 sm:hidden">
                {rows.map(([id, c]) => (
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

              <div className="panel hidden overflow-x-auto sm:block">
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

/** Searchable dropdown for picking a person from the holder list. */
function SearchableHolderSelect({ rows, snapshot }: { rows: [string, ReturnType<typeof holderCounts> extends Map<string, infer V> ? V : never][]; snapshot: WorkspaceSnapshot }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = rows.filter(([id]) => {
    if (!search.trim()) return true;
    return holderName(snapshot, id).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="field flex w-auto min-w-56 items-center justify-between gap-2 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-ink-3">Choose…</span>
        <ChevronDown size={14} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          {/* Search input */}
          <div className="border-b border-line p-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                ref={inputRef}
                type="text"
                className="field w-full pl-8"
                placeholder="Search people…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    setSearch('');
                  }
                  // Enter selects the first filtered result
                  if (e.key === 'Enter' && filtered.length > 0) {
                    navigate(href.holder(filtered[0][0]));
                    setOpen(false);
                    setSearch('');
                  }
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-center text-[13px] text-ink-3">No results found</li>
            ) : (
              filtered.map(([id, c]) => (
                <li key={id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-canvas/60"
                    onClick={() => {
                      navigate(href.holder(id));
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Avatar id={id} name={holderName(snapshot, id)} size={20} />
                      <span>{holderName(snapshot, id)}</span>
                    </span>
                    <span className="text-[12px] text-ink-3">{c.active} active</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
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

const VIEW_TITLE: Record<HolderView, string> = {
  active: 'All active tasks',
  overdue: 'Overdue tasks',
  today: 'Due today',
  'no-due': 'Tasks with no due date',
  completed: 'Completed this month',
  comments: 'Comments written',
  cd: 'Tasks with a Creation Date (CD)',
  idd: 'Tasks with an Issue Date (IDD)',
  dd: 'Tasks with a Due Date (DD)',
  'no-cd': 'Tasks without a Creation Date (CD)',
  'no-idd': 'Tasks without an Issue Date (IDD)',
  'no-dd': 'Tasks without a Due Date (DD)',
};

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
        const todayKey = toDateKey(now);
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

        const lists: Record<Exclude<HolderView, 'completed' | 'comments'>, TodoistTask[]> = {
          active: tasks,
          overdue: tasks.filter((t) => isOverdue(t, todayKey)),
          today: tasks.filter((t) => isDueToday(t, todayKey)),
          'no-due': tasks.filter((t) => !t.due),
          // Exactly what is written in Todoist: CD and IDD from the title, DD from the due date.
          cd: tasks.filter((t) => !isRoutineTask(t, index) && taskDates(t).cdFrom === 'title'),
          idd: tasks.filter((t) => !isRoutineTask(t, index) && taskDates(t).idd !== null),
          dd: tasks.filter((t) => !!t.due),
          'no-cd': tasks.filter((t) => !isRoutineTask(t, index) && taskDates(t).cdFrom !== 'title'),
          'no-idd': tasks.filter((t) => !isRoutineTask(t, index) && taskDates(t).idd === null),
          'no-dd': tasks.filter((t) => !t.due),
        };

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
        // CD / IDD / DD for this holder's tasks only (repeating tasks have no single CD or IDD).
        const dated = tasks.filter((t) => !isRoutineTask(t, index)).map((t) => taskDates(t));
        const withCd = dated.filter((d) => d.cdFrom === 'title').length;
        const withIdd = dated.filter((d) => d.idd).length;
        const withDd = tasks.filter((t) => t.due).length;
        const count = show === 'completed' ? completed.length : show === 'comments' ? comments.length : lists[show].length;

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
                columns={holderId === UNASSIGNED ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'}
                items={[
                  { label: 'Active Tasks', icon: <ListChecks />, value: lists.active.length, ...card('active') },
                  { label: 'Completed', icon: <CircleCheckBig />, iconTone: 'good', value: completed.length, note: 'this month', ...card('completed') },
                  { label: 'Overdue', icon: <AlarmClock />, value: lists.overdue.length, tone: 'danger', ...card('overdue') },
                  { label: 'Due Today', icon: <CalendarCheck />, iconTone: 'info', value: lists.today.length, ...card('today') },
                  { label: 'No Due Date', icon: <CalendarOff />, iconTone: 'warn', value: lists['no-due'].length, ...card('no-due') },
                  ...(holderId === UNASSIGNED
                    ? []
                    : [{ label: 'Comments', icon: <MessageSquare />, iconTone: 'info' as const, value: comments.length, note: 'written', ...card('comments') }]),
                ]}
              />

              {tasks.length > 0 && (
                <MetricStrip
                  label={`${name}: CD, IDD and DD`}
                  size="md"
                  columns="grid-cols-1 sm:grid-cols-3"
                  items={[
                    { label: 'CD · Creation Date', icon: <CalendarPlus />, iconTone: 'info', value: withCd, ...card('cd'), note: `of ${dated.length} tasks · ${dated.length - withCd} without` },
                    { label: 'IDD · Issue Date', icon: <LockKeyhole />, iconTone: 'warn', value: withIdd, ...card('idd'), note: `of ${dated.length} tasks · ${dated.length - withIdd} without` },
                    { label: 'DD · Due Date', icon: <CalendarClock />, iconTone: 'good', value: withDd, ...card('dd'), note: `of ${tasks.length} tasks · ${tasks.length - withDd} without` },
                  ]}
                />
              )}

              {tasks.length > 0 && (
                <MetricStrip
                  label={`${name}: tasks missing CD, IDD or DD`}
                  size="md"
                  columns="grid-cols-1 sm:grid-cols-3"
                  items={[
                    { label: 'No CD', icon: <CalendarPlus />, iconTone: 'info', value: lists['no-cd'].length, note: 'no Creation Date', ...card('no-cd') },
                    { label: 'No IDD', icon: <LockKeyhole />, iconTone: 'warn', value: lists['no-idd'].length, note: 'no Issue Date', ...card('no-idd') },
                    { label: 'No DD', icon: <CalendarClock />, iconTone: 'good', value: lists['no-dd'].length, note: 'no Due Date', ...card('no-dd') },
                  ]}
                />
              )}

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
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-ink">
                    {VIEW_TITLE[show]} <span className="font-normal text-ink-3">· {count}</span>
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
                    <a href={href.holder(holderId)} className="ml-auto text-[12.5px] font-medium text-ink-3 hover:text-ink">
                      Clear filters
                    </a>
                  )}
                </div>
                {holderId === UNASSIGNED && show !== 'completed' && (
                  <div className="mb-2">
                    <Notice>Todoist has no holder for these tasks (they are unassigned, or in projects that are not shared).</Notice>
                  </div>
                )}
                <div className="panel px-3 py-2">
                  {count === 0 ? (
                    <EmptyState title={`${VIEW_TITLE[show]}: none for ${name}${scoped ? ' here' : ''}`} />
                  ) : show === 'completed' ? (
                    <CompletedList tasks={completed} index={index} listKey={`${holderId}:${scopeProjectId}:${sectionId}`} />
                  ) : show === 'comments' ? (
                    <HolderComments comments={comments} index={index} now={now} />
                  ) : (
                    <GroupedTasks
                      tasks={lists[show]}
                      viewKey={`holder:${holderId}:${show}`}
                      compare={byPriorityThenTime}
                      defaultOpen={lists[show].length <= 30}
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
