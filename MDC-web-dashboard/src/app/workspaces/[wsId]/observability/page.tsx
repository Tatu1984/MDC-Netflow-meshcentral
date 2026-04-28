// Workspace-scoped Observability (Phase 2 — User tier).
// Server component. Renders live metrics for the workspace's VMs, or a 403 card
// when the caller is not a member.
//
// Local-dev only: the `?as=admin|manager|technician` query param selects which
// dev API key is used server-side, so the Playwright audit can exercise the
// tier boundary without MSAL. In production the caller's MSAL Bearer token is
// used instead (future phase).

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  fetchWorkspaceVms,
  fetchMyWorkspaces,
  type VmSummary,
} from "@/lib/api/observability";

export const dynamic = "force-dynamic";

const DEV_KEYS: Record<string, string | undefined> = {
  admin:      "test-admin-key-12345",
  manager:    "test-manager-key-12345",
  technician: "test-technician-key-67890",
};

function mbps(bps: number) {
  return (bps / 1_000_000).toFixed(1);
}

type PageProps = {
  params: { wsId: string };
  searchParams?: { as?: string };
};

export default async function WorkspaceObservabilityPage({ params, searchParams }: PageProps) {
  const wsId = decodeURIComponent(params.wsId);
  const asKey = searchParams?.as;
  const devKey = asKey ? DEV_KEYS[asKey] : undefined;

  let vms: VmSummary[] = [];
  let count = 0;
  let error: { status: number; message: string } | null = null;
  let myWorkspaces: string[] = [];
  let tier: "admin" | "workspace" | "unknown" = "unknown";

  try {
    const [my, resp] = await Promise.all([
      fetchMyWorkspaces(undefined, devKey),
      fetchWorkspaceVms(wsId, undefined, devKey),
    ]);
    myWorkspaces = my.workspaceIds;
    tier = my.tier;
    vms = resp.vms;
    count = resp.count;
  } catch (e) {
    const status = (e as { status?: number }).status ?? 0;
    error = { status, message: e instanceof Error ? e.message : String(e) };
    // still try to fetch memberships so the UI can hint at which workspaces ARE available
    try {
      const my = await fetchMyWorkspaces(undefined, devKey);
      myWorkspaces = my.workspaceIds;
      tier = my.tier;
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="p-6 space-y-6" data-testid="workspace-observability-page">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspace observability</h1>
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1">
            <span>Workspace</span> <code>{wsId}</code>
            {asKey ? <><span>· acting as</span> <Badge variant="secondary">{asKey}</Badge></> : null}
            {tier !== "unknown" ? <><span>· tier</span> <Badge variant="outline">{tier}</Badge></> : null}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {myWorkspaces.length > 0 && (
            <>
              Accessible:{" "}
              {myWorkspaces.map((w) => (
                <Link
                  key={w}
                  href={asKey ? `/workspaces/${w}/observability?as=${asKey}` : `/workspaces/${w}/observability`}
                  className="underline mx-1"
                >
                  {w}
                </Link>
              ))}
            </>
          )}
        </div>
      </div>

      {error ? (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader>
            <CardTitle>
              {error.status === 403
                ? `Not a member of ${wsId}`
                : error.status === 401
                ? "Not authenticated"
                : "Could not load workspace"}
            </CardTitle>
            <CardDescription>
              HTTP {error.status || "network"} — workspace-tier rules blocked this request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <span>Tier:</span> <Badge variant="outline">{tier}</Badge>
            </div>
            <pre className="text-xs whitespace-pre-wrap mt-2">{error.message}</pre>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>VMs ({count})</CardTitle>
            <CardDescription>Live metrics for VMs in this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VMID</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead className="text-right">CPU %</TableHead>
                  <TableHead className="text-right">Mem %</TableHead>
                  <TableHead className="text-right">Net Rx (MB/s)</TableHead>
                  <TableHead className="text-right">Net Tx (MB/s)</TableHead>
                  <TableHead className="text-right">Disk R (MB/s)</TableHead>
                  <TableHead className="text-right">Disk W (MB/s)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vms.map((v) => (
                  <TableRow key={v.vmid} data-testid={`vm-row-${v.vmid}`}>
                    <TableCell className="font-medium">{v.vmid}</TableCell>
                    <TableCell className="text-xs">{v.clusterId}</TableCell>
                    <TableCell className="text-right">{v.metrics.cpuPct.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{v.metrics.memPct.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{mbps(v.metrics.netRxBps)}</TableCell>
                    <TableCell className="text-right">{mbps(v.metrics.netTxBps)}</TableCell>
                    <TableCell className="text-right">{mbps(v.metrics.diskReadBps)}</TableCell>
                    <TableCell className="text-right">{mbps(v.metrics.diskWriteBps)}</TableCell>
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
