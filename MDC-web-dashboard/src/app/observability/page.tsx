// Observability page (Phase 1 thin slice).
// Server component — fetches from the backend directly using the server-side
// env MDC_API_URL + dev API key, renders a static snapshot. Live refresh is a
// later phase.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchFleet, fetchStatus, fetchEvents, type PdmCluster, type PdmEvent, type ObservabilityStatus } from "@/lib/api/observability";

export const dynamic = "force-dynamic";

type LoadResult =
  | { ok: true; status: ObservabilityStatus; fleet: PdmCluster[]; events: PdmEvent[] }
  | { ok: false; error: string };

async function load(): Promise<LoadResult> {
  try {
    const [status, fleet, events] = await Promise.all([
      fetchStatus(),
      fetchFleet(),
      fetchEvents(10),
    ]);
    return { ok: true, status, fleet, events };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function quorumBadge(state: string) {
  const variant = state === "quorate" ? "default" : "destructive";
  return <Badge variant={variant}>{state}</Badge>;
}

export default async function ObservabilityPage() {
  const result = await load();

  if (!result.ok) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Observability</h1>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Backend unreachable</CardTitle>
            <CardDescription>Could not load telemetry from the MDC API.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap text-destructive">{result.error}</pre>
            <p className="text-sm text-muted-foreground mt-4">
              Check that the backend is running on <code>MDC_API_URL</code> and
              that <code>MDC_DEV_API_KEY</code> is set in <code>.env.local</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { status, fleet, events } = result;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Observability</h1>
        <div className="text-sm text-muted-foreground">
          Mode: <Badge variant="secondary">{status.mode}</Badge>{" "}
          · Reachable: <Badge variant={status.reachable ? "default" : "destructive"}>{String(status.reachable)}</Badge>{" "}
          · Server time: {new Date(status.serverTimeUtc).toLocaleString()}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fleet</CardTitle>
          <CardDescription>Clusters currently managed by PDM.</CardDescription>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {fleet.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}<div className="text-xs text-muted-foreground">{c.id}</div></TableCell>
                  <TableCell>{quorumBadge(c.quorumState)}</TableCell>
                  <TableCell className="text-right">{c.nodeCount}</TableCell>
                  <TableCell className="text-right">{c.vmCount}</TableCell>
                  <TableCell className="text-right">{c.cpuUsedPct.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{c.memUsedPct.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
          <CardDescription>Latest PDM task / audit events.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time (UTC)</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(e.tsUtc).toISOString().replace("T", " ").slice(0, 19)}</TableCell>
                  <TableCell className="text-xs">{e.clusterId}</TableCell>
                  <TableCell className="text-xs">{e.nodeId ?? "—"}</TableCell>
                  <TableCell className="text-xs"><Badge variant="outline">{e.kind}</Badge></TableCell>
                  <TableCell className="text-xs">{e.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
