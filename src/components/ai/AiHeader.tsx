'use client';
// Design Ref: §2.2 — 패널 헤더 (제목 + 새 대화 + 접기)

interface Props {
  collapsed: boolean;
  streaming?: boolean;
  onToggle: () => void;
  onNewChat: () => void;
}

export default function AiHeader({ collapsed, streaming, onToggle, onNewChat }: Props) {
  return (
    <div
      className="flex items-center gap-2 px-3 h-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer select-none"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <span className="text-sm" aria-hidden>
        {collapsed ? '▲' : '▼'}
      </span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
        <span aria-hidden>✨</span>
        AI 어시스턴트
        {streaming && (
          <span className="text-xs text-blue-500 ml-1 animate-pulse">생각 중…</span>
        )}
      </span>

      <div className="flex-1" />

      {!collapsed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNewChat();
          }}
          className="px-2 py-1 text-xs rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          title="새 대화"
        >
          + 새 대화
        </button>
      )}
    </div>
  );
}
