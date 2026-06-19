import { useTaskContext } from '../context/TaskContext';

interface UseUndoRedoReturn {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  historyCount: number;
}

export const useUndoRedo = (): UseUndoRedoReturn => {
  const { undo, redo, canUndo, canRedo, undoLabel, redoLabel, historyCount } = useTaskContext();
  return { undo, redo, canUndo, canRedo, undoLabel, redoLabel, historyCount };
};
