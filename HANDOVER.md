# HANDOVER — todo-mvp (03.agent-make)

> **For the next AI coding agent (Antigravity/Gemini/etc.)**
> Last update: 2026-05-12
> Last working agent: Claude Code (Opus 4.7)
> Status: ✅ Production live at https://03agent-make.vercel.app

---

## 0. 처음 봤다면 5분 컷 요약

이 프로젝트는 **Next.js 14 App Router + Supabase + Vercel** 기반 일정 관리 앱이다. 직전 작업으로 **캘린더 페이지에 Gemini AI 어시스턴트 패널을 통합**하는 PDCA 사이클을 완료했고 프로덕션에 배포됐다. 코드는 모두 커밋·푸시됨 (`main` branch).

**바로 사용 가능한 정보**:
- Tech: Next.js 14.2.35, TypeScript, Tailwind, Supabase, React Query (`@tanstack/react-query`), Zustand, Gemini 2.5 Flash
- 인증: Supabase Auth (email/password)
- 패턴: 모든 API 라우트는 `Authorization: Bearer <token>` 헤더 필요
- 배포: GitHub push → Vercel 자동 배포 (`Million-IMP/todo-mvp` → `million-imps-projects/03.agent-make`)

**일하기 전에 반드시**:
1. `docs/archive/2026-05/ai-assistant/_INDEX.md` 읽기 (직전 작업 상세)
2. 아래 §3 "절대 잊으면 안 되는 4가지" 숙지
3. 사용자에게 **이번 세션에서 뭘 할지** 물어보기 — 핸드오버는 컨텍스트 제공일 뿐, 능동 작업 시작 신호 아님

---

## 1. 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── ai/                  # AI 어시스턴트 (직전 작업 산출)
│   │   │   ├── chat/route.ts          (SSE 스트리밍, multi-turn tool calling)
│   │   │   ├── conversations/
│   │   │   │   ├── route.ts           (GET, POST)
│   │   │   │   └── [id]/route.ts      (DELETE)
│   │   │   ├── messages/route.ts      (GET)
│   │   │   └── tools/confirm/route.ts (POST — 파괴적 작업 확인)
│   │   └── google/              # Google Calendar OAuth 동기화
│   │       ├── auth/route.ts
│   │       ├── callback/route.ts
│   │       ├── disconnect/route.ts
│   │       ├── events/route.ts        (POST/PUT/DELETE)
│   │       ├── status/route.ts
│   │       └── sync/route.ts          (양방향 동기화)
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── main/
│   │   ├── layout.tsx                 (인증 가드 + CalendarProvider)
│   │   ├── dashboard/page.tsx         (캘린더 메인 + AI 패널 통합)
│   │   └── stats/page.tsx             (통계 차트)
│   ├── layout.tsx
│   └── page.tsx                       (root → /main/dashboard or /auth/login)
├── components/
│   ├── ai/                      # AI 어시스턴트 UI (6개)
│   │   ├── AiPanel.tsx                (컨테이너)
│   │   ├── AiHeader.tsx
│   │   ├── AiMessageList.tsx
│   │   ├── AiInput.tsx
│   │   ├── AiToolResult.tsx           (확인 다이얼로그 포함)
│   │   └── AiSkeleton.tsx
│   └── calendar/                # 캘린더 뷰
│       ├── MonthView.tsx              (월간)
│       ├── WeekView.tsx               (주간/일간 공용, days prop)
│       ├── ScheduleView.tsx           (목록형)
│       ├── Sidebar.tsx
│       ├── EventModal.tsx             (생성/수정 다이얼로그)
│       ├── EventPopover.tsx           (클릭 시 미니 카드)
│       └── constants.ts               (VIEW_LABELS, CATEGORY_CONFIG, toKey 등)
├── contexts/
│   └── CalendarContext.tsx            (viewMode, currentDate, sidebarOpen, searchQuery)
├── hooks/
│   ├── useAiChat.ts                   (SSE 스트리밍 + 낙관적 업데이트)
│   ├── useAiTools.ts                  (confirm/reject)
│   ├── useAiConversation.ts           (목록/생성/삭제)
│   ├── useGoogleCalendar.ts           (양방향 동기화 + 30s 폴링)
│   ├── useNotifications.ts            (브라우저 알림)
│   └── useRealtimeTodos.ts            (Supabase Realtime)
├── lib/
│   ├── ai/                      # AI 서비스 (서버 전용)
│   │   ├── client.ts                  (Gemini SDK 래퍼, DEFAULT_MODEL='gemini-2.5-flash')
│   │   ├── tools.ts                   (5개 tool + executeTool/executeConfirmedTool)
│   │   ├── context-builder.ts         (마크다운 표 형식 system prompt)
│   │   ├── response-parser.ts         (Gemini chunk → SSE 이벤트)
│   │   └── auth.ts                    (Bearer 인증 + RLS 클라이언트)
│   ├── ai-fetch.ts                    (클라이언트용 Bearer fetch 헬퍼)
│   ├── supabase.ts                    (anon 클라이언트 + authAPI + todosAPI)
│   ├── supabase-admin.ts              (service role + getUserIdFromToken)
│   ├── google-calendar.ts             (Google Calendar API 래퍼)
│   └── notifications.ts
├── stores/                      # Zustand
│   ├── auth-store.ts                  (persist)
│   ├── theme-store.ts                 (persist)
│   ├── filter-store.ts
│   └── ai-store.ts                    (collapsed=영속, activeConversationId=세션)
├── types/index.ts                     (Todo, AiMessage, AiConversation 등 모든 타입)
└── globals.css                        (Tailwind + 스크롤바 커스텀)

supabase/migrations/
└── 20260510_ai_assistant.sql          (ai_conversations + ai_messages + RLS + 트리거)

docs/
└── archive/2026-05/ai-assistant/      # 직전 PDCA 사이클 상세
    ├── _INDEX.md
    ├── ai-assistant.plan.md
    ├── ai-assistant.design.md
    ├── ai-assistant.analysis.md
    └── ai-assistant.report.md         ← 최우선 정독 추천
```

**무시해도 되는 디렉토리**: `.bkit/` (PDCA 메타데이터), `scripts/` (로컬 시드/스크린샷, gitignored).

---

## 2. 환경 & 배포 정보

### 2.1 GitHub
- Remote: `git@github.com:Million-IMP/todo-mvp.git`
- Branch: `main` (단일 브랜치 운영)
- 직전 커밋: `091df08 feat: add Gemini AI assistant panel + Google Calendar sync integration`

### 2.2 Vercel
- Project: `million-imps-projects/03.agent-make` (id: `prj_jHzi0xA5E4ncMmGy6RbzNU5ZXgAQ`)
- Live URL: **https://03agent-make.vercel.app**
- Auto-deploy on `main` push
- CLI: `vercel` (globally installed, authenticated as `million-imp`)

### 2.3 Supabase
- URL: `https://piqatcicfmdtlpjzrlvh.supabase.co`
- 테이블: `users`, `todos`, `google_tokens`, `ai_conversations`, `ai_messages`
- RLS 활성: 모든 사용자 데이터 테이블 (anon 차단, JWT 사용자만 본인 데이터)
- 마이그레이션: 수동 적용 (Dashboard SQL Editor). CLI 연결 미설정.
- CLI: `npx supabase` (v2.98.2)

### 2.4 환경변수 (이미 등록됨)

| Variable | Production | Preview | Development | Local |
|---|:---:|:---:|:---:|:---:|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ✅ | ✅ |
| `GEMINI_API_KEY` | ✅ | ⚠️ | ✅ | ✅ |
| `GOOGLE_CLIENT_ID` | ✅ | ⚠️ | ✅ | ✅ |
| `GOOGLE_CLIENT_SECRET` | ✅ | ⚠️ | ✅ | ✅ |
| `GOOGLE_REDIRECT_URI` | ✅ prod | ⚠️ | ✅ localhost | ✅ |

Preview는 feature branch가 생길 때 별도 등록 필요.

### 2.5 외부 서비스 콘솔
- Google Cloud OAuth: 승인된 리디렉션 URI에 `https://03agent-make.vercel.app/api/google/callback` **등록 완료**
- Gemini API: `aistudio.google.com/app/apikey`. 현재 키는 `gemini-2.5-flash` 작동 (단 `gemini-2.0-flash`는 quota=0)

---

## 3. 절대 잊으면 안 되는 4가지 (직전 작업에서 학습)

### 3.1 `gemini-2.0-flash`는 사용 금지
이 API 키의 프로젝트는 무료티어 quota=0. **`gemini-2.5-flash` 사용**.
`src/lib/ai/client.ts:14` 참고. 다른 모델로 바꿀 때 https://generativelanguage.googleapis.com/v1beta/models?key=KEY 로 가용 확인 먼저.

### 3.2 Gemini multi-turn history에 tool 메시지 포함하면 안 됨
`role: 'user' + functionResponse` 조합은 Gemini가 reject한다. 본 프로젝트는 **tool 메시지를 history에서 완전 제외**하고, 모델은 system prompt의 최신 투두 목록으로 결과 상태를 인지한다. `src/app/api/ai/chat/route.ts:toGeminiHistory` 참고.

### 3.3 tool_call 전 preamble 텍스트는 폐기
모델이 `tool_call` 직전에 텍스트를 emit하면, functionResponse 받은 후 두 번째 라운드에서 비슷한 텍스트를 다시 emit해 **중복 출력** 발생.
해결책: `reset_partial` 이벤트로 클라이언트 partial buffer 리셋 + 최종 라운드 텍스트만 DB 저장.
`src/app/api/ai/chat/route.ts` while 루프, `AiStreamEvent` 타입의 `reset_partial` 케이스 참고.

### 3.4 `npx next build`는 dev 서버 중지 후 실행
동시 실행 시 `.next/trace` EPERM 에러 → 캐시 부분 손상 → dev 서버 CSS 컴파일 마비. 복구 시 모든 dev 프로세스 kill + `.next` 삭제 + 재시작 필요.

---

## 4. 직전 작업 (ai-assistant) 핵심 결정

| 결정 | 이유 |
|---|---|
| 인증: API key 서버 보관 (OAuth 아님) | Gemini Pro 구독 쿼터는 API 접근 불가가 공식 정책 |
| 아키텍처: Clean Separation (Option B) | 장기 유지보수성. 컴포넌트 6 + 훅 3 + 서비스 4 + API 5 + DB 2 |
| AI 모델: `gemini-2.5-flash` | `2.0-flash` quota=0 발견 후 변경 |
| 파괴적 작업(update/delete) 확인 다이얼로그 | R-1 (AI 잘못 조작) 방어. `requiresConfirmation` 함수 |
| RLS 이중 방어 | `policy USING (user_id=auth.uid())` + 모든 쿼리에 `.eq('user_id', userId)` |
| 대화 그룹핑: 사용자 명시 "새 대화" 버튼 | 자동 분리 X. activeConversationId 관리 |

**Match Rate**: 98% (Plan/Design vs 구현). **SC 7/7 Met**.

---

## 5. 알려진 잠재 이슈 / Phase 2 후보

| 우선순위 | 항목 | 위치 |
|:---:|---|---|
| P1 | 모바일 가상 키보드가 AI 패널을 가림 (`window.visualViewport` API 사용해 보정) | `AiPanel.tsx` |
| P2 | 대화 전환 UI 부재 — 현재는 "새 대화"로만 분리. 멀티 대화 활용 시 사이드 드로어 필요 | `AiHeader.tsx` 확장 |
| P2 | 사용자별 rate limit 없음 — 무료 쿼터 보호용 (멀티 사용자 가정 시) | `src/app/api/ai/chat/route.ts` |
| P3 | Playwright E2E 테스트 0개 | `tests/e2e/` 미생성 |
| P3 | 음성 입력 (Web Speech API) | `AiInput.tsx` |
| P3 | 이미지 첨부 (Gemini 멀티모달) | `chat/route.ts` + `AiInput.tsx` |
| Bug | 같은 이메일에 auth.users 레코드 2개 존재 (`17d327ed...`와 `c8b64004...`). 추적 필요 | Supabase Auth |

---

## 6. 🚨 보안 액션 아이템

직전 세션 대화 기록에 다음 키들이 평문 공유됨. **재발급 강력 권장**:
1. **`SUPABASE_SERVICE_ROLE_KEY`** — 최우선 (DB 전체 RLS 우회 가능)
2. `GEMINI_API_KEY`
3. `GOOGLE_CLIENT_SECRET`

재발급 후 다음 위치 갱신:
- `.env.local` (로컬)
- Vercel 환경변수 (Production + Development): `vercel env rm <NAME> production` → `vercel env add <NAME> production --value "..." --yes`
- `setup_vercel_env.ps1`에 하드코딩된 값 (gitignored지만 로컬 파일)

`scripts/seed.mjs`, `scripts/seed.cjs`에 `SUPABASE_SERVICE_ROLE_KEY` 하드코딩되어 있음 — 이미 `.gitignore` 처리됨. 키 재발급 시 이 파일들도 업데이트.

---

## 7. 로컬 개발 시작하기

```bash
# 1. 의존성
npm install

# 2. .env.local 확인 (필요한 키 모두 있어야 함, §2.4 참고)
# 만약 없으면: vercel env pull --environment=development
vercel env pull --environment=development .env.local

# 3. 개발 서버
npm run dev        # http://localhost:3000

# 4. 타입 체크
npx tsc --noEmit

# 5. 빌드 검증 (dev 서버 반드시 중지 후!)
# 1) Ctrl+C로 dev 서버 종료
# 2) npm run build
```

**중요**: dev 서버가 떠 있는 상태로 `next build` 실행 금지 (§3.4 참고).

---

## 8. 배포 프로세스

자동: `git push origin main` → Vercel auto-deploy
수동: `vercel --prod` (로컬 코드 업로드)
재배포 (env 변경 반영): `vercel redeploy <latest-prod-url>`

배포 확인:
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://03agent-make.vercel.app/main/dashboard
curl -s -X POST https://03agent-make.vercel.app/api/ai/chat \
  -H "Content-Type: application/json" -d '{"message":"x"}' \
  -w "\nHTTP %{http_code}\n"   # 401 = OK (인증 가드 정상)
```

---

## 9. 주요 컨벤션 / 패턴

### 9.1 API 라우트
- 모든 라우트는 `Authorization: Bearer <token>` 헤더 검증
- AI 라우트: `src/lib/ai/auth.ts`의 `authenticate(request)` 헬퍼 사용
- Google 라우트: `src/lib/supabase-admin.ts`의 `getUserIdFromToken(token)` 사용
- Service role 클라이언트 vs 사용자 권한 클라이언트 구분
  - Admin: FK 우회, RLS 우회 (시스템 작업용)
  - User: Bearer 헤더 포함, RLS 통과 (정상 CRUD)

### 9.2 클라이언트 fetch
- 모든 API 호출은 `aiFetch`(AI 전용) 또는 `getSessionToken` + 수동 fetch (Google 등) 사용
- 토큰은 `supabase.auth.getSession()`에서 가져옴

### 9.3 React Query
- queryKey 패턴: `['<entity>', userId]` (예: `['todos', user?.id]`, `['ai-messages', conversationId]`)
- mutation 후 `invalidateQueries({ queryKey: [...] })` 또는 `setQueryData` 사용

### 9.4 Zustand
- persist 사용 시 `partialize`로 영속 필드 명시 (개인정보 최소화)
- 예: `ai-store`는 `collapsed`만 영속, `activeConversationId`는 세션 스코프

### 9.5 SSE 이벤트
- 서버: `event: <type>\ndata: <json>\n\n` 형식
- 클라이언트: `parseSseChunk(buffer)` 사용해 `AiStreamEvent[]` 추출
- 이벤트 타입: `token`, `reset_partial`, `tool_call`, `tool_result`, `tool_pending`, `done`, `error`

### 9.6 Tool 정의
- Gemini용 function declarations: `src/lib/ai/tools.ts:TOOL_DECLARATIONS`
- 실행 분기:
  - `executeTool`: read/create (즉시 실행)
  - `executeConfirmedTool`: update/delete (사용자 확인 후)
  - `requiresConfirmation(name)`: 어디서 분기할지 판단

---

## 10. 다음 작업자에게 권장 시작 방식

1. **이 문서 + Report 정독** (15분)
   - `HANDOVER.md` (이 문서)
   - `docs/archive/2026-05/ai-assistant/ai-assistant.report.md`
   
2. **사용자에게 직접 물어보기**
   - "이번 세션에서 뭘 작업할까요?"
   - Phase 2 후보 (§5) 중 선택일 수도, 완전 새 기능일 수도, 버그 픽스일 수도
   
3. **PDCA 사이클 따르고 싶으면**
   - 새 기능: `/pdca plan <feature>` 부터
   - 작은 수정: 바로 코드 → `/pdca analyze`로 검증 (선택)
   - 단, bkit이 Antigravity에서도 동작하는지 모름 — 동작 안 하면 일반 워크플로우로

4. **빠른 sanity check**
   ```bash
   git log --oneline -5
   npm run dev
   curl http://localhost:3000/main/dashboard -o /dev/null -w "%{http_code}\n"
   ```
   모두 200이면 환경 OK.

---

## 11. 연락처 / 추가 정보

- **사용자 이메일**: a01048827458@gmail.com
- **사용자 역할**: 1인 개발자, 풀스택, 한국어 사용
- **선호**: 짧고 명확한 응답, 한국어, 작업 진행 시 단계별 보고
- **개발 환경**: Windows 11, PowerShell, Whale 브라우저 (Chrome 기반), VS Code(추정)
