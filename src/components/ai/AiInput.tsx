'use client';
// Design Ref: §2.2 — 입력창 (Enter 전송, Shift+Enter 줄바꿈)
import { useEffect, useRef, useState } from 'react';
import { useSpeechToText } from '@/hooks/useSpeechToText';

interface Props {
  disabled?: boolean;
  streaming?: boolean;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export default function AiInput({
  disabled,
  streaming,
  onSubmit,
  onCancel,
  autoFocus,
}: Props) {
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [stash, setStash] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isListening, isSupported, toggle: toggleVoice } = useSpeechToText({
    onResult: (transcript) => {
      setValue(transcript);
    },
    lang: 'ko-KR',
  });

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  // 자동 높이 조절
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    
    onSubmit(trimmed);
    
    // 히스토리 업데이트
    setHistory((prev) => {
      if (prev[0] === trimmed) return prev;
      return [trimmed, ...prev];
    });

    setValue('');
    setHistoryIndex(-1);
    setStash('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (e.key === 'ArrowUp') {
      if (history.length === 0) return;
      
      // 텍스트박스 내 커서가 첫 줄에 있을 때만 히스토리 탐색 (UX 개선)
      const el = e.currentTarget;
      const isAtFirstLine = el.selectionStart === 0 || !value.substring(0, el.selectionStart).includes('\n');
      
      if (isAtFirstLine) {
        e.preventDefault();
        const nextIndex = historyIndex + 1;
        if (nextIndex < history.length) {
          if (historyIndex === -1) {
            setStash(value);
          }
          setHistoryIndex(nextIndex);
          setValue(history[nextIndex]);
        }
      }
    }

    if (e.key === 'ArrowDown') {
      if (historyIndex === -1) return;

      const el = e.currentTarget;
      const isAtLastLine = el.selectionEnd === value.length || !value.substring(el.selectionEnd).includes('\n');

      if (isAtLastLine) {
        e.preventDefault();
        const nextIndex = historyIndex - 1;
        if (nextIndex === -1) {
          setHistoryIndex(-1);
          setValue(stash);
          setStash('');
        } else if (nextIndex >= 0) {
          setHistoryIndex(nextIndex);
          setValue(history[nextIndex]);
        }
      }
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="일정에 대해 무엇이든 물어보세요. 예: 내일 3시 회의 추가해줘"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 outline-none text-gray-800 dark:text-gray-200 disabled:opacity-50 max-h-[120px]"
        />
        <div className="flex items-center gap-1.5 mb-0.5">
          {isSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={disabled}
              className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${
                isListening
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={isListening ? '음성 인식 중지' : '음성으로 말하기'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
          )}

          {streaming ? (
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-3 rounded-lg text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              title="중단"
            >
              중단
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled || value.trim().length === 0}
              className="h-9 px-3 rounded-lg text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition"
              title="전송 (Enter)"
            >
              전송
            </button>
          )}
        </div>
      </div>
      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1">
        Enter 전송 · Shift+Enter 줄바꿈
      </div>
    </div>
  );
}
