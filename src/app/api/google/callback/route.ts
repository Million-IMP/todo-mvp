import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/google-calendar';
import { googleTokensAPI } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const userId = request.nextUrl.searchParams.get('state');

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/main/dashboard?google=error', request.url));
  }

  try {
    const tokens = await exchangeCode(code);
    await googleTokensAPI.upsert(userId, tokens);
    return NextResponse.redirect(new URL('/main/dashboard?google=connected', request.url));
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/main/dashboard?google=error', request.url));
  }
}
