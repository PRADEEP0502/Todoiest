import { ArrowRight, PlugZap } from 'lucide-react';
import { href } from '../../hooks/useRoute';
import { useWorkspace } from '../../store/workspace';

/**
 * Shown on a deployed site before anyone has connected an account: the sample data is clearly
 * labelled and one click leads to Settings, where a personal Todoist token can be pasted.
 */
export function ConnectBanner() {
  const { mode, settings } = useWorkspace();
  if (mode !== 'demo' || settings.tokenSource !== 'none') return null;
  return (
    <div className="panel mb-5 flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
        <PlugZap size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-amber-900">You are looking at sample data</span>
        <span className="block text-[12.5px] text-amber-800">
          Connect your own Todoist account to see your real projects and tasks. Your token stays in this browser only.
        </span>
      </span>
      <a href={href.settings()} className="btn-primary shrink-0">
        Connect Todoist <ArrowRight size={14} />
      </a>
    </div>
  );
}
