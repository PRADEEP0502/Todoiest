import { Plus } from 'lucide-react';
import { disclosureKey, useDisclosure } from '../../hooks/useDisclosure';
import { containerKey, countContainer, type WorkspaceIndex } from '../../lib/hierarchy';
import { useUi } from '../../store/ui';
import type { TodoistSection } from '../../types/todoist';
import { Chevron, Count } from '../common/ui';
import { TaskTree } from '../tasks/TaskTree';

/** Every collapsible block in a project: its sections, plus "No section" when it has sections. */
export function projectBlockKeys(index: WorkspaceIndex, projectId: string): string[] {
  const sections = index.sectionsByProject.get(projectId) ?? [];
  const keys = sections.map((s) => disclosureKey.section(s.id));
  if (sections.length && index.rootTasks.get(containerKey(projectId, null))?.length) keys.unshift(disclosureKey.noSection(projectId));
  return keys;
}

interface ProjectSectionsProps {
  index: WorkspaceIndex;
  projectId: string;
  /** Tighter spacing when shown inside a row of the Projects list. */
  compact?: boolean;
}

/**
 * Project → Sections → Tasks. Sections start collapsed, so a project's tasks are only rendered
 * once the section that holds them is opened.
 */
export function ProjectSections({ index, projectId, compact = false }: ProjectSectionsProps) {
  const sections = index.sectionsByProject.get(projectId) ?? [];
  const unsectioned = index.rootTasks.get(containerKey(projectId, null)) ?? [];
  const childrenOf = (id: string) => index.subtasks.get(id) ?? [];

  if (!sections.length && !unsectioned.length) {
    return <p className={`${compact ? 'py-2 pl-9' : 'px-4 py-10 text-center'} text-[13px] text-ink-3`}>No open tasks</p>;
  }

  // A project without sections has nothing to collapse — its tasks are the content.
  if (!sections.length) {
    return (
      <div className={compact ? 'py-1 pl-5 pr-2' : 'px-3 py-2 sm:px-4'}>
        <TaskTree tasks={unsectioned} childrenOf={childrenOf} />
      </div>
    );
  }

  return (
    <div>
      {unsectioned.length > 0 && (
        <Block
          disclosure={disclosureKey.noSection(projectId)}
          title="No section"
          muted
          count={countContainer(index, projectId, null)}
          compact={compact}
          projectId={projectId}
          sectionId={null}
        >
          <TaskTree tasks={unsectioned} childrenOf={childrenOf} />
        </Block>
      )}
      {sections.map((section) => (
        <SectionBlock key={section.id} index={index} section={section} compact={compact} />
      ))}
    </div>
  );
}

function SectionBlock({ index, section, compact }: { index: WorkspaceIndex; section: TodoistSection; compact: boolean }) {
  const roots = index.rootTasks.get(containerKey(section.project_id, section.id)) ?? [];
  return (
    <Block
      disclosure={disclosureKey.section(section.id)}
      title={section.name}
      count={countContainer(index, section.project_id, section.id)}
      compact={compact}
      projectId={section.project_id}
      sectionId={section.id}
    >
      {roots.length > 0 ? (
        <TaskTree tasks={roots} childrenOf={(id) => index.subtasks.get(id) ?? []} />
      ) : (
        <p className="pb-2 pl-7 text-[13px] text-ink-3">No open tasks</p>
      )}
    </Block>
  );
}

interface BlockProps {
  disclosure: string;
  title: string;
  count: number;
  compact: boolean;
  muted?: boolean;
  projectId: string;
  sectionId: string | null;
  children: React.ReactNode;
}

function Block({ disclosure, title, count, compact, muted, projectId, sectionId, children }: BlockProps) {
  const { openNewTask } = useUi();
  const [open, toggle] = useDisclosure(disclosure, false);
  const label = `${count} task${count === 1 ? '' : 's'}`;

  return (
    <section
      data-section-id={sectionId ?? undefined}
      className={compact ? 'scroll-mt-24' : 'scroll-mt-24 border-t border-line first:border-t-0'}
    >
      <div className={`group flex items-center gap-2 ${compact ? 'py-1 pl-5 pr-2' : 'px-3 py-2.5 sm:px-4'}`}>
        <button type="button" onClick={toggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 text-left">
          <Chevron collapsed={!open} />
          {compact ? (
            <>
              <span className={`truncate text-[13.5px] ${muted ? 'text-ink-3' : 'font-medium text-ink'}`}>{title}</span>
              <Count>{count}</Count>
            </>
          ) : (
            <span className="min-w-0">
              <span className={`block break-words text-[14.5px] font-semibold ${muted ? 'text-ink-2' : 'text-ink'}`}>{title}</span>
              <span className="block text-[12px] text-ink-3">{label}</span>
            </span>
          )}
        </button>
        <button
          type="button"
          className="icon-btn opacity-60 group-hover:opacity-100 focus:opacity-100"
          onClick={() => openNewTask({ projectId, sectionId })}
          aria-label={`Add task to ${title}`}
          title="Add task here"
        >
          <Plus size={15} />
        </button>
      </div>
      {open && <div className={compact ? 'pb-1 pl-9 pr-2' : 'px-3 pb-2 sm:px-4'}>{children}</div>}
    </section>
  );
}
