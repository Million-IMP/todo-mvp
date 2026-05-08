import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Todo App',
  description: 'Simple and powerful todo application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
