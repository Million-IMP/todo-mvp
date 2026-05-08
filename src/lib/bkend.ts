import { AuthResponse, Todo, TodoListResponse, User } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_BKEND_API_URL || 'https://api.bkend.ai/v1';
const PROJECT_ID = process.env.NEXT_PUBLIC_BKEND_PROJECT_ID || '';
const ENVIRONMENT = process.env.NEXT_PUBLIC_BKEND_ENV || 'dev';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function bkendFetch<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-project-id': PROJECT_ID,
      'x-environment': ENVIRONMENT,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    // Handle 401 Unauthorized
    if (res.status === 401 && !isRetry && path !== '/auth/email/signin' && path !== '/auth/email/signup') {
      try {
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
        if (refreshToken) {
          // Try to refresh token
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-project-id': PROJECT_ID,
              'x-environment': ENVIRONMENT,
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (typeof window !== 'undefined') {
              localStorage.setItem('access_token', data.access_token);
            }
            // Retry original request with new token
            return bkendFetch(path, options, true);
          }
        }
      } catch (err) {
        // Refresh failed, will handle in catch block below
      }

      // If refresh failed or no token, clear auth and throw
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('auth-required'));
      }
      throw new ApiError(401, 'Session expired. Please login again.');
    }

    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, error.message || `API Error: ${res.status}`);
  }

  return res.json();
}

export const bkend = {
  auth: {
    signup: (body: { email: string; password: string }): Promise<AuthResponse> =>
      bkendFetch('/auth/email/signup', { method: 'POST', body: JSON.stringify(body) }),

    signin: (body: { email: string; password: string }): Promise<AuthResponse> =>
      bkendFetch('/auth/email/signin', { method: 'POST', body: JSON.stringify(body) }),

    me: (): Promise<{ user: User }> => bkendFetch('/auth/me'),

    refresh: (refreshToken: string): Promise<{ access_token: string; expires_in: number }> =>
      bkendFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),

    signout: (): Promise<void> => bkendFetch('/auth/signout', { method: 'POST' }),
  },

  todos: {
    list: (params?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }): Promise<TodoListResponse> => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.search) query.append('search', params.search);
      if (params?.page) query.append('page', params.page.toString());
      if (params?.limit) query.append('limit', params.limit.toString());

      return bkendFetch(`/data/todos?${query.toString()}`);
    },

    get: (id: string): Promise<Todo> => bkendFetch(`/data/todos/${id}`),

    create: (body: { title: string; description?: string }): Promise<Todo> =>
      bkendFetch('/data/todos', { method: 'POST', body: JSON.stringify(body) }),

    update: (id: string, body: Partial<Todo>): Promise<Todo> =>
      bkendFetch(`/data/todos/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

    delete: (id: string): Promise<void> =>
      bkendFetch(`/data/todos/${id}`, { method: 'DELETE' }),
  },
};
