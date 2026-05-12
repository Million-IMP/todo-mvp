// Design Ref: §6.3 — 컨텍스트 직렬화 (마크다운 표 형식)
// Plan FR-4: 투두 + 현재 날짜/뷰를 system context로 자동 주입

import type { Todo, AiClientContext } from '@/types';

interface BuildSystemPromptOptions {
  todos: Todo[];
  client: AiClientContext;
  /** 컨텍스트에 포함할 최대 투두 수 (토큰 절약) */
  maxTodos?: number;
}

const SYSTEM_PROMPT_HEADER = `당신은 캘린더/투두 일정 관리 어시스턴트입니다.

# 역할
- 사용자의 일정·투두를 자연어로 이해하고 도와주세요.
- 한국어로 답변하되, 정중하고 간결하게.
- 모호한 요청은 명확히 다시 물어보세요.

# 일정 조작 규칙
- 사용자가 새 일정을 요청하면 \`createTodo\` 함수를 호출하세요.
- 기존 일정을 수정/삭제할 때는 반드시 \`updateTodo\`/\`deleteTodo\`를 호출하세요 (사용자 확인 다이얼로그가 자동으로 뜹니다).
- 조회는 \`getCurrentTodos\` 또는 \`findTodos\`를 사용하세요.
- 함수 호출 후에는 결과를 사용자에게 친절하게 요약해 알려주세요.

# 시간 표현 규칙
- 날짜는 항상 YYYY-MM-DD 형식
- 시간은 항상 24시간 HH:mm 형식 (예: "오후 3시" → "15:00")
- "내일", "다음 주" 같은 상대 표현은 현재 날짜 기준으로 계산하세요.
`;

export function buildSystemPrompt({
  todos,
  client,
  maxTodos = 50,
}: BuildSystemPromptOptions): string {
  const contextSection = formatContext(client);
  const todosSection = formatTodos(todos, maxTodos);

  return `${SYSTEM_PROMPT_HEADER}
${contextSection}

${todosSection}`;
}

function formatContext(client: AiClientContext): string {
  return `# 현재 컨텍스트
- 실제 오늘 날짜(Today): ${client.today}
- 달력 기준 날짜: ${client.currentDate}
- 보고 있는 뷰: ${labelOfView(client.viewMode)}

주의: 사용자가 "오늘", "내일", "어제" 등을 언급하면 '실제 오늘 날짜(Today)'를 기준으로 계산하세요. '달력 기준 날짜'는 사용자가 현재 화면에서 보고 있는 기간을 의미합니다.`;
}

function labelOfView(view: AiClientContext['viewMode']): string {
  switch (view) {
    case 'day':
      return '일간';
    case 'week':
      return '주간';
    case 'month':
      return '월간';
    case 'schedule':
      return '스케줄(목록)';
  }
}

function formatTodos(todos: Todo[], maxTodos: number): string {
  if (todos.length === 0) {
    return `# 사용자의 투두 목록
(투두가 없습니다)`;
  }

  const sliced = todos.slice(0, maxTodos);
  const lines = sliced.map(formatTodoRow);
  const truncated =
    todos.length > maxTodos
      ? `\n\n_(전체 ${todos.length}개 중 ${maxTodos}개만 표시)_`
      : '';

  return `# 사용자의 투두 목록 (id 포함)
| id | 완료 | 날짜 | 시간 | 제목 | 분류 |
|---|:---:|---|---|---|---|
${lines.join('\n')}${truncated}`;
}

function formatTodoRow(t: Todo): string {
  const date = t.due_date ?? '-';
  const time =
    t.start_time && t.end_time
      ? `${t.start_time}~${t.end_time}`
      : t.start_time ?? '-';
  const done = t.completed ? '✓' : ' ';
  const safeTitle = escapePipes(t.title);
  return `| ${t.id} | ${done} | ${date} | ${time} | ${safeTitle} | ${t.category} |`;
}

function escapePipes(s: string): string {
  return s.replaceAll('|', '\\|');
}
