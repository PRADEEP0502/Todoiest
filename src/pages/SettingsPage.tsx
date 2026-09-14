import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { PageHeader } from '../components/common/ui';
import { ConnectionBadge, ModeBadge, SyncButton } from '../components/layout/SyncStatus';
import { useWorkspace } from '../store/workspace';

export function SettingsPage() {
  const { mode, settings, snapshot, connectLive, switchToDemo, forgetToken, setDisplayName } = useWorkspace();
  const [token, setToken] = useState('');
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    const value = token.trim() || settings.token;
    if (!value) return;
    setBusy(true);
    setStatus(null);
    try {
      const account = await connectLive(value);
      setStatus({ tone: 'ok', text: `Connected as ${account.name}. Loading your workspace…` });
      setToken('');
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'Could not connect.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-4">
        <Card title="Todoist connection" aside={<ModeBadge />}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-canvas px-3 py-2.5">
            <ConnectionBadge withTime />
            <SyncButton />
          </div>

          {mode === 'live' && snapshot && (
            <p className="mb-4 text-[13px] text-ink-2">
              Signed in to Todoist as <span className="font-medium text-ink">{snapshot.user.full_name}</span> ({snapshot.user.email}).
            </p>
          )}

          <form onSubmit={connect} className="space-y-3">
            <div>
              <label className="label" htmlFor="token">Todoist API token</label>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-0 flex-1 basis-64">
                  <input
                    id="token"
                    type={reveal ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    className="field pr-10 font-mono text-[13px]"
                    placeholder={settings.token ? '•••••••• saved on this device — paste to replace' : 'Paste your personal API token'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <button type="button" className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setReveal((r) => !r)} aria-label={reveal ? 'Hide token' : 'Show token'}>
                    {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button type="submit" className="btn-primary h-9" disabled={busy || (!token.trim() && !settings.token)}>
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {mode === 'live' && !token.trim() ? 'Reconnect' : 'Connect Todoist'}
                </button>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-3">
                Find it in Todoist → Settings → Integrations → Developer (
                <a className="text-accent hover:underline" href="https://app.todoist.com/app/settings/integrations/developer" target="_blank" rel="noreferrer">
                  open
                </a>
                ). The token is stored only in this browser.
              </p>
            </div>
            {status && <p className={`text-[13px] ${status.tone === 'error' ? 'text-danger' : 'text-accent'}`}>{status.text}</p>}
          </form>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            {mode === 'live' ? (
              <button type="button" className="btn-secondary" onClick={switchToDemo}>Switch to Demo Mode</button>
            ) : (
              <span className="text-[13px] text-ink-2">You’re viewing sample data. Connect a token to see the live Todoist workspace.</span>
            )}
            {settings.token && (
              <button type="button" className="btn-ghost ml-auto text-danger hover:text-danger" onClick={forgetToken}>Remove token</button>
            )}
          </div>
        </Card>

        <Card title="Greeting">
          <label className="label" htmlFor="display-name">Name shown on the dashboard</label>
          <input
            id="display-name"
            className="field max-w-xs"
            placeholder={snapshot?.user.full_name.split(' ')[0] ?? 'Your name'}
            value={settings.displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <p className="mt-1.5 text-[12px] text-ink-3">Leave empty to use the Todoist account name.</p>
        </Card>

        <Card title="How syncing works">
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink-2">
            <li>Todoist is the only source of truth — nothing is stored in a separate database.</li>
            <li>Projects, sections and tasks are loaded fresh on every sync, so new, renamed, moved or deleted items appear automatically.</li>
            <li>The dashboard syncs on open, every 5 minutes, and when you return to the tab. Use Sync any time.</li>
            <li>Completing, editing, adding and deleting tasks is sent to Todoist immediately.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
