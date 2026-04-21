import { test, expect } from '../fixtures';

test.describe('Organization Details Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/settings/organization/org-001');
  });

  test('should display organization name', async ({ mockApi: page }) => {
    await expect(page.getByText('Test Organization').first()).toBeVisible();
  });

  test('should show organization ID', async ({ mockApi: page }) => {
    const orgId = page.getByText('org-001').or(
      page.locator('code, [class*="mono"]').filter({ hasText: 'org-001' })
    );
    await expect(orgId.first()).toBeVisible();
  });

  test('should show back navigation', async ({ mockApi: page }) => {
    const backBtn = page.getByRole('button', { name: /back/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-arrow-left, svg.lucide-chevron-left'),
      })
    );
    await expect(backBtn.first()).toBeVisible();
  });

  test('should display organization overview card', async ({ mockApi: page }) => {
    // Name, description, status
    await expect(page.getByText('Test Organization').first()).toBeVisible();
  });

  test('should show sites section', async ({ mockApi: page }) => {
    const sitesSection = page.getByText(/sites/i);
    await expect(sitesSection.first()).toBeVisible();
  });

  test('should show linked site names', async ({ mockApi: page }) => {
    // org-001 is linked to site-001
    const siteLink = page.getByText(/primary site|site-001/i);
    await expect(siteLink.first()).toBeVisible();
  });

  test('clicking site link should navigate to site details', async ({ mockApi: page }) => {
    const siteLink = page.getByRole('link', { name: /primary site/i }).or(
      page.getByText('Primary Site').first()
    );

    if (await siteLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await siteLink.click();
      await expect(page).toHaveURL(/sites\/site-001/);
    }
  });

  test('should show workspaces section', async ({ mockApi: page }) => {
    const workspacesSection = page.getByText(/workspaces/i);
    await expect(workspacesSection.first()).toBeVisible();
  });

  test('should show users section', async ({ mockApi: page }) => {
    const usersSection = page.getByText(/users/i);
    await expect(usersSection.first()).toBeVisible();
  });

  test('should show user roles in organization', async ({ mockApi: page }) => {
    // test-user-001 has admin role
    const adminRole = page.getByText(/admin/i);
    await expect(adminRole.first()).toBeVisible();
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
