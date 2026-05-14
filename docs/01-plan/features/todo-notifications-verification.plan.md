# Plan: todo-notifications-verification

> **Feature**: 브라우저 알림 기능 검증 강화
> **Created**: 2026-05-14
> **Phase**: Plan

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 알림 기능 구현은 완료되었으나, 로직의 정확성을 보장하는 자동화된 테스트 부재 |
| **Solution** | Vitest를 이용한 단위 테스트 및 Playwright를 이용한 E2E 테스트 추가 |
| **Functional UX Effect** | 알림 누락이나 중복 발송 등의 오류를 사전에 차단하여 신뢰도 높은 알림 서비스 제공 |
| **Core Value** | 코드 품질 확보 및 향후 유지보수 시 회귀 에러 방지 |

---

## 1. 요구사항 (Requirements)

### 1.1 단위 테스트 (Unit Test)
- [ ] `checkAndNotify` 함수의 날짜 계산 로직 검증 (D-0, D-1)
- [ ] `localStorage`를 이용한 중복 알림 방지 로직 검증
- [ ] 알림 권한(`granted`, `denied`)에 따른 동작 분기 검증

### 1.2 E2E 테스트 (E2E Test)
- [ ] 사이드바의 알림 설정 섹션 렌더링 확인
- [ ] 알림 요청 버튼 클릭 시 동작 확인 (Mocking 필요)

---

## 2. 구현 계획

### 2.1 환경 설정
- [ ] Root 프로젝트에 `vitest`, `jsdom`, `@testing-library/react` 설치 (필요시)
- [ ] 기존 `frontend/`의 테스트 설정을 참고하거나 독립적인 설정 구축

### 2.2 테스트 작성
- [ ] `src/__tests__/lib/notifications.test.ts` 작성
- [ ] `tests/e2e/notifications.spec.ts` 작성

---

## 3. 성공 기준 (Success Criteria)

- [ ] SC-1: `notifications.test.ts` 내 모든 테스트 케이스 통과
- [ ] SC-2: Playwright를 이용한 E2E 테스트 통과
- [ ] SC-3: 기존 기능에 영향 없음 (Regression Check)

---

## 4. 구현 순서

1. **Phase 1 - 환경 설정**: Root 프로젝트에 Vitest 및 관련 의존성 추가
2. **Phase 2 - Unit Test 작성**: 알림 로직 검증
3. **Phase 3 - E2E Test 작성**: UI 및 상호작용 검증
4. **Phase 4 - 최종 보고**: 검증 결과 요약 및 보고
