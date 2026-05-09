'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/stores/auth-store';
import { todosAPI } from '@/lib/supabase';
import { Todo, Category } from '@/types';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const CATEGORY_LABELS: Record<Category, string> = {
  work: '업무', personal: '개인', study: '학습', other: '기타',
};

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function StatsPage() {
  const { user } = useAuth();
  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ['todos', user?.id],
    queryFn: () => todosAPI.list(user!.id),
    enabled: !!user,
  });

  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  const rate = total ? Math.round((done / total) * 100) : 0;

  // 카테고리별 분포
  const catData = (['work', 'personal', 'study', 'other'] as Category[]).map(
    (c) => todos.filter((t) => t.category === c).length
  );

  // 우선순위별
  const priData = [
    todos.filter((t) => t.priority === 'high').length,
    todos.filter((t) => t.priority === 'medium').length,
    todos.filter((t) => t.priority === 'low').length,
  ];

  // 최근 7일 완료 추이
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      count: todos.filter((t) => {
        if (!t.updated_at) return false;
        const u = new Date(t.updated_at);
        return t.completed && u >= d && u < next;
      }).length,
    };
  });

  const chartOpts = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#6b7280', font: { size: 12 } },
      },
    },
  };

  if (todos.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20 px-4">
        <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-700 dark:text-gray-300 font-semibold mb-1">아직 데이터가 없습니다</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Todo를 추가하면 통계가 표시됩니다</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">통계</h2>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '전체', value: total, color: 'text-blue-600' },
          { label: '완료', value: done, color: 'text-green-600' },
          { label: '완료율', value: `${rate}%`, color: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 완료율 도넛 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">완료율</h3>
          <div className="max-w-[220px] mx-auto">
            <Doughnut
              data={{
                labels: ['완료', '미완료'],
                datasets: [{ data: [done, total - done], backgroundColor: ['#10b981', '#e5e7eb'], borderWidth: 0 }],
              }}
              options={chartOpts}
            />
          </div>
        </div>

        {/* 카테고리별 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">카테고리별</h3>
          <Bar
            data={{
              labels: Object.values(CATEGORY_LABELS),
              datasets: [{
                label: 'Todo 수',
                data: catData,
                backgroundColor: CATEGORY_COLORS,
                borderRadius: 6,
              }],
            }}
            options={{ ...chartOpts, plugins: { legend: { display: false } } }}
          />
        </div>

        {/* 우선순위별 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">우선순위별</h3>
          <Doughnut
            data={{
              labels: ['High', 'Medium', 'Low'],
              datasets: [{ data: priData, backgroundColor: ['#ef4444', '#f59e0b', '#9ca3af'], borderWidth: 0 }],
            }}
            options={chartOpts}
          />
        </div>

        {/* 주간 완료 추이 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">최근 7일 완료 추이</h3>
          <Line
            data={{
              labels: last7.map((d) => d.label),
              datasets: [{
                label: '완료',
                data: last7.map((d) => d.count),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                tension: 0.4,
                fill: true,
              }],
            }}
            options={chartOpts}
          />
        </div>
      </div>
    </div>
  );
}
