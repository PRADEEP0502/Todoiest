import type { ActivityEvent, Availability, Person, TodoistTask, WorkspaceSnapshot } from '../../types/todoist';
import { createComment, getActivity, getUser, getWorkspaceUsers } from './activity';
import { cacheGet, cacheSet, tokenFingerprint } from './cache';
import { TodoistApiError, TodoistClient } from './client';
import { ACTIVITY_WINDOW_DAYS, completedWindowStart, toMoveInput, withCommentCounts, type DataSource } from './dataSource';
import { applySync, readSync, type SyncState } from './syncApi';
import { closeTask, createTask, deleteTask, getCompletedTasks, moveTask, reopenTask, updateTask } from './tasks';

const DAY = 24 * 60 * 60 * 1000;

interface CachedWorkspace {
  version: 1;
  state: SyncState;
  completed: TodoistTask[];
  completedStatus: Availability;
  activity: ActivityEvent[];
  activityStatus: Availability;
  workspacePeople: Person[];
  syncedAt: string;
}

const unavailable = (err: unknown, what: string): Availability => {
  if (err instanceof TodoistApiError && (err.status === 403 || err.status === 402)) {
    return { ok: false, reason: `Todoist did not allow access to the ${what} for this account (it depends on the Todoist plan).` };
  }
  return { ok: false, reason: err instanceof Error ? err.message : `Could not load the ${what}.` };
};

/** Reads and writes the real Todoist account behind `token`. Todoist stays the source of truth. */
export function createLiveSource(token: string): DataSource {
  const client = new TodoistClient(token);
  const cacheKey = tokenFingerprint(token).then((hash) => `workspace:${hash}`);

  let state: SyncState | null = null;
  let completed: TodoistTask[] = [];
  let completedStatus: Availability = { ok: true };
  let activity: ActivityEvent[] = [];
  let activityStatus: Availability = { ok: true };
  let workspacePeople: Person[] = [];
  let workspacePeopleLoaded = false;
  let syncedAt = '';

  const snapshot = (): WorkspaceSnapshot => {
    const s = state!;
    const people: Record<string, Person> = {};
    for (const p of [...workspacePeople, ...s.collaborators]) people[p.id] = p;
    people[s.user.id] = { id: s.user.id, name: s.user.full_name, email: s.user.email };
    const projectIds = new Set(s.projects.map((p) => p.id));
    return {
      user: s.user,
      workspaces: s.workspaces,
      projects: s.projects,
      sections: s.sections,
      tasks: withCommentCounts(s.tasks, s.comments),
      // Completed tasks from archived or deleted projects have nowhere to show.
      completed: completed.filter((t) => projectIds.has(t.project_id)),
      labels: s.labels,
      comments: s.comments,
      activity,
      activityStatus,
      completedStatus,
      people,
      syncedAt,
    };
  };

  return {
    mode: 'live',

    async loadCached() {
      const cached = await cacheGet<CachedWorkspace>(await cacheKey);
      if (!cached || cached.version !== 1 || state) return null;
      ({ state, completed, completedStatus, activity, activityStatus, workspacePeople, syncedAt } = cached);
      return snapshot();
    },

    async sync(onStep, signal) {
      // 1. Projects, sections, tasks, comments, labels, collaborators — one request, incremental after the first.
      onStep('workspace');
      let response;
      try {
        response = await readSync(client, state?.syncToken ?? '*', signal);
      } catch (err) {
        // A stale or rejected sync token: fall back to a full sync once.
        if (!(err instanceof TodoistApiError && err.status === 400 && state)) throw err;
        state = null;
        response = await readSync(client, '*', signal);
      }
      state = applySync(state, response);

      // Names for holders who share no project with us but are in the same team workspace.
      const knownIds = new Set([state.user.id, ...state.collaborators.map((c) => c.id)]);
      const unknownHolder = state.tasks.some((t) => t.responsible_uid && !knownIds.has(t.responsible_uid));
      if (unknownHolder && state.workspaces.length && !workspacePeopleLoaded) {
        const lists = await Promise.all(state.workspaces.map((w) => getWorkspaceUsers(client, w.id, signal).catch(() => [] as Person[])));
        workspacePeople = lists.flat();
        workspacePeopleLoaded = true;
      }

      // 2. Completed tasks for this month (or week).
      onStep('completed');
      const now = new Date();
      try {
        completed = await getCompletedTasks(client, completedWindowStart(now), new Date(now.getTime() + DAY), signal);
        completedStatus = { ok: true };
      } catch (err) {
        if (signal?.aborted) throw err;
        completedStatus = unavailable(err, 'completed tasks');
      }

      // 3. Activity log: only what is new since the newest event we already have.
      onStep('activity');
      const windowStart = new Date(now.getTime() - ACTIVITY_WINDOW_DAYS * DAY);
      const newest = activity[0] ? new Date(activity[0].event_date) : null;
      const since = newest && newest > windowStart ? newest : windowStart;
      try {
        const fresh = await getActivity(client, since, signal);
        const byId = new Map(activity.map((e) => [e.id, e]));
        for (const e of fresh) byId.set(e.id, e);
        activity = [...byId.values()]
          .filter((e) => new Date(e.event_date) >= windowStart)
          .sort((a, b) => b.event_date.localeCompare(a.event_date));
        activityStatus = { ok: true };
      } catch (err) {
        if (signal?.aborted) throw err;
        activityStatus = unavailable(err, 'activity log');
      }

      syncedAt = new Date().toISOString();
      const cached: CachedWorkspace = { version: 1, state, completed, completedStatus, activity, activityStatus, workspacePeople, syncedAt };
      void cacheKey.then((key) => cacheSet(key, cached));
      return snapshot();
    },

    createTask: (input) => createTask(client, input),
    updateTask: (id, input) => updateTask(client, id, input),
    moveTask: (id, { project_id, section_id }) => moveTask(client, id, toMoveInput(project_id, section_id)),
    completeTask: (id) => closeTask(client, id),
    reopenTask: (id) => reopenTask(client, id),
    deleteTask: (id) => deleteTask(client, id),
    addComment: (taskId, content) => createComment(client, taskId, content),
  };
}

/** Verifies a token by loading the account it belongs to. */
export async function verifyToken(token: string): Promise<{ name: string; email: string }> {
  const user = await getUser(new TodoistClient(token));
  return { name: user.full_name, email: user.email };
}
