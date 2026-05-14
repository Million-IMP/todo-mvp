'use client';
import { useAiConversation } from '@/hooks/useAiConversation';

interface Props {
  onClose: () => void;
}

export default function AiConversationList({ onClose }: Props) {
  const { conversations, activeConversationId, setActiveConversationId, deleteConversation } = useAiConversation();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 animate-in slide-in-from-left duration-200">
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">이전 대화 목록</h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 && (
          <p className="text-center text-xs text-gray-500 py-10">이전 대화가 없습니다.</p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => {
              setActiveConversationId(conv.id);
              onClose();
            }}
            className={`group relative flex flex-col p-3 rounded-xl cursor-pointer transition-colors ${
              activeConversationId === conv.id
                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
            }`}
          >
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate pr-6">
              {conv.title || '제목 없음'}
            </span>
            <span className="text-[10px] text-gray-400 mt-1">
              {new Date(conv.updated_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('대화를 삭제하시겠습니까?')) {
                  deleteConversation(conv.id);
                }
              }}
              className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
