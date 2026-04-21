import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchExporters, type FlowExporter } from "@/lib/api/netflow";

export const dynamic = "force-dynamic";

export default async function ExportersPage() {
  let exporters: FlowExporter[] = [];
  let err: string | null = null;
  try {
    exporters = await fetchExporters();
  } catch (e) { err = e instanceof Error ? e.message : String(e); }

  return (
    <div className="space-y-6" data-testid="netflow-exporters">
      {err && (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader><CardTitle>Could not load exporters</CardTitle><CardDescription>{err}</CardDescription></CardHeader>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Registered exporters ({exporters.length})</CardTitle>
          <CardDescription>Sources sending flow records. Home collector shows where each one lands (central or a named edge).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Source IP</TableHead>
                <TableHead>Home collector</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Last seen (UTC)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exporters.map((e) => (
                <TableRow key={e.id} data-testid={`exporter-row-${e.id}`}>
                  <TableCell className="font-medium">{e.displayName}<div className="text-xs text-muted-foreground font-mono">{e.id}</div></TableCell>
                  <TableCell className="font-mono text-xs">{e.sourceIp}</TableCell>
                  <TableCell><Badge variant="outline">{e.homeCollector}</Badge></TableCell>
                  <TableCell><Badge variant={e.isEnabled ? "default" : "destructive"}>{e.isEnabled ? "yes" : "no"}</Badge></TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{new Date(e.lastSeenUtc).toISOString().slice(0, 19)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
