import type { Status } from '../types/task';

const inFlightTimestamps = new Map<string, number>();

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function apiMoveTask(id: string, newStatus: Status): Promise<'confirmed' | 'superseded'> {
  const ts = Date.now();
  inFlightTimestamps.set(id, ts);
  await delay(2000);
  if (inFlightTimestamps.get(id) !== ts) {
    return 'superseded'; // a newer call for the same task has taken over
  }
  inFlightTimestamps.delete(id);
  if (Math.random() < 0.1) {
    throw new Error(`API: failed to move task ${id} to ${newStatus}`);
  }
  return 'confirmed';
}
