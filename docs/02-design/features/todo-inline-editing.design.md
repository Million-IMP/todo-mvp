# Design: todo-inline-editing

> **Feature**: 투두 인라인 편집 (Inline Editing)  
> **Created**: 2026-05-13  
> **Phase**: Design  

---

## 1. 컴포넌트 인터페이스 확장 (`EventPopover.tsx`)

### 1.1 Props 추가
수정된 내용을 부모에게 전달하기 위해 `onSave` prop을 추가합니다.

```typescript
interface Props {
  todo: Todo;
  anchorRect: DOMRect;
  onClose: () => void;
  onEdit: () => void; // 기존: 전체 모달 수정
  onDelete: () => void;
  onToggle: () => void;
  onSave?: (updates: Partial<Todo>) => void; // 신규: 인라인 저장
}
```

---

## 2. 컴포넌트 내부 상태 및 로직

### 2.1 상태 (States)
```typescript
const [isEditing, setIsEditing] = useState(false);
const [editValue, setEditValue] = useState(todo.title);
const inputRef = useRef<HTMLInputElement>(null);
```

### 2.2 편집 모드 진입
제목(`h3`) 클릭 시 `setIsEditing(true)`를 호출하고, `useEffect`를 통해 `inputRef`에 포커스를 줍니다.

### 2.3 키 이벤트 처리
- **Enter**: `onSave({ title: editValue })` 호출 후 `setIsEditing(false)`
- **Esc**: `setIsEditing(false)` 및 `setEditValue(todo.title)`

---

## 3. UI 렌더링 (JSX)

```tsx
<div className="flex items-start gap-3">
  {/* 완료 체크 버튼은 유지 */}
  <button onClick={onToggle} ...>...</button>

  {isEditing ? (
    <input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="flex-1 bg-gray-100 dark:bg-gray-800 border-none outline-none rounded px-1 py-0.5 text-base font-semibold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
      autoFocus
    />
  ) : (
    <h3 
      onClick={() => setIsEditing(true)}
      className={`flex-1 text-base font-semibold cursor-text hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 -ml-1 transition ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
    >
      {todo.title}
    </h3>
  )}
</div>
```

---

## 4. 부모 컴포넌트 연동 (`DashboardPage.tsx`)

`DashboardPage`에서 `EventPopover`를 렌더링할 때 `onSave` 핸들러를 연결합니다.

```tsx
<EventPopover
  todo={popoverTodo}
  anchorRect={popoverRect}
  onClose={() => setPopoverTodo(null)}
  onEdit={() => {
    setModalInitial(popoverTodo);
    setModalOpen(true);
    setPopoverTodo(null);
  }}
  onDelete={() => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(popoverTodo.id);
      setPopoverTodo(null);
    }
  }}
  onToggle={() => {
    updateMutation.mutate({ id: popoverTodo.id, updates: { completed: !popoverTodo.completed } });
  }}
  onSave={(updates) => {
    updateMutation.mutate({ id: popoverTodo.id, updates });
  }}
/>
```

---

## 5. 고려 사항

- **자동 저장**: `onBlur` 시에도 저장을 수행하여 사용자 이탈 시 데이터를 보존합니다.
- **포커스 시 텍스트 선택**: `input`이 열릴 때 제목 전체를 선택(`select()`)하여 즉시 수정을 시작할 수 있게 합니다.
