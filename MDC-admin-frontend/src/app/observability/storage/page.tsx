// Admin Observability — Storage pools.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchStorage, type PdmStoragePool } from "@/lib/api/observability";

export const dynamic = "force-dynamic";

function gib(bytes: number) {
  return (bytes / 1_000_000_000).toFixed(0);
}

export default async function StoragePage() {
  let pools: PdmStoragePool[] = [];
  let err: string | null = null;
  try {
    pools = await fetchStorage();
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="space-y-6" data-testid="storage-page">
      {err ? (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader><CardTitle>Could not load storage</CardTitle><CardDescription>{err}</CardDescription></CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Storage pools ({pools.length})</CardTitle>
            <CardDescription>Capacity and health per pool.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pool</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="text-right">Used / Total (GB)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.map((p) => {
                  const pct = p.totalBytes > 0 ? Math.round((p.usedBytes / p.totalBytes) * 100) : 0;
                  return (
                    <TableRow key={p.id} data-testid={`pool-row-${p.id}`}>
                      <TableCell className="font-medium">{p.name}<div className="text-xs text-muted-foreground">{p.id}</div></TableCell>
                      <TableCell className="text-xs">{p.clusterId}</TableCell>
                      <TableCell className="text-xs">{p.kind}</TableCell>
                      <TableCell>
                        <Badge variant={p.health === "healthy" ? "default" : "destructive"}>{p.health}</Badge>
                      </TableCell>
                      <TableCell className="w-48">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} />
                          <span className="text-xs w-10 text-right">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{gib(p.usedBytes)} / {gib(p.totalBytes)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
