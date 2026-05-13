# Design: ai-panel-auto-collapse

> **Feature**: AI 패널 자동 접힘 (캘린더 클릭 연동)  
> **Created**: 2026-05-13  
> **Phase**: Design  

---

## 1. 컴포넌트 로직 변경 (`DashboardPage`)

### 1.1 Store 구독
- `useAiStore`에서 `setCollapsed` 액션을 가져옵니다.

```typescript
const { setCollapsed } = useAiStore();
```

### 1.2 이벤트 핸들러 확장
- 캘린더 슬롯 클릭 시 호출되는 `handleSlotClick` 및 일정 클릭 시 호출되는 `handleEventClick` 내부에서 `setCollapsed(true)`를 호출합니다.

```typescript
const handleEventClick = (todo: Todo, rect: DOMRect) => {
  setCollapsed(true); // AI 패널 접기
  setPopoverTodo(todo);
  setPopoverRect(rect);
};

const handleSlotClick = (date: string, time?: string) => {
  setCollapsed(true); // AI 패널 접기
  setModalInitial(undefined);
  setModalDefaultDate(date);
  setModalDefaultTime(time);
  setModalOpen(true);
};
```

---

## 2. 인터랙션 흐름 설계

1. **사용자 액션**: 사용자가 AI와 대화 중 캘린더의 특정 날짜를 클릭함.
2. **상태 변화**:
    - `useAiStore`의 `collapsed` 상태가 `true`로 변경됨.
    - 동시에 클릭한 위치에 맞는 일정 생성 모달 또는 일정 팝오버가 열림.
3. **UI 피드백**:
    - 하단의 AI 패널이 즉시 내려가며 캘린더 영역이 넓어짐.
    - 사용자는 방해 요소 없이 일정을 확인하거나 입력할 수 있음.

---

## 3. 예외 케이스 고려

- **이미 접혀 있는 경우**: `setCollapsed(true)`를 호출해도 기존 상태와 동일하므로 추가적인 부작용 없음.
- **사이드바 조작**: 사이드바의 미니 캘린더 클릭 시에도 동일한 효과를 줄 것인가? -> 현재는 메인 캘린더 조작 시에만 적용하여 의도치 않은 닫힘을 최소화함. (필요시 확장 가능)

---

## 4. 수정 파일 상세 계획

- **`src/app/main/dashboard/page.tsx`**:
    - `useAiStore` import 및 hook 호출 추가.
    - `handleEventClick`, `handleSlotClick`, `openCreate` 함수 내부에 접힘 로직 삽입.
