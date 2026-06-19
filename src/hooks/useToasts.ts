import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Toast, ToastType } from '../types/task';

export type { ToastType, Toast };

interface UseToastsReturn {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const MAX_TOASTS = 3;

export const useToasts = (): UseToastsReturn => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType): void => {
    const id = uuidv4();
    setToasts((prev) => {
      const capped = prev.length >= MAX_TOASTS ? prev.slice(1) : prev;
      return [...capped, { id, message, type }];
    });
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return { toasts, addToast, removeToast };
};
