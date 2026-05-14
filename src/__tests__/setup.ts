import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mocking window.Notification
if (typeof window !== 'undefined') {
  (window as any).Notification = vi.fn();
  (window.Notification as any).permission = 'granted';
  (window.Notification as any).requestPermission = vi.fn().mockResolvedValue('granted');
}

// Mocking localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
