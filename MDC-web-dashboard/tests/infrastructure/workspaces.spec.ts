import { test, expect } from '../fixtures';

test.describe('Workspaces List', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/infrastructure/workspaces');
  });

  test('should display Workspaces heading', async ({ mockApi: page }) => {
    await expect(page.getByRole('heading', { name: /workspaces/i }).first()).toBeVisible();
  });

  test('should show search input', async ({ mockApi: page }) => {
    const search = page.getByPlaceholder(/search/i).or(
      page.getByRole('searchbox')
    );
    await expect(search.first()).toBeVisible();
  });

  test('should show Create Workspace button', async ({ mockApi: page }) => {
    const createBtn = page.getByRole('button', { name: /create workspace/i });
    await expect(createBtn).toBeVisible();
  });

  test('should show refresh button', async ({ mockApi: page }) => {
    const refreshBtn = page.getByRole('button', { name: /refresh/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-refresh-cw, svg.lucide-rotate-cw'),
      })
    );
    await expect(refreshBtn.first()).toBeVisible();
  });

  test('should display workspace data in table', async ({ mockApi: page }) => {
    // Wait for table to render
    await expect(page.getByText('Production Workspace').first()).toBeVisible();
    await expect(page.getByText('Development Workspace').first()).toBeVisible();
  });

  test('should show workspace status badges', async ({ mockApi: page }) => {
    // Running and Stopped statuses from mock data
    const statusBadge = page.getByText(/running|stopped/i);
    await expect(statusBadge.first()).toBeVisible();
  });

  test('should show locked indicator for locked workspaces', async ({ mockApi: page }) => {
    // Development Workspace is locked in mock data
    const lockIcon = page.locator('svg.lucide-lock').or(page.getByText(/locked/i));
    await expect(lockIcon.first()).toBeVisible();
  });

  test('should filter workspaces by search', async ({ mockApi: page }) => {
    const search = page.getByPlaceholder(/search/i).or(
      page.getByRole('searchbox')
    );
    await search.first().fill('Production');
    await page.waitForTimeout(500);

    await expect(page.getByText('Production Workspace').first()).toBeVisible();
  });

  test('Create Workspace dialog should open', async ({ mockApi: page }) => {
    await page.getByRole('button', { name: /create workspace/i }).click();

    // Dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Should have form fields
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
  });

  test('Create Workspace dialog should have all required fields', async ({ mockApi: page }) => {
    await page.getByRole('button', { name: /create workspace/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Required fields
    await expect(page.getByLabel(/name/i).first()).toBeVisible();

    // Organization select
    const orgSelect = page.getByText(/organization/i);
    await expect(orgSelect.first()).toBeVisible();

    // Site select
    const siteSelect = page.getByText(/site/i);
    await expect(siteSelect.first()).toBeVisible();
  });

  test('Create Workspace dialog can be closed', async ({ mockApi: page }) => {
    await page.getByRole('button', { name: /create workspace/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Close dialog
    const closeBtn = page.getByRole('button', { name: /close|cancel/i }).or(
      page.locator('[data-state="open"] button').filter({
        has: page.locator('svg.lucide-x'),
      })
    );
    await closeBtn.first().click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('workspace row should have actions menu', async ({ mockApi: page }) => {
    // Click actions button on first row
    const actionsBtn = page.locator('button').filter({
      has: page.locator('svg.lucide-more-horizontal, svg.lucide-ellipsis'),
    });

    if (await actionsBtn.first().isVisible()) {
      await actionsBtn.first().click();

      // Should show action options
      const viewOption = page.getByText(/view/i);
      await expect(viewOption.first()).toBeVisible();
    }
  });

  test('clicking workspace row should expand details', async ({ mockApi: page }) => {
    // Click on a workspace row or its expand chevron
    const expandBtn = page.locator('button').filter({
      has: page.locator('svg.lucide-chevron-down, svg.lucide-chevron-right'),
    });

    if (await expandBtn.first().isVisible()) {
      await expandBtn.first().click();
      await page.waitForTimeout(500);

      // Expanded content should show VM or network details
      const expandedContent = page.getByText(/virtual machine|network|vm/i);
      await expect(expandedContent.first()).toBeVisible();
    }
  });
});
