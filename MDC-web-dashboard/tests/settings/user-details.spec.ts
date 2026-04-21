import { test, expect } from '../fixtures';

test.describe('User Details Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/settings/users/test-user-001');
  });

  test('should display user name', async ({ mockApi: page }) => {
    await expect(page.getByText('Test User').first()).toBeVisible();
  });

  test('should show back navigation', async ({ mockApi: page }) => {
    const backBtn = page.getByRole('button', { name: /back/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-arrow-left, svg.lucide-chevron-left'),
      })
    );
    await expect(backBtn.first()).toBeVisible();
  });

  test('should show user avatar with initials', async ({ mockApi: page }) => {
    // Avatar should show initials "TU" for Test User
    const avatar = page.locator('[class*="avatar"]').or(
      page.getByText(/TU/)
    );
    await expect(avatar.first()).toBeVisible();
  });

  test('should show user email', async ({ mockApi: page }) => {
    await expect(page.getByText('testuser@example.com').first()).toBeVisible();
  });

  test('should show registration status', async ({ mockApi: page }) => {
    const registered = page.getByText(/registered/i);
    await expect(registered.first()).toBeVisible();
  });

  test('should show user ID', async ({ mockApi: page }) => {
    await expect(page.getByText('test-user-001').first()).toBeVisible();
  });

  test('should display app roles', async ({ mockApi: page }) => {
    // GlobalAdministrator role
    await expect(page.getByText(/GlobalAdministrator/i).first()).toBeVisible();
  });

  test('should display organization roles', async ({ mockApi: page }) => {
    // User has admin role in org-001
    await expect(page.getByText(/admin/i).first()).toBeVisible();
  });

  test('should show edit permissions button', async ({ mockApi: page }) => {
    const editBtn = page.getByRole('button', { name: /edit.*permission|edit.*role/i });
    await expect(editBtn.first()).toBeVisible();
  });

  test('edit permissions dialog should open', async ({ mockApi: page }) => {
    const editBtn = page.getByRole('button', { name: /edit.*permission|edit.*role/i });
    await editBtn.first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Should show role checkboxes or selects
    await expect(page.getByText(/GlobalAdministrator|DatacenterTechnician|WorkspaceManager|WorkspaceUser/i).first()).toBeVisible();
  });

  test('should show delete user button', async ({ mockApi: page }) => {
    const deleteBtn = page.getByRole('button', { name: /delete/i });
    await expect(deleteBtn.first()).toBeVisible();
  });

  test('delete button should open confirmation dialog', async ({ mockApi: page }) => {
    const deleteBtn = page.getByRole('button', { name: /delete/i });
    await deleteBtn.first().click();

    const confirmDialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(confirmDialog).toBeVisible();
  });
});

test.describe('Unregistered User Details', () => {
  test('should show unregistered status', async ({ mockApi }) => {
    await mockApi.goto('/dashboard/settings/users/test-user-003');

    // Bob Viewer is not registered
    await expect(mockApi.getByText('Bob Viewer').first()).toBeVisible();
    const unregistered = mockApi.getByText(/not registered|no/i);
    await expect(unregistered.first()).toBeVisible();
  });
});
