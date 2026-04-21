// VM detail (Phase 4). Shows the two remote-access options side by side:
// MeshCentral "Remote Connect" (agent-based, in-guest), and the existing VNC
// console (hypervisor-level). Both paths coexist; neither replaces the other.
//
// Server component renders status server-side; a small client island handles
// the Remote Connect click. Local-dev honours `?as=admin|manager|technician`.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMeshStatus, MESH_DEV_KEYS, type MeshStatus } from "@/lib/api/mesh";
import { RemoteConnectButton } from "./remote-connect-button";

export const dynamic = "force-dynamic";

type Props = { params: { vmid: string }; searchParams?: { as?: string } };

export default async function VmDetailPage({ params, searchParams }: Props) {
  const vmid = parseInt(params.vmid, 10);
  const asKey = searchParams?.as;
  const devKey = asKey ? MESH_DEV_KEYS[asKey] : undefined;

  let status: MeshStatus | null = null;
  let statusError: string | null = null;
  try {
    status = await getMeshStatus(vmid, devKey);
  } catch (e) {
    statusError = e instanceof Error ? e.message : String(e);
  }

  const agentBadge = status
    ? status.enrolled
      ? status.online
        ? <Badge variant="default" data-testid="agent-badge">online</Badge>
        : <Badge variant="destructive" data-testid="agent-badge">offline</Badge>
      : <Badge variant="secondary" data-testid="agent-badge">not enrolled</Badge>
    : <Badge variant="outline" data-testid="agent-badge">unknown</Badge>;

  return (
    <div className="p-6 space-y-6" data-testid="vm-detail-page">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">VM {vmid}</h1>
          <p className="text-sm text-muted-foreground">
            MeshCentral agent: {agentBadge}
            {asKey ? <> · acting as <Badge variant="secondary">{asKey}</Badge></> : null}
          </p>
        </div>
      </div>

      {statusError && (
        <Card className="border-destructive"><CardHeader><CardTitle>Status unavailable</CardTitle><CardDescription>{statusError}</CardDescription></CardHeader></Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card data-testid="remote-connect-card">
          <CardHeader>
            <CardTitle>Remote Connect (MeshCentral)</CardTitle>
            <CardDescription>In-guest desktop / terminal / file transfer. Requires a live agent on the VM.</CardDescription>
          </CardHeader>
          <CardContent>
            <RemoteConnectButton vmid={vmid} asKey={asKey} status={status} />
          </CardContent>
        </Card>

        <Card data-testid="vnc-card">
          <CardHeader>
            <CardTitle>Console (VNC)</CardTitle>
            <CardDescription>Hypervisor-level console via the existing Proxmox VNC WebSocket relay. Works even without an in-guest agent.</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href={`/console/vm/${vmid}`}
              data-testid="vnc-link"
              className="inline-flex items-center rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
            >
              Open VNC console
            </a>
            <p className="text-xs text-muted-foreground mt-2">Both options remain available. Neither replaces the other.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
