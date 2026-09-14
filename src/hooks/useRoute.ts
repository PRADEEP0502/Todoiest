import { useEffect, useState } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'today' }
  | { name: 'upcoming' }
  | { name: 'projects' }
  | { name: 'project'; projectId: string; sectionId: string | null }
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
      return { name: parts[0] };
    case 'projects':
      return parts[1] ? { name: 'project', projectId: parts[1], sectionId: query.get('section') } : { name: 'projects' };
    default:
      return { name: 'dashboard' };
  }
}

export const href = {
  dashboard: () => '#/',
  today: () => '#/today',
  upcoming: () => '#/upcoming',
  projects: () => '#/projects',
  project: (projectId: string, sectionId?: string | null) =>
    `#/projects/${encodeURIComponent(projectId)}${sectionId ? `?section=${encodeURIComponent(sectionId)}` : ''}`,
  completed: () => '#/completed',
  settings: () => '#/settings',
};

export function navigate(to: string): void {
  if (window.location.hash === to) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = to;
}

/** Tiny hash router: deep links and the browser back button work without a server. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
