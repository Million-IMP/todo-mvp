import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken, googleTokensAPI } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ connected: false });

  const userId = await getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ connected: false });

  const tokens = await googleTokensAPI.get(userId);
  return NextResponse.json({ connected: !!tokens });
}
