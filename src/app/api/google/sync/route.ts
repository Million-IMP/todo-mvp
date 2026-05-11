import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listCalendarEvents } from '@/lib/google-calendar';
import { getUserIdFromToken, googleTokensAPI, supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = await getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

  const tokens = await googleTokensAPI.get(userId);
  if (!tokens) return NextResponse.json({ error: 'Not connected' }, { status: 401 });

  // public.users 자동 등록 (FK 충돌 방지)
  const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = authUserData?.user?.email;
  if (email) {
    await supabaseAdmin.from('users').upsert({ id: userId, email }, { onConflict: 'id' });
  }

  // 사용자 권한 컨텍스트로 동작하는 클라이언트 (insert/update FK 우회)
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

  try {
    const events = await listCalendarEvents(tokens.access_token, tokens.refresh_token, timeMin, timeMax);

    // 기존 매핑된 todos 조회 (google_calendar_event_id 기준)
    const { data: existingTodos } = await supabaseAdmin
      .from('todos')
      .select('id, title, description, due_date, start_time, end_time, google_calendar_event_id')
      .eq('user_id', userId)
      .not('google_calendar_event_id', 'is', null);

    const existingMap = new Map<string, any>();
    (existingTodos ?? []).forEach((t: any) => {
      if (t.google_calendar_event_id) existingMap.set(t.google_calendar_event_id, t);
    });

    const googleEventIds = new Set<string>();
    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    // 각 구글 이벤트를 todo로 변환 + insert/update
    const toInsert: any[] = [];
    const toUpdate: { id: string; updates: any }[] = [];

    for (const e of events) {
      if (!e.id) continue;
      googleEventIds.add(e.id);

      // cancelled 이벤트는 삭제 대상
      if (e.status === 'cancelled') continue;

      const isDateTime = !!e.start?.dateTime;
      const rawDate = e.start?.dateTime ?? e.start?.date ?? null;
      const due_date = rawDate ? rawDate.slice(0, 10) : null;
      const start_time = isDateTime ? rawDate!.slice(11, 16) : null;
      const rawEnd = e.end?.dateTime ?? null;
      const end_time = rawEnd ? rawEnd.slice(11, 16) : null;
      const title = e.summary || '(제목 없음)';
      const description = e.description || '';

      const existing = existingMap.get(e.id);
      if (existing) {
        // 변경사항 감지: title/description/일시 비교
        const changed =
          existing.title !== title ||
          (existing.description ?? '') !== description ||
          existing.due_date !== due_date ||
          existing.start_time !== start_time ||
          existing.end_time !== end_time;

        if (changed) {
          toUpdate.push({
            id: existing.id,
            updates: { title, description, due_date, start_time, end_time },
          });
        }
      } else {
        toInsert.push({
          user_id: userId,
          title,
          description,
          completed: false,
          priority: 'medium',
          category: 'personal',
          tags: [],
          sort_order: 0,
          subtasks: [],
          due_date,
          start_time,
          end_time,
          google_calendar_event_id: e.id,
        });
      }
    }

    // 신규 insert
    if (toInsert.length > 0) {
      const { error } = await userClient.from('todos').insert(toInsert);
      if (error) throw error;
      inserted = toInsert.length;
    }

    // 변경분 update
    for (const { id, updates } of toUpdate) {
      const { error } = await userClient.from('todos').update(updates).eq('id', id);
      if (error) throw error;
    }
    updated = toUpdate.length;

    // 구글에서 삭제된 이벤트는 앱에서도 삭제 (단, 폴링 범위 내 일정만 대상)
    const rangeStart = timeMin.slice(0, 10);
    const rangeEnd = timeMax.slice(0, 10);
    const idsToDelete: string[] = [];
    for (const [eventId, todo] of existingMap.entries()) {
      // 폴링 시간 범위 밖의 todo는 무시 (구글에서 응답에 없어도 정상)
      if (todo.due_date && (todo.due_date < rangeStart || todo.due_date > rangeEnd)) continue;

      const event = events.find((e: any) => e.id === eventId);
      if (!event || event.status === 'cancelled') {
        idsToDelete.push(todo.id);
      }
    }
    if (idsToDelete.length > 0) {
      const { error } = await userClient.from('todos').delete().in('id', idsToDelete);
      if (error) throw error;
      deleted = idsToDelete.length;
    }

    return NextResponse.json({ inserted, updated, deleted });
  } catch (error: any) {
    const message = error?.message ?? String(error);
    const code = error?.code ?? null;
    return NextResponse.json({ error: message, code }, { status: 500 });
  }
}
