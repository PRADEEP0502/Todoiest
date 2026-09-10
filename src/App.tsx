import React from 'react';
import { TaskProvider, useTaskStore } from './store/TaskContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { TaskDetailDrawer } from './components/tasks/TaskDetailDrawer';
import { TaskCreateModal } from './components/tasks/TaskCreateModal';
import { ToastContainer } from './components/common/Toast';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { TodayPage } from './pages/TodayPage';
import { UpcomingPage } from './pages/UpcomingPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { CompletedPage } from './pages/CompletedPage';
import { SettingsPage } from './pages/SettingsPage';

const MainLayout: React.FC = () => {
  const { currentTab } = useTaskStore();

  const renderTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'today':
        return <TodayPage />;
      case 'upcoming':
        return <UpcomingPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'completed':
        return <CompletedPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Scrollable Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderTab()}
        </main>
      </div>

      {/* Overlays */}
      <TaskDetailDrawer />
      <TaskCreateModal />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <TaskProvider>
      <MainLayout />
    </TaskProvider>
  );
}

export default App;
