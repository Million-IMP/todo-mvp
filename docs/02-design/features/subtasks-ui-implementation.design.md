# Design: subtasks-ui-implementation

> **Feature**: 하위 작업(Subtasks) 편집 UI 구현
> **Created**: 2026-05-14
> **Phase**: Design

---

## 1. UI 컴포넌트 설계

### 1.1 하위 작업 섹션 (EventModal.tsx)
- **위치**: 상세 설명(Description) 필드 하단
- **구조**:
    - **Header**: "하위 작업 (N개)" 라벨
    - **List**: `Subtask[]` 맵핑하여 렌더링
        - Checkbox: `completed` 연동
        - Input: 제목 표시 (수정 가능하도록 구현할지 여부 결정 - 1차는 읽기 전용/삭제만)
        - Delete Button: 쓰레기통 아이콘 또는 X 버튼
    - **Input Field**: 신규 하위 작업 입력창 + 추가 버튼

### 1.2 스타일링
- Tailwind CSS 클래스 활용
- 다크모드 대응 (`dark:bg-gray-700` 등)
- 하위 작업 항목 간 적절한 간격 (`space-y-2`)

---

## 2. 상태 관리 및 데이터 흐름

### 2.1 로컬 상태 (Local State)
- `subtasks`: `Subtask[]` (초기값: `todo?.subtasks || []`)
- `newSubtaskTitle`: `string` (입력 필드용)

### 2.2 함수 (Handlers)
- `handleAddSubtask()`: `newSubtaskTitle`이 비어있지 않으면 `subtasks` 배열에 추가
- `handleToggleSubtask(id)`: 해당 ID의 `completed` 반전
- `handleDeleteSubtask(id)`: 해당 ID 제거

### 2.3 데이터 연동 (Submit)
- `handleSubmit` 실행 시 `todosAPI.update` 또는 `create`의 `subtasks` 필드에 현재 로컬 `subtasks` 상태 전달

---

## 3. 데이터 구조 (Ref: src/types/index.ts)
```typescript
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}
```

---

## 4. 예외 처리
- 하위 작업 제목 없이 엔터 입력 시 무시
- 중복된 하위 작업 제목 허용 (ID로 구분하므로 기술적 문제는 없음)
- 삭제 시 즉시 상태 반영 (UI 우선 반영)
