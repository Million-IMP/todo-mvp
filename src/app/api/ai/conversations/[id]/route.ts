// Design Ref: §4.4 — DELETE conversation (CASCADE 메시지)
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, isAuthError } from '@/lib/ai/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authenticate(request);
  if (isAuthError(auth)) return auth;

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from('ai_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
