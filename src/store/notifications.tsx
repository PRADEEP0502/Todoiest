import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNow } from '../hooks/useNow';
import { buildNotifications, type Notification } from '../lib/notifications';
import { useWorkspace } from './workspace';

interface ReadState {
  /** Everything at or before this time counts as read. */
  readBefore: string;
  readIds: string[];
}

interface NotificationsValue {
  notifications: Notification[];
  isRead: (n: Notification) => boolean;
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const Ctx = createContext<NotificationsValue | null>(null);
const MAX_READ_IDS = 3000;
const storageKey = (mode: string) => `md-dashboard.notifications.${mode}.v1`;

function loadReadState(mode: string): ReadState {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(mode)) ?? 'null');
    if (parsed?.readBefore) return parsed;
  } catch {
    // Fall through to a fresh state.
  }
  // First visit on this device: treat the last 24 hours as new, older events as already seen.
  return { readBefore: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), readIds: [] };
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { snapshot, index, mode, settings } = useWorkspace();
  const now = useNow(60_000);
  const [state, setState] = useState<{ mode: string; read: ReadState }>(() => ({ mode, read: loadReadState(mode) }));
  // Demo and live keep separate read state.
  const read = state.mode === mode ? state.read : loadReadState(mode);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(state.mode), JSON.stringify(state.read));
    } catch {
      // Non-fatal.
    }
  }, [state]);

  const notifications = useMemo(
    () => (snapshot && index ? buildNotifications(snapshot, index, now, { includeOwn: settings.notifyOwnActions }) : []),
    [snapshot, index, now, settings.notifyOwnActions],
  );

  const readIds = useMemo(() => new Set(read.readIds), [read.readIds]);
  const readBefore = Date.parse(read.readBefore);
  const isRead = useCallback((n: Notification) => n.at.getTime() <= readBefore || readIds.has(n.id), [readBefore, readIds]);

  const markRead = useCallback(
    (id: string) =>
      setState((s) => {
        const current = s.mode === mode ? s.read : loadReadState(mode);
        if (current.readIds.includes(id)) return s;
        return { mode, read: { ...current, readIds: [...current.readIds, id].slice(-MAX_READ_IDS) } };
      }),
    [mode],
  );

  const markAllRead = useCallback(() => setState({ mode, read: { readBefore: new Date().toISOString(), readIds: [] } }), [mode]);

  const value = useMemo(
    () => ({ notifications, isRead, unreadCount: notifications.filter((n) => !isRead(n)).length, markRead, markAllRead }),
    [notifications, isRead, markRead, markAllRead],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
