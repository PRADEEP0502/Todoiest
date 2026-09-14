import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { href } from '../../hooks/useRoute';
import type { WorkspaceIndex } from '../../lib/hierarchy';
import { useWorkspace } from '../../store/workspace';
import type { WorkspaceSnapshot } from '../../types/todoist';
import { LoadingRows } from './ui';

/** Shows loading or a connection error until the first sync lands, then renders the page. */
export function Gate({ children }: { children: (data: { snapshot: WorkspaceSnapshot; index: WorkspaceIndex }) => ReactNode }) {
  const { snapshot, index, sync, syncNow, mode } = useWorkspace();
  if (snapshot && index) return <>{children({ snapshot, index })}</>;

  if (sync.status === 'error') {
    return (
      <div className="panel mx-auto mt-8 max-w-md p-6 text-center">
        <AlertCircle className="mx-auto mb-3 text-danger" size={22} />
        <p className="text-[15px] font-semibold text-ink">Couldn’t load your Todoist workspace</p>
        <p className="mt-1 text-[13px] text-ink-2">{sync.error}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="btn-primary" onClick={() => void syncNow()}>Try again</button>
          {mode === 'live' && <a className="btn-secondary" href={href.settings()}>Check settings</a>}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="mb-6 h-7 w-48 animate-pulse rounded bg-hover" />
      <LoadingRows />
    </div>
  );
}
