import React, { useState } from 'react';
import { useTaskStore } from '../store/TaskContext';
import { testTodoistConnection } from '../services/todoist';
import { formatRelativeTime } from '../utils/dateUtils';
import { Settings, Key, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    apiToken,
    setApiToken,
    isDemoMode,
    toggleDemoMode,
    syncState,
    syncNow,
    addToast,
  } = useTaskStore();

  const [inputToken, setInputToken] = useState(apiToken);
  const [showToken, setShowToken] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; message: string } | null>(null);

  const handleConnect = async () => {
    const trimmed = inputToken.trim();
    if (!trimmed) {
      addToast({
        type: 'error',
        title: 'Token Required',
        message: 'Please enter your Todoist API token.',
      });
      return;
    }

    setIsConnecting(true);
    setStatusMessage(null);
    const result = await testTodoistConnection(trimmed);
    setIsConnecting(false);
    setStatusMessage(result);

    if (result.ok) {
      setApiToken(trimmed);
      toggleDemoMode(false);
      addToast({
        type: 'success',
        title: 'Connected to Todoist',
        message: result.message,
      });
      await syncNow();
    } else {
      addToast({
        type: 'error',
        title: 'Connection Failed',
        message: result.message,
      });
    }
  };

  const handleDisconnect = () => {
    setApiToken('');
    setInputToken('');
    setStatusMessage(null);
    toggleDemoMode(true);
    addToast({
      type: 'info',
      title: 'Switched to Demo Mode',
      message: 'Token cleared.',
    });
  };

  const isConnected = !isDemoMode && !!apiToken && syncState.status !== 'error';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-600" />
          <span>Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your Todoist connection and preferences.
        </p>
      </div>

      {/* Todoist Integration Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-slate-900">Todoist Integration</h2>

        {/* Connection Status Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                isConnected
                  ? 'bg-emerald-500'
                  : isDemoMode
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
            />
            <div>
              <p className="text-xs font-bold text-slate-800">
                {isConnected
                  ? '🟢 Todoist Connected'
                  : isDemoMode
                  ? '🟡 DEMO MODE Active'
                  : '⚠ Not Connected'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Last synced: {formatRelativeTime(syncState.lastSynced)}
              </p>
            </div>
          </div>

          <button
            onClick={() => syncNow()}
            disabled={syncState.status === 'syncing'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncState.status === 'syncing' ? 'animate-spin text-blue-600' : ''}`} />
            <span>{syncState.status === 'syncing' ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>

        {/* Token Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" /> API Token
            </span>
            <a
              href="https://todoist.com/app/settings/integrations/developer"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-600 hover:underline font-medium"
            >
              Get API Token from Todoist →
            </a>
          </label>

          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="Paste Todoist API Token here..."
              className="w-full pl-3.5 pr-10 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Never hardcoded. Saved securely in your browser's local storage.
          </p>
        </div>

        {/* Status result */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              statusMessage.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {statusMessage.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.message}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {apiToken ? (
            <button
              onClick={handleDisconnect}
              className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
            >
              Disconnect Token
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Connect Todoist'}
          </button>
        </div>
      </div>

      {/* Demo Mode Toggle Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Interactive Demo Mode</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Use realistic sample data for presentation without needing credentials.
          </p>
        </div>

        <button
          onClick={() => toggleDemoMode(!isDemoMode)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            isDemoMode
              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
        >
          {isDemoMode ? 'Demo Active' : 'Enable Demo'}
        </button>
      </div>
    </div>
  );
};
