export interface User {
  id: string;
  email: string;
  created_at?: string;
}

export type Priority = 'high' | 'medium' | 'low';
export type Category = 'work' | 'personal' | 'study' | 'other';

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  due_date?: string | null;
  category: Category;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at?: string;
}
