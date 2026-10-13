import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface SelectionValue {
  /** The tasks picked out right now. */
  ids: ReadonlySet<string>;
  count: number;
  has: (taskId: string) => boolean;
  toggle: (taskId: string) => void;
  /** Adds every one of these, or removes them all when they are already picked. */
  toggleAll: (taskIds: string[]) => void;
  clear: () => void;
}

const SelectionContext = createContext<SelectionValue | null>(null);

/**
 * Which tasks are picked out for one action on all of them at once — complete, move, hand over,
 * copy or delete. Nothing is remembered between visits: a selection lasts as long as the work does.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = useCallback((taskId: string) => {
    setIds((current) => {
      const next = new Set(current);
      if (!next.delete(taskId)) next.add(taskId);
      return next;
    });
  }, []);

  const toggleAll = useCallback((taskIds: string[]) => {
    setIds((current) => {
      const next = new Set(current);
      const everyOne = taskIds.length > 0 && taskIds.every((id) => next.has(id));
      for (const id of taskIds) {
        if (everyOne) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setIds((current) => (current.size ? new Set() : current)), []);

  const value = useMemo<SelectionValue>(
    () => ({ ids, count: ids.size, has: (taskId) => ids.has(taskId), toggle, toggleAll, clear }),
    [ids, toggle, toggleAll, clear],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): SelectionValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelection must be used inside <SelectionProvider>');
  return ctx;
}
