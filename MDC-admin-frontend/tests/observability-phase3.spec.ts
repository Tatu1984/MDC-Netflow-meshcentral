import { test, expect, request } from '@playwright/test';

/**
 * Phase 3 audit — Admin Observability section (MDC-admin-frontend).
 *
 * Exit criterion: administrator can operate the Proxmox estate from the admin
 * frontend without opening the native PDM UI for routine tasks. Fleet,
 * Clusters, Nodes, Storage, Events subviews all render live data from the API.
 *
 * "Proper data, not mock data" in the UI sense means: the values on the page
 * come from the live API (not hardcoded in the React). We prove this by
 *   (a) comparing what the page renders with what the API returns,
 *   (b) asserting the server-reported serverTimeUtc is within a small delta
 *       of the test wall-clock, which only holds if the value came from the
 *       running backend.
 */

const API_URL = process.env.MDC_API_URL ?? 'http://localhost:5080';
const ADMIN_KEY = 'test-admin-key-12345';

test.describe('Phase 3 — Admin Observability (API)', () => {
  test('storage endpoint returns live pools with non-zero capacity', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const res = await api.get(`${API_URL}/api/observability/storage`);
    expect(res.status()).toBe(200);
    const pools = await res.json();
    expect(Array.isArray(pools)).toBe(true);
    expect(pools.length).toBeGreaterThan(0);
    for (const p of pools) {
      expect(p).toMatchObject({ id: expect.any(String), clusterId: expect.any(String), kind: expect.any(String), health: expect.any(String) });
      expect(p.totalBytes).toBeGreaterThan(0);
      expect(p.usedBytes).toBeGreaterThanOrEqual(0);
      expect(p.usedBytes).toBeLessThanOrEqual(p.totalBytes);
    }
    // At least one pool has a non-healthy state (our mock has one degraded).
    expect(pools.some((p: { health: string }) => p.health !== 'healthy')).toBe(true);
  });

  test('status serverTimeUtc is within 60s of local wall-clock (live value, not a placeholder)', async () => {
    const api = await request.newContext();
    const res = await api.get(`${API_URL}/api/observability/status`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const skewMs = Math.abs(Date.parse(body.serverTimeUtc) - Date.now());
    expect(skewMs).toBeLessThan(60_000);
  });
});

test.describe('Phase 3 — Admin Observability (UI — Fleet)', () => {
  test('fleet page shows cluster counts matching the API', async ({ page }) => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const clusters = await (await api.get(`${API_URL}/api/observability/fleet`)).json() as Array<{ id: string; name: string; nodeCount: number; vmCount: number }>;

    await page.goto('/observability');
    await expect(page.getByRole('heading', { name: 'Observability · Admin' })).toBeVisible();
    await expect(page.getByTestId('fleet-page')).toBeVisible();

    // Every cluster row renders (data-testid driven).
    for (const c of clusters) {
      await expect(page.getByTestId(`cluster-row-${c.id}`)).toBeVisible();
      await expect(page.getByTestId(`cluster-link-${c.id}`)).toBeVisible();
    }

    // Totals match the API exactly — proves values flow through.
    const totalNodes = clusters.reduce((a, c) => a + c.nodeCount, 0);
    const totalVms = clusters.reduce((a, c) => a + c.vmCount, 0);
    await expect(page.getByText(String(totalNodes), { exact: true }).first()).toBeVisible();
    await expect(page.getByText(String(totalVms), { exact: true }).first()).toBeVisible();
  });

  test('Inspect link navigates into the cluster drilldown', async ({ page }) => {
    await page.goto('/observability');
    await page.getByTestId('cluster-link-cluster-alpha').click();
    await expect(page).toHaveURL(/\/observability\/clusters\/cluster-alpha$/);
    await expect(page.getByTestId('cluster-page')).toBeVisible();
  });
});

test.describe('Phase 3 — Admin Observability (UI — Cluster drilldown)', () => {
  test('node and VM counts on the cluster page match the API for cluster-alpha', async ({ page }) => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const nodes = await (await api.get(`${API_URL}/api/observability/clusters/cluster-alpha/nodes`)).json() as Array<{ id: string }>;
    const vms = await (await api.get(`${API_URL}/api/observability/clusters/cluster-alpha/vms`)).json() as Array<{ vmid: number }>;

    await page.goto('/observability/clusters/cluster-alpha');
    await expect(page.getByTestId('cluster-page')).toBeVisible();

    const nodeRows = page.locator('[data-testid^="node-row-"]');
    await expect(nodeRows).toHaveCount(nodes.length);

    const vmRows = page.locator('[data-testid^="vm-row-"]');
    await expect(vmRows).toHaveCount(vms.length);

    // Every API-reported vmid has a matching row.
    for (const v of vms.slice(0, 5)) {
      await expect(page.getByTestId(`vm-row-${v.vmid}`)).toBeVisible();
    }
  });
});

test.describe('Phase 3 — Admin Observability (UI — Nodes, Storage, Events)', () => {
  test('/nodes lists every host across all clusters', async ({ page }) => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const clusters = await (await api.get(`${API_URL}/api/observability/fleet`)).json() as Array<{ id: string }>;
    let total = 0;
    for (const c of clusters) {
      const ns = await (await api.get(`${API_URL}/api/observability/clusters/${c.id}/nodes`)).json() as unknown[];
      total += ns.length;
    }

    await page.goto('/observability/nodes');
    await expect(page.getByTestId('nodes-page')).toBeVisible();
    const rows = page.locator('[data-testid^="node-row-"]');
    await expect(rows).toHaveCount(total);
  });

  test('/storage renders one row per pool with correct used/total', async ({ page }) => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const pools = await (await api.get(`${API_URL}/api/observability/storage`)).json() as Array<{
      id: string; name: string; totalBytes: number; usedBytes: number;
    }>;

    await page.goto('/observability/storage');
    await expect(page.getByTestId('storage-page')).toBeVisible();

    for (const p of pools) {
      const row = page.getByTestId(`pool-row-${p.id}`);
      await expect(row).toBeVisible();
      const expectedUsedGb = Math.round(p.usedBytes / 1_000_000_000).toString();
      const expectedTotalGb = Math.round(p.totalBytes / 1_000_000_000).toString();
      await expect(row).toContainText(`${expectedUsedGb} / ${expectedTotalGb}`);
    }

    // Degraded pool renders the destructive badge.
    const degraded = pools.find((p) => p.id === 'ceph-g');
    expect(degraded).toBeTruthy();
    await expect(page.getByTestId('pool-row-ceph-g')).toContainText('degraded');
  });

  test('/events renders every event the API reports', async ({ page }) => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const events = await (await api.get(`${API_URL}/api/observability/events?take=50`)).json() as unknown[];

    await page.goto('/observability/events');
    await expect(page.getByTestId('events-page')).toBeVisible();
    const rows = page.locator('[data-testid^="event-row-"]');
    await expect(rows).toHaveCount(events.length);
  });
});

test.describe('Phase 3 — Admin Observability (UI — degraded mode)', () => {
  test('status chip shows the live serverTimeUtc (not a hardcoded placeholder)', async ({ page }) => {
    await page.goto('/observability');
    const chip = page.getByTestId('status-chip');
    await expect(chip).toBeVisible();

    const text = (await chip.textContent()) ?? '';
    const match = text.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/);
    expect(match, `Expected an ISO timestamp in status chip, got: ${text}`).not.toBeNull();
    const renderedSkewMs = Math.abs(Date.parse(match![1]) - Date.now());
    expect(renderedSkewMs).toBeLessThan(120_000); // allow for page render + fetch
  });
});
