import { Category, Priority } from '@/types';

export type ViewType = 'day' | 'week' | 'month' | 'schedule';

export const CATEGORY_CONFIG: Record<Category, {
  label: string; color: string; bg: string; darkColor: string; darkBg: string;
}> = {
  work:     { label: '업무', color: '#1a73e8', bg: '#e8f0fe', darkColor: '#8ab4f8', darkBg: '#1e3a5f' },
  personal: { label: '개인', color: '#0f9d58', bg: '#e6f4ea', darkColor: '#34a853', darkBg: '#1a3a27' },
  study:    { label: '학습', color: '#8e24aa', bg: '#f3e8fd', darkColor: '#ab47bc', darkBg: '#3b1a4a' },
  other:    { label: '기타', color: '#616161', bg: '#f1f3f4', darkColor: '#9e9e9e', darkBg: '#2d2d2d' },
};

export const PRIORITY_ALPHA: Record<Priority, number> = {
  high: 1, medium: 0.85, low: 0.65,
};

export const HOUR_HEIGHT = 64; // px per hour in time grid
export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const VIEW_LABELS: Record<ViewType, string> = {
  day: '일', week: '주', month: '월', schedule: '일정',
};

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function fmtTime(v: string | null | undefined): string {
  if (!v) return '';
  const [h, m] = v.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${ampm} ${hour}:${String(m).padStart(2, '0')}`;
}

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
