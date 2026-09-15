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
  const { mode, sync } = useWorkspace();
  const now = useNow(15_000);
  const synced = sync.lastSyncedAt ? formatRelative(sync.lastSyncedAt, now) : null;
  if (mode === 'demo') return { dot: 'bg-amber-500', title: 'Demo Mode', detail: 'Sample data — not connected', synced };
  if (sync.status === 'error') return { dot: 'bg-red-500', title: 'Todoist connection problem', detail: sync.error ?? 'Sync failed', synced };
  return { dot: 'bg-emerald-500', title: 'Todoist Connected', detail: 'Live Todoist data', synced };
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
      className={`inline-flex h-8 max-w-[18rem] items-center gap-2 rounded-full border px-3 text-[12px] transition-colors ${mode === 'demo' ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-50' : 'border-line bg-surface hover:bg-hover'}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} aria-hidden />
      <span className={`shrink-0 font-semibold ${mode === 'demo' ? 'tracking-[0.04em] text-amber-900' : 'text-ink'}`}>{mode === 'demo' ? 'DEMO MODE' : 'LIVE TODOIST'}</span>
      {c.synced && <span className="hidden truncate text-ink-3 lg:inline">· synced {c.synced.toLowerCase()}</span>}
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
