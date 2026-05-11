'use client';
// Design Ref: §7.2 — pending tool 확인/실행/취소
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { aiFetch } from '@/lib/ai-fetch';
import { useAiStore } from '@/stores/ai-store';
import { useAuth } from '@/stores/auth-store';

interface UseAiToolsOptions {
  /** confirm 후 todos 캐시 갱신 콜백 */
  onApplied?: () => void;
}

export function useAiTools({ onApplied }: UseAiToolsOptions = {}) {
  const queryClient = useQueryClient();
  const { activeConversationId } = useAiStore();
  const { user } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);

  const submit = useCallback(
    async (
      pendingId: string,
      decision: 'confirm' | 'reject',
    ): Promise<{ ok: boolean; error?: string }> => {
      setBusyId(pendingId);
      try {
        const res = await aiFetch('/api/ai/tools/confirm', {
          method: 'POST',
          body: JSON.stringify({ pendingId, decision }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data.error ?? `HTTP ${res.status}` };
        }
        if (decision === 'confirm') {
          queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
          if (activeConversationId) {
            queryClient.invalidateQueries({
              queryKey: ['ai-messages', activeConversationId],
            });
          }
          onApplied?.();
        } else {
          if (activeConversationId) {
            queryClient.invalidateQueries({
              queryKey: ['ai-messages', activeConversationId],
            });
          }
        }
        return { ok: true };
      } finally {
        setBusyId(null);
      }
    },
    [activeConversationId, onApplied, queryClient, user?.id],
  );

  const confirm = (pendingId: string) => submit(pendingId, 'confirm');
  const reject = (pendingId: string) => submit(pendingId, 'reject');

  return { confirm, reject, busyId };
}
