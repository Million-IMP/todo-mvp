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
  selectedTags: Set<string>;
  toggleTag: (tag: string) => void;
  resetFilters: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const CalendarContext = createContext<CalendarContextType | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hiddenCategories, setHiddenCategories] = useState<Set<Category>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (c: Category) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const resetFilters = () => {
    setHiddenCategories(new Set());
    setSelectedTags(new Set());
    setSearchQuery('');
  };

  return (
    <CalendarContext.Provider value={{
      viewMode, setViewMode,
      currentDate, setCurrentDate,
      sidebarOpen, setSidebarOpen,
      hiddenCategories, toggleCategory,
      selectedTags, toggleTag,
      resetFilters,
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
