import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkAndNotify } from '@/lib/notifications';
import { Todo } from '@/types';

describe('notifications library', () => {
  const mockTodos: Todo[] = [
    {
      id: '1',
      title: 'Test Todo 1',
      completed: false,
      user_id: 'user1',
      created_at: new Date().toISOString(),
      due_date: '2026-05-14', // D-0 (Assuming today is 2026-05-14)
      priority: 'medium',
      category: 'personal',
      tags: [],
      sort_order: 0,
      subtasks: [],
    },
    {
      id: '2',
      title: 'Test Todo 2',
      completed: false,
      user_id: 'user1',
      created_at: new Date().toISOString(),
      due_date: '2026-05-15', // D-1
      priority: 'high',
      category: 'work',
      tags: [],
      sort_order: 1,
      subtasks: [],
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T10:00:00Z'));
    vi.clearAllMocks();
    localStorage.clear();
    (window.Notification as any).permission = 'granted';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should notify for today and tomorrow todos', () => {
    checkAndNotify(mockTodos);

    expect(window.Notification).toHaveBeenCalledTimes(2);
    expect(window.Notification).toHaveBeenCalledWith('⚠️ 오늘 마감 Todo', expect.any(Object));
    expect(window.Notification).toHaveBeenCalledWith('📅 내일 마감 Todo', expect.any(Object));
  });

  it('should not notify if already notified today', () => {
    // Set localStorage as if notified today
    localStorage.setItem('last_todo_notification_date', '2026-05-14');

    checkAndNotify(mockTodos);

    expect(window.Notification).not.toHaveBeenCalled();
  });

  it('should not notify if permission is not granted', () => {
    (window.Notification as any).permission = 'denied';

    checkAndNotify(mockTodos);

    expect(window.Notification).not.toHaveBeenCalled();
  });

  it('should not notify for completed todos', () => {
    const completedTodos = mockTodos.map(t => ({ ...t, completed: true }));

    checkAndNotify(completedTodos);

    expect(window.Notification).not.toHaveBeenCalled();
  });

  it('should update localStorage after notifying', () => {
    checkAndNotify(mockTodos);

    expect(localStorage.setItem).toHaveBeenCalledWith('last_todo_notification_date', '2026-05-14');
  });
});
