import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should display welcome heading', async ({ page }) => {
    await expect(page.getByText(/welcome/i).first()).toBeVisible();
  });

  test('should display sign in description', async ({ page }) => {
    await expect(
      page.getByText(/sign in|create an account/i).first()
    ).toBeVisible();
  });

  test('should show Sign in with Microsoft button', async ({ page }) => {
    const signInBtn = page.getByRole('button', { name: /sign in with microsoft/i });
    await expect(signInBtn).toBeVisible();
  });

  test('should show Sign up with Microsoft button', async ({ page }) => {
    const signUpBtn = page.getByRole('button', { name: /sign up with microsoft/i });
    await expect(signUpBtn).toBeVisible();
  });

  test('should have a back to home link', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /back to home|home/i }).or(
      page.getByText(/back to home/i)
    );
    await expect(backLink.first()).toBeVisible();
  });

  test('back to home link navigates to landing page', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /back to home|home/i }).or(
      page.getByText(/back to home/i)
    );
    await backLink.first().click();
    await expect(page).toHaveURL('/');
  });

  test('should show error when Microsoft auth is not configured', async ({ page }) => {
    // Mock config to return empty Entra settings
    await page.route('**/api/config', (route) =>
      route.fulfill({
        json: {
          mdcApiUrl: '',
          mdcApiKey: '',
          entraClientId: '',
          entraTenantId: '',
          entraAuthority: '',
        },
      })
    );

    // Click sign in — should show an error since MSAL is not configured
    const signInBtn = page.getByRole('button', { name: /sign in with microsoft/i });
    await signInBtn.click();

    // Wait for error alert to appear
    const errorAlert = page.getByRole('alert').or(page.getByText(/error|not configured/i));
    await expect(errorAlert.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Auth Redirect Guard', () => {
  test('unauthenticated user accessing /dashboard should redirect to login', async ({ page }) => {
    // Clear any stored auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('accessToken');
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 });
  });

  test('unauthenticated user accessing protected route should redirect', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('accessToken');
    });

    await page.goto('/dashboard/infrastructure/workspaces');
    await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 });
  });
});
