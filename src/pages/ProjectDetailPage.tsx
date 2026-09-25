import { ChevronsDownUp, ChevronsUpDown, FolderX, ListPlus, MessageSquare, Plus, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Gate } from '../components/common/Gate';
import { SearchField } from '../components/common/SearchField';
import { GroupedTasks } from '../components/tasks/GroupedTasks';
import { CompletedList } from '../components/tasks/CompletedList';
import { ScopeKpis, scopeLists, VIEW_TITLE } from '../components/tasks/ScopeKpis';
import { Count, EmptyState, ProjectDot, ShowMore } from '../components/common/ui';
import { NewSectionDialog } from '../components/projects/CreateDialogs';
import { ProjectSections, projectBlockKeys } from '../components/projects/ProjectSections';
import { disclosureKey, isOpen, setOpen, useDisclosureState } from '../hooks/useDisclosure';
import { href, type HolderView } from '../hooks/useRoute';
import { PERSONAL_GROUP_ID, type WorkspaceIndex } from '../lib/hierarchy';
import { useNow } from '../hooks/useNow';
import { usePaged } from '../hooks/usePaged';
import { formatShortDate, formatTime, startOfMonth } from '../lib/dates';
import { byPriorityThenTime, completedSince } from '../lib/stats';
import { plainText } from '../lib/text';
import { useWorkspace } from '../store/workspace';
import { revealKeys } from '../lib/projects';
import { filterTasks } from '../lib/search';
import { useUi } from '../store/ui';
import type { TodoistComment, TodoistProject, WorkspaceSnapshot } from '../types/todoist';

interface Props {
  projectId: string;
  sectionId: string | null;
  taskId: string | null;
  /** Set when a KPI card was clicked: the page lists that slice of the project. */
  show: HolderView | null;
  /** Changes on every navigation, so picking the same search result again re-reveals it. */
  visit: number;
}

export function ProjectDetailPage(props: Props) {
  return <Gate>{({ index, snapshot }) => <ProjectDetail {...props} index={index} snapshot={snapshot} />}</Gate>;
}

function ProjectDetail({ index, snapshot, projectId, sectionId, taskId, show, visit }: Props & { index: WorkspaceIndex; snapshot: WorkspaceSnapshot }) {
  const { openNewTask } = useUi();
  const { settings } = useWorkspace();
  const now = useNow(60_000);
  const rules = settings.rules;
  const workspaces = snapshot.workspaces;
  const people = snapshot.people;
  const openState = useDisclosureState();
  const [addingSection, setAddingSection] = useState(false);
  // The search belongs to one project: opening another starts with a clear box.
  const [search, setSearch] = useState({ id: projectId, text: '' });
  const query = search.id === projectId ? search.text : '';
  const setQuery = (text: string) => setSearch({ id: projectId, text });
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

  // Everything below counts this project's own tasks and nothing else.
  const projectTasks = [...index.taskById.values()].filter((t) => t.project_id === project.id);
  const lists = scopeLists(projectTasks, index, rules, now);
  const completed = completedSince(snapshot.completed, startOfMonth(now)).filter((t) => t.project_id === project.id);
  const comments = snapshot.comments.filter((c) => index.taskById.get(c.task_id)?.project_id === project.id);
  const card = (view: HolderView) => ({ href: href.project(project.id, { show: view }), selected: show === view });
  const shownTasks = show && show !== 'completed' && show !== 'comments' ? lists[show] : [];
  // Searching lists this project's matching tasks (subtasks included), already opened.
  const searching = query.trim().length > 0;
  const matches = searching ? filterTasks(show ? shownTasks : projectTasks, query, index, people) : [];
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
        <a href={href.dashboard()} className="hover:text-ink hover:underline">Overall</a>
        <span>›</span>
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

      <div className="mb-4 space-y-4">
        <ScopeKpis name={project.name} lists={lists} completed={completed.length} comments={comments.length} rules={rules} card={card} scopeNote={` in ${project.name}`} />
      </div>

      {/* Stays in view while scrolling a long project, so the search is always at hand. */}
      <div className="sticky top-0 z-10 -mx-2 mb-2.5 flex flex-wrap items-center gap-2 bg-canvas/95 px-2 py-2 backdrop-blur">
        <SearchField className="min-w-0 flex-1 sm:max-w-sm" value={query} onChange={setQuery} label={`Search tasks in ${project.name}`} placeholder={`Search tasks in ${project.name}…`} />
        {show && !searching && (
          <span className="flex items-center gap-2 text-[12.5px]">
            <span className="font-semibold text-ink">{VIEW_TITLE[show]}</span>
            <a href={href.project(project.id)} className="filter-chip" title="Show the whole project again">
              Clear filter <X size={12} />
            </a>
          </span>
        )}
        {searching && (
          <span className="text-[12.5px] text-ink-3">
            {matches.length} of {projectTasks.length} task{projectTasks.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {searching ? (
        <div className="panel px-3 py-2">
          {matches.length === 0 ? (
            <EmptyState icon={<Search size={24} />} title={`Nothing in ${project.name} matches “${query.trim()}”`}>
              <button type="button" className="text-accent hover:underline" onClick={() => setQuery('')}>Clear the search</button>
            </EmptyState>
          ) : (
            <GroupedTasks tasks={matches} viewKey={`project-search:${project.id}`} defaultOpen />
          )}
        </div>
      ) : show ? (
        <div className="panel px-3 py-2">
          {show === 'completed' ? (
            completed.length === 0 ? (
              <EmptyState title={`${VIEW_TITLE[show]}: none in ${project.name}`} />
            ) : (
              <CompletedList tasks={completed} index={index} listKey={`project:${project.id}`} />
            )
          ) : show === 'comments' ? (
            comments.length === 0 ? (
              <EmptyState title={`${VIEW_TITLE[show]}: none in ${project.name}`} />
            ) : (
              <ProjectComments comments={comments} index={index} now={now} />
            )
          ) : shownTasks.length === 0 ? (
            <EmptyState title={`${VIEW_TITLE[show]}: none in ${project.name}`} />
          ) : (
            <GroupedTasks tasks={shownTasks} viewKey={`project-view:${project.id}:${show}`} compare={byPriorityThenTime} defaultOpen />
          )}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <ProjectSections index={index} projectId={project.id} />
        </div>
      )}
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

/** Comments written on this project's tasks, newest first. */
function ProjectComments({ comments, index, now }: { comments: TodoistComment[]; index: WorkspaceIndex; now: Date }) {
  const { openTask } = useUi();
  const sorted = [...comments].sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''));
  const { visible, shown, total, more } = usePaged(sorted, 'project-comments');
  return (
    <>
      <ul className="divide-y divide-black/[0.05]">
        {visible.map((c) => {
          const task = index.taskById.get(c.task_id)!;
          const at = c.posted_at ? new Date(c.posted_at) : null;
          return (
            <li key={c.id} className="flex items-start gap-3 px-2 py-2.5">
              <MessageSquare size={16} className="mt-0.5 shrink-0 text-p3" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block whitespace-pre-wrap break-words text-[13.5px] text-ink">{plainText(c.content)}</span>
                <button type="button" onClick={() => openTask(task.id)} className="mt-0.5 block max-w-full truncate text-left text-[12px] text-ink-3 hover:text-ink hover:underline">
                  on {plainText(task.content)}
                </button>
              </span>
              {at && (
                <span className="shrink-0 text-right text-[12px] tabular-nums text-ink-3">
                  {formatShortDate(at, now)}
                  <span className="block">{formatTime(at)}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <ShowMore shown={shown} total={total} onMore={more} />
    </>
  );
}
