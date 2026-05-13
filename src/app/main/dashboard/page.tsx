'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { todosAPI } from '@/lib/supabase';
import { useAuth } from '@/stores/auth-store';
import { useTheme } from '@/stores/theme-store';
import { Todo, AiClientContext } from '@/types';
import { useCalendar } from '@/contexts/CalendarContext';
import { VIEW_LABELS, ViewType, toKey, CATEGORY_CONFIG } from '@/components/calendar/constants';
import { Category } from '@/types';

import Sidebar from '@/components/calendar/Sidebar';
import MonthView from '@/components/calendar/MonthView';
import WeekView from '@/components/calendar/WeekView';
import ScheduleView from '@/components/calendar/ScheduleView';
import EventModal from '@/components/calendar/EventModal';
import EventPopover from '@/components/calendar/EventPopover';
import AiPanel from '@/components/ai/AiPanel';
import { useAiStore } from '@/stores/ai-store';
import { useNotifications } from '@/hooks/useNotifications';
import { useRealtimeTodos } from '@/hooks/useRealtimeTodos';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { dark, toggle: toggleDark } = useTheme();
  const { setCollapsed } = useAiStore();
  const { viewMode, setViewMode, currentDate, setCurrentDate, sidebarOpen, setSidebarOpen, searchQuery, setSearchQuery } = useCalendar();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState<Partial<Todo> | undefined>();
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>();
  const [modalDefaultTime, setModalDefaultTime] = useState<string | undefined>();
  const [popoverTodo, setPopoverTodo] = useState<Todo | null>(null);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);

  const { data: allTodos = [] } = useQuery<Todo[]>({
    queryKey: ['todos', user?.id],
    queryFn: () => todosAPI.list(user!.id),
    enabled: !!user,
  });

  useNotifications(allTodos);
  useRealtimeTodos(user?.id);
  const { syncCreate, syncUpdate, syncDelete, syncFromGoogle } = useGoogleCalendar();

  // 구글 → 앱 자동 폴링 (30초 주기 + 탭 포커스 복귀 시 즉시)
  useEffect(() => {
    if (!user) return;

    const pollSync = async () => {
      const result = await syncFromGoogle(true);
      if (result && (result.inserted + result.updated + result.deleted) > 0) {
        queryClient.invalidateQueries({ queryKey: ['todos'] });
      }
    };

    const interval = setInterval(pollSync, 30000);
    const onFocus = () => pollSync();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, syncFromGoogle, queryClient]);

  const filteredTodos = useMemo(() =>
    allTodos.filter((t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [allTodos, searchQuery]
  );

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof todosAPI.create>[1] & { title: string }) =>
      todosAPI.create(user!.id, data),
    onSuccess: async (createdTodo) => {
      await syncCreate(createdTodo);
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Todo> }) => todosAPI.update(id, updates),
    onSuccess: async (updatedTodo) => {
      await syncUpdate(updatedTodo);
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const todo = allTodos.find((t) => t.id === id);
      if (todo) await syncDelete(todo);
      return todosAPI.delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  const handleSaveEvent = (data: Partial<Todo> & { title: string }) => {
    if (data.id) {
      const { id, ...updates } = data;
      updateMutation.mutate({ id, updates });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEventClick = (todo: Todo, rect: DOMRect) => {
    setCollapsed(true);
    setPopoverTodo(todo);
    setPopoverRect(rect);
  };

  const handleSlotClick = (date: string, time?: string) => {
    setCollapsed(true);
    setModalInitial(undefined);
    setModalDefaultDate(date);
    setModalDefaultTime(time);
    setModalOpen(true);
  };

  const openCreate = () => {
    setCollapsed(true);
    setModalInitial(undefined);
    setModalDefaultDate(toKey(currentDate));
    setModalDefaultTime(undefined);
    setModalOpen(true);
  };

  // Navigate
  const navigate = (dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const headerTitle = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    }
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start); end.setDate(start.getDate() + 6);
      if (start.getMonth() === end.getMonth()) return `${start.getFullYear()}년 ${start.getMonth() + 1}월`;
      return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ~ ${end.getMonth() + 1}월`;
    }
    return `${y}년 ${m}월`;
  };

  const todoDates = useMemo(() => {
    const s = new Set<string>();
    allTodos.forEach((t) => { if (t.due_date) s.add(t.due_date.slice(0, 10)); });
    return s;
  }, [allTodos]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/auth/login';
  };

  // AI 패널에 전달할 캘린더 컨텍스트 (현재 날짜/뷰)
  const getAiContext = useCallback<() => AiClientContext>(() => ({
    today: toKey(new Date()),
    currentDate: toKey(currentDate),
    viewMode: viewMode as AiClientContext['viewMode'],
  }), [currentDate, viewMode]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <header className="flex items-center gap-2 px-4 h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        {/* Hamburger */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-300 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-1.5 mr-4 flex-shrink-0">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" className="fill-blue-600"/>
            <rect x="3" y="4" width="18" height="5" rx="1" className="fill-blue-700"/>
            <circle cx="8" cy="2" r="1.5" className="fill-gray-400"/>
            <circle cx="16" cy="2" r="1.5" className="fill-gray-400"/>
            <rect x="8" y="1" width="1.5" height="3" rx="0.75" className="fill-gray-400"/>
            <rect x="14.5" y="1" width="1.5" height="3" rx="0.75" className="fill-gray-400"/>
          </svg>
          <span className="text-lg font-normal text-gray-700 dark:text-gray-300 hidden sm:block">캘린더</span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={goToday}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 font-medium">
            오늘
          </button>
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        {/* Title */}
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 min-w-[140px]">{headerTitle()}</h2>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative hidden md:block">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색" className="pl-9 pr-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 rounded-full outline-none w-40 focus:w-56 transition-all text-gray-700 dark:text-gray-300" />
        </div>

        {/* View selector */}
        <div className="hidden sm:flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {(['day','week','month','schedule'] as ViewType[]).map((v) => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${viewMode === v ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        {/* Stats link */}
        <Link href="/main/stats"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-400" title="통계">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </Link>

        {/* Dark mode */}
        <button onClick={toggleDark}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-yellow-400 text-sm flex-shrink-0">
          {dark ? '☀️' : '🌙'}
        </button>

        {/* Logout */}
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          <span className="hidden sm:block">로그아웃</span>
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="hidden md:block border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 overflow-y-auto flex-shrink-0">
            <Sidebar onCreateClick={openCreate} todoDates={todoDates} />
          </div>
        )}

        {/* Main view */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {viewMode === 'month' && (
            <MonthView
              todos={filteredTodos}
              onEventClick={handleEventClick}
              onSlotClick={(date) => handleSlotClick(date)}
            />
          )}
          {viewMode === 'week' && (
            <WeekView
              todos={filteredTodos}
              days={7}
              onEventClick={handleEventClick}
              onSlotClick={handleSlotClick}
            />
          )}
          {viewMode === 'day' && (
            <WeekView
              todos={filteredTodos}
              days={1}
              onEventClick={handleEventClick}
              onSlotClick={handleSlotClick}
            />
          )}
          {viewMode === 'schedule' && (
            <ScheduleView
              todos={filteredTodos}
              onEventClick={handleEventClick}
            />
          )}
        </div>
      </div>

      {/* ── AI Panel (하단 고정, 접기/펼치기) ── */}
      <AiPanel getContext={getAiContext} />

      {/* Event modal */}
      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEvent}
        initial={modalInitial}
        defaultDate={modalDefaultDate}
        defaultStartTime={modalDefaultTime}
      />

      {/* Event popover */}
      {popoverTodo && popoverRect && (
        <EventPopover
          todo={popoverTodo}
          anchorRect={popoverRect}
          onClose={() => setPopoverTodo(null)}
          onEdit={() => {
            setModalInitial(popoverTodo);
            setModalOpen(true);
            setPopoverTodo(null);
          }}
          onDelete={() => {
            if (confirm('정말 삭제하시겠습니까?')) {
              deleteMutation.mutate(popoverTodo.id);
              setPopoverTodo(null);
            }
          }}
          onToggle={() => {
            updateMutation.mutate({ id: popoverTodo.id, updates: { completed: !popoverTodo.completed } });
          }}
          onSave={(updates) => {
            updateMutation.mutate({ id: popoverTodo.id, updates });
          }}
        />
      )}
    </div>
  );
}
