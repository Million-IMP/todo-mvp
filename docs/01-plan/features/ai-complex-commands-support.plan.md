# Plan: ai-complex-commands-support

> **Feature**: AI 복합 명령 지원 (하위 작업 및 반복 설정)
> **Created**: 2026-05-14
> **Phase**: Plan

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | AI가 투두를 생성할 때 하위 작업이나 반복 설정을 한 번에 설정할 수 있는 도구 인터페이스가 부재함 |
| **Solution** | `createTodo` 및 `updateTodo` 도구의 스키마를 확장하여 `subtasks`와 `recurrence` 필드를 포함하고, 시스템 프롬프트를 통해 활용 가이드 제공 |
| **Functional UX Effect** | "내일 오전 9시에 매주 반복되는 회의 일정을 만들고 하위 작업으로 회의록 준비를 추가해줘"와 같은 자연어 명령 한 번에 수행 가능 |
| **Core Value** | AI 어시스턴트의 지능적 업무 대행 능력 강화 및 사용자 수고 최소화 |

---

## 1. 요구사항 (Requirements)

### 1.1 도구 스키마 확장
- [ ] `createTodo` 도구에 `subtasks` (제목 리스트) 필드 추가
- [ ] `createTodo` 도구에 `recurrence` (타입, 간격) 필드 추가
- [ ] `updateTodo` 도구에도 동일한 필드 추가 및 수정 지원

### 1.2 시스템 프롬프트 고도화
- [ ] AI가 사용자의 발화에서 하위 작업과 반복 의도를 포착하도록 지침 추가
- [ ] 구체적인 예시(Few-shot)를 제공하여 도구 호출 정확도 향상

---

## 2. 구현 계획

### 2.1 서버 사이드 (Tool Definition)
- `src/lib/ai/tools.ts`: `TOOL_DECLARATIONS` 수정 및 `executeTool` 로직 보완

### 2.2 AI 컨텍스트
- `src/lib/ai/context-builder.ts`: 시스템 프롬프트에 신규 필드 사용법 추가

---

## 3. 성공 기준 (Success Criteria)

- [ ] SC-1: AI에게 하위 작업을 포함한 투두 생성을 요청했을 때 올바른 인자로 도구가 호출됨
- [ ] SC-2: AI에게 반복 설정을 포함한 투두 생성을 요청했을 때 올바른 인자로 도구가 호출됨
- [ ] SC-3: 복합 명령(하위 작업 + 반복) 요청 시 모든 정보가 한 번에 반영됨

---

## 4. 구현 순서 (3단계)

1. **Phase 1 - 도구 정의 수정**: AI SDK에 전달할 함수 스키마 업데이트
2. **Phase 2 - 프롬프트 최적화**: AI가 신규 필드를 적극 사용하도록 유도
3. **Phase 3 - 통합 검증**: 1~3단계 전체 기능의 통합 테스트 (마지막 단계)
