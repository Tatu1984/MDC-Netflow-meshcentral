// MeshCentral admin API client.
const API_BASE_URL = process.env.MDC_API_URL || process.env.NEXT_PUBLIC_MDC_API_URL || 'http://localhost:5080';
const DEV_API_KEY = process.env.MDC_DEV_API_KEY;

export interface MeshDevice {
  nodeId: string;
  groupId: string;
  name: string;
  online: boolean;
  agentVersion: string;
  lastSeenUtc: string;
}

export interface ReconcileReport { drifted: number; enroled: number; orphaned: number; }

function headers(): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (DEV_API_KEY) h['X-API-Key'] = DEV_API_KEY;
  return h;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) }, cache: 'no-store' });
  if (!res.ok) throw Object.assign(new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}`), { status: res.status });
  return (await res.json()) as T;
}

export const fetchMeshDevices = () => req<MeshDevice[]>('/api/mesh/devices');
export const runReconcile      = () => req<ReconcileReport>('/api/mesh/reconcile', { method: 'POST' });
