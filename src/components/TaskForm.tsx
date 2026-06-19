import { useState, useEffect, useRef } from 'react';
import type { ReactElement, KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import type { Task, Priority } from '../types/task';
import { useTasks } from '../hooks/useTasks';
import { ConflictBanner } from './ConflictBanner';

interface TaskFormProps {
  task?: Task;
  onSubmit: (data: Omit<Task, 'id' | 'createdDate'>) => void;
  onClose: () => void;
}

interface FormValues {
  title: string;
  description: string;
  priority: Priority;
  assignee: string;
  tags: string;
}

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];

const inputClass = (hasError: boolean): string =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-400' : 'border-gray-300'
  }`;

export const TaskForm = ({ task, onSubmit, onClose }: TaskFormProps): ReactElement => {
  const { tasks } = useTasks();
  const [conflictTask, setConflictTask] = useState<Task | null>(null);
  // Tracks the last version of the task the user has acknowledged (snapshot on open,
  // or the live version after they clicked "Use latest" / "Keep my changes").
  // Comparing against this — not the original task prop — prevents the banner
  // from re-appearing after the user has already dismissed it.
  const acknowledgedRef = useRef<Task | null>(task ?? null);
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    mode: 'onTouched',
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      priority: task?.priority ?? 'Medium',
      assignee: task?.assignee ?? '',
      tags: task?.tags.join(', ') ?? '',
    },
  });

  // Auto-focus the first input when the modal opens.
  useEffect(() => {
    modalRef.current
      ?.querySelector<HTMLElement>('input, select, textarea')
      ?.focus();
  }, []);

  // Close on Escape key.
  useEffect(() => {
    const handle = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  // Detect background mutations to the task being edited.
  // Compares the live task against acknowledgedRef (not the original task prop),
  // so dismissing the banner actually prevents it from re-appearing for the same change.
  useEffect(() => {
    if (!task) return;
    const live = tasks.find((t) => t.id === task.id);
    const baseline = acknowledgedRef.current;
    if (!live || !baseline) return;

    const changedFields: string[] = [];
    if (live.title !== baseline.title) changedFields.push('title');
    if (live.description !== baseline.description) changedFields.push('description');
    if (live.priority !== baseline.priority) changedFields.push('priority');
    if (live.assignee !== baseline.assignee) changedFields.push('assignee');
    if (live.status !== baseline.status) changedFields.push('status');
    if (JSON.stringify(live.tags) !== JSON.stringify(baseline.tags)) changedFields.push('tags');

    if (changedFields.length > 0) setConflictTask(live);
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyLatest = (): void => {
    if (!conflictTask) return;
    acknowledgedRef.current = conflictTask;
    reset({
      title: conflictTask.title,
      description: conflictTask.description,
      priority: conflictTask.priority,
      assignee: conflictTask.assignee,
      tags: conflictTask.tags.join(', '),
    });
    setConflictTask(null);
  };

  const keepMine = (): void => {
    if (conflictTask) acknowledgedRef.current = conflictTask;
    setConflictTask(null);
  };

  // Trap focus within the modal on Tab / Shift+Tab.
  const trapFocus = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      modalRef.current?.querySelectorAll<HTMLElement>(
        'input, select, textarea, button:not([disabled])',
      ) ?? [],
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onValid = (values: FormValues): void => {
    const tags = values.tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    const unique = [...new Set(tags)];
    onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      status: task?.status ?? 'Todo',
      priority: values.priority,
      assignee: values.assignee.trim(),
      tags: unique,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" data-testid="task-form-overlay">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-4 sm:p-6 max-h-[90dvh] overflow-y-auto"
        data-testid="task-form"
        onKeyDown={trapFocus}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {task ? 'Edit Task' : 'Add New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="close-form-btn"
            aria-label="Close form"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {conflictTask && (
          <ConflictBanner onApplyLatest={applyLatest} onKeepMine={keepMine} />
        )}

        <form onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              placeholder="Task title"
              className={inputClass(!!errors.title)}
              data-testid="input-title"
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 3, message: 'Title must be at least 3 characters' },
                maxLength: { value: 80, message: 'Title must be 80 characters or fewer' },
              })}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              placeholder="What needs to be done…"
              rows={3}
              className={`${inputClass(!!errors.description)} resize-none`}
              data-testid="input-description"
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 10, message: 'Description must be at least 10 characters' },
              })}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              id="priority"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="select-priority"
              {...register('priority')}
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1">
              Assignee <span className="text-red-500">*</span>
            </label>
            <input
              id="assignee"
              type="text"
              placeholder="Full name"
              className={inputClass(!!errors.assignee)}
              data-testid="input-assignee"
              {...register('assignee', {
                required: 'Assignee is required',
                validate: (v) => v.trim().length > 0 || 'Assignee is required',
              })}
            />
            {errors.assignee && <p className="text-red-500 text-xs mt-1">{errors.assignee.message}</p>}
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags <span className="text-gray-400 font-normal">(optional, comma-separated)</span>
            </label>
            <input
              id="tags"
              type="text"
              placeholder="design, backend, ux…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="input-tags"
              {...register('tags')}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              data-testid="cancel-form-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-form-btn"
            >
              {task ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
