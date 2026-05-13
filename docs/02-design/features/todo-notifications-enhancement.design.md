# Design: todo-notifications-enhancement

> **Feature**: 브라우저 알림 기능 고도화  
> **Created**: 2026-05-13  
> **Phase**: Design  

---

## 1. 알림 중복 방지 설계 (`notifications.ts`)

### 1.1 핵심 로직
- `localStorage` 키: `last_todo_notification_date`
- `checkAndNotify` 함수가 호출될 때마다 오늘 날짜와 위 키 값을 비교합니다.
- 날짜가 다를 경우에만 알림을 발송하고, 발송 성공 시 위 키 값을 오늘 날짜로 갱신합니다.

```typescript
export function checkAndNotify(todos: Todo[]) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;

  const todayKey = new Date().toISOString().split('T')[0];
  const lastNotified = localStorage.getItem('last_todo_notification_date');
  
  if (lastNotified === todayKey) return; // 이미 오늘 알림을 보냄

  // 알림 로직...
  
  // 알림을 보낸 후 업데이트
  localStorage.setItem('last_todo_notification_date', todayKey);
}
```

---

## 2. 사이드바 권한 관리 UI (`Sidebar.tsx`)

### 2.1 상태 및 UI
- `Notification.permission` 상태에 따라 버튼을 다르게 표시합니다.
- 'default': "🔔 알림 활성화" 버튼 표시
- 'granted': "✅ 알림 켜짐" 메시지 표시
- 'denied': "⚠️ 알림 차단됨 (브라우저 설정 필요)" 안내

---

## 3. 마감 임박 시각적 강조

### 3.1 스타일 가이드
- **D-DAY**: 빨간색 텍스트 + `animate-pulse` 효과
- **D-1**: 주황색 강조
- 해당 로직은 `DdayBadge` 컴포넌트나 일정을 렌더링하는 `CalendarEvent` 등에서 `diff` 값을 계산하여 적용합니다.

---

## 4. 구현 세부 계획

1. **`src/lib/notifications.ts`**:
    - 중복 체크 로직 통합
    - `notify(title, body)` 헬퍼 함수로 분리
2. **`src/components/calendar/Sidebar.tsx`**:
    - 알림 상태를 관리할 `permission` 로컬 state 추가
    - `requestNotificationPermission` 연동 버튼 배치
3. **`src/hooks/useNotifications.ts`**:
    - 훅이 마운트될 때 권한 확인 및 체크 자동 실행
