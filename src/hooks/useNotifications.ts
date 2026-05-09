'use client';
import { useEffect } from 'react';
import { Todo } from '@/types';
import { requestNotificationPermission, checkAndNotify } from '@/lib/notifications';

export function useNotifications(todos: Todo[]) {
  useEffect(() => {
    if (!todos.length) return;
    requestNotificationPermission().then((granted) => {
      if (granted) checkAndNotify(todos);
    });
  }, [todos]);
}
