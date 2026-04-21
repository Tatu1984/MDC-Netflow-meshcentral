import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the application name and branding', async ({ page }) => {
    await expect(page.getByText('TS Edge Nest')).toBeVisible();
  });

  test('should show login button', async ({ page }) => {
    const loginBtn = page.getByRole('link', { name: /user login/i }).or(
      page.getByRole('button', { name: /login/i })
    );
    await expect(loginBtn.first()).toBeVisible();
  });

  test('should display feature cards', async ({ page }) => {
    // The landing page shows feature cards for Compute, Storage, Networking, Databases
    for (const feature of ['Compute', 'Storage', 'Networking', 'Databases']) {
      await expect(page.getByText(feature).first()).toBeVisible();
    }
  });

  test('should display platform stats', async ({ page }) => {
    await expect(page.getByText(/99\.9%/)).toBeVisible();
    await expect(page.getByText(/uptime/i).first()).toBeVisible();
  });

  test('should have a CTA section with action buttons', async ({ page }) => {
    // Look for call-to-action buttons
    const ctaLinks = page.getByRole('link').filter({ hasText: /get started|sign up|login/i });
    await expect(ctaLinks.first()).toBeVisible();
  });

  test('should display footer with copyright', async ({ page }) => {
    await expect(page.getByText(/©|copyright/i).first()).toBeVisible();
  });

  test('login button navigates to auth/login', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /user login/i }).or(
      page.getByRole('link', { name: /login/i })
    );
    await loginLink.first().click();
    await expect(page).toHaveURL(/auth\/login/);
  });
});
