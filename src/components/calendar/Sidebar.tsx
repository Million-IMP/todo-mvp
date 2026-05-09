'use client';
import { useState } from 'react';
import { useCalendar } from '@/contexts/CalendarContext';
import { CATEGORY_CONFIG, toKey } from './constants';
import { Category } from '@/types';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  onCreateClick: () => void;
  todoDates: Set<string>;
}

export default function Sidebar({ onCreateClick, todoDates }: Props) {
  const { currentDate, setCurrentDate, setViewMode, hiddenCategories, toggleCategory } = useCalendar();
  const today = new Date();
  const todayKey = toKey(today);

  const [miniDate, setMiniDate] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const year = miniDate.getFullYear();
  const month = miniDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const cells: { date: Date; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, prevDays - i), current: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), current: true });
  while (cells.length % 7 !== 0)
    cells.push({ date: new Date(year, month + 1, cells.length - daysInMonth - firstDay + 1), current: false });

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col gap-4 py-4 px-3">
      {/* Create button */}
      <button
        onClick={onCreateClick}
        className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition-all hover:shadow-lg"
      >
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        만들기
      </button>

      {/* Mini calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {year}년 {month + 1}월
          </span>
          <div className="flex gap-1">
            <button onClick={() => setMiniDate(new Date(year, month - 1, 1))}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={() => setMiniDate(new Date(year, month + 1, 1))}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div key={d} className={`text-center text-[10px] font-medium py-0.5 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map(({ date, current }, i) => {
            const key = toKey(date);
            const isToday = key === todayKey;
            const isSel = toKey(date) === toKey(currentDate);
            const hasTodos = todoDates.has(key);
            return (
              <button key={key} onClick={() => handleDayClick(date)}
                className={`w-7 h-7 mx-auto flex flex-col items-center justify-center rounded-full text-[11px] font-medium transition
                  ${!current ? 'opacity-30' : ''}
                  ${isToday && !isSel ? 'text-blue-600 font-bold' : ''}
                  ${isSel ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}
                `}>
                {date.getDate()}
                {hasTodos && !isSel && <span className="w-1 h-1 rounded-full bg-blue-500 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">카테고리</p>
        <div className="space-y-1">
          {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([cat, cfg]) => {
            const hidden = hiddenCategories.has(cat);
            return (
              <button key={cat} onClick={() => toggleCategory(cat)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <span className="w-3 h-3 rounded-sm flex-shrink-0 transition"
                  style={{ backgroundColor: hidden ? 'transparent' : cfg.color, border: `2px solid ${cfg.color}` }} />
                <span className={`text-sm ${hidden ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
