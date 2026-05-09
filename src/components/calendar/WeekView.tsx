'use client';
import { useEffect, useRef } from 'react';
import { Todo } from '@/types';
import { CATEGORY_CONFIG, HOUR_HEIGHT, HOURS, toKey, fmtTime, toMinutes } from './constants';
import { useCalendar } from '@/contexts/CalendarContext';

interface DayColumn { date: Date; key: string; timedTodos: Todo[]; allDayTodos: Todo[] }
interface LayoutEvent { todo: Todo; col: number; totalCols: number }

function layoutDay(todos: Todo[]): LayoutEvent[] {
  if (!todos.length) return [];
  const sorted = [...todos].sort((a, b) => toMinutes(a.start_time || '00:00') - toMinutes(b.start_time || '00:00'));
  const cols: Todo[][] = [];
  const result: LayoutEvent[] = [];

  for (const todo of sorted) {
    const startM = toMinutes(todo.start_time || '00:00');
    const endM = toMinutes(todo.end_time || todo.start_time || '00:30') || startM + 30;
    let placed = false;
    for (let ci = 0; ci < cols.length; ci++) {
      const last = cols[ci][cols[ci].length - 1];
      const lastEnd = toMinutes(last.end_time || last.start_time || '00:30') || toMinutes(last.start_time || '00:00') + 30;
      if (lastEnd <= startM) { cols[ci].push(todo); placed = true; result.push({ todo, col: ci, totalCols: 0 }); break; }
    }
    if (!placed) { cols.push([todo]); result.push({ todo, col: cols.length - 1, totalCols: 0 }); }
    void endM;
  }
  result.forEach((r) => { r.totalCols = cols.length; });
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

  // Build week days
  const startOfWeek = new Date(currentDate);
  if (days === 7) {
    const dow = currentDate.getDay();
    startOfWeek.setDate(currentDate.getDate() - dow);
  } else {
    startOfWeek.setDate(currentDate.getDate());
  }

  const dayColumns: DayColumn[] = Array.from({ length: days }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const key = toKey(date);
    const dayTodos = todos.filter((t) => t.due_date?.slice(0, 10) === key && !hiddenCategories.has(t.category));
    return {
      date, key,
      timedTodos: dayTodos.filter((t) => t.start_time),
      allDayTodos: dayTodos.filter((t) => !t.start_time),
    };
  });

  useEffect(() => {
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
    onSlotClick(key, `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Column headers */}
      <div className="flex flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="w-14 flex-shrink-0" />
        {dayColumns.map(({ date, key }, i) => {
          const isToday = key === todayKey;
          return (
            <div key={key} className={`flex-1 text-center py-2 border-l border-gray-200 dark:border-gray-700 ${i === 0 && days === 7 ? '' : ''}`}>
              <div className={`text-[11px] font-medium uppercase tracking-wide mb-0.5 ${
                date.getDay() === 0 ? 'text-red-500' : date.getDay() === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {['일','월','화','수','목','금','토'][date.getDay()]}
              </div>
              <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold transition
                ${isToday ? 'bg-blue-600 text-white' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      {dayColumns.some((d) => d.allDayTodos.length > 0) && (
        <div className="flex flex-shrink-0 border-b border-gray-200 dark:border-gray-700 min-h-[32px]">
          <div className="w-14 flex-shrink-0 flex items-center justify-end pr-2">
            <span className="text-[10px] text-gray-400">종일</span>
          </div>
          {dayColumns.map(({ key, allDayTodos }) => (
            <div key={key} className="flex-1 border-l border-gray-200 dark:border-gray-700 p-0.5 space-y-0.5">
              {allDayTodos.map((todo) => {
                const cfg = CATEGORY_CONFIG[todo.category];
                return (
                  <button key={todo.id} onClick={(e) => onEventClick(todo, e.currentTarget.getBoundingClientRect())}
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

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ height: `${HOUR_HEIGHT * 24}px` }}>
          {/* Time labels */}
          <div className="w-14 flex-shrink-0 relative">
            {HOURS.map((h) => (
              <div key={h} className="absolute right-2 text-[10px] text-gray-400 dark:text-gray-500 leading-none"
                style={{ top: `${h * HOUR_HEIGHT - 6}px` }}>
                {h === 0 ? '' : h < 12 ? `오전 ${h}시` : h === 12 ? '오후 12시' : `오후 ${h - 12}시`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dayColumns.map(({ date, key, timedTodos }, di) => {
            const isToday = key === todayKey;
            const laid = layoutDay(timedTodos);

            return (
              <div key={key} className="flex-1 relative border-l border-gray-200 dark:border-gray-700">
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div key={h} className="absolute w-full border-t border-gray-100 dark:border-gray-800"
                    style={{ top: `${h * HOUR_HEIGHT}px` }}>
                    <div className="absolute w-full border-t border-gray-50 dark:border-gray-800/50 border-dashed"
                      style={{ top: `${HOUR_HEIGHT / 2}px` }} />
                  </div>
                ))}

                {/* Click zones per hour */}
                {HOURS.map((h) => (
                  <div key={h} className="absolute w-full cursor-pointer hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
                    style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                    onClick={(e) => handleSlotClick(key, h, e)} />
                ))}

                {/* Current time line */}
                {isToday && isCurrentWeek && (
                  <div className="absolute w-full z-10 pointer-events-none" style={{ top: `${nowTop}px` }}>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Events */}
                {laid.map(({ todo, col, totalCols }) => {
                  const cfg = CATEGORY_CONFIG[todo.category];
                  const startM = toMinutes(todo.start_time!);
                  const endM = todo.end_time ? toMinutes(todo.end_time) : startM + 60;
                  const duration = Math.max(30, endM - startM);
                  const top = (startM / 60) * HOUR_HEIGHT;
                  const height = Math.max(22, (duration / 60) * HOUR_HEIGHT);
                  const width = `calc(${100 / totalCols}% - 4px)`;
                  const left = `calc(${(col / totalCols) * 100}% + 2px)`;
                  const opacity = todo.completed ? 0.5 : 1;

                  return (
                    <button
                      key={todo.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(todo, e.currentTarget.getBoundingClientRect()); }}
                      style={{ top, height, width, left, opacity, backgroundColor: cfg.color, position: 'absolute', zIndex: 5 }}
                      className="rounded-lg px-2 py-1 text-white text-xs font-medium text-left overflow-hidden hover:brightness-90 transition-all shadow-sm cursor-pointer">
                      <div className="font-semibold truncate leading-tight">{todo.completed ? '✓ ' : ''}{todo.title}</div>
                      {height > 40 && <div className="opacity-80 text-[10px]">{fmtTime(todo.start_time)}{todo.end_time ? ` ~ ${fmtTime(todo.end_time)}` : ''}</div>}
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
