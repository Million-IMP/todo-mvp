# Plan: todo-drag-and-drop

> **Feature**: 드래그 앤 드롭 순서 재정렬 (Drag & Drop)  
> **Created**: 2026-05-13  
> **Phase**: Plan  

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 일정이 많아질 때 중요도에 따라 순서를 바꾸고 싶어도 방법이 없음 (단순 생성순 표시) |
| **Solution** | `@dnd-kit` 라이브러리를 사용하여 캘린더 뷰 및 목록에서 일정을 드래그하여 순서를 바꿀 수 있는 기능 구현 |
| **Functional UX Effect** | 마우스 드래그만으로 직관적인 우선순위 조정 가능, 사용자가 원하는 배치 유지 |
| **Core Value** | "유연한 일정 관리", 시각적 우선순위 최적화 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 투두 리스트에서 순서는 곧 실행 우선순위를 의미함. 이를 자유롭게 바꿀 수 있어야 생산성 도구로서 가치가 있음 |
| **WHO** | 일일 계획을 세부적으로 조정하는 사용자 |
| **RISK** | 드래그 중 UI 깨짐 현상, 대량의 데이터 재정렬 시 성능 저하, DB 동기화 실패 |
| **SUCCESS** | 일정 드래그 -> 드롭 -> 순서 변경 반영 -> 새로고침 후에도 순서 유지 |
| **SCOPE** | `MonthView.tsx`, `WeekView.tsx` 내 일정 렌더링 로직 수정 및 `@dnd-kit` 통합 |

---

## 1. 요구사항 (Requirements)

### 1.1 드래그 앤 드롭 인터페이스
- [ ] `@dnd-kit/core` 및 `@dnd-kit/sortable` 라이브러리 설치
- [ ] 일정 카드(`TaskItem` 또는 `CalendarEvent`)에 드래그 핸들 또는 전체 드래그 영역 설정
- [ ] 드래그 중인 항목의 시각적 효과(그림자, 투명도 등) 적용

### 1.2 순서 로직 및 데이터 반영
- [ ] 동일한 날짜(Container) 내에서만 순서 변경 허용 (1단계 범위)
- [ ] 드롭 완료 시 `sort_order` 값을 계산하여 DB에 업데이트
- [ ] 낙관적 업데이트(Optimistic Update)를 통해 즉각적인 순서 변경 반영

### 1.3 캘린더 뷰 통합
- [ ] **MonthView**: 각 날짜 셀 내부의 일정 순서 변경
- [ ] **WeekView/DayView**: 시간대별 정렬은 유지하되, 겹치는 시간대의 순서 조정 또는 올데이 일정 순서 변경

---

## 2. 설계 (Design)

### 2.1 라이브러리 선정
- **@dnd-kit**: React 생태계에서 가장 현대적이고 가벼우며 확장성이 뛰어난 드래그 앤 드롭 라이브러리

### 2.2 데이터 구조
- `Todo` 타입의 `sort_order` 필드 활용
- 정렬 기준: `sort_order` 오름차순 (동일할 경우 `created_at`)

### 2.3 주요 컴포넌트 구조
- `DndContext`: 전역 드래그 상태 관리
- `SortableContext`: 정렬 가능한 목록 정의
- `useSortable`: 개별 일정 항목을 정렬 가능하게 만듦

---

## 3. 수정 및 추가 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 설치 |
| `src/components/calendar/MonthView.tsx` | `SortableContext` 적용 및 드래그 핸들링 |
| `src/components/calendar/CalendarEvent.tsx` | (가칭) `useSortable` 훅 적용 |
| `src/lib/supabase.ts` | 다수 항목의 `sort_order`를 한 번에 업데이트하는 `updateSortOrder` API 추가 |

---

## 4. 성공 기준 (Success Criteria)

- [ ] SC-1: 일정을 드래그하면 부드럽게 위치가 바뀜
- [ ] SC-2: 드롭 시 DB에 변경된 순서가 저장됨
- [ ] SC-3: 새로고침 후에도 사용자가 설정한 순서대로 일정이 표시됨
- [ ] SC-4: 드래그 중에도 기존의 클릭(상세 팝오버) 기능이 오작동하지 않음

---

## 5. 리스크 및 대응

- **성능**: 날짜마다 `SortableContext`가 많아질 경우 성능 체크 필요.
- **모바일**: 터치 센서(`TouchSensor`) 설정을 통해 모바일 환경에서도 드래그 지원.
- **날짜 간 이동**: 1단계에서는 순서만 조정하고, 2단계에서 날짜 변경(Date Update)까지 확장 고려.
