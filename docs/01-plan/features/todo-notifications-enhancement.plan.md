# Plan: todo-notifications-enhancement

> **Feature**: 브라우저 알림 기능 고도화  
> **Created**: 2026-05-13  
> **Phase**: Plan  

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 현재 알림은 앱에 접속할 때마다 중복으로 발생하거나, 구체적인 알림 시간이 부족함 |
| **Solution** | `localStorage`를 활용하여 당일 중복 알림 방지, 마감 임박 일정의 시각적 강조 및 시스템 알림 최적화 |
| **Functional UX Effect** | 사용자에게 꼭 필요한 순간에만 알림을 보내 방해를 최소화하고 마감 준수율 향상 |
| **Core Value** | "사용자를 잊지 않게 돕는 스마트한 비서", 신뢰할 수 있는 리마인더 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 알림이 너무 잦으면 스팸처럼 느껴져 기능을 끄게 됨. 당일 1회 알림 등 최적화 필요 |
| **WHO** | 일정이 빡빡한 사용자 |
| **RISK** | 브라우저 알림 권한 거부 시 대체 수단(UI 내 배너 등) 필요 |
| **SUCCESS** | 마감 임박 시 알림 발생, 당일 중복 알림 미발생, 권한 거부 시 안내 문구 노출 |
| **SCOPE** | `notifications.ts`, `useNotifications.ts`, `Sidebar.tsx` (권한 요청 가이드) |

---

## 1. 요구사항 (Requirements)

### 1.1 지능형 알림 발송
- [ ] 당일 알림 여부를 `localStorage`에 저장하여 새로고침 시 중복 알림 방지
- [ ] 마감 당일(D-0)과 마감 전일(D-1) 구분하여 알림 (이미 일부 구현됨, 보완 필요)

### 1.2 권한 관리 가이드
- [ ] 알림 권한이 'default'인 경우 사이드바에 "알림 받기" 버튼 또는 안내 노출
- [ ] 권한이 'denied'인 경우 설정 변경 방법 안내 (툴팁 등)

### 1.3 시각적 강조 (UI)
- [ ] 마감 임박(D-0, D-1) 일정은 캘린더 및 목록에서 별도의 하이라이트(빨간색 테두리 등) 적용
- [ ] `DdayBadge` 컴포넌트의 활용도 높이기

---

## 2. 기술적 설계 (Technical Design)

### 2.1 중복 알림 방지 로직
- `last_notified_date`를 `YYYY-MM-DD` 형식으로 저장
- `checkAndNotify` 실행 시 현재 날짜와 비교하여 이미 알림을 보냈다면 스킵

### 2.2 UI 연동
- `Sidebar`에 알림 권한 상태를 보여주는 작은 인디케이터 추가

---

## 3. 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/notifications.ts` | `localStorage` 기반 중복 방지 로직 추가 |
| `src/components/calendar/Sidebar.tsx` | 알림 권한 요청 버튼 추가 |
| `src/components/ui/CalendarView.tsx` | (필요시) 마감 임박 일정 시각적 강조 |

---

## 4. 성공 기준 (Success Criteria)

- [ ] SC-1: 알림 권한 승인 후 첫 방문 시 마감 임박 알림 발생
- [ ] SC-2: 새로고침을 해도 같은 날짜에는 알림이 다시 뜨지 않음
- [ ] SC-3: 사이드바에서 현재 알림 권한 상태를 확인할 수 있음
- [ ] SC-4: 마감 기한이 지난 일정은 '초과' 알림 발송 (선택 사항)
