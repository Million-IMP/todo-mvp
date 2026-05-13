'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Todo } from '@/types';
import { CATEGORY_CONFIG, fmtTime } from './constants';

interface Props {
  todo: Todo;
  onClick: (todo: Todo, rect: DOMRect) => void;
  isOverlay?: boolean;
}

export function CalendarEvent({ todo, onClick, isOverlay }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging || isOverlay ? 100 : 'auto',
  };

  const cfg = CATEGORY_CONFIG[todo.category];

  return (
    <div
      ref={setNodeRef}
      style={{ 
        ...style, 
        backgroundColor: cfg.bg, 
        color: cfg.color,
      }}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick(todo, e.currentTarget.getBoundingClientRect());
      }}
      className={`w-full text-left rounded px-1.5 py-0.5 text-xs font-medium truncate transition hover:brightness-90 cursor-grab active:cursor-grabbing touch-none ${
        isOverlay ? 'shadow-lg ring-2 ring-blue-500 ring-opacity-50 scale-105' : ''
      }`}
    >
      {todo.start_time && (
        <span className="mr-1 opacity-75">
          {fmtTime(todo.start_time).replace('오전 ', '').replace('오후 ', '')}
        </span>
      )}
      {todo.completed ? '✓ ' : ''}
      {todo.title}
    </div>
  );
}
