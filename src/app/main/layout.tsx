'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/auth-store';
import { useEffect } from 'react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handleAuthRequired = async () => {
      await logout();
      router.push('/auth/login');
    };

    window.addEventListener('auth-required', handleAuthRequired as EventListener);
    return () => window.removeEventListener('auth-required', handleAuthRequired);
  }, [logout, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Todo App</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
