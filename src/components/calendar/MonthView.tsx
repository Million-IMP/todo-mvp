'use client';
import { useState } from 'react';
import { Todo } from '@/types';
import { CATEGORY_CONFIG, toKey, fmtTime } from './constants';
import { useCalendar } from '@/contexts/CalendarContext';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_VISIBLE = 3;

interface Props {
  todos: Todo[];
  onEventClick: (todo: Todo, rect: DOMRect) => void;
  onSlotClick: (date: string) => void;
}

export default function MonthView({ todos, onEventClick, onSlotClick }: Props) {
  const { currentDate, setCurrentDate, setViewMode, hiddenCategories } = useCalendar();
  const today = new Date();
  const todayKey = toKey(today);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells: Date[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push(new Date(year, month - 1, prevDays - i));
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(new Date(year, month + 1, cells.length - daysInMonth - firstDay + 1));

  const todosByDate = todos.reduce<Record<string, Todo[]>>((acc, t) => {
    if (!t.due_date || hiddenCategories.has(t.category)) return acc;
    const k = t.due_date.slice(0, 10);
    acc[k] = acc[k] ? [...acc[k], t] : [t];
    return acc;
  }, {});

  const [moreDate, setMoreDate] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full select-none">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {DAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-semibold py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(6,1fr)] overflow-hidden">
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
              <div className="space-y-0.5">
                {visible.map((todo) => {
                  const cfg = CATEGORY_CONFIG[todo.category];
                  return (
                    <button key={todo.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(todo, e.currentTarget.getBoundingClientRect()); }}
                      className="w-full text-left rounded px-1.5 py-0.5 text-xs font-medium truncate transition hover:brightness-90"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      {todo.start_time && <span className="mr-1 opacity-75">{fmtTime(todo.start_time).replace('오전 ', '').replace('오후 ', '')}</span>}
                      {todo.completed ? '✓ ' : ''}{todo.title}
                    </button>
                  );
                })}
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
