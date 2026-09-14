import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
  action?: { label: string; run: () => void };
}

export interface NewTaskDefaults {
  projectId?: string;
  sectionId?: string | null;
  dueDate?: string | null;
}

export type TaskDialogState = { kind: 'closed' } | { kind: 'edit'; taskId: string } | { kind: 'create'; defaults: NewTaskDefaults };

interface UiContextValue {
  toasts: Toast[];
  notify: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
  dialog: TaskDialogState;
  openTask: (taskId: string) => void;
  openNewTask: (defaults?: NewTaskDefaults) => void;
  closeDialog: () => void;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<TaskDialogState>({ kind: 'closed' });
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { ...toast, id }]);
      setTimeout(() => dismiss(id), toast.action ? 6000 : toast.tone === 'error' ? 7000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo<UiContextValue>(
    () => ({
      toasts,
      notify,
      dismiss,
      dialog,
      openTask: (taskId) => setDialog({ kind: 'edit', taskId }),
      openNewTask: (defaults = {}) => setDialog({ kind: 'create', defaults }),
      closeDialog: () => setDialog({ kind: 'closed' }),
    }),
    [toasts, notify, dismiss, dialog],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
