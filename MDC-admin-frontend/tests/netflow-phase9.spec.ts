import { test, expect, request } from '@playwright/test';

/**
 * Phase 9 audit — Edge NetFlow collector + central federation.
 *
 * Exit criterion: at least one edge collector registered at a site, queryable
 * transparently via the central /api/flows endpoint. Admin UI shows per-
 * collector health; tier filtering still holds when records originate from
 * multiple collectors.
 */

const API_URL = process.env.MDC_API_URL ?? 'http://localhost:5080';
const ADMIN_KEY = 'test-admin-key-12345';
const MANAGER_KEY = 'test-manager-key-12345';

test.describe('Phase 9 — Federation (API)', () => {
  test('/api/flows/collectors lists central + two edge collectors', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const res = await api.get(`${API_URL}/api/flows/collectors`);
    expect(res.status()).toBe(200);
    const list = await res.json();
    const ids = list.map((c: { id: string }) => c.id).sort();
    expect(ids).toEqual(['central', 'edge-beta', 'edge-gamma']);
    const byKind = list.reduce((acc: Record<string, number>, c: { kind: string }) => {
      acc[c.kind] = (acc[c.kind] ?? 0) + 1; return acc;
    }, {});
    expect(byKind.central).toBe(1);
    expect(byKind.edge).toBe(2);
    // Every collector is reachable in a nominal run.
    for (const c of list as Array<{ reachable: boolean; recordCount: number }>) {
      expect(c.reachable).toBe(true);
      expect(c.recordCount).toBeGreaterThan(0);
    }
  });

  test('admin sees merged records from all three collectors', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const body = await (await api.get(`${API_URL}/api/flows?take=500&includePhysical=true`)).json();
    const exporters = new Set((body.records as Array<{ exporterId: string }>).map((r) => r.exporterId));
    // Central contributes alpha-vsw + alpha-tor; edges contribute beta-vsw + gamma-vsw.
    expect(exporters.has('exp-alpha-vsw')).toBe(true);
    expect(exporters.has('exp-alpha-tor')).toBe(true);
    expect(exporters.has('exp-beta-vsw')).toBe(true);
    expect(exporters.has('exp-gamma-vsw')).toBe(true);
  });

  test('exporter inventory aggregates across collectors', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const list = await (await api.get(`${API_URL}/api/flows/exporters`)).json() as Array<{ id: string; homeCollector: string }>;
    const ids = list.map((e) => e.id).sort();
    expect(ids).toEqual(['exp-alpha-tor', 'exp-alpha-vsw', 'exp-beta-vsw', 'exp-gamma-vsw']);
    // Home collector column is correctly propagated through the federation.
    expect(list.find((e) => e.id === 'exp-beta-vsw')?.homeCollector).toBe('edge-beta');
    expect(list.find((e) => e.id === 'exp-gamma-vsw')?.homeCollector).toBe('edge-gamma');
  });

  test('tier filter still strictly scopes the federated view', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const body = await (await api.get(`${API_URL}/api/flows?take=500`)).json();
    const wsSet = new Set((body.records as Array<{ workspaceId: string | null; isPhysicalInterface: boolean }>).map((r) => r.workspaceId));
    expect(Array.from(wsSet).sort()).toEqual(['ws-alpha', 'ws-beta']);
    // No physical records and no ws-gamma — even though they exist in other collectors.
    for (const r of body.records as Array<{ isPhysicalInterface: boolean; workspaceId: string }>) {
      expect(r.isPhysicalInterface).toBe(false);
      expect(r.workspaceId).not.toBe('ws-gamma');
    }
  });

  test('non-admin is rejected on /collectors', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const res = await api.get(`${API_URL}/api/flows/collectors`);
    expect(res.status()).toBe(403);
  });
});

test.describe('Phase 9 — Federation (UI)', () => {
  test('admin Collectors page lists every federated source with its health', async ({ page }) => {
    await page.goto('/netflow/collectors');
    await expect(page.getByTestId('netflow-collectors')).toBeVisible();
    await expect(page.getByTestId('collector-row-central')).toBeVisible();
    await expect(page.getByTestId('collector-row-edge-beta')).toBeVisible();
    await expect(page.getByTestId('collector-row-edge-gamma')).toBeVisible();
    // Reachable column shows "yes" in nominal mode.
    await expect(page.getByTestId('collector-row-central')).toContainText('yes');
  });

  test('Collectors tab is reachable from the NetFlow nav', async ({ page }) => {
    await page.goto('/netflow');
    await page.getByRole('link', { name: 'Collectors' }).click();
    await expect(page).toHaveURL(/\/netflow\/collectors$/);
    await expect(page.getByTestId('netflow-collectors')).toBeVisible();
  });
});
