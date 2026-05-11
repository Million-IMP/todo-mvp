import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken, googleTokensAPI } from '@/lib/supabase-admin';

export async function DELETE(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  await googleTokensAPI.delete(userId);
  return NextResponse.json({ success: true });
}
