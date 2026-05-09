'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { todosAPI } from '@/lib/supabase';
import { useFilter } from '@/stores/filter-store';
import { useAuth } from '@/stores/auth-store';
import { Todo } from '@/types';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { status, search, setStatus, setSearch } = useFilter();
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const { data: allTodos = [], isLoading } = useQuery<Todo[]>({
    queryKey: ['todos', user?.id],
    queryFn: () => todosAPI.list(user!.id),
    enabled: !!user,
  });

  const todos = allTodos.filter((t) => {
    const matchesStatus =
      status === 'all' ||
      (status === 'active' && !t.completed) ||
      (status === 'completed' && t.completed);
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const createMutation = useMutation({
    mutationFn: (body: { title: string; description: string }) =>
      todosAPI.create(user!.id, body.title, body.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setNewTitle('');
      setNewDescription('');
    },
    onError: (err: any) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Todo> }) =>
      todosAPI.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    onError: (err: any) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => todosAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
    onError: (err: any) => setError(err.message),
  });

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newTitle.trim()) {
      setFormError('Todo title cannot be empty');
      return;
    }
    if (newTitle.length > 255) {
      setFormError('Todo title must be less than 255 characters');
      return;
    }
    if (newDescription && newDescription.length > 2000) {
      setFormError('Description must be less than 2000 characters');
      return;
    }

    createMutation.mutate({ title: newTitle.trim(), description: newDescription.trim() });
  };

  const handleToggleTodo = (todo: Todo) => {
    updateMutation.mutate({ id: todo.id, updates: { completed: !todo.completed } });
  };

  const handleDeleteTodo = (id: string) => {
    if (confirm('Are you sure you want to delete this todo?')) {
      deleteMutation.mutate(id);
    }
  };

  const activeTodos = allTodos.filter((t) => !t.completed).length;
  const completedTodos = allTodos.filter((t) => t.completed).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">My Todos</h2>

        {(error || formError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error || formError}
          </div>
        )}

        <form onSubmit={handleCreateTodo} className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="space-y-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a new todo..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Todo'}
            </button>
          </div>
        </form>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search todos..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-md font-medium transition capitalize ${
                status === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s === 'all' && `All (${allTodos.length})`}
              {s === 'active' && `Active (${activeTodos})`}
              {s === 'completed' && `Completed (${completedTodos})`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="flex justify-center mb-4">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading todos...</p>
        </div>
      ) : todos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No todos yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="bg-white rounded-lg shadow p-4 flex items-start gap-4 hover:shadow-md transition"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggleTodo(todo)}
                className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    todo.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}
                >
                  {todo.title}
                </h3>
                {todo.description && (
                  <p className={`text-sm mt-1 ${todo.completed ? 'text-gray-300' : 'text-gray-600'}`}>
                    {todo.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Created {new Date(todo.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                disabled={deleteMutation.isPending}
                className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition disabled:opacity-50 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
