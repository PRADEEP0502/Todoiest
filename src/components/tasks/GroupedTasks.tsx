import { ArrowUpRight } from 'lucide-react';
import { useDisclosure } from '../../hooks/useDisclosure';
import { href } from '../../hooks/useRoute';
import { groupByProjectAndSection, type ProjectTaskGroup, type SectionGroup } from '../../lib/hierarchy';
import { useWorkspace } from '../../store/workspace';
import type { TodoistTask } from '../../types/todoist';
import { Chevron, Count, ProjectDot } from '../common/ui';
import { TaskTree } from './TaskTree';

interface GroupedTasksProps {
  tasks: TodoistTask[];
  /** Namespaces collapse state so each view remembers its own. */
  viewKey: string;
  compare?: (a: TodoistTask, b: TodoistTask) => number;
  hideDue?: boolean;
  /** Whether project and section groups start open. Large lists start collapsed. */
  defaultOpen?: boolean;
}

/** Any list of tasks, organised as Project → Section → Task (→ Subtask). */
export function GroupedTasks({ tasks, viewKey, compare, hideDue, defaultOpen = true }: GroupedTasksProps) {
  const { index } = useWorkspace();
  if (!index) return null;
  const { groups, childrenOf } = groupByProjectAndSection(index, tasks, compare);
  return (
    <div className="space-y-1">
      {groups.map((group) => (
        <ProjectBlock key={group.project.id} group={group} viewKey={viewKey} childrenOf={childrenOf} hideDue={hideDue} defaultOpen={defaultOpen} />
      ))}
    </div>
  );
}

function ProjectBlock({
  group,
  viewKey,
  childrenOf,
  hideDue,
  defaultOpen,
}: {
  group: ProjectTaskGroup;
  viewKey: string;
  childrenOf: (id: string) => TodoistTask[];
  hideDue?: boolean;
  defaultOpen: boolean;
}) {
  const [open, toggle] = useDisclosure(`${viewKey}:project:${group.project.id}`, defaultOpen);
  const collapsed = !open;
  return (
    <section>
      <div className="group flex items-center gap-1">
        <button type="button" onClick={toggle} aria-expanded={!collapsed} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-canvas">
          <Chevron collapsed={collapsed} />
          <ProjectDot color={group.project.color} />
          <span className="truncate text-[14px] font-semibold text-ink">{group.project.name}</span>
          <Count>{group.count}</Count>
        </button>
        <a href={href.project(group.project.id)} className="icon-btn opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Open ${group.project.name}`}>
          <ArrowUpRight size={15} />
        </a>
      </div>
      {!collapsed && (
        <div className="ml-[22px] border-l border-line pb-2 pl-2">
          {group.sections.map((sg) => (
            <SectionBlock
              key={sg.section?.id ?? 'none'}
              group={sg}
              projectId={group.project.id}
              viewKey={viewKey}
              childrenOf={childrenOf}
              hideDue={hideDue}
              defaultOpen={defaultOpen}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SectionBlock({
  group,
  projectId,
  viewKey,
  childrenOf,
  hideDue,
  defaultOpen,
}: {
  group: SectionGroup;
  projectId: string;
  viewKey: string;
  childrenOf: (id: string) => TodoistTask[];
  hideDue?: boolean;
  defaultOpen: boolean;
}) {
  const [open, toggle] = useDisclosure(`${viewKey}:section:${projectId}:${group.section?.id ?? 'none'}`, defaultOpen);
  const collapsed = !open;
  if (!group.section) return <TaskTree tasks={group.roots} childrenOf={childrenOf} hideDue={hideDue} subtasksOpen />;
  return (
    <div className="mt-1">
      <button type="button" onClick={toggle} aria-expanded={!collapsed} className="flex items-center gap-1.5 rounded px-1 py-1 text-left hover:bg-canvas">
        <Chevron collapsed={collapsed} className="!h-3.5 !w-3.5" />
        <span className="text-[12.5px] font-semibold text-ink-2">{group.section.name}</span>
      </button>
      {!collapsed && <TaskTree tasks={group.roots} childrenOf={childrenOf} hideDue={hideDue} subtasksOpen />}
    </div>
  );
}
