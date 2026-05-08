import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  status: 'all' | 'active' | 'completed';
  search: string;
  setStatus: (status: 'all' | 'active' | 'completed') => void;
  setSearch: (search: string) => void;
}

export const useFilter = create<FilterState>()(
  persist(
    (set) => ({
      status: 'all',
      search: '',
      setStatus: (status) => set({ status }),
      setSearch: (search) => set({ search }),
    }),
    {
      name: 'filter-store',
    }
  )
);
