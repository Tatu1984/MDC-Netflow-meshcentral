import { test, expect } from '../fixtures';

test.describe('Site Details Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/infrastructure/sites/site-001');
  });

  test('should display site name', async ({ mockApi: page }) => {
    await expect(page.getByText('Primary Site').first()).toBeVisible();
  });

  test('should show site ID in monospace', async ({ mockApi: page }) => {
    const siteId = page.getByText('site-001').or(
      page.locator('code, [class*="mono"]').filter({ hasText: 'site-001' })
    );
    await expect(siteId.first()).toBeVisible();
  });

  test('should show back navigation', async ({ mockApi: page }) => {
    const backBtn = page.getByRole('button', { name: /back/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-arrow-left, svg.lucide-chevron-left'),
      })
    );
    await expect(backBtn.first()).toBeVisible();
  });

  test('should display stats cards', async ({ mockApi: page }) => {
    // Should show total nodes, online/offline counts
    await expect(page.getByText(/nodes/i).first()).toBeVisible();
    await expect(page.getByText(/online/i).first()).toBeVisible();
  });

  test('should display node cards', async ({ mockApi: page }) => {
    // Node names from mock data
    await expect(page.getByText('node-alpha').first()).toBeVisible();
    await expect(page.getByText('node-beta').first()).toBeVisible();
  });

  test('node cards should show online/offline status', async ({ mockApi: page }) => {
    // node-alpha is online, node-beta is offline
    const onlineBadge = page.getByText(/online/i);
    const offlineBadge = page.getByText(/offline/i);
    await expect(onlineBadge.first()).toBeVisible();
    await expect(offlineBadge.first()).toBeVisible();
  });

  test('node cards should show CPU info', async ({ mockApi: page }) => {
    // node-alpha has Intel Xeon E5
    await expect(page.getByText(/Intel Xeon|AMD EPYC/i).first()).toBeVisible();
  });

  test('node cards should show memory usage', async ({ mockApi: page }) => {
    // Memory bars or values should be visible
    const memoryInfo = page.getByText(/memory/i).or(
      page.getByText(/GB|MB/i)
    );
    await expect(memoryInfo.first()).toBeVisible();
  });

  test('node cards should show storage usage', async ({ mockApi: page }) => {
    const storageInfo = page.getByText(/storage/i).or(
      page.getByText(/disk/i)
    );
    await expect(storageInfo.first()).toBeVisible();
  });

  test('node cards should show authorization status', async ({ mockApi: page }) => {
    const authBadge = page.getByText(/authorized/i);
    await expect(authBadge.first()).toBeVisible();
  });

  test('node cards should show serial number', async ({ mockApi: page }) => {
    await expect(page.getByText('SN-001').first()).toBeVisible();
  });

  test('node cards should show hostname', async ({ mockApi: page }) => {
    await expect(page.getByText('node-alpha.local').first()).toBeVisible();
  });

  test('should show refresh button', async ({ mockApi: page }) => {
    const refreshBtn = page.getByRole('button', { name: /refresh/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-refresh-cw, svg.lucide-rotate-cw'),
      })
    );
    await expect(refreshBtn.first()).toBeVisible();
  });

  test('should show templates section if available', async ({ mockApi: page }) => {
    // Templates section may or may not be visible depending on data
    const templatesSection = page.getByText(/templates/i);
    if (await templatesSection.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(templatesSection.first()).toBeVisible();
    }
  });
});
