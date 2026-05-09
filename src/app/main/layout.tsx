'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/auth-store';
import { useTheme } from '@/stores/theme-store';
import { useEffect } from 'react';
import { CalendarProvider } from '@/contexts/CalendarContext';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { checkAuth, logout } = useAuth();
  const { dark, toggle } = useTheme();

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    const handle = async () => { await logout(); router.push('/auth/login'); };
    window.addEventListener('auth-required', handle as EventListener);
    return () => window.removeEventListener('auth-required', handle as EventListener);
  }, [logout, router]);

  return (
    <CalendarProvider>
      <div className="h-screen bg-white dark:bg-gray-900 transition-colors overflow-hidden flex flex-col">
        {children}
      </div>
    </CalendarProvider>
  );
}
