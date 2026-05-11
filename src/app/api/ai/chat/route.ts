// Design Ref: §4.1 — POST /api/ai/chat (SSE 스트리밍)
// Plan SC-1, SC-2, SC-3, SC-7, FR-3, FR-4, FR-5

import { NextRequest, NextResponse } from 'next/server';
import {
  type Content,
  type Part,
} from '@google/generative-ai';
import { authenticate, isAuthError } from '@/lib/ai/auth';
import {
  GeminiNotConfiguredError,
  getModel,
  isGeminiConfigured,
} from '@/lib/ai/client';
import {
  executeTool,
  requiresConfirmation,
} from '@/lib/ai/tools';
import { buildSystemPrompt } from '@/lib/ai/context-builder';
import {
  parseStreamChunk,
  serializeStreamEvent,
} from '@/lib/ai/response-parser';
import type {
  AiClientContext,
  AiMessage,
  AiStreamEvent,
  AiToolCall,
  Todo,
} from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ============================================================
// Request shape
// ============================================================
interface ChatRequestBody {
  conversationId: string | null;
  message: string;
  context: AiClientContext;
}

function parseBody(raw: unknown): ChatRequestBody | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Invalid body' };
  const obj = raw as Record<string, unknown>;

  const message = obj.message;
  if (typeof message !== 'string' || message.trim().length === 0) {
    return { error: 'message is required' };
  }
  if (message.length > 4000) {
    return { error: 'message too long (max 4000)' };
  }

  const conversationId =
    typeof obj.conversationId === 'string' ? obj.conversationId : null;

  const ctx = obj.context as Partial<AiClientContext> | undefined;
  const context: AiClientContext = {
    currentDate:
      ctx?.currentDate && typeof ctx.currentDate === 'string'
        ? ctx.currentDate
        : new Date().toISOString().slice(0, 10),
    viewMode:
      ctx?.viewMode === 'day' ||
      ctx?.viewMode === 'week' ||
      ctx?.viewMode === 'month' ||
      ctx?.viewMode === 'schedule'
        ? ctx.viewMode
        : 'month',
  };

  return { conversationId, message: message.trim(), context };
}

// ============================================================
// POST /api/ai/chat
// ============================================================
export async function POST(request: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured', code: 'GEMINI_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { conversationId: requestedConvId, message, context } = parsed;

  // 1) 대화 ID 확보 (없으면 새로 생성)
  let conversationId = requestedConvId;
  if (!conversationId) {
    const { data, error } = await auth.supabase
      .from('ai_conversations')
      .insert({
        user_id: auth.userId,
        title: message.slice(0, 60),
      })
      .select('id')
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    conversationId = data.id as string;
  }

  // 2) 사용자 메시지 저장
  const { error: userMsgError } = await auth.supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      user_id: auth.userId,
      role: 'user',
      content: message,
    });
  if (userMsgError) {
    return NextResponse.json(
      { error: userMsgError.message },
      { status: 500 },
    );
  }

  // 3) 시스템 프롬프트 생성을 위한 사용자 투두 로드
  const { data: todosData } = await auth.supabase
    .from('todos')
    .select('*')
    .eq('user_id', auth.userId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(100);
  const todos: Todo[] = (todosData as Todo[]) ?? [];

  // 4) 이전 대화 로드 (최근 N개)
  const { data: historyData } = await auth.supabase
    .from('ai_messages')
    .select('role, content, tool_name, tool_args, tool_result, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: true })
    .limit(40);
  const history = (historyData as AiMessage[]) ?? [];

  const systemInstruction = buildSystemPrompt({ todos, client: context });
  const model = (() => {
    try {
      return getModel(systemInstruction);
    } catch (err) {
      if (err instanceof GeminiNotConfiguredError) return null;
      throw err;
    }
  })();
  if (!model) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured', code: 'GEMINI_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const geminiHistory = toGeminiHistory(history, message);

  // 5) 스트리밍 응답 작성
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: AiStreamEvent) => {
        controller.enqueue(encoder.encode(serializeStreamEvent(ev)));
      };

      const finish = (
        ev?: AiStreamEvent,
        opts?: { savedMessageId?: string },
      ) => {
        if (ev) send(ev);
        send({
          type: 'done',
          messageId: opts?.savedMessageId ?? '',
          conversationId: conversationId!,
        });
        controller.close();
      };

      try {
        // multi-turn: 사용자 메시지 → (text|toolCall) → (toolResponse) → 최종 text
        // - tool_call 발생 시 그 직전까지의 round 텍스트는 폐기 (preamble은 함수 응답 후
        //   다시 생성되어 중복됨). 최종 round 텍스트만 저장.
        let currentMessage: string | Part[] = message;
        let finalText = '';
        let safety = 0;
        let pendingHit = false;

        const chat = model.startChat({ history: geminiHistory });

        while (safety < 4 && !pendingHit) {
          safety += 1;
          let roundText = '';
          let roundHadToolCall = false;

          const result = await chat.sendMessageStream(currentMessage);

          outer: for await (const chunk of result.stream) {
            const events = parseStreamChunk(chunk);
            for (const ev of events) {
              if (ev.type === 'token') {
                roundText += ev.delta;
                send(ev);
              } else if (ev.type === 'tool_call') {
                // preamble 텍스트 폐기 → 클라이언트 화면 리셋
                if (roundText.length > 0) {
                  send({ type: 'reset_partial' });
                  roundText = '';
                }
                roundHadToolCall = true;

                // 파괴적 작업 → pending 처리
                if (requiresConfirmation(ev.call.name)) {
                  const pendingId = await savePendingTool(
                    auth.supabase,
                    auth.userId,
                    conversationId!,
                    ev.call,
                  );
                  send({ type: 'tool_pending', call: ev.call, pendingId });
                  pendingHit = true;
                  break outer;
                }

                // 즉시 실행 가능한 도구
                send(ev);
                const toolResult = await executeTool(
                  ev.call.name,
                  ev.call.args,
                  { userId: auth.userId, supabase: auth.supabase },
                );
                send({
                  type: 'tool_result',
                  name: ev.call.name,
                  result: toolResult,
                });
                await saveToolMessage(
                  auth.supabase,
                  auth.userId,
                  conversationId!,
                  ev.call,
                  toolResult,
                );
                currentMessage = [
                  {
                    functionResponse: {
                      name: ev.call.name,
                      response: toolResult as unknown as object,
                    },
                  },
                ];
                break outer;
              } else {
                send(ev);
              }
            }
          }

          if (pendingHit) break;

          if (!roundHadToolCall) {
            // tool_call 없이 텍스트만 → 최종 응답
            finalText = roundText;
            break;
          }
          // else: 다음 라운드 (currentMessage = functionResponse)
        }

        // 6) 모델 응답 저장 — 최종 라운드 텍스트만
        let savedId: string | undefined;
        if (finalText.trim().length > 0) {
          const { data } = await auth.supabase
            .from('ai_messages')
            .insert({
              conversation_id: conversationId,
              user_id: auth.userId,
              role: 'model',
              content: finalText,
            })
            .select('id')
            .single();
          savedId = data?.id as string | undefined;
        }

        finish(undefined, { savedMessageId: savedId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        const code = inferErrorCode(message);
        finish({ type: 'error', message, code });
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ============================================================
// helpers
// ============================================================

function toGeminiHistory(
  msgs: AiMessage[],
  excludeLastUser: string,
): Content[] {
  // 마지막 사용자 메시지는 sendMessageStream 인자로 별도 전달되므로 제외
  const filtered = [...msgs];
  if (
    filtered.length > 0 &&
    filtered[filtered.length - 1].role === 'user' &&
    filtered[filtered.length - 1].content === excludeLastUser
  ) {
    filtered.pop();
  }

  // Gemini 히스토리는 user/model 텍스트 turn만 유지. tool 메시지는 제외:
  // - 과거 functionCall 없이 functionResponse만 보내면 시퀀스 불일치
  // - 모델은 system prompt의 최신 투두 목록으로 결과 상태를 인지함 (충분)
  // - 또한 첫 turn이 'model'이면 Gemini가 reject하므로 첫 'user'까지 잘라냄
  const out: Content[] = [];
  let firstUserSeen = false;
  for (const m of filtered) {
    if (m.role === 'user') {
      firstUserSeen = true;
      out.push({ role: 'user', parts: [{ text: m.content }] });
    } else if (m.role === 'model' && firstUserSeen && m.content.trim().length > 0) {
      out.push({ role: 'model', parts: [{ text: m.content }] });
    }
    // tool 메시지는 skip
  }
  return out;
}

async function savePendingTool(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  userId: string,
  conversationId: string,
  call: AiToolCall,
): Promise<string> {
  const { data } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: 'tool',
      content: '',
      tool_name: call.name,
      tool_args: call.args,
      tool_result: { pending: true },
    })
    .select('id')
    .single();
  return (data?.id as string) ?? '';
}

async function saveToolMessage(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  userId: string,
  conversationId: string,
  call: AiToolCall,
  result: unknown,
): Promise<void> {
  await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    user_id: userId,
    role: 'tool',
    content: '',
    tool_name: call.name,
    tool_args: call.args,
    tool_result: result as object,
  });
}

function inferErrorCode(msg: string): string | undefined {
  const lower = msg.toLowerCase();
  if (lower.includes('quota') || lower.includes('rate') || lower.includes('429')) {
    return 'QUOTA_EXCEEDED';
  }
  if (lower.includes('api key') || lower.includes('unauthorized')) {
    return 'INVALID_API_KEY';
  }
  return undefined;
}
