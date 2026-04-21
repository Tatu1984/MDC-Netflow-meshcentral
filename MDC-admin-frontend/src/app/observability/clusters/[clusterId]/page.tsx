// Admin Observability — Cluster drilldown (nodes + VMs).

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchNodes, fetchVms, type PdmNode, type PdmVm } from "@/lib/api/observability";

export const dynamic = "force-dynamic";

type Props = { params: { clusterId: string } };

function fmtUptime(sec: number) {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h` : `${h}h`;
}

export default async function ClusterPage({ params }: Props) {
  const clusterId = decodeURIComponent(params.clusterId);
  let nodes: PdmNode[] = [];
  let vms: PdmVm[] = [];
  let err: string | null = null;
  try {
    [nodes, vms] = await Promise.all([fetchNodes(clusterId), fetchVms(clusterId)]);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="space-y-6" data-testid="cluster-page">
      <div>
        <Link href="/observability" className="text-sm underline">← Back to fleet</Link>
        <h2 className="text-xl font-medium mt-2">Cluster <code>{clusterId}</code></h2>
      </div>

      {err ? (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader><CardTitle>Could not load cluster</CardTitle><CardDescription>{err}</CardDescription></CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Nodes ({nodes.length})</CardTitle><CardDescription>Host-level health.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Node</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">VMs</TableHead>
                    <TableHead className="text-right">CPU %</TableHead>
                    <TableHead className="text-right">Mem %</TableHead>
                    <TableHead className="text-right">Uptime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.map((n) => (
                    <TableRow key={n.id} data-testid={`node-row-${n.id}`}>
                      <TableCell className="font-medium">{n.name}</TableCell>
                      <TableCell>
                        <Badge variant={n.status === "online" ? "default" : "destructive"}>{n.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{n.vmCount}</TableCell>
                      <TableCell className="text-right">{n.cpuPct.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{n.memPct.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{fmtUptime(n.uptimeSec)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Guests ({vms.length})</CardTitle><CardDescription>VMs hosted on this cluster.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>VMID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Node</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vms.map((v) => (
                    <TableRow key={v.vmid} data-testid={`vm-row-${v.vmid}`}>
                      <TableCell className="font-mono">{v.vmid}</TableCell>
                      <TableCell>{v.name}</TableCell>
                      <TableCell className="text-xs">{v.nodeId}</TableCell>
                      <TableCell>
                        <Badge variant={v.status === "running" ? "default" : "secondary"}>{v.status}</Badge>
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
