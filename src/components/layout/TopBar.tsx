import { CalendarDays, CheckCircle2, FolderKanban, LayoutDashboard, Plus, Search, Settings, Sun, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { href, type Route } from '../../hooks/useRoute';
import { useUi } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import { SearchBox } from '../search/SearchBox';
import { ConnectionBadge, ModeBadge, SyncButton } from './SyncStatus';

function useNewTaskDefaults(route: Route) {
  const { index } = useWorkspace();
  return () => (route.name === 'project' && index?.projectById.has(route.projectId) ? { projectId: route.projectId } : {});
}

export function TopBar({ route }: { route: Route }) {
  const { openNewTask } = useUi();
  const defaults = useNewTaskDefaults(route);
  const [searching, setSearching] = useState(false);

  return (
    <>
      {/* Desktop */}
      <header className="hidden h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-5 md:flex">
        <div className="max-w-md flex-1">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ModeBadge />
          <div className="hidden xl:block">
            <ConnectionBadge withTime />
          </div>
          <SyncButton />
          <button type="button" className="btn-primary" onClick={() => openNewTask(defaults())}>
            <Plus size={15} strokeWidth={2.5} /> Add task
          </button>
        </div>
      </header>

      {/* Mobile */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 md:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[13px] font-bold text-white">W</span>
        <ModeBadge />
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" className="icon-btn h-8 w-8" onClick={() => setSearching(true)} aria-label="Search">
            <Search size={17} />
          </button>
          <SyncButton compact />
          <a href={href.settings()} className="icon-btn h-8 w-8" aria-label="Settings">
            <Settings size={17} />
          </a>
          <button type="button" className="btn-primary w-8 px-0" onClick={() => openNewTask(defaults())} aria-label="Add task">
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {searching && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface p-3 md:hidden">
          <div className="flex items-center gap-2">
            <SearchBox autoFocus inline onDone={() => setSearching(false)} />
            <button type="button" className="btn-ghost" onClick={() => setSearching(false)} aria-label="Close search">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function MobileNav({ route }: { route: Route }) {
  const items: { to: string; active: boolean; icon: ReactNode; label: string }[] = [
    { to: href.dashboard(), active: route.name === 'dashboard', icon: <LayoutDashboard key="i" size={19} />, label: 'Home' },
    { to: href.today(), active: route.name === 'today', icon: <Sun key="i" size={19} />, label: 'Today' },
    { to: href.upcoming(), active: route.name === 'upcoming', icon: <CalendarDays key="i" size={19} />, label: 'Upcoming' },
    { to: href.projects(), active: route.name === 'projects' || route.name === 'project', icon: <FolderKanban key="i" size={19} />, label: 'Projects' },
    { to: href.completed(), active: route.name === 'completed', icon: <CheckCircle2 key="i" size={19} />, label: 'Done' },
  ];
  return (
    <nav className="grid shrink-0 grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
      {items.map(({ to, active, icon, label }) => (
        <a key={label} href={to} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-2xs ${active ? 'font-semibold text-accent' : 'text-ink-3'}`}>
          {icon}
          {label}
        </a>
      ))}
    </nav>
  );
}
