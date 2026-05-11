'use client';
// Design Ref: §2.2 — AI 응답 대기 인디케이터

export default function AiSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm">
        🤖
      </div>
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" />
      </div>
    </div>
  );
}
