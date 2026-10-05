import { Check, ExternalLink, Flag, ListTree, MessageSquare, Pencil, Plus, Send, Tag, Trash2, User } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { formatCd, parseTitle, titleForNewTask } from '../../lib/cd';
import { longFromDateKey, longFromTitleDate, taskDates, type TaskDates } from '../../lib/taskDates';
import { isRoutineSection, isRoutineTask } from '../../lib/routine';
import { addDays, describeDue, dueDateKey, dueTime, formatShortDate, formatTime, startOfWeek, toDateKey } from '../../lib/dates';
import { plainText } from '../../lib/search';
import { descendantsOf, PERSONAL_GROUP_ID, taskPath } from '../../lib/hierarchy';
import { peopleForProject } from '../../lib/projectPeople';
import { PRIORITY_STYLE, toUiPriority, type UiPriority } from '../../lib/priority';
import { isUncompletable, taskTitle } from '../../lib/text';
import { useUi, type NewTaskDefaults } from '../../store/ui';
import { useWorkspace, type TaskForm } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { Modal } from '../common/Modal';
import { TaskDateCards, TaskDateLine } from './TaskDates';
import { TaskAttachments } from './TaskAttachments';
import { VoiceCapture } from './VoiceCapture';
import { taskAttachments } from '../../lib/attachments';
import { Avatar, ProjectDot } from '../common/ui';
import { SearchSelect } from '../common/SearchSelect';

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
  const { openTask, openNewTask } = useUi();
  const now = useMemo(() => new Date(), []);

  const initial = useMemo<TaskForm>(() => {
    if (task) {
      return {
        // Both dates are shown separately, so editing the title cannot disturb them.
        content: parseTitle(task.content).title,
        description: task.description,
        projectId: task.project_id,
        sectionId: task.section_id && index?.sectionById.has(task.section_id) ? task.section_id : null,
        dueDate: dueDateKey(task.due),
        // Never pre-filled: a stored IDD is shown locked, and a missing one is entered here once.
        idd: null,
        assigneeId: task.responsible_uid ?? null,
        priority: toUiPriority(task.priority),
      };
    }
    const fallbackProject = snapshot?.user.inbox_project_id ?? index?.orderedProjects[0]?.project.id ?? '';
    const projectId = defaults?.projectId && index?.projectById.has(defaults.projectId) ? defaults.projectId : fallbackProject;
    // Created under a task: Todoist keeps it in the parent's project, whatever is shown here.
    const parent = defaults?.parentId ? index?.taskById.get(defaults.parentId) : undefined;
    return {
      content: '',
      description: '',
      projectId: parent?.project_id ?? projectId,
      sectionId: parent ? (parent.section_id ?? null) : (defaults?.sectionId ?? null),
      parentId: parent?.id ?? null,
      dueDate: defaults?.dueDate ?? null,
      idd: null,
      // Held by whoever the page is about, when it was opened from their own list.
      assigneeId: defaults?.assigneeId ?? null,
      priority: 4,
    };
  }, [task, defaults, index, snapshot]);

  const [form, setForm] = useState<TaskForm>(initial);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dueInput = useRef<HTMLInputElement>(null);

  if (!index) return null;
  const set = <K extends keyof TaskForm>(key: K, value: TaskForm[K]) => {
    setConfirmDelete(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const sections = index.sectionsByProject.get(form.projectId) ?? [];
  const dirty = (Object.keys(initial) as (keyof TaskForm)[]).some((k) => form[k] !== initial[k]);
  const valid = form.content.trim().length > 0 && index.projectById.has(form.projectId);
  const subtasks = task ? descendantsOf(index, task.id) : [];
  // Only the children directly under this task are drawn; each of those opens its own dialog.
  const children = task ? (index.subtasks.get(task.id) ?? []) : [];
  const parentTask = form.parentId ? index.taskById.get(form.parentId) : undefined;
  const sectionName = form.sectionId ? (index.sectionById.get(form.sectionId)?.name ?? '') : '';
  const routine = (task ? isRoutineTask(task, index) : false) || isRoutineSection(sectionName);
  const assignee = task?.responsible_uid ? snapshot?.people[task.responsible_uid] : undefined;
  // Only the people on the project this task sits in — and whoever holds it already, if they have
  // since left it. Changing the project changes the list.
  const people = snapshot ? peopleForProject(snapshot, form.projectId, { include: task?.responsible_uid }) : [];
  // The connected Todoist account, when it is one of the people this project can hand work to.
  const me = people.find((person) => person.id === snapshot?.user.id);

  // The three dates as they stand, and what saving will newly record. CD and IDD, once written,
  // are only ever shown; nothing in this form can edit them. A task with no IDD yet gets a one-time
  // box for it, and that is the only way an IDD is ever recorded.
  const chosenDue = longFromDateKey(form.dueDate);
  const storedDates: TaskDates | null = task ? taskDates(task) : null;
  const iddOpen = !routine && (storedDates ? !storedDates.iddKey : true);
  const iddEntered = iddOpen && !!form.idd;
  const cardDates: TaskDates = storedDates
    ? { ...storedDates, idd: iddEntered ? longFromDateKey(form.idd) : storedDates.idd, iddKey: iddEntered ? form.idd : storedDates.iddKey, dd: chosenDue, ddKey: form.dueDate }
    : {
        title: '',
        cd: longFromTitleDate(formatCd(now)),
        cdKey: toDateKey(now),
        cdTime: formatTime(now),
        cdFrom: 'title',
        idd: iddEntered ? longFromDateKey(form.idd) : null,
        iddKey: iddEntered ? form.idd : null,
        dd: chosenDue,
        ddKey: form.dueDate,
        ddTime: null,
      };

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
        <Trash2 size={14} /> {busy ? 'Deleting…' : 'Delete'}
      </button>
    </>
  ) : (
    <>
      {task && (
        <>
          {!isUncompletable(task.content) && (
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
          )}
          <button className="btn-ghost text-danger hover:text-danger" onClick={() => setConfirmDelete(true)} disabled={busy} aria-label="Delete task">
            <Trash2 size={14} /> <span className="hidden sm:inline">Delete</span>
          </button>
        </>
      )}
      <span className="flex-1" />
      <button className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
      <button className="btn-primary" onClick={() => submit()} disabled={!valid || busy || (!!task && !dirty)}>
        {busy ? (task ? 'Updating…' : 'Saving…') : task ? 'Save' : 'Add task'}
      </button>
    </>
  );

  return (
    <Modal
      onClose={onClose}
      title={
        task ? (
          <span className="block truncate">{taskPath(index, task).join(' › ')}</span>
        ) : parentTask ? (
          <span className="flex min-w-0 items-baseline gap-1">
            <span className="shrink-0 font-medium text-ink">New subtask</span>
            <span className="shrink-0">of</span>
            <span className="truncate">{taskTitle(parentTask.content)}</span>
          </span>
        ) : (
          <span className="font-medium text-ink">New task</span>
        )
      }
      footer={footer}
    >
      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        className="space-y-5"
      >
        <div>
          <div className="flex items-start gap-2">
            <input
              data-autofocus={task ? undefined : true}
              className="min-w-0 flex-1 rounded-xl border border-black/[0.07] bg-surface px-3.5 py-2 text-[16px] font-semibold leading-7 text-ink placeholder:font-normal placeholder:text-ink-3 focus:border-black/20 focus:outline-none focus:ring-4 focus:ring-black/[0.04]"
              placeholder="Task name"
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              aria-label="Task name"
            />
            {!task && <VoiceCapture single useLabel="Use this task" onTasks={(spoken) => spoken[0] && set('content', spoken[0])} />}
          </div>
          <div className="mt-3.5">
            <TaskDateCards
              dates={cardDates}
              cdTime={task ? cardDates.cdTime : null}
              routine={routine}
              pending={task ? { idd: iddEntered } : { cd: true, idd: iddEntered }}
              iddEditor={iddOpen ? { value: form.idd, onChange: (v) => set('idd', v), dueDate: form.dueDate } : undefined}
              ddPreview={chosenDue}
              onEditDue={() => dueInput.current?.focus()}
            />
            {!task && !routine && (
              <p className="mt-2 truncate text-[11.5px] text-ink-3" title={titleForNewTask(form.content.trim() || 'Task name', now, form.idd)}>
                Saved in Todoist as “{titleForNewTask(form.content.trim() || 'Task name', now, form.idd)}”
              </p>
            )}
          </div>
          <textarea
            className="mt-3 w-full resize-none rounded-xl border border-black/[0.07] bg-surface px-3 py-2 text-[13px] leading-5 text-ink-2 placeholder:text-ink-3 focus:border-black/20 focus:outline-none focus:ring-4 focus:ring-black/[0.04]"
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
            <SearchSelect
              id="task-project"
              disabled={!!form.parentId}
              searchPlaceholder="Search projects…"
              value={form.projectId}
              onChange={(projectId) =>
                setForm((f) => {
                  // A holder who is not on the new project cannot hold the task there.
                  const stillThere = snapshot && f.assigneeId ? peopleForProject(snapshot, projectId).some((p) => p.id === f.assigneeId) : false;
                  return { ...f, projectId, sectionId: null, assigneeId: stillThere ? f.assigneeId : null };
                })
              }
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
            <label className="label" htmlFor="task-section">Section</label>
            <SearchSelect
              id="task-section"
              searchPlaceholder="Search sections…"
              value={form.sectionId ?? ''}
              onChange={(id) => set('sectionId', id || null)}
              disabled={sections.length === 0 || !!form.parentId}
              options={[
                { value: '', label: sections.length ? 'No section' : 'No sections in this project' },
                ...sections.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="task-assignee">Holder</label>
            <SearchSelect
              id="task-assignee"
              className="w-full"
              searchPlaceholder="Search people…"
              placeholder="No one"
              value={form.assigneeId ?? ''}
              onChange={(id) => set('assigneeId', id || null)}
              options={[
                { value: '', label: 'No one' },
                ...people.map((person) => ({
                  value: person.id,
                  label: person.name,
                  icon: <Avatar id={person.id} name={person.name} size={18} />,
                })),
              ]}
            />
            {me && form.assigneeId !== me.id && (
              <button type="button" className="mt-1.5 text-[12px] font-medium text-accent hover:underline" onClick={() => set('assigneeId', me.id)}>
                Assign to me
              </button>
            )}
            <p className="mt-1.5 text-[12px] leading-4 text-ink-3">
              {people.length === 0
                ? 'Nobody is on this project in Todoist yet, so it has no holder to choose.'
                : `${people.length} ${people.length === 1 ? 'person is' : 'people are'} on this project.`}
            </p>
          </div>

          <div>
            <label className="label inline-flex items-center gap-1.5" htmlFor="task-due">
              DD · Due date <Pencil size={11} strokeWidth={2.25} className="text-accent" aria-hidden />
              <span className="font-normal text-ink-3">editable</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="task-due"
                ref={dueInput}
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
        {task && (
          <section className="border-t border-line pt-3" aria-label="Subtasks">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                <ListTree size={13} aria-hidden /> Subtasks <span className="font-normal text-ink-3">{children.length}</span>
              </h3>
              <button type="button" className="btn-secondary h-8 text-[12.5px]" onClick={() => openNewTask({ parentId: task.id })}>
                <Plus size={14} /> Add subtask
              </button>
            </div>
            {children.length > 0 && (
              <ul className="text-[13px]">
                {children.map((child, i) => {
                  const last = i === children.length - 1;
                  const dates = taskDates(child);
                  return (
                    <li key={child.id} className="flex items-start gap-2 py-1">
                      <span aria-hidden className="select-none pt-0.5 font-mono text-[12px] leading-5 text-ink-3">{last ? '└─' : '├─'}</span>
                      <button type="button" onClick={() => openTask(child.id)} className="min-w-0 flex-1 text-left">
                        <span className="block break-words text-ink hover:underline">{taskTitle(child.content)}</span>
                        <TaskDateLine dates={dates} />
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12px] text-ink-3">
                          {(() => {
                            const held = child.responsible_uid ? snapshot?.people[child.responsible_uid] : undefined;
                            return (
                              <span className="inline-flex items-center gap-1">
                                <User size={11} aria-hidden /> {held?.name ?? 'No holder'}
                              </span>
                            );
                          })()}
                          {(() => {
                            const state = describeDue(child.due, now);
                            return state ? <span className={`font-medium ${DUE_TONE[state.tone]}`}>{state.label}</span> : <span>No due date</span>;
                          })()}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
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
  // Todoist keeps a task's files on its comments; a task with none shows no attachment area at all.
  const files = taskAttachments(snapshot.comments, taskId);

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    const ok = await addComment(taskId, draft);
    setSending(false);
    if (ok) setDraft('');
  };

  return (
    <>
      <TaskAttachments files={files} />
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
    </>
  );
}

/** The colour a subtask's due state is written in, matching the task rows. */
const DUE_TONE = { overdue: 'text-p1', today: 'text-accent', soon: 'text-ink-2', later: 'text-ink-3' } as const;
