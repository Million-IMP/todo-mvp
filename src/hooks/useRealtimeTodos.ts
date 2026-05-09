'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Todo } from '@/types';

export function useRealtimeTodos(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`todos:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          queryClient.setQueryData(['todos', userId], (old: Todo[] = []) => {
            if (payload.eventType === 'INSERT') {
              const exists = old.some((t) => t.id === (payload.new as Todo).id);
              return exists ? old : [...old, payload.new as Todo].sort((a, b) => a.sort_order - b.sort_order);
            }
            if (payload.eventType === 'UPDATE') {
              return old.map((t) => t.id === (payload.new as Todo).id ? payload.new as Todo : t);
            }
            if (payload.eventType === 'DELETE') {
              return old.filter((t) => t.id !== (payload.old as Todo).id);
            }
            return old;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
