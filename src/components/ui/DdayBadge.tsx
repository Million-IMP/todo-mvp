export default function DdayBadge({ dueDate }: { dueDate: string | null | undefined }) {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let label = '';
  let className = '';

  if (diff < 0) {
    label = `${Math.abs(diff)}일 초과`;
    className = 'bg-red-600 text-white';
  } else if (diff === 0) {
    label = 'D-DAY';
    className = 'bg-red-500 text-white animate-pulse';
  } else if (diff === 1) {
    label = 'D-1';
    className = 'bg-orange-500 text-white';
  } else if (diff <= 3) {
    label = `D-${diff}`;
    className = 'bg-yellow-500 text-white';
  } else {
    label = `D-${diff}`;
    className = 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  }

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
