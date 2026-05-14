# Design: ai-complex-commands-support

> **Feature**: AI 복합 명령 지원 (하위 작업 및 반복 설정)
> **Created**: 2026-05-14
> **Phase**: Design

---

## 1. Tool Schema 업데이트 (`src/lib/ai/tools.ts`)

### 1.1 `createTodo` 인자 확장
```typescript
{
  name: "createTodo",
  description: "새로운 투두(일정)를 생성합니다. 하위 작업이나 반복 설정도 한 번에 지정할 수 있습니다.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      // ... 기존 필드
      subtasks: {
        type: "array",
        items: { type: "string" },
        description: "하위 작업 제목들의 리스트"
      },
      recurrence: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["none", "daily", "weekly", "monthly"] },
          interval: { type: "number", default: 1 }
        }
      }
    }
  }
}
```

---

## 2. 프롬프트 설계 (`src/lib/ai/context-builder.ts`)

### 2.1 시스템 지침 추가
- 사용자가 "체크리스트", "세부 항목", "~도 해야 해" 등으로 말하면 `subtasks` 필드 사용.
- 사용자가 "매일", "매주", "정기적으로" 등으로 말하면 `recurrence` 필드 사용.
- `subtasks`는 단순 문자열 배열로 받아서 서버에서 ID를 생성하여 처리.

---

## 3. 데이터 변환 로직
- AI가 보낸 `subtasks: string[]`을 `Subtask[]` (ID 포함) 형태로 변환하여 DB 저장.
- 반복 설정의 경우 기본값을 적절히 할당.
