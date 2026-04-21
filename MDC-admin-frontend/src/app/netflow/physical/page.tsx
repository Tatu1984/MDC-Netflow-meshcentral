import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPhysical, PROTOCOL_NAMES, type FlowResult } from "@/lib/api/netflow";

export const dynamic = "force-dynamic";

function mib(bytes: number) { return (bytes / 1_048_576).toFixed(1); }

export default async function PhysicalPage() {
  let flows: FlowResult | null = null;
  let err: string | null = null;
  try {
    flows = await fetchPhysical();
  } catch (e) { err = e instanceof Error ? e.message : String(e); }

  const byInterface = new Map<string, { bytes: number; flows: number }>();
  for (const r of flows?.records ?? []) {
    const cur = byInterface.get(r.observationPoint) ?? { bytes: 0, flows: 0 };
    cur.bytes += r.bytes; cur.flows += 1;
    byInterface.set(r.observationPoint, cur);
  }

  return (
    <div className="space-y-6" data-testid="netflow-physical">
      {err && (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader><CardTitle>Could not load physical flows</CardTitle><CardDescription>{err}</CardDescription></CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Physical interfaces ({byInterface.size})</CardTitle>
          <CardDescription>Per-uplink / per-trunk totals over the last 5 minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interface</TableHead>
                <TableHead className="text-right">MiB</TableHead>
                <TableHead className="text-right">Flows</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(byInterface.entries()).map(([iface, agg]) => (
                <TableRow key={iface} data-testid={`phys-iface-${iface}`}>
                  <TableCell className="font-mono text-xs">{iface}</TableCell>
                  <TableCell className="text-right">{mib(agg.bytes)}</TableCell>
                  <TableCell className="text-right">{agg.flows}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Physical flow sample ({flows?.records.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Interface</TableHead>
                <TableHead>Src</TableHead>
                <TableHead>Dst</TableHead>
                <TableHead>Proto</TableHead>
                <TableHead className="text-right">MiB</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(flows?.records ?? []).map((r, i) => (
                <TableRow key={i} data-testid={`phys-flow-${i}`}>
                  <TableCell className="font-mono text-xs">{new Date(r.tsUtc).toISOString().slice(11, 19)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.observationPoint}</TableCell>
                  <TableCell className="font-mono text-xs">{r.srcIp}:{r.srcPort}</TableCell>
                  <TableCell className="font-mono text-xs">{r.dstIp}:{r.dstPort}</TableCell>
                  <TableCell><Badge variant="outline">{PROTOCOL_NAMES[r.protocol] ?? r.protocol}</Badge></TableCell>
                  <TableCell className="text-right">{mib(r.bytes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
