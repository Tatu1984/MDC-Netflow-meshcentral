import { test, expect } from '@playwright/test';

/**
 * Phase 10 audit — Admin MeshCentral dashboard.
 * Device health table, group summary, manual reconcile report.
 */

test.describe('Phase 10 — Admin MeshCentral UI', () => {
  test('mesh admin page lists devices and exposes reconcile results', async ({ page }) => {
    await page.goto('/mesh');
    await expect(page.getByTestId('mesh-admin-page')).toBeVisible();

    // Baseline devices from Phase 4 seed.
    await expect(page.getByTestId('device-row-mesh-n-100')).toBeVisible();
    await expect(page.getByTestId('device-row-mesh-n-200')).toBeVisible();
    await expect(page.getByTestId('device-row-mesh-n-300')).toBeVisible();

    // Workspace groups.
    await expect(page.getByTestId('group-row-ws-alpha')).toBeVisible();
    await expect(page.getByTestId('group-row-ws-beta')).toBeVisible();
    await expect(page.getByTestId('group-row-ws-gamma')).toBeVisible();

    // Reconcile report rendered (numeric).
    const drifted = await page.getByTestId('reconcile-drifted').innerText();
    expect(Number.isFinite(Number(drifted))).toBe(true);
  });

  test('online / offline badges match the seed (100 online, 102 offline)', async ({ page }) => {
    await page.goto('/mesh');
    await expect(page.getByTestId('device-row-mesh-n-100')).toContainText('online');
    await expect(page.getByTestId('device-row-mesh-n-102')).toContainText('offline');
  });
});
