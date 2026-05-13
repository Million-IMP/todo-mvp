# Plan: todo-filtering-enhancement

> **Feature**: 카테고리 및 태그 상세 필터링  
> **Created**: 2026-05-13  
> **Phase**: Plan  

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 일정이 많아지면 특정 태그나 카테고리의 일정을 선별해서 보기 어려움 |
| **Solution** | 카테고리 필터 강화 및 태그(Tag) 필터링 시스템 구축 |
| **Functional UX Effect** | 사이드바에서 클릭 몇 번으로 원하는 주제의 일정만 즉시 필터링하여 가독성 확보 |
| **Core Value** | "정보의 과부하 해결", 체계적인 일정 관리 지원 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 사용자가 일정을 주제별(태그)로 분류하더라도 이를 활용할 조회 수단이 부족함 |
| **WHO** | 프로젝트, 취미, 공부 등 다양한 태그를 사용하는 사용자 |
| **RISK** | 필터링 조건이 많아질 때의 복잡한 쿼리 로직, 성능 이슈 |
| **SUCCESS** | 사이드바에서 태그 선택 시 해당 일정을 가진 투두만 렌더링됨 |
| **SCOPE** | `CalendarContext`, `Sidebar`, `DashboardPage` |

---

## 1. 요구사항 (Requirements)

### 1.1 태그 필터링 시스템
- [ ] `CalendarContext`에 `selectedTags` 상태 추가 (Set<string>)
- [ ] 태그 토글 기능 구현

### 1.2 사이드바 UI 개선
- [ ] 현재 사용 중인 모든 유니크한 태그 목록 추출
- [ ] 사이드바 하단에 "태그" 필터 섹션 추가
- [ ] 선택된 태그는 시각적으로 강조 (배지 형태 등)

### 1.3 필터링 로직 중앙화
- [ ] `DashboardPage`에서 `searchQuery`, `hiddenCategories`, `selectedTags`를 모두 고려한 중앙 집중형 필터링 로직 적용
- [ ] 개별 뷰(MonthView 등) 내부의 파편화된 필터링 로직 제거

---

## 2. 기술적 설계 (Technical Design)

### 2.1 상태 확장 (`CalendarContext`)
```typescript
interface CalendarContextType {
  // ... 기존 상태
  selectedTags: Set<string>;
  toggleTag: (tag: string) => void;
  resetFilters: () => void;
}
```

### 2.2 필터 알고리즘 (`DashboardPage`)
- `filteredTodos` = `allTodos`
  - .filter(카테고리가 `hiddenCategories`에 포함되지 않음)
  - .filter(태그가 하나라도 `selectedTags`에 포함됨 - 단, `selectedTags`가 비어있으면 전체 통과)
  - .filter(제목에 `searchQuery` 포함)

---

## 3. 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/contexts/CalendarContext.tsx` | `selectedTags`, `toggleTag`, `resetFilters` 추가 |
| `src/components/calendar/Sidebar.tsx` | 태그 필터 UI 추가 및 유니크 태그 추출 로직 |
| `src/app/main/dashboard/page.tsx` | 중앙 집중형 필터링 로직으로 수정 (`filteredTodos`) |
| `src/components/calendar/MonthView.tsx` | 내부 필터링 로직 제거 (전달받은 `todos`만 렌더링) |

---

## 4. 성공 기준 (Success Criteria)

- [ ] SC-1: 사이드바에서 카테고리 클릭 시 해당 카테고리 일정이 즉시 숨겨짐/나타남
- [ ] SC-2: 사이드바에서 태그 클릭 시 해당 태그가 포함된 일정만 남음
- [ ] SC-3: 여러 태그 선택 시 (OR 조건 또는 AND 조건 선택 필요 - 우선 OR로 구현) 정상 작동
- [ ] SC-4: 검색어와 필터가 동시에 적용됨
