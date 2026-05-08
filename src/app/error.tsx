'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong</h1>
        <p className="text-gray-600 mb-6">{error.message || 'An unexpected error occurred'}</p>
        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            Try Again
          </button>
          <a href="/" className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-md hover:bg-gray-400 transition text-center">
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
