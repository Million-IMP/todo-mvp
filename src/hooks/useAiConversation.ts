'use client';
// Design Ref: §7.3 — 대화 목록/생성/삭제 + 활성 대화 ID 관리
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { aiFetch } from '@/lib/ai-fetch';
import { useAiStore } from '@/stores/ai-store';
import { useAuth } from '@/stores/auth-store';
import type { AiConversation } from '@/types';

type ConversationListItem = Pick<
  AiConversation,
  'id' | 'title' | 'created_at' | 'updated_at' | 'archived'
>;

export function useAiConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeConversationId, setActiveConversationId } = useAiStore();

  const conversationsQuery = useQuery<ConversationListItem[]>({
    queryKey: ['ai-conversations', user?.id],
    queryFn: async () => {
      const res = await aiFetch('/api/ai/conversations');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to load conversations');
      }
      const json = await res.json();
      return json.conversations as ConversationListItem[];
    },
    enabled: !!user,
  });

  // 활성 대화 ID 자동 선택: 가장 최근 대화 또는 빈 상태
  useEffect(() => {
    const list = conversationsQuery.data;
    if (!list) return;
    if (activeConversationId && list.some((c) => c.id === activeConversationId)) {
      return; // 현재 ID가 유효하면 유지
    }
    setActiveConversationId(list[0]?.id ?? null);
  }, [conversationsQuery.data, activeConversationId, setActiveConversationId]);

  const createMutation = useMutation({
    mutationFn: async (title?: string): Promise<ConversationListItem> => {
      const res = await aiFetch('/api/ai/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create conversation');
      }
      const json = await res.json();
      return json.conversation as ConversationListItem;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<ConversationListItem[]>(
        ['ai-conversations', user?.id],
        (prev) => (prev ? [created, ...prev] : [created]),
      );
      setActiveConversationId(created.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await aiFetch(`/api/ai/conversations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to delete conversation');
      }
    },
    onSuccess: (_v, id) => {
      queryClient.setQueryData<ConversationListItem[]>(
        ['ai-conversations', user?.id],
        (prev) => prev?.filter((c) => c.id !== id) ?? [],
      );
      queryClient.removeQueries({ queryKey: ['ai-messages', id] });
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
  });

  const startNewConversation = () => {
    // 새 대화는 첫 메시지 전송 시점에 서버에서 자동 생성됨.
    // 즉시 활성 ID를 null로 두어 다음 send가 새 대화를 만들도록 함.
    setActiveConversationId(null);
  };

  return {
    conversations: conversationsQuery.data ?? [],
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    activeConversationId,
    setActiveConversationId,
    createConversation: createMutation.mutateAsync,
    deleteConversation: deleteMutation.mutateAsync,
    startNewConversation,
  };
}
