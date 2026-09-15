import { Check, ExternalLink, Flag, MessageSquare, Send, Tag, Trash2, User } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { addDays, dueDateKey, dueTime, formatShortDate, formatTime, startOfWeek, toDateKey } from '../../lib/dates';
import { plainText } from '../../lib/search';
import { descendantsOf, PERSONAL_GROUP_ID, taskPath } from '../../lib/hierarchy';
import { PRIORITY_STYLE, toUiPriority, type UiPriority } from '../../lib/priority';
import { useUi, type NewTaskDefaults } from '../../store/ui';
import { useWorkspace, type TaskForm } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/ui';

export function TaskDialog() {
  const { dialog, closeDialog } = useUi();
  const { index } = useWorkspace();
  if (dialog.kind === 'closed' || !index) return null;
  if (dialog.kind === 'create') return <TaskEditor key="create" defaults={dialog.defaults} onClose={closeDialog} />;
  const task = index.taskById.get(dialog.taskId);
  if (!task) return <MissingTask onClose={closeDialog} />;
  return <TaskEditor key={task.id} task={task} onClose={closeDialog} />;
}

function MissingTask({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Task" onClose={onClose} footer={<button className="btn-secondary ml-auto" onClick={onClose}>Close</button>}>
      <p className="text-[14px] text-ink-2">This task is no longer open in Todoist — it may have been completed, deleted or moved.</p>
    </Modal>
  );
}

function TaskEditor({ task, defaults, onClose }: { task?: TodoistTask; defaults?: NewTaskDefaults; onClose: () => void }) {
  const { index, snapshot, mode, createTask, saveTask, completeTask, deleteTask } = useWorkspace();
  const now = useMemo(() => new Date(), []);

  const initial = useMemo<TaskForm>(() => {
    if (task) {
      return {
        content: task.content,
        description: task.description,
        projectId: task.project_id,
        sectionId: task.section_id && index?.sectionById.has(task.section_id) ? task.section_id : null,
        dueDate: dueDateKey(task.due),
        priority: toUiPriority(task.priority),
      };
    }
    const fallbackProject = snapshot?.user.inbox_project_id ?? index?.orderedProjects[0]?.project.id ?? '';
    const projectId = defaults?.projectId && index?.projectById.has(defaults.projectId) ? defaults.projectId : fallbackProject;
    return {
      content: '',
      description: '',
      projectId,
      sectionId: defaults?.sectionId ?? null,
      dueDate: defaults?.dueDate ?? null,
      priority: 4,
    };
  }, [task, defaults, index, snapshot]);

  const [form, setForm] = useState<TaskForm>(initial);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!index) return null;
  const set = <K extends keyof TaskForm>(key: K, value: TaskForm[K]) => {
    setConfirmDelete(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const sections = index.sectionsByProject.get(form.projectId) ?? [];
  const dirty = (Object.keys(initial) as (keyof TaskForm)[]).some((k) => form[k] !== initial[k]);
  const valid = form.content.trim().length > 0 && index.projectById.has(form.projectId);
  const subtasks = task ? descendantsOf(index, task.id) : [];
  const assignee = task?.responsible_uid ? snapshot?.people[task.responsible_uid] : undefined;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid || busy || (task && !dirty)) return;
    setBusy(true);
    const ok = task ? await saveTask(task, form) : await createTask(form);
    setBusy(false);
    if (ok) onClose();
  };

  const remove = async () => {
    if (!task) return;
    setBusy(true);
    const ok = await deleteTask(task.id);
    setBusy(false);
    if (ok) onClose();
  };

  const quickDates: [string, string | null][] = [
    ['Today', toDateKey(now)],
    ['Tomorrow', toDateKey(addDays(now, 1))],
    ['Next week', toDateKey(addDays(startOfWeek(now), 7))],
    ['No date', null],
  ];

  const footer = confirmDelete ? (
    <>
      <span className="mr-auto text-[13px] text-ink">
        Delete this task{subtasks.length ? ` and ${subtasks.length} subtask${subtasks.length > 1 ? 's' : ''}` : ''} from Todoist?
      </span>
      <button className="btn-secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>Keep</button>
      <button className="btn-danger" onClick={remove} disabled={busy}>
        <Trash2 size={14} /> Delete
      </button>
    </>
  ) : (
    <>
      {task && (
        <>
          <button
            className="btn-secondary"
            onClick={() => {
              completeTask(task.id);
              onClose();
            }}
            disabled={busy}
          >
            <Check size={14} className="text-accent" /> Complete
          </button>
          <button className="btn-ghost text-danger hover:text-danger" onClick={() => setConfirmDelete(true)} disabled={busy} aria-label="Delete task">
            <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
          </button>
        </>
      )}
      <span className="flex-1" />
      <button className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
      <button className="btn-primary" onClick={() => submit()} disabled={!valid || busy || (!!task && !dirty)}>
        {busy ? 'Saving…' : task ? 'Save' : 'Add task'}
      </button>
    </>
  );

  return (
    <Modal
      onClose={onClose}
      title={task ? <span className="truncate">{taskPath(index, task).join(' › ')}</span> : <span className="font-medium text-ink">New task</span>}
      footer={footer}
    >
      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        className="space-y-4"
      >
        <div>
          <input
            data-autofocus={task ? undefined : true}
            className="w-full border-0 bg-transparent p-0 text-[17px] font-semibold leading-6 text-ink placeholder:font-normal placeholder:text-ink-3 focus:outline-none focus:ring-0"
            placeholder="Task name"
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            aria-label="Task name"
          />
          <textarea
            className="mt-1.5 w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-5 text-ink-2 placeholder:text-ink-3 focus:outline-none focus:ring-0"
            placeholder="Description"
            rows={Math.min(6, Math.max(2, form.description.split('\n').length))}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            aria-label="Description"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="task-project">Project</label>
            <select
              id="task-project"
              className="field"
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, sectionId: null }))}
            >
              {index.groups.map((group) => (
                <optgroup key={group.id} label={group.name}>
                  {index.orderedProjects
                    .filter((node) => (node.project.workspace_id ? String(node.project.workspace_id) : PERSONAL_GROUP_ID) === group.id)
                    .map((node) => (
                      <option key={node.project.id} value={node.project.id}>
                        {'   '.repeat(node.depth)}
                        {node.project.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="task-section">Section</label>
            <select
              id="task-section"
              className="field"
              value={form.sectionId ?? ''}
              onChange={(e) => set('sectionId', e.target.value || null)}
              disabled={sections.length === 0}
            >
              <option value="">{sections.length ? 'No section' : 'No sections in this project'}</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="task-due">Due date</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="task-due"
              type="date"
              className="field w-auto"
              value={form.dueDate ?? ''}
              onChange={(e) => set('dueDate', e.target.value || null)}
            />
            {quickDates.map(([label, value]) => (
              <button
                key={label}
                type="button"
                onClick={() => set('dueDate', value)}
                className={`h-7 rounded-full border px-2.5 text-[12px] transition-colors ${form.dueDate === value ? 'border-accent bg-accent-soft font-medium text-accent' : 'border-line text-ink-2 hover:bg-hover'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {task?.due?.is_recurring && form.dueDate !== initial.dueDate && (
            <p className="mt-1.5 text-[12px] text-p2">This task repeats. Setting a fixed date replaces its repeat schedule in Todoist.</p>
          )}
          {task && dueTime(task.due) && form.dueDate === initial.dueDate && (
            <p className="mt-1.5 text-[12px] text-ink-3">Due at {dueTime(task.due)}</p>
          )}
        </div>

        <div>
          <span className="label">Priority</span>
          <div className="inline-flex rounded-md border border-line p-0.5" role="radiogroup" aria-label="Priority">
            {([1, 2, 3, 4] as UiPriority[]).map((p) => {
              const active = form.priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set('priority', p)}
                  className={`inline-flex h-7 items-center gap-1 rounded px-3 text-[12px] font-medium transition-colors ${active ? 'bg-ink text-white' : 'text-ink-2 hover:bg-hover'}`}
                >
                  <Flag size={11} strokeWidth={2.5} className={active ? '' : PRIORITY_STYLE[p].text} />
                  P{p}
                </button>
              );
            })}
          </div>
        </div>

        {task && (task.labels.length > 0 || task.note_count > 0 || assignee || subtasks.length > 0 || mode === 'live') && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-[12px] text-ink-2">
            {assignee && (
              <span className="inline-flex items-center gap-1"><User size={12} /> {assignee.name}</span>
            )}
            {task.labels.map((l) => (
              <span key={l} className="inline-flex items-center gap-1"><Tag size={11} /> {l}</span>
            ))}
            {task.note_count > 0 && (
              <span className="inline-flex items-center gap-1"><MessageSquare size={12} /> {task.note_count} comment{task.note_count > 1 ? 's' : ''}</span>
            )}
            {subtasks.length > 0 && <span>{subtasks.length} subtask{subtasks.length > 1 ? 's' : ''}</span>}
            {mode === 'live' && (
              <a
                href={`https://app.todoist.com/app/task/${encodeURIComponent(task.id)}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-accent hover:underline"
              >
                Open in Todoist <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}
        <button type="submit" hidden />
      </form>
      {task && <TaskComments taskId={task.id} />}
    </Modal>
  );
}

/** Comments on a task from Todoist, oldest first, with a box to add one. */
function TaskComments({ taskId }: { taskId: string }) {
  const { snapshot, addComment } = useWorkspace();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const now = useMemo(() => new Date(), []);
  if (!snapshot) return null;
  const comments = snapshot.comments.filter((c) => c.task_id === taskId).sort((a, b) => (a.posted_at ?? '').localeCompare(b.posted_at ?? ''));

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    const ok = await addComment(taskId, draft);
    setSending(false);
    if (ok) setDraft('');
  };

  return (
    <section className="mt-4 border-t border-line pt-3" aria-label="Comments">
      <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        <MessageSquare size={13} /> Comments <span className="font-normal text-ink-3">{comments.length}</span>
      </h3>
      {comments.length > 0 && (
        <ul className="mb-3 space-y-3">
          {comments.map((c) => {
            const author = c.posted_uid ? snapshot.people[c.posted_uid] : undefined;
            const at = c.posted_at ? new Date(c.posted_at) : null;
            return (
              <li key={c.id} className="flex gap-2.5">
                <Avatar id={c.posted_uid ?? 'unknown'} name={author?.name ?? '?'} size={22} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-[12px]">
                    <span className="font-semibold text-ink">{author?.name ?? 'Unknown person'}</span>
                    {at && <span className="text-ink-3">{formatShortDate(at, now)}, {formatTime(at)}</span>}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[13px] text-ink">{plainText(c.content)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
          }}
          rows={Math.min(4, Math.max(1, draft.split('\n').length))}
          placeholder="Write a comment…"
          aria-label="New comment"
          className="field h-auto min-h-9 resize-none py-2"
        />
        <button type="button" className="btn-secondary h-9" onClick={send} disabled={!draft.trim() || sending}>
          <Send size={14} /> {sending ? 'Posting…' : 'Post'}
        </button>
      </div>
    </section>
  );
}
