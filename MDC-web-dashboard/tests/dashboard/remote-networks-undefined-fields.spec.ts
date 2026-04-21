import { test, expect } from '@playwright/test';

/**
 * Regression for the production crash:
 *   "TypeError: Cannot read properties of undefined (reading 'slice')"
 * on /dashboard/infrastructure/remote-networks.
 *
 * Backend OData response for /odata/RemoteNetworks has been observed returning
 * records without siteId / workspaceId. The page used to call
 *   network.workspaceId.slice(0, 8)
 * which throws on undefined and breaks the entire row .map().
 *
 * This test injects exactly that payload via route interception and proves the
 * page no longer crashes — bug-shaped row renders the "—" fallback instead.
 */

test.describe('Remote networks — undefined siteId/workspaceId regression', () => {
  test('renders without crashing when a network is missing FK ids', async ({ page }) => {
    // Capture browser console errors so we can assert the specific TypeError is gone.
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    const orphanedNet = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'orphaned-net',
      networkId: 'aaaaaaaaaaaaaaaa',
      virtualNetworkId: 'vn-orphan',
      members: [],
      // siteId and workspaceId intentionally absent
    };
    const normalNet = {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'normal-net',
      networkId: 'bbbbbbbbbbbbbbbb',
      siteId: 'site-001',
      workspaceId: 'ws-001',
      virtualNetworkId: 'vn-normal',
      members: [],
    };

    // Trace all requests so the test fails informatively if no expected URL is hit.
    const observedUrls: string[] = [];
    page.on('request', (req) => observedUrls.push(req.url()));

    // Runtime config — the dashboard fetches this to learn the API base URL.
    await page.route(/\/api\/config/, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ mdcApiUrl: '/api/proxy', mdcScope: '', mdcDevApiKey: 'test-admin-key-12345' }),
      });
    });

    let remoteNetworksHits = 0;
    await page.route(/RemoteNetworks/, async (route) => {
      remoteNetworksHits++;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ '@odata.context': 'mock', value: [orphanedNet, normalNet] }),
      });
    });
    await page.route(/\/Workspaces(\?|$)/, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ '@odata.context': 'mock', value: [{ id: 'ws-001', name: 'Workspace One' }] }),
      });
    });
    await page.route(/\/Sites(\?|$)/, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ '@odata.context': 'mock', value: [{ id: 'site-001', name: 'Site One' }] }),
      });
    });

    await page.goto('/dashboard/infrastructure/remote-networks');

    // Confirm our route fired (otherwise the test isn't really exercising the bug).
    await expect.poll(
      () => remoteNetworksHits,
      { timeout: 10_000, message: () => `RemoteNetworks route never hit. Observed URLs:\n${observedUrls.join('\n')}` },
    ).toBeGreaterThan(0);

    // Both rows appear — the orphan renders even without FK ids.
    await expect(page.getByText('orphaned-net')).toBeVisible();
    await expect(page.getByText('normal-net')).toBeVisible();

    // Specific dash fallback for the orphan's workspace + site cells should be present.
    // Two cells in the orphan row (workspace and site) render "—".
    // (We don't assert exact count since the page may render dashes elsewhere.)
    await expect(page.getByText('—').first()).toBeVisible();

    // Critical: no "Cannot read properties of undefined (reading 'slice')" error fired.
    const sliceCrash = pageErrors.find((e) =>
      /Cannot read properties of undefined \(reading 'slice'\)/i.test(e.message),
    );
    expect(sliceCrash, sliceCrash ? `Crash still happens: ${sliceCrash.message}` : '').toBeUndefined();
  });
});
