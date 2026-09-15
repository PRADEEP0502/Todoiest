import { useState } from 'react';

/** Renders a long list in pages; resets when the list identity key changes. */
export function usePaged<T>(items: T[], resetKey: string, step = 50): { visible: T[]; shown: number; total: number; more: () => void } {
  const [state, setState] = useState({ key: resetKey, count: step });
  const count = state.key === resetKey ? state.count : step;
  return {
    visible: items.slice(0, count),
    shown: Math.min(count, items.length),
    total: items.length,
    more: () => setState({ key: resetKey, count: count + step }),
  };
}
