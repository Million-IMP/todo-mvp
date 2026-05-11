'use client';
// Design Ref: §7.1 — 메시지 송수신 + SSE 파싱 + tool 처리
import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { aiFetch } from '@/lib/ai-fetch';
import { useAiStore } from '@/stores/ai-store';
import { useAuth } from '@/stores/auth-store';
import { parseSseChunk } from '@/lib/ai/response-parser';
import type {
  AiClientContext,
  AiMessage,
  AiStreamEvent,
  AiToolCall,
} from '@/types';

interface PendingTool {
  pendingId: string;
  call: AiToolCall;
}

interface UseAiChatOptions {
  /** Client context (현재 날짜/뷰) */
  getContext: () => AiClientContext;
  /** tool 실행 후 invalidate 할 query (보통 ['todos']) */
  onToolApplied?: () => void;
}

export function useAiChat({ getContext, onToolApplied }: UseAiChatOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeConversationId, setActiveConversationId } = useAiStore();

  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState('');
  const [pendingTools, setPendingTools] = useState<PendingTool[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ===== 메시지 이력 (활성 대화 기준) =====
  const messagesQuery = useQuery<AiMessage[]>({
    queryKey: ['ai-messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const res = await aiFetch(
        `/api/ai/messages?conversationId=${activeConversationId}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to load messages');
      }
      const json = await res.json();
      return json.messages as AiMessage[];
    },
    enabled: !!user && !!activeConversationId,
  });

  // ===== 메시지 전송 (SSE) =====
  const send = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || streaming) return;

      setStreaming(true);
      setPartial('');
      setError(null);
      abortRef.current = new AbortController();

      // 낙관적 user 메시지 추가
      const optimisticUser: AiMessage = {
        id: `tmp-user-${Date.now()}`,
        conversation_id: activeConversationId ?? '',
        user_id: user?.id ?? '',
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<AiMessage[]>(
        ['ai-messages', activeConversationId],
        (prev) => [...(prev ?? []), optimisticUser],
      );

      try {
        const res = await aiFetch('/api/ai/chat', {
          method: 'POST',
          body: JSON.stringify({
            conversationId: activeConversationId,
            message: trimmed,
            context: getContext(),
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          const msg = data.error ?? `HTTP ${res.status}`;
          const code = typeof data.code === 'string' ? data.code : undefined;
          setError(friendlyError(msg, code));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let aggregated = '';
        let finalConvId = activeConversationId ?? '';
        let toolApplied = false;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, remainder } = parseSseChunk(buffer);
          buffer = remainder;

          for (const ev of events) {
            handleEvent(ev, {
              onToken: (delta) => {
                aggregated += delta;
                setPartial(aggregated);
              },
              onResetPartial: () => {
                aggregated = '';
                setPartial('');
              },
              onToolApplied: () => {
                toolApplied = true;
              },
              onPending: (p) => {
                setPendingTools((prev) => [...prev, p]);
              },
              onDone: (convId) => {
                finalConvId = convId || finalConvId;
              },
              onError: (msg, code) => {
                setError(friendlyError(msg, code));
              },
            });
          }
        }

        // 새 대화가 서버에서 생성되었으면 활성 ID 업데이트 + 목록 갱신
        if (!activeConversationId && finalConvId) {
          setActiveConversationId(finalConvId);
          queryClient.invalidateQueries({ queryKey: ['ai-conversations', user?.id] });
        }

        // 메시지 캐시 갱신 (서버에서 생성된 정식 메시지로)
        const targetConvId = finalConvId || activeConversationId;
        if (targetConvId) {
          queryClient.invalidateQueries({ queryKey: ['ai-messages', targetConvId] });
        }

        if (toolApplied) {
          onToolApplied?.();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (msg !== 'AbortError' && !msg.toLowerCase().includes('abort')) {
          // HTTP 응답에서 error code를 추출 시도 (이미 catch 안)
          setError(friendlyError(msg));
        }
      } finally {
        setStreaming(false);
        setPartial('');
        abortRef.current = null;
      }
    },
    [
      activeConversationId,
      getContext,
      onToolApplied,
      queryClient,
      setActiveConversationId,
      streaming,
      user?.id,
    ],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const consumePending = useCallback((pendingId: string) => {
    setPendingTools((prev) => prev.filter((p) => p.pendingId !== pendingId));
  }, []);

  return {
    messages: messagesQuery.data ?? [],
    isLoadingMessages: messagesQuery.isLoading,
    streaming,
    partial,
    error,
    pendingTools,
    send,
    cancel,
    consumePending,
  };
}

// ============================================================
// SSE event dispatcher
// ============================================================
function handleEvent(
  ev: AiStreamEvent,
  cbs: {
    onToken: (delta: string) => void;
    onResetPartial: () => void;
    onToolApplied: () => void;
    onPending: (p: PendingTool) => void;
    onDone: (convId: string) => void;
    onError: (msg: string, code?: string) => void;
  },
) {
  switch (ev.type) {
    case 'token':
      cbs.onToken(ev.delta);
      break;
    case 'reset_partial':
      cbs.onResetPartial();
      break;
    case 'tool_call':
      // pure 'tool_call' (non-pending) — 결과 이벤트가 곧 따라옴
      break;
    case 'tool_result':
      cbs.onToolApplied();
      break;
    case 'tool_pending':
      cbs.onPending({ pendingId: ev.pendingId, call: ev.call });
      break;
    case 'done':
      cbs.onDone(ev.conversationId);
      break;
    case 'error':
      cbs.onError(ev.message, ev.code);
      break;
  }
}

// ============================================================
// 에러 코드 → 친절한 한국어 메시지 (Plan SC-5, SC-7)
// ============================================================
function friendlyError(rawMessage: string, code?: string): string {
  // 명시적 코드 우선
  if (code === 'QUOTA_EXCEEDED') {
    return '오늘 무료 사용 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (code === 'GEMINI_NOT_CONFIGURED') {
    return 'AI 설정이 완료되지 않았습니다. 관리자에게 GEMINI_API_KEY 설정을 요청하세요.';
  }
  if (code === 'INVALID_API_KEY') {
    return 'AI 키가 만료되었거나 무효합니다. 관리자에게 문의하세요.';
  }

  // raw 메시지에서 패턴 추론 (catch 블록에서 code가 없을 때)
  const lower = rawMessage.toLowerCase();
  if (lower.includes('quota') || lower.includes('rate') || lower.includes('429')) {
    return '오늘 무료 사용 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (lower.includes('not configured') || lower.includes('gemini_api_key')) {
    return 'AI 설정이 완료되지 않았습니다. 관리자에게 문의하세요.';
  }
  if (rawMessage.startsWith('HTTP 503')) {
    return 'AI 서비스를 일시적으로 사용할 수 없습니다.';
  }
  if (rawMessage.startsWith('HTTP 401')) {
    return '로그인이 만료되었습니다. 다시 로그인해주세요.';
  }

  return `오류: ${rawMessage}`;
}
