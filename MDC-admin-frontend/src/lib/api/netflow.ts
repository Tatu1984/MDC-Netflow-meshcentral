// NetFlow API client for the admin console.
const API_BASE_URL = process.env.MDC_API_URL || process.env.NEXT_PUBLIC_MDC_API_URL || 'http://localhost:5080';
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

export interface FlowResult { tier: string; records: FlowRecord[]; totalAfterFilter: number; }
export interface TopTalker { key: string; label: string; bytes: number; packets: number; flowCount: number; }
export interface FlowExporter {
  id: string; displayName: string; sourceIp: string; homeCollector: string; lastSeenUtc: string; isEnabled: boolean;
}

function headers(): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (DEV_API_KEY) h['X-API-Key'] = DEV_API_KEY;
  return h;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(new Error(`GET ${path} → ${res.status}`), { status: res.status, body: body.slice(0, 400) });
  }
  return (await res.json()) as T;
}

export interface CollectorHealth {
  id: string;
  kind: string;
  displayName: string;
  reachable: boolean;
  recordCount: number;
  lastSeenUtc: string | null;
  coveredWorkspaces: string[];
}

export const fetchAllFlows    = (params: Record<string, string | number | boolean> = {}) => {
  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  return get<FlowResult>(`/api/flows${qs ? `?${qs}` : ''}`);
};
export const fetchPhysical    = () => get<FlowResult>('/api/flows/physical');
export const fetchExporters   = () => get<FlowExporter[]>('/api/flows/exporters');
export const fetchTop         = (n = 10, includePhysical = false) =>
  get<TopTalker[]>(`/api/flows/top-talkers?n=${n}&includePhysical=${includePhysical}`);
export const fetchCollectors  = () => get<CollectorHealth[]>('/api/flows/collectors');

export const PROTOCOL_NAMES: Record<number, string> = { 1: 'ICMP', 6: 'TCP', 17: 'UDP' };
