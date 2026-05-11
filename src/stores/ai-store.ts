'use client';
// Design Ref: §2.3 — 패널 상태 + 활성 대화 ID
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AiState {
  /** 패널 접힘/펼침 (localStorage 영속) */
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;

  /** 현재 활성 대화 ID (세션 스코프, 영속 X) */
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      collapsed: true,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      activeConversationId: null,
      setActiveConversationId: (id) => set({ activeConversationId: id }),
    }),
    {
      name: 'ai-store',
      // 활성 대화 ID는 세션 간 보존하지 않음 — 매번 최신 대화 자동 선택
      partialize: (s) => ({ collapsed: s.collapsed }),
    },
  ),
);
