'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Todo } from '@/types';
import { CATEGORY_CONFIG, fmtTime } from './constants';

interface PresenterProps {
  todo: Todo;
  isDragging?: boolean;
  isOverlay?: boolean;
}

/**
 * 이벤트 바 순수 렌더링 컴포넌트
 */
export function CalendarEventPresenter({ 
  todo, 
  isDragging, 
  isOverlay,
}: PresenterProps) {
  const cfg = CATEGORY_CONFIG[todo.category];

  return (
    <div
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
      className={`w-full flex items-center rounded px-1.5 py-0.5 text-xs font-medium truncate select-none ${
        isDragging ? 'opacity-30' : 'opacity-100'
      } ${
        isOverlay 
          ? 'shadow-xl ring-2 ring-blue-500 z-[100] scale-105 cursor-grabbing' 
          : 'cursor-grab active:cursor-grabbing hover:brightness-95 transition-all'
      }`}
    >
      {todo.start_time && (
        <span className="mr-1 opacity-75 flex-shrink-0">
          {fmtTime(todo.start_time).replace('오전 ', '').replace('오후 ', '')}
        </span>
      )}
      {todo.completed ? '✓ ' : ''}
      {todo.recurrence && todo.recurrence.type !== 'none' && (
        <span className="mr-0.5 opacity-75" title={`반복: ${todo.recurrence.type}`}>🔄</span>
      )}
      <span className="truncate">{todo.title}</span>
    </div>
  );
}

interface SortableProps {
  todo: Todo;
  onClick: (todo: Todo, rect: DOMRect) => void;
}

/**
 * DnD 래퍼 컴포넌트
 *
 * 핵심 원칙: dnd-kit의 listeners를 절대 래핑/수정하지 않음
 *  - listeners를 그대로 스프레드하여 dnd-kit이 완전히 제어
 *  - 브라우저 제스처 차단은 CSS로만 처리 (touch-action + overscroll-behavior)
 *  - 클릭 vs 드래그 구분은 PointerSensor의 distance:8 제약이 처리
 *  - 드래그 후 클릭 억제만 수동으로 관리
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

  // 드래그 직후 클릭 억제
  const justDraggedRef = useRef(false);

  useEffect(() => {
    if (isDragging) {
      justDraggedRef.current = true;
    } else if (justDraggedRef.current) {
      const timer = setTimeout(() => {
        justDraggedRef.current = false;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isDragging]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // 셀의 onClick(만들기 모달) 전파 차단
    e.stopPropagation();
    // 드래그 직후면 클릭 무시
    if (justDraggedRef.current) return;
    onClick(todo, e.currentTarget.getBoundingClientRect());
  }, [onClick, todo]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // 터치 디바이스에서 브라우저 기본 제스처(스크롤, 줌, 스와이프) 차단
    touchAction: 'none' as const,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      // dnd-kit의 속성/리스너를 수정 없이 그대로 적용
      {...attributes}
      {...listeners}
      // 클릭 이벤트만 별도 핸들링 (dnd-kit은 onClick을 사용하지 않으므로 충돌 없음)
      onClick={handleClick}
    >
      <CalendarEventPresenter
        todo={todo}
        isDragging={isDragging}
      />
    </div>
  );
}
