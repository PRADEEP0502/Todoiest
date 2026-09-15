import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { PERSONAL_GROUP_ID } from '../../lib/hierarchy';
import { PROJECT_COLORS } from '../../lib/priority';
import { useWorkspace } from '../../store/workspace';
import type { TodoistProject, TodoistSection } from '../../types/todoist';
import { Modal } from '../common/Modal';

const COLOR_LABEL = (name: string) => name.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Creates a project in Todoist (personal or in a team workspace, optionally as a sub-project). */
export function NewProjectDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (project: TodoistProject) => void }) {
  const { snapshot, index, createProject } = useWorkspace();
  const [name, setName] = useState('');
  const [location, setLocation] = useState<string>(PERSONAL_GROUP_ID);
  const [parentId, setParentId] = useState('');
  const [color, setColor] = useState('charcoal');
  const [busy, setBusy] = useState(false);

  if (!snapshot || !index) return null;
  // Sub-projects must live where their parent lives, so the parent list follows the location.
  const parents = index.orderedProjects.filter(
    (node) => !node.project.inbox_project && (node.project.workspace_id ? String(node.project.workspace_id) : PERSONAL_GROUP_ID) === location,
  );
  const valid = name.trim().length > 0;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    const project = await createProject({
      name,
      color,
      workspaceId: location === PERSONAL_GROUP_ID ? null : location,
      parentId: parentId || null,
    });
    setBusy(false);
    if (project) onCreated(project);
  };

  return (
    <Modal
      title={<span className="font-medium text-ink">New project in Todoist</span>}
      onClose={onClose}
      footer={
        <>
          <span className="flex-1" />
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => submit()} disabled={!valid || busy}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            {busy ? 'Saving…' : 'Create project'}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="project-name">Project name</label>
          <input id="project-name" data-autofocus className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Plant Expansion 2027" maxLength={120} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="project-location">Where</label>
            <select
              id="project-location"
              className="field"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setParentId('');
              }}
            >
              <option value={PERSONAL_GROUP_ID}>Personal</option>
              {snapshot.workspaces.map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name} (team)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="project-parent">Inside project (optional)</label>
            <select id="project-parent" className="field" value={parentId} onChange={(e) => setParentId(e.target.value)} disabled={!parents.length}>
              <option value="">{parents.length ? 'None — top level' : 'No projects here yet'}</option>
              {parents.map((node) => (
                <option key={node.project.id} value={node.project.id}>
                  {'   '.repeat(node.depth)}
                  {node.project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <span className="label">Colour</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
            {Object.entries(PROJECT_COLORS).map(([key, hex]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={color === key}
                aria-label={COLOR_LABEL(key)}
                title={COLOR_LABEL(key)}
                onClick={() => setColor(key)}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${color === key ? 'scale-110 border-ink' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
        {location !== PERSONAL_GROUP_ID && (
          <p className="text-[12px] text-ink-3">Team projects are visible to members of that workspace in Todoist.</p>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** Adds a section (heading) to a project in Todoist. */
export function NewSectionDialog({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: (section: TodoistSection) => void }) {
  const { index, createSection } = useWorkspace();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const project = index?.projectById.get(projectId);
  if (!project) return null;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const section = await createSection(projectId, name);
    setBusy(false);
    if (section) onCreated(section);
  };

  return (
    <Modal
      title={
        <span>
          New section in <span className="font-medium text-ink">{project.name}</span>
        </span>
      }
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <span className="flex-1" />
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => submit()} disabled={!name.trim() || busy}>
            {busy && <Loader2 size={14} className="animate-spin" />}
            {busy ? 'Saving…' : 'Create section'}
          </button>
        </>
      }
    >
      <form onSubmit={submit}>
        <label className="label" htmlFor="section-name">Section name</label>
        <input id="section-name" data-autofocus className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. WEBSITE" maxLength={120} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
