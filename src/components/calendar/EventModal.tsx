'use client';
import { useState, useEffect, useRef } from 'react';
import { Todo, Priority, Category, RecurrenceType } from '@/types';
import TagInput from '@/components/ui/TagInput';
import TimePicker from '@/components/ui/TimePicker';
import { CATEGORY_CONFIG } from './constants';

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' },
];
const RECURRENCES: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: '반복 없음' }, { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' }, { value: 'monthly', label: '매월' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Todo> & { title: string }) => void;
  initial?: Partial<Todo>;
  defaultDate?: string;
  defaultStartTime?: string;
}

export default function EventModal({ open, onClose, onSave, initial, defaultDate, defaultStartTime }: Props) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const descRef = useRef<HTMLTextAreaElement>(null);
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('personal');
  const [dueDate, setDueDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '');
      setDesc(initial?.description ?? '');
      setPriority(initial?.priority ?? 'medium');
      setCategory(initial?.category ?? 'personal');
      setDueDate(initial?.due_date ?? defaultDate ?? '');
      setStartTime(initial?.start_time ?? defaultStartTime ?? '');
      setEndTime(initial?.end_time ?? '');
      setTags(initial?.tags ?? []);
      setRecurrence(initial?.recurrence?.type ?? 'none');
      setError('');
    }
  }, [open, initial, defaultDate, defaultStartTime]);

  // 설명 textarea 내용에 맞춰 자동 높이 조정
  useEffect(() => {
    const ta = descRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 320) + 'px';
  }, [desc, open]);

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim()) { setError('제목을 입력해주세요'); return; }
    onSave({
      title: title.trim(),
      description: desc.trim(),
      priority, category,
      due_date: dueDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      tags,
      recurrence: recurrence !== 'none' ? { type: recurrence, interval: 1 } : null,
      ...(initial?.id ? { id: initial.id } : {}),
    });
    onClose();
  };

  const catColor = CATEGORY_CONFIG[category].color;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Color bar */}
        <div className="h-1.5 w-full flex-shrink-0" style={{ backgroundColor: catColor }} />

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Title */}
          <input
            autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="제목 추가"
            className="w-full text-xl font-medium bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 outline-none pb-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-colors"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}

          {/* Date + Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 bg-transparent outline-none text-gray-700 dark:text-gray-300 dark:[color-scheme:dark] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 py-0.5" />
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1">
                  <TimePicker value={startTime} onChange={(v) => {
                    setStartTime(v);
                    if (!endTime && v) {
                      const [h, m] = v.split(':').map(Number);
                      const total = h * 60 + m + 60;
                      setEndTime(`${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
                    }
                  }} placeholder="시작 시간" />
                </div>
                {startTime && <><span className="text-gray-400 text-sm">~</span>
                  <div className="flex-1">
                    <TimePicker value={endTime} onChange={setEndTime} placeholder="종료 시간" minTime={startTime} />
                  </div></>}
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.entries(CATEGORY_CONFIG) as [Category, typeof CATEGORY_CONFIG[Category]][]).map(([cat, cfg]) => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
                  style={category === cat
                    ? { backgroundColor: cfg.color, color: '#fff', borderColor: cfg.color }
                    : { backgroundColor: 'transparent', color: cfg.color, borderColor: cfg.color }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button key={p.value} onClick={() => setPriority(p.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${priority === p.value
                    ? p.value === 'high' ? 'bg-red-500 text-white border-red-500'
                      : p.value === 'medium' ? 'bg-yellow-500 text-white border-yellow-500'
                      : 'bg-gray-500 text-white border-gray-500'
                    : 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              className="text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300 cursor-pointer">
              {RECURRENCES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Description */}
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <textarea ref={descRef} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="설명 추가" rows={3}
              className="flex-1 text-sm bg-transparent outline-none resize-y text-gray-700 dark:text-gray-300 placeholder-gray-400 border-b border-transparent focus:border-gray-200 dark:focus:border-gray-700 transition-colors leading-relaxed min-h-[72px]"
              style={{ maxHeight: 320 }} />
          </div>

          {/* Tags */}
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <div className="flex-1"><TagInput tags={tags} onChange={setTags} /></div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 pb-5 pt-3 flex-shrink-0 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            취소
          </button>
          <button onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg transition"
            style={{ backgroundColor: catColor }}>
            {initial?.id ? '저장' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}
