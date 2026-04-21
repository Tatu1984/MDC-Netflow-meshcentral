import { test, expect, request } from '@playwright/test';

/**
 * Phase 4 audit — MeshCentral trust-broker thin slice.
 *
 * Exit criterion: one enrolled VM is reachable via the "Remote Connect" button
 * from the dashboard, shown alongside the existing VNC option (both paths
 * coexist).
 *
 * Tests assert that data flows end-to-end: the session URL rendered in the UI
 * redeems against the backend's mock MeshCentral endpoint and returns a live
 * HTML page containing the real node id minted for this particular session.
 */

const API_URL = process.env.MDC_API_URL ?? 'http://localhost:5080';
const ADMIN_KEY = 'test-admin-key-12345';
const MANAGER_KEY = 'test-manager-key-12345';      // ws-alpha, ws-beta
const TECHNICIAN_KEY = 'test-technician-key-67890'; // ws-beta only

test.describe('Phase 4 — MeshCentral (API)', () => {
  test('manager can mint a session for a VM in their workspace (vm 100)', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const res = await api.post(`${API_URL}/api/mesh/vms/100/session`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      nodeId: 'mesh-n-100',
      workspaceId: 'ws-alpha',
      token: expect.any(String),
      url: expect.stringContaining('/mock-mesh/session/'),
    });
    // Ticket must expire in the future.
    expect(Date.parse(body.expiresAtUtc)).toBeGreaterThan(Date.now());
  });

  test('redeeming a minted ticket returns a live HTML page with the node id', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const mint = await (await api.post(`${API_URL}/api/mesh/vms/100/session`)).json() as { url: string; nodeId: string };
    const raw = await request.newContext();
    const res = await raw.get(`${API_URL}${mint.url}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('Remote Desktop Session Active');
    expect(html).toContain(mint.nodeId);
  });

  test('redeeming an unknown ticket returns 404', async () => {
    const raw = await request.newContext();
    const res = await raw.get(`${API_URL}/mock-mesh/session/00000000000000000000000000000000`);
    expect(res.status()).toBe(404);
  });

  test('manager is 403 when minting a session for a VM outside their workspaces (vm 300)', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const res = await api.post(`${API_URL}/api/mesh/vms/300/session`);
    expect(res.status()).toBe(403);
  });

  test('vm with offline agent returns 503 with vnc fallback (vm 102)', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const res = await api.post(`${API_URL}/api/mesh/vms/102/session`);
    expect(res.status()).toBe(503);
    const body = await res.json();
    expect(body.fallback).toBe('vnc');
    expect(body.error).toMatch(/offline/);
  });

  test('vm without a mesh link returns 503 agent-not-enrolled (vm 103)', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const res = await api.post(`${API_URL}/api/mesh/vms/103/session`);
    expect(res.status()).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/not enrolled/);
  });

  test('unknown vmid returns 404', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const res = await api.post(`${API_URL}/api/mesh/vms/999999/session`);
    expect(res.status()).toBe(404);
  });

  test('unauthenticated mint is 401', async () => {
    const api = await request.newContext();
    const res = await api.post(`${API_URL}/api/mesh/vms/100/session`);
    expect(res.status()).toBe(401);
  });

  test('technician can mint in ws-beta (vm 200) but not ws-alpha (vm 100)', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': TECHNICIAN_KEY } });
    const allowed = await api.post(`${API_URL}/api/mesh/vms/200/session`);
    expect(allowed.status()).toBe(200);
    const forbidden = await api.post(`${API_URL}/api/mesh/vms/100/session`);
    expect(forbidden.status()).toBe(403);
  });

  test('status endpoint reports enrolment + online state for vm 100 and 102', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const online = await (await api.get(`${API_URL}/api/mesh/vms/100/status`)).json();
    expect(online).toMatchObject({ vmid: 100, enrolled: true, online: true, nodeId: 'mesh-n-100' });
    const offline = await (await api.get(`${API_URL}/api/mesh/vms/102/status`)).json();
    expect(offline).toMatchObject({ vmid: 102, enrolled: true, online: false });
    const missing = await (await api.get(`${API_URL}/api/mesh/vms/103/status`)).json();
    expect(missing).toMatchObject({ vmid: 103, enrolled: false, online: false });
  });

  test('admin can list all mesh devices', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const res = await api.get(`${API_URL}/api/mesh/devices`);
    expect(res.status()).toBe(200);
    const devices = await res.json();
    expect(devices.length).toBeGreaterThanOrEqual(4);
    expect(devices.find((d: { nodeId: string }) => d.nodeId === 'mesh-n-100')).toBeTruthy();
  });
});

test.describe('Phase 4 — MeshCentral (UI)', () => {
  test('VM detail shows both Remote Connect and VNC cards side by side', async ({ page }) => {
    await page.goto('/vms/100?as=manager');
    await expect(page.getByTestId('vm-detail-page')).toBeVisible();
    await expect(page.getByTestId('remote-connect-card')).toBeVisible();
    await expect(page.getByTestId('vnc-card')).toBeVisible();
    await expect(page.getByTestId('vnc-link')).toHaveAttribute('href', '/console/vm/100');
  });

  test('Remote Connect button is enabled and, when clicked, renders the minted mesh URL', async ({ page, context }) => {
    // Capture popups so the test doesn't depend on window open working in headless.
    const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await page.goto('/vms/100?as=manager');
    await expect(page.getByTestId('agent-badge')).toHaveText('online');
    await expect(page.getByTestId('remote-connect-btn')).toBeEnabled();
    await page.getByTestId('remote-connect-btn').click();
    // Session URL is rendered in the page (deterministic assertion).
    const link = page.getByTestId('remote-connect-url');
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toContain('/mock-mesh/session/');

    // The popup (or tab) opens the mesh page. Either happens — we just need one.
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded');
      await expect(popup.getByTestId('mesh-session-heading')).toBeVisible();
    } else {
      // Fall back: navigate directly in the same page to prove the URL is live.
      await page.goto(href!);
      await expect(page.getByTestId('mesh-session-heading')).toBeVisible();
    }
  });

  test('Offline agent (vm 102): button disabled, reason shown, VNC fallback advertised', async ({ page }) => {
    await page.goto('/vms/102?as=manager');
    await expect(page.getByTestId('agent-badge')).toHaveText('offline');
    await expect(page.getByTestId('remote-connect-btn')).toBeDisabled();
    await expect(page.getByTestId('remote-connect-reason')).toContainText(/offline/);
    await expect(page.getByTestId('vnc-link')).toBeVisible();
  });

  test('Un-enrolled VM (vm 103): button disabled, "not enrolled" badge, VNC still present', async ({ page }) => {
    await page.goto('/vms/103?as=manager');
    await expect(page.getByTestId('agent-badge')).toHaveText('not enrolled');
    await expect(page.getByTestId('remote-connect-btn')).toBeDisabled();
    await expect(page.getByTestId('vnc-link')).toBeVisible();
  });

  test('Forbidden tier (manager on vm 300 in ws-gamma): click surfaces an error, VNC still present', async ({ page }) => {
    await page.goto('/vms/300?as=manager');
    // Status endpoint for vm 300 returns online (it exists in Mesh) but mint will be forbidden by tier.
    await expect(page.getByTestId('remote-connect-btn')).toBeEnabled();
    await page.getByTestId('remote-connect-btn').click();
    await expect(page.getByTestId('remote-connect-error')).toContainText(/forbidden/);
    await expect(page.getByTestId('vnc-link')).toBeVisible();
  });
});
