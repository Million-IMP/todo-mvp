'use client';
// Design Ref: §2.2 — 메시지 목록 + 자동 스크롤 + 부분 응답 표시
import { useEffect, useRef } from 'react';
import AiSkeleton from './AiSkeleton';
import AiToolResult from './AiToolResult';
import type { AiMessage, AiToolName } from '@/types';

interface PendingTool {
  pendingId: string;
  call: { name: AiToolName; args: Record<string, unknown> };
}

interface Props {
  messages: AiMessage[];
  partial: string;
  streaming: boolean;
  pendingTools: PendingTool[];
  toolBusyId: string | null;
  onConfirm: (pendingId: string) => Promise<{ ok: boolean; error?: string }>;
  onReject: (pendingId: string) => Promise<{ ok: boolean; error?: string }>;
  errorMessage?: string | null;
  emptyHint?: string;
}

export default function AiMessageList({
  messages,
  partial,
  streaming,
  pendingTools,
  toolBusyId,
  onConfirm,
  onReject,
  errorMessage,
  emptyHint,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, partial, streaming, pendingTools.length]);

  const pendingMap = new Map(pendingTools.map((p) => [pendingMessageKey(p), p]));
  const isEmpty = messages.length === 0 && !streaming && !partial;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 py-2"
    >
      {isEmpty && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8 px-4">
          {emptyHint ?? '👋 일정 관리를 도와드릴게요. 자유롭게 물어보세요.'}
        </div>
      )}

      {messages.map((m) => (
        <MessageRow
          key={m.id}
          message={m}
          pending={pendingMap.get(messagePendingKey(m))}
          toolBusyId={toolBusyId}
          onConfirm={onConfirm}
          onReject={onReject}
        />
      ))}

      {streaming && partial && (
        <div className="px-3 py-2 flex gap-2">
          <div className="w-7 h-7 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm">
            🤖
          </div>
          <div className="flex-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {partial}
          </div>
        </div>
      )}

      {streaming && !partial && <AiSkeleton />}

      {errorMessage && (
        <div className="mx-3 my-2 px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs">
          ⚠️ {errorMessage}
        </div>
      )}
    </div>
  );
}

function MessageRow({
  message,
  pending,
  toolBusyId,
  onConfirm,
  onReject,
}: {
  message: AiMessage;
  pending?: PendingTool;
  toolBusyId: string | null;
  onConfirm: (pendingId: string) => Promise<{ ok: boolean; error?: string }>;
  onReject: (pendingId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  if (message.role === 'tool') {
    const pendingId = pending?.pendingId ?? message.id;
    const isBusy = toolBusyId === pendingId;
    return (
      <AiToolResult
        toolName={(message.tool_name ?? 'createTodo') as AiToolName}
        args={message.tool_args ?? null}
        result={message.tool_result ?? null}
        pendingId={pendingId}
        onConfirm={onConfirm}
        onReject={onReject}
        busy={isBusy}
      />
    );
  }

  const isUser = message.role === 'user';
  return (
    <div className={`px-3 py-2 flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-blue-100 dark:bg-blue-900 text-gray-700 dark:text-gray-200'
        }`}
      >
        {isUser ? '👤' : '🤖'}
      </div>
      <div
        className={`max-w-[80%] text-sm whitespace-pre-wrap break-words rounded-2xl px-3 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

// 메시지 ↔ pending 매칭 키 (서버에서 pendingId가 곧 ai_messages.id)
function messagePendingKey(m: AiMessage): string {
  return m.id;
}
function pendingMessageKey(p: PendingTool): string {
  return p.pendingId;
}
