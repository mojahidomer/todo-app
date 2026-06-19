import { taskReducer } from './TaskContext';
import type { HistoryState, Task } from '../types/task';

const makeTask = (overrides?: Partial<Task>): Task => ({
  id: 'task-1',
  title: 'Test Task',
  description: 'A description',
  status: 'Todo',
  priority: 'Medium',
  assignee: 'Alice',
  tags: [],
  createdDate: '2026-01-01',
  ...overrides,
});

const emptyState: HistoryState = { past: [], present: [], future: [] };

// ---------------------------------------------------------------------------
// pushHistory (exercised via ADD_TASK)
// ---------------------------------------------------------------------------

describe('pushHistory', () => {
  it('appends current present to past with the correct label', () => {
    const task = makeTask();
    const s = taskReducer(
      { ...emptyState, present: [task] },
      { type: 'ADD_TASK', payload: makeTask({ id: 'task-2', title: 'New' }) },
    );
    expect(s.past).toHaveLength(1);
    expect(s.past[0].snapshot).toEqual([task]);
    expect(s.past[0].label).toBe("Added 'New'");
  });

  it('clears future on every mutation', () => {
    const state: HistoryState = {
      past: [],
      present: [makeTask()],
      future: [{ snapshot: [], label: 'old redo' }],
    };
    const s = taskReducer(state, { type: 'ADD_TASK', payload: makeTask({ id: 't2', title: 'X' }) });
    expect(s.future).toHaveLength(0);
  });

  it('caps past at 50 — oldest entry is dropped when limit exceeded', () => {
    const past50: HistoryState['past'] = Array.from({ length: 50 }, (_, i) => ({
      snapshot: [],
      label: `entry-${i}`,
    }));
    const state: HistoryState = { past: past50, present: [], future: [] };
    const s = taskReducer(state, { type: 'ADD_TASK', payload: makeTask({ id: 'n', title: 'New' }) });
    expect(s.past).toHaveLength(50);
    expect(s.past[0].label).toBe('entry-1'); // entry-0 was dropped
    expect(s.past[49].label).toBe("Added 'New'");
  });
});

// ---------------------------------------------------------------------------
// ADD_TASK
// ---------------------------------------------------------------------------

describe('ADD_TASK', () => {
  it('adds the task to present', () => {
    const task = makeTask();
    const s = taskReducer(emptyState, { type: 'ADD_TASK', payload: task });
    expect(s.present).toHaveLength(1);
    expect(s.present[0]).toEqual(task);
  });

  it('sets past length to 1 and clears future', () => {
    const s = taskReducer(emptyState, { type: 'ADD_TASK', payload: makeTask() });
    expect(s.past).toHaveLength(1);
    expect(s.future).toHaveLength(0);
  });

  it('label is "Added \'<title>\'"', () => {
    const s = taskReducer(emptyState, { type: 'ADD_TASK', payload: makeTask({ title: 'Fix bug' }) });
    expect(s.past[0].label).toBe("Added 'Fix bug'");
  });
});

// ---------------------------------------------------------------------------
// UPDATE_TASK
// ---------------------------------------------------------------------------

describe('UPDATE_TASK', () => {
  const original = makeTask({ id: 'u1', title: 'Original', tags: ['alpha'] });

  it('merges changes onto the target task', () => {
    const s = taskReducer(
      { ...emptyState, present: [original] },
      { type: 'UPDATE_TASK', payload: { id: 'u1', changes: { title: 'Updated', priority: 'High' } } },
    );
    expect(s.present[0].title).toBe('Updated');
    expect(s.present[0].priority).toBe('High');
  });

  it('preserves fields not in changes (tags, createdDate)', () => {
    const s = taskReducer(
      { ...emptyState, present: [original] },
      { type: 'UPDATE_TASK', payload: { id: 'u1', changes: { title: 'Updated' } } },
    );
    expect(s.present[0].tags).toEqual(['alpha']);
    expect(s.present[0].createdDate).toBe('2026-01-01');
  });

  it('label uses changes.title when provided', () => {
    const s = taskReducer(
      { ...emptyState, present: [original] },
      { type: 'UPDATE_TASK', payload: { id: 'u1', changes: { title: 'NewName' } } },
    );
    expect(s.past[0].label).toBe("Edited 'NewName'");
  });

  it('label falls back to existing title when changes.title absent', () => {
    const s = taskReducer(
      { ...emptyState, present: [original] },
      { type: 'UPDATE_TASK', payload: { id: 'u1', changes: { priority: 'Low' } } },
    );
    expect(s.past[0].label).toBe("Edited 'Original'");
  });

  it('non-existent id: state returned unchanged — no phantom history entry', () => {
    const s = taskReducer(
      { ...emptyState, present: [original] },
      { type: 'UPDATE_TASK', payload: { id: 'does-not-exist', changes: { title: 'X' } } },
    );
    expect(s.present).toEqual([original]);
    expect(s.past).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DELETE_TASK
// ---------------------------------------------------------------------------

describe('DELETE_TASK', () => {
  const task = makeTask({ id: 'd1', title: 'To Delete' });

  it('removes the task from present', () => {
    const s = taskReducer(
      { ...emptyState, present: [task, makeTask({ id: 'd2' })] },
      { type: 'DELETE_TASK', payload: 'd1' },
    );
    expect(s.present.find((t) => t.id === 'd1')).toBeUndefined();
    expect(s.present).toHaveLength(1);
  });

  it('label is "Deleted \'<title>\'"', () => {
    const s = taskReducer(
      { ...emptyState, present: [task] },
      { type: 'DELETE_TASK', payload: 'd1' },
    );
    expect(s.past[0].label).toBe("Deleted 'To Delete'");
  });

  it('non-existent id: state returned unchanged — no phantom history entry', () => {
    const s = taskReducer(
      { ...emptyState, present: [task] },
      { type: 'DELETE_TASK', payload: 'ghost-id' },
    );
    expect(s.present).toEqual([task]);
    expect(s.past).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// MOVE_TASK — the contract is what it does NOT do
// ---------------------------------------------------------------------------

describe('MOVE_TASK', () => {
  const task = makeTask({ id: 'm1', status: 'Todo' });
  const futureEntry = { snapshot: [], label: 'redo entry' };

  it('updates task status in present', () => {
    const s = taskReducer(
      { ...emptyState, present: [task] },
      { type: 'MOVE_TASK', payload: { id: 'm1', newStatus: 'Done' } },
    );
    expect(s.present[0].status).toBe('Done');
  });

  it('does NOT write a history entry (past unchanged)', () => {
    const state: HistoryState = { past: [], present: [task], future: [] };
    const s = taskReducer(state, { type: 'MOVE_TASK', payload: { id: 'm1', newStatus: 'In Progress' } });
    expect(s.past).toHaveLength(0);
  });

  it('preserves future — does NOT clear redo stack', () => {
    const state: HistoryState = { past: [], present: [task], future: [futureEntry] };
    const s = taskReducer(state, { type: 'MOVE_TASK', payload: { id: 'm1', newStatus: 'Done' } });
    expect(s.future).toEqual([futureEntry]);
  });

  it('unknown id: present and history unchanged', () => {
    const state: HistoryState = { past: [], present: [task], future: [futureEntry] };
    const s = taskReducer(state, { type: 'MOVE_TASK', payload: { id: 'ghost', newStatus: 'Done' } });
    expect(s.present).toEqual([task]);
    expect(s.past).toHaveLength(0);
    expect(s.future).toEqual([futureEntry]);
  });
});

// ---------------------------------------------------------------------------
// RECORD_MOVE — only touches past
// ---------------------------------------------------------------------------

describe('RECORD_MOVE', () => {
  const snapshot = [makeTask({ id: 'snap1' })];
  const futureEntry = { snapshot: [], label: 'redo' };
  const task = makeTask({ id: 'r1', status: 'Done' });

  it('appends to past with the given snapshot and label', () => {
    const state: HistoryState = { past: [], present: [task], future: [] };
    const s = taskReducer(state, {
      type: 'RECORD_MOVE',
      payload: { previousSnapshot: snapshot, label: "Moved 'r1' to Done" },
    });
    expect(s.past).toHaveLength(1);
    expect(s.past[0].snapshot).toEqual(snapshot);
    expect(s.past[0].label).toBe("Moved 'r1' to Done");
  });

  it('does NOT change present', () => {
    const state: HistoryState = { past: [], present: [task], future: [] };
    const s = taskReducer(state, {
      type: 'RECORD_MOVE',
      payload: { previousSnapshot: snapshot, label: 'label' },
    });
    expect(s.present).toEqual([task]);
  });

  it('clears future', () => {
    const state: HistoryState = { past: [], present: [task], future: [futureEntry] };
    const s = taskReducer(state, {
      type: 'RECORD_MOVE',
      payload: { previousSnapshot: snapshot, label: 'label' },
    });
    expect(s.future).toHaveLength(0);
  });

  it('caps past at 50', () => {
    const past50 = Array.from({ length: 50 }, (_, i) => ({ snapshot: [], label: `e${i}` }));
    const state: HistoryState = { past: past50, present: [task], future: [] };
    const s = taskReducer(state, {
      type: 'RECORD_MOVE',
      payload: { previousSnapshot: snapshot, label: 'new' },
    });
    expect(s.past).toHaveLength(50);
    expect(s.past[0].label).toBe('e1');
    expect(s.past[49].label).toBe('new');
  });
});

// ---------------------------------------------------------------------------
// UNDO
// ---------------------------------------------------------------------------

describe('UNDO', () => {
  it('empty past: returns state unchanged', () => {
    const s = taskReducer(emptyState, { type: 'UNDO' });
    expect(s).toBe(emptyState); // reference equality
  });

  it('restores last past snapshot as present', () => {
    const task1 = makeTask({ id: '1' });
    const task2 = makeTask({ id: '2' });
    const state: HistoryState = {
      past: [{ snapshot: [task1], label: 'Added task2' }],
      present: [task1, task2],
      future: [],
    };
    const s = taskReducer(state, { type: 'UNDO' });
    expect(s.present).toEqual([task1]);
  });

  it('pushes current present to front of future', () => {
    const task1 = makeTask({ id: '1' });
    const task2 = makeTask({ id: '2' });
    const state: HistoryState = {
      past: [{ snapshot: [task1], label: 'Added task2' }],
      present: [task1, task2],
      future: [],
    };
    const s = taskReducer(state, { type: 'UNDO' });
    expect(s.future).toHaveLength(1);
    expect(s.future[0].snapshot).toEqual([task1, task2]);
    expect(s.future[0].label).toBe('Added task2');
  });

  it('past shrinks by 1', () => {
    const state: HistoryState = {
      past: [
        { snapshot: [], label: 'a' },
        { snapshot: [], label: 'b' },
      ],
      present: [],
      future: [],
    };
    const s = taskReducer(state, { type: 'UNDO' });
    expect(s.past).toHaveLength(1);
    expect(s.past[0].label).toBe('a');
  });

  it('two undos: future.length grows to 2 (prepend, not replace)', () => {
    const task1 = makeTask({ id: '1' });
    const task2 = makeTask({ id: '2' });
    const task3 = makeTask({ id: '3' });
    let s: HistoryState = {
      past: [
        { snapshot: [task1], label: 'step1' },
        { snapshot: [task1, task2], label: 'step2' },
      ],
      present: [task1, task2, task3],
      future: [],
    };
    s = taskReducer(s, { type: 'UNDO' });
    s = taskReducer(s, { type: 'UNDO' });
    expect(s.future).toHaveLength(2);
    expect(s.past).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// REDO
// ---------------------------------------------------------------------------

describe('REDO', () => {
  it('empty future: returns state unchanged', () => {
    const s = taskReducer(emptyState, { type: 'REDO' });
    expect(s).toBe(emptyState);
  });

  it('restores first future snapshot as present', () => {
    const task1 = makeTask({ id: '1' });
    const task2 = makeTask({ id: '2' });
    const state: HistoryState = {
      past: [],
      present: [task1],
      future: [{ snapshot: [task1, task2], label: 'Added task2' }],
    };
    const s = taskReducer(state, { type: 'REDO' });
    expect(s.present).toEqual([task1, task2]);
  });

  it('pushes current present to end of past', () => {
    const task1 = makeTask({ id: '1' });
    const task2 = makeTask({ id: '2' });
    const state: HistoryState = {
      past: [],
      present: [task1],
      future: [{ snapshot: [task1, task2], label: 'Added task2' }],
    };
    const s = taskReducer(state, { type: 'REDO' });
    expect(s.past).toHaveLength(1);
    expect(s.past[0].snapshot).toEqual([task1]);
    expect(s.past[0].label).toBe('Added task2');
  });

  it('future shrinks by 1', () => {
    const state: HistoryState = {
      past: [],
      present: [],
      future: [
        { snapshot: [makeTask()], label: 'f1' },
        { snapshot: [], label: 'f2' },
      ],
    };
    const s = taskReducer(state, { type: 'REDO' });
    expect(s.future).toHaveLength(1);
    expect(s.future[0].label).toBe('f2');
  });

  it('caps past at 50 after redo', () => {
    const past50 = Array.from({ length: 50 }, (_, i) => ({ snapshot: [], label: `e${i}` }));
    const state: HistoryState = {
      past: past50,
      present: [],
      future: [{ snapshot: [makeTask()], label: 'redo' }],
    };
    const s = taskReducer(state, { type: 'REDO' });
    expect(s.past).toHaveLength(50);
    expect(s.past[0].label).toBe('e1');
  });
});

// ---------------------------------------------------------------------------
// EXTERNAL_UPDATE — background poll/WS changes, never touches history
// ---------------------------------------------------------------------------

describe('EXTERNAL_UPDATE', () => {
  const task = makeTask({ id: 'ext1', status: 'Todo', priority: 'Low' });

  it('applies changes to present', () => {
    const s = taskReducer(
      { ...emptyState, present: [task] },
      { type: 'EXTERNAL_UPDATE', payload: { id: 'ext1', changes: { status: 'Done' } } },
    );
    expect(s.present[0].status).toBe('Done');
  });

  it('does NOT push to past (history preserved as-is)', () => {
    const state: HistoryState = {
      past: [{ snapshot: [], label: 'prior' }],
      present: [task],
      future: [],
    };
    const s = taskReducer(state, {
      type: 'EXTERNAL_UPDATE',
      payload: { id: 'ext1', changes: { priority: 'High' } },
    });
    expect(s.past).toHaveLength(1);
    expect(s.past[0].label).toBe('prior');
  });

  it('does NOT clear future (redo stack preserved)', () => {
    const state: HistoryState = {
      past: [],
      present: [task],
      future: [{ snapshot: [], label: 'redo-entry' }],
    };
    const s = taskReducer(state, {
      type: 'EXTERNAL_UPDATE',
      payload: { id: 'ext1', changes: { status: 'In Progress' } },
    });
    expect(s.future).toHaveLength(1);
    expect(s.future[0].label).toBe('redo-entry');
  });

  it('unknown id: present unchanged, past and future untouched', () => {
    const state: HistoryState = {
      past: [{ snapshot: [], label: 'x' }],
      present: [task],
      future: [{ snapshot: [], label: 'y' }],
    };
    const s = taskReducer(state, {
      type: 'EXTERNAL_UPDATE',
      payload: { id: 'ghost', changes: { status: 'Done' } },
    });
    expect(s.present).toEqual([task]);
    expect(s.past).toHaveLength(1);
    expect(s.future).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Critical invariant: undo then edit clears future (branch-and-lose)
// ---------------------------------------------------------------------------

describe('branch-and-lose-future invariant', () => {
  it('dispatching any mutation after UNDO wipes the redo stack', () => {
    const task1 = makeTask({ id: '1', title: 'Task 1' });
    const task2 = makeTask({ id: '2', title: 'Task 2' });
    const task3 = makeTask({ id: '3', title: 'Task 3' });

    let s = taskReducer(emptyState, { type: 'ADD_TASK', payload: task1 });
    s = taskReducer(s, { type: 'ADD_TASK', payload: task2 });
    // past = 2 entries, future = []
    s = taskReducer(s, { type: 'UNDO' });
    // future = 1 entry (can redo ADD task2)
    expect(s.future).toHaveLength(1);

    s = taskReducer(s, { type: 'ADD_TASK', payload: task3 });
    // New branch — redo stack must be wiped
    expect(s.future).toHaveLength(0);
  });

  it('MOVE_TASK does NOT wipe future (optimistic moves preserve redo)', () => {
    const task1 = makeTask({ id: '1', title: 'Task 1' });
    const task2 = makeTask({ id: '2', title: 'Task 2' });
    let s = taskReducer(emptyState, { type: 'ADD_TASK', payload: task1 });
    s = taskReducer(s, { type: 'ADD_TASK', payload: task2 });
    s = taskReducer(s, { type: 'UNDO' }); // future has 1 entry

    s = taskReducer(s, { type: 'MOVE_TASK', payload: { id: '1', newStatus: 'Done' } });
    expect(s.future).toHaveLength(1); // still there
  });
});
