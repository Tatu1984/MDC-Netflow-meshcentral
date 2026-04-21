// Admin Observability — All nodes across all clusters.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchFleet, fetchNodes, type PdmNode } from "@/lib/api/observability";

export const dynamic = "force-dynamic";

export default async function AllNodesPage() {
  const clusters = await fetchFleet();
  const perCluster = await Promise.all(clusters.map(async (c) => ({ cluster: c, nodes: await fetchNodes(c.id) })));
  const all: Array<PdmNode & { clusterName: string }> = perCluster.flatMap((x) => x.nodes.map((n) => ({ ...n, clusterName: x.cluster.name })));

  return (
    <div className="space-y-6" data-testid="nodes-page">
      <Card>
        <CardHeader>
          <CardTitle>All nodes ({all.length})</CardTitle>
          <CardDescription>Every host across every cluster.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">VMs</TableHead>
                <TableHead className="text-right">CPU %</TableHead>
                <TableHead className="text-right">Mem %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((n) => (
                <TableRow key={n.id} data-testid={`node-row-${n.id}`}>
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell className="text-xs">{n.clusterName}</TableCell>
                  <TableCell>
                    <Badge variant={n.status === "online" ? "default" : "destructive"}>{n.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{n.vmCount}</TableCell>
                  <TableCell className="text-right">{n.cpuPct.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{n.memPct.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
