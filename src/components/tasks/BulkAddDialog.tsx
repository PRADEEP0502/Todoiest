import { ClipboardList, Loader2, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { describeCount, droppedLines, MAX_BULK_TASKS, parseBulkLines } from '../../lib/bulkTasks';
import { PERSONAL_GROUP_ID } from '../../lib/hierarchy';
import { useWorkspace } from '../../store/workspace';
import { Modal } from '../common/Modal';
import { SearchSelect } from '../common/SearchSelect';
import { Avatar, ProjectDot } from '../common/ui';

interface BulkAddDialogProps {
  /** Where the tasks land; the person can still change it here. */
  projectId: string;
  sectionId?: string | null;
  /** Holder every line starts with, e.g. the person whose page this was opened from. */
  assigneeId?: string | null;
  onClose: () => void;
}

type Result = { created: number; failed: number } | null;

/**
 * Creates many tasks from one paste: a line becomes a task, in the chosen project, each with its
 * own holder. Nothing is created while typing or pasting — only when "Create tasks" is pressed.
 * Every task is created the ordinary way, so each gets its own locked CD exactly as a single one
 * would, and an IDD is entered later on the task itself.
 */
export function BulkAddDialog({ projectId, sectionId = null, assigneeId = null, onClose }: BulkAddDialogProps) {
  const { index, snapshot, createTask } = useWorkspace();
  const [text, setText] = useState('');
  const [project, setProject] = useState(projectId);
  const [section, setSection] = useState<string | null>(sectionId);
  const [everyone, setEveryone] = useState<string | null>(assigneeId);
  const [holders, setHolders] = useState<Record<number, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [result, setResult] = useState<Result>(null);

  const lines = useMemo(() => parseBulkLines(text), [text]);
  const extra = useMemo(() => droppedLines(text), [text]);
  if (!index) return null;

  const sections = index.sectionsByProject.get(project) ?? [];
  const people = Object.values(snapshot?.people ?? {}).sort((a, b) => a.name.localeCompare(b.name));
  const holderOf = (id: number) => (id in holders ? holders[id] : everyone);

  const create = async () => {
    if (!lines.length || busy) return;
    setBusy(true);
    setDone(0);
    let created = 0;
    let failed = 0;
    // One at a time and in order, so Todoist sees them the way they were written.
    for (const line of lines) {
      const ok = await createTask({
        content: line.name,
        description: '',
        projectId: project,
        sectionId: section,
        dueDate: null,
        idd: null,
        assigneeId: holderOf(line.id),
        priority: 4,
      });
      if (ok) created += 1;
      else failed += 1;
      setDone(created + failed);
    }
    setBusy(false);
    setResult({ created, failed });
    if (!failed) setText('');
  };

  const footer = (
    <>
      <span className="mr-auto text-[13px] text-ink-2">
        {result ? (
          <span className={result.failed ? 'text-p1' : 'text-accent'}>
            {describeCount(result.created, 'created successfully')}
            {result.failed > 0 && ` · ${result.failed} could not be created`}
          </span>
        ) : busy ? (
          `Creating ${done} of ${lines.length}…`
        ) : (
          describeCount(lines.length)
        )}
      </span>
      <button className="btn-ghost" onClick={onClose} disabled={busy}>
        {result && !result.failed ? 'Done' : 'Cancel'}
      </button>
      <button className="btn-primary" onClick={create} disabled={!lines.length || busy}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
        {busy ? 'Creating…' : 'Create tasks'}
      </button>
    </>
  );

  return (
    <Modal onClose={busy ? () => {} : onClose} title={<span className="font-medium text-ink">Add many tasks</span>} footer={footer} width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="bulk-project">Project</label>
            <SearchSelect
              id="bulk-project"
              searchPlaceholder="Search projects…"
              value={project}
              onChange={(id) => {
                setProject(id);
                setSection(null);
              }}
              options={index.groups.flatMap((group) =>
                index.orderedProjects
                  .filter((node) => (node.project.workspace_id ? String(node.project.workspace_id) : PERSONAL_GROUP_ID) === group.id)
                  .map((node) => ({
                    value: node.project.id,
                    label: node.project.name,
                    group: group.name,
                    depth: node.depth,
                    icon: <ProjectDot color={node.project.color} />,
                  })),
              )}
            />
          </div>
          <div>
            <label className="label" htmlFor="bulk-section">Section</label>
            <SearchSelect
              id="bulk-section"
              searchPlaceholder="Search sections…"
              value={section ?? ''}
              onChange={(id) => setSection(id || null)}
              disabled={sections.length === 0}
              options={[
                { value: '', label: sections.length ? 'No section' : 'No sections in this project' },
                ...sections.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="bulk-text">One task per line</label>
          <textarea
            id="bulk-text"
            data-autofocus
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
            }}
            rows={8}
            spellCheck={false}
            placeholder={'Get quotation\nCompare rates\nGet MD approval'}
            className="field h-auto resize-y py-2 font-[inherit] leading-6"
          />
          <p className="mt-1 text-[12px] text-ink-3">
            Paste as many lines as you like; nothing is created until you press “Create tasks”. Bullets and numbering are dropped.
            {extra > 0 && <span className="text-p1"> Only the first {MAX_BULK_TASKS} lines are used — {extra} more were left out.</span>}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="bulk-holder">Holder for every line</label>
          <SearchSelect
            id="bulk-holder"
            className="w-full sm:max-w-xs"
            searchPlaceholder="Search people…"
            placeholder="No one"
            value={everyone ?? ''}
            onChange={(id) => {
              setEveryone(id || null);
              // A holder chosen here is the new default for every line.
              setHolders({});
            }}
            options={[{ value: '', label: 'No one' }, ...people.map((p) => ({ value: p.id, label: p.name, icon: <Avatar id={p.id} name={p.name} size={18} /> }))]}
          />
        </div>

        {lines.length > 0 && (
          <section aria-label="Tasks ready to create">
            <h3 className="mb-2 text-[13px] font-semibold text-ink">
              {describeCount(lines.length)} <span className="font-normal text-ink-3">· each one can go to a different person</span>
            </h3>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {lines.map((line) => (
                <li key={line.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 break-words text-[13px] text-ink">{line.name}</span>
                  <span className="flex items-center gap-1.5 text-ink-3">
                    <User size={13} aria-hidden />
                    <SearchSelect
                      className="w-auto min-w-44"
                      aria-label={`Holder for ${line.name}`}
                      searchPlaceholder="Search people…"
                      placeholder="No one"
                      value={holderOf(line.id) ?? ''}
                      onChange={(id) => setHolders((h) => ({ ...h, [line.id]: id || null }))}
                      options={[{ value: '', label: 'No one' }, ...people.map((p) => ({ value: p.id, label: p.name, icon: <Avatar id={p.id} name={p.name} size={18} /> }))]}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
