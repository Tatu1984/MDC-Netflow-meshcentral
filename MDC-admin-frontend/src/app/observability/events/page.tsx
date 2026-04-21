// Admin Observability — Recent PDM events.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchEvents, type PdmEvent } from "@/lib/api/observability";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let events: PdmEvent[] = [];
  let err: string | null = null;
  try {
    events = await fetchEvents(50);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="space-y-6" data-testid="events-page">
      {err ? (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader><CardTitle>Could not load events</CardTitle><CardDescription>{err}</CardDescription></CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent events ({events.length})</CardTitle>
            <CardDescription>PDM task / audit events, newest first.</CardDescription>
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
                  <TableRow key={i} data-testid={`event-row-${i}`}>
                    <TableCell className="whitespace-nowrap text-xs font-mono">{new Date(e.tsUtc).toISOString().replace("T", " ").slice(0, 19)}</TableCell>
                    <TableCell className="text-xs">{e.clusterId}</TableCell>
                    <TableCell className="text-xs">{e.nodeId ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{e.kind}</Badge></TableCell>
                    <TableCell className="text-sm">{e.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
