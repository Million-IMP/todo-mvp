# CLAUDE.md

> 이 파일은 Claude Code / Antigravity / 기타 AI 코딩 에이전트가 자동으로 읽는 프로젝트 지침입니다.

## 🔥 가장 먼저 할 일

새 세션을 시작하면 **반드시** `HANDOVER.md`를 먼저 읽으세요. 직전 작업의 컨텍스트, 알려진 함정, 환경 정보가 모두 담겨 있습니다.

## Project Overview

**todo-mvp** — Next.js 14 + Supabase + Vercel 기반 일정 관리 앱.
- 핵심 기능: 캘린더(월/주/일/스케줄 뷰), 투두 CRUD, Google Calendar 양방향 동기화, **Gemini AI 어시스턴트 패널**
- Live: https://03agent-make.vercel.app
- GitHub: `Million-IMP/todo-mvp`

## Tech Stack

- **Framework**: Next.js 14.2.35 (App Router)
- **Language**: TypeScript
- **UI**: Tailwind CSS
- **State**: Zustand (persist) + React Query (`@tanstack/react-query`)
- **DB**: Supabase Postgres + Auth + RLS + Realtime
- **AI**: `@google/generative-ai` (Gemini 2.5 Flash — **`gemini-2.0-flash` 사용 금지**, quota=0)
- **Deploy**: Vercel (auto-deploy from `main` push)

## Directory Map

```
src/app/api/ai/       # AI assistant API routes
src/app/api/google/   # Google Calendar OAuth routes
src/app/main/         # Authenticated pages (dashboard, stats)
src/app/auth/         # Login, signup
src/components/ai/    # AI panel UI (6 components)
src/components/calendar/  # Calendar views + modals
src/contexts/         # CalendarContext (view state)
src/hooks/            # Custom hooks
src/lib/ai/           # AI services (server-only — client.ts, tools.ts, etc.)
src/lib/              # Shared utilities (supabase, google-calendar)
src/stores/           # Zustand stores
src/types/            # All TypeScript types in index.ts
supabase/migrations/  # DB schema (manually applied via Dashboard)
docs/archive/         # Completed PDCA cycles
```

## Common Commands

```bash
npm run dev              # dev server (http://localhost:3000)
npm run build            # production build (⚠️ dev 서버 중지 후 실행)
npx tsc --noEmit         # type check
vercel --prod            # manual prod deploy
vercel env pull --environment=development .env.local  # sync env vars
```

## Critical Rules

### 1. Server-only modules
서버 전용 모듈은 클라이언트에서 import 금지. 예: `src/lib/ai/client.ts`는 Gemini SDK를 직접 사용하므로 서버 라우트에서만 import. `src/lib/ai/response-parser.ts`는 클라이언트도 사용하므로 `import type`만 허용.

### 2. Bearer token auth pattern
모든 API 라우트는 `Authorization: Bearer <token>` 헤더 검증. AI 라우트는 `src/lib/ai/auth.ts:authenticate()`, Google 라우트는 `src/lib/supabase-admin.ts:getUserIdFromToken()` 사용.

### 3. RLS 이중 방어
RLS 정책에 의존하지 말고, 모든 쿼리에 `.eq('user_id', userId)` 명시. 정책 + 명시적 필터 둘 다 통과해야 함.

### 4. AI tool calling: 파괴적 작업 확인
`updateTodo`/`deleteTodo`는 `executeTool`에서 직접 실행하지 않고 `tool_pending` 이벤트로 분기. 사용자가 `/api/ai/tools/confirm` 호출해야 `executeConfirmedTool` 실행.

### 5. Gemini SDK 함정
- `gemini-2.0-flash` 사용 금지 (이 프로젝트 키의 quota=0)
- multi-turn history에 tool 메시지 포함 금지 (`role: 'user' + functionResponse` 거부됨)
- `tool_call` 전 preamble 텍스트는 폐기 (`reset_partial` 이벤트로 클라이언트 partial 리셋)

### 6. dev 서버 + build 충돌
`npm run build`나 `npx next build` 실행 전 반드시 dev 서버 중지. 동시 실행 시 `.next/trace` EPERM → 캐시 손상 → CSS 컴파일 마비.

## Architectural Patterns

### API Route Structure
```typescript
import { authenticate, isAuthError } from '@/lib/ai/auth';  // AI routes
// 또는
import { getUserIdFromToken } from '@/lib/supabase-admin';   // Google routes

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;
  // ... auth.userId, auth.supabase 사용
}
```

### Streaming (SSE) Response
```typescript
const stream = new ReadableStream<Uint8Array>({
  async start(controller) {
    const encoder = new TextEncoder();
    const send = (ev) => controller.enqueue(encoder.encode(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`));
    // ...
    controller.close();
  },
});
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',  // Vercel/Nginx 버퍼링 방지
  },
});
```

### React Query Pattern
```typescript
// Query key: ['<entity>', <scope>]
useQuery({ queryKey: ['todos', user?.id], queryFn: ..., enabled: !!user });
// Mutation 후 invalidate
queryClient.invalidateQueries({ queryKey: ['todos', user?.id] });
```

### Zustand with Persist
```typescript
export const useStore = create()(
  persist(
    (set) => ({ /* state */ }),
    {
      name: 'store-name',
      partialize: (s) => ({ /* 영속 필드만 */ }),
    },
  ),
);
```

## Security

- `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_SECRET`은 **서버 환경변수만**. `NEXT_PUBLIC_` 접두사 금지.
- 모든 API 라우트는 인증 검증 후 실행
- RLS 정책 + 명시적 user_id 필터로 이중 방어
- `.env.local`, `setup_vercel_env.ps1`, `scripts/` 모두 `.gitignore` 처리

## Working with Documentation

- 완료된 작업: `docs/archive/<YYYY-MM>/<feature>/`
- PDCA 메타데이터: `.bkit/state/pdca-status.json` (bkit 플러그인 사용 시)
- 직전 작업 참고: `docs/archive/2026-05/ai-assistant/ai-assistant.report.md`

## Communication Style

- 한국어 응답, 간결하게
- 단계별 진행 시 짧은 보고
- 사용자: 1인 풀스택 개발자 (a01048827458@gmail.com), Windows 11

## When in Doubt

1. `HANDOVER.md` 먼저 확인
2. 직전 PDCA 사이클 Report 확인
3. 코드 검색: Grep으로 패턴 찾기
4. 사용자에게 물어보기 (한국어로, 간결하게)
