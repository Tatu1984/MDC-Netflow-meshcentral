import { test, expect } from '../fixtures';

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard');
  });

  test('should display sidebar with app name', async ({ mockApi: page }) => {
    await expect(page.getByText('TS Edge Nest').first()).toBeVisible();
  });

  test('should show Dashboard nav item', async ({ mockApi: page }) => {
    const dashboardLink = page.getByRole('link', { name: /^dashboard$/i }).or(
      page.locator('[data-sidebar]').getByText(/^dashboard$/i)
    );
    await expect(dashboardLink.first()).toBeVisible();
  });

  test('should show Infrastructure section with sub-items', async ({ mockApi: page }) => {
    // Click Infrastructure to expand
    const infraSection = page.getByText(/infrastructure/i).first();
    await infraSection.click();

    // Sub-items should be visible
    await expect(page.getByRole('link', { name: /workspaces/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sites/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /remote networks/i }).first()).toBeVisible();
  });

  test('should navigate to Workspaces page', async ({ mockApi: page }) => {
    const infraSection = page.getByText(/infrastructure/i).first();
    await infraSection.click();

    await page.getByRole('link', { name: /workspaces/i }).first().click();
    await expect(page).toHaveURL(/infrastructure\/workspaces/);
  });

  test('should navigate to Sites page', async ({ mockApi: page }) => {
    const infraSection = page.getByText(/infrastructure/i).first();
    await infraSection.click();

    await page.getByRole('link', { name: /sites/i }).first().click();
    await expect(page).toHaveURL(/infrastructure\/sites/);
  });

  test('should navigate to Remote Networks page', async ({ mockApi: page }) => {
    const infraSection = page.getByText(/infrastructure/i).first();
    await infraSection.click();

    await page.getByRole('link', { name: /remote networks/i }).first().click();
    await expect(page).toHaveURL(/infrastructure\/remote-networks/);
  });

  test('should show Settings section with sub-items', async ({ mockApi: page }) => {
    const settingsSection = page.getByText(/settings/i).first();
    await settingsSection.click();

    await expect(page.getByRole('link', { name: /organization/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /users|teams/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /activity logs/i }).first()).toBeVisible();
  });

  test('should navigate to Organization settings', async ({ mockApi: page }) => {
    const settingsSection = page.getByText(/settings/i).first();
    await settingsSection.click();

    await page.getByRole('link', { name: /organization/i }).first().click();
    await expect(page).toHaveURL(/settings\/organization/);
  });

  test('should navigate to Users & Teams', async ({ mockApi: page }) => {
    const settingsSection = page.getByText(/settings/i).first();
    await settingsSection.click();

    await page.getByRole('link', { name: /users|teams/i }).first().click();
    await expect(page).toHaveURL(/settings\/users/);
  });

  test('should navigate to Activity Logs', async ({ mockApi: page }) => {
    const settingsSection = page.getByText(/settings/i).first();
    await settingsSection.click();

    await page.getByRole('link', { name: /activity logs/i }).first().click();
    await expect(page).toHaveURL(/settings\/activity-logs/);
  });

  test('should show user info in sidebar footer', async ({ mockApi: page }) => {
    // User name or email should appear in the sidebar
    const userName = page.getByText('Test User').or(page.getByText('testuser@example.com'));
    await expect(userName.first()).toBeVisible();
  });

  test('should show sign out option in user dropdown', async ({ mockApi: page }) => {
    // Click user avatar/dropdown in sidebar footer
    const userTrigger = page.locator('[data-sidebar="footer"]').or(
      page.getByText('Test User')
    );
    await userTrigger.first().click();

    const signOut = page.getByText(/sign out|log out|logout/i);
    await expect(signOut.first()).toBeVisible();
  });
});

test.describe('Header', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard');
  });

  test('should display theme toggle button', async ({ mockApi: page }) => {
    // Theme toggle — Sun or Moon icon button
    const themeToggle = page.getByRole('button', { name: /theme|toggle|mode/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-sun, svg.lucide-moon'),
      })
    );
    await expect(themeToggle.first()).toBeVisible();
  });

  test('theme toggle should switch theme', async ({ mockApi: page }) => {
    const themeToggle = page.getByRole('button', { name: /theme|toggle|mode/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-sun, svg.lucide-moon'),
      })
    );

    // Get initial theme
    const htmlBefore = await page.locator('html').getAttribute('class');

    await themeToggle.first().click();

    // Theme class should change
    await page.waitForTimeout(500);
    const htmlAfter = await page.locator('html').getAttribute('class');
    expect(htmlAfter).not.toBe(htmlBefore);
  });

  test('should show sidebar trigger for mobile', async ({ mockApi: page }) => {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 812 });

    const sidebarTrigger = page.getByRole('button', { name: /menu|sidebar|toggle/i }).or(
      page.locator('[data-sidebar="trigger"]')
    );
    await expect(sidebarTrigger.first()).toBeVisible();
  });
});
