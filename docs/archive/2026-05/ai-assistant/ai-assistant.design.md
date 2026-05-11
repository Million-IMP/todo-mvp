# [Design] ai-assistant — Clean Architecture (Option B)

> **Status**: Design
> **Created**: 2026-05-10
> **Plan**: `docs/01-plan/features/ai-assistant.plan.md`
> **Architecture**: Option B — Clean Separation (장기 유지보수 우선)

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | 캘린더↔Gemini 창 전환 비용을 없애 "AI를 일정 관리 흐름의 일부"로 통합하기 위함. |
| **WHO** | 본인(개인 사용자) — 구글 캘린더와 투두를 함께 쓰는 생산성 사용자. |
| **RISK** | (1) AI의 잘못된 일정 조작으로 데이터 유실 (2) 무료 티어 쿼터 초과 (3) tool calling 파싱 실패 (4) API 키 노출. |
| **SUCCESS** | 캘린더 내 AI 채팅 + AI 제안으로 투두 생성 + 새로고침 후 이력 보존. |
| **SCOPE** | UI 패널, 채팅, 무료티어 API 키 연동(서버), 컨텍스트 주입, tool calling, 영구 저장. |

---

## 1. Overview

Option B를 선택하여 **6 컴포넌트 + 3 훅 + 4 서비스 + 3 API + 2 DB 테이블**의 깨끗한 레이어드 아키텍처로 구현한다. 각 레이어가 단일 책임을 가지며, 단위 테스트가 용이하다.

### 1.1 레이어 구조

```
┌────────────────────────────────────────────────────────────┐
│  Presentation Layer (src/components/ai/)                   │
│  AiPanel · AiHeader · AiMessageList · AiInput · ToolResult │
├────────────────────────────────────────────────────────────┤
│  Application Layer (src/hooks/)                            │
│  useAiChat · useAiTools · useAiConversation                │
├────────────────────────────────────────────────────────────┤
│  Service Layer (src/lib/ai/)                               │
│  client · tools · context-builder · response-parser        │
├────────────────────────────────────────────────────────────┤
│  API Layer (src/app/api/ai/)                               │
│  /chat · /conversations · /messages                        │
├────────────────────────────────────────────────────────────┤
│  Data Layer (Supabase)                                     │
│  ai_conversations · ai_messages (1:N, RLS)                 │
└────────────────────────────────────────────────────────────┘
```

---

## 2. 컴포넌트 설계

### 2.1 컴포넌트 트리

```
<DashboardPage>
  <Header />
  <Body>
    <Sidebar />
    <MainView />
  </Body>
  <AiPanel collapsed={collapsed} onToggle>     ← 신규
    <AiHeader title onNewChat onClose />
    <AiMessageList messages loading>
      <AiMessage role content>
        <AiToolResult tool result onUndo />    ← role=tool 메시지일 때
      </AiMessage>
      <AiSkeleton />                            ← loading 중
    </AiMessageList>
    <AiInput value onSubmit disabled />
  </AiPanel>
</DashboardPage>
```

### 2.2 컴포넌트 책임

| 컴포넌트 | 책임 | Props 핵심 |
|---|---|---|
| `AiPanel` | 컨테이너, 펼침/접힘 상태 관리, 키보드(`Esc`) | `collapsed`, `onToggle`, `children` |
| `AiHeader` | 제목, "새 대화" 버튼, 닫기 버튼 | `onNewChat`, `onClose` |
| `AiMessageList` | 메시지 목록 렌더링, 자동 스크롤(아래로) | `messages: AiMessage[]`, `loading` |
| `AiInput` | textarea + 전송 버튼, `Enter` 전송, `Shift+Enter` 줄바꿈 | `disabled`, `onSubmit(text)` |
| `AiToolResult` | tool 호출 결과 표시 + "되돌리기" 버튼 | `toolName`, `result`, `onUndo` |
| `AiSkeleton` | AI 응답 대기 중 표시 (점 애니메이션) | (없음) |

### 2.3 상태 관리

- **펼침/접힘 상태**: `useState(collapsed)` in `AiPanel` + `localStorage` 동기화 (`ai-panel-collapsed`)
- **메시지 목록**: React Query (`useQuery(['ai-messages', conversationId])`)
- **입력 텍스트**: `AiInput` 로컬 state
- **현재 대화 ID**: Zustand store 또는 `useState` in `DashboardPage` (전역 1개)

---

## 3. 데이터베이스 스키마

### 3.1 `ai_conversations` 테이블

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | 대화 ID |
| `user_id` | `uuid` | FK→`auth.users(id)`, NOT NULL | 소유자 |
| `title` | `text` | NULL 허용 | AI가 자동 생성 또는 첫 메시지 일부 |
| `created_at` | `timestamptz` | default `now()` | 생성 시각 |
| `updated_at` | `timestamptz` | default `now()` | 마지막 메시지 시각 |
| `archived` | `boolean` | default `false` | 아카이브 여부 |

**Index**: `(user_id, updated_at DESC)`

### 3.2 `ai_messages` 테이블

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | 메시지 ID |
| `conversation_id` | `uuid` | FK→`ai_conversations(id)` ON DELETE CASCADE | 대화 그룹 |
| `user_id` | `uuid` | FK→`auth.users(id)`, NOT NULL | 빠른 RLS용 (denormalize) |
| `role` | `text` | CHECK in (`'user'`, `'model'`, `'tool'`) | 발신자 |
| `content` | `text` | NOT NULL | 메시지 내용 (텍스트 또는 JSON 문자열) |
| `tool_name` | `text` | NULL 허용 | role=tool일 때 함수 이름 |
| `tool_args` | `jsonb` | NULL 허용 | tool 호출 인자 |
| `tool_result` | `jsonb` | NULL 허용 | tool 실행 결과 |
| `created_at` | `timestamptz` | default `now()` | |

**Index**: `(conversation_id, created_at ASC)`, `(user_id, created_at DESC)`

### 3.3 RLS 정책

```sql
-- ai_conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_conversations" ON ai_conversations
  FOR ALL USING (user_id = auth.uid());

-- ai_messages
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_messages" ON ai_messages
  FOR ALL USING (user_id = auth.uid());
```

### 3.4 마이그레이션 파일

- `supabase/migrations/{timestamp}_ai_assistant.sql` — 위 두 테이블 + RLS

---

## 4. API 설계

### 4.1 `POST /api/ai/chat` — 메시지 전송 (스트리밍)

**Request**:
```typescript
{
  conversationId: string | null,  // null이면 새 대화 자동 생성
  message: string,                 // 사용자 입력
  context?: {                      // 선택적: 클라이언트가 미리 빌드한 컨텍스트
    currentDate: string,
    viewMode: 'day' | 'week' | 'month' | 'schedule'
  }
}
```

**Response**: `text/event-stream` (Server-Sent Events 또는 Readable Stream)
```
event: token       data: { "delta": "안녕" }
event: token       data: { "delta": "하세요" }
event: tool_call   data: { "name": "createTodo", "args": {...} }
event: tool_result data: { "ok": true, "todoId": "..." }
event: done        data: { "messageId": "...", "conversationId": "..." }
```

**Errors**:
- `401` 미인증
- `400` 입력 검증 실패 (Zod)
- `429` 무료 티어 쿼터 초과
- `500` Gemini 호출 실패

### 4.2 `GET /api/ai/conversations` — 대화 목록

**Response**:
```typescript
{
  conversations: Array<{
    id: string,
    title: string | null,
    updatedAt: string,
    messageCount: number
  }>
}
```

### 4.3 `POST /api/ai/conversations` — 새 대화 생성

**Request**: `{ title?: string }`
**Response**: `{ id: string }`

### 4.4 `DELETE /api/ai/conversations/[id]` — 대화 삭제 (CASCADE)

### 4.5 `GET /api/ai/messages?conversationId=...&limit=50` — 메시지 조회

**Response**:
```typescript
{
  messages: Array<{
    id: string,
    role: 'user' | 'model' | 'tool',
    content: string,
    toolName?: string,
    toolArgs?: object,
    toolResult?: object,
    createdAt: string
  }>
}
```

---

## 5. Tool Calling 컨트랙트

### 5.1 정의된 Tools

서버측 `src/lib/ai/tools.ts`에서 Gemini SDK용 function declarations 정의:

| Tool | 설명 | 인자 | 확인 다이얼로그 |
|---|---|---|:---:|
| `getCurrentTodos` | 현재 사용자의 투두 목록 조회 | `{ from?: ISODate, to?: ISODate }` | ❌ |
| `createTodo` | 새 투두 생성 | `{ title, due_date, start_time?, end_time?, category?, description? }` | ⚠️ 자동 생성 후 "되돌리기" 토스트 |
| `updateTodo` | 기존 투두 수정 | `{ id, ...partial fields }` | ✅ 사용자 확인 필요 |
| `deleteTodo` | 투두 삭제 | `{ id }` | ✅ 사용자 확인 필요 |
| `findTodos` | 검색 | `{ query: string }` | ❌ |

### 5.2 Tool 실행 흐름

```
1. 사용자: "내일 오후 3시 회의 추가해줘"
2. /api/ai/chat → Gemini 호출 (tools=[createTodo, ...])
3. Gemini 응답: function_call { name: "createTodo", args: {...} }
4. 서버: tools.ts의 createTodo 실행 → Supabase insert
5. 서버: 결과를 Gemini에 다시 전송 (function_response)
6. Gemini: 자연어 응답 생성 ("내일 오후 3시 '회의'를 추가했습니다")
7. 서버: SSE로 클라이언트에 응답 + tool_result 메시지 저장
```

### 5.3 안전장치

- `updateTodo`/`deleteTodo`는 서버에서 **즉시 실행하지 않고**, `tool_pending` 메시지로 저장 후 클라이언트에 SSE 전송
- 클라이언트 `AiToolResult`가 사용자 확인 받고 별도 엔드포인트(`POST /api/ai/tools/confirm`)로 실행
- `createTodo`는 즉시 실행 + 5초 토스트 "되돌리기"(undo)

---

## 6. 서비스 레이어 (src/lib/ai/)

### 6.1 `client.ts` — Gemini SDK 래퍼

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export function getModel(systemInstruction: string) {
  return genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction,
    tools: [{ functionDeclarations: TOOL_DECLS }],
  });
}

export async function* streamChat(...) { /* generator */ }
```

### 6.2 `tools.ts` — Tool 정의 + 실행기

```typescript
export const TOOL_DECLS: FunctionDeclaration[] = [...];

export async function executeTool(
  name: string,
  args: any,
  ctx: { userId: string; supabase: SupabaseClient }
): Promise<ToolResult> { ... }
```

### 6.3 `context-builder.ts` — 컨텍스트 직렬화

```typescript
export function buildSystemPrompt(opts: {
  todos: Todo[];
  currentDate: string;
  viewMode: string;
}): string {
  return `당신은 일정 관리 어시스턴트입니다.
현재 날짜: ${opts.currentDate}
사용자가 보고 있는 뷰: ${opts.viewMode}
최근 투두 (최대 50개):
${opts.todos.slice(0, 50).map(formatTodo).join('\n')}
...`;
}
```

### 6.4 `response-parser.ts` — Gemini 응답 정규화

- 텍스트 / function_call / function_response를 통일된 `AiStreamEvent` 타입으로 변환
- 파싱 실패 시 fallback (raw text)

---

## 7. 훅 레이어 (src/hooks/)

### 7.1 `useAiChat`

```typescript
export function useAiChat(conversationId: string | null) {
  const [streaming, setStreaming] = useState(false);
  const [partialResponse, setPartialResponse] = useState('');

  const send = async (message: string) => {
    setStreaming(true);
    const res = await fetch('/api/ai/chat', { ... });
    const reader = res.body!.getReader();
    // SSE 파싱 + setPartialResponse
    // tool_call 이벤트 시 useAiTools.handleToolCall 호출
  };

  return { send, streaming, partialResponse };
}
```

### 7.2 `useAiTools`

- 서버에서 받은 `tool_pending` 처리
- 사용자 확인 다이얼로그 호출
- `POST /api/ai/tools/confirm` 호출
- React Query `invalidateQueries(['todos'])` 트리거

### 7.3 `useAiConversation`

- 대화 목록 조회 (React Query)
- 새 대화 생성, 삭제
- 현재 활성 대화 ID 관리 (Zustand 또는 Context)

---

## 8. Test Plan

### L1 — API Endpoint Tests
```bash
# 인증 없이 호출 → 401
curl -X POST http://localhost:3000/api/ai/chat -d '{"message":"hi"}'

# 정상 호출 (쿠키 포함)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Cookie: ..." -d '{"conversationId":null,"message":"오늘 일정 알려줘"}'
```

### L2 — UI Action Tests (Playwright)
- 패널 펼침/접힘
- 메시지 전송 → 응답 표시
- "새 대화" 버튼 → 빈 대화 시작
- 새로고침 후 이력 복원

### L3 — E2E Scenario Tests
- 시나리오 A: "이번 주 일정 요약" → 응답 확인
- 시나리오 B: "내일 3시 회의 추가" → 캘린더에 표시 확인
- 시나리오 C: 충돌 감지 + 수정 제안 + 사용자 확인

---

## 9. 보안 체크리스트

- [ ] `GEMINI_API_KEY`는 서버에서만 읽음 (`process.env`, `NEXT_PUBLIC_*` 금지)
- [ ] 모든 `/api/ai/*` 라우트는 Supabase 세션 검증 후 실행
- [ ] tool 실행 시 `userId`로 데이터 격리 (다른 사용자 todo 조회/수정 불가)
- [ ] Zod로 모든 요청 입력 검증
- [ ] 응답 SSE에 민감 정보(이메일, 토큰 등) 미노출
- [ ] 에러 메시지는 일반화 (스택 트레이스 클라이언트 노출 금지)

---

## 10. 마이그레이션 / 롤아웃 전략

1. `pnpm add @google/generative-ai` (또는 `npm`)
2. `.env.local`에 `GEMINI_API_KEY` 설정 (이미 완료)
3. Supabase 마이그레이션 적용 (`ai_conversations`, `ai_messages`)
4. 기능 플래그 없이 바로 캘린더 페이지에 통합 (개인 프로젝트, 단일 사용자)
5. 첫 사용 시 빈 대화 자동 생성

---

## 11. Implementation Guide

### 11.1 Module Map

| Module | 파일 | 의존성 |
|---|---|---|
| **M-DB** | `supabase/migrations/*_ai_assistant.sql` | (없음) |
| **M-Types** | `src/types/index.ts` 확장 | (없음) |
| **M-Service** | `src/lib/ai/{client,tools,context-builder,response-parser}.ts` | M-Types |
| **M-API** | `src/app/api/ai/{chat,conversations,messages}/route.ts` | M-Service, M-DB |
| **M-Hooks** | `src/hooks/{useAiChat,useAiTools,useAiConversation}.ts` | M-API |
| **M-Components** | `src/components/ai/*.tsx` | M-Hooks |
| **M-Integration** | `src/app/main/dashboard/page.tsx` 수정 | M-Components |

### 11.2 추천 구현 순서

```
1. M-DB         (DB 스키마 먼저 — 모든 레이어가 의존)
2. M-Types      (TypeScript 타입 정의)
3. M-Service    (Gemini SDK 래퍼, tool 정의)
4. M-API        (라우트 핸들러, 서비스 레이어 사용)
5. M-Hooks      (API 호출 훅)
6. M-Components (UI, 훅 사용)
7. M-Integration (DashboardPage에 AiPanel 추가)
```

### 11.3 Session Guide

여러 세션으로 나눠 구현 시 권장 분할:

| Session | --scope 키 | 산출물 |
|---|---|---|
| **Session 1** | `db,types,service` | DB 마이그레이션 적용, 타입 정의, lib/ai/* 4개 모듈 |
| **Session 2** | `api` | 3개 API 라우트 (인증, Zod, 스트리밍) |
| **Session 3** | `hooks,components` | 3개 훅, 6개 컴포넌트 |
| **Session 4** | `integration,polish` | DashboardPage 통합, 모바일 대응, 에러 UX |

각 세션은 다음과 같이 시작:
```bash
/pdca do ai-assistant --scope db,types,service
/pdca do ai-assistant --scope api
/pdca do ai-assistant --scope hooks,components
/pdca do ai-assistant --scope integration,polish
```

---

## 12. Open Decisions Resolved (Plan §8 → 답변)

| Question | Decision |
|---|---|
| Gemini 모델 | `gemini-2.0-flash` (속도+무료 쿼터 우선) |
| Tool calling 방식 | Gemini 공식 function calling 사용 |
| 컨텍스트 직렬화 | 마크다운 표 형식 (사람이 읽기 쉬움 + 토큰 효율 적당) |
| 대화 그룹핑 | 사용자 명시적 "새 대화" 버튼 (자동 분리 X) |
| 시스템 프롬프트 | `context-builder.ts`에서 동적 생성, 한국어 친화적 톤 |
| RLS 정책 | `user_id = auth.uid()` 단순 정책 |
| 사용자별 rate limit | 개인 프로젝트이므로 Phase 1 제외 (필요시 추후) |
