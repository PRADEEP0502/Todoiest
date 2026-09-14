import { useCallback, useSyncExternalStore } from 'react';

// Remembers which projects, sections and groups are collapsed, per device.
// Keys are IDs (e.g. `section:123`), never names.

const STORAGE_KEY = 'md-dashboard.collapsed.v1';
const listeners = new Set<() => void>();

let collapsed: Set<string> = (() => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set<string>();
  }
})();

function commit(next: Set<string>) {
  collapsed = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    // Non-fatal.
  }
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function setCollapsed(keys: string[], value: boolean): void {
  const next = new Set(collapsed);
  for (const key of keys) {
    if (value) next.add(key);
    else next.delete(key);
  }
  commit(next);
}

export function useCollapsedSet(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => collapsed);
}

export function useCollapse(key: string, defaultCollapsed = false): [boolean, () => void] {
  const set = useCollapsedSet();
  // Keys prefixed with `!` record an explicit "expanded" choice for items collapsed by default.
  const isCollapsed = defaultCollapsed ? !set.has(`!${key}`) : set.has(key);
  const toggle = useCallback(() => {
    const stored = defaultCollapsed ? `!${key}` : key;
    setCollapsed([stored], !collapsed.has(stored));
  }, [key, defaultCollapsed]);
  return [isCollapsed, toggle];
}
