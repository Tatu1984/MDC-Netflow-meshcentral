import { test, expect } from '../fixtures';

test.describe('Workspace Details Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.goto('/dashboard/infrastructure/workspaces/ws-001');
  });

  test('should display workspace name as heading', async ({ mockApi: page }) => {
    await expect(page.getByText('Production Workspace').first()).toBeVisible();
  });

  test('should show back navigation button', async ({ mockApi: page }) => {
    const backBtn = page.getByRole('button', { name: /back/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-arrow-left, svg.lucide-chevron-left'),
      })
    );
    await expect(backBtn.first()).toBeVisible();
  });

  test('back button navigates to workspaces list', async ({ mockApi: page }) => {
    const backBtn = page.getByRole('button', { name: /back/i }).or(
      page.locator('button').filter({
        has: page.locator('svg.lucide-arrow-left, svg.lucide-chevron-left'),
      })
    );
    await backBtn.first().click();
    await expect(page).toHaveURL(/workspaces/);
  });

  test('should display Overview tab', async ({ mockApi: page }) => {
    const overviewTab = page.getByRole('tab', { name: /overview/i }).or(
      page.getByText(/overview/i)
    );
    await expect(overviewTab.first()).toBeVisible();
  });

  test('should display Virtual Machines tab', async ({ mockApi: page }) => {
    const vmTab = page.getByRole('tab', { name: /virtual machines/i }).or(
      page.getByText(/virtual machines/i)
    );
    await expect(vmTab.first()).toBeVisible();
  });

  test('should display Descriptor tab', async ({ mockApi: page }) => {
    const descriptorTab = page.getByRole('tab', { name: /descriptor/i }).or(
      page.getByText(/descriptor/i)
    );
    await expect(descriptorTab.first()).toBeVisible();
  });

  test('Overview tab should show virtual networks', async ({ mockApi: page }) => {
    // Default tab is Overview
    await expect(page.getByText('default-network').first()).toBeVisible();
  });

  test('Virtual Machines tab should list VMs', async ({ mockApi: page }) => {
    const vmTab = page.getByRole('tab', { name: /virtual machines/i }).or(
      page.getByText(/virtual machines/i)
    );
    await vmTab.first().click();

    // VM names from mock data
    await expect(page.getByText('web-server-01').first()).toBeVisible();
    await expect(page.getByText('db-server-01').first()).toBeVisible();
  });

  test('VM details should show CPU and memory info', async ({ mockApi: page }) => {
    const vmTab = page.getByRole('tab', { name: /virtual machines/i }).or(
      page.getByText(/virtual machines/i)
    );
    await vmTab.first().click();

    // CPU and memory values from mock data
    await expect(page.getByText(/4/).first()).toBeVisible(); // cores
    await expect(page.getByText(/8192|8 GB/i).first()).toBeVisible(); // memory
  });

  test('Descriptor tab should show JSON content', async ({ mockApi: page }) => {
    const descriptorTab = page.getByRole('tab', { name: /descriptor/i }).or(
      page.getByText(/descriptor/i)
    );
    await descriptorTab.first().click();

    // JSON content should be visible (workspace name appears in JSON)
    await page.waitForTimeout(500);
    const jsonContent = page.locator('pre, code, [class*="json"], [class*="editor"]');
    await expect(jsonContent.first()).toBeVisible();
  });

  test('should show lock/unlock button', async ({ mockApi: page }) => {
    const lockBtn = page.getByRole('button', { name: /lock|unlock/i });
    await expect(lockBtn.first()).toBeVisible();
  });

  test('should show delete button', async ({ mockApi: page }) => {
    const deleteBtn = page.getByRole('button', { name: /delete/i });
    await expect(deleteBtn.first()).toBeVisible();
  });

  test('delete button should open confirmation dialog', async ({ mockApi: page }) => {
    const deleteBtn = page.getByRole('button', { name: /delete/i });
    await deleteBtn.first().click();

    // Confirmation dialog should appear
    const confirmDialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(confirmDialog).toBeVisible();

    // Should require workspace name input for confirmation
    const nameInput = page.getByPlaceholder(/workspace name|name/i).or(
      page.getByRole('textbox')
    );
    await expect(nameInput.first()).toBeVisible();
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

test.describe('Locked Workspace Details', () => {
  test('should show locked state for locked workspace', async ({ mockApi }) => {
    await mockApi.goto('/dashboard/infrastructure/workspaces/ws-002');

    // ws-002 is locked in mock data
    const lockIndicator = mockApi.getByText(/locked/i).or(
      mockApi.locator('svg.lucide-lock')
    );
    await expect(lockIndicator.first()).toBeVisible();
  });
});
