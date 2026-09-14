import { useEffect, useRef } from 'react';
import { Toasts } from './components/common/Toasts';
import { MobileNav, TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { TaskDialog } from './components/tasks/TaskDialog';
import { useRoute, type Route } from './hooks/useRoute';
import { CompletedPage } from './pages/CompletedPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TodayPage } from './pages/TodayPage';
import { UpcomingPage } from './pages/UpcomingPage';
import { UiProvider } from './store/ui';
import { WorkspaceProvider } from './store/workspace';

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'today':
      return <TodayPage />;
    case 'upcoming':
      return <UpcomingPage />;
    case 'projects':
      return <ProjectsPage />;
    case 'project':
      return <ProjectDetailPage projectId={route.projectId} sectionId={route.sectionId} />;
    case 'completed':
      return <CompletedPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

function Shell() {
  const route = useRoute();
  const main = useRef<HTMLElement>(null);
  const routeKey = route.name === 'project' ? `project:${route.projectId}` : route.name;

  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [routeKey]);

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar route={route} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar route={route} />
        <main ref={main} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[920px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
            <Page route={route} />
          </div>
        </main>
        <MobileNav route={route} />
      </div>
      <TaskDialog />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <UiProvider>
      <WorkspaceProvider>
        <Shell />
      </WorkspaceProvider>
    </UiProvider>
  );
}
