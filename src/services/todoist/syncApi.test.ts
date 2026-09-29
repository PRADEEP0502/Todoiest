import { describe, expect, it } from 'vitest';
import { applySync, type SyncState } from './syncApi';
import { peopleForProject } from '../../lib/projectPeople';
import type { WorkspaceSnapshot } from '../../types/todoist';

const user = { id: 'u1', email: 'p@x', full_name: 'Pradeep' };

/** A workspace cached by an older build, before it knew who was on which project. */
const staleCache = (): SyncState =>
  ({
    syncToken: 'tok-1',
    user,
    workspaces: [],
    projects: [{ id: 'p1', name: 'RV', color: 'blue', parent_id: null, child_order: 1 }],
    sections: [],
    tasks: [],
    comments: [],
    labels: [],
    collaborators: [{ id: 'u2', name: 'Vanitha', email: 'v@x' }],
    // peopleByProject is missing, exactly as an older cache has it.
  }) as unknown as SyncState;

describe('a workspace cached by an older build', () => {
  it('syncs without failing, and simply starts with nobody on a project', () => {
    const next = applySync(staleCache(), { sync_token: 'tok-2', full_sync: false });
    expect(next.peopleByProject).toEqual({});
    expect(next.projects).toHaveLength(1);
  });

  it('fills in who is on a project from the next sync', () => {
    const next = applySync(staleCache(), {
      sync_token: 'tok-2',
      full_sync: false,
      collaborator_states: [
        { project_id: 'p1', user_id: 'u2', state: 'active' },
        { project_id: 'p1', user_id: 'u3', state: 'invited' },
        { project_id: 'p2', user_id: 'u2', state: 'active', is_deleted: true },
      ],
    });
    // Only the person actually on the project, not one still invited or one removed.
    expect(next.peopleByProject).toEqual({ p1: ['u2'] });
  });

  it('drops someone once Todoist says they have left', () => {
    const first = applySync(staleCache(), { sync_token: 't2', full_sync: false, collaborator_states: [{ project_id: 'p1', user_id: 'u2', state: 'active' }] });
    const second = applySync(first, { sync_token: 't3', full_sync: false, collaborator_states: [{ project_id: 'p1', user_id: 'u2', is_deleted: true }] });
    expect(second.peopleByProject).toEqual({});
  });

  it('the holder list copes with a snapshot that has no project people yet', () => {
    const snapshot = {
      user,
      workspaces: [],
      projects: [],
      sections: [],
      tasks: [],
      completed: [],
      labels: [],
      comments: [],
      activity: [],
      activityStatus: { ok: true },
      completedStatus: { ok: true },
      people: { u2: { id: 'u2', name: 'Vanitha', email: 'v@x' } },
      syncedAt: '',
    } as unknown as WorkspaceSnapshot;
    expect(peopleForProject(snapshot, 'p1')).toEqual([]);
    expect(peopleForProject(snapshot, 'p1', { include: 'u2' }).map((p) => p.name)).toEqual(['Vanitha']);
  });
});
