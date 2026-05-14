// Design Ref: §5 (Tool Calling), §6.2 (Tool 정의 + 실행기)
// Plan SC: SC-2 (AI 제안으로 투두 생성), R-1 (파괴적 작업 안전장치)

import {
  SchemaType,
  type FunctionDeclaration,
} from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiToolName, AiToolResult, Todo, Subtask } from '@/types';

// ============================================================
// 1. Function Declarations — Gemini로 전달
// ============================================================

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'getCurrentTodos',
    description:
      '사용자의 현재 투두/일정 목록을 조회합니다. 날짜 범위로 필터링 가능.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        from: {
          type: SchemaType.STRING,
          description: '시작 날짜 (YYYY-MM-DD). 생략 시 오늘.',
        },
        to: {
          type: SchemaType.STRING,
          description: '종료 날짜 (YYYY-MM-DD). 생략 시 +30일.',
        },
      },
    },
  },
  {
    name: 'createTodo',
    description:
      '새로운 투두/일정을 생성합니다. 자연어에서 추출한 제목, 날짜, 시간, 하위 작업, 반복 설정을 정확히 채워서 호출하세요.',
    parameters: {
      type: SchemaType.OBJECT,
      required: ['title'],
      properties: {
        title: { type: SchemaType.STRING, description: '일정 제목' },
        description: {
          type: SchemaType.STRING,
          description: '상세 설명 (선택)',
        },
        due_date: {
          type: SchemaType.STRING,
          description: '날짜 YYYY-MM-DD (선택)',
        },
        start_time: {
          type: SchemaType.STRING,
          description: '시작 시간 HH:mm (선택)',
        },
        end_time: {
          type: SchemaType.STRING,
          description: '종료 시간 HH:mm (선택)',
        },
        category: {
          type: SchemaType.STRING,
          description: 'work | personal | study | other',
        },
        priority: {
          type: SchemaType.STRING,
          description: 'high | medium | low',
        },
        subtasks: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: '하위 작업 제목들의 리스트 (선택)',
        },
        recurrence: {
          type: SchemaType.OBJECT,
          description: '반복 설정 (선택)',
          properties: {
            type: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: ['none', 'daily', 'weekly', 'monthly'],
              description: '반복 주기',
            },
            interval: {
              type: SchemaType.NUMBER,
              description: '반복 간격 (기본값 1)',
            },
          },
        },
      },
    },
  },
  {
    name: 'updateTodo',
    description:
      '기존 투두를 수정합니다. id는 필수. 사용자 확인 다이얼로그를 거칩니다.',
    parameters: {
      type: SchemaType.OBJECT,
      required: ['id'],
      properties: {
        id: { type: SchemaType.STRING, description: '투두 ID' },
        title: { type: SchemaType.STRING },
        description: { type: SchemaType.STRING },
        due_date: { type: SchemaType.STRING },
        start_time: { type: SchemaType.STRING },
        end_time: { type: SchemaType.STRING },
        category: { type: SchemaType.STRING },
        priority: { type: SchemaType.STRING },
        completed: { type: SchemaType.BOOLEAN },
        subtasks: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              title: { type: SchemaType.STRING },
              completed: { type: SchemaType.BOOLEAN },
            },
          },
        },
        recurrence: {
          type: SchemaType.OBJECT,
          properties: {
            type: { type: SchemaType.STRING, format: 'enum', enum: ['none', 'daily', 'weekly', 'monthly'] },
            interval: { type: SchemaType.NUMBER },
          },
        },
      },
    },
  },
  {
    name: 'deleteTodo',
    description:
      '투두를 삭제합니다. id는 필수. 사용자 확인 다이얼로그를 거칩니다.',
    parameters: {
      type: SchemaType.OBJECT,
      required: ['id'],
      properties: {
        id: { type: SchemaType.STRING, description: '투두 ID' },
      },
    },
  },
  {
    name: 'findTodos',
    description: '제목/설명으로 투두를 검색합니다.',
    parameters: {
      type: SchemaType.OBJECT,
      required: ['query'],
      properties: {
        query: {
          type: SchemaType.STRING,
          description: '검색어 (제목/설명에서 부분 일치)',
        },
      },
    },
  },
];

// ============================================================
// 2. Tool 분류 — 사용자 확인이 필요한 파괴적 작업
// ============================================================

const REQUIRES_CONFIRMATION = new Set<AiToolName>(['updateTodo', 'deleteTodo']);

export function requiresConfirmation(name: AiToolName): boolean {
  return REQUIRES_CONFIRMATION.has(name);
}

// ============================================================
// 3. Tool Executor — 서버에서 직접 실행 가능한 (read + create)
// ============================================================

export interface ToolContext {
  userId: string;
  supabase: SupabaseClient;
}

export async function executeTool(
  name: AiToolName,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<AiToolResult> {
  try {
    switch (name) {
      case 'getCurrentTodos':
        return await getCurrentTodos(args, ctx);
      case 'createTodo':
        return await createTodo(args, ctx);
      case 'findTodos':
        return await findTodos(args, ctx);
      case 'updateTodo':
      case 'deleteTodo':
        // 파괴적 작업은 executeTool에서 직접 실행하지 않음.
        // 호출 측이 requiresConfirmation을 확인하고 pending 처리해야 함.
        return {
          ok: false,
          error: `${name} requires user confirmation. Use confirm endpoint.`,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * 사용자 확인 후 호출되는 파괴적 작업 실행기.
 * /api/ai/tools/confirm 엔드포인트에서만 사용.
 */
export async function executeConfirmedTool(
  name: AiToolName,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<AiToolResult> {
  try {
    switch (name) {
      case 'updateTodo':
        return await updateTodo(args, ctx);
      case 'deleteTodo':
        return await deleteTodo(args, ctx);
      default:
        return { ok: false, error: `${name} does not require confirmation` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

// ============================================================
// 4. 개별 Tool 구현
// ============================================================

async function getCurrentTodos(
  args: Record<string, unknown>,
  { userId, supabase }: ToolContext,
): Promise<AiToolResult> {
  const from = (args.from as string) ?? todayIso();
  const to = (args.to as string) ?? plusDaysIso(from, 30);

  const { data, error } = await supabase
    .from('todos')
    .select('id,title,description,due_date,start_time,end_time,category,priority,completed')
    .eq('user_id', userId)
    .or(`due_date.is.null,and(due_date.gte.${from},due_date.lte.${to})`)
    .order('due_date', { ascending: true })
    .limit(100);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { todos: data ?? [], from, to } };
}

async function createTodo(
  args: Record<string, unknown>,
  { userId, supabase }: ToolContext,
): Promise<AiToolResult> {
  const title = String(args.title ?? '').trim();
  if (!title) return { ok: false, error: 'title is required' };

  // 하위 작업 제목 리스트를 Subtask 객체 배열로 변환
  const rawSubtasks = (args.subtasks as string[]) ?? [];
  const subtasks: Subtask[] = rawSubtasks.map((stTitle) => ({
    id: uuidv4(),
    title: String(stTitle).trim(),
    completed: false,
  }));

  const insertPayload = {
    user_id: userId,
    title,
    description: stringOrEmpty(args.description),
    completed: false,
    priority: stringOr(args.priority, 'medium'),
    due_date: stringOrNull(args.due_date),
    start_time: stringOrNull(args.start_time),
    end_time: stringOrNull(args.end_time),
    category: stringOr(args.category, 'personal'),
    tags: [],
    sort_order: 0,
    subtasks,
    recurrence: args.recurrence ?? null,
  };

  const { data, error } = await supabase
    .from('todos')
    .insert([insertPayload])
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { todo: data as Todo } };
}

async function updateTodo(
  args: Record<string, unknown>,
  { userId, supabase }: ToolContext,
): Promise<AiToolResult> {
  const id = String(args.id ?? '').trim();
  if (!id) return { ok: false, error: 'id is required' };

  const { id: _, ...rest } = args;
  void _;
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) continue;
    updates[k] = v;
  }

  const { data, error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId) // RLS 추가 방어선
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { todo: data as Todo } };
}

async function deleteTodo(
  args: Record<string, unknown>,
  { userId, supabase }: ToolContext,
): Promise<AiToolResult> {
  const id = String(args.id ?? '').trim();
  if (!id) return { ok: false, error: 'id is required' };

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id } };
}

async function findTodos(
  args: Record<string, unknown>,
  { userId, supabase }: ToolContext,
): Promise<AiToolResult> {
  const query = String(args.query ?? '').trim();
  if (!query) return { ok: false, error: 'query is required' };

  const { data, error } = await supabase
    .from('todos')
    .select('id,title,description,due_date,category,completed')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(20);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { todos: data ?? [], query } };
}

// ============================================================
// 5. Helpers
// ============================================================

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(from: string, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function stringOr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function stringOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function stringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
