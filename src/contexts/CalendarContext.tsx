'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { ViewType } from '@/components/calendar/constants';
import { Category } from '@/types';

interface CalendarContextType {
  viewMode: ViewType;
  setViewMode: (v: ViewType) => void;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  hiddenCategories: Set<Category>;
  toggleCategory: (c: Category) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const CalendarContext = createContext<CalendarContextType | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hiddenCategories, setHiddenCategories] = useState<Set<Category>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (c: Category) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  return (
    <CalendarContext.Provider value={{
      viewMode, setViewMode,
      currentDate, setCurrentDate,
      sidebarOpen, setSidebarOpen,
      hiddenCategories, toggleCategory,
      searchQuery, setSearchQuery,
    }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}
