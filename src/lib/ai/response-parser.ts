// Design Ref: §6.4 — Gemini 응답 정규화
// Gemini SDK의 raw chunk → 통일된 AiStreamEvent로 변환

import type {
  EnhancedGenerateContentResponse,
  GenerateContentCandidate,
  Part,
} from '@google/generative-ai';
import type { AiStreamEvent, AiToolName } from '@/types';

const KNOWN_TOOLS = new Set<AiToolName>([
  'getCurrentTodos',
  'createTodo',
  'updateTodo',
  'deleteTodo',
  'findTodos',
]);

/**
 * Gemini stream chunk(EnhancedGenerateContentResponse) 1개를
 * 0~N개의 AiStreamEvent로 변환.
 * - text part는 token 이벤트로
 * - functionCall part는 tool_call 이벤트로
 *
 * 호출 측은 tool_call 이벤트를 받으면 별도로 실행 후 functionResponse를
 * 모델에 다시 전송해야 한다 (multi-turn).
 */
export function parseStreamChunk(
  chunk: EnhancedGenerateContentResponse,
): AiStreamEvent[] {
  const events: AiStreamEvent[] = [];
  const candidates: GenerateContentCandidate[] = chunk.candidates ?? [];
  for (const cand of candidates) {
    const parts: Part[] = cand.content?.parts ?? [];
    for (const part of parts) {
      const ev = partToEvent(part);
      if (ev) events.push(ev);
    }
  }
  return events;
}

function partToEvent(part: Part): AiStreamEvent | null {
  if ('text' in part && typeof part.text === 'string' && part.text.length > 0) {
    return { type: 'token', delta: part.text };
  }

  if ('functionCall' in part && part.functionCall) {
    const fc = part.functionCall;
    const name = fc.name;
    if (!isKnownTool(name)) {
      return {
        type: 'error',
        message: `Unknown tool: ${name}`,
        code: 'UNKNOWN_TOOL',
      };
    }
    const args = (fc.args ?? {}) as Record<string, unknown>;
    return { type: 'tool_call', call: { name, args } };
  }

  return null;
}

function isKnownTool(name: string): name is AiToolName {
  return KNOWN_TOOLS.has(name as AiToolName);
}

/**
 * SSE(Server-Sent Events) 라인 직렬화.
 * 각 이벤트를 클라이언트가 EventSource 또는 ReadableStream으로 파싱 가능한
 * 텍스트 라인으로 변환.
 */
export function serializeStreamEvent(ev: AiStreamEvent): string {
  return `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
}

/**
 * 클라이언트 측: SSE 청크 텍스트를 AiStreamEvent로 파싱.
 * 부분적인 청크가 들어올 수 있으므로 buffer 사용 패턴 가정.
 */
export function parseSseChunk(buffer: string): {
  events: AiStreamEvent[];
  remainder: string;
} {
  const events: AiStreamEvent[] = [];
  const parts = buffer.split('\n\n');
  const remainder = parts.pop() ?? '';

  for (const block of parts) {
    if (!block.trim()) continue;
    const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
    if (!dataLine) continue;
    const payload = dataLine.slice(5).trim();
    try {
      const parsed = JSON.parse(payload) as AiStreamEvent;
      events.push(parsed);
    } catch {
      // malformed event — skip
    }
  }

  return { events, remainder };
}
