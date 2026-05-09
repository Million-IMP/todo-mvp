'use client';

import { useState } from 'react';
import { Todo } from '@/types';
import DdayBadge from './DdayBadge';
import PriorityBadge from './PriorityBadge';

interface Props {
  todos: Todo[];
  onTodoClick: (todo: Todo) => void;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function fmtTime(v: string) {
  const [h, m] = v.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${ampm} ${hour}:${String(m).padStart(2, '0')}`;
}
const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-400',
  low: 'bg-gray-300',
};

export default function CalendarView({ todos, onTodoClick }: Props) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevDays - i), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, cells.length - daysInMonth - firstDay + 1), isCurrentMonth: false });
  }

  const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = toKey(today);

  const todosByDate = todos.reduce<Record<string, Todo[]>>((acc, t) => {
    if (!t.due_date) return acc;
    const key = t.due_date.slice(0, 10);
    acc[key] = acc[key] ? [...acc[key], t] : [t];
    return acc;
  }, {});

  const selectedTodos = selectedDate ? (todosByDate[selectedDate] ?? []) : [];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(todayKey); };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {year}년 {month + 1}월
          </span>
          <button onClick={goToday} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition">
            오늘
          </button>
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, isCurrentMonth }, i) => {
          const key = toKey(date);
          const dayTodos = todosByDate[key] ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const isWeekend = i % 7 === 0 || i % 7 === 6;

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(isSelected ? null : key)}
              className={`min-h-[52px] sm:min-h-[64px] p-1 rounded-lg flex flex-col items-center transition-all
                ${isCurrentMonth ? '' : 'opacity-30'}
                ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
              `}
            >
              <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5
                ${isToday ? 'bg-blue-600 text-white' : isWeekend && isCurrentMonth ? (i % 7 === 0 ? 'text-red-500' : 'text-blue-500') : 'text-gray-700 dark:text-gray-300'}
              `}>
                {date.getDate()}
              </span>
              <div className="flex flex-wrap gap-0.5 justify-center">
                {dayTodos.slice(0, 3).map((t) => (
                  <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority]} ${t.completed ? 'opacity-40' : ''}`} />
                ))}
                {dayTodos.length > 3 && (
                  <span className="text-[9px] text-gray-400">+{dayTodos.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택한 날짜의 Todo 목록 */}
      {selectedDate && (
        <div className="mt-2 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            <span className="ml-2 text-gray-400 font-normal">({selectedTodos.length}개)</span>
          </h3>
          {selectedTodos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">이 날의 Todo가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {selectedTodos.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onTodoClick(t)}
                  className="w-full text-left flex items-start gap-2 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                    ${t.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {t.completed && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${t.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{t.title}</span>
                    {(t.start_time || t.end_time) && (
                      <span className="ml-2 text-xs text-blue-500">
                        {t.start_time ? fmtTime(t.start_time) : '--:--'}
                        {t.end_time ? ` ~ ${fmtTime(t.end_time)}` : ''}
                      </span>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <PriorityBadge priority={t.priority} />
                      <DdayBadge dueDate={t.due_date} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
