import { AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';
import { useNow } from '../../hooks/useNow';
import { href } from '../../hooks/useRoute';
import { formatRelative } from '../../lib/dates';
import { SYNC_STEP_LABEL } from '../../services/todoist';
import { useWorkspace } from '../../store/workspace';

export function ModeBadge() {
  const { mode } = useWorkspace();
  return mode === 'demo' ? (
    <span className="inline-flex h-6 items-center rounded border border-amber-300 bg-amber-50 px-2 text-2xs font-semibold tracking-[0.06em] text-amber-800">
      DEMO MODE
    </span>
  ) : (
    <span className="inline-flex h-6 items-center rounded border border-emerald-300 bg-emerald-50 px-2 text-2xs font-semibold tracking-[0.06em] text-emerald-800">
      LIVE TODOIST
    </span>
  );
}

function useConnection() {
  const { mode, sync, liveUpdates } = useWorkspace();
  const now = useNow(15_000);
  const synced = sync.lastSyncedAt ? formatRelative(sync.lastSyncedAt, now) : null;
  if (mode === 'demo') return { dot: 'bg-amber-500', title: 'Demo Mode', detail: 'Sample data — not connected', synced, live: false };
  if (sync.status === 'error') return { dot: 'bg-red-500', title: 'Todoist connection problem', detail: sync.error ?? 'Sync failed', synced, live: false };
  return {
    dot: 'bg-emerald-500',
    title: 'Todoist Connected',
    detail: liveUpdates ? 'Live updates on — changes in Todoist appear within seconds' : 'Live Todoist data, refreshed every few minutes',
    synced,
    live: liveUpdates,
  };
}

/** Sidebar footer: connection state on two short lines. */
export function ConnectionBadge({ withTime = false }: { withTime?: boolean }) {
  const c = useConnection();
  return (
    <div className="min-w-0 leading-tight">
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
        <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} aria-hidden />
        <span className="truncate">{c.title}</span>
      </div>
      <div className="mt-0.5 truncate pl-3.5 text-2xs text-ink-3">
        {withTime ? (c.synced ? `Last synced: ${c.synced}` : 'Not synced yet') : c.detail}
      </div>
    </div>
  );
}

/** Top bar: one compact pill — mode/connection plus when data was last synced. Opens Settings. */
export function StatusPill() {
  const { mode } = useWorkspace();
  const c = useConnection();
  return (
    <a
      href={href.settings()}
      title={`${c.title} · ${c.detail}`}
      className={`inline-flex h-9 max-w-[18rem] items-center gap-2 rounded-full border px-3.5 text-[12px] shadow-pill transition-colors ${mode === 'demo' ? 'border-amber-200 bg-amber-50 hover:bg-amber-100/60' : 'border-black/[0.05] bg-surface hover:bg-[#fafafa]'}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} aria-hidden />
      <span className={`shrink-0 font-semibold ${mode === 'demo' ? 'tracking-[0.04em] text-amber-900' : 'text-ink'}`}>{mode === 'demo' ? 'DEMO MODE' : 'LIVE TODOIST'}</span>
      {c.live && (
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-[#effaf3] px-1.5 text-[11px] font-semibold text-[#1f8a55] sm:inline-flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#1f8a55] opacity-60 [animation-duration:2s]" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#1f8a55]" />
          </span>
          Live
        </span>
      )}
      {c.synced && <span className="hidden truncate text-ink-3 xl:inline">· synced {c.synced.toLowerCase()}</span>}
    </a>
  );
}

/** Sync button that narrates progress: Syncing… → Fetching … → ✓ Sync complete. */
export function SyncButton({ compact = false }: { compact?: boolean }) {
  const { sync, syncNow } = useWorkspace();
  const syncing = sync.status === 'syncing';

  let icon = <RefreshCw size={14} />;
  let label = 'Sync';
  let tone = '';
  if (syncing) {
    icon = <Loader2 size={14} className="animate-spin" />;
    label = sync.step ? SYNC_STEP_LABEL[sync.step] : 'Syncing…';
  } else if (sync.status === 'done') {
    icon = <Check size={14} className="text-accent" />;
    label = 'Sync complete';
    tone = 'text-accent';
  } else if (sync.status === 'error') {
    icon = <AlertCircle size={14} className="text-danger" />;
    label = 'Retry sync';
    tone = 'text-danger';
  }

  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      disabled={syncing}
      title={sync.error ?? 'Sync with Todoist now'}
      aria-live="polite"
      className={`btn-secondary disabled:cursor-progress disabled:opacity-100 ${compact ? 'w-8 px-0' : 'max-w-[15rem]'} ${tone}`}
    >
      {icon}
      {compact ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
    </button>
  );
}

/** Saving… → Saved ✓ (or Not saved) for changes being sent to Todoist. Hidden when idle. */
export function WriteStatus({ compact = false }: { compact?: boolean }) {
  const { writeState } = useWorkspace();
  if (writeState.phase === 'idle') return <span aria-live="polite" className="sr-only" />;
  const tone = writeState.phase === 'error' ? 'text-danger' : writeState.phase === 'done' ? 'text-accent' : 'text-ink-2';
  const icon =
    writeState.phase === 'working' ? (
      <Loader2 size={14} className="animate-spin" />
    ) : writeState.phase === 'done' ? (
      <Check size={14} strokeWidth={2.5} />
    ) : (
      <AlertCircle size={14} />
    );
  return (
    <span role="status" aria-live="polite" className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium ${tone}`} title={writeState.label}>
      {icon}
      {compact ? <span className="sr-only">{writeState.label}</span> : writeState.label.replace(' ✓', '')}
    </span>
  );
}

/** Sidebar footer card: connection state and last sync, opens Settings. */
export function StatusCard({ compact = false }: { compact?: boolean }) {
  const c = useConnection();
  if (compact) {
    return (
      <a
        href={href.settings()}
        title={`${c.title} — ${c.detail}`}
        aria-label={`${c.title}. ${c.detail}`}
        className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-black/[0.04] bg-surface shadow-card transition-shadow hover:shadow-pill"
      >
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
      </a>
    );
  }
  return (
    <a href={href.settings()} className="mb-2 flex items-center gap-3 rounded-2xl border border-black/[0.04] bg-surface px-3.5 py-3 shadow-card transition-shadow hover:shadow-pill" title={c.detail}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className={`absolute inset-0 rounded-full opacity-30 ${c.dot} ${c.dot === 'bg-emerald-500' ? 'animate-ping [animation-duration:2.5s]' : ''}`} />
        <span className={`relative h-2.5 w-2.5 rounded-full ${c.dot}`} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[13px] font-semibold text-ink">{c.title}</span>
        <span className="block truncate text-[11.5px] text-ink-3">
          {c.live ? 'Live · ' : ''}
          {c.synced ? `synced ${c.synced.toLowerCase()}` : 'not synced yet'}
        </span>
      </span>
    </a>
  );
}
