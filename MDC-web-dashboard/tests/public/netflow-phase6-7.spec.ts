import { test, expect, request } from '@playwright/test';

/**
 * Phase 6 + 7 audit — NetFlow backend + user-facing dashboard.
 *
 * Phase 6 exit criterion: flows from at least one exporter are visible via
 * /api/flows, tagged with workspace + interface, and tier-scoped.
 * Phase 7 exit criterion: workspace user sees per-vNIC flow analysis for their
 * VMs with no leakage across workspaces.
 */

const API_URL = process.env.MDC_API_URL ?? 'http://localhost:5080';
const ADMIN_KEY = 'test-admin-key-12345';
const MANAGER_KEY = 'test-manager-key-12345';       // ws-alpha + ws-beta
const TECHNICIAN_KEY = 'test-technician-key-67890'; // ws-beta only

test.describe('Phase 6 — NetFlow (API)', () => {
  test('admin sees flows from all workspaces and physical interfaces', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const body = await (await api.get(`${API_URL}/api/flows?includePhysical=true&take=500`)).json();
    expect(body.tier).toBe('Admin');
    const wsSet = new Set((body.records as Array<{ workspaceId: string | null }>).map((r) => r.workspaceId ?? 'null'));
    expect(wsSet).toContain('ws-alpha');
    expect(wsSet).toContain('ws-beta');
    expect(wsSet).toContain('ws-gamma');
    expect(wsSet).toContain('null'); // physical
  });

  test('manager sees only own-workspace virtual flows (no physical, no ws-gamma)', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const body = await (await api.get(`${API_URL}/api/flows?take=500&includePhysical=true`)).json();
    expect(body.tier).toBe('WorkspaceMember');
    for (const r of body.records as Array<{ workspaceId: string; isPhysicalInterface: boolean }>) {
      expect(['ws-alpha', 'ws-beta']).toContain(r.workspaceId);
      expect(r.isPhysicalInterface).toBe(false);
    }
  });

  test('manager gets 403 on an explicit cross-tier workspace query', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const res = await api.get(`${API_URL}/api/flows?workspaceId=ws-gamma`);
    expect(res.status()).toBe(403);
  });

  test('workspace-interfaces endpoint returns one row per virtual NIC', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const list = await (await api.get(`${API_URL}/api/flows/workspaces/ws-alpha/interfaces`)).json();
    expect(list.length).toBeGreaterThan(0);
    for (const iface of list as Array<{ workspaceId: string; vmId: number; id: string }>) {
      expect(iface.workspaceId).toBe('ws-alpha');
      expect(iface.vmId).toBeGreaterThan(0);
      expect(iface.id).toMatch(/\/vm-\d+\/net\d+/);
    }
  });

  test('workspace-interfaces on a non-member workspace returns 403', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': TECHNICIAN_KEY } });
    const res = await api.get(`${API_URL}/api/flows/workspaces/ws-alpha/interfaces`);
    expect(res.status()).toBe(403);
  });

  test('top-talkers scoped to tier', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const body = await (await api.get(`${API_URL}/api/flows/top-talkers?n=5`)).json();
    for (const t of body as Array<{ label: string }>) {
      expect(t.label).not.toContain('uplink-0'); // physical must not appear for user tier
    }
  });

  test('admin-only endpoints reject non-admin callers', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    expect((await api.get(`${API_URL}/api/flows/physical`)).status()).toBe(403);
    expect((await api.get(`${API_URL}/api/flows/exporters`)).status()).toBe(403);
  });

  test('unauthenticated flows request is 401', async () => {
    const api = await request.newContext();
    expect((await api.get(`${API_URL}/api/flows`)).status()).toBe(401);
  });

  test('physical endpoint only returns isPhysicalInterface=true', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const body = await (await api.get(`${API_URL}/api/flows/physical`)).json();
    expect(body.records.length).toBeGreaterThan(0);
    for (const r of body.records as Array<{ isPhysicalInterface: boolean }>) {
      expect(r.isPhysicalInterface).toBe(true);
    }
  });
});

test.describe('Phase 7 — User NetFlow UI', () => {
  test('manager sees workspace-scoped interfaces, top talkers, recent flows', async ({ page }) => {
    await page.goto('/network?as=manager');
    await expect(page.getByTestId('user-network-page')).toBeVisible();

    // Interface rows for ws-alpha (default workspace).
    const ifaceRows = page.locator('[data-testid^="iface-row-alpha/"]');
    await expect(ifaceRows.first()).toBeVisible();
    expect(await ifaceRows.count()).toBeGreaterThan(0);

    // Top talkers rendered.
    await expect(page.getByTestId('top-talker-0')).toBeVisible();

    // At least one flow row rendered.
    await expect(page.locator('[data-testid^="flow-row-"]').first()).toBeVisible();

    // No physical-interface observation points leak into the UI.
    const html = await page.content();
    expect(html).not.toContain('uplink-0');
  });

  test('technician only sees ws-beta; ws-alpha is not offered by the switcher', async ({ page }) => {
    await page.goto('/network?as=technician');
    await expect(page.getByTestId('user-network-page')).toBeVisible();
    // Only ws-beta content is rendered.
    const html = await page.content();
    expect(html).toContain('ws-beta');
    expect(html).not.toContain('ws-alpha');
    // Interface rows are beta/...
    const ifaceRows = page.locator('[data-testid^="iface-row-beta/"]');
    await expect(ifaceRows.first()).toBeVisible();
  });

  test('workspace switcher navigates between accessible workspaces', async ({ page }) => {
    await page.goto('/network?as=manager');
    await page.getByRole('link', { name: 'ws-beta' }).first().click();
    await expect(page).toHaveURL(/ws=ws-beta/);
    const ifaceRows = page.locator('[data-testid^="iface-row-beta/"]');
    await expect(ifaceRows.first()).toBeVisible();
  });
});
