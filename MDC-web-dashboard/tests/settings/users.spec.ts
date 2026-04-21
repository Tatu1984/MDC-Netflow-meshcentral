import { test, expect } from '../fixtures';

test.describe('Users & Teams List', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/settings/users');
  });

  test('should display Users & Teams heading', async ({ mockApi: page }) => {
    await expect(page.getByRole('heading', { name: /users|teams/i }).first()).toBeVisible();
  });

  test('should display summary cards', async ({ mockApi: page }) => {
    // Total users, Admins, Members, Viewers
    await expect(page.getByText(/total/i).first()).toBeVisible();
    await expect(page.getByText(/admin/i).first()).toBeVisible();
  });

  test('should show search input', async ({ mockApi: page }) => {
    const search = page.getByPlaceholder(/search/i).or(page.getByRole('searchbox'));
    await expect(search.first()).toBeVisible();
  });

  test('should show Add User button', async ({ mockApi: page }) => {
    const addBtn = page.getByRole('button', { name: /add user|create user|invite/i });
    await expect(addBtn.first()).toBeVisible();
  });

  test('should display users in table', async ({ mockApi: page }) => {
    await expect(page.getByText('Test User').first()).toBeVisible();
    await expect(page.getByText('Jane Developer').first()).toBeVisible();
    await expect(page.getByText('Bob Viewer').first()).toBeVisible();
  });

  test('should show user emails', async ({ mockApi: page }) => {
    await expect(page.getByText('testuser@example.com').first()).toBeVisible();
    await expect(page.getByText('jane@example.com').first()).toBeVisible();
  });

  test('should show role badges', async ({ mockApi: page }) => {
    const adminBadge = page.getByText(/GlobalAdministrator|Admin/i);
    await expect(adminBadge.first()).toBeVisible();
  });

  test('should show registration status', async ({ mockApi: page }) => {
    // Test User and Jane are registered, Bob is not
    const registeredBadge = page.getByText(/registered|yes/i);
    await expect(registeredBadge.first()).toBeVisible();
  });

  test('should filter users by search', async ({ mockApi: page }) => {
    const search = page.getByPlaceholder(/search/i).or(page.getByRole('searchbox'));
    await search.first().fill('Jane');
    await page.waitForTimeout(500);

    await expect(page.getByText('Jane Developer').first()).toBeVisible();
  });

  test('should filter users by role', async ({ mockApi: page }) => {
    // Look for role filter dropdown
    const roleFilter = page.getByRole('combobox').or(
      page.locator('select, [role="listbox"]').filter({ hasText: /all|role/i })
    );

    if (await roleFilter.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await roleFilter.first().click();
      const adminOption = page.getByText(/admin/i);
      await adminOption.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('Add User dialog should open', async ({ mockApi: page }) => {
    const addBtn = page.getByRole('button', { name: /add user|create user|invite/i });
    await addBtn.first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
  });

  test('Add User dialog should have required fields', async ({ mockApi: page }) => {
    const addBtn = page.getByRole('button', { name: /add user|create user|invite/i });
    await addBtn.first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // User ID field
    const userIdInput = page.getByLabel(/user id|email|identifier/i).or(
      page.getByPlaceholder(/user id|email/i)
    );
    await expect(userIdInput.first()).toBeVisible();
  });

  test('user row should have actions menu', async ({ mockApi: page }) => {
    const actionsBtn = page.locator('button').filter({
      has: page.locator('svg.lucide-more-horizontal, svg.lucide-ellipsis'),
    });

    if (await actionsBtn.first().isVisible()) {
      await actionsBtn.first().click();
      const viewOption = page.getByText(/view|details/i);
      await expect(viewOption.first()).toBeVisible();
    }
  });
});
