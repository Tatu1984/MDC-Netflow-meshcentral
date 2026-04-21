// MeshCentral trust-broker client (Phase 4 thin slice).
// Server-side helpers. Credentials stay on the server; the browser only ever
// receives the short-lived MeshCentral URL.

const API_BASE_URL = process.env.MDC_API_URL || 'http://localhost:5080';
const DEV_API_KEY = process.env.MDC_DEV_API_KEY;

export interface MeshStatus {
  vmid: number;
  enrolled: boolean;
  online: boolean;
  nodeId?: string;
  agentVersion?: string;
  lastSeenUtc?: string;
}

export interface MeshSessionSuccess {
  url: string;
  token: string;
  expiresAtUtc: string;
  nodeId: string;
  workspaceId: string;
}

export type MeshSessionResult =
  | { kind: 'ok'; data: MeshSessionSuccess }
  | { kind: 'vm-not-found' }
  | { kind: 'forbidden'; workspaceId?: string }
  | { kind: 'agent-not-enrolled' }
  | { kind: 'agent-offline' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; status: number; body: string };

function headers(apiKeyOverride?: string): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  const key = apiKeyOverride ?? DEV_API_KEY;
  if (key) h['X-API-Key'] = key;
  return h;
}

function absolutize(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  // The mock backend returns a relative /mock-mesh/... URL; make it absolute
  // for the browser to open directly.
  return `${API_BASE_URL}${url}`;
}

export async function getMeshStatus(vmid: number, apiKeyOverride?: string): Promise<MeshStatus> {
  const res = await fetch(`${API_BASE_URL}/api/mesh/vms/${vmid}/status`, {
    headers: headers(apiKeyOverride),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw Object.assign(new Error(`status ${res.status}`), { status: res.status });
  }
  return res.json() as Promise<MeshStatus>;
}

export async function createMeshSession(vmid: number, apiKeyOverride?: string): Promise<MeshSessionResult> {
  const res = await fetch(`${API_BASE_URL}/api/mesh/vms/${vmid}/session`, {
    method: 'POST',
    headers: headers(apiKeyOverride),
    cache: 'no-store',
  });
  if (res.status === 401) return { kind: 'unauthorized' };
  if (res.status === 404) return { kind: 'vm-not-found' };
  const body = await res.text();
  if (res.status === 403) {
    try {
      const j = JSON.parse(body);
      return { kind: 'forbidden', workspaceId: j?.workspaceId };
    } catch {
      return { kind: 'forbidden' };
    }
  }
  if (res.status === 503) {
    try {
      const j = JSON.parse(body);
      return { kind: j?.error?.includes('offline') ? 'agent-offline' : 'agent-not-enrolled' };
    } catch {
      return { kind: 'agent-not-enrolled' };
    }
  }
  if (!res.ok) return { kind: 'error', status: res.status, body };
  try {
    const j = JSON.parse(body) as MeshSessionSuccess;
    return { kind: 'ok', data: { ...j, url: absolutize(j.url) } };
  } catch {
    return { kind: 'error', status: res.status, body };
  }
}

export const MESH_DEV_KEYS: Record<string, string | undefined> = {
  admin:      'test-admin-key-12345',
  manager:    'test-manager-key-12345',
  technician: 'test-technician-key-67890',
};
