'use client';

import { useState } from 'react';
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
import { Todo, Priority, Category } from '@/types';
import PriorityBadge from '@/components/ui/PriorityBadge';
import DdayBadge from '@/components/ui/DdayBadge';
import TagInput from '@/components/ui/TagInput';
import { useNotifications } from '@/hooks/useNotifications';
import { useRealtimeTodos } from '@/hooks/useRealtimeTodos';
import Highlight from '@/components/ui/Highlight';

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

function SortableTodoCard({
  todo,
  onToggle,
  onDelete,
  onUpdate,
  searchQuery = '',
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, fields: Partial<Todo>) => void;
  searchQuery?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description ?? '');
  const [checking, setChecking] = useState(false);

  const saveEdit = () => {
    if (!editTitle.trim()) return;
    onUpdate(todo.id, { title: editTitle.trim(), description: editDesc.trim() });
    setEditing(false);
  };

  const handleToggle = () => {
    if (!todo.completed) {
      setChecking(true);
      setTimeout(() => {
        setChecking(false);
        onToggle(todo);
      }, 400);
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 flex items-start gap-2 sm:gap-3 transition-all duration-200
        ${isDragging ? 'shadow-xl opacity-80 scale-[1.02]' : 'hover:shadow-md'}
        ${isUrgent ? 'border-l-4 border-red-500' : ''}
        ${checking ? 'opacity-60 scale-[0.99]' : ''}
        ${todo.completed ? 'opacity-70' : ''}
      `}
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab text-gray-300 dark:text-gray-600 hover:text-gray-400 select-none touch-none flex-shrink-0"
        aria-label="drag"
      >
        ⠿
      </button>

      {/* 체크박스 */}
      <button
        onClick={handleToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer
          ${todo.completed
            ? 'bg-green-500 border-green-500 text-white'
            : checking
              ? 'bg-green-100 border-green-400 scale-110'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }`}
        aria-label="toggle complete"
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
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">저장</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">취소</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
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
            <p className="text-xs text-gray-400 mt-1">
              {new Date(todo.created_at).toLocaleDateString()}
              {todo.due_date && ` · 마감 ${new Date(todo.due_date).toLocaleDateString()}`}
            </p>
          </>
        )}
      </div>

      {/* 액션 버튼 */}
      {!editing && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            수정
          </button>
          <button
            onClick={() => confirm('삭제하시겠습니까?') && onDelete(todo.id)}
            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { status, search, setStatus, setSearch } = useFilter();

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('personal');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');

  const { data: allTodos = [], isLoading } = useQuery<Todo[]>({
    queryKey: ['todos', user?.id],
    queryFn: () => todosAPI.list(user!.id),
    enabled: !!user,
  });

  useNotifications(allTodos);
  useRealtimeTodos(user?.id);

  const filtered = allTodos.filter((t) => {
    const matchStatus =
      status === 'all' || (status === 'active' && !t.completed) || (status === 'completed' && t.completed);
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    return matchStatus && matchSearch && matchCat;
  });

  const createMutation = useMutation({
    mutationFn: () => todosAPI.create(user!.id, {
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      due_date: newDueDate || null,
      category: newCategory,
      tags: newTags,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setNewTitle(''); setNewDesc(''); setNewPriority('medium');
      setNewDueDate(''); setNewCategory('personal'); setNewTags([]);
    },
    onError: (err: any) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Todo> }) =>
      todosAPI.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    onError: (err: any) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => todosAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    onError: (err: any) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newTitle.trim()) { setFormError('제목을 입력해주세요'); return; }
    if (newTitle.length > 255) { setFormError('제목은 255자 이하'); return; }
    createMutation.mutate();
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
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
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4 text-sm">
          {error || formError}
        </div>
      )}

      {/* 생성 폼 */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 mb-5 space-y-3">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">새 Todo 추가</h2>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="할 일 제목 *"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <textarea
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="설명 (선택)"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">우선순위</label>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">카테고리</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as Category)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">마감일</label>
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            onMouseDown={(e) => {
              const input = e.currentTarget;
              const rect = input.getBoundingClientRect();
              const x = e.clientX - rect.left;

              // canvas로 실제 날짜 텍스트 너비 측정
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              let threshold = 120; // fallback
              if (ctx) {
                const style = window.getComputedStyle(input);
                ctx.font = `${style.fontSize} ${style.fontFamily}`;
                // 한국 로케일 표시 형식: "yyyy. mm. dd."
                const sample = input.value
                  ? `${input.value.slice(0, 4)}. ${input.value.slice(5, 7)}. ${input.value.slice(8, 10)}.`
                  : 'yyyy. mm. dd.';
                const paddingLeft = parseFloat(style.paddingLeft) || 12;
                threshold = paddingLeft + ctx.measureText(sample).width + 6;
              }

              if (x > threshold) {
                e.preventDefault();
                input.focus();
                (input as any).showPicker?.();
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">태그</label>
          <TagInput tags={newTags} onChange={setNewTags} />
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition text-sm"
        >
          {createMutation.isPending ? '추가 중...' : '추가'}
        </button>
      </form>

      {/* 검색 & 필터 */}
      <div className="space-y-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Todo 검색..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
        />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'completed'] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition capitalize ${
                status === s ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {s === 'all' ? `전체 (${allTodos.length})` : s === 'active' ? `미완료 (${activeTodos})` : `완료 (${completedTodos})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${categoryFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >전체</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${categoryFilter === c.value ? 'bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >{c.label}</button>
          ))}
        </div>
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
          <p className="text-gray-400 dark:text-gray-500 text-sm">위 폼에서 첫 번째 Todo를 추가해보세요!</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">검색 결과가 없습니다</p>
          <button
            onClick={() => { setSearch(''); setStatus('all'); setCategoryFilter('all'); }}
            className="mt-2 text-xs text-blue-500 hover:underline"
          >
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
                  onToggle={(t) => updateMutation.mutate({ id: t.id, updates: { completed: !t.completed } })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onUpdate={(id, fields) => updateMutation.mutate({ id, updates: fields })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
