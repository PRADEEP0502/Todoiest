import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { dueDateKey } from '../lib/dates';
import { buildIndex, descendantsOf, type WorkspaceIndex } from '../lib/hierarchy';
import { toApiPriority, type UiPriority } from '../lib/priority';
import type { MetricRules } from '../lib/metrics';
import {
  cacheClear,
  createDemoSource,
  createLiveSource,
  verifyToken,
  type DataMode,
  type DataSource,
  type SyncStep,
} from '../services/todoist';
import type { TodoistComment, TodoistProject, TodoistSection, TodoistTask, UpdateTaskInput, WorkspaceSnapshot } from '../types/todoist';
import { TodoistApiError } from '../services/todoist';
import { href, navigate } from '../hooks/useRoute';
import { formatShortDate, parseDateKey } from '../lib/dates';
import { loadSettings, saveSettings, withoutSavedToken, type Settings } from './settings';
import { useUi } from './ui';

export interface SyncState {
  status: 'idle' | 'syncing' | 'done' | 'error';
  step: SyncStep | null;
  error: string | null;
  lastSyncedAt: string | null;
  /** True while the screen shows data saved on this device and a fresh sync is running. */
  fromCache: boolean;
}

/** Every change the dashboard sends to Todoist. */
export type WriteKind = 'create' | 'update' | 'move' | 'complete' | 'reopen' | 'delete' | 'comment';

const WRITE_LABELS: Record<WriteKind, [working: string, done: string]> = {
  create: ['Saving…', 'Saved ✓'],
  update: ['Updating…', 'Updated ✓'],
  move: ['Moving…', 'Moved ✓'],
  complete: ['Completing…', 'Completed ✓'],
  reopen: ['Reopening…', 'Reopened ✓'],
  delete: ['Deleting…', 'Deleted ✓'],
  comment: ['Saving…', 'Saved ✓'],
};

export interface WriteState {
  phase: 'idle' | 'working' | 'done' | 'error';
  label: string;
}

/** The only failure text people see — raw API errors are never shown. */
export const WRITE_FAILED = 'Unable to update Todoist. Please try again.';

export interface NewProjectForm {
  name: string;
  color: string;
  /** Team workspace id, or null for a personal project. */
  workspaceId: string | null;
  parentId: string | null;
}

export interface TaskForm {
  content: string;
  description: string;
  projectId: string;
  sectionId: string | null;
  /** `YYYY-MM-DD` or null for no date. */
  dueDate: string | null;
  priority: UiPriority;
}

interface WorkspaceContextValue {
  mode: DataMode;
  settings: Settings;
  snapshot: WorkspaceSnapshot | null;
  index: WorkspaceIndex | null;
  sync: SyncState;
  /** True while Todoist's live channel is connected and pushing changes to us. */
  liveUpdates: boolean;
  /** Progress of changes being sent to Todoist: Saving… → Saved ✓. */
  writeState: WriteState;
  syncNow: () => Promise<void>;
  createProject: (form: NewProjectForm) => Promise<TodoistProject | null>;
  createSection: (projectId: string, name: string) => Promise<TodoistSection | null>;
  createTask: (form: TaskForm) => Promise<boolean>;
  saveTask: (task: TodoistTask, form: TaskForm) => Promise<boolean>;
  completeTask: (taskId: string) => void;
  reopenTask: (task: TodoistTask) => void;
  deleteTask: (taskId: string) => Promise<boolean>;
  addComment: (taskId: string, content: string) => Promise<TodoistComment | null>;
  setRules: (rules: MetricRules) => void;
  setNotifyOwnActions: (value: boolean) => void;
  connectLive: (token: string) => Promise<{ name: string }>;
  switchToDemo: () => void;
  forgetToken: () => void;
  setDisplayName: (name: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const AUTO_SYNC_MS = 5 * 60 * 1000;
const FOCUS_SYNC_AFTER_MS = 60 * 1000;
/** After a change, sync shortly so activity, counts and notifications catch up. */
const AFTER_WRITE_SYNC_MS = 1500;
/** Small pause after a live notice, so a burst of changes becomes one sync. */
const LIVE_SYNC_DEBOUNCE_MS = 800;
const DONE_VISIBLE_MS = 3000;
const ERROR_VISIBLE_MS = 5000;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong.');
const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { notify } = useUi();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [sync, setSync] = useState<SyncState>({ status: 'idle', step: null, error: null, lastSyncedAt: null, fromCache: false });

  // A new source (and a clean slate) whenever the mode or token changes: demo and live data never mix.
  const source = useMemo<DataSource>(
    () => (settings.mode === 'live' && settings.token ? createLiveSource(settings.token) : createDemoSource()),
    [settings.mode, settings.token],
  );

  useEffect(() => saveSettings(settings), [settings]);

  const inFlight = useRef<Promise<void> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Bumped at the start and end of every write, so a sync that overlapped a write is retried. */
  const writeVersion = useRef(0);
  const lastSyncedAt = useRef(0);
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const syncNow = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const controller = new AbortController();
    abortRef.current = controller;

    const job = (async () => {
      clearTimeout(doneTimer.current);
      setSync((s) => ({ ...s, status: 'syncing', step: null, error: null }));
      try {
        for (let attempt = 0; ; attempt++) {
          const startedAt = writeVersion.current;
          const next = await source.sync((step) => {
            if (!controller.signal.aborted) setSync((s) => ({ ...s, step }));
          }, controller.signal);
          if (controller.signal.aborted) return;
          // A task was changed while we were fetching; fetch again so the change isn't overwritten.
          if (writeVersion.current !== startedAt && attempt < 2) continue;

          setSnapshot(next);
          lastSyncedAt.current = Date.now();
          setSync({ status: 'done', step: null, error: null, lastSyncedAt: next.syncedAt, fromCache: false });
          doneTimer.current = setTimeout(() => setSync((s) => (s.status === 'done' ? { ...s, status: 'idle' } : s)), 2500);
          return;
        }
      } catch (err) {
        if (controller.signal.aborted || isAbort(err)) return;
        setSync((s) => ({ ...s, status: 'error', step: null, error: errorMessage(err) }));
      } finally {
        if (abortRef.current === controller) {
          inFlight.current = null;
          abortRef.current = null;
        }
      }
    })();

    inFlight.current = job;
    return job;
  }, [source]);

  // Initial load for each source, with a clean slate: saved data first (if any), then a sync.
  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    setSync({ status: 'idle', step: null, error: null, lastSyncedAt: null, fromCache: false });
    void source.loadCached().then((cached) => {
      if (cancelled) return;
      if (cached) {
        setSnapshot((current) => current ?? cached);
        setSync((s) => (s.lastSyncedAt ? s : { ...s, lastSyncedAt: cached.syncedAt, fromCache: true }));
      }
      void syncNow();
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
      abortRef.current = null;
      inFlight.current = null;
    };
  }, [source, syncNow]);

  // Keep the dashboard in step with changes made in Todoist itself.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void syncNow();
    }, AUTO_SYNC_MS);
    const onFocus = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSyncedAt.current > FOCUS_SYNC_AFTER_MS) void syncNow();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [syncNow]);

  // Live updates: Todoist pushes a notice when the account changes, and we sync straight away.
  const [liveUpdates, setLiveUpdates] = useState(false);
  const liveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const websocketUrl = snapshot?.user.websocket_url ?? null;
  useEffect(() => {
    if (!websocketUrl || !source.watch) return;
    const stop = source.watch({
      onChange: () => {
        clearTimeout(liveTimer.current);
        liveTimer.current = setTimeout(() => void syncNow(), LIVE_SYNC_DEBOUNCE_MS);
      },
      onStatus: setLiveUpdates,
    });
    return () => {
      clearTimeout(liveTimer.current);
      stop?.();
      setLiveUpdates(false);
    };
  }, [source, websocketUrl, syncNow]);

  const index = useMemo(() => (snapshot ? buildIndex(snapshot) : null), [snapshot]);
  // Write handlers read the latest index without re-creating every callback on each sync.
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const followUpTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(followUpTimer.current), []);

  const [writeState, setWriteState] = useState<WriteState>({ phase: 'idle', label: '' });
  const pendingWrites = useRef(0);
  const writeStateTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(writeStateTimer.current), []);

  /** Shows the friendly failure message; a rejected token also offers a way to Settings. */
  const reportWriteFailure = useCallback(
    (err: unknown) => {
      const auth = err instanceof TodoistApiError && err.status === 401;
      notify({
        tone: 'error',
        message: WRITE_FAILED,
        action: auth ? { label: 'Settings', run: () => navigate(href.settings()) } : undefined,
      });
    },
    [notify],
  );

  /**
   * Sends one change to Todoist. While it runs the top bar shows "Saving…" (or "Updating…", …);
   * afterwards "Saved ✓". Overlapping syncs are told to refetch, and a sync follows shortly so
   * the dashboard shows exactly what Todoist now holds.
   */
  const write = useCallback(
    async <T,>(kind: WriteKind, run: () => Promise<T>): Promise<T> => {
      const [working, done] = WRITE_LABELS[kind];
      writeVersion.current++;
      pendingWrites.current++;
      clearTimeout(writeStateTimer.current);
      setWriteState({ phase: 'working', label: working });
      let failed = false;
      try {
        return await run();
      } catch (err) {
        failed = true;
        throw err;
      } finally {
        writeVersion.current++;
        pendingWrites.current--;
        if (failed) {
          setWriteState({ phase: 'error', label: 'Not saved' });
          writeStateTimer.current = setTimeout(() => setWriteState({ phase: 'idle', label: '' }), ERROR_VISIBLE_MS);
        } else if (pendingWrites.current === 0) {
          setWriteState({ phase: 'done', label: done });
          writeStateTimer.current = setTimeout(() => setWriteState({ phase: 'idle', label: '' }), DONE_VISIBLE_MS);
        }
        clearTimeout(followUpTimer.current);
        followUpTimer.current = setTimeout(() => void syncNow(), AFTER_WRITE_SYNC_MS);
      }
    },
    [syncNow],
  );

  const createTask = useCallback(
    async (form: TaskForm) => {
      try {
        const task = await write('create', () =>
          source.createTask({
            content: form.content.trim(),
            description: form.description.trim() || undefined,
            project_id: form.projectId,
            section_id: form.sectionId,
            priority: toApiPriority(form.priority),
            due_date: form.dueDate ?? undefined,
          }),
        );
        // The task Todoist returned (with its real id) goes straight in; the follow-up sync confirms it.
        setSnapshot((s) => (s ? { ...s, tasks: [...s.tasks, { ...task, note_count: 0 }] } : s));
        return true;
      } catch (err) {
        reportWriteFailure(err);
        return false;
      }
    },
    [source, write, reportWriteFailure],
  );

  const saveTask = useCallback(
    async (task: TodoistTask, form: TaskForm) => {
      const changes: UpdateTaskInput = {};
      if (form.content.trim() !== task.content) changes.content = form.content.trim();
      if (form.description.trim() !== task.description.trim()) changes.description = form.description.trim();
      if (toApiPriority(form.priority) !== task.priority) changes.priority = toApiPriority(form.priority);
      const currentDue = dueDateKey(task.due);
      if (form.dueDate !== currentDue) {
        if (form.dueDate) changes.due_date = form.dueDate;
        else changes.due_string = 'no date';
      }
      const moved = form.projectId !== task.project_id || form.sectionId !== (task.section_id ?? null);

      try {
        let updated = task;
        const edited = Object.keys(changes).length > 0;
        await write(moved && !edited ? 'move' : 'update', async () => {
          if (moved) updated = await source.moveTask(task.id, { project_id: form.projectId, section_id: form.sectionId });
          if (edited) updated = await source.updateTask(task.id, changes);
        });
        const movedIds = moved && indexRef.current ? new Set(descendantsOf(indexRef.current, task.id).map((t) => t.id)) : new Set();
        setSnapshot((s) =>
          s
            ? {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.id === task.id
                    ? { ...updated, project_id: form.projectId, section_id: form.sectionId, parent_id: moved ? null : t.parent_id }
                    : movedIds.has(t.id)
                      ? { ...t, project_id: form.projectId, section_id: form.sectionId }
                      : t,
                ),
              }
            : s,
        );
        return true;
      } catch (err) {
        reportWriteFailure(err);
        return false;
      }
    },
    [source, write, reportWriteFailure],
  );

  const reopenTask = useCallback(
    (task: TodoistTask) => {
      setSnapshot((s) =>
        s
          ? {
              ...s,
              completed: s.completed.filter((t) => t.id !== task.id),
              tasks: s.tasks.some((t) => t.id === task.id) ? s.tasks : [...s.tasks, { ...task, checked: false, completed_at: null }],
            }
          : s,
      );
      write('reopen', () => source.reopenTask(task.id)).catch((err) => {
        setSnapshot((s) => (s ? { ...s, tasks: s.tasks.filter((t) => t.id !== task.id), completed: [task, ...s.completed.filter((t) => t.id !== task.id)] } : s));
        reportWriteFailure(err);
      });
    },
    [source, write, reportWriteFailure],
  );

  const completeTask = useCallback(
    (taskId: string) => {
      const idx = indexRef.current;
      const task = idx?.taskById.get(taskId);
      if (!idx || !task) return;

      // A recurring task is not finished by completing it: Todoist moves it to its next date.
      if (task.due?.is_recurring) {
        write('complete', async () => {
          await source.completeTask(taskId);
          return source.getTask(taskId).catch(() => null);
        })
          .then((next) => {
            if (next) setSnapshot((s) => (s ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...next, note_count: t.note_count } : t)) } : s));
            const nextDate = next?.due?.date ? formatShortDate(parseDateKey(next.due.date.slice(0, 10)), new Date()) : null;
            notify({ tone: 'success', message: nextDate ? `Completed — next due ${nextDate}` : `Completed “${task.content}”` });
          })
          .catch(reportWriteFailure);
        return;
      }

      // Completing a parent completes its subtasks too, exactly as Todoist does.
      const ids = new Set([taskId, ...descendantsOf(idx, taskId).map((t) => t.id)]);
      const completedAt = new Date().toISOString();
      const removed = [task, ...descendantsOf(idx, taskId)];

      setSnapshot((s) =>
        s
          ? {
              ...s,
              tasks: s.tasks.filter((t) => !ids.has(t.id)),
              completed: [...s.tasks.filter((t) => ids.has(t.id)).map((t) => ({ ...t, checked: true, completed_at: completedAt })), ...s.completed],
            }
          : s,
      );

      write('complete', () => source.completeTask(taskId))
        .then(() =>
          notify({
            tone: 'success',
            message: `Completed “${task.content}”`,
            action: { label: 'Undo', run: () => reopenTask({ ...task, checked: true, completed_at: completedAt }) },
          }),
        )
        .catch((err) => {
          // Put the tasks back straight away; the follow-up sync then confirms Todoist's real state.
          setSnapshot((s) =>
            s
              ? {
                  ...s,
                  tasks: [...s.tasks.filter((t) => !ids.has(t.id)), ...removed],
                  completed: s.completed.filter((t) => !(ids.has(t.id) && t.completed_at === completedAt)),
                }
              : s,
          );
          reportWriteFailure(err);
        });
    },
    [source, write, notify, reportWriteFailure, reopenTask],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const idx = indexRef.current;
      const ids = new Set([taskId, ...(idx ? descendantsOf(idx, taskId).map((t) => t.id) : [])]);
      try {
        await write('delete', () => source.deleteTask(taskId));
        setSnapshot((s) => (s ? { ...s, tasks: s.tasks.filter((t) => !ids.has(t.id)), comments: s.comments.filter((c) => !ids.has(c.task_id)) } : s));
        return true;
      } catch (err) {
        reportWriteFailure(err);
        return false;
      }
    },
    [source, write, reportWriteFailure],
  );

  const addComment = useCallback(
    async (taskId: string, content: string) => {
      try {
        const comment = await write('comment', () => source.addComment(taskId, content.trim()));
        setSnapshot((s) =>
          s
            ? {
                ...s,
                comments: [...s.comments, comment],
                tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, note_count: t.note_count + 1 } : t)),
              }
            : s,
        );
        return comment;
      } catch (err) {
        reportWriteFailure(err);
        return null;
      }
    },
    [source, write, reportWriteFailure],
  );

  const createProject = useCallback(
    async (form: NewProjectForm) => {
      try {
        const project = await write('create', () =>
          source.createProject({
            name: form.name.trim(),
            color: form.color,
            parent_id: form.parentId ?? undefined,
            workspace_id: form.parentId ? undefined : (form.workspaceId ?? undefined),
          }),
        );
        setSnapshot((s) => (s ? { ...s, projects: [...s.projects.filter((p) => p.id !== project.id), project] } : s));
        return project;
      } catch (err) {
        reportWriteFailure(err);
        return null;
      }
    },
    [source, write, reportWriteFailure],
  );

  const createSection = useCallback(
    async (projectId: string, name: string) => {
      try {
        const section = await write('create', () => source.createSection({ project_id: projectId, name: name.trim() }));
        setSnapshot((s) => (s ? { ...s, sections: [...s.sections.filter((x) => x.id !== section.id), section] } : s));
        return section;
      } catch (err) {
        reportWriteFailure(err);
        return null;
      }
    },
    [source, write, reportWriteFailure],
  );

  const connectLive = useCallback(
    async (token: string) => {
      const account = await verifyToken(token);
      if (settings.mode === 'live' && settings.token === token.trim()) void syncNow();
      else setSettings((s) => ({ ...s, token: token.trim(), tokenSource: 'saved', mode: 'live' }));
      return { name: account.name };
    },
    [settings.mode, settings.token, syncNow],
  );

  const value: WorkspaceContextValue = {
    mode: source.mode,
    settings,
    snapshot,
    index,
    sync,
    liveUpdates,
    writeState,
    syncNow,
    createProject,
    createSection,
    createTask,
    saveTask,
    completeTask,
    reopenTask,
    deleteTask,
    addComment,
    connectLive,
    switchToDemo: () => setSettings((s) => ({ ...s, mode: 'demo' })),
    forgetToken: () => {
      void cacheClear();
      setSettings((s) => withoutSavedToken(s));
    },
    setDisplayName: (displayName) => setSettings((s) => ({ ...s, displayName })),
    setRules: (rules) => setSettings((s) => ({ ...s, rules })),
    setNotifyOwnActions: (notifyOwnActions) => setSettings((s) => ({ ...s, notifyOwnActions })),
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
