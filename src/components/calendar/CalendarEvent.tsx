'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Todo } from '@/types';
import { CATEGORY_CONFIG, fmtTime } from './constants';

interface PresenterProps {
  todo: Todo;
  onClick?: (todo: Todo, rect: DOMRect) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
  dragProps?: any;
}

/**
 * 시각적 렌더링만 담당하는 컴포넌트
 */
export function CalendarEventPresenter({ 
  todo, 
  onClick, 
  isDragging, 
  isOverlay,
  dragProps 
}: PresenterProps) {
  const cfg = CATEGORY_CONFIG[todo.category];

  return (
    <div
      style={{ 
        backgroundColor: cfg.bg, 
        color: cfg.color,
      }}
      className={`group w-full flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium truncate transition-all select-none touch-none ${
        isDragging ? 'opacity-30' : 'opacity-100'
      } ${
        isOverlay ? 'shadow-xl ring-2 ring-blue-500 z-[100] scale-105' : ''
      }`}
    >
      {/* 드래그 핸들: 명시적인 조작 영역 제공 */}
      <div 
        {...dragProps}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-current opacity-40 hover:opacity-100 transition-opacity"
        title="드래그하여 순서 변경"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
          <path d="M7 7h2v2H7V7zm0 4h2v2H7v-2zm4-4h2v2h-2V7zm0 4h2v2h-2v-2z" />
        </svg>
      </div>

      <div 
        onClick={(e) => {
          if (onClick) {
            e.stopPropagation();
            onClick(todo, e.currentTarget.getBoundingClientRect());
          }
        }}
        className="flex-1 truncate cursor-pointer"
      >
        {todo.start_time && (
          <span className="mr-1 opacity-75">
            {fmtTime(todo.start_time).replace('오전 ', '').replace('오후 ', '')}
          </span>
        )}
        {todo.completed ? '✓ ' : ''}
        {todo.title}
      </div>
    </div>
  );
}

interface SortableProps {
  todo: Todo;
  onClick: (todo: Todo, rect: DOMRect) => void;
}

/**
 * DnD 로직을 담당하는 래퍼 컴포넌트
 */
export function CalendarEvent({ todo, onClick }: SortableProps) {
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
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CalendarEventPresenter
        todo={todo}
        onClick={onClick}
        isDragging={isDragging}
        dragProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
