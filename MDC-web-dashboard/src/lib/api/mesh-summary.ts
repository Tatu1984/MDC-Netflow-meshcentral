// Server-side helpers for the user-facing MeshCentral remote-access page.

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

export interface WorkspaceVm {
  vmid: number;
  clusterId: string;
  workspaceId: string;
  metrics: { cpuPct: number; memPct: number };
}

export interface MyWorkspaces {
  tier: string;
  workspaceIds: string[];
}

function headers(apiKeyOverride?: string): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  const key = apiKeyOverride ?? DEV_API_KEY;
  if (key) h['X-API-Key'] = key;
  return h;
}

async function get<T>(path: string, apiKeyOverride?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: headers(apiKeyOverride),
    cache: 'no-store',
  });
  if (!res.ok) throw Object.assign(new Error(`GET ${path} → ${res.status}`), { status: res.status });
  return (await res.json()) as T;
}

export const fetchMyWorkspaces = (k?: string) => get<MyWorkspaces>('/api/observability/my-workspaces', k);

export const fetchWorkspaceVms = (wsId: string, k?: string) =>
  get<{ workspaceId: string; count: number; vms: WorkspaceVm[] }>(
    `/api/observability/workspaces/${encodeURIComponent(wsId)}/vms`,
    k,
  );

export const fetchMeshStatus = (vmid: number, k?: string) => get<MeshStatus>(`/api/mesh/vms/${vmid}/status`, k);
