import { test, expect } from '../fixtures';

test.describe('Remote Networks List', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/infrastructure/remote-networks');
  });

  test('should display Remote Networks heading', async ({ mockApi: page }) => {
    await expect(page.getByRole('heading', { name: /remote networks/i }).first()).toBeVisible();
  });

  test('should show description text', async ({ mockApi: page }) => {
    await expect(page.getByText(/zerotier|overlay|secure connectivity/i).first()).toBeVisible();
  });

  test('should display stats cards', async ({ mockApi: page }) => {
    // Networks count
    await expect(page.getByText(/networks/i).first()).toBeVisible();

    // Members count
    await expect(page.getByText(/members/i).first()).toBeVisible();

    // Online count
    await expect(page.getByText(/online/i).first()).toBeVisible();

    // Authorized count
    await expect(page.getByText(/authorized/i).first()).toBeVisible();
  });

  test('should display network name in list', async ({ mockApi: page }) => {
    await expect(page.getByText('prod-overlay').first()).toBeVisible();
  });

  test('should show member counts', async ({ mockApi: page }) => {
    // prod-overlay has 2 members, 1 online
    const memberInfo = page.getByText(/1.*\/.*2|2.*member/i);
    await expect(memberInfo.first()).toBeVisible();
  });

  test('should show workspace association', async ({ mockApi: page }) => {
    // prod-overlay is linked to ws-001 (Production Workspace)
    const workspaceRef = page.getByText(/production workspace/i).or(
      page.getByText(/ws-001/)
    );
    await expect(workspaceRef.first()).toBeVisible();
  });

  test('clicking network row should navigate to details', async ({ mockApi: page }) => {
    const networkRow = page.getByText('prod-overlay').first();
    await networkRow.click();
    await expect(page).toHaveURL(/remote-networks\/rn-001/);
  });

  test('should show refresh button', async ({ mockApi: page }) => {
    const refreshBtn = page.getByRole('button', { name: /refresh/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-refresh-cw, svg.lucide-rotate-cw'),
      })
    );
    await expect(refreshBtn.first()).toBeVisible();
  });
});

test.describe('Remote Networks Empty State', () => {
  test('should show empty state when no networks exist', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/proxy/**', (route) => {
      if (route.request().url().includes('/RemoteNetworks')) {
        return route.fulfill({ json: { value: [], '@odata.count': 0 } });
      }
      return route.fulfill({ json: { value: [], '@odata.count': 0 } });
    });
    await page.route('**/api/config', (route) =>
      route.fulfill({
        json: {
          mdcApiUrl: 'http://localhost:5000',
          mdcApiKey: 'test-api-key',
          entraClientId: '',
          entraTenantId: '',
          entraAuthority: '',
        },
      })
    );

    await page.goto('/dashboard/infrastructure/remote-networks');

    const emptyMessage = page.getByText(/no.*network|automatically created|enable remote access/i);
    await expect(emptyMessage.first()).toBeVisible({ timeout: 10000 });
  });
});
