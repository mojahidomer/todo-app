import { createContext, useContext, useReducer, useState, useCallback, useRef } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Task, Status, HistoryEntry, HistoryState } from '../types/task';
import { mockTasks } from '../data/mockTasks';
import { apiMoveTask } from '../api/taskApi';

// --- Reducer ---

type TaskAction =
  | { type: 'ADD_TASK';        payload: Task }
  | { type: 'UPDATE_TASK';     payload: { id: string; changes: Partial<Omit<Task, 'id'>> } }
  | { type: 'DELETE_TASK';     payload: string }
  | { type: 'MOVE_TASK';       payload: { id: string; newStatus: Status } }
  | { type: 'EXTERNAL_UPDATE'; payload: { id: string; changes: Partial<Omit<Task, 'id'>> } }
  | { type: 'RECORD_MOVE';     payload: { previousSnapshot: Task[]; label: string } }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const INITIAL_HISTORY: HistoryState = { past: [], present: mockTasks, future: [] };

function pushHistory(state: HistoryState, label: string, newPresent: Task[]): HistoryState {
  const entry: HistoryEntry = { snapshot: state.present, label };
  return {
    past: [...state.past, entry].slice(-50),
    present: newPresent,
    future: [],
  };
}

export function taskReducer(state: HistoryState, action: TaskAction): HistoryState {
  switch (action.type) {
    case 'ADD_TASK':
      return pushHistory(
        state,
        `Added '${action.payload.title}'`,
        [...state.present, action.payload],
      );
    case 'UPDATE_TASK': {
      const existing = state.present.find((t) => t.id === action.payload.id);
      if (!existing) return state;
      const label = `Edited '${action.payload.changes.title ?? existing.title}'`;
      return pushHistory(
        state,
        label,
        state.present.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.changes } : t,
        ),
      );
    }
    case 'DELETE_TASK': {
      const existing = state.present.find((t) => t.id === action.payload);
      if (!existing) return state;
      return pushHistory(
        state,
        `Deleted '${existing.title}'`,
        state.present.filter((t) => t.id !== action.payload),
      );
    }
    case 'MOVE_TASK':
      // Optimistic dispatch — updates UI immediately, no history entry yet.
      // History is written by RECORD_MOVE only if the API call succeeds.
      return {
        ...state,
        present: state.present.map((t) =>
          t.id === action.payload.id ? { ...t, status: action.payload.newStatus } : t,
        ),
      };
    case 'EXTERNAL_UPDATE':
      // Background WS update — applies to present only, never touches history.
      // Prevents server-side changes from appearing in the undo stack.
      return {
        ...state,
        present: state.present.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.changes } : t,
        ),
      };
    case 'RECORD_MOVE':
      // Fired after API success. Writes the pre-move snapshot to history so the
      // move is undoable. Does not touch state.present (already correct).
      return {
        past: [...state.past, { snapshot: action.payload.previousSnapshot, label: action.payload.label }].slice(-50),
        present: state.present,
        future: [],
      };
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const entry = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: entry.snapshot,
        future: [{ snapshot: state.present, label: entry.label }, ...state.future],
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const entry = state.future[0];
      return {
        past: [...state.past, { snapshot: state.present, label: entry.label }].slice(-50),
        present: entry.snapshot,
        future: state.future.slice(1),
      };
    }
  }
}

// --- Context ---

interface TaskContextValue {
  tasks: Task[];
  loadingTaskIds: ReadonlySet<string>;
  addTask: (payload: Omit<Task, 'id' | 'createdDate'>) => void;
  updateTask: (id: string, changes: Partial<Omit<Task, 'id'>>) => void;
  externalUpdateTask: (id: string, changes: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: Status) => Promise<void>;
  getTasksByStatus: () => Record<Status, Task[]>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  historyCount: number;
}

const TaskContext = createContext<TaskContextValue | null>(null);

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider = ({ children }: TaskProviderProps): ReactElement => {
  const [historyState, dispatch] = useReducer(taskReducer, INITIAL_HISTORY);
  const [loadingTaskIds, setLoadingTaskIds] = useState<Set<string>>(new Set());

  const tasks = historyState.present;

  // PERF: tasksRef lets useCallback functions read the latest task list without
  // adding `tasks` to their dep arrays — keeping all context functions stable
  // across re-renders and preventing downstream useMemo/useCallback churn.
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;

  // PERF: loadingRef keeps undo/redo stable; they only read the set size,
  // not the reference itself, so a ref avoids dep-array thrashing.
  const loadingRef = useRef<Set<string>>(loadingTaskIds);
  loadingRef.current = loadingTaskIds;

  // PERF: dispatch is stable (React guarantee) → [] deps give permanent stability.
  const addTask = useCallback((payload: Omit<Task, 'id' | 'createdDate'>): void => {
    const newTask: Task = {
      ...payload,
      id: uuidv4(),
      createdDate: new Date().toISOString().split('T')[0],
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
  }, []);

  // PERF: dispatch is stable → [] deps.
  const updateTask = useCallback((id: string, changes: Partial<Omit<Task, 'id'>>): void => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, changes } });
  }, []);

  // PERF: dispatch is stable → [] deps.
  const externalUpdateTask = useCallback((id: string, changes: Partial<Omit<Task, 'id'>>): void => {
    dispatch({ type: 'EXTERNAL_UPDATE', payload: { id, changes } });
  }, []);

  // PERF: dispatch is stable → [] deps.
  const deleteTask = useCallback((id: string): void => {
    dispatch({ type: 'DELETE_TASK', payload: id });
  }, []);

  // PERF: tasksRef.current gives current tasks without making `tasks` a dep.
  // dispatch and setLoadingTaskIds are both stable → [] deps.
  const moveTask = useCallback(async (id: string, newStatus: Status): Promise<void> => {
    const movingTask = tasksRef.current.find((t) => t.id === id);
    const previousStatus = movingTask?.status;
    const previousSnapshot = [...tasksRef.current];
    dispatch({ type: 'MOVE_TASK', payload: { id, newStatus } });
    setLoadingTaskIds((prev) => new Set([...prev, id]));
    try {
      const result = await apiMoveTask(id, newStatus);
      // Only record history when the API actually processed the request.
      // A superseded call returns 'superseded' — no history entry for a no-op.
      if (result === 'confirmed') {
        dispatch({
          type: 'RECORD_MOVE',
          payload: {
            previousSnapshot,
            label: `Moved '${movingTask?.title ?? 'task'}' to ${newStatus}`,
          },
        });
      }
    } catch (err) {
      if (previousStatus !== undefined) {
        dispatch({ type: 'MOVE_TASK', payload: { id, newStatus: previousStatus } });
      }
      throw err;
    } finally {
      setLoadingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  // PERF: tasks is the only dep — function gets a new stable ref only when the
  // task list changes, letting Board.tsx drop `tasks` from the tasksByStatus memo.
  const getTasksByStatus = useCallback((): Record<Status, Task[]> => {
    const grouped: Record<Status, Task[]> = { 'Todo': [], 'In Progress': [], 'Done': [] };
    for (const task of tasks) grouped[task.status].push(task);
    return grouped;
  }, [tasks]);

  // PERF: loadingRef.current gives current loading state without adding
  // `loadingTaskIds` to deps — keeping undo/redo stable across loading state changes.
  const undo = useCallback((): void => {
    if (loadingRef.current.size === 0) dispatch({ type: 'UNDO' });
  }, []);

  // PERF: same rationale as undo above.
  const redo = useCallback((): void => {
    if (loadingRef.current.size === 0) dispatch({ type: 'REDO' });
  }, []);

  const canUndo = historyState.past.length > 0 && loadingTaskIds.size === 0;
  const canRedo = historyState.future.length > 0 && loadingTaskIds.size === 0;
  const undoLabel = historyState.past[historyState.past.length - 1]?.label ?? null;
  const redoLabel = historyState.future[0]?.label ?? null;
  const historyCount = historyState.past.length;

  return (
    <TaskContext.Provider value={{
      tasks, loadingTaskIds,
      addTask, updateTask, externalUpdateTask, deleteTask, moveTask, getTasksByStatus,
      undo, redo, canUndo, canRedo, undoLabel, redoLabel, historyCount,
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = (): TaskContextValue => {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskContext must be used inside <TaskProvider>');
  return ctx;
};
