import { vi, beforeEach, afterEach } from 'vitest';
import { apiMoveTask } from './taskApi';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.5); // default: never fails (0.5 >= 0.1)
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// Unique IDs per test prevent module-level inFlightTimestamps Map from leaking state
let taskCounter = 0;
const nextId = (): string => `test-task-${++taskCounter}`;

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('happy path', () => {
  it('resolves after 2000ms', async () => {
    const id = nextId();
    const p = apiMoveTask(id, 'Done');
    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toBe('confirmed');
  });

  it('does not resolve before 2000ms', async () => {
    const id = nextId();
    let resolved = false;
    apiMoveTask(id, 'Done').then(() => { resolved = true; });
    await vi.advanceTimersByTimeAsync(1999);
    expect(resolved).toBe(false);
    // Flush remaining timer to avoid leaking into next test
    await vi.advanceTimersByTimeAsync(1);
  });
});

// ---------------------------------------------------------------------------
// Forced failure (Math.random < 0.1)
// ---------------------------------------------------------------------------

describe('forced failure', () => {
  it('rejects with an Error after 2000ms when random < 0.1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05);
    const id = nextId();
    const p = apiMoveTask(id, 'In Progress');
    // Attach rejection handler BEFORE advancing so the rejection is handled immediately
    const expectRejection = expect(p).rejects.toThrow(`API: failed to move task ${id}`);
    await vi.advanceTimersByTimeAsync(2000);
    await expectRejection;
  });

  it('does not reject when random >= 0.1 (boundary: exactly 0.1)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // 0.1 is NOT < 0.1
    const id = nextId();
    const p = apiMoveTask(id, 'Todo');
    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toBe('confirmed');
  });
});

// ---------------------------------------------------------------------------
// Race-condition guard — supersession
// ---------------------------------------------------------------------------

describe('supersession (race-condition guard)', () => {
  it('first call resolves silently when superseded by second call for same ID', async () => {
    const id = nextId();
    const p1 = apiMoveTask(id, 'Done');
    // Advance 1ms so p2 gets a different Date.now() value, making p1 detectable as superseded
    vi.advanceTimersByTime(1);
    const p2 = apiMoveTask(id, 'In Progress');
    await vi.advanceTimersByTimeAsync(2001); // covers both timers (2000ms and 2001ms)
    // p1 detected supersession and returned early — does NOT throw
    await expect(p1).resolves.toBe('superseded');
    await expect(p2).resolves.toBe('confirmed');
  });

  it('superseded call does not trigger the failure path even when random < 0.1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05); // would cause p2 to throw
    const id = nextId();
    const p1 = apiMoveTask(id, 'Done');
    // Advance 1ms so Date.now() differs → p1 is superseded by p2
    vi.advanceTimersByTime(1);
    const p2 = apiMoveTask(id, 'In Progress');
    // p2 is NOT superseded and Math.random = 0.05 → p2 will throw; attach handler first
    const expectP2Rejection = expect(p2).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(2001);
    // p1 exited early (superseded) before reaching Math.random → must NOT reject
    await expect(p1).resolves.toBe('superseded');
    await expectP2Rejection;
  });

  it('three calls for same ID: only the last one runs to completion', async () => {
    const id = nextId();
    const p1 = apiMoveTask(id, 'Todo');
    vi.advanceTimersByTime(1);
    const p2 = apiMoveTask(id, 'In Progress');
    vi.advanceTimersByTime(1);
    const p3 = apiMoveTask(id, 'Done');
    await vi.advanceTimersByTimeAsync(2002);
    await expect(p1).resolves.toBe('superseded');
    await expect(p2).resolves.toBe('superseded');
    await expect(p3).resolves.toBe('confirmed');
  });
});

// ---------------------------------------------------------------------------
// Independent IDs — no cross-task interference
// ---------------------------------------------------------------------------

describe('calls for different IDs are independent', () => {
  it('both resolve normally', async () => {
    const idA = nextId();
    const idB = nextId();
    const pA = apiMoveTask(idA, 'Done');
    const pB = apiMoveTask(idB, 'In Progress');
    await vi.advanceTimersByTimeAsync(2000);
    await expect(pA).resolves.toBe('confirmed');
    await expect(pB).resolves.toBe('confirmed');
  });

  it('failure on one ID does not affect the other', async () => {
    const idA = nextId();
    const idB = nextId();
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.05) // idA fails
      .mockReturnValueOnce(0.5); // idB succeeds
    const pA = apiMoveTask(idA, 'Done');
    const pB = apiMoveTask(idB, 'In Progress');
    // Attach rejection handler for pA before advancing timers
    const expectARejection = expect(pA).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(2000);
    await expectARejection;
    await expect(pB).resolves.toBe('confirmed');
  });
});

// ---------------------------------------------------------------------------
// Map cleanup after failure
// ---------------------------------------------------------------------------

describe('inFlightTimestamps cleanup', () => {
  it('a retry after failure is not treated as superseded', async () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.05) // first call fails
      .mockReturnValueOnce(0.5); // retry succeeds
    const id = nextId();

    const p1 = apiMoveTask(id, 'Done');
    const expectRejection = expect(p1).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(2000);
    await expectRejection;

    // Retry — should run fresh, not superseded
    const p2 = apiMoveTask(id, 'Done');
    await vi.advanceTimersByTimeAsync(2000);
    await expect(p2).resolves.toBe('confirmed');
  });
});
