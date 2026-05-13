# Plan: ai-panel-auto-collapse

> **Feature**: AI 패널 자동 접힘 (외부 클릭 연동)  
> **Created**: 2026-05-13  
> **Phase**: Plan  

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | AI 어시스턴트 패널이 열려 있을 때 화면을 많이 차지하여 일반적인 웹 서핑이나 캘린더 조작에 방해가 됨 |
| **Solution** | AI 패널 영역 외부를 클릭할 경우 패널을 자동으로 접는(Collapse) 'Click Outside' 로직 구현 |
| **Functional UX Effect** | AI와 대화 후 다른 곳을 클릭하기만 해도 패널이 최소화되어 별도의 닫기 버튼을 찾을 필요가 없음 |
| **Core Value** | 사용자 흐름을 방해하지 않는 지능적이고 매끄러운 UI 전환 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 이전 단계에서 구현한 '캘린더 슬롯 클릭' 대응만으로는 부족함. 사용자가 브라우저의 어느 곳이든 패널 밖을 클릭하면 조작 의사가 패널 밖에 있다고 판단해야 함 |
| **WHO** | AI 어시스턴트 사용자 |
| **RISK** | 패널 내부 버튼이나 입력창 클릭 시 의도치 않게 닫히는 현상 방지 필요 |
| **SUCCESS** | 패널 외부(헤더, 사이드바, 캘린더 등) 클릭 시 `collapsed: true` 상태로 즉시 변경됨 |
| **SCOPE** | `AiPanel.tsx` 컴포넌트에 전역 클릭 리스너 및 영역 판별 로직 추가 |

---

## 1. 요구사항 (Requirements)

### 1.1 전역 외부 클릭 감지
- [ ] AI 패널이 열려 있을 때만 리스너 활성화
- [ ] 클릭 지점이 AI 패널(DOM 엘리먼트) 내부인지 외부인지 판별
- [ ] 외부 클릭 시 `useAiStore`를 통해 패널 접기 실행

### 1.2 예외 상황 처리
- [ ] 패널 상단 헤더 클릭 시에는 접기/열기 토글이 우선되어야 함
- [ ] 음성 입력 권한 팝업 등 브라우저 기본 UI 인터랙션과의 충돌 방지
- [ ] 입력 중이던 텍스트 유지 확인

---

## 2. 기술적 설계 (Technical Design)

### 2.1 영역 판별
- `useRef`를 사용하여 `AiPanel`의 최상위 DOM 엘리먼트 참조
- `document.addEventListener('mousedown', ...)`에서 `ref.current.contains(event.target)` 체크

### 2.2 구현 위치
- `AiPanel.tsx` 내부에서 `useEffect`를 사용하여 이벤트 리스너 생명주기 관리

---

## 3. 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/ai/AiPanel.tsx` | `useRef`, `useEffect`를 활용한 Click Outside 로직 추가 |

---

## 4. 성공 기준 (Success Criteria)

- [ ] SC-1: AI 패널 외부(예: 네비게이션 바, 캘린더 배경) 클릭 시 패널이 접힘
- [ ] SC-2: 패널 내부(메시지 리스트, 입력창, 마이크 버튼) 클릭 시에는 패널이 유지됨
- [ ] SC-3: 패널 헤더 클릭 시에는 기존처럼 토글 기능이 정상 동작함
- [ ] SC-4: 리스너가 적절히 제거되어 메모리 누수가 발생하지 않음
