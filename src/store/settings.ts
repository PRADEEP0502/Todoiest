import { DEFAULT_RULES, type MetricRules } from '../lib/metrics';
import type { DataMode } from '../services/todoist';

export interface Settings {
  mode: DataMode;
  token: string;
  /** Overrides the Todoist account name in the greeting. */
  displayName: string;
  /** How A-5/A-10/A-30/A30+ and No CD/No IDD are worked out from Todoist data. */
  rules: MetricRules;
  /** Show notifications for changes made by the connected account itself. */
  notifyOwnActions: boolean;
}

const KEY = 'md-dashboard.settings.v1';

export function loadSettings(): Settings {
  const envToken = (import.meta.env.VITE_TODOIST_API_TOKEN as string | undefined)?.trim() ?? '';
  let stored: Partial<Settings> = {};
  try {
    stored = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    // Storage unavailable or corrupted; fall back to defaults.
  }
  const token = stored.token || envToken;
  return {
    token,
    displayName: stored.displayName ?? '',
    mode: stored.mode === 'live' && token ? 'live' : stored.mode === 'demo' || !token ? 'demo' : 'live',
    rules: {
      ...DEFAULT_RULES,
      ...stored.rules,
      categoryNames: { ...DEFAULT_RULES.categoryNames, ...stored.rules?.categoryNames },
    },
    notifyOwnActions: stored.notifyOwnActions ?? false,
  };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Non-fatal: settings just won't persist across reloads.
  }
}
