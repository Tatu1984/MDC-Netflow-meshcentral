import { test, expect } from '@playwright/test';

/**
 * Phase 8 audit — Admin NetFlow dashboard.
 * Global flow explorer, physical interface subview, exporter inventory.
 */

test.describe('Phase 8 — Admin NetFlow UI', () => {
  test('overview shows recent flows and top talkers including physical', async ({ page }) => {
    await page.goto('/netflow');
    await expect(page.getByTestId('netflow-overview')).toBeVisible();
    await expect(page.getByTestId('top-talker-0')).toBeVisible();

    // At least one physical-interface flow row is tagged.
    const html = await page.content();
    expect(html).toContain('uplink-0');
  });

  test('physical subview lists uplinks and sample flows', async ({ page }) => {
    await page.goto('/netflow/physical');
    await expect(page.getByTestId('netflow-physical')).toBeVisible();

    const ifaces = page.locator('[data-testid^="phys-iface-"]');
    await expect(ifaces.first()).toBeVisible();
    expect(await ifaces.count()).toBeGreaterThan(0);

    const flows = page.locator('[data-testid^="phys-flow-"]');
    await expect(flows.first()).toBeVisible();
  });

  test('exporters page lists every registered exporter with its home collector', async ({ page }) => {
    await page.goto('/netflow/exporters');
    await expect(page.getByTestId('netflow-exporters')).toBeVisible();

    await expect(page.getByTestId('exporter-row-exp-alpha-vsw')).toBeVisible();
    await expect(page.getByTestId('exporter-row-exp-alpha-tor')).toBeVisible();
    await expect(page.getByTestId('exporter-row-exp-beta-vsw')).toBeVisible();
    await expect(page.getByTestId('exporter-row-exp-gamma-vsw')).toBeVisible();

    // Home collector column shows the mix of central + edge.
    await expect(page.getByTestId('exporter-row-exp-alpha-vsw')).toContainText('central');
    await expect(page.getByTestId('exporter-row-exp-beta-vsw')).toContainText('edge-beta');
  });
});
