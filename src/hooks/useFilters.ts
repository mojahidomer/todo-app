import { useState, useCallback, useMemo } from 'react';
import type { Task, Priority } from '../types/task';

export interface FilterState {
  search: string;
  assignee: string;
  priority: Priority | '';
}

interface UseFiltersReturn {
  filters: FilterState;
  setSearch: (value: string) => void;
  setAssignee: (value: string) => void;
  setPriority: (value: Priority | '') => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  applyFilters: (tasks: Task[]) => Task[];
}

const EMPTY_FILTERS: FilterState = { search: '', assignee: '', priority: '' };

export const useFilters = (): UseFiltersReturn => {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const setSearch = useCallback((value: string): void => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const setAssignee = useCallback((value: string): void => {
    setFilters((prev) => ({ ...prev, assignee: value }));
  }, []);

  const setPriority = useCallback((value: Priority | ''): void => {
    setFilters((prev) => ({ ...prev, priority: value }));
  }, []);

  const clearFilters = useCallback((): void => setFilters(EMPTY_FILTERS), []);

  const hasActiveFilters =
    filters.search !== '' || filters.assignee !== '' || filters.priority !== '';

  const applyFilters = useMemo(
    () =>
      (tasks: Task[]): Task[] => {
        const searchLower = filters.search.toLowerCase();
        return tasks.filter((task) => {
          if (
            searchLower &&
            !task.title.toLowerCase().includes(searchLower) &&
            !task.description.toLowerCase().includes(searchLower)
          ) {
            return false;
          }
          if (filters.assignee && task.assignee !== filters.assignee) {
            return false;
          }
          if (filters.priority && task.priority !== filters.priority) {
            return false;
          }
          return true;
        });
      },
    [filters],
  );

  return { filters, setSearch, setAssignee, setPriority, clearFilters, hasActiveFilters, applyFilters };
};
