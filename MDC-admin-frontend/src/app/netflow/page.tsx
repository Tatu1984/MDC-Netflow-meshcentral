import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAllFlows, fetchTop, PROTOCOL_NAMES, type FlowResult, type TopTalker } from "@/lib/api/netflow";

export const dynamic = "force-dynamic";

function mib(bytes: number) { return (bytes / 1_048_576).toFixed(1); }

export default async function NetflowOverviewPage() {
  let flows: FlowResult | null = null;
  let top: TopTalker[] = [];
  let err: string | null = null;
  try {
    [flows, top] = await Promise.all([
      fetchAllFlows({ includePhysical: true, take: 25 }),
      fetchTop(10, true),
    ]);
  } catch (e) { err = e instanceof Error ? e.message : String(e); }

  const byWorkspace = new Map<string, number>();
  for (const r of flows?.records ?? []) {
    const k = r.workspaceId ?? "(physical)";
    byWorkspace.set(k, (byWorkspace.get(k) ?? 0) + r.bytes);
  }

  return (
    <div className="space-y-6" data-testid="netflow-overview">
      {err && (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader><CardTitle>Could not load flows</CardTitle><CardDescription>{err}</CardDescription></CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader><CardDescription>Flows in window</CardDescription><CardTitle className="text-3xl">{flows?.totalAfterFilter ?? 0}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Tier</CardDescription><CardTitle className="text-2xl">{flows?.tier ?? "—"}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Distinct observation points</CardDescription><CardTitle className="text-3xl">{top.length}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top talkers (global)</CardTitle>
          <CardDescription>Highest-volume observation points across the fleet, physical + virtual.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Observation point</TableHead>
                <TableHead className="text-right">MiB</TableHead>
                <TableHead className="text-right">Flows</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top.map((t, i) => (
                <TableRow key={t.key} data-testid={`top-talker-${i}`}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{t.label}</TableCell>
                  <TableCell className="text-right">{mib(t.bytes)}</TableCell>
                  <TableCell className="text-right">{t.flowCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent flows ({flows?.records.length ?? 0})</CardTitle>
          <CardDescription>Unscoped view, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Interface</TableHead>
                <TableHead>Src</TableHead>
                <TableHead>Dst</TableHead>
                <TableHead>Proto</TableHead>
                <TableHead className="text-right">KiB</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(flows?.records ?? []).map((r, i) => (
                <TableRow key={i} data-testid={`flow-row-${i}`}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{new Date(r.tsUtc).toISOString().slice(11, 19)}</TableCell>
                  <TableCell>
                    {r.workspaceId ?? <Badge variant="destructive" className="text-xs">physical</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.observationPoint}</TableCell>
                  <TableCell className="font-mono text-xs">{r.srcIp}:{r.srcPort}</TableCell>
                  <TableCell className="font-mono text-xs">{r.dstIp}:{r.dstPort}</TableCell>
                  <TableCell><Badge variant="outline">{PROTOCOL_NAMES[r.protocol] ?? r.protocol}</Badge></TableCell>
                  <TableCell className="text-right">{(r.bytes / 1024).toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
