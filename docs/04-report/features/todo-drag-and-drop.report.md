# Report: todo-drag-and-drop

> **Feature**: 드래그 앤 드롭 순서 재정렬 (Drag & Drop)  
> **Created**: 2026-05-13  
> **Phase**: Report  

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 일정이 많아질 때 중요도에 따라 표시 순서를 조정할 수 없어 가독성이 떨어짐 |
| **Solution** | `@dnd-kit`을 활용하여 캘린더 내 일정 드래그 앤 드롭 순서 변경 기능 구현 |
| **Functional UX Effect** | 마우스 드래그만으로 직관적인 우선순위 조정 가능, 사용자의 의도에 맞는 배치 유지 |
| **Core Value** | 일정 관리의 유연성 및 시각적 조직화 강화 |

---

## 1. 완료된 작업 (Completed Tasks)

- [x] **라이브러리 통합**: `@dnd-kit/core`, `@dnd-kit/sortable` 등을 프로젝트에 설치
- [x] **드래그 인터페이스**: `CalendarEvent` 컴포넌트를 분리하여 개별 일정을 드래그 가능하게 개선
- [x] **순서 변경 로직**: 동일 날짜 내에서 드롭 시 `arrayMove`를 통한 순서 재배치 구현
- [x] **데이터 영속성**: `sort_order` 컬럼을 활용하여 DB에 변경된 순서를 일괄 업데이트하는 API 연동
- [x] **UX 최적화**: 미세한 클릭과 드래그를 구분하기 위한 센서 제약 조건 설정

---

## 2. 변경된 파일

- `src/components/calendar/CalendarEvent.tsx`: (신규) 드래그 가능한 일정 컴포넌트
- `src/components/calendar/MonthView.tsx`: 드래그 앤 드롭 컨텍스트 및 핸들러 통합
- `src/lib/supabase.ts`: `updateSortOrders` API 추가
- `package.json`: dnd-kit 의존성 추가

---

## 3. 검증 결과 (Validation)

- **타입 체크**: `tsc --noEmit` 통과
- **기능 테스트**: 드래그 후 새로고침 시에도 조정된 순서가 유지됨 확인
- **Match Rate**: 100%

---

## 4. 사용자 가이드

1. 캘린더의 **월간 뷰(Month View)**에서 일정이 여러 개 있는 날짜를 확인합니다.
2. 일정을 클릭한 채로 위나 아래로 드래그해 보세요.
3. 원하는 위치에서 마우스를 놓으면(Drop) 순서가 바뀝니다.
4. 이제 사용자가 가장 중요하게 생각하는 일정을 맨 위로 배치하여 한눈에 관리할 수 있습니다!
