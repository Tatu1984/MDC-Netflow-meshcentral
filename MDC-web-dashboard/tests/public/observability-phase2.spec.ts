import { test, expect, request } from '@playwright/test';

/**
 * Phase 2 audit — User Observability panel.
 *
 * Exit criteria:
 *   - Workspace-member callers see live metrics only for workspaces they belong to.
 *   - Non-member workspaces return 403 at the API, error card in UI.
 *   - Admin tier sees every workspace.
 *   - Per-VM endpoint is 403 when the VM is outside caller's workspaces, 200 when inside.
 */

const API_URL = process.env.MDC_API_URL ?? 'http://localhost:5080';
const ADMIN_KEY = 'test-admin-key-12345';
const MANAGER_KEY = 'test-manager-key-12345';      // member of ws-alpha, ws-beta
const TECHNICIAN_KEY = 'test-technician-key-67890'; // member of ws-beta only

test.describe('Phase 2 — User Observability (API, tier enforcement)', () => {
  test('admin sees all workspaces via my-workspaces', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const res = await api.get(`${API_URL}/api/observability/my-workspaces`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.tier).toBe('admin');
    expect(body.workspaceIds).toEqual(expect.arrayContaining(['ws-alpha', 'ws-beta', 'ws-gamma']));
  });

  test('manager sees only own workspaces via my-workspaces', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const res = await api.get(`${API_URL}/api/observability/my-workspaces`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.tier).toBe('workspace');
    expect(body.workspaceIds.sort()).toEqual(['ws-alpha', 'ws-beta']);
  });

  test('manager can list VMs in a workspace they belong to', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const res = await api.get(`${API_URL}/api/observability/workspaces/ws-alpha/vms`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.workspaceId).toBe('ws-alpha');
    expect(body.count).toBeGreaterThan(0);
    expect(body.vms[0]).toHaveProperty('vmid');
    expect(body.vms[0].metrics).toHaveProperty('cpuPct');
  });

  test('manager is 403 on a workspace they do NOT belong to', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const res = await api.get(`${API_URL}/api/observability/workspaces/ws-gamma/vms`);
    expect(res.status()).toBe(403);
  });

  test('technician is 403 on ws-alpha (not a member) but 200 on ws-beta', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': TECHNICIAN_KEY } });
    const forbidden = await api.get(`${API_URL}/api/observability/workspaces/ws-alpha/vms`);
    expect(forbidden.status()).toBe(403);
    const ok = await api.get(`${API_URL}/api/observability/workspaces/ws-beta/vms`);
    expect(ok.status()).toBe(200);
  });

  test('unauthenticated calls return 401', async () => {
    const api = await request.newContext();
    const a = await api.get(`${API_URL}/api/observability/workspaces/ws-alpha/vms`);
    expect(a.status()).toBe(401);
    const b = await api.get(`${API_URL}/api/observability/my-workspaces`);
    expect(b.status()).toBe(401);
  });

  test('per-VM metrics: manager can read a VM in ws-alpha but 403 on a VM in ws-gamma', async () => {
    // VM 100 is in cluster-alpha → ws-alpha (from MockVmWorkspaceMap).
    // VM 300 is the first VM of cluster-gamma → ws-gamma.
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const allowed = await api.get(`${API_URL}/api/observability/vms/100/metrics`);
    expect(allowed.status()).toBe(200);
    const forbidden = await api.get(`${API_URL}/api/observability/vms/300/metrics`);
    expect(forbidden.status()).toBe(403);
  });

  test('per-VM metrics: unknown VMID returns 404', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const res = await api.get(`${API_URL}/api/observability/vms/999999/metrics`);
    expect(res.status()).toBe(404);
  });
});

test.describe('Phase 2 — User Observability (UI)', () => {
  test('manager visiting ws-alpha sees VM rows and no error card', async ({ page }) => {
    await page.goto('/workspaces/ws-alpha/observability?as=manager');
    await expect(page.getByRole('heading', { name: 'Workspace observability' })).toBeVisible();
    await expect(page.getByText('ws-alpha').first()).toBeVisible();
    await expect(page.getByTestId('error-card')).toHaveCount(0);
    // At least one VM row renders.
    const rows = page.locator('[data-testid^="vm-row-"]');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('manager visiting ws-gamma sees the forbidden error card, no VM rows', async ({ page }) => {
    await page.goto('/workspaces/ws-gamma/observability?as=manager');
    await expect(page.getByTestId('error-card')).toBeVisible();
    await expect(page.getByText('Not a member of ws-gamma')).toBeVisible();
    await expect(page.locator('[data-testid^="vm-row-"]')).toHaveCount(0);
  });

  test('admin visiting ws-gamma sees VM rows (no tier restriction)', async ({ page }) => {
    await page.goto('/workspaces/ws-gamma/observability?as=admin');
    await expect(page.getByTestId('error-card')).toHaveCount(0);
    const rows = page.locator('[data-testid^="vm-row-"]');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('page shows the set of accessible workspaces in the header', async ({ page }) => {
    await page.goto('/workspaces/ws-alpha/observability?as=manager');
    await expect(page.getByText('Accessible:')).toBeVisible();
    // Both of manager's workspaces should appear as links.
    await expect(page.getByRole('link', { name: 'ws-alpha' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ws-beta' })).toBeVisible();
  });
});
