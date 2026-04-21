// Local-dev proxy: browser calls this route, it mints the session server-side
// using the dev API key (or MSAL Bearer later) and returns { url }. Keeps
// credentials off the client.

import { NextRequest, NextResponse } from 'next/server';
import { createMeshSession, MESH_DEV_KEYS } from '@/lib/api/mesh';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const vmidRaw = url.searchParams.get('vmid');
  const asKey = url.searchParams.get('as') ?? 'manager';
  const vmid = vmidRaw ? parseInt(vmidRaw, 10) : NaN;
  if (!Number.isFinite(vmid)) {
    return NextResponse.json({ error: 'missing vmid' }, { status: 400 });
  }
  const devKey = MESH_DEV_KEYS[asKey];
  const result = await createMeshSession(vmid, devKey);
  switch (result.kind) {
    case 'ok':                   return NextResponse.json(result.data, { status: 200 });
    case 'vm-not-found':         return NextResponse.json({ kind: result.kind }, { status: 404 });
    case 'forbidden':            return NextResponse.json({ kind: result.kind, workspaceId: result.workspaceId }, { status: 403 });
    case 'agent-not-enrolled':
    case 'agent-offline':        return NextResponse.json({ kind: result.kind, fallback: 'vnc' }, { status: 503 });
    case 'unauthorized':         return NextResponse.json({ kind: result.kind }, { status: 401 });
    default:                     return NextResponse.json({ kind: 'error' }, { status: 500 });
  }
}
