import { AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';
import { useNow } from '../../hooks/useNow';
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

export function ConnectionBadge({ withTime = false }: { withTime?: boolean }) {
  const { mode, sync } = useWorkspace();
  const now = useNow(15_000);
  const failing = sync.status === 'error';
  const [dot, label] =
    mode === 'demo'
      ? ['bg-amber-500', 'Demo data — not connected']
      : failing
        ? ['bg-red-500', 'Connection problem']
        : ['bg-emerald-500', 'Todoist Connected'];
  return (
    <div className="min-w-0 leading-tight">
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      {withTime && (
        <div className="mt-0.5 truncate pl-3.5 text-2xs text-ink-3">
          {sync.lastSyncedAt ? `Last synced: ${formatRelative(sync.lastSyncedAt, now)}` : 'Not synced yet'}
        </div>
      )}
    </div>
  );
}

/** Sync button that narrates progress: Syncing… → Fetching projects… → … → ✓ Sync complete. */
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
      title={sync.error ?? undefined}
      aria-live="polite"
      className={`btn-secondary disabled:cursor-progress disabled:opacity-100 ${compact ? 'w-8 px-0' : 'min-w-[9.5rem] justify-start'} ${tone}`}
    >
      {icon}
      {compact ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
    </button>
  );
}
