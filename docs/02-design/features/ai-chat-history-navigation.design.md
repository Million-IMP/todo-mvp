# Design: ai-chat-history-navigation

> **Feature**: AI 채팅 히스토리 탐색 (위쪽 화살표)  
> **Created**: 2026-05-12  
> **Phase**: Design  

---

## 1. 컴포넌트 구조 변경 (`AiInput.tsx`)

### 1.1 추가 상태 (States)
```typescript
// 이전 사용자 메시지들을 저장하는 배열 (최신순)
const [history, setHistory] = useState<string[]>([]);

// 현재 탐색 중인 히스토리 위치 (-1: 미탐색, 0: 가장 최신, 1: 그 다음...)
const [historyIndex, setHistoryIndex] = useState(-1);

// 히스토리 탐색 전 입력 중이던 텍스트 보관
const [stash, setStash] = useState('');
```

### 1.2 이벤트 핸들러 확장 (`onKeyDown`)
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  // 기존 Enter 처리 로직
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
    return;
  }

  // 히스토리 탐색 로직 (ArrowUp)
  if (e.key === 'ArrowUp') {
    // 텍스트 영역 내에서 첫 번째 줄에 커서가 있을 때만 동작하도록 개선 가능
    // 현재는 단순 구현을 위해 무조건 동작
    if (history.length === 0) return;

    e.preventDefault();
    let nextIndex = historyIndex + 1;
    if (nextIndex >= history.length) return; // 히스토리 끝

    if (historyIndex === -1) {
      setStash(value); // 현재 입력값 보관
    }

    setHistoryIndex(nextIndex);
    setValue(history[nextIndex]);
  }

  // 히스토리 탐색 로직 (ArrowDown)
  if (e.key === 'ArrowDown') {
    if (historyIndex === -1) return; // 탐색 중 아님

    e.preventDefault();
    let nextIndex = historyIndex - 1;

    if (nextIndex === -1) {
      setHistoryIndex(-1);
      setValue(stash); // 원래 쓰던 글로 복구
      setStash('');
    } else {
      setHistoryIndex(nextIndex);
      setValue(history[nextIndex]);
    }
  }
};
```

### 1.3 히스토리 업데이트 로직 (`handleSubmit`)
```typescript
const handleSubmit = () => {
  const trimmed = value.trim();
  if (!trimmed || disabled) return;

  onSubmit(trimmed);
  
  // 히스토리 업데이트
  setHistory(prev => {
    // 중복 방지: 마지막으로 보낸 메시지와 같으면 추가 안 함
    if (prev[0] === trimmed) return prev;
    return [trimmed, ...prev];
  });

  // 상태 초기화
  setValue('');
  setHistoryIndex(-1);
  setStash('');
};
```

---

## 2. 사용자 시나리오 및 상태 변화

| 동작 | history | historyIndex | stash | value |
|------|---------|--------------|-------|-------|
| 초기 상태 | `[]` | `-1` | `""` | `""` |
| "안녕" 입력 후 Enter | `["안녕"]` | `-1` | `""` | `""` |
| "반가워" 입력 후 Enter | `["반가워", "안녕"]` | `-1` | `""` | `""` |
| "질문..." 입력 중 (미전송) | `["반가워", "안녕"]` | `-1` | `""` | `"질문..."` |
| **ArrowUp 1회** | `["반가워", "안녕"]` | `0` | `"질문..."` | `"반가워"` |
| **ArrowUp 2회** | `["반가워", "안녕"]` | `1` | `"질문..."` | `"안녕"` |
| **ArrowDown 1회** | `["반가워", "안녕"]` | `0` | `"질문..."` | `"반가워"` |
| **ArrowDown 2회** | `["반가워", "안녕"]` | `-1` | `""` | `"질문..."` |

---

## 3. 고려 사항 (Fine-tuning)

- **다중 행 입력 대응**: `textarea`에서 커서 위치를 확인하여, 커서가 가장 윗줄에 있을 때만 `ArrowUp` 히스토리 탐색이 작동하도록 하면 더 자연스러운 UX를 제공할 수 있습니다.
- **영속성**: 현재는 메모리 상에서만 유지됩니다. 필요하다면 `localStorage`에 저장하여 새로고침 후에도 유지되게 할 수 있으나, 이번 단계에서는 메모리 유지로 진행합니다.
