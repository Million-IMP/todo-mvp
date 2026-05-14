# Design: todo-notifications-verification

> **Feature**: 브라우저 알림 기능 검증 강화
> **Created**: 2026-05-14
> **Phase**: Design

---

## 1. 테스트 전략

### 1.1 단위 테스트 (Unit Test)
- **도구**: Vitest + jsdom
- **대상**: `src/lib/notifications.ts`
- **Mocking**:
    - `global.Notification`: 알림 생성 여부 및 인자 확인을 위해 `vi.fn()`으로 모킹
    - `localStorage`: `getItem`, `setItem` 동작 모킹
    - `Date`: 특정 날짜 상황(오늘 마감, 내일 마감)을 재현하기 위해 `vi.useFakeTimers` 사용

### 1.2 E2E 테스트 (E2E Test)
- **도구**: Playwright
- **대상**: Dashboard 페이지의 사이드바
- **시나리오**:
    1. 대시보드 진입
    2. 사이드바 내 '알림 설정' 텍스트 존재 확인
    3. 알림 권한 상태(허용됨/차단됨)에 따른 UI 대응 확인

---

## 2. 테스트 케이스 명세

### 2.1 Unit Test 케이스
| ID | 테스트 항목 | 기대 결과 |
|----|-----------|---------|
| UT-1 | 알림 권한이 `denied`일 때 | `Notification`이 호출되지 않아야 함 |
| UT-2 | 오늘 마감인 Todo가 있을 때 | `⚠️ 오늘 마감 Todo` 알림이 발생해야 함 |
| UT-3 | 내일 마감인 Todo가 있을 때 | `📅 내일 마감 Todo` 알림이 발생해야 함 |
| UT-4 | 이미 오늘 알림을 보냈을 때 | `localStorage` 체크 후 중복 알림이 가지 않아야 함 |

### 2.2 E2E Test 케이스
| ID | 테스트 항목 | 기대 결과 |
|----|-----------|---------|
| ET-1 | 사이드바 렌더링 | '알림 설정' 섹션이 화면에 표시되어야 함 |
| ET-2 | 권한 요청 버튼 | 버튼 클릭 시 `requestNotificationPermission` 함수가 트리거되어야 함 |

---

## 3. 인프라 설정 변경
- `package.json`에 `test` 관련 스크립트 추가
- `vitest.config.ts` 작성
