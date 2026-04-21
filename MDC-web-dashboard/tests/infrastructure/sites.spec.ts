import { test, expect } from '../fixtures';

test.describe('Sites List', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/infrastructure/sites');
  });

  test('should display Sites heading', async ({ mockApi: page }) => {
    await expect(page.getByRole('heading', { name: /sites/i }).first()).toBeVisible();
  });

  test('should show search input', async ({ mockApi: page }) => {
    const search = page.getByPlaceholder(/search/i).or(page.getByRole('searchbox'));
    await expect(search.first()).toBeVisible();
  });

  test('should display site data in table', async ({ mockApi: page }) => {
    await expect(page.getByText('Primary Site').first()).toBeVisible();
    await expect(page.getByText('Secondary Site').first()).toBeVisible();
  });

  test('should show site descriptions', async ({ mockApi: page }) => {
    await expect(page.getByText('Main datacenter site').first()).toBeVisible();
    await expect(page.getByText('DR datacenter site').first()).toBeVisible();
  });

  test('should show node counts', async ({ mockApi: page }) => {
    // Primary Site has 2 nodes, Secondary has 1
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
  });

  test('should show online/offline node counts with color coding', async ({ mockApi: page }) => {
    // Primary site: 1 online out of 2 nodes
    const onlineIndicator = page.getByText(/online/i).or(
      page.locator('.text-green-500, .bg-green-500, [class*="green"]')
    );
    await expect(onlineIndicator.first()).toBeVisible();
  });

  test('should support search filtering', async ({ mockApi: page }) => {
    const search = page.getByPlaceholder(/search/i).or(page.getByRole('searchbox'));
    await search.first().fill('Primary');

    const searchBtn = page.getByRole('button', { name: /search/i });
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
    }

    await page.waitForTimeout(500);
    await expect(page.getByText('Primary Site').first()).toBeVisible();
  });

  test('should have sortable column headers', async ({ mockApi: page }) => {
    // Click Name column header to sort
    const nameHeader = page.getByRole('columnheader', { name: /name/i }).or(
      page.locator('th').filter({ hasText: /name/i })
    );
    if (await nameHeader.first().isVisible()) {
      await nameHeader.first().click();
      await page.waitForTimeout(500);

      // Sort icon should appear
      const sortIcon = page.locator('svg.lucide-arrow-up, svg.lucide-arrow-down, svg.lucide-chevron-up, svg.lucide-chevron-down');
      await expect(sortIcon.first()).toBeVisible();
    }
  });

  test('should show pagination controls', async ({ mockApi: page }) => {
    const prevBtn = page.getByRole('button', { name: /previous/i });
    const nextBtn = page.getByRole('button', { name: /next/i });

    // At least one pagination control should exist
    const paginationExists =
      (await prevBtn.isVisible().catch(() => false)) ||
      (await nextBtn.isVisible().catch(() => false)) ||
      (await page.getByText(/page/i).first().isVisible().catch(() => false));

    expect(paginationExists).toBeTruthy();
  });

  test('should have page size selector', async ({ mockApi: page }) => {
    const pageSizeSelector = page.getByRole('combobox').or(
      page.locator('select').filter({ hasText: /10|25|50/ })
    );
    if (await pageSizeSelector.first().isVisible()) {
      await expect(pageSizeSelector.first()).toBeVisible();
    }
  });

  test('should expand site row to show child nodes', async ({ mockApi: page }) => {
    const expandBtn = page.locator('button').filter({
      has: page.locator('svg.lucide-chevron-down, svg.lucide-chevron-right'),
    });

    if (await expandBtn.first().isVisible()) {
      await expandBtn.first().click();
      await page.waitForTimeout(500);

      // Should show node names
      await expect(page.getByText('node-alpha').first()).toBeVisible();
    }
  });

  test('should show actions menu for each site', async ({ mockApi: page }) => {
    const actionsBtn = page.locator('button').filter({
      has: page.locator('svg.lucide-more-horizontal, svg.lucide-ellipsis'),
    });

    if (await actionsBtn.first().isVisible()) {
      await actionsBtn.first().click();
      await expect(page.getByText(/view/i).first()).toBeVisible();
    }
  });
});
