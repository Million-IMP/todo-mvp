export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export type Priority = 'high' | 'medium' | 'low';
export type Category = 'work' | 'personal' | 'study' | 'other';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Recurrence {
  type: RecurrenceType;
  interval: number;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  category: Category;
  tags: string[];
  sort_order: number;
  subtasks: Subtask[];
  recurrence?: Recurrence | null;
  created_at: string;
  updated_at?: string;
}

export type SortField = 'sort_order' | 'priority' | 'due_date' | 'created_at';
export type ViewMode = 'list' | 'calendar';
