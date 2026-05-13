# Design: ai-panel-auto-collapse

> **Feature**: AI 패널 자동 접힘 (외부 클릭 연동)  
> **Created**: 2026-05-13  
> **Phase**: Design  

---

## 1. 컴포넌트 로직 설계 (`AiPanel.tsx`)

### 1.1 Ref 추가
- `aside` 엘리먼트를 참조하기 위해 `panelRef`를 추가합니다.

```typescript
const panelRef = useRef<HTMLElement>(null);
```

### 1.2 Click Outside 감지 로직 (`useEffect`)
- `document`에 `mousedown` 이벤트를 등록하여 클릭 위치를 판별합니다.
- 패널이 이미 접혀 있는 경우에는 리스너가 작동할 필요가 없습니다.

```typescript
useEffect(() => {
  if (collapsed) return;

  const handleClickOutside = (event: MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
      setCollapsed(true);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [collapsed, setCollapsed]);
```

---

## 2. UI 적용 (JSX)
- `aside` 태그에 `ref={panelRef}`를 연결합니다.

```tsx
<aside
  ref={panelRef}
  className={...}
  ...
>
  ...
</aside>
```

---

## 3. 상호작용 분석

| 클릭 위치 | 결과 | 비고 |
|-----------|------|------|
| 캘린더 배경 | **접힘** | `panelRef` 외부 |
| 상단 헤더 메뉴 | **접힘** | `panelRef` 외부 |
| AI 입력창 내부 | **유지** | `panelRef` 내부 |
| 메시지 말풍선 | **유지** | `panelRef` 내부 |
| 패널 헤더 (토글) | **유지/토글** | `panelRef` 내부 (기존 `onClick` 핸들러가 처리) |

---

## 4. 기타 고려 사항

- **성능**: `mousedown` 리스너는 가벼운 체크 로직만 포함하므로 성능 저하 우려가 적습니다.
- **모바일**: 모바일 브라우저에서도 `mousedown` 이벤트는 대개 터치 시 발생하므로 호환성이 확보됩니다. (필요시 `touchstart` 추가 검토 가능)
