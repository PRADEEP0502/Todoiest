import { FolderKanban, Inbox } from 'lucide-react';
import { Gate } from '../components/common/Gate';
import { Chevron, Count, EmptyState, PageHeader, ProjectDot } from '../components/common/ui';
import { useCollapse } from '../hooks/useCollapse';
import { href } from '../hooks/useRoute';
import type { ProjectGroup, ProjectNode, WorkspaceIndex } from '../lib/hierarchy';
import { completedSince } from '../lib/stats';
import { startOfMonth } from '../lib/dates';

export function ProjectsPage() {
  return (
    <Gate>
      {({ index, snapshot }) => {
        const doneThisMonth = new Map<string, number>();
        for (const t of completedSince(snapshot.completed, startOfMonth(new Date()))) {
          doneThisMonth.set(t.project_id, (doneThisMonth.get(t.project_id) ?? 0) + 1);
        }
        const total = index.orderedProjects.length;
        return (
          <>
            <PageHeader
              title="Projects"
              subtitle={`${total} project${total === 1 ? '' : 's'}${index.groups.length > 1 ? ` in ${index.groups.length} groups` : ''} · ${snapshot.tasks.length} open tasks`}
            />
            {total === 0 ? (
              <EmptyState icon={<FolderKanban size={28} />} title="No projects yet">Projects you create in Todoist will appear here after the next sync.</EmptyState>
            ) : (
              <div className="space-y-6">
                {index.groups.map((group) => (
                  <Group key={group.id} group={group} index={index} doneThisMonth={doneThisMonth} />
                ))}
              </div>
            )}
          </>
        );
      }}
    </Gate>
  );
}

function Group({ group, index, doneThisMonth }: { group: ProjectGroup; index: WorkspaceIndex; doneThisMonth: Map<string, number> }) {
  const [collapsed, toggle] = useCollapse(`projects:group:${group.id}`);
  const flat: ProjectNode[] = [];
  const walk = (n: ProjectNode) => {
    flat.push(n);
    n.children.forEach(walk);
  };
  group.roots.forEach(walk);

  return (
    <section>
      <button type="button" onClick={toggle} aria-expanded={!collapsed} className="mb-2.5 flex items-center gap-2 rounded-md py-1 pr-2 text-left">
        <Chevron collapsed={collapsed} />
        <h2 className="text-[16px] font-semibold text-ink">{group.name}</h2>
        <Count>{group.projectCount}</Count>
      </button>
      {!collapsed && (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {flat.map((node) => (
            <ProjectTile key={node.project.id} node={node} index={index} done={doneThisMonth.get(node.project.id) ?? 0} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectTile({ node, index, done }: { node: ProjectNode; index: WorkspaceIndex; done: number }) {
  const { project } = node;
  const open = index.openByProject.get(project.id) ?? 0;
  const sections = index.sectionsByProject.get(project.id) ?? [];
  const parent = project.parent_id ? index.projectById.get(project.parent_id) : undefined;
  const pct = open + done > 0 ? Math.round((done / (open + done)) * 100) : 0;

  return (
    <a href={href.project(project.id)} className="panel group flex flex-col px-3.5 py-3 transition-colors hover:border-line-strong hover:bg-canvas/40">
      {parent && <span className="mb-0.5 truncate text-2xs text-ink-3">{parent.name} ›</span>}
      <span className="flex items-center gap-2">
        {project.inbox_project ? <Inbox size={14} className="shrink-0 text-ink-3" /> : <ProjectDot color={project.color} size={9} />}
        <span className="truncate text-[14.5px] font-semibold text-ink">{project.name}</span>
      </span>
      <span className="mt-1 text-[12px] text-ink-2">
        {open} open · {sections.length} section{sections.length === 1 ? '' : 's'}
      </span>
      <span className="mt-1 line-clamp-1 min-h-[16px] text-[12px] text-ink-3">
        {sections.map((s) => s.name).join(' · ')}
      </span>
      <span className="mt-2.5 flex items-center gap-2">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-hover">
          <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </span>
        <span className="text-2xs tabular-nums text-ink-3" title="Completed this month vs still open">{done} done</span>
      </span>
    </a>
  );
}
