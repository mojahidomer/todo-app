import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, afterEach } from 'vitest';
import { useToasts } from './useToasts';

beforeEach(() => vi.useFakeTimers());
afterEach(async () => {
  // Flush any pending timers (auto-dismiss callbacks) inside act so React
  // processes the resulting state updates without "not wrapped in act" warnings.
  await act(async () => { vi.runOnlyPendingTimers(); });
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// addToast
// ---------------------------------------------------------------------------

describe('addToast', () => {
  it('adds a toast with the correct message and type', () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.addToast('hello world', 'info'));
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('hello world');
    expect(result.current.toasts[0].type).toBe('info');
  });

  it('assigns a non-empty string id to each toast', () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.addToast('msg', 'success'));
    expect(typeof result.current.toasts[0].id).toBe('string');
    expect(result.current.toasts[0].id.length).toBeGreaterThan(0);
  });

  it('multiple toasts all appear in the array', () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.addToast('one', 'info');
      result.current.addToast('two', 'error');
      result.current.addToast('three', 'success');
    });
    expect(result.current.toasts).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Auto-dismiss after 4 seconds
// ---------------------------------------------------------------------------

describe('auto-dismiss', () => {
  it('toast is removed after 4000ms', () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.addToast('bye', 'info'));
    expect(result.current.toasts).toHaveLength(1);
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('toast is still present at 3999ms', () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.addToast('still here', 'info'));
    act(() => vi.advanceTimersByTime(3999));
    expect(result.current.toasts).toHaveLength(1);
  });

  it('each toast has an independent timer', () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.addToast('first', 'info'));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.addToast('second', 'info'));
    // After 4000ms from start: first is gone (2000+2000), second still has 2s left
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('second');
  });

  it('all toasts are cleared after their timers fire', () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.addToast('a', 'info');
      result.current.addToast('b', 'error');
      result.current.addToast('c', 'success');
    });
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.toasts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// removeToast
// ---------------------------------------------------------------------------

describe('removeToast', () => {
  it('removes the toast immediately by id', () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.addToast('remove me', 'info'));
    const id = result.current.toasts[0].id;
    act(() => result.current.removeToast(id));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('removeToast before timeout: no crash when timeout fires later', () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.addToast('early remove', 'info'));
    const id = result.current.toasts[0].id;
    act(() => result.current.removeToast(id));
    // Timer fires — filter on already-empty list is a no-op
    expect(() => act(() => vi.advanceTimersByTime(4000))).not.toThrow();
    expect(result.current.toasts).toHaveLength(0);
  });

  it('removeToast with non-existent id does not throw or affect other toasts', () => {
    const { result } = renderHook(() => useToasts());
    act(() => result.current.addToast('real toast', 'info'));
    expect(() =>
      act(() => result.current.removeToast('00000000-0000-0000-0000-000000000000'))
    ).not.toThrow();
    expect(result.current.toasts).toHaveLength(1);
  });

  it('removes only the targeted toast, leaving others intact', () => {
    const { result } = renderHook(() => useToasts());
    act(() => {
      result.current.addToast('keep', 'success');
      result.current.addToast('remove', 'error');
    });
    const removeId = result.current.toasts.find((t) => t.message === 'remove')!.id;
    act(() => result.current.removeToast(removeId));
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('keep');
  });
});
