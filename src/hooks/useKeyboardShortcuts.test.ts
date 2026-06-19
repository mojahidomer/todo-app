import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

const fire = (key: string, extra?: Partial<KeyboardEventInit>): void => {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, ...extra }),
  );
};

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

describe('keyboard shortcuts dispatch', () => {
  it('Ctrl+z calls undo', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useKeyboardShortcuts(undo, redo));
    fire('z', { ctrlKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).not.toHaveBeenCalled();
  });

  it('Meta+z (Mac Cmd+z) calls undo', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useKeyboardShortcuts(undo, redo));
    fire('z', { metaKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Shift+Z calls redo', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useKeyboardShortcuts(undo, redo));
    fire('Z', { ctrlKey: true, shiftKey: true });
    expect(redo).toHaveBeenCalledTimes(1);
    expect(undo).not.toHaveBeenCalled();
  });

  it('Ctrl+z with shift does NOT call undo (that is redo)', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    renderHook(() => useKeyboardShortcuts(undo, redo));
    fire('z', { ctrlKey: true, shiftKey: true });
    expect(undo).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Guards — no modifier
// ---------------------------------------------------------------------------

describe('guards', () => {
  it('z without modifier key does not call undo', () => {
    const undo = vi.fn();
    renderHook(() => useKeyboardShortcuts(undo, vi.fn()));
    fire('z');
    expect(undo).not.toHaveBeenCalled();
  });

  it('ignores key when target is INPUT', () => {
    const undo = vi.fn();
    renderHook(() => useKeyboardShortcuts(undo, vi.fn()));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
    );
    expect(undo).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('ignores key when target is TEXTAREA', () => {
    const undo = vi.fn();
    renderHook(() => useKeyboardShortcuts(undo, vi.fn()));
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    ta.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
    );
    expect(undo).not.toHaveBeenCalled();
    document.body.removeChild(ta);
  });

  it('ignores key when target is SELECT', () => {
    const undo = vi.fn();
    renderHook(() => useKeyboardShortcuts(undo, vi.fn()));
    const sel = document.createElement('select');
    document.body.appendChild(sel);
    sel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
    );
    expect(undo).not.toHaveBeenCalled();
    document.body.removeChild(sel);
  });
});

// ---------------------------------------------------------------------------
// Cleanup on unmount
// ---------------------------------------------------------------------------

describe('cleanup on unmount', () => {
  it('listener is removed on unmount — undo no longer called after unmount', () => {
    const undo = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts(undo, vi.fn()));
    unmount();
    fire('z', { ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();
  });
});
