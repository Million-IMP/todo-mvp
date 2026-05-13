# Design: todo-filtering-enhancement

> **Feature**: 카테고리 및 태그 상세 필터링  
> **Created**: 2026-05-13  
> **Phase**: Design  

---

## 1. Context Extension (`CalendarContext.tsx`)

### 1.1 Interface
```typescript
interface CalendarContextType {
  // ...
  selectedTags: Set<string>;
  toggleTag: (tag: string) => void;
  resetFilters: () => void;
}
```

### 1.2 Implementation
```typescript
const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

const toggleTag = (tag: string) => {
  setSelectedTags((prev) => {
    const next = new Set(prev);
    next.has(tag) ? next.delete(tag) : next.add(tag);
    return next;
  });
};

const resetFilters = () => {
  setHiddenCategories(new Set());
  setSelectedTags(new Set());
  setSearchQuery('');
};
```

---

## 2. Sidebar Filter UI (`Sidebar.tsx`)

### 2.1 Unique Tag Extraction
`allTodos`에서 중복 없는 태그 목록을 추출합니다.

```typescript
const allTags = useMemo(() => {
  const tags = new Set<string>();
  todos.forEach(todo => todo.tags?.forEach(tag => tags.add(tag)));
  return Array.from(tags).sort();
}, [todos]);
```

### 2.2 JSX Structure
"카테고리" 섹션 아래에 "태그" 섹션을 추가합니다.

```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl p-3">
  <p className="text-xs font-semibold text-gray-500 ...">태그</p>
  <div className="flex flex-wrap gap-2 mt-2">
    {allTags.map(tag => (
      <button 
        key={tag} 
        onClick={() => toggleTag(tag)}
        className={`px-2 py-1 rounded-md text-xs transition-colors ${
          selectedTags.has(tag) 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
        }`}
      >
        #{tag}
      </button>
    ))}
  </div>
</div>
```

---

## 3. Centralized Filtering Logic (`DashboardPage.tsx`)

`filteredTodos`를 더욱 정교하게 구현합니다.

```typescript
const filteredTodos = useMemo(() => {
  return allTodos.filter((t) => {
    // 1. Search Query
    const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Category Filter
    const isCategoryHidden = hiddenCategories.has(t.category);
    if (isCategoryHidden) return false;

    // 3. Tag Filter (OR condition: 태그 중 하나라도 선택된 태그에 포함되면 표시)
    // 만약 선택된 태그가 없으면 필터링 생략
    if (selectedTags.size > 0) {
      const hasMatchingTag = t.tags?.some(tag => selectedTags.has(tag));
      if (!hasMatchingTag) return false;
    }

    return true;
  });
}, [allTodos, searchQuery, hiddenCategories, selectedTags]);
```

---

## 4. View Component Cleanup (`MonthView.tsx`)

`MonthView` 내부의 `hiddenCategories` 필터링 로직을 제거하고, `DashboardPage`로부터 이미 필터링된 `todos`를 받아서 그대로 렌더링합니다.

---

## 5. UX Considerations
- 필터가 하나라도 적용되어 있으면 헤더나 사이드바에 "필터 초기화" 버튼을 노출하여 편의성을 제공합니다.
