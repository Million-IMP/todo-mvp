import { Priority } from '@/types';

const config: Record<Priority, { label: string; className: string }> = {
  high:   { label: 'High',   className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  low:    { label: 'Low',    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, className } = config[priority] ?? config.medium;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
