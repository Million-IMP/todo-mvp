'use client';
import { useState, useMemo } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects,
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
import { CalendarEvent } from './CalendarEvent';
import { todosAPI } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_VISIBLE = 3;

interface Props {
  todos: Todo[];
  onEventClick: (todo: Todo, rect: DOMRect) => void;
  onSlotClick: (date: string) => void;
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 클릭과 드래그 구분
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

  // 정렬된 투두 목록 계산 (sort_order -> created_at 순)
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      // 드래그된 아이템이 속한 날짜 찾기
      const activeTodo = todos.find(t => t.id === active.id);
      if (!activeTodo?.due_date) return;
      
      const dateKey = activeTodo.due_date.slice(0, 10);
      const dateTodos = todosByDate[dateKey] ?? [];
      
      const oldIndex = dateTodos.findIndex(t => t.id === active.id);
      const newIndex = dateTodos.findIndex(t => t.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(dateTodos, oldIndex, newIndex);
        
        // 낙관적 업데이트를 위해 쿼리 데이터 미리 수정 가능하지만, 
        // 여기서는 단순함을 위해 API 호출 후 무효화
        const updates = newOrder.map((todo, index) => ({
          id: todo.id,
          sort_order: index,
        }));

        try {
          await todosAPI.updateSortOrders(updates);
          queryClient.invalidateQueries({ queryKey: ['todos'] });
        } catch (error) {
          console.error('Failed to update sort orders:', error);
          alert('순서 변경에 실패했습니다.');
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {DAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-semibold py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
              <div key={key}
                onClick={() => onSlotClick(key)}
                className={`border-r border-b border-gray-200 dark:border-gray-700 p-1 overflow-hidden cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors min-h-0
                  ${!isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''}
                  ${col === 6 ? 'border-r-0' : ''}
                `}>
                {/* Date number */}
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

                {/* Events */}
                <div className="space-y-0.5 min-h-[20px]">
                  <SortableContext 
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
              </div>
            );
          })}
        </div>
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
