import type {
  Person,
  TodoistAttachment,
  TodoistComment,
  TodoistLabel,
  TodoistProject,
  TodoistSection,
  TodoistTask,
  TodoistUser,
  TodoistWorkspace,
} from '../../types/todoist';
import type { TodoistClient } from './client';

// Reads the workspace through the Sync API (POST /api/v1/sync). One request returns projects,
// sections, tasks, task comments, labels and collaborators. The first call is a full sync
// (`sync_token=*`); later calls send the previous token and receive only what changed.

/**
 * A comment's file, as the app uses it. Anything still uploading, deleted or without a link is
 * dropped, so the UI never has a half-file to render.
 */
function toAttachment(raw: RawFileAttachment | null | undefined): TodoistAttachment | null {
  if (!raw) return null;
  const url = raw.file_url ?? raw.image ?? null;
  if (!url || (raw.upload_state && raw.upload_state !== 'completed')) return null;
  return {
    name: raw.file_name?.trim() || 'Attachment',
    type: raw.file_type ?? null,
    url,
    image: raw.image ?? null,
    // The medium thumbnail is the one shown; it keeps a long comment thread light.
    thumbnail: raw.tn_m?.[0] ?? raw.tn_l?.[0] ?? raw.tn_s?.[0] ?? null,
    width: raw.image_width ?? null,
    height: raw.image_height ?? null,
    size: raw.file_size ?? null,
  };
}

export const SYNC_RESOURCES = ['user', 'workspaces', 'projects', 'sections', 'items', 'notes', 'labels', 'collaborators'] as const;

/** Todoist's own shape for a file on a comment; every field is optional in practice. */
interface RawFileAttachment {
  file_name?: string | null;
  file_type?: string | null;
  file_url?: string | null;
  file_size?: number | null;
  image?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  /** Thumbnails: [url, width, height], small / medium / large. */
  tn_s?: [string, number, number] | null;
  tn_m?: [string, number, number] | null;
  tn_l?: [string, number, number] | null;
  upload_state?: string | null;
}

interface RawNote {
  id: string;
  item_id: string;
  posted_uid: string | number | null;
  content: string;
  posted_at: string | null;
  file_attachment?: RawFileAttachment | null;
  is_deleted?: boolean;
}

interface RawCollaborator {
  id: string;
  email: string;
  full_name: string;
  is_deleted?: boolean;
}

export interface SyncResponse {
  sync_token: string;
  full_sync: boolean;
  user?: TodoistUser;
  workspaces?: TodoistWorkspace[];
  projects?: TodoistProject[];
  sections?: TodoistSection[];
  items?: TodoistTask[];
  notes?: RawNote[];
  labels?: TodoistLabel[];
  collaborators?: RawCollaborator[];
}

/** The merged result of every sync so far. */
export interface SyncState {
  syncToken: string;
  user: TodoistUser;
  workspaces: TodoistWorkspace[];
  projects: TodoistProject[];
  sections: TodoistSection[];
  tasks: TodoistTask[];
  comments: TodoistComment[];
  labels: TodoistLabel[];
  collaborators: Person[];
}

export function readSync(client: TodoistClient, syncToken: string, signal?: AbortSignal): Promise<SyncResponse> {
  return client.request<SyncResponse>('/sync', {
    method: 'POST',
    form: { sync_token: syncToken, resource_types: JSON.stringify(SYNC_RESOURCES) },
    signal,
  });
}

/**
 * Upserts incoming records by id and drops the ones Todoist marks as gone. On a full sync the
 * incoming list replaces everything; on an incremental sync untouched records are kept.
 */
function merge<T extends { id: string }>(current: T[], incoming: T[] | undefined, fullSync: boolean, keep: (item: T) => boolean): T[] {
  if (!incoming) return fullSync ? [] : current;
  const byId = new Map(fullSync ? [] : current.map((item) => [item.id, item] as const));
  for (const item of incoming) {
    if (keep(item)) byId.set(item.id, item);
    else byId.delete(item.id);
  }
  return [...byId.values()];
}

export function applySync(previous: SyncState | null, response: SyncResponse): SyncState {
  const full = response.full_sync || !previous;
  const base: SyncState = previous ?? {
    syncToken: '*',
    user: { id: '', email: '', full_name: '' },
    workspaces: [],
    projects: [],
    sections: [],
    tasks: [],
    comments: [],
    labels: [],
    collaborators: [],
  };

  const user = response.user ?? base.user;
  if (!user.id) throw new Error('Todoist did not return the account for this token.');

  const comments = merge(
    base.comments,
    response.notes?.map((note) => ({
      id: String(note.id),
      task_id: String(note.item_id),
      posted_uid: note.posted_uid == null ? null : String(note.posted_uid),
      content: note.content,
      posted_at: note.posted_at,
      attachment: toAttachment(note.file_attachment),
      is_deleted: note.is_deleted,
    })),
    full,
    (c) => !c.is_deleted,
  );

  return {
    syncToken: response.sync_token,
    user,
    workspaces: merge(base.workspaces, response.workspaces, full, (w) => !w.is_deleted),
    projects: merge(base.projects, response.projects, full, (p) => !p.is_deleted && !p.is_archived),
    sections: merge(base.sections, response.sections, full, (s) => !s.is_deleted && !s.is_archived),
    // Completed tasks arrive with checked=true and leave the active list.
    tasks: merge(base.tasks, response.items, full, (t) => !t.is_deleted && !t.checked),
    comments,
    labels: merge(base.labels, response.labels, full, (l) => !l.is_deleted),
    collaborators: merge(
      base.collaborators,
      response.collaborators?.map((c) => ({ id: String(c.id), name: c.full_name, email: c.email, is_deleted: c.is_deleted })),
      full,
      (c) => !(c as { is_deleted?: boolean }).is_deleted,
    ).map(({ id, name, email }) => ({ id, name, email })),
  };
}
