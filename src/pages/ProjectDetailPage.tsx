import { ChevronsDownUp, ChevronsUpDown, FolderX, ListPlus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Gate } from '../components/common/Gate';
import { Count, EmptyState, ProjectDot } from '../components/common/ui';
import { NewSectionDialog } from '../components/projects/CreateDialogs';
import { ProjectSections, projectBlockKeys } from '../components/projects/ProjectSections';
import { disclosureKey, isOpen, setOpen, useDisclosureState } from '../hooks/useDisclosure';
import { href } from '../hooks/useRoute';
import { PERSONAL_GROUP_ID, type WorkspaceIndex } from '../lib/hierarchy';
import { revealKeys } from '../lib/projects';
import { useUi } from '../store/ui';
import type { TodoistProject, TodoistWorkspace } from '../types/todoist';

interface Props {
  projectId: string;
  sectionId: string | null;
  taskId: string | null;
  /** Changes on every navigation, so picking the same search result again re-reveals it. */
  visit: number;
}

export function ProjectDetailPage(props: Props) {
  return <Gate>{({ index, snapshot }) => <ProjectDetail {...props} index={index} workspaces={snapshot.workspaces} />}</Gate>;
}

function ProjectDetail({ index, workspaces, projectId, sectionId, taskId, visit }: Props & { index: WorkspaceIndex; workspaces: TodoistWorkspace[] }) {
  const { openNewTask } = useUi();
  const openState = useDisclosureState();
  const [addingSection, setAddingSection] = useState(false);
  const project = index.projectById.get(projectId);
  useReveal(index, projectId, sectionId, taskId, visit);

  if (!project) {
    return (
      <EmptyState icon={<FolderX size={28} />} title="Project not found">
        It may have been deleted, archived or you may have lost access in Todoist.{' '}
        <a href={href.projects()} className="text-accent hover:underline">See all projects</a>
      </EmptyState>
    );
  }

  const sections = index.sectionsByProject.get(project.id) ?? [];
  const openCount = index.openByProject.get(project.id) ?? 0;
  const childProjects = index.orderedProjects.filter((n) => n.project.parent_id === project.id).map((n) => n.project);
  const blockKeys = projectBlockKeys(index, project.id);
  const allOpen = blockKeys.length > 0 && blockKeys.every((k) => isOpen(openState, k, false));

  // Breadcrumb: workspace › parent projects.
  const crumbs: { label: string; to: string }[] = [];
  const groupId = project.workspace_id ? String(project.workspace_id) : PERSONAL_GROUP_ID;
  const workspaceName = workspaces.find((w) => String(w.id) === groupId)?.name;
  crumbs.push({ label: workspaceName ?? index.groups.find((g) => g.id === groupId)?.name ?? 'Projects', to: href.projects() });
  const ancestors: TodoistProject[] = [];
  for (let p = project.parent_id ? index.projectById.get(project.parent_id) : undefined; p && ancestors.length < 10; p = p.parent_id ? index.projectById.get(p.parent_id) : undefined) {
    ancestors.unshift(p);
  }
  ancestors.forEach((p) => crumbs.push({ label: p.name, to: href.project(p.id) }));

  return (
    <div>
      <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3" aria-label="Breadcrumb">
        <a href={href.projects()} className="hover:text-ink hover:underline">Projects</a>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span>›</span>
            <a href={c.to} className="hover:text-ink hover:underline">{c.label}</a>
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
          {blockKeys.length > 0 && (
            <button type="button" className="btn-ghost" onClick={() => setOpen(blockKeys, !allOpen)}>
              {allOpen ? <ChevronsDownUp size={15} /> : <ChevronsUpDown size={15} />}
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => setAddingSection(true)}>
            <ListPlus size={15} /> <span className="hidden sm:inline">Add section</span>
            <span className="sm:hidden">Section</span>
          </button>
          <button type="button" className="btn-secondary" onClick={() => openNewTask({ projectId: project.id })}>
            <Plus size={15} /> Add task
          </button>
        </div>
      </div>
      {addingSection && (
        <NewSectionDialog
          projectId={project.id}
          onClose={() => setAddingSection(false)}
          onCreated={(section) => {
            setAddingSection(false);
            // Open the new section so it is ready for its first task.
            setOpen([disclosureKey.section(section.id)], true);
          }}
        />
      )}

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
        <ProjectSections index={index} projectId={project.id} />
      </div>
    </div>
  );
}

/**
 * When the URL points at a section or task (e.g. from search), open only the blocks needed
 * to show it, scroll it into view and flash it briefly. Runs once per navigation.
 */
function useReveal(index: WorkspaceIndex, projectId: string, sectionId: string | null, taskId: string | null, visit: number) {
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!sectionId && !taskId) return;
    const signature = `${visit}:${projectId}:${sectionId}:${taskId}`;
    if (done.current === signature) return;
    done.current = signature;

    setOpen(revealKeys(index, { sectionId, taskId }), true);
    // Not cleared on cleanup: the signature guard means this runs once per visit, and a re-render
    // (a sync landing, StrictMode's double effect) must not cancel the scroll.
    setTimeout(() => {
      const selector = taskId ? `[data-task-id="${CSS.escape(taskId)}"]` : `[data-section-id="${CSS.escape(sectionId!)}"]`;
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) return;
      el.scrollIntoView({ block: taskId ? 'center' : 'start', behavior: 'smooth' });
      el.classList.remove('reveal-flash');
      void el.offsetWidth; // restart the animation
      el.classList.add('reveal-flash');
    }, 60);
  },[index, projectId, sectionId, taskId, visit]);
}
