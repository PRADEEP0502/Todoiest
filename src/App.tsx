import { useEffect, useRef } from 'react';
import { Toasts } from './components/common/Toasts';
import { MobileNav, TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { TaskDialog } from './components/tasks/TaskDialog';
import { useRoute, type Route } from './hooks/useRoute';
import { ActivityPage } from './pages/ActivityPage';
import { CommentsPage } from './pages/CommentsPage';
import { CompletedPage } from './pages/CompletedPage';
import { DashboardPage } from './pages/DashboardPage';
import { HolderPage, HoldersPage } from './pages/HoldersPage';
import { LabelPage, LabelsPage } from './pages/LabelsPage';
import { MetricPage } from './pages/MetricPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OverduePage } from './pages/OverduePage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TodayPage } from './pages/TodayPage';
import { UpcomingPage } from './pages/UpcomingPage';
import { NotificationsProvider } from './store/notifications';
import { UiProvider } from './store/ui';
import { WorkspaceProvider } from './store/workspace';

function Page({ route, visit }: { route: Route; visit: number }) {
  switch (route.name) {
    case 'today':
      return <TodayPage />;
    case 'upcoming':
      return <UpcomingPage />;
    case 'projects':
      return <ProjectsPage />;
    case 'project':
      return <ProjectDetailPage projectId={route.projectId} sectionId={route.sectionId} taskId={route.taskId} visit={visit} />;
    case 'overdue':
      return <OverduePage category={route.category} />;
    case 'holders':
      return <HoldersPage />;
    case 'holder':
      return <HolderPage holderId={route.holderId} />;
    case 'labels':
      return <LabelsPage />;
    case 'label':
      return <LabelPage label={route.label} />;
    case 'metric':
      return <MetricPage metric={route.metric} />;
    case 'activity':
      return <ActivityPage />;
    case 'comments':
      return <CommentsPage />;
    case 'notifications':
      return <NotificationsPage />;
    case 'completed':
      return <CompletedPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

function routeKey(route: Route): string {
  switch (route.name) {
    case 'project':
      return `project:${route.projectId}`;
    case 'holder':
      return `holder:${route.holderId}`;
    case 'label':
      return `label:${route.label}`;
    case 'metric':
      return `metric:${route.metric}`;
    default:
      return route.name;
  }
}

function Shell() {
  const { route, visit } = useRoute();
  const main = useRef<HTMLElement>(null);
  const key = routeKey(route);

  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [key]);

  return (
    <div className="h-full bg-page md:p-3 lg:p-4">
      {/* The app sits on the grey page as one large rounded sheet (desktop). */}
      <div className="flex h-full overflow-hidden bg-canvas md:rounded-shell md:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]">
        <Sidebar route={route} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar route={route} />
          <main ref={main} className="flex-1 overflow-y-auto">
            {/* One width for every page, so headings never jump sideways between views. */}
            <div className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-5 sm:px-8 md:pl-4 md:pr-8 lg:pr-10">
              <Page route={route} visit={visit} />
            </div>
          </main>
          <MobileNav route={route} />
        </div>
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
        <NotificationsProvider>
          <Shell />
        </NotificationsProvider>
      </WorkspaceProvider>
    </UiProvider>
  );
}
