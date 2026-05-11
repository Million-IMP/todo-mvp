// Design Ref: §4.5 — GET messages by conversation
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, isAuthError } from '@/lib/ai/auth';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const conversationId = request.nextUrl.searchParams.get('conversationId');
  const limitRaw = request.nextUrl.searchParams.get('limit');
  const limit = clampInt(limitRaw, 1, 200, 50);

  if (!conversationId) {
    return NextResponse.json(
      { error: 'conversationId is required' },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from('ai_messages')
    .select(
      'id, conversation_id, role, content, tool_name, tool_args, tool_result, created_at',
    )
    .eq('conversation_id', conversationId)
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

function clampInt(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
