import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { dueDateKey } from '../lib/dates';
import { buildIndex, descendantsOf, type WorkspaceIndex } from '../lib/hierarchy';
import { toApiPriority, type UiPriority } from '../lib/priority';
import {
  createDemoSource,
  createLiveSource,
  verifyToken,
  type DataMode,
  type DataSource,
  type SyncStep,
} from '../services/todoist';
import type { TodoistTask, UpdateTaskInput, WorkspaceSnapshot } from '../types/todoist';
import { loadSettings, saveSettings, type Settings } from './settings';
import { useUi } from './ui';

export interface SyncState {
  status: 'idle' | 'syncing' | 'done' | 'error';
  step: SyncStep | null;
  error: string | null;
  lastSyncedAt: string | null;
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
  syncNow: () => Promise<void>;
  createTask: (form: TaskForm) => Promise<boolean>;
  saveTask: (task: TodoistTask, form: TaskForm) => Promise<boolean>;
  completeTask: (taskId: string) => void;
  reopenTask: (task: TodoistTask) => void;
  deleteTask: (taskId: string) => Promise<boolean>;
  connectLive: (token: string) => Promise<{ name: string }>;
  switchToDemo: () => void;
  forgetToken: () => void;
  setDisplayName: (name: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const AUTO_SYNC_MS = 5 * 60 * 1000;
const FOCUS_SYNC_AFTER_MS = 60 * 1000;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong.');
const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { notify } = useUi();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [sync, setSync] = useState<SyncState>({ status: 'idle', step: null, error: null, lastSyncedAt: null });

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
          setSync({ status: 'done', step: null, error: null, lastSyncedAt: next.syncedAt });
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

  // Initial load for each source, with a clean slate.
  useEffect(() => {
    setSnapshot(null);
    setSync({ status: 'idle', step: null, error: null, lastSyncedAt: null });
    void syncNow();
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      inFlight.current = null;
    };
  }, [syncNow]);

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

  const index = useMemo(() => (snapshot ? buildIndex(snapshot) : null), [snapshot]);
  // Write handlers read the latest index without re-creating every callback on each sync.
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  /** Runs a write against the source, flagging it so overlapping syncs refetch. */
  const write = useCallback(async <T,>(run: () => Promise<T>): Promise<T> => {
    writeVersion.current++;
    try {
      return await run();
    } finally {
      writeVersion.current++;
    }
  }, []);

  const createTask = useCallback(
    async (form: TaskForm) => {
      try {
        const task = await write(() =>
          source.createTask({
            content: form.content.trim(),
            description: form.description.trim() || undefined,
            project_id: form.projectId,
            section_id: form.sectionId,
            priority: toApiPriority(form.priority),
            due_date: form.dueDate ?? undefined,
          }),
        );
        setSnapshot((s) => (s ? { ...s, tasks: [...s.tasks, task] } : s));
        notify({ tone: 'success', message: 'Task added' });
        return true;
      } catch (err) {
        notify({ tone: 'error', message: `Could not add task. ${errorMessage(err)}` });
        return false;
      }
    },
    [source, write, notify],
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
        await write(async () => {
          if (moved) updated = await source.moveTask(task.id, { project_id: form.projectId, section_id: form.sectionId });
          if (Object.keys(changes).length) updated = await source.updateTask(task.id, changes);
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
        notify({ tone: 'success', message: 'Task updated' });
        return true;
      } catch (err) {
        notify({ tone: 'error', message: `Could not save changes. ${errorMessage(err)}` });
        void syncNow();
        return false;
      }
    },
    [source, write, notify, syncNow],
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
      write(() => source.reopenTask(task.id))
        .then(() => notify({ tone: 'info', message: 'Task reopened' }))
        .catch((err) => notify({ tone: 'error', message: `Could not reopen task. ${errorMessage(err)}` }))
        .finally(() => void syncNow());
    },
    [source, write, notify, syncNow],
  );

  const completeTask = useCallback(
    (taskId: string) => {
      const idx = indexRef.current;
      const task = idx?.taskById.get(taskId);
      if (!idx || !task) return;
      // Completing a parent completes its subtasks too, exactly as Todoist does.
      const ids = new Set([taskId, ...descendantsOf(idx, taskId).map((t) => t.id)]);
      const completedAt = new Date().toISOString();

      setSnapshot((s) =>
        s
          ? {
              ...s,
              tasks: s.tasks.filter((t) => !ids.has(t.id)),
              completed: [...s.tasks.filter((t) => ids.has(t.id)).map((t) => ({ ...t, checked: true, completed_at: completedAt })), ...s.completed],
            }
          : s,
      );

      write(() => source.completeTask(taskId))
        .then(() =>
          notify({
            tone: 'success',
            message: `Completed “${task.content}”`,
            action: { label: 'Undo', run: () => reopenTask({ ...task, checked: true, completed_at: completedAt }) },
          }),
        )
        .catch((err) => {
          notify({ tone: 'error', message: `Could not complete task. ${errorMessage(err)}` });
          void syncNow();
        });
    },
    [source, write, notify, syncNow, reopenTask],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const idx = indexRef.current;
      const ids = new Set([taskId, ...(idx ? descendantsOf(idx, taskId).map((t) => t.id) : [])]);
      try {
        await write(() => source.deleteTask(taskId));
        setSnapshot((s) => (s ? { ...s, tasks: s.tasks.filter((t) => !ids.has(t.id)) } : s));
        notify({ tone: 'success', message: 'Task deleted' });
        return true;
      } catch (err) {
        notify({ tone: 'error', message: `Could not delete task. ${errorMessage(err)}` });
        return false;
      }
    },
    [source, write, notify],
  );

  const connectLive = useCallback(
    async (token: string) => {
      const account = await verifyToken(token);
      if (settings.mode === 'live' && settings.token === token.trim()) void syncNow();
      else setSettings((s) => ({ ...s, token: token.trim(), mode: 'live' }));
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
    syncNow,
    createTask,
    saveTask,
    completeTask,
    reopenTask,
    deleteTask,
    connectLive,
    switchToDemo: () => setSettings((s) => ({ ...s, mode: 'demo' })),
    forgetToken: () => setSettings((s) => ({ ...s, token: '', mode: 'demo' })),
    setDisplayName: (displayName) => setSettings((s) => ({ ...s, displayName })),
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
