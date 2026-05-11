// Design Ref: §5.3 — 사용자 확인 후 update/delete tool 실행
// Plan R-1: 파괴적 작업 안전장치
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, isAuthError } from '@/lib/ai/auth';
import { executeConfirmedTool, requiresConfirmation } from '@/lib/ai/tools';
import type { AiToolName } from '@/types';

interface ConfirmBody {
  pendingId: string;
  /** confirm = 실행, reject = 취소 */
  decision: 'confirm' | 'reject';
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.pendingId || typeof body.pendingId !== 'string') {
    return NextResponse.json({ error: 'pendingId is required' }, { status: 400 });
  }
  if (body.decision !== 'confirm' && body.decision !== 'reject') {
    return NextResponse.json({ error: 'invalid decision' }, { status: 400 });
  }

  // 1) pending tool 메시지 조회
  const { data: pending, error: fetchErr } = await auth.supabase
    .from('ai_messages')
    .select('id, conversation_id, tool_name, tool_args, tool_result')
    .eq('id', body.pendingId)
    .eq('user_id', auth.userId)
    .eq('role', 'tool')
    .single();

  if (fetchErr || !pending) {
    return NextResponse.json({ error: 'Pending not found' }, { status: 404 });
  }

  const isPending =
    pending.tool_result &&
    typeof pending.tool_result === 'object' &&
    (pending.tool_result as Record<string, unknown>).pending === true;
  if (!isPending) {
    return NextResponse.json(
      { error: 'Already resolved' },
      { status: 409 },
    );
  }

  const toolName = pending.tool_name as AiToolName | null;
  if (!toolName || !requiresConfirmation(toolName)) {
    return NextResponse.json(
      { error: 'Not a confirmable tool' },
      { status: 400 },
    );
  }

  // 2) reject → 결과를 cancelled로 갱신하고 종료
  if (body.decision === 'reject') {
    await auth.supabase
      .from('ai_messages')
      .update({ tool_result: { ok: false, cancelled: true } })
      .eq('id', body.pendingId);
    return NextResponse.json({ ok: true, cancelled: true });
  }

  // 3) confirm → 실행 후 결과 저장
  const args = (pending.tool_args ?? {}) as Record<string, unknown>;
  const result = await executeConfirmedTool(toolName, args, {
    userId: auth.userId,
    supabase: auth.supabase,
  });

  await auth.supabase
    .from('ai_messages')
    .update({ tool_result: result as object })
    .eq('id', body.pendingId);

  return NextResponse.json({ ok: true, result });
}
