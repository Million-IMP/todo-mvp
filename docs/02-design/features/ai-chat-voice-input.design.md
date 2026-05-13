# Design: ai-chat-voice-input

> **Feature**: AI 채팅 음성 입력 (Web Speech API)  
> **Created**: 2026-05-12  
> **Phase**: Design  

---

## 1. 커스텀 훅 설계 (`useSpeechToText.ts`)

### 1.1 인터페이스 (Types)
```typescript
interface UseSpeechToTextOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  lang?: string;
}

interface UseSpeechToTextReturn {
  isListening: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}
```

### 1.2 핵심 로직
- `window.SpeechRecognition` (또는 `webkitSpeechRecognition`) 인스턴스 생성
- `continuous: true`: 사용자가 말을 멈춰도 인식을 계속함
- `interimResults: true`: 중간 인식 결과를 실시간으로 제공
- `lang: 'ko-KR'`: 한국어 기본 설정

---

## 2. 컴포넌트 설계 (`AiInput.tsx`)

### 2.1 UI 구조 변경
- 전송 버튼 좌측에 마이크 버튼 추가
- `isListening` 상태에 따라 아이콘 색상 및 애니메이션 적용 (빨간색 깜빡임 등)
- 음성 인식 브라우저 미지원 시 마이크 버튼 렌더링 안 함

### 2.2 통합 로직
- `useSpeechToText` 훅을 호출하고 `onResult` 콜백에서 `setValue` 업데이트
- 음성 인식 버튼 클릭 시 `toggle()` 실행

```typescript
const { isListening, isSupported, toggle } = useSpeechToText({
  onResult: (text, isFinal) => {
    // 실시간으로 입력창에 반영
    setValue(text);
  },
  lang: 'ko-KR'
});
```

---

## 3. 사용자 경험 (UX) 시나리오

1. **시작**: 사용자가 마이크 버튼 클릭 -> 버튼이 빨간색으로 변하며 "음성 인식 중..." 시각적 표시
2. **발화**: 사용자가 "내일 오후 2시에 미팅 추가해줘"라고 말함
3. **실시간 피드백**: 입력창에 텍스트가 실시간으로 채워짐
4. **종료**: 사용자가 마이크 버튼을 다시 클릭하거나 일정 시간 침묵 시 종료 -> 버튼이 원래 색상으로 복구
5. **전송**: 변환된 텍스트 확인 후 엔터 또는 전송 버튼 클릭 (또는 "전송해줘" 발화 시 자동 전송 옵션 고려)

---

## 4. 예외 처리 설계

- **권한 거부**: 브라우저 알림으로 "마이크 권한이 필요합니다" 메시지 표시
- **인식 에러**: 에러 발생 시 자동 중단 및 사용자에게 알림
- **지원 브라우저**: Chrome, Edge, Safari(최신) 위주 대응. 미지원 시 버튼 숨김.
