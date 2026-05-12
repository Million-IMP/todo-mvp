# GEMINI.md

> 이 파일은 Gemini CLI 및 AI 에이전트가 프로젝트를 이해하고 안전하게 작업을 수행하기 위한 지침서입니다.

## 🚀 프로젝트 개요 (Project Overview)

**todo-mvp (03.agent-make)**는 Next.js 14 App Router, Supabase, Google Calendar API 및 Gemini AI를 기반으로 구축된 지능형 일정 관리 애플리케이션입니다.

- **목적**: 캘린더 기반의 투두 관리 및 AI 어시스턴트를 통한 스마트한 일정 조작.
- **주요 기능**:
  - **캘린더**: 월간(Month), 주간(Week), 일간(Day), 스케줄(Schedule) 뷰 지원.
  - **투두 CRUD**: 우선순위, 카테고리, 태그, 하위 작업 및 반복 설정 지원.
  - **AI 어시스턴트**: Gemini 2.5 Flash를 사용하여 자연어로 투두 검색, 생성, 수정, 삭제 수행.
  - **동기화**: Google Calendar와 양방향 동기화 및 실시간 알림.
  - **보안**: Supabase Auth 및 RLS(Row Level Security)를 통한 데이터 보호.

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: Next.js 14.2 (App Router), TypeScript, Tailwind CSS.
- **State Management**: Zustand (Client state), React Query (Server state).
- **Backend/DB**: Supabase (Postgres, Auth, Realtime).
- **AI Engine**: Google Generative AI (Gemini 2.5 Flash).
- **Deployment**: Vercel.

## 🏗️ 아키텍처 및 폴더 구조 (Directory Map)

```
src/
├── app/
│   ├── api/             # 서버 사이드 API 라우트 (AI SSE, Google OAuth 등)
│   ├── auth/            # 로그인, 회원가입 페이지
│   └── main/            # 인증된 사용자 전용 대시보드 및 통계 페이지
├── components/
│   ├── ai/              # AI 어시스턴트 패널 및 관련 UI 컴포넌트
│   ├── calendar/        # 다양한 캘린더 뷰 및 모달
│   └── ui/              # 공용 UI 컴포넌트 (Badge, TimePicker 등)
├── hooks/               # 도메인 로직 및 데이터 패칭 커스텀 훅
├── lib/
│   ├── ai/              # AI 서비스 로직 (서버 전용: client, tools, context-builder)
│   ├── supabase.ts      # 클라이언트용 Supabase 유틸리티
│   └── supabase-admin.ts # 서버용 Supabase Admin (Service Role) 유틸리티
├── stores/              # Zustand 스토어 (auth, theme, ai-state)
└── types/               # TypeScript 타입 정의 (index.ts)
```

## ⌨️ 주요 실행 명령 (Common Commands)

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드 (⚠️ 실행 전 dev 서버 중지 필수)
npm run build

# 타입 체크
npx tsc --noEmit

# 린트 체크
npm run lint

# 환경 변수 동기화 (Vercel)
vercel env pull --environment=development .env.local
```

## 📋 개발 컨벤션 및 주요 규칙 (Development Conventions)

### 1. 보안 및 인증 (Security & Auth)
- **Bearer Token**: 모든 API 라우트는 `Authorization: Bearer <token>` 헤더를 통한 검증이 필수입니다.
- **RLS 이중 방어**: Supabase RLS 정책에만 의존하지 말고, 모든 쿼리에 `.eq('user_id', userId)` 필터를 명시해야 합니다.
- **Server-only**: `src/lib/ai/client.ts`와 같이 API Key를 사용하는 모듈은 절대 클라이언트 컴포넌트에서 import 하지 마십시오.

### 2. AI 어시스턴트 (AI Assistant)
- **모델 선택**: `gemini-2.0-flash`는 할당량 문제로 사용이 제한될 수 있으므로, 항상 **`gemini-2.5-flash`**를 사용하십시오.
- **Tool Calling**:
  - 단순 조회(read) 및 생성(create)은 즉시 실행합니다.
  - 수정(update) 및 삭제(delete)와 같은 파괴적 작업은 반드시 사용자에게 `tool_pending` 상태를 반환하여 명시적 확인(Confirm)을 거쳐야 합니다.
- **Streaming**: AI 응답은 SSE(Server-Sent Events)를 통해 스트리밍됩니다.

### 3. 상태 관리 (State Management)
- **Zustand**: UI 상태 및 전역 설정을 관리합니다. `persist` 사용 시 개인정보 보호를 위해 `partialize`를 적용하십시오.
- **React Query**: 서버 데이터 동기화 및 캐싱을 담당하며, Mutation 발생 시 관련 Query Key를 무효화(invalidate) 하십시오.

### 4. 기타 주의사항
- **Build Conflict**: `npm run build` 실행 시 dev 서버가 켜져 있으면 캐시 충돌이 발생할 수 있으므로 반드시 종료 후 실행하십시오.
- **UI/UX**: Tailwind CSS를 사용하며, 다크 모드(`dark` class)를 지원합니다.

## 🔗 외부 서비스 링크
- **Production**: https://03agent-make.vercel.app
- **Supabase Console**: https://supabase.com/dashboard/project/piqatcicfmdtlpjzrlvh
- **Google Cloud Console**: OAuth 리디렉션 URI 설정 확인 필수.
