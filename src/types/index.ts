export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export type Priority = 'high' | 'medium' | 'low';
export type Category = 'work' | 'personal' | 'study' | 'other';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Recurrence {
  type: RecurrenceType;
  interval: number;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  category: Category;
  tags: string[];
  sort_order: number;
  subtasks: Subtask[];
  recurrence?: Recurrence | null;
  google_calendar_event_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export type SortField = 'sort_order' | 'priority' | 'due_date' | 'created_at';
export type ViewMode = 'list' | 'calendar';

// ============================================================
// AI Assistant
// Design Ref: §3 (DB), §5 (Tool Calling), §7 (Hooks)
// ============================================================

export type AiRole = 'user' | 'model' | 'tool';

export interface AiConversation {
  id: string;
  user_id: string;
  title: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: AiRole;
  content: string;
  tool_name?: string | null;
  tool_args?: Record<string, unknown> | null;
  tool_result?: Record<string, unknown> | null;
  created_at: string;
}

// Design §5.1 — Tool 정의 (서버/클라이언트 공유)
export type AiToolName =
  | 'getCurrentTodos'
  | 'createTodo'
  | 'updateTodo'
  | 'deleteTodo'
  | 'findTodos';

export interface AiToolCall {
  name: AiToolName;
  args: Record<string, unknown>;
}

export interface AiToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

// Design §4.1 — SSE event payload
export type AiStreamEvent =
  | { type: 'token'; delta: string }
  | { type: 'reset_partial' } // tool_call 직전 preamble 텍스트 폐기 신호
  | { type: 'tool_call'; call: AiToolCall }
  | { type: 'tool_result'; name: AiToolName; result: AiToolResult }
  | { type: 'tool_pending'; call: AiToolCall; pendingId: string }
  | { type: 'done'; messageId: string; conversationId: string }
  | { type: 'error'; message: string; code?: string };

// 클라이언트가 서버로 보내는 컨텍스트 힌트
export interface AiClientContext {
  currentDate: string;
  viewMode: 'day' | 'week' | 'month' | 'schedule';
}
