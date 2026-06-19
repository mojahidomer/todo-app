import { useState, useMemo, useCallback } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import type { Task, Status } from '../types/task';
import { useTasks } from '../hooks/useTasks';
import { useFilters } from '../hooks/useFilters';
import { useToasts } from '../hooks/useToasts';
import { useDataSync } from '../hooks/useDataSync';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useBoardDrag, COLUMNS } from '../hooks/useBoardDrag';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { FilterBar } from './FilterBar';
import { UndoRedoBar } from './UndoRedoBar';
import { ToastContainer } from './ToastContainer';
import { ErrorBoundary } from './ErrorBoundary';

export default function Board(): ReactElement {
  const { tasks, loadingTaskIds, getTasksByStatus, moveTask, addTask, updateTask, deleteTask, externalUpdateTask } = useTasks();
  const { filters, setSearch, setAssignee, setPriority, clearFilters, hasActiveFilters, applyFilters } = useFilters();
  const { toasts, addToast, removeToast } = useToasts();
  const { undo, redo, canUndo, canRedo, undoLabel, redoLabel, historyCount } = useUndoRedo();
  useKeyboardShortcuts(undo, redo);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // getTasksByStatus is useCallback([tasks]), so its reference changes only when
  // tasks changes — using it as the sole dep here avoids listing tasks twice.
  const tasksByStatus = useMemo<Record<Status, Task[]>>(
    () => getTasksByStatus(),
    [getTasksByStatus],
  );

  const { sensors, activeTask, handleDragStart, handleDragEnd } = useBoardDrag(
    tasksByStatus,
    moveTask,
    addToast,
  );

  // Keep the unfiltered tasksByStatus above separate from filteredByStatus below.
  // Drag-and-drop logic uses tasksByStatus to locate a card's real column — if it
  // used the filtered list, dropping onto a card that is hidden by an active filter
  // would fail to resolve the target column.
  const filteredByStatus = useMemo<Record<Status, Task[]>>(
    () => ({
      'Todo': applyFilters(tasksByStatus['Todo']),
      'In Progress': applyFilters(tasksByStatus['In Progress']),
      'Done': applyFilters(tasksByStatus['Done']),
    }),
    [tasksByStatus, applyFilters],
  );

  const assigneeOptions = useMemo<string[]>(
    () => [...new Set(tasks.map((t) => t.assignee))].sort(),
    [tasks],
  );

  // Pass the active drag ID so useDataSync can queue any WebSocket updates that
  // arrive for the card being dragged instead of applying them mid-gesture.
  useDataSync(tasks, addToast, activeTask?.id ?? null, externalUpdateTask);

  const handleEdit = useCallback((task: Task): void => setEditingTask(task), []);

  const handleDelete = useCallback((id: string): void => deleteTask(id), [deleteTask]);

  const handleAddSubmit = useCallback((data: Omit<Task, 'id' | 'createdDate'>): void => {
    addTask(data);
    setShowAddForm(false);
  }, [addTask]);

  const handleEditSubmit = useCallback((data: Omit<Task, 'id' | 'createdDate'>): void => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      setEditingTask(null);
    }
  }, [editingTask, updateTask]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-3 sm:p-6">
      {/* Board header */}
      <div className="flex items-center justify-between mb-6 max-w-[1040px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Todo App Board</h1>
          <p className="text-sm text-gray-500 mt-0.5">Drag cards between columns to update status</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          data-testid="add-task-btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Undo / Redo bar */}
      <UndoRedoBar
        canUndo={canUndo}
        canRedo={canRedo}
        undoLabel={undoLabel}
        redoLabel={redoLabel}
        historyCount={historyCount}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        assigneeOptions={assigneeOptions}
        onSearchChange={setSearch}
        onAssigneeChange={setAssignee}
        onPriorityChange={setPriority}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 sm:gap-5 overflow-x-auto pb-6 sm:pb-4 px-3 sm:px-0 sm:justify-center snap-x snap-mandatory [scroll-padding-left:0.75rem] sm:[scroll-padding-left:0]">
          {COLUMNS.map((status) => (
            <ErrorBoundary key={status}>
              <Column
                status={status}
                tasks={filteredByStatus[status]}
                loadingTaskIds={loadingTaskIds}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </ErrorBoundary>
          ))}
        </div>

        {/* Portal to document.body so the overlay escapes column overflow/clip
            contexts and always renders above everything regardless of z-index. */}
        {createPortal(
          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                onEdit={() => undefined}
                onDelete={() => undefined}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {/* Forms */}
      {showAddForm && (
        <TaskForm
          onSubmit={handleAddSubmit}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {editingTask && (
        <TaskForm
          task={editingTask}
          onSubmit={handleEditSubmit}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
