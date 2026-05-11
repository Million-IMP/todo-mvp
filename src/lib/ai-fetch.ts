'use client';
// 클라이언트용 Bearer 토큰 fetch 헬퍼 (AI 라우트 전용)
// Design §6 — 서버는 Bearer 토큰으로 사용자를 식별

import { supabase } from '@/lib/supabase';

async function getSessionToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function aiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getSessionToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}
