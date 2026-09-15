import {
  AlarmClock,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  History,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Settings,
  Sun,
  Tag,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useDisclosure } from '../../hooks/useDisclosure';
import { useNow } from '../../hooks/useNow';
import { href, type Route } from '../../hooks/useRoute';
import { toDateKey } from '../../lib/dates';
import { isDueToday, isOverdue } from '../../lib/stats';
import { useNotifications } from '../../store/notifications';
import { useWorkspace } from '../../store/workspace';
import { StatusCard } from './SyncStatus';

export interface NavLink {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  count?: number;
  /** Badge colour: orange for things needing attention, green for today's work. */
  badge?: 'orange' | 'green' | 'grey';
}

export interface NavGroup {
  label: string | null;
  links: NavLink[];
}

const ICON = 18;

/** The main navigation, shared by the desktop sidebar and the mobile "More" menu. */
export function useNavLinks(route: Route): { main: NavLink[]; secondary: NavLink[]; groups: NavGroup[] } {
  const { index, snapshot } = useWorkspace();
  const { unreadCount } = useNotifications();
  const now = useNow(60_000);
  const todayKey = toDateKey(now);
  const today = snapshot?.tasks.filter((t) => isDueToday(t, todayKey)).length;
  const overdue = snapshot?.tasks.filter((t) => isOverdue(t, todayKey)).length;

  const main: NavLink[] = [
    { to: href.dashboard(), label: 'Dashboard', icon: <LayoutDashboard size={ICON} />, active: route.name === 'dashboard' || route.name === 'metric' },
    { to: href.projects(), label: 'Projects', icon: <FolderKanban size={ICON} />, active: route.name === 'projects' || route.name === 'project', count: index?.orderedProjects.length, badge: 'grey' },
    { to: href.today(), label: 'Today', icon: <Sun size={ICON} />, active: route.name === 'today', count: today, badge: 'green' },
    { to: href.overdue(), label: 'Overdue', icon: <AlarmClock size={ICON} />, active: route.name === 'overdue', count: overdue, badge: 'orange' },
    { to: href.holders(), label: 'Holder Wise', icon: <Users size={ICON} />, active: route.name === 'holders' || route.name === 'holder' },
    { to: href.labels(), label: 'Label Wise', icon: <Tag size={ICON} />, active: route.name === 'labels' || route.name === 'label' },
    { to: href.activity(), label: 'Activity Logs', icon: <History size={ICON} />, active: route.name === 'activity' },
    { to: href.comments(), label: 'Comments', icon: <MessageSquare size={ICON} />, active: route.name === 'comments', count: snapshot?.comments.length, badge: 'grey' },
    { to: href.notifications(), label: 'Notifications', icon: <Bell size={ICON} />, active: route.name === 'notifications', count: unreadCount, badge: 'orange' },
  ];
  const secondary: NavLink[] = [
    { to: href.upcoming(), label: 'Upcoming', icon: <CalendarDays size={ICON} />, active: route.name === 'upcoming' },
    { to: href.completed(), label: 'Completed', icon: <CheckCircle2 size={ICON} />, active: route.name === 'completed' },
  ];
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
  const initials =
    name
      .replace(/'s workspace$/, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'W';
  return (
    <a href={href.dashboard()} className="flex min-w-0 items-center gap-3" aria-label={`${name} dashboard`}>
      <span
        className={`flex shrink-0 items-center justify-center font-semibold tracking-[0.02em] text-white shadow-pill ${compact ? 'h-8 w-8 rounded-[11px] text-[12px]' : 'h-11 w-11 rounded-[15px] text-[14px]'}`}
        style={{ backgroundImage: 'linear-gradient(145deg, #5a5a5a 0%, #262626 55%, #0f0f0f 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px -4px rgba(0,0,0,0.35)' }}
      >
        {initials}
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{name}</span>
          <span className="block truncate text-[12px] text-ink-3">Management dashboard</span>
        </span>
      )}
    </a>
  );
}

function Badge({ link }: { link: Pick<NavLink, 'count' | 'badge'> }) {
  if (!link.count) return null;
  const cls = link.badge === 'orange' ? 'badge-orange' : link.badge === 'green' ? 'badge-green' : 'badge-grey';
  return <span className={cls}>{link.count > 99 ? '99+' : link.count}</span>;
}

/** A top-level row: icon + label; the current page is raised as a white pill. */
export function NavItem({ link }: { link: NavLink }) {
  return (
    <a
      href={link.to}
      aria-current={link.active ? 'page' : undefined}
      className={`flex h-11 items-center gap-3.5 rounded-2xl px-3 text-[15px] transition-[background-color,box-shadow,color] ${link.active ? 'bg-surface font-semibold text-ink shadow-pill' : 'font-medium text-ink-2 hover:bg-black/[0.035] hover:text-ink'}`}
    >
      <span className={`shrink-0 ${link.active ? 'text-ink' : 'text-ink-2'}`}>{link.icon}</span>
      <span className="flex-1 truncate">{link.label}</span>
      <Badge link={link} />
    </a>
  );
}

/**
 * An expandable group whose items hang off a curved tree line. Like the reference design, only the
 * group holding the current page opens by itself; others stay closed until clicked.
 */
function TreeGroup({ id, label, icon, to, items }: { id: string; label: string; icon: ReactNode; to?: string; items: NavLink[] }) {
  const [open, toggle] = useDisclosure(`nav:${id}`, false);
  const containsActive = items.some((i) => i.active);
  const expanded = open || containsActive;
  // A closed group still surfaces what needs attention (e.g. overdue, unread) on its own row.
  const urgent = expanded ? undefined : items.find((i) => i.badge === 'orange' && i.count);

  return (
    <div>
      <div className="flex h-11 items-center rounded-2xl pr-1 text-[15px] hover:bg-black/[0.035]">
        <a href={to ?? items[0]?.to} className={`flex min-w-0 flex-1 items-center gap-3.5 self-stretch pl-3 ${expanded ? 'font-semibold text-ink' : 'font-medium text-ink-2 hover:text-ink'}`}>
          <span className={`shrink-0 ${expanded ? 'text-ink' : 'text-ink-2'}`}>{icon}</span>
          <span className="flex-1 truncate">{label}</span>
          {urgent && <Badge link={urgent} />}
        </a>
        <button
          type="button"
          onClick={toggle}
          disabled={containsActive}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
          className="icon-btn text-ink-2 disabled:cursor-default disabled:hover:bg-transparent"
        >
          {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>
      </div>

      {expanded && (
        <ul className="relative mb-1 ml-[21px] mt-0.5 pl-[18px]">
          {items.map((item, i) => (
            <li key={item.to + item.label} className="relative">
              {/* Continuous line past every item but the last, plus a rounded elbow into each item. */}
              {i < items.length - 1 && <span aria-hidden className="absolute -left-[18px] bottom-0 top-0 w-px bg-[#dcdcdc]" />}
              <span aria-hidden className="absolute -left-[18px] top-0 h-1/2 w-[13px] rounded-bl-[10px] border-b border-l border-[#dcdcdc]" />
              <a
                href={item.to}
                aria-current={item.active ? 'page' : undefined}
                className={`my-0.5 flex h-10 items-center gap-2 rounded-xl px-3 text-[14.5px] transition-[background-color,box-shadow,color] ${item.active ? 'bg-surface font-semibold text-ink shadow-pill' : 'text-ink-3 hover:text-ink'}`}
              >
                <span className="flex-1 truncate">{item.label}</span>
                <Badge link={item} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PROJECTS_IN_SIDEBAR = 8;

export function Sidebar({ route }: { route: Route }) {
  const { main, secondary } = useNavLinks(route);
  const { index } = useWorkspace();
  const [dashboard, projects, today, overdue, holders, labels, activity, comments, notifications] = main;
  const [upcoming, completed] = secondary;

  // Top-level Todoist projects as tree items; the full list lives on the Projects page.
  const roots = index?.orderedProjects.filter((n) => n.depth === 0) ?? [];
  const activeProjectId = route.name === 'project' ? route.projectId : null;
  const activeRoot = activeProjectId ? (() => {
    let p = index?.projectById.get(activeProjectId);
    while (p?.parent_id && index?.projectById.has(p.parent_id)) p = index.projectById.get(p.parent_id);
    return p?.id ?? null;
  })() : null;
  const shown = roots.slice(0, PROJECTS_IN_SIDEBAR);
  if (activeRoot && !shown.some((n) => n.project.id === activeRoot)) {
    const extra = roots.find((n) => n.project.id === activeRoot);
    if (extra) shown.push(extra);
  }
  const projectItems: NavLink[] = [
    { to: href.projects(), label: 'All projects', icon: null, active: route.name === 'projects', count: index?.orderedProjects.length, badge: 'grey' },
    ...shown.map((n) => ({ to: href.project(n.project.id), label: n.project.name, icon: null, active: activeRoot === n.project.id })),
    ...(roots.length > shown.length ? [{ to: href.projects(), label: `+${roots.length - shown.length} more`, icon: null, active: false }] : []),
  ];

  return (
    <aside className="hidden w-[276px] shrink-0 flex-col md:flex">
      <div className="px-6 pb-5 pt-7">
        <Brand />
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-4" aria-label="Main">
        <NavItem link={dashboard} />
        <TreeGroup id="projects" label="Projects" icon={projects.icon} to={href.projects()} items={projectItems} />
        <TreeGroup id="tasks" label="Tasks" icon={<ListChecks size={ICON} />} to={href.today()} items={[today, overdue, upcoming, completed]} />
        <NavItem link={holders} />
        <NavItem link={labels} />
        <TreeGroup id="updates" label="Updates" icon={activity.icon} to={href.activity()} items={[activity, comments, notifications]} />
      </nav>

      <div className="space-y-1 px-4 pb-5 pt-2">
        <StatusCard />
        <NavItem link={{ to: href.settings(), label: 'Settings', icon: <Settings size={ICON} />, active: route.name === 'settings' }} />
      </div>
    </aside>
  );
}
