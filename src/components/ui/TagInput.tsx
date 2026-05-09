'use client';
import { useState, KeyboardEvent } from 'react';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}

export default function TagInput({ tags, onChange, max = 5 }: Props) {
  const [input, setInput] = useState('');

  const addTag = (value: string) => {
    const tag = value.trim();
    if (!tag || tags.includes(tag) || tags.length >= max) return;
    onChange([...tags, tag]);
    setInput('');
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 items-center border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 min-h-[42px] bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
          #{tag}
          <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 font-bold">×</button>
        </span>
      ))}
      {tags.length < max && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => addTag(input)}
          placeholder={tags.length === 0 ? '태그 입력 후 Enter (최대 5개)' : ''}
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
      )}
    </div>
  );
}
