import { test, expect } from '@playwright/test';

test.describe('Notification UI', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Notification API
    await page.addInitScript(() => {
      (window as any).Notification = {
        permission: 'default',
        requestPermission: async () => 'granted',
      };
      
      // Mock localStorage for auth-store
      const mockUser = { id: 'test-user', email: 'test@example.com', created_at: new Date().toISOString() };
      localStorage.setItem('auth-store', JSON.stringify({ state: { user: mockUser } }));
    });

    // Mock network requests for Supabase
    await page.route('**/auth/v1/session**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'mock-token', user: { id: 'test-user', email: 'test@example.com' } }),
      });
    });

    await page.route('**/rest/v1/todos**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    
    // Navigate directly to dashboard
    await page.goto('/main/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should show notification setup section in sidebar', async ({ page }) => {
    // If not authenticated, we can't see the dashboard.
    // Let's assume we are in a dev environment where we can bypass or the page is accessible.
    // Actually, I should probably use a mock auth state if possible.
    
    // Check for "알림 설정" text
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(page.locator('text=알림 설정')).toBeVisible();
  });

  test('should show request button when permission is default', async ({ page }) => {
    await expect(page.locator('text=중요 일정 알림 받기')).toBeVisible();
  });

  test('should change status when button is clicked', async ({ page }) => {
    // Mock the click and permission change
    await page.addInitScript(() => {
      (window as any).Notification.permission = 'default';
    });
    
    const button = page.locator('text=중요 일정 알림 받기');
    await button.click();
    
    // After click, it should show "활성화됨" (based on Sidebar.tsx handleRequestNotif)
    await expect(page.locator('text=중요 일정 알림 활성화됨')).toBeVisible();
  });
});
