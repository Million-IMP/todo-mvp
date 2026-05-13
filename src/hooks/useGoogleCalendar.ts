'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/stores/auth-store';
import { todosAPI, supabase } from '@/lib/supabase';
import { Todo } from '@/types';

async function getSessionToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
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

export function useGoogleCalendar() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authedFetch(`/api/google/status`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setConnected(data.connected);
      }
    } catch (e) {
      console.error('Check Google status failed:', e);
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleParam = params.get('google');
    if (googleParam === 'connected') {
      setConnected(true);
      window.history.replaceState({}, '', window.location.pathname);
      alert('Google Calendar 연동 완료!');
    } else if (googleParam === 'error') {
      window.history.replaceState({}, '', window.location.pathname);
      alert('Google Calendar 연동 실패. 다시 시도해주세요.');
    } else {
      checkStatus();
    }
  }, [checkStatus]);

  const connect = async () => {
    const token = await getSessionToken();
    if (!token) {
      alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
      return;
    }
    window.location.href = `/api/google/auth?token=${encodeURIComponent(token)}`;
  };

  const disconnect = async () => {
    setSyncing(true);
    try {
      await authedFetch('/api/google/disconnect', { method: 'DELETE' });
      setConnected(false);
    } finally {
      setSyncing(false);
    }
  };

  const syncCreate = async (todo: Todo): Promise<void> => {
    if (!user) return;
    try {
      const res = await authedFetch('/api/google/events', {
        method: 'POST',
        body: JSON.stringify({ todo }),
      });
      if (!res.ok) return; // Not connected (401) 등은 조용히 무시
      const { eventId } = await res.json();
      if (eventId) {
        await todosAPI.update(todo.id, { google_calendar_event_id: eventId });
      }
    } catch (e) {
      console.error('Google Calendar create sync failed:', e);
    }
  };

  const syncUpdate = async (todo: Todo): Promise<void> => {
    // google_calendar_event_id 가 있으면 무조건 동기화 시도
    if (!user || !todo.google_calendar_event_id) return;
    try {
      const res = await authedFetch('/api/google/events', {
        method: 'PUT',
        body: JSON.stringify({ eventId: todo.google_calendar_event_id, todo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Google Calendar update sync failed:', data);
      }
    } catch (e) {
      console.error('Google Calendar update sync failed:', e);
    }
  };

  const syncDelete = async (todo: Todo): Promise<void> => {
    if (!user || !todo.google_calendar_event_id) return;
    try {
      const res = await authedFetch(
        `/api/google/events?eventId=${todo.google_calendar_event_id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Google Calendar delete sync failed:', data);
      }
    } catch (e) {
      console.error('Google Calendar delete sync failed:', e);
    }
  };

  const syncFromGoogle = async (silent = false): Promise<{ inserted: number; updated: number; deleted: number } | null> => {
    if (!connected || !user) return null;
    if (!silent) setSyncing(true);
    try {
      const res = await authedFetch('/api/google/sync', { method: 'POST', body: '{}' });
      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
      if (res.ok) {
        if (!silent) {
          const total = (data.inserted ?? 0) + (data.updated ?? 0) + (data.deleted ?? 0);
          if (total === 0) {
            alert('이미 최신 상태입니다.');
          } else {
            alert(`동기화 완료\n신규: ${data.inserted}개\n수정: ${data.updated}개\n삭제: ${data.deleted}개`);
            window.location.reload();
          }
        }
        return data;
      } else {
        if (!silent) alert(`가져오기 실패\n${data.error ?? '알 수 없는 오류'}`);
        return null;
      }
    } catch (e) {
      console.error('Sync from Google failed:', e);
      if (!silent) alert('네트워크 오류가 발생했습니다.');
      return null;
    } finally {
      if (!silent) setSyncing(false);
    }
  };

  return { connected, syncing, connect, disconnect, syncCreate, syncUpdate, syncDelete, syncFromGoogle };
}
