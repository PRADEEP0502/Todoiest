import { AlarmClock, Bell, FolderKanban, LayoutDashboard, Menu, Plus, Search, Settings, Sun, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { href, type Route } from '../../hooks/useRoute';
import { useNotifications } from '../../store/notifications';
import { useUi } from '../../store/ui';
import { useWorkspace } from '../../store/workspace';
import { SearchBox } from '../search/SearchBox';
import { NavItem, useNavLinks } from './Sidebar';
import { Brand } from './Sidebar';
import { ModeBadge, StatusPill, SyncButton, WriteStatus } from './SyncStatus';

function useNewTaskDefaults(route: Route) {
  const { index } = useWorkspace();
  return () => (route.name === 'project' && index?.projectById.has(route.projectId) ? { projectId: route.projectId } : {});
}

function BellLink({ className = '' }: { className?: string }) {
  const { unreadCount } = useNotifications();
  return (
    <a href={href.notifications()} className={`icon-btn relative h-8 w-8 ${className}`} aria-label={`Notifications, ${unreadCount} unread`}>
      <Bell size={17} />
      {unreadCount > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-p1 px-1 text-[10px] font-semibold leading-none text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </a>
  );
}

export function TopBar({ route }: { route: Route }) {
  const { openNewTask } = useUi();
  const defaults = useNewTaskDefaults(route);
  const [searching, setSearching] = useState(false);

  return (
    <>
      {/* Desktop */}
      <header className="hidden h-[76px] shrink-0 items-center gap-4 pl-4 pr-8 pt-3 md:flex lg:pr-10">
        <div className="min-w-0 max-w-md flex-1">
          <SearchBox />
        </div>
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
          <WriteStatus />
          <StatusPill />
          {/* A tablet has no room for the wording, so the Sync button shrinks to its icon. */}
          <span className="lg:hidden">
            <SyncButton compact />
          </span>
          <span className="hidden lg:inline-flex">
            <SyncButton />
          </span>
          <BellLink className="mx-0.5" />
          <button type="button" className="btn-primary" onClick={() => openNewTask(defaults())}>
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden lg:inline">Add task</span>
          </button>
        </div>
      </header>

      {/* Mobile */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/[0.04] bg-canvas px-3 md:hidden">
        <Brand compact />
        <ModeBadge />
        <div className="ml-auto flex items-center gap-1">
          <WriteStatus compact />
          <button type="button" className="icon-btn h-8 w-8" onClick={() => setSearching(true)} aria-label="Search">
            <Search size={17} />
          </button>
          <SyncButton compact />
          <BellLink />
          <button type="button" className="btn-primary ml-1 w-8 px-0" onClick={() => openNewTask(defaults())} aria-label="Add task">
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {searching && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-surface p-3 md:hidden">
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

/** Compact bottom navigation: the four most used views, everything else under "More". */
export function MobileNav({ route }: { route: Route }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { main, secondary } = useNavLinks(route);

  useEffect(() => {
    const close = () => setMoreOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  const items: { to: string; active: boolean; icon: ReactNode; label: string }[] = [
    { to: href.dashboard(), active: route.name === 'dashboard', icon: <LayoutDashboard size={19} />, label: 'Home' },
    { to: href.projects(), active: route.name === 'projects' || route.name === 'project', icon: <FolderKanban size={19} />, label: 'Projects' },
    { to: href.today(), active: route.name === 'today', icon: <Sun size={19} />, label: 'Today' },
    { to: href.overdue(), active: route.name === 'overdue', icon: <AlarmClock size={19} />, label: 'Overdue' },
  ];
  const inMore = !items.some((i) => i.active);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-ink/25 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-canvas px-3 pb-20 pt-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-[14px] font-semibold text-ink">All views</span>
              <button type="button" className="icon-btn" onClick={() => setMoreOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-0.5">
              {[...main, ...secondary].map((link) => (
                <NavItem key={link.label} link={link} />
              ))}
              <NavItem link={{ to: href.settings(), label: 'Settings', icon: <Settings size={16} />, active: route.name === 'settings' }} />
            </div>
          </div>
        </div>
      )}
      <nav className="relative z-50 grid shrink-0 grid-cols-5 border-t border-black/[0.05] bg-surface pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {items.map(({ to, active, icon, label }) => (
          <a key={label} href={to} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-2xs ${active ? 'font-semibold text-ink' : 'text-ink-3'}`}>
            {icon}
            {label}
          </a>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          className={`flex flex-col items-center gap-0.5 py-2 text-2xs ${moreOpen || inMore ? 'font-semibold text-ink' : 'text-ink-3'}`}
        >
          <Menu size={19} />
          More
        </button>
      </nav>
    </>
  );
}
