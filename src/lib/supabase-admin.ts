import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// Bearer 토큰으로 실제 userId를 검증하여 반환
export async function getUserIdFromToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export const googleTokensAPI = {
  get: async (userId: string): Promise<GoogleTokens | null> => {
    const { data } = await supabaseAdmin
      .from('google_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();
    return data ?? null;
  },

  upsert: async (userId: string, tokens: GoogleTokens): Promise<void> => {
    const { error } = await supabaseAdmin.from('google_tokens').upsert({
      user_id: userId,
      ...tokens,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  delete: async (userId: string): Promise<void> => {
    await supabaseAdmin.from('google_tokens').delete().eq('user_id', userId);
  },
};
