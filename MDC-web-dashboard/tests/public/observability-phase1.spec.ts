import { test, expect, request } from '@playwright/test';

/**
 * Phase 1 audit — PDM Observability thin slice.
 *
 * Verifies backend + frontend wiring end-to-end against the local mock PDM.
 * Exit criteria:
 *   - GET /api/observability/status returns { reachable: true, mode: "mock" }.
 *   - GET /api/observability/fleet returns the expected 3 mock clusters, admin-gated.
 *   - Unauthenticated fleet request returns 401.
 *   - Frontend /observability page renders cluster names and quorum badges.
 *
 * Assumes:
 *   - Backend is running on MDC_API_URL (default http://localhost:5080) with
 *     API_KEYS_ENABLED=true and the test-admin-key-12345 from appsettings.json.
 *   - Frontend is running on http://localhost:3000 (Playwright webServer config).
 */

const API_URL = process.env.MDC_API_URL ?? 'http://localhost:5080';
const ADMIN_KEY = 'test-admin-key-12345';

test.describe('Phase 1 — PDM Observability thin slice (API)', () => {
  test('status endpoint reports reachable + mock mode', async () => {
    const api = await request.newContext();
    const res = await api.get(`${API_URL}/api/observability/status`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.reachable).toBe(true);
    expect(body.mode).toBe('mock');
    expect(body.metricsCacheSeconds).toBeGreaterThan(0);
    expect(body.inventoryCacheSeconds).toBeGreaterThan(0);
  });

  test('fleet returns three clusters with expected shape (admin-gated)', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const res = await api.get(`${API_URL}/api/observability/fleet`);
    expect(res.status()).toBe(200);
    const clusters = await res.json();
    expect(Array.isArray(clusters)).toBe(true);
    expect(clusters.length).toBe(3);
    const ids = clusters.map((c: { id: string }) => c.id).sort();
    expect(ids).toEqual(['cluster-alpha', 'cluster-beta', 'cluster-gamma']);
    // Shape check
    const alpha = clusters.find((c: { id: string }) => c.id === 'cluster-alpha');
    expect(alpha).toMatchObject({
      name: 'Alpha (HQ)',
      quorumState: 'quorate',
      nodeCount: 3,
    });
    const gamma = clusters.find((c: { id: string }) => c.id === 'cluster-gamma');
    expect(gamma?.quorumState).toBe('degraded');
  });

  test('fleet rejects unauthenticated callers with 401', async () => {
    const api = await request.newContext();
    const res = await api.get(`${API_URL}/api/observability/fleet`);
    expect(res.status()).toBe(401);
  });

  test('nodes endpoint returns per-cluster host list', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const res = await api.get(`${API_URL}/api/observability/clusters/cluster-alpha/nodes`);
    expect(res.status()).toBe(200);
    const nodes = await res.json();
    expect(nodes.length).toBe(3);
    expect(nodes[0]).toHaveProperty('clusterId', 'cluster-alpha');
  });

  test('events endpoint returns recent events', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const res = await api.get(`${API_URL}/api/observability/events?take=5`);
    expect(res.status()).toBe(200);
    const events = await res.json();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeLessThanOrEqual(5);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty('kind');
  });
});

test.describe('Phase 1 — PDM Observability thin slice (UI)', () => {
  test('page renders heading and server-time chip', async ({ page }) => {
    await page.goto('/observability');
    await expect(page.getByRole('heading', { name: 'Observability' })).toBeVisible();
    await expect(page.getByText('Mode:')).toBeVisible();
    await expect(page.getByText('mock', { exact: false })).toBeVisible();
  });

  test('fleet table lists three mock clusters with correct quorum badges', async ({ page }) => {
    await page.goto('/observability');
    // Cluster display names are unique across the page.
    await expect(page.getByText('Alpha (HQ)')).toBeVisible();
    await expect(page.getByText('Beta (Edge 1)')).toBeVisible();
    await expect(page.getByText('Gamma (Edge 2)')).toBeVisible();

    // Cluster IDs also appear in the events table, so scope to the first match.
    await expect(page.getByText('cluster-alpha').first()).toBeVisible();
    await expect(page.getByText('cluster-beta').first()).toBeVisible();
    await expect(page.getByText('cluster-gamma').first()).toBeVisible();

    // Both quorum states render at least once.
    await expect(page.getByText('quorate').first()).toBeVisible();
    await expect(page.getByText('degraded')).toBeVisible();
  });

  test('events section is present with at least one known event kind', async ({ page }) => {
    await page.goto('/observability');
    // Radix CardTitle renders as a div, not a <h*>, so assert by text.
    await expect(page.getByText('Recent events')).toBeVisible();
    // One of the known mock event kinds should appear.
    await expect(
      page.getByText(/node\.offline|vm\.started|migration|quorum\.ok/).first()
    ).toBeVisible();
  });

  test('no "Backend unreachable" error card is shown on the happy path', async ({ page }) => {
    await page.goto('/observability');
    await expect(page.getByText('Backend unreachable')).toHaveCount(0);
  });
});
