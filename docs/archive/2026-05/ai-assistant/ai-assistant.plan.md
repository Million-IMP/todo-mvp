# [Plan] ai-assistant — 캘린더 내장 Gemini AI 어시스턴트

> **Status**: Plan
> **Created**: 2026-05-10
> **Owner**: a01048827458@gmail.com
> **Level**: Dynamic (Fullstack)

---

## Executive Summary

| 관점 | 요약 |
|---|---|
| **Problem** | 캘린더 페이지에서 AI 도움이 필요할 때마다 별도 Gemini 창으로 이동해야 해 컨텍스트가 끊기고 일정 정보를 수동 복붙해야 함. |
| **Solution** | 캘린더 페이지 하단에 접기/펼치기 가능한 Gemini AI 패널을 추가하고, **서버 측 GEMINI_API_KEY(무료 티어)** 로 Gemini API를 호출하며 현재 투두/일정 컨텍스트를 자동 주입함. |
| **Function/UX Effect** | 캘린더 화면을 떠나지 않고 AI에게 일정 조회·생성·수정·삭제를 요청 가능. AI 제안을 한 클릭으로 투두에 반영. 대화 이력은 Supabase에 영구 저장되어 기기·세션 간 동기화. |
| **Core Value** | "캘린더에서 즉시 AI" — 컨텍스트 전환 비용 제거 + 투두 자연어 입력으로 일정 관리 생산성 획기적 향상. |

> 📌 **인증 방식 결정 근거**: 사용자의 Gemini Pro 구독 쿼터는 공식 API로 접근 불가(구글이 의도적으로 차단). gemini.google.com iframe도 `X-Frame-Options`로 차단됨. 따라서 **AI Studio 무료 티어 API 키** 방식 채택 — `gemini-2.0-flash` 무료 한도(예: 일 1,500회 요청)가 개인 사용엔 충분. Pro 구독은 본 기능과 별개로 필요 시 직접 gemini.google.com 사용.

---

## Context Anchor

| Key | Value |
|---|---|
| **WHY** | 캘린더↔Gemini 창 전환 비용을 없애 "AI를 일정 관리 흐름의 일부"로 통합하기 위함. 사용자의 궁극적 동기. |
| **WHO** | 본인(개인 사용자) — 구글 캘린더와 투두를 함께 쓰는 생산성 사용자. |
| **RISK** | (1) AI가 잘못된 일정을 생성/삭제 시 데이터 유실 위험 (2) 무료 티어 일일 쿼터 초과 가능성 (3) tool calling 응답 파싱 실패 (4) API 키 노출 리스크. |
| **SUCCESS** | 별도 창 이동 없이 캘린더에서 AI 채팅 가능 + AI 제안으로 투두 1개 이상 생성/수정 성공 + 대화 이력 새로고침 후에도 보존. |
| **SCOPE** | UI 패널, 채팅 기능, **Gemini 무료 티어 API 키 연동(서버측)**, 투두 컨텍스트 주입, AI tool calling(생성/수정/삭제), 대화 영구 저장. (음성 입력·파일 첨부 제외, OAuth/Pro 구독 연동 제외) |

---

## 1. Overview

### 1.1 배경
프로젝트는 Next.js 15 App Router + Supabase + 구글 캘린더 OAuth 동기화로 구성된 풀스택 일정 관리 앱이다. 현재 캘린더 페이지(`src/app/main/dashboard/page.tsx`)에는 월/주/일/스케줄 뷰, 사이드바, 투두 CRUD, 구글 캘린더 양방향 동기화가 구현되어 있다. **AI 기능은 전무**한 상태이며, 사용자는 별도 Gemini 웹/앱으로 이동해 수동 복붙으로 사용 중.

### 1.2 목표
- 캘린더 페이지 **하단에 고정 AI 패널** 도입 (접기/펼치기 토글)
- **AI Studio 무료 티어 API 키**를 서버 환경변수에 보관, 서버 라우트(`/api/ai/chat`)에서 Gemini 호출 (클라이언트에 키 노출 없음)
- AI가 **현재 투두/일정 컨텍스트**를 인지하고 답변
- AI가 **투두 CRUD를 직접 수행**(tool calling) 또는 제안 → 사용자 승인 후 반영
- 대화 이력 **Supabase 영구 저장** (멀티 디바이스 동기화)

> ❎ **목표가 아닌 것**: Gemini Pro 구독($20/월) 쿼터 활용 — 공식 API로 접근 불가. 사용자가 Pro 구독 기능을 쓰려면 별도 gemini.google.com 방문이 여전히 필요(본 기능과 무관).

### 1.3 비목표 (Out of Scope)
- 음성 입력/출력
- 이미지·파일 업로드
- 멀티 AI 모델 선택 (Gemini 단일 모델 우선)
- AI 자동 일정 추천(능동) — 본 기능은 사용자 입력에 반응하는 "수동" 어시스턴트

---

## 2. Requirements

### 2.1 기능 요구사항 (Functional)

| ID | 요구사항 | 우선순위 |
|---|---|:---:|
| FR-1 | 캘린더 페이지 하단에 AI 패널이 고정 표시되며 헤더 클릭으로 접기/펼치기가 가능 | P0 |
| FR-2 | 펼친 상태에서 채팅 메시지 목록(스크롤) + 입력창 + 전송 버튼이 보임 | P0 |
| FR-3 | 사용자 입력 전송 시 Gemini API 호출 → 스트리밍/일괄 응답 표시 | P0 |
| FR-4 | Gemini 호출 시 현재 사용자의 **투두 목록 + 현재 보고 있는 날짜/뷰**를 system context로 자동 주입 | P0 |
| FR-5 | AI가 일정/투두 **생성**을 결정하면 tool calling으로 호출, 결과는 즉시 캘린더에 반영 | P0 |
| FR-6 | AI가 일정/투두 **수정/삭제**를 결정하면 사용자 확인 다이얼로그 후 반영 (파괴적 작업 안전장치) | P1 |
| FR-7 | 대화 이력은 Supabase `ai_messages` 테이블에 저장되고 패널 열 때 최근 N개를 로드 | P0 |
| FR-8 | "새 대화" 버튼으로 현재 세션을 종료하고 빈 대화 시작 | P1 |
| FR-9 | 서버 측에 `GEMINI_API_KEY` 환경변수가 없으면 명확한 설정 안내 표시 (개발자/운영자용) | P0 |
| FR-10 | 로딩 인디케이터(AI 응답 대기) 및 에러 표시 (네트워크/쿼터 초과/API 키 무효) | P0 |
| FR-11 | 무료 티어 일일 쿼터 초과 시 사용자에게 안내 메시지 (`quota_exceeded` 처리) | P1 |

### 2.2 비기능 요구사항 (Non-Functional)

| ID | 요구사항 |
|---|---|
| NFR-1 | `GEMINI_API_KEY`는 절대 클라이언트로 노출되지 않음 — 서버 환경변수에서만 읽고 `/api/ai/*` 라우트에서만 사용 (`NEXT_PUBLIC_*` 접두사 금지) |
| NFR-2 | 첫 응답 시작 시간 ≤ 3초 (Gemini 스트리밍 활용) |
| NFR-3 | 패널 펼침 시 캘린더 메인 영역이 줄어들되 최소 높이 보장 (모바일 고려) |
| NFR-4 | RLS(Row Level Security) — `ai_messages`는 본인 데이터만 read/write |
| NFR-5 | 대화 토큰 컨텍스트 길이 관리 — 최근 N개 메시지만 Gemini로 전송 (무료 티어 쿼터 보존) |
| NFR-6 | API 키는 `.env.local`에 보관, `.gitignore`에 포함, 절대 커밋되지 않음 |

### 2.3 Success Criteria

- [ ] **SC-1**: 캘린더 페이지에서 페이지 이탈 없이 AI 채팅 1회 이상 성공
- [ ] **SC-2**: AI 제안으로 투두 1개를 생성하고 캘린더에 반영됨을 확인
- [ ] **SC-3**: 새로고침 후에도 이전 대화 이력이 그대로 보임 (Supabase 영구 저장 검증)
- [ ] **SC-4**: 패널 접기/펼치기 시 캘린더 레이아웃이 깨지지 않음 (월/주/일/스케줄 뷰 모두)
- [ ] **SC-5**: `GEMINI_API_KEY` 미설정 시 사용자에게 명확한 안내가 표시됨 (오류 메시지 또는 패널 disabled)
- [ ] **SC-6**: API 키가 클라이언트 번들/네트워크 응답/HTML에 노출되지 않음 (DevTools `view-source`, Network 탭 검증)
- [ ] **SC-7**: 무료 티어 쿼터 초과(`429`) 시 graceful 안내 메시지 표시

---

## 3. 사용자 시나리오

### 시나리오 A — "이번 주 일정 요약"
1. 사용자가 캘린더 주간 뷰를 보다가 하단 AI 패널을 펼침
2. "이번 주 일정 요약해줘" 입력
3. AI가 현재 보고 있는 주간(예: 5/11~5/17) 투두 목록을 자동 인지하여 요약 응답
4. (Read-only 동작, 데이터 변경 없음)

### 시나리오 B — "새 일정 추가"
1. "내일 오후 3시 김 부장님과 회의 30분" 입력
2. AI가 tool calling으로 `createTodo({ title, due_date, start_time, end_time, ... })` 호출
3. 캘린더에 즉시 일정 표시 (구글 캘린더 동기화도 자동)
4. AI 응답에 "추가했습니다 [되돌리기]" 버튼 표시

### 시나리오 C — "일정 충돌 감지/수정"
1. "이번 주 회의 중에 겹치는 거 있어?" 입력
2. AI가 컨텍스트 기반으로 충돌 감지 → "수요일 14시 미팅 2건 겹침. 하나를 16시로 옮길까요?"
3. 사용자 "그래" → 사용자 확인 다이얼로그 → 수정 반영

### 시나리오 D — 무료 쿼터 초과
1. 사용자가 채팅 입력
2. Gemini API가 `429 Too Many Requests` 또는 `RESOURCE_EXHAUSTED` 반환
3. "오늘 무료 사용 한도를 초과했습니다. 내일 다시 시도해주세요" 안내 표시
4. 패널은 입력 가능 상태 유지(다른 시도 가능), 마지막 사용자 메시지는 보존

### 시나리오 E — 초기 설정 (개발/운영 측)
1. 운영자가 [AI Studio](https://aistudio.google.com/app/apikey)에서 API 키 발급 (신용카드 불필요, 무료)
2. `.env.local`에 `GEMINI_API_KEY=...` 추가
3. 서버 재시작 → AI 패널 정상 작동
4. (사용자 측은 추가 설정 불필요 — 그냥 사용)

---

## 4. 기술 스택 (제안)

| 레이어 | 선택지 | 비고 |
|---|---|---|
| AI API | Google Generative Language API (Gemini) | 모델: `gemini-2.0-flash` (속도/품질/무료 쿼터 균형) |
| 인증 | **API Key (서버 환경변수)** | `GEMINI_API_KEY` in `.env.local`. AI Studio에서 무료 발급. OAuth/Pro 구독 사용 안 함 |
| 백엔드 | Next.js Route Handler (`/api/ai/chat`) | 스트리밍 응답(`Readable Stream`) |
| DB | Supabase Postgres + RLS | 신규 테이블 `ai_conversations`, `ai_messages` |
| 프런트 SDK | `@google/generative-ai` (서버 측) | 공식 SDK, function calling 내장 지원 |
| UI | 기존 Tailwind + 신규 컴포넌트 | `src/components/ai/` 디렉토리 신설 |
| 상태 | React Query(메시지 목록) + 로컬 state(입력) | 기존 패턴 일관성 유지 |

> ✅ **인증 단순화**: API 키 방식은 OAuth scope 확장, ADC 교환, 토큰 재발급 등 복잡성을 모두 제거함. 서버에서 `Authorization` 헤더 없이 SDK가 내부적으로 키를 사용. Design 단계 PoC 부담 대폭 감소.

> 🔐 **Pro 구독은 어디에?**: 사용자의 $20/월 Gemini Pro 구독은 본 기능과 무관하게 gemini.google.com에서 그대로 사용. 본 기능은 별도의 무료 티어를 사용하므로 Pro 쿼터를 소진하지 않음.

---

## 5. 의존성 / 영향 범위

### 5.1 신규 추가
- `src/components/ai/AiPanel.tsx` — 컨테이너 (접기/펼치기, 헤더)
- `src/components/ai/AiMessageList.tsx` — 메시지 목록 + 자동 스크롤
- `src/components/ai/AiInput.tsx` — 입력창 + 전송
- `src/components/ai/AiToolResult.tsx` — tool calling 결과(되돌리기/확인)
- `src/hooks/useAiChat.ts` — 메시지 송수신 로직
- `src/lib/ai/gemini-client.ts` — 서버 측 Gemini SDK 래퍼
- `src/lib/ai/tools.ts` — todo CRUD tool 정의 + 실행기
- `src/lib/ai/context-builder.ts` — 투두/일정 컨텍스트 직렬화
- `src/app/api/ai/chat/route.ts` — 채팅 엔드포인트 (스트리밍)
- `src/app/api/ai/conversations/route.ts` — 대화 목록 CRUD
- `src/app/api/ai/messages/route.ts` — 메시지 목록 조회
- DB 마이그레이션: `ai_conversations`, `ai_messages` 테이블 + RLS

### 5.2 수정
- `src/app/main/dashboard/page.tsx` — 하단에 `<AiPanel />` 추가, 레이아웃 조정 (`flex-col` 안에서 `min-h-0`/`flex-1` 균형)
- `src/types/index.ts` — `AiMessage`, `AiConversation` 타입 추가
- `src/globals.css` — 패널 슬라이드 애니메이션(필요시)
- `.env.example` — `GEMINI_API_KEY=` 항목 추가 (실제 값은 비워둠)
- `package.json` — `@google/generative-ai` 의존성 추가

> 🚫 **수정하지 않는 파일**: `src/app/api/google/auth/route.ts`, `callback/route.ts` — 구글 캘린더 OAuth는 그대로 유지. AI 기능은 OAuth와 분리됨.

### 5.3 영향 받는 기능
- **레이아웃**: 메인 영역 높이가 줄어듦 → 월/주 뷰 셀 높이 영향 (검증 필요)
- **기존 구글 OAuth**: 영향 없음 (분리)
- **빌드/배포**: `.env.local` 설정 필수 단계 추가 → README/배포 문서 업데이트 필요

---

## 6. 리스크 및 대응

| ID | 리스크 | 영향도 | 대응 |
|---|---|:---:|---|
| R-1 | AI가 잘못된 데이터로 일정 삭제/수정 → 사용자 데이터 유실 | High | 파괴적 작업은 **반드시 확인 다이얼로그** + "되돌리기" 토스트 (5초) |
| R-2 | 무료 티어 일일 쿼터 초과 (예: `gemini-2.0-flash` 일 1,500회) | Medium | 컨텍스트 메시지 수 제한, 응답 길이 제한, `429` 응답 graceful 처리, 사용량 모니터링 |
| R-3 | API 키 우발적 노출 (커밋, 클라이언트 번들 등) | High | `.env.local` + `.gitignore`, `NEXT_PUBLIC_*` 접두사 절대 금지, pre-commit secret scan(추후) |
| R-4 | tool calling 응답 파싱 실패로 에러 | Medium | function calling 공식 SDK 사용, 실패 시 일반 텍스트로 graceful fallback |
| R-5 | 패널이 모바일에서 캘린더를 가림 | Medium | 모바일은 기본 접힘 상태, 펼치면 풀스크린 모달로 전환 |
| R-6 | 대화 이력이 쌓이면 DB/네트워크 부담 | Low | 페이지네이션(최근 50개), 오래된 대화 자동 아카이브(추후) |
| R-7 | API 키 도용 시 무한 호출 → 쿼터 소진 또는 과금 발생 가능성 | Medium | 서버 라우트에서 인증된 사용자만 호출 가능하도록 게이팅, 사용자별 rate limit 추가(추후) |

---

## 7. 마일스톤 (Design에서 세분화)

| Phase | 산출물 | 예상 |
|---|---|---|
| **M0 — Setup** | API 키 발급, `.env.local` 설정, `@google/generative-ai` 설치, 1회 호출 성공(`gemini-2.0-flash`) | 0.3세션 |
| **M1 — Plumbing** | `/api/ai/chat` 엔드포인트 + DB 스키마 + RLS | 1세션 |
| **M2 — UI MVP** | 패널 + 메시지 목록 + 입력 (read-only 채팅만) | 1세션 |
| **M3 — Context** | 투두/일정 컨텍스트 주입, system prompt 작성 | 0.5세션 |
| **M4 — Tool Calling** | createTodo / updateTodo / deleteTodo tool, 확인 UX | 1.5세션 |
| **M5 — Persistence** | 대화 영구 저장, 새로고침 시 복원 | 0.5세션 |
| **M6 — Polish** | 에러/로딩/모바일/재인증 UX | 0.5세션 |

---

## 8. Open Questions (Design에서 해결)

1. **Gemini 모델**: `gemini-2.0-flash` vs `gemini-1.5-flash` — 한국어 자연어 일정 파싱 품질 비교 필요 (둘 다 무료 티어 있음)
2. **Tool calling 형식**: Gemini의 function calling 안정성, 한국어 인자 추출 정확도
3. **컨텍스트 직렬화 형식**: 투두를 JSON으로 줄지, 마크다운 표로 줄지 (토큰 효율)
4. **대화 그룹핑**: 단일 무한 대화 vs 일자별 자동 분리 vs 사용자 명시적 새 대화
5. **시스템 프롬프트**: "당신은 일정 관리 어시스턴트입니다 ..." 톤/스타일 정의
6. **RLS 정책**: `ai_messages.user_id = auth.uid()` 형태로 단순화
7. **사용자별 rate limit**: 한 사용자가 무료 쿼터를 다 써버리는 것을 방지할지 (개인 프로젝트면 불필요)

---

## 9. 다음 단계

```bash
/pdca design ai-assistant
```

Design 단계에서 다음을 결정한다:
- 3가지 아키텍처 옵션 비교 (최소변경 / 깔끔한 분리 / 실용적 균형)
- API 컨트랙트 (요청/응답 스키마, tool 정의)
- DB 스키마 확정 (`ai_conversations`, `ai_messages`, RLS 정책)
- 컴포넌트 트리와 상태 관리 전략
- OAuth scope 확장 전략 + PoC 결과 반영
- 테스트 계획 (L1 API / L2 UI / L3 E2E)
