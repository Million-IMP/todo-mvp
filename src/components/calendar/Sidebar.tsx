'use client';
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCalendar } from '@/contexts/CalendarContext';
import { CATEGORY_CONFIG, toKey } from './constants';
import { Category, Todo } from '@/types';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { requestNotificationPermission } from '@/lib/notifications';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  onCreateClick: () => void;
  todoDates: Set<string>;
}

export default function Sidebar({ onCreateClick, todoDates }: Props) {
  const { 
    currentDate, setCurrentDate, 
    setViewMode, hiddenCategories, toggleCategory,
    selectedTags, toggleTag, resetFilters 
  } = useCalendar();
  const { connected, syncing, connect, disconnect, syncFromGoogle } = useGoogleCalendar();
  
  const [notifPermission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('Notification' in window)) setPermission('unsupported');
      else setPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotif = async () => {
    const granted = await requestNotificationPermission();
    if (granted) setPermission('granted');
    else setPermission(Notification.permission);
  };

  // 모든 투두에서 유니크 태그 추출
  const { data: todos = [] } = useQuery<Todo[]>({ queryKey: ['todos'] });
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    todos.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [todos]);

  const isFiltering = hiddenCategories.size > 0 || selectedTags.size > 0;

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
          {cells.map(({ date, current }) => {
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

      {/* Google Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">Google Calendar</p>
        {connected ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span className="text-xs text-gray-600 dark:text-gray-300">연동됨</span>
            </div>
            <button
              onClick={disconnect}
              disabled={syncing}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
            >
              연동 해제
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">Google Calendar 연동</span>
          </button>
        )}
        {connected && (
          <button
            onClick={() => syncFromGoogle()}
            disabled={syncing}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? '동기화 중...' : '구글 즉시동기화'}
          </button>
        )}
      </div>

      {/* Browser Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">알림 설정</p>
        {notifPermission === 'granted' ? (
          <div className="flex items-center gap-2 px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-xs text-gray-600 dark:text-gray-300">중요 일정 알림 활성화됨</span>
          </div>
        ) : notifPermission === 'denied' ? (
          <div className="px-2 py-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">알림이 차단됨</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight">브라우저 주소창 왼쪽의 자물쇠 아이콘을 눌러 알림 권한을 허용해주세요.</p>
          </div>
        ) : notifPermission === 'unsupported' ? (
          <p className="text-[10px] text-gray-400 px-2 py-1">이 브라우저는 알림을 지원하지 않습니다.</p>
        ) : (
          <button
            onClick={handleRequestNotif}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-xs font-medium">중요 일정 알림 받기</span>
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">카테고리</p>
          {isFiltering && (
            <button onClick={resetFilters} className="text-[10px] text-blue-500 hover:underline">초기화</button>
          )}
        </div>
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

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">태그</p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {allTags.map((tag) => {
              const active = selectedTags.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
