'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { todosAPI } from '@/lib/supabase';
import { useFilter } from '@/stores/filter-store';
import { useAuth } from '@/stores/auth-store';
import { Todo, Priority, Category, RecurrenceType, Subtask, ViewMode, SortField } from '@/types';
import PriorityBadge from '@/components/ui/PriorityBadge';
import DdayBadge from '@/components/ui/DdayBadge';
import TagInput from '@/components/ui/TagInput';
import Highlight from '@/components/ui/Highlight';
import CalendarView from '@/components/ui/CalendarView';
import { useNotifications } from '@/hooks/useNotifications';
import { useRealtimeTodos } from '@/hooks/useRealtimeTodos';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'work', label: '업무' },
  { value: 'personal', label: '개인' },
  { value: 'study', label: '학습' },
  { value: 'other', label: '기타' },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: '반복 없음' },
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'sort_order', label: '직접 정렬' },
  { value: 'priority', label: '우선순위' },
  { value: 'due_date', label: '마감일' },
  { value: 'created_at', label: '생성일' },
];

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Subtask Component ────────────────────────────────────────────────────────
function SubtaskList({
  subtasks,
  todoId,
  onUpdate,
}: {
  subtasks: Subtask[];
  todoId: string;
  onUpdate: (id: string, fields: Partial<Todo>) => void;
}) {
  const [newTitle, setNewTitle] = useState('');

  const toggle = (sid: string) => {
    const updated = subtasks.map((s) => s.id === sid ? { ...s, completed: !s.completed } : s);
    onUpdate(todoId, { subtasks: updated });
  };

  const add = () => {
    if (!newTitle.trim()) return;
    const updated = [...subtasks, { id: nanoid(), title: newTitle.trim(), completed: false }];
    onUpdate(todoId, { subtasks: updated });
    setNewTitle('');
  };

  const remove = (sid: string) => {
    onUpdate(todoId, { subtasks: subtasks.filter((s) => s.id !== sid) });
  };

  const done = subtasks.filter((s) => s.completed).length;
  const pct = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;

  return (
    <div className="mt-2 space-y-1.5">
      {subtasks.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-400">{done}/{subtasks.length}</span>
          </div>
          {subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-2 group">
              <button
                onClick={() => toggle(s.id)}
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition
                  ${s.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'}`}
              >
                {s.completed && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <span className={`text-xs flex-1 ${s.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{s.title}</span>
              <button onClick={() => remove(s.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition">×</button>
            </div>
          ))}
        </>
      )}
      <div className="flex gap-1">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="서브태스크 추가..."
          className="flex-1 text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button onClick={add} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-600 dark:text-gray-300">+</button>
      </div>
    </div>
  );
}

// ─── Todo Card ────────────────────────────────────────────────────────────────
function SortableTodoCard({
  todo,
  onToggle,
  onDelete,
  onUpdate,
  searchQuery = '',
  isSelected,
  onSelect,
  bulkMode,
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, fields: Partial<Todo>) => void;
  searchQuery?: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  bulkMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description ?? '');
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [checking, setChecking] = useState(false);

  const saveEdit = () => {
    if (!editTitle.trim()) return;
    onUpdate(todo.id, { title: editTitle.trim(), description: editDesc.trim() });
    setEditing(false);
  };

  const handleToggle = () => {
    if (!todo.completed) {
      setChecking(true);
      setTimeout(() => { setChecking(false); onToggle(todo); }, 400);
    } else {
      onToggle(todo);
    }
  };

  const isUrgent = (() => {
    if (!todo.due_date || todo.completed) return false;
    const diff = Math.round(
      (new Date(todo.due_date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000
    );
    return diff <= 1;
  })();

  const subtasksDone = todo.subtasks?.filter((s) => s.completed).length ?? 0;
  const subtasksTotal = todo.subtasks?.length ?? 0;

  const recurrenceLabel: Record<RecurrenceType, string> = {
    none: '', daily: '매일', weekly: '매주', monthly: '매월',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 flex items-start gap-2 sm:gap-3 transition-all duration-200
        ${isDragging ? 'shadow-xl opacity-80 scale-[1.02]' : 'hover:shadow-md'}
        ${isUrgent ? 'border-l-4 border-red-500' : ''}
        ${checking ? 'opacity-60 scale-[0.99]' : ''}
        ${todo.completed ? 'opacity-70' : ''}
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
      `}
    >
      {/* 일괄선택 or 드래그 핸들 */}
      {bulkMode ? (
        <button
          onClick={() => onSelect(todo.id)}
          className={`mt-1 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition
            ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}
        >
          {isSelected && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
      ) : (
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-400 select-none touch-none flex-shrink-0"
          aria-label="drag"
        >⠿</button>
      )}

      {/* 체크 버튼 */}
      <button
        onClick={handleToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200
          ${todo.completed ? 'bg-green-500 border-green-500 text-white'
            : checking ? 'bg-green-100 border-green-400 scale-110'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}
      >
        {(todo.completed || checking) && (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">저장</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">취소</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <Highlight
                text={todo.title}
                query={searchQuery}
                className={`font-semibold text-sm transition-all duration-200 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
              />
              <PriorityBadge priority={todo.priority} />
              <DdayBadge dueDate={todo.due_date} />
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {CATEGORIES.find((c) => c.value === todo.category)?.label ?? todo.category}
              </span>
              {todo.recurrence && todo.recurrence.type !== 'none' && (
                <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                  ↺ {recurrenceLabel[todo.recurrence.type]}
                </span>
              )}
            </div>
            {todo.description && (
              <p className={`text-xs mt-0.5 ${todo.completed ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                {todo.description}
              </p>
            )}
            {todo.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {todo.tags.map((tag) => (
                  <span key={tag} className="text-xs text-blue-600 dark:text-blue-400">#{tag}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-gray-400">
                {new Date(todo.created_at).toLocaleDateString()}
                {todo.due_date && (
                  <span>
                    {' · 마감 '}{new Date(todo.due_date + 'T00:00:00').toLocaleDateString()}
                    {todo.due_time && <span className="text-blue-500 ml-1">{todo.due_time}</span>}
                  </span>
                )}
              </p>
              {subtasksTotal > 0 && (
                <button
                  onClick={() => setShowSubtasks((v) => !v)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 flex items-center gap-1 transition"
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${subtasksDone === subtasksTotal ? 'bg-green-500' : 'bg-gray-300'}`} />
                  {subtasksDone}/{subtasksTotal} {showSubtasks ? '▲' : '▼'}
                </button>
              )}
              {subtasksTotal === 0 && (
                <button
                  onClick={() => setShowSubtasks((v) => !v)}
                  className="text-xs text-gray-400 hover:text-blue-500 transition"
                >
                  + 서브태스크
                </button>
              )}
            </div>
            {showSubtasks && (
              <SubtaskList subtasks={todo.subtasks ?? []} todoId={todo.id} onUpdate={onUpdate} />
            )}
          </>
        )}
      </div>

      {/* 액션 버튼 */}
      {!editing && !bulkMode && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => setEditing(true)}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            수정
          </button>
          <button onClick={() => confirm('삭제하시겠습니까?') && onDelete(todo.id)}
            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition">
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { status, search, setStatus, setSearch } = useFilter();

  // 뷰 & 정렬
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('sort_order');

  // 폼 상태
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('personal');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newRecurrence, setNewRecurrence] = useState<RecurrenceType>('none');
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // 필터
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');

  // 일괄 작업
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: allTodos = [], isLoading } = useQuery<Todo[]>({
    queryKey: ['todos', user?.id],
    queryFn: () => todosAPI.list(user!.id),
    enabled: !!user,
  });

  useNotifications(allTodos);
  useRealtimeTodos(user?.id);

  // 정렬 함수
  const sortTodos = useCallback((todos: Todo[]): Todo[] => {
    if (sortField === 'sort_order') return todos;
    return [...todos].sort((a, b) => {
      if (sortField === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sortField === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      if (sortField === 'created_at') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });
  }, [sortField]);

  const filtered = sortTodos(allTodos.filter((t) => {
    const matchStatus = status === 'all' || (status === 'active' && !t.completed) || (status === 'completed' && t.completed);
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    return matchStatus && matchSearch && matchCat;
  }));

  const createMutation = useMutation({
    mutationFn: () => todosAPI.create(user!.id, {
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      due_date: newDueDate || null,
      due_time: newDueTime || null,
      category: newCategory,
      tags: newTags,
      recurrence: newRecurrence !== 'none' ? { type: newRecurrence, interval: 1 } : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setNewTitle(''); setNewDesc(''); setNewPriority('medium');
      setNewDueDate(''); setNewDueTime(''); setNewCategory('personal');
      setNewTags([]); setNewRecurrence('none');
      setShowForm(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Todo> }) => todosAPI.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => todosAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newTitle.trim()) { setFormError('제목을 입력해주세요'); return; }
    if (newTitle.length > 255) { setFormError('제목은 255자 이하'); return; }
    createMutation.mutate();
  };

  // 일괄 작업
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((t) => t.id)));
  const clearSelect = () => setSelectedIds(new Set());

  const bulkComplete = () => {
    selectedIds.forEach((id) => {
      const todo = allTodos.find((t) => t.id === id);
      if (todo && !todo.completed) updateMutation.mutate({ id, updates: { completed: true } });
    });
    clearSelect();
    setBulkMode(false);
  };

  const bulkDelete = () => {
    if (!confirm(`${selectedIds.size}개를 삭제하시겠습니까?`)) return;
    selectedIds.forEach((id) => deleteMutation.mutate(id));
    clearSelect();
    setBulkMode(false);
  };

  // DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    if (sortField !== 'sort_order') return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filtered.findIndex((t) => t.id === active.id);
    const newIndex = filtered.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(filtered, oldIndex, newIndex);
    const updates = reordered.map((t, i) => ({ id: t.id, sort_order: i }));
    queryClient.setQueryData(['todos', user?.id], (old: Todo[] = []) => {
      const map = new Map(updates.map((u) => [u.id, u.sort_order]));
      return old.map((t) => (map.has(t.id) ? { ...t, sort_order: map.get(t.id)! } : t))
               .sort((a, b) => a.sort_order - b.sort_order);
    });
    todosAPI.updateOrder(updates);
  };

  const activeTodos = allTodos.filter((t) => !t.completed).length;
  const completedTodos = allTodos.filter((t) => t.completed).length;

  return (
    <div className="max-w-2xl mx-auto">
      {(error || formError) && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4 text-sm flex justify-between items-center">
          <span>{error || formError}</span>
          <button onClick={() => { setError(''); setFormError(''); }} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* 뷰 전환 & Todo 추가 버튼 */}
      <div className="flex justify-between items-center mb-4 gap-2">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
          {(['list', 'calendar'] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === v ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {v === 'list' ? '목록' : '캘린더'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">
          <span className="text-lg leading-none">{showForm ? '−' : '+'}</span>
          <span>Todo 추가</span>
        </button>
      </div>

      {/* 생성 폼 (토글) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 mb-5 space-y-3 border border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">새 Todo 추가</h2>
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            placeholder="할 일 제목 *" autoFocus
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="설명 (선택)" rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">우선순위</label>
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">카테고리</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as Category)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* 날짜 + 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">마감 날짜</label>
              <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">마감 시간</label>
              <input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:[color-scheme:dark]" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">반복</label>
            <select value={newRecurrence} onChange={(e) => setNewRecurrence(e.target.value as RecurrenceType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
              {RECURRENCE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">태그</label>
            <TagInput tags={newTags} onChange={setNewTags} />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition text-sm">
              {createMutation.isPending ? '추가 중...' : '추가'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition">
              취소
            </button>
          </div>
        </form>
      )}

      {/* 캘린더 뷰 */}
      {viewMode === 'calendar' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <CalendarView
            todos={allTodos}
            onTodoClick={(todo) => {
              setViewMode('list');
              setSearch(todo.title);
            }}
          />
        </div>
      ) : (
        <>
          {/* 검색 & 필터 */}
          <div className="space-y-2 mb-4">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Todo 검색..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white" />

            <div className="flex gap-2 flex-wrap">
              {(['all', 'active', 'completed'] as const).map((s) => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${status === s ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                  {s === 'all' ? `전체 (${allTodos.length})` : s === 'active' ? `미완료 (${activeTodos})` : `완료 (${completedTodos})`}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${categoryFilter === 'all' ? 'bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                전체
              </button>
              {CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => setCategoryFilter(c.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${categoryFilter === c.value ? 'bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* 정렬 & 일괄 작업 */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">정렬:</span>
                <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <button
                onClick={() => { setBulkMode((v) => !v); clearSelect(); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${bulkMode ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                {bulkMode ? '선택 취소' : '일괄 선택'}
              </button>
            </div>

            {/* 일괄 작업 바 */}
            {bulkMode && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <span className="text-xs text-blue-700 dark:text-blue-300 flex-1">{selectedIds.size}개 선택됨</span>
                <button onClick={selectAll} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">전체 선택</button>
                <button onClick={clearSelect} className="text-xs text-gray-500 hover:underline">해제</button>
                <button onClick={bulkComplete} disabled={selectedIds.size === 0}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 transition">
                  완료 처리
                </button>
                <button onClick={bulkDelete} disabled={selectedIds.size === 0}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition">
                  삭제
                </button>
              </div>
            )}
          </div>

          {/* Todo 목록 */}
          {isLoading ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">불러오는 중...</p>
            </div>
          ) : allTodos.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-semibold mb-1">할 일이 없습니다</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">위의 + Todo 추가 버튼을 눌러 시작해보세요!</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">검색 결과가 없습니다</p>
              <button onClick={() => { setSearch(''); setStatus('all'); setCategoryFilter('all'); }}
                className="mt-2 text-xs text-blue-500 hover:underline">
                필터 초기화
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 sm:space-y-3">
                  {filtered.map((todo) => (
                    <SortableTodoCard
                      key={todo.id}
                      todo={todo}
                      searchQuery={search}
                      isSelected={selectedIds.has(todo.id)}
                      onSelect={toggleSelect}
                      bulkMode={bulkMode}
                      onToggle={(t) => updateMutation.mutate({ id: t.id, updates: { completed: !t.completed } })}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onUpdate={(id, fields) => updateMutation.mutate({ id, updates: fields })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}
    </div>
  );
}
