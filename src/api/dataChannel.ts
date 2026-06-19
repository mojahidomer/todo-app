import type { Task, Priority, Status } from '../types/task';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaskEvent {
  taskId: string;
  taskTitle: string;
  changes: Partial<Omit<Task, 'id' | 'createdDate'>>;
  source: 'websocket';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];
const STATUSES: Status[] = ['Todo', 'In Progress', 'Done'];

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function generateEvent(tasks: Task[]): TaskEvent | null {
  if (tasks.length === 0) return null;
  const task = tasks[randomInt(0, tasks.length - 1)];

  if (Math.random() < 0.5) {
    const otherStatuses = STATUSES.filter((s) => s !== task.status);
    const newStatus = otherStatuses[randomInt(0, otherStatuses.length - 1)];
    return { taskId: task.id, taskTitle: task.title, changes: { status: newStatus }, source: 'websocket' };
  } else {
    const otherPriorities = PRIORITIES.filter((p) => p !== task.priority);
    const newPriority = otherPriorities[randomInt(0, otherPriorities.length - 1)];
    return { taskId: task.id, taskTitle: task.title, changes: { priority: newPriority }, source: 'websocket' };
  }
}

// ---------------------------------------------------------------------------
// WebSocket — simulates a server-push connection
// ---------------------------------------------------------------------------

export function createFakeWebSocket(
  getLatestTasks: () => Task[],
  onEvent: (event: TaskEvent) => void,
): { close: () => void } {
  let timerId: ReturnType<typeof setTimeout>;

  const scheduleNext = (): void => {
    timerId = setTimeout(() => {
      const event = generateEvent(getLatestTasks());
      if (event) onEvent(event);
      scheduleNext();
    }, randomInt(8_000, 12_000));
  };

  scheduleNext();

  return { close: () => clearTimeout(timerId) };
}
