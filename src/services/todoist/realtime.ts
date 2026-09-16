/**
 * Live updates. Todoist hands every client a personal WebSocket URL (`user.websocket_url`,
 * documented as "WebSocket URL for real-time updates"). Todoist pushes a small notice whenever
 * something in the account changes; the dashboard answers it with an incremental sync, so a
 * change made in Todoist (by anyone) shows here within seconds without pressing Sync.
 *
 * The message shapes are not part of the public reference, so any message counts as "something
 * changed" rather than depending on a particular payload. Polling stays as the fallback.
 */

/** Wait before reconnecting, growing with each failed attempt. */
const RETRY_MS = [2_000, 5_000, 15_000, 30_000, 60_000];

export interface RealtimeHandle {
  close(): void;
}

export function connectRealtime(url: string, { onChange, onStatus }: { onChange: () => void; onStatus: (connected: boolean) => void }): RealtimeHandle {
  let socket: WebSocket | null = null;
  let retry = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const open = () => {
    if (closed || typeof WebSocket === 'undefined') return;
    try {
      socket = new WebSocket(url);
    } catch {
      return schedule();
    }
    socket.onopen = () => {
      retry = 0;
      onStatus(true);
    };
    socket.onmessage = () => onChange();
    socket.onerror = () => socket?.close();
    socket.onclose = () => {
      socket = null;
      onStatus(false);
      schedule();
    };
  };

  const schedule = () => {
    if (closed) return;
    clearTimeout(timer);
    timer = setTimeout(open, RETRY_MS[Math.min(retry++, RETRY_MS.length - 1)]);
  };

  // A sleeping laptop or a dropped network closes the socket silently; reopen when we're back.
  const revive = () => {
    if (closed || socket || document.visibilityState !== 'visible') return;
    retry = 0;
    clearTimeout(timer);
    open();
  };
  window.addEventListener('online', revive);
  document.addEventListener('visibilitychange', revive);

  open();

  return {
    close() {
      closed = true;
      clearTimeout(timer);
      window.removeEventListener('online', revive);
      document.removeEventListener('visibilitychange', revive);
      onStatus(false);
      socket?.close();
      socket = null;
    },
  };
}
