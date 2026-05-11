// Design Ref: §4.2, §4.3 — GET 목록 / POST 생성
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, isAuthError } from '@/lib/ai/auth';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { data, error } = await auth.supabase
    .from('ai_conversations')
    .select('id, title, created_at, updated_at, archived')
    .eq('user_id', auth.userId)
    .eq('archived', false)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  let body: { title?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body OK
  }

  const title =
    typeof body.title === 'string' && body.title.trim().length > 0
      ? body.title.trim().slice(0, 200)
      : null;

  const { data, error } = await auth.supabase
    .from('ai_conversations')
    .insert({ user_id: auth.userId, title })
    .select('id, title, created_at, updated_at, archived')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
}
