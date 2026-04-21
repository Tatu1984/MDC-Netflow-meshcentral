import { test, expect, request } from '@playwright/test';

/**
 * Phase 5 audit — User Remote Connect UI + agent enrollment automation.
 *
 * Exit criterion: newly created VMs auto-enrol and are reachable from the
 * browser without manual steps.
 *
 * In production, cloud-init injected at VM creation installs the MeshCentral
 * agent which self-registers. In this local-mock audit, a BackgroundService
 * plays the agent's role and registers the device on the mock MeshCentral
 * stand-in as soon as a new VM appears in the inventory.
 *
 * The flow proved here:
 *   1. POST /api/mock-vms creates a new VM in a workspace.
 *   2. Enrollment reconciler fires inline; response shows `enroled: 1`.
 *   3. Mesh status endpoint reports the new VMID as enrolled + online.
 *   4. POST /api/mesh/vms/{vmid}/session mints a signed URL.
 *   5. The URL redeems at the mock Mesh web endpoint and shows the node id.
 *   6. The dashboard VM detail page for the new vmid renders Remote Connect
 *      enabled — no manual intervention between create and connect.
 */

const API_URL = process.env.MDC_API_URL ?? 'http://localhost:5080';
const ADMIN_KEY = 'test-admin-key-12345';
const MANAGER_KEY = 'test-manager-key-12345'; // ws-alpha + ws-beta

async function createMockVm(workspaceId: string, apiKey = ADMIN_KEY): Promise<{ vmid: number; workspaceId: string }> {
  const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' } });
  const res = await api.post(`${API_URL}/api/mock-vms`, { data: { workspaceId } });
  if (res.status() !== 200) throw new Error(`mock-vms create failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

test.describe('Phase 5 — Auto-enrollment (API)', () => {
  test('creating a VM auto-enrols it and the VM becomes immediately reachable', async () => {
    const created = await createMockVm('ws-alpha');
    expect(created.vmid).toBeGreaterThanOrEqual(9000);
    expect(created.workspaceId).toBe('ws-alpha');

    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });

    // Status — enrolled + online, no waiting needed (reconciler ran inline on create).
    const status = await (await api.get(`${API_URL}/api/mesh/vms/${created.vmid}/status`)).json();
    expect(status).toMatchObject({
      vmid: created.vmid,
      enrolled: true,
      online: true,
      nodeId: `mesh-n-${created.vmid}`,
    });

    // Session — mintable and returns a URL that redeems successfully.
    const mintRes = await api.post(`${API_URL}/api/mesh/vms/${created.vmid}/session`);
    expect(mintRes.status()).toBe(200);
    const ticket = await mintRes.json();
    expect(ticket.url).toContain('/mock-mesh/session/');

    const raw = await request.newContext();
    const redeemed = await raw.get(`${API_URL}${ticket.url}`);
    expect(redeemed.status()).toBe(200);
    const html = await redeemed.text();
    expect(html).toContain('Remote Desktop Session Active');
    expect(html).toContain(ticket.nodeId);
  });

  test('create VM in a different workspace — enrolment map uses the right group', async () => {
    const created = await createMockVm('ws-beta');
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY } });
    const devices = await (await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } })).get(`${API_URL}/api/mesh/devices`);
    const list = await devices.json() as Array<{ nodeId: string; groupId: string }>;
    const theOne = list.find((d) => d.nodeId === `mesh-n-${created.vmid}`);
    expect(theOne, `device for vmid ${created.vmid} not in list`).toBeTruthy();
    expect(theOne!.groupId).toBe('ws-beta');

    const status = await (await api.get(`${API_URL}/api/mesh/vms/${created.vmid}/status`)).json();
    expect(status.enrolled).toBe(true);
    expect(status.online).toBe(true);
  });

  test('cloud-init preview returns valid YAML pointing at the Mesh group', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const res = await api.get(`${API_URL}/api/mesh/cloud-init-preview?workspaceId=ws-alpha&vmid=9999`);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/^#cloud-config/);
    expect(body).toContain('workspace ws-alpha');
    expect(body).toContain('vmid 9999');
    expect(body).toContain('mdc-ws-ws-alpha');
  });

  test('manual reconcile endpoint returns a typed report', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': ADMIN_KEY } });
    const res = await api.post(`${API_URL}/api/mesh/reconcile`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('drifted');
    expect(body).toHaveProperty('enroled');
    expect(body).toHaveProperty('orphaned');
  });

  test('unauthenticated mock-vms create is 401', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'Content-Type': 'application/json' } });
    const res = await api.post(`${API_URL}/api/mock-vms`, { data: { workspaceId: 'ws-alpha' } });
    expect(res.status()).toBe(401);
  });

  test('non-admin mock-vms create is 403', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'X-API-Key': MANAGER_KEY, 'Content-Type': 'application/json' } });
    const res = await api.post(`${API_URL}/api/mock-vms`, { data: { workspaceId: 'ws-alpha' } });
    expect(res.status()).toBe(403);
  });
});

test.describe('Phase 5 — Auto-enrollment (UI: Remote Connect works on a fresh VM)', () => {
  test('newly created VM is reachable from the dashboard VM detail page without manual steps', async ({ page, context }) => {
    // Step 1: create a fresh VM end-to-end via the same admin path a UI would use.
    const created = await createMockVm('ws-alpha');

    // Step 2: visit the VM detail page. Because the reconciler ran on create,
    // the agent should already show online and the button should be enabled.
    await page.goto(`/vms/${created.vmid}?as=manager`);

    // Agent badge reports online without a refresh.
    await expect(page.getByTestId('agent-badge')).toHaveText('online');

    // Remote Connect button is enabled; clicking it mints a URL and renders it.
    const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await expect(page.getByTestId('remote-connect-btn')).toBeEnabled();
    await page.getByTestId('remote-connect-btn').click();

    const link = page.getByTestId('remote-connect-url');
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toContain('/mock-mesh/session/');

    // The mock Mesh page loads in the popup (or fall back to same-page nav).
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded');
      await expect(popup.getByTestId('mesh-session-heading')).toBeVisible();
    } else {
      await page.goto(href!);
      await expect(page.getByTestId('mesh-session-heading')).toBeVisible();
    }
  });
});
