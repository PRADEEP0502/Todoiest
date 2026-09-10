import { useMemo, useState } from 'react';
import { useTaskStore } from '../store/TaskContext';
import type { EnrichedTask, TaskPriorityLevel } from '../types/dashboard';
import { isTaskToday, isTaskOverdue, isTaskTomorrow, parseTaskDueDate } from '../utils/dateUtils';
import { isThisWeek, isFuture } from 'date-fns';

export interface TaskFilterOptions {
  projectId?: string | null;
  priority?: TaskPriorityLevel | 'all';
  label?: string | 'all';
  searchQuery?: string;
  sortBy?: 'due_date' | 'priority' | 'created' | 'alphabetical';
  sortOrder?: 'asc' | 'desc';
}

export function useTasks(initialFilters?: TaskFilterOptions) {
  const { enrichedTasks, completedTasks, searchQuery: globalSearch } = useTaskStore();
  
  const [projectId, setProjectId] = useState<string | null | undefined>(initialFilters?.projectId);
  const [priority, setPriority] = useState<TaskPriorityLevel | 'all'>(initialFilters?.priority || 'all');
  const [label, setLabel] = useState<string | 'all'>(initialFilters?.label || 'all');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created' | 'alphabetical'>(
    initialFilters?.sortBy || 'due_date'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialFilters?.sortOrder || 'asc');

  const effectiveSearch = localSearch || globalSearch;

  // Filter Active Tasks
  const filteredActiveTasks = useMemo(() => {
    return enrichedTasks.filter((task) => {
      // Search
      if (effectiveSearch.trim()) {
        const query = effectiveSearch.toLowerCase();
        const matchesContent = task.content.toLowerCase().includes(query);
        const matchesDesc = (task.description || '').toLowerCase().includes(query);
        const matchesProject = (task.project?.name || '').toLowerCase().includes(query);
        const matchesLabel = task.labels.some((l) => l.toLowerCase().includes(query));
        if (!matchesContent && !matchesDesc && !matchesProject && !matchesLabel) {
          return false;
        }
      }

      // Project filter
      if (projectId && task.project_id !== projectId) {
        return false;
      }

      // Priority filter
      if (priority !== 'all' && task.priority !== priority) {
        return false;
      }

      // Label filter
      if (label !== 'all' && !task.labels.includes(label)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'priority') {
        comparison = b.priority - a.priority;
      } else if (sortBy === 'created') {
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'alphabetical') {
        comparison = a.content.localeCompare(b.content);
      } else {
        const dateA = a.due?.date ? new Date(a.due.date).getTime() : Infinity;
        const dateB = b.due?.date ? new Date(b.due.date).getTime() : Infinity;
        comparison = dateA - dateB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [enrichedTasks, effectiveSearch, projectId, priority, label, sortBy, sortOrder]);

  // Derived categorized subsets
  const todayTasks = useMemo(() => {
    return filteredActiveTasks.filter((t) => isTaskToday(t.due?.date));
  }, [filteredActiveTasks]);

  const todayP1Tasks = useMemo(() => {
    return todayTasks.filter((t) => t.priority === 4);
  }, [todayTasks]);

  const todayNormalTasks = useMemo(() => {
    return todayTasks.filter((t) => t.priority !== 4);
  }, [todayTasks]);

  const overdueTasks = useMemo(() => {
    return filteredActiveTasks.filter((t) => isTaskOverdue(t.due?.date));
  }, [filteredActiveTasks]);

  const upcomingGroups = useMemo(() => {
    const today: EnrichedTask[] = [];
    const tomorrow: EnrichedTask[] = [];
    const thisWeek: EnrichedTask[] = [];
    const nextWeek: EnrichedTask[] = [];
    const later: EnrichedTask[] = [];
    const noDueDate: EnrichedTask[] = [];

    filteredActiveTasks.forEach((t) => {
      if (!t.due?.date) {
        noDueDate.push(t);
        return;
      }
      if (isTaskToday(t.due.date)) {
        today.push(t);
      } else if (isTaskTomorrow(t.due.date)) {
        tomorrow.push(t);
      } else {
        const d = parseTaskDueDate(t.due.date);
        if (d && isThisWeek(d)) {
          thisWeek.push(t);
        } else if (d && isFuture(d)) {
          later.push(t);
        } else {
          today.push(t);
        }
      }
    });

    return { today, tomorrow, thisWeek, nextWeek, later, noDueDate };
  }, [filteredActiveTasks]);

  return {
    tasks: filteredActiveTasks,
    todayTasks,
    todayP1Tasks,
    todayNormalTasks,
    overdueTasks,
    upcomingGroups,
    completedTasks,
    filters: {
      projectId,
      setProjectId,
      priority,
      setPriority,
      label,
      setLabel,
      search: localSearch,
      setSearch: setLocalSearch,
      sortBy,
      setSortBy,
      sortOrder,
      setSortOrder,
    },
  };
}
