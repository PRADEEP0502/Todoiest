import { DEFAULT_RULES, type MetricRules } from '../lib/metrics';
import type { DataMode } from '../services/todoist';

export type TokenSource = 'saved' | 'env' | 'none';

export interface Settings {
  mode: DataMode;
  /** The token in use: one pasted in Settings, else VITE_TODOIST_API_TOKEN from .env.local. */
  token: string;
  tokenSource: TokenSource;
  /** How A-5/A-10/A-30/A30+ and No CD/No IDD are worked out from Todoist data. */
  rules: MetricRules;
  /** Show notifications for changes made by the connected account itself. */
  notifyOwnActions: boolean;
}

/** Only deliberate choices are stored — never the .env token, never an automatic "demo". */
interface StoredSettings {
  savedToken: string;
  /** True only after the user clicks "Switch to Demo Mode". */
  demoChosen: boolean;
  rules: Partial<MetricRules>;
  notifyOwnActions: boolean;
}

const KEY = 'md-dashboard.settings.v2';
const LEGACY_KEY = 'md-dashboard.settings.v1';

/**
 * A token in .env.local is a convenience for local development only. Vite bakes VITE_* values into
 * the built JavaScript, so on a public host (Vercel, Netlify…) that token would be readable by
 * anyone who opens the site. Deployed builds therefore ignore it and ask each person to paste their
 * own token in Settings, which is kept in their browser alone.
 *
 * Set VITE_ALLOW_PUBLIC_TOKEN=1 only for a build nobody else can open (e.g. a password-protected
 * deployment or a machine on your own network).
 */
const envToken = () => {
  const allowed = import.meta.env.DEV || import.meta.env.VITE_ALLOW_PUBLIC_TOKEN === '1';
  return allowed ? ((import.meta.env.VITE_TODOIST_API_TOKEN as string | undefined) ?? '').trim() : '';
};

function readStored(): Partial<StoredSettings> {
  try {
    const current = localStorage.getItem(KEY);
    if (current) return JSON.parse(current);
    // v1 saved the mode automatically (so a first visit without a token pinned "demo") and
    // copied the .env token into storage. Keep only what the user actually entered.
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null');
    if (!legacy) return {};
    return {
      savedToken: legacy.token && legacy.token !== envToken() ? legacy.token : '',
      demoChosen: false,
      rules: legacy.rules,
      notifyOwnActions: legacy.notifyOwnActions,
    };
  } catch {
    return {};
  }
}

export function resolveSettings(stored: Partial<StoredSettings>, env: string): Settings {
  const saved = stored.savedToken?.trim() ?? '';
  const token = saved || env;
  const tokenSource: TokenSource = saved ? 'saved' : env ? 'env' : 'none';
  return {
    token,
    tokenSource,
    mode: token && !stored.demoChosen ? 'live' : 'demo',
    rules: {
      ...DEFAULT_RULES,
      ...stored.rules,
      // "Not set up" means never chosen, so the built-in title-date rules apply.
      noCd: !stored.rules?.noCd || stored.rules.noCd.kind === 'unset' ? DEFAULT_RULES.noCd : stored.rules.noCd,
      noIdd: !stored.rules?.noIdd || stored.rules.noIdd.kind === 'unset' ? DEFAULT_RULES.noIdd : stored.rules.noIdd,
      categoryNames: { ...DEFAULT_RULES.categoryNames, ...stored.rules?.categoryNames },
    },
    notifyOwnActions: stored.notifyOwnActions ?? false,
  };
}

export function loadSettings(): Settings {
  return resolveSettings(readStored(), envToken());
}

export function saveSettings(settings: Settings): void {
  const stored: StoredSettings = {
    savedToken: settings.tokenSource === 'saved' ? settings.token : '',
    demoChosen: settings.mode === 'demo' && settings.tokenSource !== 'none',
    rules: settings.rules,
    notifyOwnActions: settings.notifyOwnActions,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Non-fatal: settings just won't persist across reloads.
  }
}

/** What remains after removing a token pasted in Settings: the .env token if there is one, else Demo. */
export function withoutSavedToken(settings: Settings): Settings {
  const env = envToken();
  return { ...settings, token: env, tokenSource: env ? 'env' : 'none', mode: env ? 'live' : 'demo' };
}
