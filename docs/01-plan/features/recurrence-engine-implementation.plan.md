# Plan: recurrence-engine-implementation

> **Feature**: 반복 일정(Recurrence) 엔진 구현
> **Created**: 2026-05-14
> **Phase**: Plan

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 반복 일정 타입은 정의되어 있으나, 실제로 다음 일정을 생성하거나 관리하는 엔진이 부재함 |
| **Solution** | 투두 완료 시 반복 설정(`daily`, `weekly`, `monthly`)에 따라 다음 발생일의 투두를 자동 생성하는 로직 구현 |
| **Functional UX Effect** | 루틴한 작업을 한 번만 등록하면 완료할 때마다 다음 작업이 자동으로 준비됨 |
| **Core Value** | 사용자 편의성 극대화 및 반복 업무 관리의 자동화 |

---

## 1. 요구사항 (Requirements)

### 1.1 다음 일정 계산 로직
- [ ] `daily`: 현재 마감일 + 1일
- [ ] `weekly`: 현재 마감일 + 7일
- [ ] `monthly`: 현재 마감일 + 1개월 (말일 처리 고려)

### 1.2 자동 생성 트리거
- [ ] 반복 설정이 있는 투두를 '완료(complete)' 처리할 때 발동
- [ ] 기존 투두의 제목, 설명, 우선순위, 카테고리, 태그, 하위 작업을 그대로 복사 (단, 하위 작업은 모두 미완료 상태로 초기화)

### 1.3 UI 연동
- [ ] 반복되는 일정임을 나타내는 아이콘 표시 (캘린더 및 리스트)

---

## 2. 구현 계획

### 2.1 유틸리티 함수
- `src/utils/dateUtils.ts`: `getNextOccurrence(currentDate, type, interval)` 함수 추가

### 2.2 API/Hook 수정
- `src/lib/supabase.ts` 또는 `src/hooks/useRealtimeTodos.ts`: 완료 처리 로직에 반복 생성 트리거 추가

---

## 3. 성공 기준 (Success Criteria)

- [ ] SC-1: 반복 설정된 투두 완료 시 다음 날짜의 투두가 성공적으로 생성됨
- [ ] SC-2: 생성된 새 투두의 데이터(카테고리, 태그 등)가 원본과 동일함
- [ ] SC-3: 하위 작업이 있는 경우 새 투두에서는 모두 미완료 상태로 복사됨

---

## 4. 구현 순서 (2단계)

1. **Phase 1 - 날짜 유틸리티**: 반복 주기별 다음 날짜 계산 로직 작성
2. **Phase 2 - 비즈니스 로직**: 투두 완료 시 새 투두 생성 트리거 구현
3. **Phase 3 - UI 반영**: 반복 일정 아이콘 표시
