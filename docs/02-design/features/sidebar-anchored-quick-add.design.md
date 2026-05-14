# Design: sidebar-anchored-quick-add

> **Feature**: 사이드바 앵커형 일정 생성 UI
> **Created**: 2026-05-14
> **Phase**: Design

---

## 1. 데이터 흐름 및 상태 관리

### 1.1 `DashboardPage.tsx`
- **State**: `sidebarAnchorRect: DOMRect | null`
- **Logic**: 
    - `Sidebar` 컴포넌트에 `onMiniCalendarRef` 콜백을 전달하여 앵커 위치를 수신.
    - `handleSlotClick` 또는 `openCreate` 시 `modalOpen`을 `true`로 설정.
    - 생성(Create) 모드일 때만 `sidebarAnchorRect`를 `EventModal`에 전달. (수정 모드일 때는 기존처럼 중앙 모달 유지)

### 1.2 `Sidebar.tsx`
- **Ref**: 미니 캘린더 컨테이너(`div`)에 `miniCalendarRef` 설정.
- **Effect**: 렌더링 후 또는 사이드바 상태 변경 시 `getBoundingClientRect()`를 호출하여 부모에게 전달.

---

## 2. UI 포지셔닝 설계 (`EventModal.tsx`)

### 2.1 조건부 스타일링
- `anchorRect` prop이 존재하는 경우:
    - `fixed` 위치 사용.
    - `top`: `anchorRect.bottom + 8` (8px 여백)
    - `left`: `anchorRect.left`
    - `transform`: `none` (중앙 정렬 해제)
    - `max-width`: `400px` (사이드바 영역에 맞게 조금 축소 고려)
- `anchorRect`가 없는 경우:
    - 기존 `items-center justify-center` 클래스 유지 (중앙 모달).

### 2.2 화살표(Tail) 추가 (Optional)
- 팝오버 상단에 사이드바를 가리키는 작은 삼각형 추가하여 시각적 연결성 강화.

---

## 3. 예외 상황 처리
- **사이드바 닫힘**: `sidebarAnchorRect`가 `null`이 되므로 자연스럽게 중앙 모달로 폴백.
- **화면 하단 범람**: `window.innerHeight`를 체크하여 팝오버가 화면 아래로 나갈 경우 `bottom` 기준으로 위치 조정.
