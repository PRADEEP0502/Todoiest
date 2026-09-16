import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectRealtime } from './realtime';

/** Minimal stand-in for the browser WebSocket, so reconnect behaviour can be tested. */
class FakeSocket {
  static instances: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;

  url: string;

  constructor(url: string) {
    this.url = url;
    FakeSocket.instances.push(this);
  }
  close() {
    this.closed = true;
    this.onclose?.();
  }
}

function setup() {
  FakeSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeSocket as unknown as typeof WebSocket);
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn(), visibilityState: 'visible' });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('live updates channel', () => {
  it('reports every push as a change and tracks connection state', () => {
    setup();
    const onChange = vi.fn();
    const onStatus = vi.fn();
    const handle = connectRealtime('wss://ws.todoist.com/ws?token=x', { onChange, onStatus });

    const socket = FakeSocket.instances[0];
    expect(socket.url).toContain('ws.todoist.com');

    socket.onopen!();
    expect(onStatus).toHaveBeenLastCalledWith(true);

    socket.onmessage!();
    socket.onmessage!();
    expect(onChange).toHaveBeenCalledTimes(2);

    handle.close();
    expect(socket.closed).toBe(true);
    expect(onStatus).toHaveBeenLastCalledWith(false);
  });

  it('reconnects after a dropped connection, and stops once closed', () => {
    vi.useFakeTimers();
    setup();
    const onStatus = vi.fn();
    const handle = connectRealtime('wss://ws.todoist.com/ws?token=x', { onChange: vi.fn(), onStatus });

    FakeSocket.instances[0].onopen!();
    FakeSocket.instances[0].onclose!(); // dropped
    expect(onStatus).toHaveBeenLastCalledWith(false);

    vi.advanceTimersByTime(2000);
    expect(FakeSocket.instances).toHaveLength(2);

    // After closing, a later drop must not open anything else.
    handle.close();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.instances).toHaveLength(2);
  });
});
