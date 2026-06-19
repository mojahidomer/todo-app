import { useState, memo } from 'react';
import type { ReactElement } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, Priority, Status } from '../types/task';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
  isLoading?: boolean;
}

const PRIORITY_CLASSES: Record<Priority, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-red-100 text-red-700',
};

const STATUS_CLASSES: Record<Status, string> = {
  'Todo': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Done': 'bg-green-100 text-green-700',
};

const formatDate = (iso: string): string => {
  const date = new Date(iso + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const getInitials = (name: string): string =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const TaskCardInner = ({ task, onEdit, onDelete, isDragOverlay = false, isLoading = false }: TaskCardProps): ReactElement => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'relative bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-grab select-none',
        isDragging && !isDragOverlay ? 'opacity-40' : 'opacity-100',
        isDragOverlay ? 'rotate-2 shadow-lg' : 'hover:shadow-md transition-shadow',
      ].join(' ')}
      data-testid="task-card"
      {...attributes}
      {...listeners}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center z-10">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{task.title}</h3>
        {!isDragOverlay && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="text-gray-400 hover:text-blue-600 p-0.5 rounded transition-colors"
              data-testid="edit-task-btn"
              aria-label="Edit task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="text-gray-400 hover:text-red-600 p-0.5 rounded transition-colors"
              data-testid="delete-task-btn"
              aria-label="Delete task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <p
        className={[
          'text-gray-500 text-xs mb-3 cursor-pointer',
          expanded ? '' : 'line-clamp-2',
        ].join(' ')}
        onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        data-testid="task-description"
      >
        {task.description}
      </p>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CLASSES[task.priority]}`} data-testid="priority-badge">
          {task.priority}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[task.status]}`} data-testid="status-badge">
          {task.status}
        </span>
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3" data-testid="task-tags">
          {task.tags.map((tag) => (
            <span key={tag} className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: assignee + date */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
            {getInitials(task.assignee)}
          </span>
          <span className="text-xs text-gray-500 truncate max-w-[100px]">{task.assignee}</span>
        </div>
        <span className="text-xs text-gray-400">{formatDate(task.createdDate)}</span>
      </div>
    </div>
  );
};

export const TaskCard = memo(TaskCardInner);
TaskCard.displayName = 'TaskCard';
