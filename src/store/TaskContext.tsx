import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  TodoistTask,
  TodoistProject,
  CreateTaskPayload,
  UpdateTaskPayload,
} from '../types/todoist';
import type {
  NavigationTab,
  SyncState,
  DashboardMetrics,
  EnrichedTask,
} from '../types/dashboard';
import {
  DEMO_PROJECTS,
  getInitialDemoTasks,
  getInitialDemoCompletedTasks,
  fetchFullTodoistSync,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  closeTask as apiCloseTask,
  reopenTask as apiReopenTask,
  deleteTask as apiDeleteTask,
} from '../services/todoist';
import { isTaskOverdue, isTaskToday, getDaysOverdue, formatDueDateDisplay } from '../utils/dateUtils';
import { getPriorityMeta } from '../utils/priorityUtils';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface TaskContextType {
  // Navigation & Project filter
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Data
  tasks: TodoistTask[];
  completedTasks: TodoistTask[];
  projects: TodoistProject[];
  enrichedTasks: EnrichedTask[];
  metrics: DashboardMetrics;

  // Modals & Panels
  selectedTaskId: string | null;
  selectedTask: EnrichedTask | null;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  
  isCreateModalOpen: boolean;
  createModalDefaults: { projectId?: string; dueDate?: string; priority?: 1 | 2 | 3 | 4 };
  openCreateModal: (defaults?: { projectId?: string; dueDate?: string; priority?: 1 | 2 | 3 | 4 }) => void;
  closeCreateModal: () => void;

  // Sync & Connection
  syncState: SyncState;
  isDemoMode: boolean;
  apiToken: string;
  setApiToken: (token: string) => void;
  toggleDemoMode: (enable: boolean) => void;
  syncNow: () => Promise<void>;

  // Task Actions
  handleCreateTask: (payload: CreateTaskPayload) => Promise<boolean>;
  handleUpdateTask: (taskId: string, payload: UpdateTaskPayload) => Promise<boolean>;
  handleToggleComplete: (taskId: string) => Promise<boolean>;
  handleDeleteTask: (taskId: string) => Promise<boolean>;
  handleChangePriority: (taskId: string, priority: 1 | 2 | 3 | 4) => Promise<boolean>;

  // Toast System
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const LOCAL_STORAGE_TOKEN_KEY = 'taskflow_todoist_token';
const LOCAL_STORAGE_DEMO_KEY = 'taskflow_is_demo_mode';
const LOCAL_STORAGE_DEMO_TASKS_KEY = 'taskflow_demo_tasks_v3';
const LOCAL_STORAGE_DEMO_COMPLETED_KEY = 'taskflow_demo_completed_v3';

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createModalDefaults, setCreateModalDefaults] = useState<{
    projectId?: string;
    dueDate?: string;
    priority?: 1 | 2 | 3 | 4;
  }>({});

  const [apiToken, setApiTokenState] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY) || import.meta.env.VITE_TODOIST_API_TOKEN || '';
  });

  const [isDemoMode, setIsDemoModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_DEMO_KEY);
    if (saved !== null) return saved === 'true';
    return !import.meta.env.VITE_TODOIST_API_TOKEN;
  });

  // Data state
  const [tasks, setTasks] = useState<TodoistTask[]>(() => {
    if (isDemoMode) {
      const saved = localStorage.getItem(LOCAL_STORAGE_DEMO_TASKS_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      return getInitialDemoTasks();
    }
    return [];
  });

  const [completedTasks, setCompletedTasks] = useState<TodoistTask[]>(() => {
    if (isDemoMode) {
      const saved = localStorage.getItem(LOCAL_STORAGE_DEMO_COMPLETED_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
      return getInitialDemoCompletedTasks();
    }
    return [];
  });

  const [projects, setProjects] = useState<TodoistProject[]>(() => {
    return isDemoMode ? DEMO_PROJECTS : [];
  });

  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    lastSynced: new Date(),
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(LOCAL_STORAGE_DEMO_TASKS_KEY, JSON.stringify(tasks));
    }
  }, [tasks, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(LOCAL_STORAGE_DEMO_COMPLETED_KEY, JSON.stringify(completedTasks));
    }
  }, [completedTasks, isDemoMode]);

  const syncNow = useCallback(async () => {
    setSyncState((prev) => ({ ...prev, status: 'syncing', errorMessage: undefined }));

    if (isDemoMode) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSyncState({
        status: 'success',
        lastSynced: new Date(),
      });
      addToast({
        type: 'success',
        title: 'Synced successfully',
        message: 'Demo workspace data refreshed.',
      });
      return;
    }

    if (!apiToken) {
      setSyncState({
        status: 'error',
        lastSynced: null,
        errorMessage: 'API Token required.',
      });
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Please enter your Todoist API token in Settings.',
      });
      return;
    }

    try {
      const result = await fetchFullTodoistSync(apiToken);
      setTasks(result.tasks);
      setProjects(result.projects);
      setSyncState({
        status: 'success',
        lastSynced: result.timestamp,
      });
      addToast({
        type: 'success',
        title: 'Synced successfully',
        message: `Fetched ${result.tasks.length} tasks from Todoist.`,
      });
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to sync with Todoist';
      setSyncState({
        status: 'error',
        lastSynced: null,
        errorMessage: errorMsg,
      });
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: errorMsg,
      });
    }
  }, [isDemoMode, apiToken, addToast]);

  useEffect(() => {
    if (isDemoMode) {
      if (projects.length === 0) setProjects(DEMO_PROJECTS);
    } else if (apiToken) {
      syncNow();
    }
  }, [isDemoMode, apiToken, syncNow, projects.length]);

  const setApiToken = useCallback((token: string) => {
    setApiTokenState(token);
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
    localStorage.setItem('todoist_api_token', token);
  }, []);

  const toggleDemoMode = useCallback(
    (enable: boolean) => {
      setIsDemoModeState(enable);
      localStorage.setItem(LOCAL_STORAGE_DEMO_KEY, String(enable));
      if (enable) {
        setProjects(DEMO_PROJECTS);
        setTasks(getInitialDemoTasks());
        setCompletedTasks(getInitialDemoCompletedTasks());
        addToast({
          type: 'info',
          title: 'Switched to Demo Mode',
          message: 'Loaded sample tasks for presentation.',
        });
      } else {
        if (apiToken) {
          syncNow();
        } else {
          setTasks([]);
          setProjects([]);
          addToast({
            type: 'info',
            title: 'Live Todoist Mode',
            message: 'Connect your API token in Settings to sync your account.',
          });
        }
      }
    },
    [apiToken, syncNow, addToast]
  );

  const projectMap = useMemo(() => {
    const map = new Map<string, TodoistProject>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const enrichedTasks: EnrichedTask[] = useMemo(() => {
    return tasks.map((task) => {
      const isOverdue = isTaskOverdue(task.due?.date);
      const isToday = isTaskToday(task.due?.date);
      const daysOverdue = getDaysOverdue(task.due?.date);
      const priorityMeta = getPriorityMeta(task.priority);

      return {
        ...task,
        project: projectMap.get(task.project_id),
        isOverdue,
        isToday,
        daysOverdue,
        priorityLabel: priorityMeta.displayLabel,
      };
    });
  }, [tasks, projectMap]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    const active = enrichedTasks.find((t) => t.id === selectedTaskId);
    if (active) return active;
    const completed = completedTasks.find((t) => t.id === selectedTaskId);
    if (completed) {
      return {
        ...completed,
        project: projectMap.get(completed.project_id),
        priorityLabel: getPriorityMeta(completed.priority).displayLabel,
      };
    }
    return null;
  }, [selectedTaskId, enrichedTasks, completedTasks, projectMap]);

  const metrics: DashboardMetrics = useMemo(() => {
    const activeTasks = tasks.filter((t) => !t.is_completed);
    const dueToday = activeTasks.filter((t) => isTaskToday(t.due?.date)).length;
    const overdue = activeTasks.filter((t) => isTaskOverdue(t.due?.date)).length;
    const totalTasks = activeTasks.length + completedTasks.length;

    return {
      totalTasks,
      dueToday,
      overdue,
      completed: completedTasks.length,
    };
  }, [tasks, completedTasks]);

  const openTaskDetail = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const closeTaskDetail = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const openCreateModal = useCallback(
    (defaults?: { projectId?: string; dueDate?: string; priority?: 1 | 2 | 3 | 4 }) => {
      setCreateModalDefaults(defaults || {});
      setIsCreateModalOpen(true);
    },
    []
  );

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setCreateModalDefaults({});
  }, []);

  const handleCreateTask = useCallback(
    async (payload: CreateTaskPayload): Promise<boolean> => {
      if (isDemoMode) {
        const newTask: TodoistTask = {
          id: `task_demo_${Date.now()}`,
          project_id: payload.project_id || projects[0]?.id || 'proj_work',
          content: payload.content,
          description: payload.description || '',
          is_completed: false,
          labels: payload.labels || [],
          priority: payload.priority || 1,
          order: tasks.length + 1,
          due: payload.due_date
            ? {
                date: payload.due_date,
                string: formatDueDateDisplay(payload.due_date),
                datetime: payload.due_datetime,
              }
            : null,
          created_at: new Date().toISOString(),
        };

        setTasks((prev) => [newTask, ...prev]);
        addToast({
          type: 'success',
          title: 'Task Created',
          message: `"${newTask.content}" added.`,
        });
        return true;
      }

      try {
        const created = await apiCreateTask(payload, apiToken);
        setTasks((prev) => [created, ...prev]);
        addToast({
          type: 'success',
          title: 'Task Created in Todoist',
          message: `"${created.content}" created.`,
        });
        return true;
      } catch (error: any) {
        addToast({
          type: 'error',
          title: 'Failed to Create Task',
          message: error.message || 'Todoist API error.',
        });
        return false;
      }
    },
    [isDemoMode, apiToken, projects, tasks.length, addToast]
  );

  const handleUpdateTask = useCallback(
    async (taskId: string, payload: UpdateTaskPayload): Promise<boolean> => {
      if (isDemoMode) {
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === taskId) {
              return {
                ...t,
                content: payload.content ?? t.content,
                description: payload.description ?? t.description,
                priority: payload.priority ?? t.priority,
                project_id: payload.project_id ?? t.project_id,
                due: payload.due_date
                  ? {
                      date: payload.due_date,
                      string: formatDueDateDisplay(payload.due_date),
                    }
                  : payload.due_date === ''
                  ? null
                  : t.due,
              };
            }
            return t;
          })
        );
        addToast({
          type: 'success',
          title: 'Task Updated',
        });
        return true;
      }

      try {
        const updated = await apiUpdateTask(taskId, payload, apiToken);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        addToast({
          type: 'success',
          title: 'Task Updated in Todoist',
        });
        return true;
      } catch (error: any) {
        addToast({
          type: 'error',
          title: 'Failed to Update Task',
          message: error.message,
        });
        return false;
      }
    },
    [isDemoMode, apiToken, addToast]
  );

  const handleToggleComplete = useCallback(
    async (taskId: string): Promise<boolean> => {
      const activeTask = tasks.find((t) => t.id === taskId);
      const isCurrentlyActive = !!activeTask;

      if (isDemoMode) {
        if (isCurrentlyActive) {
          const completedItem: TodoistTask = {
            ...activeTask,
            is_completed: true,
            completed_at: new Date().toISOString(),
          };
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setCompletedTasks((prev) => [completedItem, ...prev]);
          addToast({
            type: 'success',
            title: 'Task Completed ✓',
            message: `"${activeTask.content}"`,
          });
        } else {
          const completedTask = completedTasks.find((t) => t.id === taskId);
          if (completedTask) {
            const reopenedItem: TodoistTask = {
              ...completedTask,
              is_completed: false,
              completed_at: null,
            };
            setCompletedTasks((prev) => prev.filter((t) => t.id !== taskId));
            setTasks((prev) => [reopenedItem, ...prev]);
            addToast({
              type: 'info',
              title: 'Task Reopened',
            });
          }
        }
        return true;
      }

      try {
        if (isCurrentlyActive) {
          await apiCloseTask(taskId, apiToken);
          const completedItem: TodoistTask = {
            ...activeTask,
            is_completed: true,
            completed_at: new Date().toISOString(),
          };
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setCompletedTasks((prev) => [completedItem, ...prev]);
          addToast({
            type: 'success',
            title: 'Task Completed in Todoist ✓',
          });
        } else {
          await apiReopenTask(taskId, apiToken);
          const completedTask = completedTasks.find((t) => t.id === taskId);
          if (completedTask) {
            const reopenedItem: TodoistTask = {
              ...completedTask,
              is_completed: false,
              completed_at: null,
            };
            setCompletedTasks((prev) => prev.filter((t) => t.id !== taskId));
            setTasks((prev) => [reopenedItem, ...prev]);
            addToast({
              type: 'info',
              title: 'Task Reopened in Todoist',
            });
          }
        }
        return true;
      } catch (error: any) {
        addToast({
          type: 'error',
          title: 'Action Failed',
          message: error.message,
        });
        return false;
      }
    },
    [isDemoMode, tasks, completedTasks, apiToken, addToast]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (isDemoMode) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setCompletedTasks((prev) => prev.filter((t) => t.id !== taskId));
        if (selectedTaskId === taskId) setSelectedTaskId(null);
        addToast({ type: 'info', title: 'Task Deleted' });
        return true;
      }

      try {
        await apiDeleteTask(taskId, apiToken);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setCompletedTasks((prev) => prev.filter((t) => t.id !== taskId));
        if (selectedTaskId === taskId) setSelectedTaskId(null);
        addToast({ type: 'info', title: 'Task Deleted from Todoist' });
        return true;
      } catch (error: any) {
        addToast({ type: 'error', title: 'Delete Failed', message: error.message });
        return false;
      }
    },
    [isDemoMode, selectedTaskId, apiToken, addToast]
  );

  const handleChangePriority = useCallback(
    async (taskId: string, priority: 1 | 2 | 3 | 4): Promise<boolean> => {
      return handleUpdateTask(taskId, { priority });
    },
    [handleUpdateTask]
  );

  const value = {
    currentTab,
    setCurrentTab,
    selectedProjectId,
    setSelectedProjectId,
    searchQuery,
    setSearchQuery,
    tasks,
    completedTasks,
    projects,
    enrichedTasks,
    metrics,
    selectedTaskId,
    selectedTask,
    openTaskDetail,
    closeTaskDetail,
    isCreateModalOpen,
    createModalDefaults,
    openCreateModal,
    closeCreateModal,
    syncState,
    isDemoMode,
    apiToken,
    setApiToken,
    toggleDemoMode,
    syncNow,
    handleCreateTask,
    handleUpdateTask,
    handleToggleComplete,
    handleDeleteTask,
    handleChangePriority,
    toasts,
    addToast,
    removeToast,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};

export const useTaskStore = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskStore must be used within a TaskProvider');
  }
  return context;
};
