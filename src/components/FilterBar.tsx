import { memo } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { Priority } from '../types/task';
import type { FilterState } from '../hooks/useFilters';

interface FilterBarProps {
  filters: FilterState;
  assigneeOptions: string[];
  onSearchChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onPriorityChange: (value: Priority | '') => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];

export const FilterBar = memo(({
  filters,
  assigneeOptions,
  onSearchChange,
  onAssigneeChange,
  onPriorityChange,
  onClear,
  hasActiveFilters,
}: FilterBarProps): ReactElement => (
  <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6 max-w-[1040px] mx-auto">
    {/* Search */}
    <div className="relative flex-1 min-w-[200px]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
      </svg>
      <input
        type="text"
        value={filters.search}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
        placeholder="Search tasks…"
        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        data-testid="filter-search"
      />
    </div>

    {/* Assignee dropdown */}
    <select
      value={filters.assignee}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onAssigneeChange(e.target.value)}
      className="flex-1 sm:flex-none py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
      data-testid="filter-assignee"
    >
      <option value="">All Assignees</option>
      {assigneeOptions.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>

    {/* Priority dropdown */}
    <select
      value={filters.priority}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onPriorityChange(e.target.value as Priority | '')}
      className="flex-1 sm:flex-none py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
      data-testid="filter-priority"
    >
      <option value="">All Priorities</option>
      {PRIORITIES.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>

    {/* Clear button */}
    {hasActiveFilters && (
      <button
        onClick={onClear}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        data-testid="filter-clear"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Clear
      </button>
    )}
  </div>
));

FilterBar.displayName = 'FilterBar';
