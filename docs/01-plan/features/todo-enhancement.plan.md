# Plan: todo-enhancement

> **Feature**: Todo App 고도화  
> **Created**: 2026-05-10  
> **Phase**: Plan  

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 기본 CRUD만 존재해 실용성 부족 — 중요도 구분, 기한 관리, 분류 체계, 현황 파악이 불가능 |
| **Solution** | 우선순위·마감일·카테고리/태그·통계·알림·UI 개선을 통해 본격적인 생산성 도구로 진화 |
| **Functional UX Effect** | 중요하고 급한 일을 먼저 처리하고, 마감을 놓치지 않으며, 내 작업 패턴을 파악할 수 있음 |
| **Core Value** | "언제까지, 무엇이 더 중요한지" 한눈에 파악 가능한 스마트 Todo 관리 도구 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 기본 CRUD 앱의 실용성 한계 — 우선순위·기한·분류 없이는 생산성 도구로 부족 |
| **WHO** | 현재 앱 사용자 (Supabase Auth 기반), 개인 생산성 관리가 필요한 사용자 |
| **RISK** | DB 스키마 변경(마이그레이션), 브라우저 알림 권한 거부, 드래그앤드롭 복잡도 |
| **SUCCESS** | 모든 기능이 기존 Todo와 연동되어 정상 동작, 배포 후 에러 없음 |
| **SCOPE** | 프론트엔드 중심 (Next.js + Supabase), 새 페이지(통계), 기존 dashboard 확장 |

---

## 1. 요구사항 (Requirements)

### 1.1 우선순위 & 마감일
- [ ] Todo 생성/수정 시 우선순위 선택: `High` / `Medium` / `Low`
- [ ] 기본값: `Medium`
- [ ] 마감일(due_date) 날짜 선택 (Date Picker)
- [ ] D-day 배지 표시: `D-3`, `D-1`, `D-DAY`, `초과`
- [ ] 우선순위별 색상: High=빨강, Medium=노랑, Low=회색

### 1.2 카테고리 & 태그
- [ ] 카테고리: Todo당 1개 선택 (업무 / 개인 / 학습 / 기타)
- [ ] 태그: Todo당 여러 개 자유 입력 (쉼표 구분, 최대 5개)
- [ ] 카테고리/태그 기준 필터링

### 1.3 통계 대시보드 페이지
- [ ] 전체 완료율 (원형 차트)
- [ ] 카테고리별 Todo 수 (막대 차트)
- [ ] 우선순위별 분포
- [ ] 주간 완료 추이 (최근 7일 라인 차트)

### 1.4 UI/UX 개선
- [ ] 다크모드 토글 (헤더에 버튼, Zustand 상태 유지)
- [ ] 드래그 앤 드롭 순서 재정렬 (`@dnd-kit/core` 사용)
- [ ] D-day 시각적 강조 (마감 임박 시 카드 하이라이트)
- [ ] **Todo 수정** 기능 추가 (인라인 편집, 현재 미구현)

### 1.5 브라우저 알림
- [ ] Notification API 활용 (권한 요청)
- [ ] 마감 당일 (D-0) 알림
- [ ] 마감 1일 전 (D-1) 알림
- [ ] 앱 방문 시 미완료 임박 Todo 자동 체크 후 알림

---

## 2. DB 스키마 변경

### 2.1 todos 테이블 컬럼 추가
```sql
ALTER TABLE todos
ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN due_date DATE,
ADD COLUMN category TEXT DEFAULT 'personal' CHECK (category IN ('work', 'personal', 'study', 'other')),
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN sort_order INTEGER DEFAULT 0;
```

### 2.2 기존 데이터 영향
- 기존 Todo: 새 컬럼 DEFAULT 값 자동 적용
- RLS 정책: 변경 불필요

---

## 3. 신규 파일 목록

| 파일 | 역할 |
|------|------|
| `src/stores/theme-store.ts` | 다크모드 상태 (Zustand + persist) |
| `src/components/ui/PriorityBadge.tsx` | 우선순위 배지 컴포넌트 |
| `src/components/ui/DdayBadge.tsx` | D-day 배지 컴포넌트 |
| `src/components/ui/TagInput.tsx` | 태그 입력 컴포넌트 |
| `src/components/ui/DatePicker.tsx` | 날짜 선택 컴포넌트 |
| `src/components/ui/CategorySelect.tsx` | 카테고리 선택 컴포넌트 |
| `src/app/main/stats/page.tsx` | 통계 대시보드 페이지 |
| `src/lib/notifications.ts` | 브라우저 알림 유틸리티 |
| `src/hooks/useNotifications.ts` | 알림 훅 |

---

## 4. 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/index.ts` | Todo 인터페이스에 priority, due_date, category, tags, sort_order 추가 |
| `src/lib/supabase.ts` | todosAPI.create/update에 새 필드 반영 |
| `src/app/main/dashboard/page.tsx` | 폼 확장, 카드 UI 개선, 드래그앤드롭, 필터 추가 |
| `src/app/main/layout.tsx` | 다크모드 토글, Stats 네비게이션 링크 추가 |
| `src/globals.css` | 다크모드 CSS 변수 |
| `package.json` | `@dnd-kit/core`, `@dnd-kit/sortable`, `chart.js`, `react-chartjs-2` 추가 |

---

## 5. 성공 기준 (Success Criteria)

- [ ] SC-1: 우선순위·마감일이 있는 Todo 생성 및 표시 정상 동작
- [ ] SC-2: 카테고리/태그 설정 및 필터링 정상 동작
- [ ] SC-3: 통계 페이지에서 차트 3종 모두 렌더링
- [ ] SC-4: 다크모드 토글 후 새로고침해도 유지
- [ ] SC-5: 드래그앤드롭으로 순서 변경 후 DB 반영
- [ ] SC-6: 마감 임박 Todo에 브라우저 알림 발송
- [ ] SC-7: Todo 인라인 수정 정상 동작
- [ ] SC-8: 기존 기능(추가/삭제/완료 토글/검색) 회귀 없음

---

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| Supabase 스키마 변경 시 기존 데이터 영향 | DEFAULT 값으로 ALTER TABLE, 롤백 SQL 준비 |
| 브라우저 알림 권한 거부 | 권한 거부 시 UI 내 배너로 대체 표시 |
| dnd-kit 드래그 복잡도 | sort_order 컬럼으로 DB 저장, 낙관적 업데이트 |
| chart.js 번들 사이즈 증가 | 통계 페이지만 lazy loading 적용 |

---

## 7. 구현 순서 (권장)

1. **Phase 1 - DB 마이그레이션** (Supabase SQL 실행)
2. **Phase 2 - 타입/API 레이어** (types, supabase.ts)
3. **Phase 3 - UI 컴포넌트** (Badge, DatePicker, TagInput)
4. **Phase 4 - Dashboard 확장** (폼 개선, 카드 개선, 필터 추가)
5. **Phase 5 - 다크모드**
6. **Phase 6 - 드래그앤드롭**
7. **Phase 7 - 통계 페이지**
8. **Phase 8 - 알림**
