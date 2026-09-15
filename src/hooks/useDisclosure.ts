import { useCallback, useSyncExternalStore } from 'react';

// Remembers what the user opened or closed, per device, keyed by Todoist IDs (never names).
// Anything the user hasn't touched uses the default passed by the component, so projects and
// sections can start closed while other groups start open.

const STORAGE_KEY = 'md-dashboard.disclosure.v2';
const listeners = new Set<() => void>();

type OpenState = Readonly<Record<string, boolean>>;

let state: OpenState = (() => {
  try {
    localStorage.removeItem('md-dashboard.collapsed.v1'); // superseded format
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
})();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export { disclosureKey } from '../lib/disclosure';

export function setOpen(keys: string[], open: boolean): void {
  if (!keys.length) return;
  const next = { ...state };
  for (const key of keys) next[key] = open;
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal: the choice just won't survive a reload.
  }
  listeners.forEach((l) => l());
}

export const isOpen = (s: OpenState, key: string, defaultOpen: boolean) => s[key] ?? defaultOpen;

export function useDisclosureState(): OpenState {
  return useSyncExternalStore(subscribe, () => state);
}

export function useDisclosure(key: string, defaultOpen: boolean): [open: boolean, toggle: () => void] {
  const open = isOpen(useDisclosureState(), key, defaultOpen);
  const toggle = useCallback(() => setOpen([key], !isOpen(state, key, defaultOpen)), [key, defaultOpen]);
  return [open, toggle];
}
