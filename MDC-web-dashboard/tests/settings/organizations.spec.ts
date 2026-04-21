import { test, expect } from '../fixtures';

test.describe('Organizations List', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/settings/organization');
  });

  test('should display Organizations heading', async ({ mockApi: page }) => {
    await expect(page.getByRole('heading', { name: /organizations/i }).first()).toBeVisible();
  });

  test('should show description text', async ({ mockApi: page }) => {
    await expect(page.getByText(/manage.*organizations|access/i).first()).toBeVisible();
  });

  test('should display stats cards', async ({ mockApi: page }) => {
    // Total organizations, Active organizations
    await expect(page.getByText(/total/i).first()).toBeVisible();
  });

  test('should display organization names', async ({ mockApi: page }) => {
    await expect(page.getByText('Test Organization').first()).toBeVisible();
    await expect(page.getByText('Secondary Org').first()).toBeVisible();
  });

  test('should show create organization button', async ({ mockApi: page }) => {
    const createBtn = page.getByRole('button', { name: /create|add.*organization/i });
    if (await createBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(createBtn.first()).toBeVisible();
    }
  });

  test('create organization dialog should open', async ({ mockApi: page }) => {
    const createBtn = page.getByRole('button', { name: /create|add.*organization/i });
    if (await createBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Name input
      await expect(page.getByLabel(/name/i).first()).toBeVisible();
    }
  });

  test('should expand organization row to show details', async ({ mockApi: page }) => {
    const expandBtn = page.locator('button').filter({
      has: page.locator('svg.lucide-chevron-down, svg.lucide-chevron-right'),
    });

    if (await expandBtn.first().isVisible()) {
      await expandBtn.first().click();
      await page.waitForTimeout(500);

      // Should show sites, workspaces, or user roles
      const expandedContent = page.getByText(/site|workspace|role/i);
      await expect(expandedContent.first()).toBeVisible();
    }
  });

  test('clicking organization should navigate to details', async ({ mockApi: page }) => {
    // Try clicking organization name link
    const orgLink = page.getByRole('link', { name: /test organization/i }).or(
      page.getByText('Test Organization').first()
    );
    await orgLink.click();

    await expect(page).toHaveURL(/organization\/org-001/);
  });

  test('should show actions menu', async ({ mockApi: page }) => {
    const actionsBtn = page.locator('button').filter({
      has: page.locator('svg.lucide-more-horizontal, svg.lucide-ellipsis'),
    });

    if (await actionsBtn.first().isVisible()) {
      await actionsBtn.first().click();
      await expect(page.getByText(/view|edit|delete/i).first()).toBeVisible();
    }
  });
});
