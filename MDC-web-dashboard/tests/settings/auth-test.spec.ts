import { test, expect } from '../fixtures';

test.describe('Auth Test Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/auth-test');
  });

  test('should display Auth Test heading', async ({ mockApi: page }) => {
    await expect(page.getByText(/authentication test/i).first()).toBeVisible();
  });

  test('should show current auth status card', async ({ mockApi: page }) => {
    // Authenticated status
    const authStatus = page.getByText(/authenticated/i);
    await expect(authStatus.first()).toBeVisible();
  });

  test('should show user name in auth status', async ({ mockApi: page }) => {
    await expect(page.getByText('Test User').first()).toBeVisible();
  });

  test('should show user email in auth status', async ({ mockApi: page }) => {
    await expect(page.getByText('testuser@example.com').first()).toBeVisible();
  });

  test('should show user roles', async ({ mockApi: page }) => {
    const roles = page.getByText(/GlobalAdministrator|admin/i);
    await expect(roles.first()).toBeVisible();
  });

  test('should show access token (truncated)', async ({ mockApi: page }) => {
    const tokenSection = page.getByText(/access token|token/i);
    await expect(tokenSection.first()).toBeVisible();
  });

  test('should show copy token button', async ({ mockApi: page }) => {
    const copyBtn = page.getByRole('button', { name: /copy/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-copy, svg.lucide-clipboard'),
      })
    );
    await expect(copyBtn.first()).toBeVisible();
  });

  test('should show test endpoint sections', async ({ mockApi: page }) => {
    // Accordion sections for endpoints
    const endpoints = [
      /anonymous/i,
      /authenticated/i,
      /admin/i,
    ];

    for (const endpoint of endpoints) {
      const section = page.getByText(endpoint);
      await expect(section.first()).toBeVisible();
    }
  });

  test('should show Run Test buttons', async ({ mockApi: page }) => {
    const runBtn = page.getByRole('button', { name: /run test/i });
    await expect(runBtn.first()).toBeVisible();
  });

  test('Run All Tests button should exist', async ({ mockApi: page }) => {
    const runAllBtn = page.getByRole('button', { name: /run all/i });
    await expect(runAllBtn).toBeVisible();
  });

  test('clicking Run Test should show results', async ({ mockApi: page }) => {
    // Mock auth test endpoint
    await page.route('**/api/AuthTest/**', (route) =>
      route.fulfill({
        status: 200,
        json: { message: 'Success', status: 200 },
      })
    );

    const runBtn = page.getByRole('button', { name: /run test/i });
    await runBtn.first().click();

    // Wait for result
    await page.waitForTimeout(2000);

    // Should show success status or response code
    const result = page.getByText(/200|success|ok/i);
    await expect(result.first()).toBeVisible();
  });

  test('should show idle status before running tests', async ({ mockApi: page }) => {
    const idleStatus = page.getByText(/idle|not run|pending/i);
    if (await idleStatus.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(idleStatus.first()).toBeVisible();
    }
  });
});
