import { memo, useRef } from 'react';
import type { ReactElement } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Task, Status } from '../types/task';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  status: Status;
  tasks: Task[];
  loadingTaskIds: ReadonlySet<string>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const HEADER_COLORS: Record<Status, string> = {
  'Todo': 'bg-gray-200 text-gray-700',
  'In Progress': 'bg-blue-200 text-blue-800',
  'Done': 'bg-green-200 text-green-800',
};

const COUNT_COLORS: Record<Status, string> = {
  'Todo': 'bg-gray-300 text-gray-700',
  'In Progress': 'bg-blue-300 text-blue-800',
  'Done': 'bg-green-300 text-green-800',
};

export const Column = memo(({ status, tasks, loadingTaskIds, onEdit, onDelete }: ColumnProps): ReactElement => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const scrollRef = useRef<HTMLDivElement>(null);

  const taskIds = tasks.map((t) => t.id);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 157,
    overscan: 3,
  });

  return (
    <div className="flex flex-col w-[calc(100vw-1.5rem)] sm:w-80 min-w-[calc(100vw-1.5rem)] sm:min-w-[20rem] shrink-0 snap-start sm:snap-align-none">
      {/* Column header */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-lg ${HEADER_COLORS[status]}`}>
        <h2 className="font-semibold text-sm" data-testid={`column-header-${status}`}>
          {status}
        </h2>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${COUNT_COLORS[status]}`} data-testid={`column-count-${status}`}>
          {tasks.length}
        </span>
      </div>

      {/* Drop zone + scroll container */}
      <div
        ref={(node) => {
          setNodeRef(node);
          (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={[
          'flex-1 rounded-b-lg overflow-y-auto min-h-[200px] max-h-[calc(100dvh-200px)] sm:max-h-[calc(100vh-180px)] transition-colors p-3',
          isOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : 'bg-gray-50',
        ].join(' ')}
        data-testid={`column-drop-zone-${status}`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[160px]">
              <p className="text-gray-400 text-sm text-center py-8">Drop tasks here</p>
            </div>
          ) : (
            <div
              style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const task = tasks[virtualItem.index];
                return (
                  <div
                    key={task.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                      paddingBottom: '12px',
                    }}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                  >
                    <TaskCard
                      task={task}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      isLoading={loadingTaskIds.has(task.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
});

Column.displayName = 'Column';
