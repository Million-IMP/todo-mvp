'use client';
// Design Ref: §2.1 (컴포넌트 트리), §2.2 (컨테이너), Plan FR-1
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AiHeader from './AiHeader';
import AiMessageList from './AiMessageList';
import AiInput from './AiInput';
import AiConversationList from './AiConversationList';
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
  const { collapsed, setCollapsed, toggle } = useAiStore();
  const { startNewConversation } = useAiConversation();
  const [showList, setShowList] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  const onToolApplied = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
  }, [queryClient, user?.id]);

  const chat = useAiChat({ getContext, onToolApplied });
  const tools = useAiTools({ onApplied: onToolApplied });

  // Mobile Keyboard 대응: visualViewport 변화 감지
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportChange = () => {
      if (!panelRef.current) return;
      const vv = window.visualViewport!;
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      panelRef.current.style.bottom = `${Math.max(0, offset)}px`;
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  // Click Outside: 패널 외부 클릭 시 접기
  useEffect(() => {
    if (collapsed) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setCollapsed(true);
        setShowList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [collapsed, setCollapsed]);

  if (!user) return null;

  return (
    <aside
      ref={panelRef}
      className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-[height,bottom] duration-200 ease-out sm:relative fixed bottom-0 left-0 right-0 z-40 ${
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
            setShowList(false);
          }}
          onShowList={() => {
            setCollapsed(false);
            setShowList(!showList);
          }}
        />

        {!collapsed && (
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
            {showList ? (
              <AiConversationList onClose={() => setShowList(false)} />
            ) : (
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
        )}
      </div>
    </aside>
  );
}
