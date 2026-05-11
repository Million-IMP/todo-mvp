'use client';
// Design Ref: §2.2 — 입력창 (Enter 전송, Shift+Enter 줄바꿈)
import { useEffect, useRef, useState } from 'react';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setValue('');
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="일정에 대해 무엇이든 물어보세요. 예: 내일 3시 회의 추가해줘"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 outline-none text-gray-800 dark:text-gray-200 disabled:opacity-50 max-h-[120px]"
        />
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
      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1">
        Enter 전송 · Shift+Enter 줄바꿈
      </div>
    </div>
  );
}
