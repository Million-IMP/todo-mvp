'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/auth-store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth()
      .then(() => {
        if (isAuthenticated) {
          router.push('/main/dashboard');
        } else {
          router.push('/auth/login');
        }
      })
      .catch((err) => console.error('Auth check error:', err));
  }, [isAuthenticated, router, checkAuth]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Todo App</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
