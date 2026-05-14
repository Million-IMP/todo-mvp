# Design: recurrence-engine-implementation

> **Feature**: 반복 일정(Recurrence) 엔진 구현
> **Created**: 2026-05-14
> **Phase**: Design

---

## 1. 반복 로직 설계

### 1.1 다음 마감일 계산 (`getNextDueDate`)
```typescript
function getNextDueDate(currentDate: string, type: RecurrenceType, interval: number = 1): string {
  const date = new Date(currentDate);
  if (type === 'daily') date.setDate(date.getDate() + interval);
  if (type === 'weekly') date.setDate(date.getDate() + (7 * interval));
  if (type === 'monthly') date.setMonth(date.getMonth() + interval);
  return date.toISOString().split('T')[0];
}
```

### 1.2 복제 로직 (`duplicateTodo`)
- 원본 Todo의 `completed`는 `false`로 고정
- 원본 `subtasks`의 모든 항목 `completed`를 `false`로 리셋
- 새 `due_date` 적용

---

## 2. 통합 포인트

### 2.1 Todo 완료 핸들러 수정
- 위치: `useRealtimeTodos.ts` 또는 투두 완료 처리하는 컴포넌트
- 로직:
    1. 투두 완료 처리 (API 호출)
    2. 투두에 `recurrence`가 있고 `none`이 아니면:
        - `getNextDueDate`로 다음 날짜 계산
        - `todosAPI.create`를 호출하여 새 투두 생성

---

## 3. UI 변경 사항
- `TaskItem` 또는 `MonthView`/`WeekView`의 투두 카드에 반복 아이콘(🔄) 추가
