import type { Metadata } from 'next';
import '../globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Todo App',
  description: 'Simple and powerful todo application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50" suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
