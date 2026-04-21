import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchCollectors, type CollectorHealth } from "@/lib/api/netflow";

export const dynamic = "force-dynamic";

export default async function CollectorsPage() {
  let health: CollectorHealth[] = [];
  let err: string | null = null;
  try {
    health = await fetchCollectors();
  } catch (e) { err = e instanceof Error ? e.message : String(e); }

  const reachable = health.filter((h) => h.reachable).length;
  const totalRecords = health.reduce((a, h) => a + h.recordCount, 0);

  return (
    <div className="space-y-6" data-testid="netflow-collectors">
      {err && (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader><CardTitle>Could not load collector health</CardTitle><CardDescription>{err}</CardDescription></CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader><CardDescription>Collectors</CardDescription><CardTitle className="text-3xl">{health.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Reachable</CardDescription><CardTitle className="text-3xl text-green-600">{reachable}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Total records in federation</CardDescription><CardTitle className="text-3xl">{totalRecords}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Central + Edge collectors</CardTitle>
          <CardDescription>Every source the FlowQueryCoordinator fans queries to. Edges cover specific workspaces / sites.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Id</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Workspaces</TableHead>
                <TableHead>Reachable</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead>Last flow (UTC)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {health.map((h) => (
                <TableRow key={h.id} data-testid={`collector-row-${h.id}`}>
                  <TableCell className="font-mono text-xs">{h.id}</TableCell>
                  <TableCell><Badge variant={h.kind === "central" ? "default" : "secondary"}>{h.kind}</Badge></TableCell>
                  <TableCell>{h.displayName}</TableCell>
                  <TableCell className="font-mono text-xs">{h.coveredWorkspaces.join(", ") || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={h.reachable ? "default" : "destructive"}>{h.reachable ? "yes" : "no"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{h.recordCount}</TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {h.lastSeenUtc ? new Date(h.lastSeenUtc).toISOString().slice(0, 19) : "—"}
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
