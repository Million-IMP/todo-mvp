'use client';
import { useEffect, useRef, useState } from 'react';
import { Todo } from '@/types';
import { CATEGORY_CONFIG, fmtTime } from './constants';

interface Props {
  todo: Todo;
  anchorRect: DOMRect;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onSave?: (updates: Partial<Todo>) => void;
}

export default function EventPopover({ todo, anchorRect, onClose, onEdit, onDelete, onToggle, onSave }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(todo.title);
  const cfg = CATEGORY_CONFIG[todo.category];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== todo.title && onSave) {
      onSave({ title: trimmed });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(todo.title);
    }
  };

  // Position: prefer right of anchor, fallback left
  const POPOVER_WIDTH = 384;
  const POPOVER_MAX_HEIGHT = 520;
  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.max(8, Math.min(anchorRect.top, window.innerHeight - POPOVER_MAX_HEIGHT - 8)),
    left: anchorRect.right + 8,
    zIndex: 60,
  };
  if (anchorRect.right + POPOVER_WIDTH > window.innerWidth) {
    style.left = Math.max(8, anchorRect.left - POPOVER_WIDTH - 8);
  }

  const subtasksDone = todo.subtasks?.filter((s) => s.completed).length ?? 0;
  const subtasksTotal = todo.subtasks?.length ?? 0;

  return (
    <div ref={ref} style={{ ...style, width: POPOVER_WIDTH, maxHeight: POPOVER_MAX_HEIGHT }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="h-2 flex-shrink-0" style={{ backgroundColor: cfg.color }} />
      <div className="p-4 space-y-3 overflow-y-auto">
        {/* Actions */}
        <div className="flex justify-end gap-1">
          <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500" title="상세 수정">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition text-gray-500 hover:text-red-500" title="삭제">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Title + Complete toggle */}
        <div className="flex items-start gap-3">
          <button onClick={onToggle}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
              ${todo.completed ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'}`}>
            {todo.completed && <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
          
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="flex-1 bg-gray-100 dark:bg-gray-800 border-none outline-none rounded px-1 py-0.5 text-base font-semibold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <h3 
              onClick={() => setIsEditing(true)}
              className={`flex-1 text-base font-semibold cursor-text hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded px-1 -ml-1 transition ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
              title="클릭하여 편집"
            >
              {todo.title}
            </h3>
          )}
        </div>

        {/* Date/Time */}
        {(todo.due_date || todo.start_time) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span>
              {todo.due_date && new Date(todo.due_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              {(todo.start_time || todo.end_time) && (
                <span className="ml-1">
                  {fmtTime(todo.start_time)}{todo.end_time ? ` ~ ${fmtTime(todo.end_time)}` : ''}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Category */}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.color }} />
          <span className="text-sm text-gray-600 dark:text-gray-400">{cfg.label}</span>
          {todo.recurrence && todo.recurrence.type !== 'none' && (
            <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
              ↺ {todo.recurrence.type === 'daily' ? '매일' : todo.recurrence.type === 'weekly' ? '매주' : '매월'}
            </span>
          )}
        </div>

        {/* Description */}
        {todo.description && (
          <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words leading-relaxed">
            {todo.description}
          </div>
        )}

        {/* Tags */}
        {todo.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {todo.tags.map((t) => <span key={t} className="text-xs text-blue-600 dark:text-blue-400">#{t}</span>)}
          </div>
        )}

        {/* Subtasks */}
        {subtasksTotal > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.round(subtasksDone / subtasksTotal * 100)}%` }} />
              </div>
              <span className="text-xs text-gray-400">{subtasksDone}/{subtasksTotal}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
