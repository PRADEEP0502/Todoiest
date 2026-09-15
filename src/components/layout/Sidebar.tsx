import { AlarmClock, Bell, CalendarDays, CheckCircle2, FolderKanban, History, LayoutDashboard, MessageSquare, Settings, Sun, Tag, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNow } from '../../hooks/useNow';
import { href, type Route } from '../../hooks/useRoute';
import { toDateKey } from '../../lib/dates';
import { isDueToday, isOverdue } from '../../lib/stats';
import { useNotifications } from '../../store/notifications';
import { useWorkspace } from '../../store/workspace';
import { Count } from '../common/ui';
import { ConnectionBadge } from './SyncStatus';

export interface NavLink {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  count?: number;
  alert?: boolean;
}

/** The main navigation, shared by the desktop sidebar and the mobile "More" menu. */
export interface NavGroup {
  label: string | null;
  links: NavLink[];
}

export function useNavLinks(route: Route): { main: NavLink[]; secondary: NavLink[]; groups: NavGroup[] } {
  const { index, snapshot } = useWorkspace();
  const { unreadCount } = useNotifications();
  const now = useNow(60_000);
  const todayKey = toDateKey(now);
  const today = snapshot?.tasks.filter((t) => isDueToday(t, todayKey)).length;
  const overdue = snapshot?.tasks.filter((t) => isOverdue(t, todayKey)).length;
  const size = 16;

  const main: NavLink[] = [
      { to: href.dashboard(), label: 'Dashboard', icon: <LayoutDashboard size={size} />, active: route.name === 'dashboard' || route.name === 'metric' },
      { to: href.projects(), label: 'Projects', icon: <FolderKanban size={size} />, active: route.name === 'projects' || route.name === 'project', count: index?.orderedProjects.length },
      { to: href.today(), label: 'Today', icon: <Sun size={size} />, active: route.name === 'today', count: today },
      { to: href.overdue(), label: 'Overdue', icon: <AlarmClock size={size} />, active: route.name === 'overdue', count: overdue, alert: !!overdue },
      { to: href.holders(), label: 'Holder Wise', icon: <Users size={size} />, active: route.name === 'holders' || route.name === 'holder' },
      { to: href.labels(), label: 'Label Wise', icon: <Tag size={size} />, active: route.name === 'labels' || route.name === 'label' },
      { to: href.activity(), label: 'Activity Logs', icon: <History size={size} />, active: route.name === 'activity' },
      { to: href.comments(), label: 'Comments', icon: <MessageSquare size={size} />, active: route.name === 'comments', count: snapshot?.comments.length },
      { to: href.notifications(), label: 'Notifications', icon: <Bell size={size} />, active: route.name === 'notifications', count: unreadCount, alert: unreadCount > 0 },
  ];
  const secondary: NavLink[] = [
    { to: href.upcoming(), label: 'Upcoming', icon: <CalendarDays size={size} />, active: route.name === 'upcoming' },
    { to: href.completed(), label: 'Completed', icon: <CheckCircle2 size={size} />, active: route.name === 'completed' },
  ];
  // Same order as the main menu, split into small groups so it can be scanned at a glance.
  const groups: NavGroup[] = [
    { label: null, links: main.slice(0, 4) },
    { label: 'People & labels', links: main.slice(4, 6) },
    { label: 'Updates', links: main.slice(6) },
    { label: 'More views', links: secondary },
  ];
  return { main, secondary, groups };
}

/** Workspace name from Todoist (team workspace, else the account owner's name). */
export function Brand({ compact = false }: { compact?: boolean }) {
  const { snapshot } = useWorkspace();
  const first = snapshot?.user.full_name.split(' ')[0];
  const name = snapshot?.workspaces[0]?.name ?? (first ? `${first}'s workspace` : 'Workspace');
  const initials = name.replace(/'s workspace$/, '').split(/s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'W';
  return (
    <a href={href.dashboard()} className="flex min-w-0 items-center gap-2.5" aria-label={`${name} dashboard`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-[12px] font-bold tracking-[0.02em] text-white">{initials}</span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[14px] font-semibold text-ink">{name}</span>
          <span className="block truncate text-2xs text-ink-3">Management dashboard</span>
        </span>
      )}
    </a>
  );
}

export function Sidebar({ route }: { route: Route }) {
  const { groups } = useNavLinks(route);

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-line bg-sidebar md:flex">
      <div className="flex h-14 items-center px-4">
        <Brand />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-1" aria-label="Main">
        {groups.map((group) => (
          <div key={group.label ?? 'main'} className={group.label ? 'pt-4' : ''}>
            {group.label && <div className="eyebrow px-2 pb-1">{group.label}</div>}
            <div className="space-y-0.5">
              {group.links.map((link) => (
                <NavItem key={link.label} link={link} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-2 py-2">
        <div className="px-2 pb-1 pt-1">
          <div className="eyebrow mb-1">Todoist</div>
          <ConnectionBadge />
        </div>
        <NavItem link={{ to: href.settings(), label: 'Settings', icon: <Settings size={16} />, active: route.name === 'settings' }} />
      </div>
    </aside>
  );
}

export function NavItem({ link }: { link: NavLink }) {
  return (
    <a
      href={link.to}
      aria-current={link.active ? 'page' : undefined}
      className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-[13.5px] transition-colors ${link.active ? 'bg-surface font-medium text-ink shadow-[0_0_0_1px_theme(colors.line)]' : 'text-ink-2 hover:bg-hover hover:text-ink'}`}
    >
      <span className={link.active ? 'text-accent' : 'text-ink-3'}>{link.icon}</span>
      <span className="flex-1 truncate">{link.label}</span>
      {link.count !== undefined && link.count > 0 && (
        <Count className={link.alert ? '!text-p1 font-semibold' : ''}>{link.count}</Count>
      )}
    </a>
  );
}
