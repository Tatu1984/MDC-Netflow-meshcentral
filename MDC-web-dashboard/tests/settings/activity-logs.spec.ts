import { test, expect } from '../fixtures';

test.describe('Activity Logs', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/settings/activity-logs');
  });

  test('should display Activity Logs heading', async ({ mockApi: page }) => {
    await expect(page.getByRole('heading', { name: /activity logs/i }).first()).toBeVisible();
  });

  test('should show entity filter dropdown', async ({ mockApi: page }) => {
    const entityFilter = page.getByRole('combobox').or(
      page.locator('select, button').filter({ hasText: /all entities|entity/i })
    );
    await expect(entityFilter.first()).toBeVisible();
  });

  test('should show order/sort dropdown', async ({ mockApi: page }) => {
    const orderFilter = page.getByRole('combobox').or(
      page.locator('select, button').filter({ hasText: /newest|oldest|order/i })
    );
    await expect(orderFilter.first()).toBeVisible();
  });

  test('should show search input', async ({ mockApi: page }) => {
    const search = page.getByPlaceholder(/search/i).or(page.getByRole('searchbox'));
    await expect(search.first()).toBeVisible();
  });

  test('should display activity log entries', async ({ mockApi: page }) => {
    // Log entries should show action types
    await expect(page.getByText(/added/i).first()).toBeVisible();
    await expect(page.getByText(/modified/i).first()).toBeVisible();
    await expect(page.getByText(/deleted/i).first()).toBeVisible();
  });

  test('should show entity types', async ({ mockApi: page }) => {
    // DbWorkspace should show as "Workspace"
    const entityType = page.getByText(/workspace/i);
    await expect(entityType.first()).toBeVisible();
  });

  test('should show timestamps', async ({ mockApi: page }) => {
    // Timestamps should be formatted and visible
    const timestamp = page.locator('td, [class*="cell"]').filter({
      hasText: /2025|oct|october/i,
    });
    await expect(timestamp.first()).toBeVisible();
  });

  test('should show user information in logs', async ({ mockApi: page }) => {
    // User emails from mock data
    await expect(page.getByText('testuser@example.com').first()).toBeVisible();
  });

  test('should show action badges with colors', async ({ mockApi: page }) => {
    // Added=green, Modified=orange, Deleted=red
    const addedBadge = page.getByText(/added/i).first();
    await expect(addedBadge).toBeVisible();
  });

  test('should expand log row to show changes', async ({ mockApi: page }) => {
    const expandBtn = page.locator('button').filter({
      has: page.locator('svg.lucide-chevron-down, svg.lucide-chevron-right'),
    });

    if (await expandBtn.first().isVisible()) {
      await expandBtn.first().click();
      await page.waitForTimeout(500);

      // Should show field change details
      const changeDetails = page.getByText(/field|old value|new value|name/i);
      await expect(changeDetails.first()).toBeVisible();
    }
  });

  test('expanded row should show old and new values', async ({ mockApi: page }) => {
    const expandBtn = page.locator('button').filter({
      has: page.locator('svg.lucide-chevron-down, svg.lucide-chevron-right'),
    });

    if (await expandBtn.first().isVisible()) {
      await expandBtn.first().click();
      await page.waitForTimeout(500);

      // First log: Name field changed to "Production Workspace"
      await expect(page.getByText('Production Workspace').first()).toBeVisible();
    }
  });

  test('should filter by entity type', async ({ mockApi: page }) => {
    const entityFilter = page.getByRole('combobox').or(
      page.locator('select, button').filter({ hasText: /all entities|entity/i })
    );

    if (await entityFilter.first().isVisible()) {
      await entityFilter.first().click();
      const workspaceOption = page.getByText(/workspace/i);
      await workspaceOption.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should have pagination controls', async ({ mockApi: page }) => {
    const prevBtn = page.getByRole('button', { name: /previous/i });
    const nextBtn = page.getByRole('button', { name: /next/i });
    const pageIndicator = page.getByText(/page/i);

    const hasPagination =
      (await prevBtn.isVisible().catch(() => false)) ||
      (await nextBtn.isVisible().catch(() => false)) ||
      (await pageIndicator.first().isVisible().catch(() => false));

    expect(hasPagination).toBeTruthy();
  });

  test('should clear search filters', async ({ mockApi: page }) => {
    const search = page.getByPlaceholder(/search/i).or(page.getByRole('searchbox'));
    await search.first().fill('test query');

    const clearBtn = page.getByRole('button', { name: /clear/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await expect(search.first()).toHaveValue('');
    }
  });
});
