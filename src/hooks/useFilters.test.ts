import { renderHook, act } from '@testing-library/react';
import { useFilters } from './useFilters';
import type { Task } from '../types/task';

const makeTask = (overrides?: Partial<Task>): Task => ({
  id: 'task-1',
  title: 'Fix login bug',
  description: 'Auth fails on bad input',
  status: 'Todo',
  priority: 'Medium',
  assignee: 'Alice',
  tags: [],
  createdDate: '2026-01-01',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Search filter
// ---------------------------------------------------------------------------

describe('search filter', () => {
  it('empty search returns all tasks', () => {
    const tasks = [makeTask(), makeTask({ id: '2', title: 'Other' })];
    const { result } = renderHook(() => useFilters());
    expect(result.current.applyFilters(tasks)).toHaveLength(2);
  });

  it('matches title case-insensitively (lowercase search, mixed-case title)', () => {
    const tasks = [makeTask({ title: 'Fix Bug' }), makeTask({ id: '2', title: 'Unrelated' })];
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('bug'));
    expect(result.current.applyFilters(tasks)).toHaveLength(1);
    expect(result.current.applyFilters(tasks)[0].title).toBe('Fix Bug');
  });

  it('matches title case-insensitively (uppercase search, lowercase title)', () => {
    const tasks = [makeTask({ title: 'fix bug' }), makeTask({ id: '2', title: 'nope' })];
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('BUG'));
    expect(result.current.applyFilters(tasks)).toHaveLength(1);
  });

  it('matches task when only description contains the search term', () => {
    const tasks = [
      makeTask({ title: 'Task A', description: 'Server timeout occurs here' }),
      makeTask({ id: '2', title: 'Task B', description: 'Unrelated content' }),
    ];
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('server'));
    const filtered = result.current.applyFilters(tasks);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Task A');
  });

  it('does not match when neither title nor description contains the term', () => {
    const tasks = [makeTask({ title: 'Alpha', description: 'Beta' })];
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('gamma'));
    expect(result.current.applyFilters(tasks)).toHaveLength(0);
  });

  it('whitespace-only search returns no tasks (documents current behavior)', () => {
    const tasks = [makeTask(), makeTask({ id: '2' })];
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('   '));
    // '   ' is truthy, so the search predicate runs and "   ".includes(any title) is false
    expect(result.current.applyFilters(tasks)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Assignee filter
// ---------------------------------------------------------------------------

describe('assignee filter', () => {
  const alice = makeTask({ id: 'a1', assignee: 'Alice' });
  const bob = makeTask({ id: 'b1', assignee: 'Bob' });
  const tasks = [alice, bob];

  it('empty assignee returns all tasks', () => {
    const { result } = renderHook(() => useFilters());
    expect(result.current.applyFilters(tasks)).toHaveLength(2);
  });

  it("filters to only the matching assignee's tasks", () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setAssignee('Alice'));
    const filtered = result.current.applyFilters(tasks);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].assignee).toBe('Alice');
  });

  it('assignee filter is case-sensitive (documents exact-match behavior)', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setAssignee('alice')); // lowercase
    expect(result.current.applyFilters(tasks)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Priority filter
// ---------------------------------------------------------------------------

describe('priority filter', () => {
  const low = makeTask({ id: 'l1', priority: 'Low' });
  const med = makeTask({ id: 'm1', priority: 'Medium' });
  const high = makeTask({ id: 'h1', priority: 'High' });
  const tasks = [low, med, high];

  it("empty priority returns all tasks", () => {
    const { result } = renderHook(() => useFilters());
    expect(result.current.applyFilters(tasks)).toHaveLength(3);
  });

  it('filters to only matching priority', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setPriority('High'));
    const filtered = result.current.applyFilters(tasks);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].priority).toBe('High');
  });
});

// ---------------------------------------------------------------------------
// AND logic — all three filters active simultaneously
// ---------------------------------------------------------------------------

describe('AND logic with all filters active', () => {
  const match = makeTask({
    id: 'match',
    title: 'Deploy server',
    description: 'push to production',
    assignee: 'Alice',
    priority: 'High',
  });
  const wrongPriority = makeTask({
    id: 'wrong-prio',
    title: 'Deploy server',
    description: 'push to production',
    assignee: 'Alice',
    priority: 'Low',
  });
  const wrongAssignee = makeTask({
    id: 'wrong-assignee',
    title: 'Deploy server',
    description: 'push to production',
    assignee: 'Bob',
    priority: 'High',
  });
  const tasks = [match, wrongPriority, wrongAssignee];

  it('only the task matching all three filters is included', () => {
    const { result } = renderHook(() => useFilters());
    act(() => {
      result.current.setSearch('deploy');
      result.current.setAssignee('Alice');
      result.current.setPriority('High');
    });
    const filtered = result.current.applyFilters(tasks);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('match');
  });

  it('returns empty array when no tasks match all three filters', () => {
    const { result } = renderHook(() => useFilters());
    act(() => {
      result.current.setSearch('nonexistent');
      result.current.setAssignee('Alice');
      result.current.setPriority('High');
    });
    expect(result.current.applyFilters(tasks)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// clearFilters and hasActiveFilters
// ---------------------------------------------------------------------------

describe('clearFilters', () => {
  const tasks = [makeTask(), makeTask({ id: '2' })];

  it('resets all filters so hasActiveFilters is false', () => {
    const { result } = renderHook(() => useFilters());
    act(() => {
      result.current.setSearch('x');
      result.current.setAssignee('Alice');
      result.current.setPriority('High');
    });
    expect(result.current.hasActiveFilters).toBe(true);
    act(() => result.current.clearFilters());
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('after clearing, applyFilters returns all tasks', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('zzznomatch'));
    act(() => result.current.clearFilters());
    expect(result.current.applyFilters(tasks)).toHaveLength(2);
  });
});

describe('hasActiveFilters', () => {
  it('is false when all filters are empty strings', () => {
    const { result } = renderHook(() => useFilters());
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('is true when search is set', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setSearch('x'));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('is true when assignee is set', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setAssignee('Alice'));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('is true when priority is set', () => {
    const { result } = renderHook(() => useFilters());
    act(() => result.current.setPriority('Low'));
    expect(result.current.hasActiveFilters).toBe(true);
  });
});
