// Admin MeshCentral dashboard.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchMeshDevices, runReconcile, type MeshDevice, type ReconcileReport } from "@/lib/api/mesh-admin";

export const dynamic = "force-dynamic";

export default async function MeshAdminPage() {
  let devices: MeshDevice[] = [];
  let report: ReconcileReport | null = null;
  let err: string | null = null;
  try {
    [devices, report] = await Promise.all([fetchMeshDevices(), runReconcile()]);
  } catch (e) { err = e instanceof Error ? e.message : String(e); }

  const counts = {
    total: devices.length,
    online: devices.filter((d) => d.online).length,
    offline: devices.filter((d) => !d.online).length,
  };

  const byGroup = new Map<string, number>();
  for (const d of devices) byGroup.set(d.groupId, (byGroup.get(d.groupId) ?? 0) + 1);

  return (
    <div className="p-6 space-y-6" data-testid="mesh-admin-page">
      <header>
        <h1 className="text-2xl font-semibold">MeshCentral · Admin</h1>
        <p className="text-sm text-muted-foreground">Agent health, enrollment drift, device groups.</p>
      </header>

      {err && (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader><CardTitle>Could not load mesh data</CardTitle><CardDescription>{err}</CardDescription></CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader><CardDescription>Devices</CardDescription><CardTitle className="text-3xl">{counts.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Online</CardDescription><CardTitle className="text-3xl text-green-600">{counts.online}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Offline</CardDescription><CardTitle className="text-3xl text-destructive">{counts.offline}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Drifted (unenrolled)</CardDescription><CardTitle className="text-3xl">{report?.drifted ?? 0}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
          <CardDescription>Every agent known to MeshCentral, grouped by workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node</TableHead>
                <TableHead>Group (workspace)</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Last seen (UTC)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((d) => (
                <TableRow key={d.nodeId} data-testid={`device-row-${d.nodeId}`}>
                  <TableCell className="font-mono text-xs">{d.nodeId}</TableCell>
                  <TableCell>{d.groupId}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>
                    <Badge variant={d.online ? "default" : "destructive"}>{d.online ? "online" : "offline"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{d.agentVersion}</TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{new Date(d.lastSeenUtc).toISOString().slice(0, 19)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Groups ({byGroup.size})</CardTitle>
          <CardDescription>Devices per Mesh group — typically one group per workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Group</TableHead><TableHead className="text-right">Device count</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(byGroup.entries()).map(([g, n]) => (
                <TableRow key={g} data-testid={`group-row-${g}`}>
                  <TableCell>{g}</TableCell>
                  <TableCell className="text-right">{n}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last reconcile</CardTitle>
          <CardDescription>Ran on page load. Reconciler runs periodically in the background regardless.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div><dt className="text-muted-foreground">Drifted</dt><dd data-testid="reconcile-drifted" className="text-2xl font-semibold">{report?.drifted ?? 0}</dd></div>
            <div><dt className="text-muted-foreground">Enrolled</dt><dd data-testid="reconcile-enroled" className="text-2xl font-semibold text-green-600">{report?.enroled ?? 0}</dd></div>
            <div><dt className="text-muted-foreground">Orphaned</dt><dd data-testid="reconcile-orphaned" className="text-2xl font-semibold">{report?.orphaned ?? 0}</dd></div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
