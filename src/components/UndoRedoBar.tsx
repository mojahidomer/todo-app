import { memo } from 'react';
import type { ReactElement } from 'react';

interface UndoRedoBarProps {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  historyCount: number;
  onUndo: () => void;
  onRedo: () => void;
}

export const UndoRedoBar = memo(({
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  historyCount,
  onUndo,
  onRedo,
}: UndoRedoBarProps): ReactElement => (
  <div className="flex items-center justify-between gap-4 mb-3 max-w-[1040px] mx-auto">
    {/* Undo side */}
    <div className="flex items-center gap-2 min-w-0">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        data-testid="undo-btn"
        aria-label="Undo"
      >
        ↩ Undo
      </button>
      {undoLabel && (
        <span className="hidden sm:inline text-gray-400 text-xs italic truncate max-w-[180px]" title={undoLabel}>
          {undoLabel}
        </span>
      )}
    </div>

    {/* Center count */}
    {historyCount > 0 && (
      <span className="text-gray-400 text-xs shrink-0">
        {historyCount} / 50 actions
      </span>
    )}

    {/* Redo side */}
    <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        data-testid="redo-btn"
        aria-label="Redo"
      >
        Redo ↪
      </button>
      {redoLabel && (
        <span className="hidden sm:inline text-gray-400 text-xs italic truncate max-w-[180px] text-right" title={redoLabel}>
          {redoLabel}
        </span>
      )}
    </div>
  </div>
));

UndoRedoBar.displayName = 'UndoRedoBar';
