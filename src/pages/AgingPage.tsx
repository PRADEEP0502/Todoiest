import { Hourglass, Lock, Pencil, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Avatar, Chevron, EmptyState, Notice, PageHeader, ShowMore } from '../components/common/ui';
import { Gate } from '../components/common/Gate';
import { SearchSelect } from '../components/common/SearchSelect';
import { useDisclosure } from '../hooks/useDisclosure';
import { usePaged } from '../hooks/usePaged';
import { useNow } from '../hooks/useNow';
import { formatDays, holderAging, NO_HOLDER, type AgingRow, type HolderAging } from '../lib/aging';
import { taskPath, type WorkspaceIndex } from '../lib/hierarchy';
import { dueDateKey } from '../lib/dates';
import { toUiPriority } from '../lib/priority';
import { parseTitle } from '../lib/cd';
import { plainText } from '../lib/text';
import { useUi } from '../store/ui';
import { useWorkspace, type TaskForm } from '../store/workspace';
import type { TodoistTask, WorkspaceSnapshot } from '../types/todoist';

const holderName = (snapshot: WorkspaceSnapshot, id: string) => (id === NO_HOLDER ? 'No holder' : (snapshot.people[id]?.name ?? 'Unknown person'));

/** The task exactly as it stands, as a form, so that changing one field changes only that field. */
function formFromTask(task: TodoistTask, index: WorkspaceIndex): TaskForm {
  return {
    content: parseTitle(task.content).title,
    description: task.description,
    projectId: task.project_id,
    sectionId: task.section_id && index.sectionById.has(task.section_id) ? task.section_id : null,
    dueDate: dueDateKey(task.due),
    // Never sent: a stored IDD always wins, and this page cannot enter one.
    idd: null,
    priority: toUiPriority(task.priority),
  };
}

const COLS = 'md:grid-cols-[minmax(0,1.6fr)_6.6rem_6.6rem_8.6rem_5.8rem_5.8rem]';

/** How many days, with red for a negative span (a date entered out of order). */
function Age({ days, kind }: { days: number | null; kind?: 'cd' | 'idd' }) {
  return <span data-age={kind} data-days={days ?? ''} className={`tabular-nums ${days === null ? 'text-ink-3' : days < 0 ? 'font-semibold text-p1' : 'text-ink'}`}>{formatDays(days)}</span>;
}

function HeaderCell({ children, marker }: { children: ReactNode; marker?: 'lock' | 'edit' }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      {marker === 'lock' && <Lock size={10} strokeWidth={2.25} aria-label="locked" />}
      {marker === 'edit' && <Pencil size={10} strokeWidth={2.25} className="text-accent" aria-label="editable" />}
    </span>
  );
}

/** Due date cell: editable right here. It has no part in CD Age or IDD Age. */
function DueDateInput({ row, onChange, id }: { row: AgingRow; onChange: (task: TodoistTask, dueDate: string | null) => void; id: string }) {
  return (
    <input
      id={id}
      type="date"
      aria-label={`Due date (DD) — editable — ${plainText(row.dates.title)}`}
      value={row.dates.ddKey ?? ''}
      onChange={(e) => onChange(row.task, e.target.value || null)}
      className="h-8 w-full min-w-0 rounded-lg border border-accent/30 bg-accent-soft/40 px-1.5 text-[12.5px] tabular-nums text-ink focus:border-accent focus:outline-none"
    />
  );
}

function Locked({ value }: { value: string | null }) {
  return <span className={`tabular-nums ${value ? 'text-ink-2' : 'text-ink-3'}`}>{value ?? '—'}</span>;
}

function GroupTable({ group, index, onDueChange }: { group: HolderAging; index: WorkspaceIndex; onDueChange: (task: TodoistTask, dueDate: string | null) => void }) {
  const { openTask } = useUi();
  const { visible, shown, total, more } = usePaged(group.rows, `aging:${group.id}:${group.rows.length}`, 30);
  return (
    <div>
      <div className={`hidden gap-3 border-y border-black/[0.05] bg-black/[0.02] px-4 py-2 text-2xs font-semibold uppercase tracking-[0.05em] text-ink-3 md:grid ${COLS}`}>
        <span>Task</span>
        <HeaderCell marker="lock">CD</HeaderCell>
        <HeaderCell marker="lock">IDD</HeaderCell>
        <HeaderCell marker="edit">DD</HeaderCell>
        <span>CD Age</span>
        <span>IDD Age</span>
      </div>
      <ul className="divide-y divide-black/[0.05]">
        {visible.map((row) => {
          const path = taskPath(index, row.task).slice(0, 2).join(' › ');
          const ages = row.aging;
          return (
            <li key={row.task.id} className={`grid items-center gap-x-3 gap-y-2 px-4 py-3 md:py-2.5 ${COLS}`}>
              <button type="button" onClick={() => openTask(row.task.id)} className="min-w-0 text-left">
                <span className="block break-words text-[13.5px] text-ink hover:underline">{plainText(row.dates.title)}</span>
                <span className="block truncate text-[11.5px] text-ink-3">{path}</span>
              </button>

              {/* Desktop: one cell each. */}
              <span className="hidden text-[12.5px] md:block"><Locked value={row.dates.cd} /></span>
              <span className="hidden text-[12.5px] md:block"><Locked value={row.dates.idd} /></span>
              <span className="hidden md:block"><DueDateInput row={row} onChange={onDueChange} id={`dd-${row.task.id}`} /></span>
              <span className="hidden text-[12.5px] md:block"><Age kind="cd" days={ages.cdAge} /></span>
              <span className="hidden text-[12.5px] md:block"><Age kind="idd" days={ages.iddAge} /></span>

              {/* Phones: a compact block under the name. */}
              <div className="grid grid-cols-3 gap-x-2 gap-y-2 text-[12px] md:hidden">
                <div>
                  <span className="mb-0.5 flex items-center gap-1 text-2xs font-semibold text-ink-3">CD <Lock size={9} strokeWidth={2.25} /></span>
                  <Locked value={row.dates.cd} />
                </div>
                <div>
                  <span className="mb-0.5 flex items-center gap-1 text-2xs font-semibold text-ink-3">IDD <Lock size={9} strokeWidth={2.25} /></span>
                  <Locked value={row.dates.idd} />
                </div>
                <div>
                  <span className="mb-0.5 flex items-center gap-1 text-2xs font-semibold text-ink-3">DD <Pencil size={9} strokeWidth={2.25} className="text-accent" /></span>
                  <DueDateInput row={row} onChange={onDueChange} id={`dd-m-${row.task.id}`} />
                </div>
                <div>
                  <span className="mb-0.5 block text-2xs font-semibold text-ink-3">CD Age</span>
                  <Age kind="cd" days={ages.cdAge} />
                </div>
                <div>
                  <span className="mb-0.5 block text-2xs font-semibold text-ink-3">IDD Age</span>
                  <Age kind="idd" days={ages.iddAge} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ShowMore shown={shown} total={total} onMore={more} step={30} />
    </div>
  );
}

function HolderBlock({ group, name, index, open: defaultOpen, onDueChange }: { group: HolderAging; name: string; index: WorkspaceIndex; open: boolean; onDueChange: (task: TodoistTask, dueDate: string | null) => void }) {
  const [open, toggle] = useDisclosure(`aging:holder:${group.id}`, defaultOpen);
  const avg = group.average;
  return (
    <section className="panel overflow-hidden" aria-label={`${name} aging`}>
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left sm:px-5">
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <Chevron collapsed={!open} />
          <Avatar id={group.id} name={name} size={26} />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-ink">{name}</span>
            <span className="block text-[12px] text-ink-3">
              {group.rows.length} task{group.rows.length === 1 ? '' : 's'}
              {group.withoutIdd > 0 && ` · ${group.withoutIdd} without an issue date`}
            </span>
          </span>
        </span>
        <span className="grid w-full grid-cols-2 gap-3 text-[12px] sm:w-auto sm:gap-5">
          {(
            [
              ['CD Age', avg.cdAge],
              ['IDD Age', avg.iddAge],
            ] as const
          ).map(([label, value]) => (
            <span key={label} className="block sm:text-right">
              <span className="block text-2xs text-ink-3">Avg {label}</span>
              <span className="block text-[13.5px] font-semibold"><Age days={value} /></span>
            </span>
          ))}
        </span>
      </button>
      {open && <GroupTable group={group} index={index} onDueChange={onDueChange} />}
    </section>
  );
}

export function AgingPage() {
  const now = useNow(60_000);
  const { saveTask } = useWorkspace();
  const [holder, setHolder] = useState('all');
  const [onlyWithIdd, setOnlyWithIdd] = useState(true);

  return (
    <Gate>
      {({ snapshot, index }) => {
        // Ages count up to today; `now` ticks, so they roll over at midnight on an open page.
        const groups = holderAging(snapshot.tasks, index, { onlyWithIdd }, now);
        const everyone = holderAging(snapshot.tasks, index, { onlyWithIdd: false }, now);
        const shown = holder === 'all' ? groups : groups.filter((g) => g.id === holder);
        const hidden = everyone.reduce((n, g) => n + g.withoutIdd, 0);
        const onDueChange = (task: TodoistTask, dueDate: string | null) => void saveTask(task, { ...formFromTask(task, index), dueDate });

        return (
          <>
            <PageHeader title="Holder Aging" subtitle="How many days ago each task was created and issued, for every holder" />

            <div className="space-y-4">
              <div className="grid gap-2.5 sm:grid-cols-2" role="list" aria-label="How aging is calculated">
                {[
                  ['CD Age', 'Today − CD', 'Goes up by one every day. Changing DD never affects it.'],
                  ['IDD Age', 'Today − IDD', 'Goes up by one every day. Changing DD never affects it.'],
                ].map(([title, formula, note]) => (
                  <div key={title} role="listitem" className="rounded-2xl border border-black/[0.05] bg-black/[0.02] px-4 py-3">
                    <span className="block text-[12.5px] font-semibold text-ink">{title}</span>
                    <span className="block text-[13px] tabular-nums text-ink-2">= {formula}</span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-3">{note}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="inline-flex items-center gap-2 text-[13px] text-ink-2">
                  <Users size={15} aria-hidden />
                  <SearchSelect
                    aria-label="Holder"
                    className="w-auto min-w-60"
                    searchPlaceholder="Search people…"
                    value={holder}
                    onChange={setHolder}
                    options={[
                      { value: 'all', label: 'All holders', hint: String(groups.length) },
                      ...groups.map((g) => ({
                        value: g.id,
                        label: holderName(snapshot, g.id),
                        hint: String(g.rows.length),
                        icon: <Avatar id={g.id} name={holderName(snapshot, g.id)} size={18} />,
                      })),
                    ]}
                  />
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
                  <input type="checkbox" checked={onlyWithIdd} onChange={(e) => setOnlyWithIdd(e.target.checked)} className="h-4 w-4 accent-[#1a7f53]" />
                  Only tasks that have an Issue Date
                  {onlyWithIdd && hidden > 0 && <span className="text-ink-3">({hidden} hidden)</span>}
                </label>
              </div>

              {shown.length === 0 ? (
                <div className="panel">
                  <EmptyState icon={<Hourglass size={26} />} title={onlyWithIdd ? 'No task has an Issue Date yet' : 'No tasks to age'}>
                    {onlyWithIdd
                      ? 'Open a task and enter its Issue Date (IDD) once — it locks as soon as you save. Or untick the filter above to see every task.'
                      : 'Aging needs a Creation Date or an Issue Date in the task title.'}
                  </EmptyState>
                </div>
              ) : (
                <div className="space-y-3">
                  {shown.map((g) => (
                    <HolderBlock key={g.id} group={g} name={holderName(snapshot, g.id)} index={index} open={holder !== 'all'} onDueChange={onDueChange} />
                  ))}
                </div>
              )}

              <Notice>
                CD and IDD are locked — they are written into the Todoist task title once and never change. DD is editable here, and changing it never touches CD Age or IDD Age.
                Routine (repeating) tasks are left out, because they have no single creation or issue date.
              </Notice>
            </div>
          </>
        );
      }}
    </Gate>
  );
}
