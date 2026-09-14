import { CalendarDays, CheckCircle2, FolderKanban, Inbox, LayoutDashboard, Settings, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCollapse } from '../../hooks/useCollapse';
import { useNow } from '../../hooks/useNow';
import { href, type Route } from '../../hooks/useRoute';
import { toDateKey } from '../../lib/dates';
import type { ProjectGroup, ProjectNode } from '../../lib/hierarchy';
import { isDueToday } from '../../lib/stats';
import { useWorkspace } from '../../store/workspace';
import { Chevron, Count, ProjectDot } from '../common/ui';
import { ConnectionBadge } from './SyncStatus';

export function Sidebar({ route }: { route: Route }) {
  const { index, snapshot } = useWorkspace();
  const now = useNow(60_000);
  const todayKey = toDateKey(now);
  const todayCount = snapshot?.tasks.filter((t) => isDueToday(t, todayKey)).length;

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[13px] font-bold text-white">W</span>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold text-ink">Workspace</div>
          <div className="text-2xs text-ink-3">Todoist dashboard</div>
        </div>
      </div>

      <nav className="space-y-0.5 px-2 pt-1" aria-label="Main">
        <NavItem to={href.dashboard()} active={route.name === 'dashboard'} icon={<LayoutDashboard size={16} />}>Dashboard</NavItem>
        <NavItem to={href.today()} active={route.name === 'today'} icon={<Sun size={16} />} count={todayCount}>Today</NavItem>
        <NavItem to={href.upcoming()} active={route.name === 'upcoming'} icon={<CalendarDays size={16} />}>Upcoming</NavItem>
        <NavItem to={href.projects()} active={route.name === 'projects'} icon={<FolderKanban size={16} />} count={index?.orderedProjects.length}>
          Projects
        </NavItem>
        <NavItem to={href.completed()} active={route.name === 'completed'} icon={<CheckCircle2 size={16} />}>Completed</NavItem>
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="eyebrow px-4 pb-1.5">Projects</div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {!index && <div className="space-y-2 px-2 pt-1">{[70, 55, 80, 60].map((w) => <div key={w} className="h-4 animate-pulse rounded bg-hover" style={{ width: `${w}%` }} />)}</div>}
          {index?.groups.map((group) => (
            <SidebarGroup
              key={group.id}
              group={group}
              single={index.groups.length === 1}
              activeProjectId={route.name === 'project' ? route.projectId : null}
              counts={index.openByProject}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-line px-2 py-2">
        <div className="px-2 pb-1 pt-1">
          <div className="eyebrow mb-1">Todoist</div>
          <ConnectionBadge />
        </div>
        <NavItem to={href.settings()} active={route.name === 'settings'} icon={<Settings size={16} />}>Settings</NavItem>
      </div>
    </aside>
  );
}

function NavItem({ to, active, icon, count, children }: { to: string; active: boolean; icon: ReactNode; count?: number; children: ReactNode }) {
  return (
    <a
      href={to}
      aria-current={active ? 'page' : undefined}
      className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-[13.5px] transition-colors ${active ? 'bg-surface font-medium text-ink shadow-[0_0_0_1px_theme(colors.line)]' : 'text-ink-2 hover:bg-hover hover:text-ink'}`}
    >
      <span className={active ? 'text-accent' : 'text-ink-3'}>{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {count !== undefined && count > 0 && <Count>{count}</Count>}
    </a>
  );
}

function SidebarGroup({
  group,
  single,
  activeProjectId,
  counts,
}: {
  group: ProjectGroup;
  single: boolean;
  activeProjectId: string | null;
  counts: Map<string, number>;
}) {
  const [collapsed, toggle] = useCollapse(`sidebar:group:${group.id}`);
  const nodes = group.roots.map((node) => <SidebarProject key={node.project.id} node={node} activeProjectId={activeProjectId} counts={counts} />);
  if (single) return <div>{nodes}</div>;
  return (
    <div className="mb-1">
      <button type="button" onClick={toggle} aria-expanded={!collapsed} className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left hover:bg-hover">
        <Chevron collapsed={collapsed} className="!h-3.5 !w-3.5" />
        <span className="flex-1 truncate text-[12.5px] font-semibold text-ink-2">{group.name}</span>
        <Count>{group.projectCount}</Count>
      </button>
      {!collapsed && <div>{nodes}</div>}
    </div>
  );
}

function SidebarProject({ node, activeProjectId, counts }: { node: ProjectNode; activeProjectId: string | null; counts: Map<string, number> }) {
  const [collapsed, toggle] = useCollapse(`sidebar:project:${node.project.id}`);
  const active = activeProjectId === node.project.id;
  const hasChildren = node.children.length > 0;
  return (
    <>
      <div
        className={`group flex h-8 items-center rounded-md pr-2 transition-colors ${active ? 'bg-surface shadow-[0_0_0_1px_theme(colors.line)]' : 'hover:bg-hover'}`}
        style={{ paddingLeft: 8 + node.depth * 14 }}
      >
        <span className="flex w-4 shrink-0 justify-center">
          {hasChildren && (
            <button type="button" onClick={toggle} aria-label={collapsed ? 'Expand' : 'Collapse'} className="rounded">
              <Chevron collapsed={collapsed} className="!h-3.5 !w-3.5" />
            </button>
          )}
        </span>
        <a href={href.project(node.project.id)} aria-current={active ? 'page' : undefined} className="flex min-w-0 flex-1 items-center gap-2 pl-1">
          {node.project.inbox_project ? <Inbox size={13} className="shrink-0 text-ink-3" /> : <ProjectDot color={node.project.color} />}
          <span className={`truncate text-[13.5px] ${active ? 'font-medium text-ink' : 'text-ink-2 group-hover:text-ink'}`}>{node.project.name}</span>
        </a>
        <Count className="pl-2">{counts.get(node.project.id) || ''}</Count>
      </div>
      {hasChildren && !collapsed && node.children.map((child) => <SidebarProject key={child.project.id} node={child} activeProjectId={activeProjectId} counts={counts} />)}
    </>
  );
}
