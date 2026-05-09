'use client';
import { useCalendar } from '@/contexts/CalendarContext';
import { Todo } from '@/types';
import { CATEGORY_CONFIG, fmtTime, toKey } from './constants';

interface Props {
  todos: Todo[];
  onEventClick: (todo: Todo, rect: DOMRect) => void;
}

export default function ScheduleView({ todos, onEventClick }: Props) {
  const { hiddenCategories } = useCalendar();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = todos
    .filter((t) => t.due_date && !hiddenCategories.has(t.category))
    .sort((a, b) => {
      const dc = (a.due_date ?? '').localeCompare(b.due_date ?? '');
      if (dc !== 0) return dc;
      return (a.start_time ?? '').localeCompare(b.start_time ?? '');
    });

  const grouped = filtered.reduce<Record<string, Todo[]>>((acc, t) => {
    const k = t.due_date!.slice(0, 10);
    acc[k] = acc[k] ? [...acc[k], t] : [t];
    return acc;
  }, {});

  const noDateTodos = todos.filter((t) => !t.due_date && !hiddenCategories.has(t.category));
  const todayKey = toKey(today);

  if (Object.keys(grouped).length === 0 && noDateTodos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">일정이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-2xl mx-auto py-4 px-4 space-y-6">
        {Object.entries(grouped).map(([dateKey, dayTodos]) => {
          const date = new Date(dateKey + 'T00:00:00');
          const isToday = dateKey === todayKey;
          const isPast = date < today;

          return (
            <div key={dateKey} className="flex gap-4">
              {/* Date label */}
              <div className="w-16 flex-shrink-0 text-right pt-1">
                <div className={`text-xs font-medium uppercase ${isPast && !isToday ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {['일','월','화','수','목','금','토'][date.getDay()]}
                </div>
                <div className={`text-2xl font-light leading-none ${
                  isToday ? 'text-blue-600 dark:text-blue-400 font-semibold' :
                  isPast ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {date.getDate()}
                </div>
              </div>

              {/* Events */}
              <div className="flex-1 space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-1">
                {dayTodos.map((todo) => {
                  const cfg = CATEGORY_CONFIG[todo.category];
                  return (
                    <button key={todo.id}
                      onClick={(e) => onEventClick(todo, e.currentTarget.getBoundingClientRect())}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                      {/* Color bar */}
                      <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: cfg.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {todo.title}
                          </span>
                          {todo.recurrence && todo.recurrence.type !== 'none' && (
                            <span className="text-xs opacity-60" style={{ color: cfg.color }}>↺</span>
                          )}
                        </div>
                        {(todo.start_time || todo.end_time) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {fmtTime(todo.start_time)}{todo.end_time ? ` ~ ${fmtTime(todo.end_time)}` : ''}
                          </p>
                        )}
                        {todo.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{todo.description}</p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* No-date todos */}
        {noDateTodos.length > 0 && (
          <div className="flex gap-4">
            <div className="w-16 flex-shrink-0 text-right pt-1">
              <div className="text-xs text-gray-400 dark:text-gray-500">날짜<br/>없음</div>
            </div>
            <div className="flex-1 space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-1">
              {noDateTodos.map((todo) => {
                const cfg = CATEGORY_CONFIG[todo.category];
                return (
                  <button key={todo.id}
                    onClick={(e) => onEventClick(todo, e.currentTarget.getBoundingClientRect())}
                    className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    <span className={`text-sm font-medium flex-1 min-w-0 truncate ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {todo.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
