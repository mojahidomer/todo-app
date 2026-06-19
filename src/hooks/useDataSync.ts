import { useEffect, useRef, useCallback } from 'react';
import type { Task } from '../types/task';
import type { ToastType } from '../types/task';
import { createFakeWebSocket } from '../api/dataChannel';
import type { TaskEvent } from '../api/dataChannel';

type AddToast = (message: string, type: ToastType) => void;
type ExternalUpdateTask = (id: string, changes: Partial<Omit<Task, 'id'>>) => void;

interface PendingUpdate {
  id: string;
  changes: Partial<Omit<Task, 'id' | 'createdDate'>>;
  message: string;
}

export const useDataSync = (
  tasks: Task[],
  addToast: AddToast,
  draggingTaskId: string | null,
  externalUpdateTask: ExternalUpdateTask,
): void => {
  const tasksRef = useRef<Task[]>(tasks);
  const draggingRef = useRef<string | null>(draggingTaskId);
  const pendingUpdates = useRef<PendingUpdate[]>([]);

  tasksRef.current = tasks;
  draggingRef.current = draggingTaskId;

  const processEvent = useCallback((event: TaskEvent): void => {
    const changeDesc = event.changes.status
      ? `moved to ${event.changes.status}`
      : `priority set to ${event.changes.priority}`;
    const message = `'${event.taskTitle}' ${changeDesc}`;

    const update: PendingUpdate = { id: event.taskId, changes: event.changes, message };

    if (draggingRef.current === event.taskId) {
      // Queue the update — the dragged card must not change mid-gesture
      pendingUpdates.current.push(update);
    } else {
      externalUpdateTask(event.taskId, event.changes);
      addToast(message, 'info');
    }
  }, [externalUpdateTask, addToast]);

  // Flush queued updates when drag ends.
  // De-duplicate by task ID so only the last server state per task is applied.
  useEffect(() => {
    if (draggingTaskId !== null) return;
    const updates = pendingUpdates.current.splice(0);
    const deduped = new Map<string, PendingUpdate>();
    for (const u of updates) deduped.set(u.id, u);
    deduped.forEach((u) => {
      externalUpdateTask(u.id, u.changes);
      addToast(u.message, 'info');
    });
  }, [draggingTaskId, externalUpdateTask, addToast]);

  useEffect(() => {
    const ws = createFakeWebSocket(() => tasksRef.current, processEvent);
    return () => ws.close();
  }, [processEvent]);
};
