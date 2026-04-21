import { test, expect } from '../fixtures';

test.describe('Remote Network Details Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/infrastructure/remote-networks/rn-001');
  });

  test('should display network name', async ({ mockApi: page }) => {
    await expect(page.getByText('prod-overlay').first()).toBeVisible();
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
    // Total Members, Online, Authorized
    await expect(page.getByText(/total members|members/i).first()).toBeVisible();
    await expect(page.getByText(/online/i).first()).toBeVisible();
    await expect(page.getByText(/authorized/i).first()).toBeVisible();
  });

  test('should show Members tab', async ({ mockApi: page }) => {
    const membersTab = page.getByRole('tab', { name: /members/i }).or(
      page.getByText(/members/i)
    );
    await expect(membersTab.first()).toBeVisible();
  });

  test('should display member names', async ({ mockApi: page }) => {
    await expect(page.getByText('gateway-node').first()).toBeVisible();
    await expect(page.getByText('client-node').first()).toBeVisible();
  });

  test('should show member online/offline status', async ({ mockApi: page }) => {
    // gateway-node is online, client-node is offline
    const onlineBadge = page.getByText(/online/i);
    const offlineBadge = page.getByText(/offline/i);
    await expect(onlineBadge.first()).toBeVisible();
    await expect(offlineBadge.first()).toBeVisible();
  });

  test('should show member IP addresses', async ({ mockApi: page }) => {
    await expect(page.getByText('10.100.0.1').first()).toBeVisible();
    await expect(page.getByText('10.100.0.2').first()).toBeVisible();
  });

  test('should show member authorization status', async ({ mockApi: page }) => {
    const authBadge = page.getByText(/authorized/i);
    await expect(authBadge.first()).toBeVisible();
  });

  test('should show member latency', async ({ mockApi: page }) => {
    // gateway-node has 12ms latency
    await expect(page.getByText(/12.*ms|12ms/i).first()).toBeVisible();
  });

  test('should show Routes tab', async ({ mockApi: page }) => {
    const routesTab = page.getByRole('tab', { name: /routes/i }).or(
      page.getByText(/routes/i)
    );
    await expect(routesTab.first()).toBeVisible();
  });

  test('Routes tab should display managed routes', async ({ mockApi: page }) => {
    const routesTab = page.getByRole('tab', { name: /routes/i }).or(
      page.getByText(/routes/i)
    );
    await routesTab.first().click();

    // Route from mock data: 10.0.0.0/24 via 10.100.0.1
    await expect(page.getByText('10.0.0.0/24').first()).toBeVisible();
  });

  test('should show Info tab', async ({ mockApi: page }) => {
    const infoTab = page.getByRole('tab', { name: /info/i }).or(
      page.getByText(/info/i)
    );
    await expect(infoTab.first()).toBeVisible();
  });

  test('Info tab should show IP assignment pools', async ({ mockApi: page }) => {
    const infoTab = page.getByRole('tab', { name: /info/i }).or(
      page.getByText(/info/i)
    );
    await infoTab.first().click();

    // IP pool from mock data
    await expect(page.getByText(/10\.100\.0\.1/).first()).toBeVisible();
  });
});
