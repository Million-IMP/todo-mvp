'use client';
import { useLayoutEffect, useRef } from 'react';
import { Todo } from '@/types';
import { CATEGORY_CONFIG, HOUR_HEIGHT, HOURS, toKey, fmtTime, toMinutes } from './constants';
import { useCalendar } from '@/contexts/CalendarContext';

interface DayColumn { date: Date; key: string; timedTodos: Todo[]; allDayTodos: Todo[] }
interface LayoutEvent { todo: Todo; col: number; totalCols: number }

function getEndM(todo: Todo) {
  const startM = toMinutes(todo.start_time || '00:00');
  const rawEnd = toMinutes(todo.end_time || '00:00');
  return rawEnd > startM ? rawEnd : startM + 30;
}

function layoutDay(todos: Todo[]): LayoutEvent[] {
  if (!todos.length) return [];
  const sorted = [...todos].sort((a, b) => toMinutes(a.start_time || '00:00') - toMinutes(b.start_time || '00:00'));
  const colEnds: number[] = [];
  const result: LayoutEvent[] = [];

  for (const todo of sorted) {
    const startM = toMinutes(todo.start_time || '00:00');
    const endM = getEndM(todo);
    let col = colEnds.findIndex((e) => e <= startM);
    if (col === -1) col = colEnds.length;
    colEnds[col] = endM;
    result.push({ todo, col, totalCols: 0 });
  }

  for (let i = 0; i < result.length; i++) {
    const sI = toMinutes(result[i].todo.start_time || '00:00');
    const eI = getEndM(result[i].todo);
    let maxCol = result[i].col;
    for (let j = 0; j < result.length; j++) {
      if (i === j) continue;
      const sJ = toMinutes(result[j].todo.start_time || '00:00');
      const eJ = getEndM(result[j].todo);
      if (sJ < eI && eJ > sI) maxCol = Math.max(maxCol, result[j].col);
    }
    result[i].totalCols = maxCol + 1;
  }

  return result;
}

interface Props {
  todos: Todo[];
  days?: number;
  onEventClick: (todo: Todo, rect: DOMRect) => void;
  onSlotClick: (date: string, time: string) => void;
}

export default function WeekView({ todos, days = 7, onEventClick, onSlotClick }: Props) {
  const { currentDate, hiddenCategories } = useCalendar();
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const todayKey = toKey(today);

  const startOfWeek = new Date(currentDate);
  if (days === 7) {
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  }

  const dayColumns: DayColumn[] = Array.from({ length: days }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const key = toKey(date);
    const dayTodos = todos.filter(
      (t) => t.due_date?.slice(0, 10) === key && !hiddenCategories.has(t.category)
    );
    return {
      date, key,
      timedTodos: dayTodos.filter((t) => t.start_time),
      allDayTodos: dayTodos.filter((t) => !t.start_time),
    };
  });

  const hasAllDay = dayColumns.some((d) => d.allDayTodos.length > 0);

  // Scroll to current time on mount
  useLayoutEffect(() => {
    const now = new Date();
    const scrollTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT - 120;
    scrollRef.current?.scrollTo({ top: Math.max(0, scrollTop), behavior: 'instant' as ScrollBehavior });
  }, []);

  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
  const isCurrentWeek = dayColumns.some((d) => d.key === todayKey);

  const handleSlotClick = (key: string, hour: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const clickedMinute = Math.floor((relY / HOUR_HEIGHT + hour) * 60 / 30) * 30;
    const h = Math.floor(clickedMinute / 60);
    const m = clickedMinute % 60;
    onSlotClick(key, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  return (
    // Single scroll container — headers are sticky inside so column widths
    // are always identical (no scrollbar-offset mismatch).
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto time-grid-scroll">

      {/* ── Sticky header block (day names + optional all-day row) ── */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Day name row */}
        <div className="flex">
          <div className="w-14 flex-shrink-0" />
          {dayColumns.map(({ date, key }) => {
            const isToday = key === todayKey;
            return (
              <div key={key} className="flex-1 min-w-0 text-center py-2 border-l border-gray-200 dark:border-gray-700">
                <div className={`text-[11px] font-medium uppercase tracking-wide mb-0.5 ${
                  date.getDay() === 0 ? 'text-red-500'
                  : date.getDay() === 6 ? 'text-blue-500'
                  : 'text-gray-500 dark:text-gray-400'}`}>
                  {['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}
                </div>
                <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold transition
                  ${isToday
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day row (only when there are all-day events) */}
        {hasAllDay && (
          <div className="flex border-t border-gray-200 dark:border-gray-700">
            <div className="w-14 flex-shrink-0 flex items-center justify-end pr-2 py-1">
              <span className="text-[10px] text-gray-400">종일</span>
            </div>
            {dayColumns.map(({ key, allDayTodos }) => (
              <div key={key} className="flex-1 min-w-0 border-l border-gray-200 dark:border-gray-700 p-0.5 space-y-0.5 min-h-[28px]">
                {allDayTodos.map((todo) => {
                  const cfg = CATEGORY_CONFIG[todo.category];
                  return (
                    <button
                      key={todo.id}
                      onClick={(e) => onEventClick(todo, e.currentTarget.getBoundingClientRect())}
                      className="w-full text-left rounded px-1.5 py-0.5 text-xs font-medium truncate"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      {todo.title}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Time grid ── */}
      <div className="flex" style={{ height: `${HOUR_HEIGHT * 24}px` }}>
        {/* Time labels */}
        <div className="w-14 flex-shrink-0 relative select-none">
          {HOURS.map((h) => (
            <div key={h}
              className="absolute right-2 text-[10px] text-gray-400 dark:text-gray-500 leading-none"
              style={{ top: `${h * HOUR_HEIGHT - 6}px` }}>
              {h === 0 ? '' : h < 12 ? `오전 ${h}시` : h === 12 ? '오후 12시' : `오후 ${h - 12}시`}
            </div>
          ))}
        </div>

        {/* Day columns — relative wrapper so the time line can span all columns */}
        <div className="flex flex-1 min-w-0 relative">
          {/* Current time line spanning all columns */}
          {isCurrentWeek && (
            <div
              className="absolute w-full z-10 pointer-events-none h-px bg-red-500"
              style={{ top: `${nowTop}px` }}
            />
          )}

        {dayColumns.map(({ key, timedTodos }) => {
          const isToday = key === todayKey;
          const laid = layoutDay(timedTodos);

          return (
            <div key={key} className="flex-1 min-w-0 relative border-l border-gray-200 dark:border-gray-700">
              {/* Hour lines */}
              {HOURS.map((h) => (
                <div key={h}
                  className="absolute w-full border-t border-gray-100 dark:border-gray-800"
                  style={{ top: `${h * HOUR_HEIGHT}px` }}>
                  <div className="absolute w-full border-t border-gray-50 dark:border-gray-800/50 border-dashed"
                    style={{ top: `${HOUR_HEIGHT / 2}px` }} />
                </div>
              ))}

              {/* Click zones */}
              {HOURS.map((h) => (
                <div key={h}
                  className="absolute w-full cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                  style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                  onClick={(e) => handleSlotClick(key, h, e)} />
              ))}

              {/* Current time dot — only on today column */}
              {isToday && isCurrentWeek && (
                <div
                  className="absolute z-10 pointer-events-none w-2.5 h-2.5 rounded-full bg-red-500"
                  style={{ top: `${nowTop - 5}px`, left: '-5px' }}
                />
              )}

              {/* Timed events */}
              {laid.map(({ todo, col, totalCols }) => {
                const cfg = CATEGORY_CONFIG[todo.category];
                const startM = toMinutes(todo.start_time!);
                const endM = todo.end_time ? toMinutes(todo.end_time) : startM + 60;
                const duration = Math.max(30, endM - startM);
                const top = (startM / 60) * HOUR_HEIGHT;
                const height = Math.max(22, (duration / 60) * HOUR_HEIGHT);
                const width = `calc(${100 / totalCols}% - 4px)`;
                const left = `calc(${(col / totalCols) * 100}% + 2px)`;

                return (
                  <button
                    key={todo.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(todo, e.currentTarget.getBoundingClientRect()); }}
                    style={{
                      top, height, width, left,
                      opacity: todo.completed ? 0.5 : 1,
                      backgroundColor: cfg.color,
                      position: 'absolute',
                      zIndex: 5,
                    }}
                    className="rounded-lg px-2 py-1 text-white text-xs font-medium text-left overflow-hidden hover:brightness-90 transition-all shadow-sm cursor-pointer">
                    <div className="font-semibold truncate leading-tight">
                      {todo.completed ? '✓ ' : ''}{todo.title}
                    </div>
                    {height > 40 && (
                      <div className="opacity-80 text-[10px]">
                        {fmtTime(todo.start_time)}{todo.end_time ? ` ~ ${fmtTime(todo.end_time)}` : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
