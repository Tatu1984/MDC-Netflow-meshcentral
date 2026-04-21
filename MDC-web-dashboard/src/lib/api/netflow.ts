// NetFlow API client (Phase 6 thin slice).
// Server-side helpers used by server components in both dashboards.

const API_BASE_URL = process.env.MDC_API_URL || 'http://localhost:5080';
const DEV_API_KEY = process.env.MDC_DEV_API_KEY;

export interface FlowRecord {
  tsUtc: string;
  exporterId: string;
  observationPoint: string;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  protocol: number;
  bytes: number;
  packets: number;
  vmId?: number | null;
  workspaceId?: string | null;
  isPhysicalInterface: boolean;
}

export interface FlowResult {
  tier: string;
  records: FlowRecord[];
  totalAfterFilter: number;
}

export interface TopTalker {
  key: string;
  label: string;
  bytes: number;
  packets: number;
  flowCount: number;
}

export interface WorkspaceInterface {
  id: string;
  workspaceId: string;
  vmId: number;
  vmName: string;
  name: string;
  rxBytes: number;
  txBytes: number;
  flowCount: number;
}

export interface FlowExporter {
  id: string;
  displayName: string;
  sourceIp: string;
  homeCollector: string;
  lastSeenUtc: string;
  isEnabled: boolean;
}

function headers(apiKeyOverride?: string): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  const key = apiKeyOverride ?? DEV_API_KEY;
  if (key) h['X-API-Key'] = key;
  return h;
}

export type HttpError = { status: number; body: string };

async function get<T>(path: string, apiKeyOverride?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: headers(apiKeyOverride),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(new Error(`GET ${path} → ${res.status}`), { status: res.status, body: body.slice(0, 400) } satisfies HttpError);
  }
  return (await res.json()) as T;
}

export const fetchFlows            = (params: Record<string, string | number | boolean> = {}, k?: string) => {
  const qs = Object.entries(params).map(([k2, v]) => `${encodeURIComponent(k2)}=${encodeURIComponent(String(v))}`).join('&');
  return get<FlowResult>(`/api/flows${qs ? `?${qs}` : ''}`, k);
};
export const fetchTopTalkers       = (params: Record<string, string | number | boolean> = {}, k?: string) => {
  const qs = Object.entries(params).map(([k2, v]) => `${encodeURIComponent(k2)}=${encodeURIComponent(String(v))}`).join('&');
  return get<TopTalker[]>(`/api/flows/top-talkers${qs ? `?${qs}` : ''}`, k);
};
export const fetchWorkspaceIfaces  = (wsId: string, k?: string) =>
  get<WorkspaceInterface[]>(`/api/flows/workspaces/${encodeURIComponent(wsId)}/interfaces`, k);
export const fetchFlowsByVm        = (vmId: number, k?: string) => get<FlowResult>(`/api/flows/by-vm/${vmId}`, k);
export const fetchPhysicalFlows    = (k?: string) => get<FlowResult>('/api/flows/physical', k);
export const fetchFlowExporters    = (k?: string) => get<FlowExporter[]>('/api/flows/exporters', k);

export const PROTOCOL_NAMES: Record<number, string> = {
  1: 'ICMP',
  6: 'TCP',
  17: 'UDP',
};
