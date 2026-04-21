import { test, expect } from '@playwright/test';

/**
 * User-facing MeshCentral dashboard — /remote-access.
 * Lists every VM in the caller's workspaces with agent status and a link into
 * the Remote Connect + VNC panel.
 */

test.describe('Remote access overview page', () => {
  test('manager sees VMs from ws-alpha + ws-beta only', async ({ page }) => {
    await page.goto('/remote-access?as=manager');
    await expect(page.getByTestId('remote-access-page')).toBeVisible();

    // At least one known ws-alpha VMID (100–113) rendered.
    await expect(page.getByTestId('vm-row-100')).toBeVisible();
    // ws-gamma VM (300) must NOT appear.
    await expect(page.getByTestId('vm-row-300')).toHaveCount(0);
  });

  test('agent badges show correct state for baseline fixture (vm 100 online, 102 offline, 103 not enrolled)', async ({ page }) => {
    await page.goto('/remote-access?as=manager');
    await expect(page.getByTestId('agent-badge-100')).toHaveText('online');
    await expect(page.getByTestId('agent-badge-102')).toHaveText('offline');
    await expect(page.getByTestId('agent-badge-103')).toHaveText('not enrolled');
  });

  test('Open link on a VM row navigates into the detail page', async ({ page }) => {
    await page.goto('/remote-access?as=manager');
    await page.getByTestId('open-100').click();
    await expect(page).toHaveURL(/\/vms\/100/);
    await expect(page.getByTestId('vm-detail-page')).toBeVisible();
  });

  test('admin sees VMs from every workspace including ws-gamma', async ({ page }) => {
    await page.goto('/remote-access?as=admin');
    await expect(page.getByTestId('vm-row-100')).toBeVisible();
    await expect(page.getByTestId('vm-row-300')).toBeVisible();
  });
});
