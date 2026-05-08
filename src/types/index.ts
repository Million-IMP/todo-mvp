export interface User {
  _id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface AuthResponse {
  user: User;
  token: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface TodoListResponse {
  data: Todo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  errors?: Record<string, string[]>;
}
