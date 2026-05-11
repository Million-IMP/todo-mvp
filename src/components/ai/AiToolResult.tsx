'use client';
// Design Ref: §2.2, §5.3 — tool 호출 결과 + 사용자 확인 UI
import { useState } from 'react';
import type { AiToolName } from '@/types';

interface Props {
  toolName: AiToolName;
  args?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  /** pending 상태일 때만 confirm/reject 콜백 활성화 */
  pendingId?: string;
  onConfirm?: (pendingId: string) => Promise<{ ok: boolean; error?: string }>;
  onReject?: (pendingId: string) => Promise<{ ok: boolean; error?: string }>;
  busy?: boolean;
}

const TOOL_LABEL: Record<AiToolName, string> = {
  getCurrentTodos: '일정 조회',
  createTodo: '일정 추가',
  updateTodo: '일정 수정',
  deleteTodo: '일정 삭제',
  findTodos: '일정 검색',
};

export default function AiToolResult({
  toolName,
  args,
  result,
  pendingId,
  onConfirm,
  onReject,
  busy,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  const isPending = result?.pending === true && pendingId;
  const isCancelled = result?.cancelled === true;
  const isError = result?.ok === false && !isPending;
  const summary = summarizeArgs(toolName, args ?? {});

  const handleConfirm = async () => {
    if (!pendingId || !onConfirm) return;
    setError(null);
    const r = await onConfirm(pendingId);
    if (!r.ok) setError(r.error ?? '실행 실패');
  };
  const handleReject = async () => {
    if (!pendingId || !onReject) return;
    setError(null);
    const r = await onReject(pendingId);
    if (!r.ok) setError(r.error ?? '취소 실패');
  };

  return (
    <div className="my-1 mx-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span aria-hidden>🔧</span>
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {TOOL_LABEL[toolName] ?? toolName}
        </span>
        {isPending && (
          <span className="px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 text-[10px]">
            확인 필요
          </span>
        )}
        {isCancelled && (
          <span className="text-gray-500 dark:text-gray-400 text-[10px]">취소됨</span>
        )}
        {isError && (
          <span className="text-red-500 text-[10px]">실패</span>
        )}
      </div>
      {summary && (
        <div className="mt-1 text-gray-600 dark:text-gray-400">{summary}</div>
      )}
      {error && <div className="mt-1 text-red-500">{error}</div>}

      {isPending && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs disabled:opacity-50"
          >
            확인
          </button>
          <button
            onClick={handleReject}
            disabled={busy}
            className="px-3 py-1 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs disabled:opacity-50"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}

function summarizeArgs(name: AiToolName, args: Record<string, unknown>): string {
  switch (name) {
    case 'createTodo':
      return [
        args.title && `「${args.title}」`,
        args.due_date && `📅 ${args.due_date}`,
        args.start_time && `🕒 ${args.start_time}${args.end_time ? '~' + args.end_time : ''}`,
      ]
        .filter(Boolean)
        .join(' ');
    case 'updateTodo':
      return `id=${truncate(String(args.id ?? '?'), 8)} ${
        Object.keys(args).filter((k) => k !== 'id').length
      }개 필드 수정`;
    case 'deleteTodo':
      return `id=${truncate(String(args.id ?? '?'), 8)}`;
    case 'findTodos':
      return `검색어: ${args.query ?? ''}`;
    case 'getCurrentTodos':
      return [args.from && `from=${args.from}`, args.to && `to=${args.to}`]
        .filter(Boolean)
        .join(' ');
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
