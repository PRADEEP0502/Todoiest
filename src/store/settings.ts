import type { DataMode } from '../services/todoist';

export interface Settings {
  mode: DataMode;
  token: string;
  /** Overrides the Todoist account name in the greeting. */
  displayName: string;
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
  };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Non-fatal: settings just won't persist across reloads.
  }
}
