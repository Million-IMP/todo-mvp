import { Todo } from '@/types';

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function checkAndNotify(todos: Todo[]) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;

  // 당일 중복 알림 방지
  const todayKey = new Date().toISOString().split('T')[0];
  const lastNotified = localStorage.getItem('last_todo_notification_date');
  if (lastNotified === todayKey) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let notifiedCount = 0;

  todos.forEach((todo) => {
    if (todo.completed || !todo.due_date) return;

    const due = new Date(todo.due_date);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) {
      new Notification('⚠️ 오늘 마감 Todo', {
        body: `"${todo.title}" 오늘까지입니다!`,
        icon: '/favicon.ico',
      });
      notifiedCount++;
    } else if (diff === 1) {
      new Notification('📅 내일 마감 Todo', {
        body: `"${todo.title}" 내일까지입니다.`,
        icon: '/favicon.ico',
      });
      notifiedCount++;
    }
  });

  // 알림을 하나라도 보냈다면 오늘 날짜 저장
  if (notifiedCount > 0) {
    localStorage.setItem('last_todo_notification_date', todayKey);
  }
}
