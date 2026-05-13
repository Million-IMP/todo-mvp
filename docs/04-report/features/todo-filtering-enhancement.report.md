# Report: todo-filtering-enhancement

> **Feature**: 카테고리 및 태그 상세 필터링  
> **Created**: 2026-05-13  
> **Phase**: Report  

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 일정이 많아졌을 때 특정 주제나 카테고리의 일정을 빠르게 찾기 어려움 |
| **Solution** | 사이드바에 실시간 태그 필터 UI 추가 및 필터링 로직 중앙 집중화 |
| **Functional UX Effect** | 클릭 한 번으로 관련 일정만 즉시 선별, "초기화" 기능을 통한 빠른 복구 지원 |
| **Core Value** | 사용자 맞춤형 뷰 제공 및 정보 관리 효율성 증대 |

---

## 1. 완료된 작업 (Completed Tasks)

- [x] **태그 필터링 구축**: `CalendarContext`에 태그 선택 상태 및 제어 함수 추가
- [x] **사이드바 UI 업그레이드**: 
    - 사용 중인 모든 유니크 태그를 자동 추출하여 버튼 리스트로 표시
    - 필터링 활성 상태를 감지하여 "초기화" 버튼 동적 노출
- [x] **로직 중앙화**: `DashboardPage`에서 모든 필터(검색, 카테고리, 태그)를 한 번에 처리하도록 개선
- [x] **코드 최적화**: 개별 뷰(MonthView)의 파편화된 필터 로직을 제거하여 성능 및 유지보수성 향상

---

## 2. 변경된 파일

- `src/contexts/CalendarContext.tsx`: 필터 상태 관리 확장
- `src/components/calendar/Sidebar.tsx`: 태그 필터 UI 및 태그 추출 로직 추가
- `src/app/main/dashboard/page.tsx`: 중앙 필터링 로직(`filteredTodos`) 구현
- `src/components/calendar/MonthView.tsx`: 내부 필터 로직 제거

---

## 3. 검증 결과 (Validation)

- **타입 체크**: `tsc --noEmit` 통과
- **기능 테스트**: 카테고리 토글, 태그 선택, 검색어 조합 시 정확한 투두 목록만 렌더링됨 확인
- **Match Rate**: 100%

---

## 4. 사용자 가이드

1. 사이드바의 **카테고리** 목록을 클릭하여 특정 카테고리를 끄거나 켤 수 있습니다.
2. 하단에 새롭게 추가된 **태그** 목록에서 원하는 태그(#공부, #업무 등)를 선택해 보세요.
3. 선택한 태그가 하나라도 포함된 일정들만 캘린더에 표시됩니다.
4. 모든 필터를 한 번에 해제하고 싶다면 카테고리 우측의 **[초기화]** 버튼을 누르세요.
