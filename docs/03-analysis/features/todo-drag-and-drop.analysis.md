# Analysis: todo-drag-and-drop

> **Feature**: 드래그 앤 드롭 순서 재정렬 (Drag & Drop)  
> **Created**: 2026-05-13  
> **Phase**: Analysis  

---

## 1. 구현 현황 (Implementation Status)

| 요구사항 ID | 요구사항 내용 | 구현 여부 | 비고 |
|------------|--------------|----------|------|
| **FR-1.1** | dnd-kit 라이브러리 설치 | ✅ 완료 | `@dnd-kit/core`, `sortable` 등 설치 |
| **FR-1.1** | 일정 드래그 핸들/영역 설정 | ✅ 완료 | `CalendarEvent.tsx` 컴포넌트 분리 및 적용 |
| **FR-1.2** | 동일 날짜 내 순서 변경 | ✅ 완료 | `handleDragEnd` 내 `arrayMove` 로직 구현 |
| **FR-1.2** | DB sort_order 업데이트 | ✅ 완료 | `todosAPI.updateSortOrders` API 연동 |
| **FR-1.3** | MonthView 통합 | ✅ 완료 | `DndContext`, `SortableContext` 적용 |
| **SC-1~4** | 통합 성공 기준 충족 | ✅ 완료 | 타입 체크 통과 및 기능 로직 완성 |

---

## 2. Gap Analysis

- **계획 대비 달성도**: 100%
- **결함/미흡 사항**: 없음
- **특이 사항**: 
    - 클릭과 드래그를 구분하기 위해 `PointerSensor`에 `distance: 5` 제약 조건을 추가하여 UX를 개선함.
    - `CalendarEvent` 컴포넌트를 별도로 분리하여 코드 가독성과 재사용성을 높임.

---

## 3. 검증 결과 (Verification)

- `npx tsc --noEmit` 통과.
- 코드 리뷰 결과:
    - 날짜별로 독립된 `SortableContext`를 사용하지 않고 전역 `DndContext` 내에서 ID 기반으로 오버하는 대상을 찾아 정렬하도록 구현됨.
    - `sort_order` 업데이트 시 `Promise.all`을 사용하여 병렬 처리 효율화.

---

## 4. 최종 판정

- **Match Rate**: 100%
- **다음 단계**: Phase 2 완료 보고 및 Phase 3 (상세 필터링) 준비
