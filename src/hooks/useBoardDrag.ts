import { useState, useCallback } from 'react';
import {
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task, Status, ToastType } from '../types/task';

export const COLUMNS: Status[] = ['Todo', 'In Progress', 'Done'];

interface UseBoardDragReturn {
  sensors: ReturnType<typeof useSensors>;
  activeTask: Task | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

export const useBoardDrag = (
  tasksByStatus: Record<Status, Task[]>,
  moveTask: (id: string, status: Status) => Promise<void>,
  addToast: (msg: string, type: ToastType) => void,
): UseBoardDragReturn => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    const allTasks = Object.values(tasksByStatus).flat();
    const found = allTasks.find((t) => t.id === event.active.id);
    setActiveTask(found ?? null);
  }, [tasksByStatus]);

  const handleDragEnd = useCallback(async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const destinationId = over.id as string;
    const isColumn = (COLUMNS as string[]).includes(destinationId);

    let targetStatus: Status | undefined;

    if (isColumn) {
      targetStatus = destinationId as Status;
    } else {
      for (const [status, columnTasks] of Object.entries(tasksByStatus) as [Status, Task[]][]) {
        if (columnTasks.some((t) => t.id === destinationId)) {
          targetStatus = status;
          break;
        }
      }
    }

    if (!targetStatus) return;

    try {
      await moveTask(active.id as string, targetStatus);
    } catch {
      addToast('Move failed — rolled back', 'error');
    }
  }, [tasksByStatus, moveTask, addToast]);

  return { sensors, activeTask, handleDragStart, handleDragEnd };
};
