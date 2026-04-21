// Admin Observability — Fleet view.
// Every cluster, with links into the per-cluster node list.

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchFleet, type PdmCluster } from "@/lib/api/observability";

export const dynamic = "force-dynamic";

function quorumBadge(state: string) {
  return <Badge variant={state === "quorate" ? "default" : "destructive"}>{state}</Badge>;
}

export default async function FleetPage() {
  let fleet: PdmCluster[] = [];
  let err: string | null = null;
  try {
    fleet = await fetchFleet();
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  const totalNodes = fleet.reduce((a, c) => a + c.nodeCount, 0);
  const totalVms = fleet.reduce((a, c) => a + c.vmCount, 0);

  return (
    <div className="space-y-6" data-testid="fleet-page">
      {err ? (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader>
            <CardTitle>Could not load fleet</CardTitle>
            <CardDescription>{err}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardHeader><CardDescription>Clusters</CardDescription><CardTitle className="text-3xl">{fleet.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Nodes</CardDescription><CardTitle className="text-3xl">{totalNodes}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>VMs</CardDescription><CardTitle className="text-3xl">{totalVms}</CardTitle></CardHeader></Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Clusters</CardTitle>
              <CardDescription>Aggregate health per cluster.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Quorum</TableHead>
                    <TableHead className="text-right">Nodes</TableHead>
                    <TableHead className="text-right">VMs</TableHead>
                    <TableHead className="text-right">CPU %</TableHead>
                    <TableHead className="text-right">Mem %</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fleet.map((c) => (
                    <TableRow key={c.id} data-testid={`cluster-row-${c.id}`}>
                      <TableCell className="font-medium">
                        {c.name}
                        <div className="text-xs text-muted-foreground">{c.id}</div>
                      </TableCell>
                      <TableCell>{quorumBadge(c.quorumState)}</TableCell>
                      <TableCell className="text-right">{c.nodeCount}</TableCell>
                      <TableCell className="text-right">{c.vmCount}</TableCell>
                      <TableCell className="text-right">{c.cpuUsedPct.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{c.memUsedPct.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/observability/clusters/${c.id}`}
                          className="text-sm underline"
                          data-testid={`cluster-link-${c.id}`}
                        >
                          Inspect →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
