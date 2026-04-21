// Observability API client (Phase 3 — admin console).
// Server-side helper. Reads MDC_API_URL and MDC_DEV_API_KEY from the Next.js
// runtime env. Under production the caller's MSAL Bearer token replaces the
// dev key; the same module is reused.

const API_BASE_URL = process.env.MDC_API_URL || process.env.NEXT_PUBLIC_MDC_API_URL || 'http://localhost:5080';
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

export interface PdmVm {
  vmid: number;
  nodeId: string;
  clusterId: string;
  name: string;
  status: string;
}

export interface PdmMetricsSample {
  tsUtc: string;
  cpuPct: number;
  memPct: number;
  diskReadBps: number;
  diskWriteBps: number;
  netRxBps: number;
  netTxBps: number;
}

export interface PdmEvent {
  tsUtc: string;
  clusterId: string;
  nodeId: string | null;
  kind: string;
  message: string;
}

export interface PdmStoragePool {
  id: string;
  clusterId: string;
  name: string;
  kind: string;
  health: string;
  totalBytes: number;
  usedBytes: number;
}

export interface ObservabilityStatus {
  reachable: boolean;
  mode: 'mock' | 'live';
  metricsCacheSeconds: number;
  inventoryCacheSeconds: number;
  serverTimeUtc: string;
}

export type HttpError = { status: number; body: string };

function headers(bearer?: string, apiKeyOverride?: string): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (bearer) {
    h.Authorization = `Bearer ${bearer}`;
  } else if (apiKeyOverride ?? DEV_API_KEY) {
    h['X-API-Key'] = (apiKeyOverride ?? DEV_API_KEY) as string;
  }
  return h;
}

async function get<T>(path: string, bearer?: string, apiKeyOverride?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: headers(bearer, apiKeyOverride),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(new Error(`GET ${path} → ${res.status}`), { status: res.status, body: body.slice(0, 400) } satisfies HttpError);
  }
  return (await res.json()) as T;
}

export const fetchStatus  = (b?: string, k?: string) => get<ObservabilityStatus>('/api/observability/status', b, k);
export const fetchFleet   = (b?: string, k?: string) => get<PdmCluster[]>('/api/observability/fleet', b, k);
export const fetchNodes   = (cid: string, b?: string, k?: string) => get<PdmNode[]>(`/api/observability/clusters/${encodeURIComponent(cid)}/nodes`, b, k);
export const fetchVms     = (cid: string, b?: string, k?: string) => get<PdmVm[]>(`/api/observability/clusters/${encodeURIComponent(cid)}/vms`, b, k);
export const fetchEvents  = (take = 20, b?: string, k?: string) => get<PdmEvent[]>(`/api/observability/events?take=${take}`, b, k);
export const fetchStorage = (b?: string, k?: string) => get<PdmStoragePool[]>('/api/observability/storage', b, k);
