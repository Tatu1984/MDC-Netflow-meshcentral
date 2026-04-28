// User-facing MeshCentral dashboard.
// Shows every VM in the caller's workspaces with its MeshCentral agent state
// and a direct link into /vms/[vmid] for Remote Connect.

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchMyWorkspaces, fetchWorkspaceVms, fetchMeshStatus, type MeshStatus, type WorkspaceVm } from "@/lib/api/mesh-summary";

export const dynamic = "force-dynamic";

const DEV_KEYS: Record<string, string | undefined> = {
  admin: "test-admin-key-12345",
  manager: "test-manager-key-12345",
  technician: "test-technician-key-67890",
};

type Props = { searchParams?: { as?: string } };

type Row = { vm: WorkspaceVm; status: MeshStatus };

export default async function RemoteAccessPage({ searchParams }: Props) {
  const asKey = searchParams?.as;
  const devKey = asKey ? DEV_KEYS[asKey] : undefined;

  let myWs: string[] = [];
  let tier = "unknown";
  let err: string | null = null;
  const rows: Row[] = [];
  try {
    const my = await fetchMyWorkspaces(devKey);
    myWs = my.workspaceIds;
    tier = my.tier;

    // Fetch VMs per workspace in parallel.
    const perWs = await Promise.all(myWs.map((w) => fetchWorkspaceVms(w, devKey).catch(() => null)));
    const allVms: WorkspaceVm[] = perWs.filter((x): x is NonNullable<typeof x> => x != null).flatMap((x) => x.vms);

    // Fetch mesh status for each VM in parallel.
    const statuses = await Promise.all(allVms.map((v) => fetchMeshStatus(v.vmid, devKey).catch(() => null)));
    for (let i = 0; i < allVms.length; i++) {
      const status = statuses[i] ?? { vmid: allVms[i].vmid, enrolled: false, online: false };
      rows.push({ vm: allVms[i], status });
    }
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  const counts = {
    total: rows.length,
    online: rows.filter((r) => r.status.online).length,
    offline: rows.filter((r) => r.status.enrolled && !r.status.online).length,
    unenrolled: rows.filter((r) => !r.status.enrolled).length,
  };

  function badge(s: MeshStatus) {
    if (!s.enrolled) return <Badge variant="secondary" data-testid={`agent-badge-${s.vmid}`}>not enrolled</Badge>;
    if (!s.online)  return <Badge variant="destructive" data-testid={`agent-badge-${s.vmid}`}>offline</Badge>;
    return <Badge variant="default" data-testid={`agent-badge-${s.vmid}`}>online</Badge>;
  }

  return (
    <div className="p-6 space-y-6" data-testid="remote-access-page">
      <div>
        <h1 className="text-2xl font-semibold">Remote access</h1>
        <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1">
          <span>Tier:</span> <Badge variant="outline">{tier}</Badge>
          {asKey ? <><span>· acting as</span> <Badge variant="secondary">{asKey}</Badge></> : null}
          {myWs.length > 0 ? <><span>· workspaces:</span> <span className="font-mono">{myWs.join(", ")}</span></> : null}
        </div>
      </div>

      {err && (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader>
            <CardTitle>Could not load remote-access data</CardTitle>
            <CardDescription className="font-mono text-xs">{err}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader><CardDescription>Reachable VMs</CardDescription><CardTitle className="text-3xl">{counts.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Agent online</CardDescription><CardTitle className="text-3xl text-green-600">{counts.online}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Agent offline</CardDescription><CardTitle className="text-3xl text-destructive">{counts.offline}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Not enrolled</CardDescription><CardTitle className="text-3xl">{counts.unenrolled}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your VMs</CardTitle>
          <CardDescription>Open any row to reach its Remote Connect + Console panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VMID</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">CPU %</TableHead>
                <TableHead className="text-right">Mem %</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.vm.vmid} data-testid={`vm-row-${r.vm.vmid}`}>
                  <TableCell className="font-mono">{r.vm.vmid}</TableCell>
                  <TableCell>{r.vm.workspaceId}</TableCell>
                  <TableCell>{badge(r.status)}</TableCell>
                  <TableCell className="text-right">{r.vm.metrics.cpuPct.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{r.vm.metrics.memPct.toFixed(1)}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={asKey ? `/vms/${r.vm.vmid}?as=${asKey}` : `/vms/${r.vm.vmid}`}
                      className="text-sm underline"
                      data-testid={`open-${r.vm.vmid}`}
                    >
                      Open →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
