'use client';
// Design Ref: §2.1 (컴포넌트 트리), §2.2 (컨테이너), Plan FR-1
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AiHeader from './AiHeader';
import AiMessageList from './AiMessageList';
import AiInput from './AiInput';
import { useAiStore } from '@/stores/ai-store';
import { useAuth } from '@/stores/auth-store';
import { useAiChat } from '@/hooks/useAiChat';
import { useAiTools } from '@/hooks/useAiTools';
import { useAiConversation } from '@/hooks/useAiConversation';
import type { AiClientContext } from '@/types';

interface Props {
  /** 캘린더의 현재 컨텍스트 (날짜, 뷰모드) */
  getContext: () => AiClientContext;
}

export default function AiPanel({ getContext }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { collapsed, toggle } = useAiStore();
  const { startNewConversation } = useAiConversation();

  const onToolApplied = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
  }, [queryClient, user?.id]);

  const chat = useAiChat({ getContext, onToolApplied });
  const tools = useAiTools({ onApplied: onToolApplied });

  if (!user) return null;

  return (
    <aside
      className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-[height] duration-200 ease-out ${
        collapsed
          ? 'h-10'
          : 'h-[55vh] sm:h-[420px] max-h-[55vh] sm:max-h-[480px] min-h-[280px]'
      }`}
      aria-label="AI Assistant Panel"
    >
      <div className="flex flex-col h-full">
        <AiHeader
          collapsed={collapsed}
          streaming={chat.streaming}
          onToggle={toggle}
          onNewChat={() => {
            startNewConversation();
            chat.cancel();
          }}
        />

        {!collapsed && (
          <>
            <AiMessageList
              messages={chat.messages}
              partial={chat.partial}
              streaming={chat.streaming}
              pendingTools={chat.pendingTools}
              toolBusyId={tools.busyId}
              onConfirm={async (id) => {
                const r = await tools.confirm(id);
                if (r.ok) chat.consumePending(id);
                return r;
              }}
              onReject={async (id) => {
                const r = await tools.reject(id);
                if (r.ok) chat.consumePending(id);
                return r;
              }}
              errorMessage={chat.error}
            />
            <AiInput
              streaming={chat.streaming}
              onSubmit={chat.send}
              onCancel={chat.cancel}
              autoFocus
            />
          </>
        )}
      </div>
    </aside>
  );
}
