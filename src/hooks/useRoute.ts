import { useEffect, useState } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'today' }
  | { name: 'upcoming' }
  | { name: 'projects' }
  | { name: 'project'; projectId: string; sectionId: string | null; taskId: string | null }
  | { name: 'overdue'; category: string | null }
  | { name: 'holders' }
  | { name: 'holder'; holderId: string }
  | { name: 'labels' }
  | { name: 'label'; label: string }
  | { name: 'metric'; metric: string }
  | { name: 'activity' }
  | { name: 'comments' }
  | { name: 'notifications' }
  | { name: 'completed' }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const [path, queryString = ''] = hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(queryString);
  switch (parts[0]) {
    case 'today':
    case 'upcoming':
    case 'completed':
    case 'settings':
    case 'activity':
    case 'comments':
    case 'notifications':
      return { name: parts[0] };
    case 'projects':
      return parts[1]
        ? { name: 'project', projectId: parts[1], sectionId: query.get('section'), taskId: query.get('task') }
        : { name: 'projects' };
    case 'overdue':
      return { name: 'overdue', category: query.get('category') };
    case 'holders':
      return parts[1] ? { name: 'holder', holderId: parts[1] } : { name: 'holders' };
    case 'labels':
      return parts[1] ? { name: 'label', label: parts[1] } : { name: 'labels' };
    case 'tasks':
      return parts[1] ? { name: 'metric', metric: parts[1] } : { name: 'dashboard' };
    default:
      return { name: 'dashboard' };
  }
}

const enc = encodeURIComponent;

export const href = {
  dashboard: () => '#/',
  today: () => '#/today',
  upcoming: () => '#/upcoming',
  projects: () => '#/projects',
  /** Optionally points at a section or task inside the project, which the page reveals. */
  project: (projectId: string, focus: { sectionId?: string | null; taskId?: string | null } = {}) => {
    const query = new URLSearchParams();
    if (focus.sectionId) query.set('section', focus.sectionId);
    if (focus.taskId) query.set('task', focus.taskId);
    const qs = query.toString();
    return `#/projects/${enc(projectId)}${qs ? `?${qs}` : ''}`;
  },
  overdue: (category?: string | null) => `#/overdue${category ? `?category=${enc(category)}` : ''}`,
  holders: () => '#/holders',
  holder: (id: string) => `#/holders/${enc(id)}`,
  labels: () => '#/labels',
  label: (name: string) => `#/labels/${enc(name)}`,
  metric: (metric: string) => `#/tasks/${enc(metric)}`,
  activity: () => '#/activity',
  comments: () => '#/comments',
  notifications: () => '#/notifications',
  completed: () => '#/completed',
  settings: () => '#/settings',
};

/** Link to a task inside its project, with the hierarchy above it opened. */
export const taskHref = (task: { id: string; project_id: string }) => href.project(task.project_id, { taskId: task.id });

export function navigate(to: string): void {
  if (window.location.hash === to) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = to;
}

/**
 * Tiny hash router: deep links and the browser back button work without a server.
 * `visit` increases on every navigation, even to the same URL, so pages can re-run
 * "reveal this item" when the same search result is picked twice.
 */
export function useRoute(): { route: Route; visit: number } {
  const [current, setCurrent] = useState(() => ({ route: parseHash(window.location.hash), visit: 0 }));
  useEffect(() => {
    const onChange = () => setCurrent((c) => ({ route: parseHash(window.location.hash), visit: c.visit + 1 }));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return current;
}
