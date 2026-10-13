import { CalendarDays, Check, CircleCheckBig, Copy, CornerUpRight, Loader2, Trash2, User, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { addDays, startOfWeek, toDateKey } from '../../lib/dates';
import { PERSONAL_GROUP_ID } from '../../lib/hierarchy';
import { peopleForProject } from '../../lib/projectPeople';
import { useSelection } from '../../store/selection';
import { useUi } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { Modal } from '../common/Modal';
import { SearchSelect } from '../common/SearchSelect';
import { Avatar, ProjectDot } from '../common/ui';

type Job = 'complete' | 'due' | 'assign' | 'move' | 'duplicate' | 'delete';

const JOB_WORDS: Record<Job, { working: string; done: string }> = {
  complete: { working: 'Completing', done: 'completed' },
  due: { working: 'Rescheduling', done: 'rescheduled' },
  assign: { working: 'Handing over', done: 'handed over' },
  move: { working: 'Moving', done: 'moved' },
  duplicate: { working: 'Copying', done: 'copied' },
  delete: { working: 'Deleting', done: 'deleted' },
};

/**
 * What to do with the tasks that have been picked out: finish them, reschedule them, hand them to
 * someone, move them, copy them or delete them. It sits along the bottom while anything is picked,
 * and says what it is doing as it works through them one at a time.
 */
export function SelectionBar() {
  const { ids, count, clear } = useSelection();
  const { index, snapshot, completeTask, deleteTask, moveTask, assignTask, setDueDate, duplicateTask } = useWorkspace();
  const { notify } = useUi();
  const [busy, setBusy] = useState<{ job: Job; done: number } | null>(null);
  const [asking, setAsking] = useState<'due' | 'assign' | 'move' | 'delete' | null>(null);

  if (!index || count === 0) return null;
  const tasks = [...ids].map((id) => index.taskById.get(id)).filter((t): t is TodoistTask => !!t);
  if (tasks.length === 0) return null;

  /** Runs one job over every picked task, in order, and reports what happened. */
  const run = async (job: Job, each: (task: TodoistTask) => Promise<boolean> | boolean | void) => {
    if (busy) return;
    setAsking(null);
    setBusy({ job, done: 0 });
    let ok = 0;
    let failed = 0;
    for (const task of tasks) {
      const result = await each(task);
      if (result === false) failed += 1;
      else ok += 1;
      setBusy({ job, done: ok + failed });
    }
    setBusy(null);
    const words = JOB_WORDS[job];
    notify({
      tone: failed ? 'error' : 'success',
      message: failed
        ? `${ok} ${words.done}, ${failed} could not be ${words.done}`
        : `${ok} task${ok === 1 ? '' : 's'} ${words.done}`,
    });
    if (!failed) clear();
  };

  // Only the people who are on every picked task's project can hold all of them.
  const people = snapshot
    ? peopleForProject(snapshot, tasks[0].project_id).filter((person) =>
        tasks.every((task) => peopleForProject(snapshot!, task.project_id).some((p) => p.id === person.id)),
      )
    : [];

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-3 md:bottom-6">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl bg-ink px-2.5 py-2 text-white shadow-pop">
          <span className="px-1.5 text-[13px] font-semibold tabular-nums">
            {busy ? `${JOB_WORDS[busy.job].working} ${busy.done} of ${tasks.length}…` : `${tasks.length} selected`}
          </span>
          <span aria-hidden className="mx-0.5 h-5 w-px bg-white/15" />
          <Action icon={<CircleCheckBig size={14} />} label="Complete" onClick={() => void run('complete', (t) => completeTask(t.id))} disabled={!!busy} />
          <Action icon={<CalendarDays size={14} />} label="Due date" onClick={() => setAsking('due')} disabled={!!busy} />
          <Action icon={<User size={14} />} label="Assign" onClick={() => setAsking('assign')} disabled={!!busy} />
          <Action icon={<CornerUpRight size={14} />} label="Move to" onClick={() => setAsking('move')} disabled={!!busy} />
          <Action icon={<Copy size={14} />} label="Duplicate" onClick={() => void run('duplicate', duplicateTask)} disabled={!!busy} />
          <Action icon={<Trash2 size={14} />} label="Delete" tone="danger" onClick={() => setAsking('delete')} disabled={!!busy} />
          <span aria-hidden className="mx-0.5 h-5 w-px bg-white/15" />
          <button
            type="button"
            onClick={clear}
            disabled={!!busy}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Clear the selection"
            title="Clear the selection"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
          </button>
        </div>
      </div>

      {asking === 'due' && (
        <DueDialog
          count={tasks.length}
          onClose={() => setAsking(null)}
          onPick={(dateKey) => void run('due', (t) => setDueDate(t, dateKey))}
        />
      )}

      {asking === 'assign' && (
        <AskDialog
          title="Hand over"
          field="Holder"
          note={
            people.length
              ? 'Only the people who are on every one of these projects can be chosen.'
              : 'Nobody is on all of these projects in Todoist, so there is no one to hand them to.'
          }
          action="Assign tasks"
          options={[{ value: '', label: 'No one' }, ...people.map((p) => ({ value: p.id, label: p.name, icon: <Avatar id={p.id} name={p.name} size={18} /> }))]}
          onClose={() => setAsking(null)}
          onPick={(id) => void run('assign', (t) => assignTask(t, id || null))}
        />
      )}

      {asking === 'move' && <MoveDialog tasks={tasks} onClose={() => setAsking(null)} onPick={(to) => void run('move', (t) => moveTask(t, to))} />}

      {asking === 'delete' && (
        <Modal
          title={<span className="font-medium text-ink">Delete {tasks.length} task{tasks.length === 1 ? '' : 's'}?</span>}
          onClose={() => setAsking(null)}
          width="max-w-md"
          footer={
            <>
              <button type="button" className="btn-ghost" onClick={() => setAsking(null)}>Keep</button>
              <button type="button" className="btn-danger" onClick={() => void run('delete', (t) => deleteTask(t.id))}>
                <Trash2 size={14} /> Delete from Todoist
              </button>
            </>
          }
        >
          <p className="text-[13.5px] text-ink-2">
            They are deleted in Todoist itself, with their subtasks and comments. This cannot be undone.
          </p>
        </Modal>
      )}
    </>
  );
}

function Action({
  icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium hover:bg-white/10 disabled:opacity-40 ${
        tone === 'danger' ? 'text-red-300 hover:text-red-200' : 'text-white/90 hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** One date for every picked task, or none at all. */
function DueDialog({ count, onClose, onPick }: { count: number; onClose: () => void; onPick: (dateKey: string | null) => void }) {
  const now = new Date();
  const [date, setDate] = useState('');
  const quick: [string, string | null][] = [
    ['Today', toDateKey(now)],
    ['Tomorrow', toDateKey(addDays(now, 1))],
    ['Next week', toDateKey(addDays(startOfWeek(now), 7))],
    ['No date', null],
  ];
  return (
    <Modal
      title={<span className="font-medium text-ink">Due date for {count} task{count === 1 ? '' : 's'}</span>}
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => onPick(date || null)} disabled={!date}>
            <Check size={14} /> Set due date
          </button>
        </>
      }
    >
      <label className="label" htmlFor="bulk-due">DD · Due date</label>
      <input id="bulk-due" data-autofocus type="date" className="field w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        {quick.map(([label, value]) => (
          <button
            key={label}
            type="button"
            className="h-8 rounded-full border border-line px-3 text-[12.5px] text-ink-2 hover:bg-hover"
            onClick={() => onPick(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-3">Only DD changes. CD and IDD stay locked, as always.</p>
    </Modal>
  );
}

/** Where the picked tasks go: a project, and a section inside it. */
function MoveDialog({
  tasks,
  onClose,
  onPick,
}: {
  tasks: TodoistTask[];
  onClose: () => void;
  onPick: (to: { projectId: string; sectionId: string | null }) => void;
}) {
  const { index } = useWorkspace();
  const [projectId, setProjectId] = useState(tasks[0].project_id);
  const [sectionId, setSectionId] = useState<string | null>(null);
  if (!index) return null;
  const sections = index.sectionsByProject.get(projectId) ?? [];

  return (
    <Modal
      title={<span className="font-medium text-ink">Move {tasks.length} task{tasks.length === 1 ? '' : 's'}</span>}
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => onPick({ projectId, sectionId })}>
            <CornerUpRight size={14} /> Move tasks
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="bulk-move-project">Project</label>
          <SearchSelect
            id="bulk-move-project"
            searchPlaceholder="Search projects…"
            value={projectId}
            onChange={(id) => {
              setProjectId(id);
              setSectionId(null);
            }}
            options={index.groups.flatMap((group) =>
              index.orderedProjects
                .filter((node) => (node.project.workspace_id ? String(node.project.workspace_id) : PERSONAL_GROUP_ID) === group.id)
                .map((node) => ({
                  value: node.project.id,
                  label: node.project.name,
                  group: group.name,
                  depth: node.depth,
                  icon: <ProjectDot color={node.project.color} />,
                })),
            )}
          />
        </div>
        <div>
          <label className="label" htmlFor="bulk-move-section">Section</label>
          <SearchSelect
            id="bulk-move-section"
            searchPlaceholder="Search sections…"
            value={sectionId ?? ''}
            onChange={(id) => setSectionId(id || null)}
            disabled={sections.length === 0}
            options={[
              { value: '', label: sections.length ? 'No section' : 'No sections in this project' },
              ...sections.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </div>
        <p className="text-[12.5px] text-ink-3">Subtasks move with their task. Dates, holders and comments stay as they are.</p>
      </div>
    </Modal>
  );
}

/** A one-field question — used for handing the picked tasks to someone. */
function AskDialog({
  title,
  field,
  note,
  action,
  options,
  onClose,
  onPick,
}: {
  title: string;
  field: string;
  note: string;
  action: string;
  options: { value: string; label: string; icon?: ReactNode }[];
  onClose: () => void;
  onPick: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  return (
    <Modal
      title={<span className="font-medium text-ink">{title}</span>}
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => onPick(value)}>
            {action}
          </button>
        </>
      }
    >
      <label className="label" htmlFor="bulk-ask">{field}</label>
      <SearchSelect id="bulk-ask" value={value} onChange={setValue} options={options} searchPlaceholder={`Search ${field.toLowerCase()}…`} />
      <p className="mt-2 text-[12.5px] text-ink-3">{note}</p>
    </Modal>
  );
}
