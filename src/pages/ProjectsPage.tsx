import { ArrowRight, ChevronsDownUp, ChevronsUpDown, FolderKanban, FolderPlus, Inbox, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Gate } from '../components/common/Gate';
import { Chevron, Count, EmptyState, PageHeader, ProjectDot } from '../components/common/ui';
import { NewProjectDialog } from '../components/projects/CreateDialogs';
import { ProjectSections } from '../components/projects/ProjectSections';
import { disclosureKey, isOpen, setOpen, useDisclosure, useDisclosureState } from '../hooks/useDisclosure';
import { useNow } from '../hooks/useNow';
import { href, navigate } from '../hooks/useRoute';
import { formatDaysAgo } from '../lib/dates';
import { PERSONAL_GROUP_ID, type ProjectNode, type WorkspaceIndex } from '../lib/hierarchy';
import { filterProjects, projectActivity, RECENT_DAYS, type ProjectFilter } from '../lib/projects';
import type { WorkspaceSnapshot } from '../types/todoist';

const FILTERS: { value: ProjectFilter; label: string; hint: string }[] = [
  { value: 'all', label: 'All', hint: '' },
  { value: 'active', label: 'Active', hint: 'Projects that have open tasks.' },
  { value: 'recent', label: 'Recently used', hint: `Projects with activity in Todoist in the last ${RECENT_DAYS} days, most recent first.` },
];

export function ProjectsPage() {
  return <Gate>{({ index, snapshot }) => <ProjectsList index={index} snapshot={snapshot} />}</Gate>;
}

function ProjectsList({ index, snapshot }: { index: WorkspaceIndex; snapshot: WorkspaceSnapshot }) {
  const now = useNow(60_000);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [creating, setCreating] = useState(false);
  const openState = useDisclosureState();

  const activity = useMemo(() => projectActivity(snapshot), [snapshot]);
  const { nodes, counts, hierarchical } = filterProjects(index, activity, { query, filter, now });

  const visibleKeys = nodes.map((n) => disclosureKey.project(n.project.id));
  const allOpen = visibleKeys.length > 0 && visibleKeys.every((k) => isOpen(openState, k, false));
  const hint = FILTERS.find((f) => f.value === filter)!.hint;

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={`${counts.all} project${counts.all === 1 ? '' : 's'} · ${snapshot.tasks.length} open tasks`}
        actions={
          <button type="button" className="btn-secondary" onClick={() => setCreating(true)}>
            <FolderPlus size={15} /> New project
          </button>
        }
      />
      {creating && (
        <NewProjectDialog
          onClose={() => setCreating(false)}
          onCreated={(project) => {
            setCreating(false);
            navigate(href.project(project.id));
          }}
        />
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-60">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="field pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setQuery('')} aria-label="Clear project search">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="inline-flex rounded-md border border-line bg-surface p-0.5" role="tablist" aria-label="Filter projects">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`inline-flex h-8 items-center gap-1.5 rounded px-3 text-[13px] font-medium transition-colors ${filter === value ? 'bg-ink text-white' : 'text-ink-2 hover:bg-hover'}`}
            >
              {label}
              <span className={`text-[11px] tabular-nums ${filter === value ? 'text-white/70' : 'text-ink-3'}`}>{counts[value]}</span>
            </button>
          ))}
        </div>

        {nodes.length > 0 && (
          <button type="button" className="btn-ghost ml-auto h-9" onClick={() => setOpen(visibleKeys, !allOpen)}>
            {allOpen ? <ChevronsDownUp size={15} /> : <ChevronsUpDown size={15} />}
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      {hint && <p className="mb-3 text-[12px] text-ink-3">{hint}</p>}

      {nodes.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<FolderKanban size={26} />} title={query ? `No projects match “${query.trim()}”` : 'No projects here'}>
            {query || filter !== 'all' ? (
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                Show all projects
              </button>
            ) : (
              'Projects you create in Todoist will appear here after the next sync.'
            )}
          </EmptyState>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="hidden items-center gap-2 border-b border-line bg-canvas px-3 py-2 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3 sm:flex">
            <span className="w-8" />
            <span className="flex-1">Project</span>
            {filter === 'recent' && <span className="hidden w-28 text-right md:block">Last activity</span>}
            <span className="w-20 text-right">Open tasks</span>
            <span className="w-20 text-right">Sections</span>
            <span className="w-9" />
          </div>

          {hierarchical
            ? index.groups.map((group) => {
                const members = new Set<string>();
                const walk = (n: ProjectNode) => {
                  members.add(n.project.id);
                  n.children.forEach(walk);
                };
                group.roots.forEach(walk);
                return (
                  <GroupBlock key={group.id} id={group.id} name={group.name} count={group.projectCount} showHeader={index.groups.length > 1}>
                    {nodes
                      .filter((n) => members.has(n.project.id))
                      .map((node) => (
                        <ProjectRow key={node.project.id} node={node} index={index} indent={node.depth} />
                      ))}
                  </GroupBlock>
                );
              })
            : nodes.map((node) => (
                <ProjectRow
                  key={node.project.id}
                  node={node}
                  index={index}
                  indent={0}
                  crumb={crumbFor(index, node)}
                  lastActivity={filter === 'recent' ? formatDaysAgo(activity.get(node.project.id) ?? 0, now) : undefined}
                />
              ))}
        </div>
      )}
    </>
  );
}

function crumbFor(index: WorkspaceIndex, node: ProjectNode): string {
  const parts: string[] = [];
  const group = index.groups.find((g) => g.id === (node.project.workspace_id ? String(node.project.workspace_id) : PERSONAL_GROUP_ID));
  if (group && index.groups.length > 1) parts.push(group.name);
  const parent = node.project.parent_id ? index.projectById.get(node.project.parent_id) : undefined;
  if (parent) parts.push(parent.name);
  return parts.join(' › ');
}

function GroupBlock({ id, name, count, showHeader, children }: { id: string; name: string; count: number; showHeader: boolean; children: React.ReactNode }) {
  const [open, toggle] = useDisclosure(`projects:group:${id}`, true);
  if (!showHeader) return <>{children}</>;
  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 border-b border-line bg-canvas/70 px-3 py-2 text-left hover:bg-canvas"
      >
        <span className="flex w-8 justify-center">
          <Chevron collapsed={!open} />
        </span>
        <span className="text-[13px] font-semibold text-ink">{name}</span>
        <Count>{count}</Count>
      </button>
      {open && children}
    </div>
  );
}

interface ProjectRowProps {
  node: ProjectNode;
  index: WorkspaceIndex;
  indent: number;
  crumb?: string;
  lastActivity?: string;
}

/** One project, collapsed by default. Opening it lists its sections; tasks load per section. */
function ProjectRow({ node, index, indent, crumb, lastActivity }: ProjectRowProps) {
  const { project } = node;
  const [open, toggle] = useDisclosure(disclosureKey.project(project.id), false);
  const openTasks = index.openByProject.get(project.id) ?? 0;
  const sectionCount = index.sectionsByProject.get(project.id)?.length ?? 0;

  return (
    <div className="border-b border-line last:border-b-0">
      <div className="group flex items-center gap-2 px-3 py-2 hover:bg-canvas/60">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} sections of ${project.name}`}
          className="icon-btn h-8 w-8 shrink-0"
          style={{ marginLeft: indent * 20 }}
        >
          <Chevron collapsed={!open} />
        </button>

        <a href={href.project(project.id)} className="flex min-w-0 flex-1 items-center gap-2.5 py-0.5">
          {project.inbox_project ? <Inbox size={14} className="shrink-0 text-ink-3" /> : <ProjectDot color={project.color} size={9} />}
          <span className="min-w-0">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-[14px] font-medium text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-2">
                {project.name}
              </span>
              {crumb && <span className="hidden shrink-0 text-[12px] text-ink-3 sm:inline">{crumb}</span>}
            </span>
            <span className="block text-[12px] text-ink-3 sm:hidden">
              {openTasks} open · {sectionCount} section{sectionCount === 1 ? '' : 's'}
              {lastActivity ? ` · ${lastActivity}` : ''}
            </span>
          </span>
        </a>

        {lastActivity !== undefined && <span className="hidden w-28 text-right text-[12.5px] text-ink-3 md:block">{lastActivity}</span>}
        <span className={`hidden w-20 text-right text-[13px] tabular-nums sm:block ${openTasks ? 'text-ink' : 'text-ink-3'}`}>{openTasks}</span>
        <span className="hidden w-20 text-right text-[13px] tabular-nums text-ink-2 sm:block">{sectionCount}</span>
        <a href={href.project(project.id)} className="icon-btn h-8 w-9 shrink-0" aria-label={`Open ${project.name}`} title="Open project">
          <ArrowRight size={15} />
        </a>
      </div>

      {open && (
        <div className="border-t border-line bg-canvas/40 py-1" style={{ paddingLeft: indent * 20 }}>
          <ProjectSections index={index} projectId={project.id} compact />
        </div>
      )}
    </div>
  );
}
