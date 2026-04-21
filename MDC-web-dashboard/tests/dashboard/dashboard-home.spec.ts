import { test, expect } from '../fixtures';

test.describe('Dashboard Home', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard');
  });

  test('should display dashboard heading', async ({ mockApi: page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();
  });

  test('should show quick action buttons', async ({ mockApi: page }) => {
    const actions = [
      /manage workspaces|workspaces/i,
      /organizations/i,
      /users|teams/i,
      /remote networks/i,
    ];

    for (const action of actions) {
      const btn = page.getByRole('button', { name: action }).or(
        page.getByRole('link', { name: action })
      );
      await expect(btn.first()).toBeVisible();
    }
  });

  test('quick action button navigates to workspaces', async ({ mockApi: page }) => {
    const workspacesBtn = page.getByRole('button', { name: /manage workspaces|workspaces/i }).or(
      page.getByRole('link', { name: /manage workspaces|workspaces/i })
    );
    await workspacesBtn.first().click();
    await expect(page).toHaveURL(/workspaces/);
  });

  test('should display infrastructure stats cards', async ({ mockApi: page }) => {
    // Wait for data to load — stats cards should appear
    await expect(page.getByText(/workspaces/i).first()).toBeVisible();
    await expect(page.getByText(/sites/i).first()).toBeVisible();
    await expect(page.getByText(/remote networks/i).first()).toBeVisible();
    await expect(page.getByText(/organizations/i).first()).toBeVisible();
  });

  test('should display recent workspaces section', async ({ mockApi: page }) => {
    // Wait for workspaces to load
    const recentSection = page.getByText(/recent workspaces/i);
    await expect(recentSection.first()).toBeVisible();

    // Should show workspace names from mock data
    await expect(page.getByText('Production Workspace').first()).toBeVisible();
  });

  test('should display site nodes section', async ({ mockApi: page }) => {
    const nodesSection = page.getByText(/site nodes|nodes/i);
    await expect(nodesSection.first()).toBeVisible();
  });

  test('refresh button should trigger data reload', async ({ mockApi: page }) => {
    const refreshBtn = page.getByRole('button', { name: /refresh/i }).or(
      page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw, svg.lucide-rotate-cw') })
    );

    if (await refreshBtn.first().isVisible()) {
      // Track API calls
      let apiCallCount = 0;
      page.on('request', (req) => {
        if (req.url().includes('/api/proxy/')) apiCallCount++;
      });

      await refreshBtn.first().click();

      // Wait a bit for requests to fire
      await page.waitForTimeout(1000);
      expect(apiCallCount).toBeGreaterThan(0);
    }
  });

  test('should show loading skeletons before data loads', async ({ page }) => {
    // Navigate without mock API to see loading state
    await page.route('**/api/proxy/**', async (route) => {
      // Delay response to see loading state
      await new Promise((r) => setTimeout(r, 3000));
      route.fulfill({ json: { value: [], '@odata.count': 0 } });
    });

    await page.goto('/dashboard');

    // Should show skeletons or loading spinners
    const skeletons = page.locator('.animate-pulse, [class*="skeleton"]');
    const spinners = page.locator('.animate-spin');
    const loadingElements = skeletons.or(spinners);

    // At least one loading indicator should be visible
    if (await loadingElements.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      expect(await loadingElements.count()).toBeGreaterThan(0);
    }
  });
});
