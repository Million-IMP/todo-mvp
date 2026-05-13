# Plan: todo-inline-editing

> **Feature**: 투두 인라인 편집 (Inline Editing)  
> **Created**: 2026-05-13  
> **Phase**: Plan  

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 간단한 제목 수정이나 오타 수정을 위해서도 매번 무거운 모달 창을 열어야 함 (편집 뎁스가 깊음) |
| **Solution** | 일정 상세 팝오버(EventPopover)에서 제목 클릭 시 즉시 입력창으로 전환되어 수정할 수 있는 기능 구현 |
| **Functional UX Effect** | 클릭 한 번으로 편집 모드 진입, 엔터로 즉시 저장되는 매끄러운 경험 제공 |
| **Core Value** | "최소한의 클릭으로 정보 갱신", 사용자 조작 편의성 극대화 |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 투두 관리의 핵심은 빠른 입력과 빠른 수정임. 현재의 모달 기반 수정은 소규모 수정에 부적합함 |
| **WHO** | 일정을 자주 관리하는 헤비 유저 |
| **RISK** | 실수로 인한 제목 변경(Esc 취소 기능 필요), 저장 중 로딩 처리 미흡 시 데이터 불일치 |
| **SUCCESS** | 팝오버에서 제목 클릭 -> Input 전환 -> 엔터 입력 -> DB 반영 및 UI 업데이트 성공 |
| **SCOPE** | `EventPopover.tsx` 컴포넌트 내부 및 `DashboardPage`의 `updateMutation` 연동 |

---

## 1. 요구사항 (Requirements)

### 1.1 인라인 편집 트리거
- [ ] `EventPopover`의 제목 영역 클릭 시 편집 모드(`isEditing`) 진입
- [ ] 편집 모드 진입 시 즉시 `focus` 처리 및 기존 텍스트 전체 선택

### 1.2 편집 및 저장 로직
- [ ] 엔터(Enter) 키 입력 시 변경된 내용 저장 (`updateMutation` 호출)
- [ ] ESC 키 입력 시 변경 취소 및 기존 제목 복구
- [ ] 입력창 외부 클릭(Blur) 시 자동 저장 또는 취소 여부 결정 (보통 저장이 선호됨)

### 1.3 시각적 피드백
- [ ] 편집 모드일 때 텍스트가 입력창(Input)으로 변경됨을 명확히 표시
- [ ] 저장 중일 때 인디케이터 또는 비활성화 처리
- [ ] 수정 성공 시 팝오버 닫힘 또는 상태 업데이트

---

## 2. 설계 (Design)

### 2.1 상태 관리
- `isEditing`: 편집 모드 여부 (boolean)
- `editValue`: 수정 중인 임시 텍스트 값 (string)

### 2.2 UI 컴포넌트
- 기존 `h3` 태그를 `isEditing` 조건에 따라 `input` 태그로 조건부 렌더링

---

## 3. 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/calendar/EventPopover.tsx` | 편집 상태 추가 및 Input 전환 로직 구현 |
| `src/app/main/dashboard/page.tsx` | 팝오버에서 발생한 수정 요청을 처리하는 핸들러 확인 |

---

## 4. 성공 기준 (Success Criteria)

- [ ] SC-1: 팝오버에서 제목을 클릭하면 입력창으로 바뀜
- [ ] SC-2: 글자 수정 후 엔터를 누르면 팝오버가 닫히거나 제목이 업데이트됨
- [ ] SC-3: 수정된 내용이 캘린더 뷰에도 즉시 반영됨 (Query Invalidation)
- [ ] SC-4: 수정 중 ESC를 누르면 원래 제목으로 돌아옴

---

## 5. 리스크 및 대응

- **데이터 동기화**: `updateMutation`이 진행되는 동안 팝오버가 닫히지 않게 하거나, 낙관적 업데이트(Optimistic Update)를 통해 즉각적인 반응을 보여주는 것이 좋음.
- **UX 충돌**: 클릭 시 편집 모드로 들어가는 것이 너무 민감할 수 있으므로, 편집 아이콘을 별도로 두거나 더블 클릭 방식을 고려할 수도 있으나, 우선 단일 클릭으로 시작.
