'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minTime?: string;
}

function generateTimes() {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
}

const ALL_TIMES = generateTimes();

function formatDisplay(v: string) {
  if (!v) return '';
  const [h, m] = v.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${ampm} ${hour}:${String(m).padStart(2, '0')}`;
}

export default function TimePicker({ value, onChange, placeholder = '시간', minTime }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value ? formatDisplay(value) : '');
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const visibleTimes = minTime
    ? ALL_TIMES.filter((t) => t > minTime)
    : ALL_TIMES;

  useEffect(() => {
    setInput(value ? formatDisplay(value) : '');
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 선택된 시간을 드롭다운에서 스크롤
  useEffect(() => {
    if (!open || !listRef.current) return;
    const idx = visibleTimes.findIndex((t) => t === value);
    if (idx >= 0) {
      const item = listRef.current.children[idx] as HTMLElement;
      item?.scrollIntoView({ block: 'center' });
    }
  }, [open, value, visibleTimes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // HH:MM 형식 직접 입력
    const match = e.target.value.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = Number(match[1]);
      const m = Number(match[2]);
      if (h >= 0 && h < 24 && (m === 0 || m === 30 || m < 60)) {
        onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
  };

  const handleSelect = (t: string) => {
    onChange(t);
    setInput(formatDisplay(t));
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setInput('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center gap-1 px-3 py-2 border rounded-lg cursor-pointer transition
          ${open ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
          bg-white dark:bg-gray-700`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <input
          value={input}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full text-sm bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 min-w-0"
          style={{ width: '7rem' }}
          onClick={(e) => e.stopPropagation()}
        />
        {value && (
          <button onClick={handleClear} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 text-base leading-none flex-shrink-0">×</button>
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-40 max-h-56 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1"
        >
          {visibleTimes.map((t) => (
            <li key={t}>
              <button
                onClick={() => handleSelect(t)}
                className={`w-full text-left px-4 py-1.5 text-sm transition
                  ${t === value
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                {formatDisplay(t)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
