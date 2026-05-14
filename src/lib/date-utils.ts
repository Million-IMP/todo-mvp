import { RecurrenceType } from '@/types';

/**
 * 반복 설정에 따른 다음 마감일을 계산합니다.
 * @param currentDate 현재 마감일 (YYYY-MM-DD)
 * @param type 반복 타입
 * @param interval 간격
 * @returns 다음 마감일 (YYYY-MM-DD)
 */
export function getNextDueDate(currentDate: string, type: RecurrenceType, interval: number = 1): string {
  const date = new Date(currentDate);
  if (isNaN(date.getTime())) return currentDate;

  if (type === 'daily') {
    date.setDate(date.getDate() + interval);
  } else if (type === 'weekly') {
    date.setDate(date.getDate() + 7 * interval);
  } else if (type === 'monthly') {
    date.setMonth(date.getMonth() + interval);
  } else {
    return currentDate;
  }

  return date.toISOString().split('T')[0];
}
