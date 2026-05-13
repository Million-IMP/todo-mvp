'use client';
import { useState, useMemo, useRef, useCallback } from 'react';
import { 
  DndContext, 
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  useDroppable,
  CollisionDetection,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Todo } from '@/types';
import { CATEGORY_CONFIG, toKey, fmtTime } from './constants';
import { useCalendar } from '@/contexts/CalendarContext';
import { CalendarEvent, CalendarEventPresenter } from './CalendarEvent';
import { todosAPI } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_VISIBLE = 3;

interface Props {
  todos: Todo[];
  onEventClick: (todo: Todo, rect: DOMRect) => void;
  onSlotClick: (date: string) => void;
}

/**
 * 커스텀 충돌 감지 전략
 * 
 * 문제: 기본 충돌 감지는 sortable 아이템(투두)과 droppable(날짜 셀)이 겹칠 때
 *       아이템을 우선 매칭해서, 다른 날짜 셀로의 드롭이 감지되지 않음
 * 
 * 전략:
 *  1. pointerWithin으로 "date-" 프리픽스의 droppable만 필터링하여 타겟 날짜 셀 결정
 *  2. 타겟 셀 내에 sortable 아이템이 있으면 rectIntersection으로 가장 가까운 아이템 반환
 *  3. 아이템이 없으면 (빈 날짜) droppable 셀 자체를 반환
 */
const calendarCollisionDetection: CollisionDetection = (args) => {
  // 1단계: pointerWithin으로 포인터가 위치한 모든 드롭 가능 영역 탐색
  const pointerCollisions = pointerWithin(args);
  
  // "date-" droppable 중 포인터가 위치한 셀 찾기
  const dateCollision = pointerCollisions.find(
    c => String(c.id).startsWith('date-')
  );
  
  if (!dateCollision) {
    // 날짜 셀 위에 없으면 기본 rectIntersection 사용
    return rectIntersection(args);
  }

  // 2단계: 해당 날짜 셀 내부의 sortable 아이템만 대상으로 충돌 계산
  // 드래그 중인 아이템 자신은 제외
  const sortableCollisions = pointerCollisions.filter(
    c => !String(c.id).startsWith('date-') && c.id !== args.active.id
  );

  // 같은 날짜 내 다른 아이템이 있으면 그 아이템을 반환 (순서 변경)
  if (sortableCollisions.length > 0) {
    return sortableCollisions;
  }

  // 아이템이 없거나 빈 날짜 셀이면 → 날짜 셀 자체를 반환 (날짜 이동)
  return [dateCollision];
};

/**
 * 각 날짜 셀을 드롭 가능한 영역으로 만드는 컴포넌트
 * isOver가 true면 파란 하이라이트로 시각적 피드백 제공
 */
function DroppableDateCell({ 
  dateKey, 
  children, 
  className, 
  onClick,
  isHighlighted,
}: { 
  dateKey: string; 
  children: React.ReactNode; 
  className: string;
  onClick: () => void;
  isHighlighted: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `date-${dateKey}`,
  });

  const showHighlight = isOver || isHighlighted;

  return (
    <div 
      ref={setNodeRef} 
      onClick={onClick}
      className={`${className} transition-all duration-150 ${
        showHighlight 
          ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/60 dark:bg-blue-900/30' 
          : ''
      }`}
    >
      {children}
    </div>
  );
}

export default function MonthView({ todos, onEventClick, onSlotClick }: Props) {
  const queryClient = useQueryClient();
  const { currentDate, setCurrentDate, setViewMode, hiddenCategories } = useCalendar();
  const today = new Date();
  const todayKey = toKey(today);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  // PointerSensor: 마우스·터치 통합 처리
  // 8px 이상 움직여야 드래그 시작 → 그 미만은 클릭으로 처리 (구글 캘린더 방식)
  // CalendarEvent에서 onPointerDown에 e.preventDefault()를 호출하므로 PointerSensor 필수
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const cells: Date[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push(new Date(year, month - 1, prevDays - i));
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(new Date(year, month + 1, cells.length - daysInMonth - firstDay + 1));

  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [todos]);

  const todosByDate = useMemo(() => {
    return sortedTodos.reduce<Record<string, Todo[]>>((acc, t) => {
      if (!t.due_date || hiddenCategories.has(t.category)) return acc;
      const k = t.due_date.slice(0, 10);
      acc[k] = acc[k] ? [...acc[k], t] : [t];
      return acc;
    }, {});
  }, [sortedTodos, hiddenCategories]);

  const [moreDate, setMoreDate] = useState<string | null>(null);
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);
  // 드래그 중 현재 위치한 날짜 셀 (하이라이트용)
  const [overDateKey, setOverDateKey] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = (event: DragStartEvent) => {
    const todo = todos.find(t => t.id === event.active.id);
    if (todo) {
      setActiveTodo(todo);
      isDraggingRef.current = true;
    }
  };

  /**
   * 드래그 중 현재 위치한 날짜 셀을 추적하여 하이라이트 업데이트
   */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverDateKey(null);
      return;
    }

    const overId = String(over.id);
    if (overId.startsWith('date-')) {
      setOverDateKey(overId.replace('date-', ''));
    } else {
      // over가 투두 아이템이면 → 그 아이템이 속한 날짜를 하이라이트
      const overTodo = todos.find(t => t.id === over.id);
      if (overTodo?.due_date) {
        setOverDateKey(overTodo.due_date.slice(0, 10));
      }
    }
  }, [todos]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTodo(null);
    setOverDateKey(null);

    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);

    if (!over) return;

    const activeItem = todos.find(t => t.id === active.id);
    if (!activeItem?.due_date) return;

    const sourceDateKey = activeItem.due_date.slice(0, 10);
    const overId = String(over.id);

    // over.id가 "date-YYYY-MM-DD" → 날짜 셀 위에 드롭
    // 그렇지 않으면 → 다른 투두 아이템 위에 드롭
    let targetDateKey: string;

    if (overId.startsWith('date-')) {
      targetDateKey = overId.replace('date-', '');
    } else {
      const overTodo = todos.find(t => t.id === over.id);
      if (!overTodo?.due_date) return;
      targetDateKey = overTodo.due_date.slice(0, 10);
    }

    // 다른 날짜로 이동
    if (sourceDateKey !== targetDateKey) {
      try {
        await todosAPI.update(String(active.id), { due_date: targetDateKey });
        queryClient.invalidateQueries({ queryKey: ['todos'] });
      } catch (error) {
        console.error('날짜 이동 실패:', error);
      }
      return;
    }

    // 같은 날짜 내 순서 변경
    if (!overId.startsWith('date-') && active.id !== over.id) {
      const dateTodos = todosByDate[sourceDateKey] ?? [];
      const oldIndex = dateTodos.findIndex(t => t.id === active.id);
      const newIndex = dateTodos.findIndex(t => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(dateTodos, oldIndex, newIndex);
        const updates = newOrder.map((todo, index) => ({
          id: todo.id,
          sort_order: index,
        }));

        try {
          await todosAPI.updateSortOrders(updates);
          queryClient.invalidateQueries({ queryKey: ['todos'] });
        } catch (error) {
          console.error('순서 변경 실패:', error);
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTodo(null);
    setOverDateKey(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleCellClick = (key: string) => {
    if (isDraggingRef.current) return;
    onSlotClick(key);
  };

  return (
    <div className="flex flex-col h-full select-none">
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {DAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-semibold py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>{d}</div>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={calendarCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 grid grid-cols-7 overflow-hidden" style={{ gridTemplateRows: `repeat(${cells.length / 7}, 1fr)` }}>
          {cells.map((date, idx) => {
            const key = toKey(date);
            const isCurrentMonth = date.getMonth() === month;
            const isToday = key === todayKey;
            const dayTodos = todosByDate[key] ?? [];
            const visible = dayTodos.slice(0, MAX_VISIBLE);
            const overflow = dayTodos.length - MAX_VISIBLE;
            const col = idx % 7;

            return (
              <DroppableDateCell
                key={key}
                dateKey={key}
                onClick={() => handleCellClick(key)}
                isHighlighted={overDateKey === key}
                className={`border-r border-b border-gray-200 dark:border-gray-700 p-1 overflow-hidden cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 min-h-0 relative
                  ${!isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''}
                  ${col === 6 ? 'border-r-0' : ''}
                `}
              >
                <div className="flex items-center justify-end mb-0.5">
                  <span
                    onClick={(e) => { e.stopPropagation(); setCurrentDate(date); setViewMode('day'); }}
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium cursor-pointer transition hover:bg-gray-200 dark:hover:bg-gray-700
                      ${isToday ? 'bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500' : ''}
                      ${!isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : isToday ? '' : col === 0 ? 'text-red-500' : col === 6 ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}
                    `}>
                    {date.getDate()}
                  </span>
                </div>

                <div className="space-y-0.5 min-h-[20px]">
                  <SortableContext 
                    id={`sortable-${key}`}
                    items={visible.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {visible.map((todo) => (
                      <CalendarEvent 
                        key={todo.id} 
                        todo={todo} 
                        onClick={onEventClick} 
                      />
                    ))}
                  </SortableContext>
                  
                  {overflow > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMoreDate(moreDate === key ? null : key); }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-1">
                      +{overflow}개 더보기
                    </button>
                  )}
                </div>
              </DroppableDateCell>
            );
          })}
        </div>
        
        <DragOverlay dropAnimation={null}>
          {activeTodo ? (
            <div className="w-[140px] pointer-events-none">
              <CalendarEventPresenter 
                todo={activeTodo} 
                isOverlay 
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* More popover */}
      {moreDate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={() => setMoreDate(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-[240px] max-w-xs"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {new Date(moreDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </span>
              <button onClick={() => setMoreDate(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
            </div>
            <div className="space-y-1">
              {(todosByDate[moreDate] ?? []).map((todo) => {
                const cfg = CATEGORY_CONFIG[todo.category];
                return (
                  <button key={todo.id}
                    onClick={(e) => { setMoreDate(null); onEventClick(todo, e.currentTarget.getBoundingClientRect()); }}
                    className="w-full text-left rounded-lg px-2 py-1.5 text-sm font-medium truncate transition hover:brightness-90"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {todo.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
