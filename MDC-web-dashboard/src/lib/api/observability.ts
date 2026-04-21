// Observability API client (Phase 1 thin slice).
// Server-side helper — reads MDC_API_URL and MDC_DEV_API_KEY from the Next.js
// runtime env. For production the API key is replaced by the caller's MSAL
// Bearer token; the server-side proxy pattern is kept so secrets never reach
// the browser.

const API_BASE_URL = process.env.MDC_API_URL || 'http://localhost:5080';
const DEV_API_KEY = process.env.MDC_DEV_API_KEY;

export interface PdmCluster {
  id: string;
  name: string;
  quorumState: string;
  nodeCount: number;
  vmCount: number;
  cpuUsedPct: number;
  memUsedPct: number;
}

export interface PdmNode {
  id: string;
  clusterId: string;
  name: string;
  status: string;
  vmCount: number;
  cpuPct: number;
  memPct: number;
  uptimeSec: number;
}

export interface PdmEvent {
  tsUtc: string;
  clusterId: string;
  nodeId: string | null;
  kind: string;
  message: string;
}

export interface ObservabilityStatus {
  reachable: boolean;
  mode: 'mock' | 'live';
  metricsCacheSeconds: number;
  inventoryCacheSeconds: number;
  serverTimeUtc: string;
}

export interface VmMetrics {
  tsUtc: string;
  cpuPct: number;
  memPct: number;
  diskReadBps: number;
  diskWriteBps: number;
  netRxBps: number;
  netTxBps: number;
}

export interface VmSummary {
  vmid: number;
  clusterId: string;
  workspaceId: string;
  metrics: VmMetrics;
}

export interface WorkspaceVmsResponse {
  workspaceId: string;
  count: number;
  vms: VmSummary[];
}

export interface MyWorkspacesResponse {
  tier: 'admin' | 'workspace';
  workspaceIds: string[];
}

function headers(bearer?: string, apiKeyOverride?: string): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (bearer) {
    h.Authorization = `Bearer ${bearer}`;
  } else if (apiKeyOverride ?? DEV_API_KEY) {
    h['X-API-Key'] = (apiKeyOverride ?? DEV_API_KEY) as string;
  }
  return h;
}

export type HttpError = { status: number; body: string };

async function get<T>(path: string, bearer?: string, apiKeyOverride?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: headers(bearer, apiKeyOverride),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err: HttpError = { status: res.status, body: body.slice(0, 400) };
    throw Object.assign(new Error(`GET ${path} → ${res.status}`), err);
  }
  return (await res.json()) as T;
}

export function fetchStatus(bearer?: string) {
  return get<ObservabilityStatus>('/api/observability/status', bearer);
}

export function fetchFleet(bearer?: string) {
  return get<PdmCluster[]>('/api/observability/fleet', bearer);
}

export function fetchNodes(clusterId: string, bearer?: string) {
  return get<PdmNode[]>(`/api/observability/clusters/${encodeURIComponent(clusterId)}/nodes`, bearer);
}

export function fetchEvents(take = 20, bearer?: string) {
  return get<PdmEvent[]>(`/api/observability/events?take=${take}`, bearer);
}

export function fetchMyWorkspaces(bearer?: string, apiKeyOverride?: string) {
  return get<MyWorkspacesResponse>('/api/observability/my-workspaces', bearer, apiKeyOverride);
}

export function fetchWorkspaceVms(wsId: string, bearer?: string, apiKeyOverride?: string) {
  return get<WorkspaceVmsResponse>(
    `/api/observability/workspaces/${encodeURIComponent(wsId)}/vms`,
    bearer,
    apiKeyOverride,
  );
}

export function fetchVmMetrics(vmid: number, bearer?: string, apiKeyOverride?: string) {
  return get<VmSummary>(`/api/observability/vms/${vmid}/metrics`, bearer, apiKeyOverride);
}
