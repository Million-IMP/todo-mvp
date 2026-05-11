import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-calendar';
import { getUserIdFromToken } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const userId = await getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  return NextResponse.redirect(getAuthUrl(userId));
}
