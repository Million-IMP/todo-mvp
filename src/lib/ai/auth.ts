// AI route 공용 헬퍼 — 인증 + RLS 적용 클라이언트 생성
// Design Ref: §9 (보안 체크리스트), Plan SC-6

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { getUserIdFromToken, supabaseAdmin } from '@/lib/supabase-admin';

export interface AiAuthContext {
  userId: string;
  /** Bearer 토큰을 적용한 사용자 권한 클라이언트 (RLS 통과) */
  supabase: SupabaseClient;
  /** 서비스 롤 클라이언트 (FK 우회·시스템 작업용) */
  admin: SupabaseClient;
}

/**
 * Authorization 헤더에서 토큰을 추출해 userId를 검증하고
 * RLS 적용 가능한 SupabaseClient를 함께 반환.
 * 실패 시 NextResponse(401)을 반환.
 */
export async function authenticate(
  request: NextRequest,
): Promise<AiAuthContext | NextResponse> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // public.users 자동 등록 (다른 라우트와 동일 패턴 — FK 충돌 방지)
  const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = authUserData?.user?.email;
  if (email) {
    await supabaseAdmin
      .from('users')
      .upsert({ id: userId, email }, { onConflict: 'id' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  return { userId, supabase, admin: supabaseAdmin };
}

export function isAuthError(v: AiAuthContext | NextResponse): v is NextResponse {
  return v instanceof NextResponse;
}
