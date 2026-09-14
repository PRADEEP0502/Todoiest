import { ChevronsDownUp, ChevronsUpDown, FolderX, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Gate } from '../components/common/Gate';
import { Chevron, Count, EmptyState, ProjectDot } from '../components/common/ui';
import { TaskTree } from '../components/tasks/TaskTree';
import { setCollapsed, useCollapse, useCollapsedSet } from '../hooks/useCollapse';
import { href } from '../hooks/useRoute';
import { containerKey, countContainer, PERSONAL_GROUP_ID, type WorkspaceIndex } from '../lib/hierarchy';
import { useUi } from '../store/ui';
import type { TodoistProject, TodoistSection } from '../types/todoist';

const sectionKey = (id: string) => `section:${id}`;

export function ProjectDetailPage({ projectId, sectionId }: { projectId: string; sectionId: string | null }) {
  return <Gate>{({ index, snapshot }) => <ProjectDetail index={index} projectId={projectId} focusSectionId={sectionId} workspaceNames={snapshot.workspaces} />}</Gate>;
}

function ProjectDetail({
  index,
  projectId,
  focusSectionId,
  workspaceNames,
}: {
  index: WorkspaceIndex;
  projectId: string;
  focusSectionId: string | null;
  workspaceNames: { id: string; name: string }[];
}) {
  const { openNewTask } = useUi();
  const collapsedSet = useCollapsedSet();
  const project = index.projectById.get(projectId);

  if (!project) {
    return (
      <EmptyState icon={<FolderX size={28} />} title="Project not found">
        It may have been deleted, archived or you may have lost access in Todoist.{' '}
        <a href={href.projects()} className="text-accent hover:underline">See all projects</a>
      </EmptyState>
    );
  }

  const sections = index.sectionsByProject.get(project.id) ?? [];
  const unsectioned = index.rootTasks.get(containerKey(project.id, null)) ?? [];
  const openCount = index.openByProject.get(project.id) ?? 0;
  const childProjects = index.orderedProjects.filter((n) => n.project.parent_id === project.id).map((n) => n.project);
  const keys = sections.map((s) => sectionKey(s.id));
  const allCollapsed = keys.length > 0 && keys.every((k) => collapsedSet.has(k));

  // Breadcrumb: workspace › parent projects.
  const crumbs: { label: string; to?: string }[] = [];
  const workspaceName = project.workspace_id ? workspaceNames.find((w) => String(w.id) === String(project.workspace_id))?.name : undefined;
  const groupId = project.workspace_id ? String(project.workspace_id) : PERSONAL_GROUP_ID;
  crumbs.push({ label: workspaceName ?? index.groups.find((g) => g.id === groupId)?.name ?? 'Projects', to: href.projects() });
  const ancestors: TodoistProject[] = [];
  for (let p = project.parent_id ? index.projectById.get(project.parent_id) : undefined; p && ancestors.length < 10; p = p.parent_id ? index.projectById.get(p.parent_id) : undefined) {
    ancestors.unshift(p);
  }
  ancestors.forEach((p) => crumbs.push({ label: p.name, to: href.project(p.id) }));

  return (
    <div>
      <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span>›</span>}
            {c.to ? <a href={c.to} className="hover:text-ink hover:underline">{c.label}</a> : c.label}
          </span>
        ))}
      </nav>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-[24px] font-semibold leading-8 tracking-[-0.01em] text-ink">
            <ProjectDot color={project.color} size={11} />
            <span className="break-words">{project.name}</span>
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {openCount} open task{openCount === 1 ? '' : 's'} · {sections.length} section{sections.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {keys.length > 1 && (
            <button type="button" className="btn-ghost" onClick={() => setCollapsed(keys, !allCollapsed)}>
              {allCollapsed ? <ChevronsUpDown size={15} /> : <ChevronsDownUp size={15} />}
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => openNewTask({ projectId: project.id })}>
            <Plus size={15} /> Add task
          </button>
        </div>
      </div>

      {childProjects.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {childProjects.map((child) => (
            <a key={child.id} href={href.project(child.id)} className="inline-flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-3 text-[13px] text-ink-2 hover:bg-hover hover:text-ink">
              <ProjectDot color={child.color} />
              {child.name}
              <Count>{index.openByProject.get(child.id) ?? 0}</Count>
            </a>
          ))}
        </div>
      )}

      <div className="panel overflow-hidden">
        {unsectioned.length > 0 && (
          <div className="px-3 py-2 sm:px-4">
            {sections.length > 0 && <div className="eyebrow px-1 pb-1 pt-1.5">No section</div>}
            <TaskTree tasks={unsectioned} childrenOf={(id) => index.subtasks.get(id) ?? []} />
          </div>
        )}

        {sections.map((section) => (
          <SectionBlock key={section.id} section={section} index={index} focused={focusSectionId === section.id} />
        ))}

        {sections.length === 0 && unsectioned.length === 0 && (
          <EmptyState title="No open tasks in this project">
            <button type="button" className="text-accent hover:underline" onClick={() => openNewTask({ projectId: project.id })}>Add a task</button>
          </EmptyState>
        )}
      </div>
    </div>
  );
}

function SectionBlock({ section, index, focused }: { section: TodoistSection; index: WorkspaceIndex; focused: boolean }) {
  const { openNewTask } = useUi();
  const [collapsed, toggle] = useCollapse(sectionKey(section.id));
  const ref = useRef<HTMLElement>(null);
  const [highlight, setHighlight] = useState(false);
  const roots = index.rootTasks.get(containerKey(section.project_id, section.id)) ?? [];
  const count = countContainer(index, section.project_id, section.id);

  // Arriving from search: open this section and bring it into view.
  useEffect(() => {
    if (!focused) return;
    setCollapsed([sectionKey(section.id)], false);
    ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setHighlight(true);
    const t = setTimeout(() => setHighlight(false), 1600);
    return () => clearTimeout(t);
  }, [focused, section.id]);

  return (
    <section ref={ref} className={`scroll-mt-4 border-t border-line first:border-t-0 transition-colors ${highlight ? 'bg-accent-soft/60' : ''}`}>
      <div className="group flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <button type="button" onClick={toggle} aria-expanded={!collapsed} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Chevron collapsed={collapsed} />
          <span className="min-w-0">
            <span className="block break-words text-[14.5px] font-semibold text-ink">{section.name}</span>
            <span className="block text-[12px] text-ink-3">
              {count} task{count === 1 ? '' : 's'}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="icon-btn opacity-60 group-hover:opacity-100"
          onClick={() => openNewTask({ projectId: section.project_id, sectionId: section.id })}
          aria-label={`Add task to ${section.name}`}
          title="Add task to this section"
        >
          <Plus size={15} />
        </button>
      </div>
      {!collapsed && (
        <div className="px-3 pb-2 sm:px-4">
          {roots.length > 0 ? (
            <TaskTree tasks={roots} childrenOf={(id) => index.subtasks.get(id) ?? []} />
          ) : (
            <p className="pb-2 pl-7 text-[13px] text-ink-3">No open tasks</p>
          )}
        </div>
      )}
    </section>
  );
}
