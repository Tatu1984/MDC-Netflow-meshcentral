import { test, expect } from '@playwright/test';

test.describe('Auth Callback Page', () => {
  test('should display loading state', async ({ page }) => {
    await page.goto('/auth/callback');

    // Should show a loading indicator
    const loadingText = page.getByText(/completing authentication|please wait|signing you in/i);
    await expect(loadingText.first()).toBeVisible();
  });

  test('should redirect unauthenticated user to login after timeout', async ({ page }) => {
    // Clear auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('accessToken');
    });

    await page.goto('/auth/callback');

    // Should eventually redirect to login (2s delay in the app)
    await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 });
  });

  test('should redirect authenticated user to dashboard', async ({ page }) => {
    // Seed auth state
    await page.goto('/');
    await page.evaluate(() => {
      const authState = {
        state: {
          user: { id: 'u1', name: 'Test', email: 'test@test.com', role: 'admin', organizationId: 'org-1' },
          organization: null,
          currentProject: null,
          projects: [],
          isAuthenticated: true,
          permissions: [],
          accessToken: 'mock-token',
          _hasHydrated: true,
        },
        version: 0,
      };
      localStorage.setItem('auth-storage', JSON.stringify(authState));
    });

    await page.goto('/auth/callback');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });
});
