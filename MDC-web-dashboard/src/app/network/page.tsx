// User-facing NetFlow dashboard (Phase 7).
// Workspace-scoped: lists interfaces in each workspace the caller belongs to,
// plus top talkers and recent flows, all filtered server-side by tier.

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchMyWorkspaces } from "@/lib/api/mesh-summary";
import { fetchWorkspaceIfaces, fetchFlows, fetchTopTalkers, PROTOCOL_NAMES, type WorkspaceInterface, type FlowResult, type TopTalker } from "@/lib/api/netflow";

export const dynamic = "force-dynamic";

const DEV_KEYS: Record<string, string | undefined> = {
  admin: "test-admin-key-12345",
  manager: "test-manager-key-12345",
  technician: "test-technician-key-67890",
};

function mib(bytes: number): string {
  return (bytes / 1_048_576).toFixed(1);
}

type Props = { searchParams?: { as?: string; ws?: string } };

export default async function NetworkPage({ searchParams }: Props) {
  const asKey = searchParams?.as;
  const devKey = asKey ? DEV_KEYS[asKey] : undefined;

  let myWsList: string[] = [];
  let tier = "unknown";
  let err: string | null = null;
  try {
    const my = await fetchMyWorkspaces(devKey);
    myWsList = my.workspaceIds;
    tier = my.tier;
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  const selectedWs = searchParams?.ws && myWsList.includes(searchParams.ws)
    ? searchParams.ws
    : myWsList[0] ?? null;

  let interfaces: WorkspaceInterface[] = [];
  let flows: FlowResult | null = null;
  let talkers: TopTalker[] = [];
  if (selectedWs) {
    try {
      [interfaces, flows, talkers] = await Promise.all([
        fetchWorkspaceIfaces(selectedWs, devKey),
        fetchFlows({ workspaceId: selectedWs, take: 25 }, devKey),
        fetchTopTalkers({ workspaceId: selectedWs, n: 5 }, devKey),
      ]);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <div className="p-6 space-y-6" data-testid="user-network-page">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Network (NetFlow)</h1>
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1">
            <span>Tier:</span> <Badge variant="outline">{tier}</Badge>
            {asKey ? <><span>· acting as</span> <Badge variant="secondary">{asKey}</Badge></> : null}
            {selectedWs ? <><span>· workspace</span> <Badge variant="default">{selectedWs}</Badge></> : null}
          </div>
        </div>
        {myWsList.length > 1 && (
          <div className="flex gap-2 text-xs" data-testid="ws-switcher">
            {myWsList.map((w) => (
              <Link
                key={w}
                href={`/network?${asKey ? `as=${asKey}&` : ""}ws=${w}`}
                className={`px-2 py-1 rounded border ${w === selectedWs ? "bg-primary text-primary-foreground" : ""}`}
              >
                {w}
              </Link>
            ))}
          </div>
        )}
      </div>

      {err && (
        <Card className="border-destructive" data-testid="error-card">
          <CardHeader>
            <CardTitle>Could not load flow data</CardTitle>
            <CardDescription className="font-mono text-xs">{err}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!selectedWs ? (
        <Card>
          <CardHeader>
            <CardTitle>No workspace</CardTitle>
            <CardDescription>You are not a member of any workspace. Ask an administrator to add you to one.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Interfaces ({interfaces.length})</CardTitle>
              <CardDescription>Per virtual NIC in this workspace — totals over the last 5 minutes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Interface</TableHead>
                    <TableHead>VM</TableHead>
                    <TableHead className="text-right">Rx (MiB)</TableHead>
                    <TableHead className="text-right">Tx (MiB)</TableHead>
                    <TableHead className="text-right">Flows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interfaces.map((iface) => (
                    <TableRow key={iface.id} data-testid={`iface-row-${iface.id}`}>
                      <TableCell className="font-mono text-xs">{iface.id}</TableCell>
                      <TableCell>{iface.vmName} <span className="text-xs text-muted-foreground">({iface.vmId})</span></TableCell>
                      <TableCell className="text-right">{mib(iface.rxBytes)}</TableCell>
                      <TableCell className="text-right">{mib(iface.txBytes)}</TableCell>
                      <TableCell className="text-right">{iface.flowCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top talkers</CardTitle>
              <CardDescription>Highest-bandwidth observation points in your workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Observation point</TableHead>
                    <TableHead className="text-right">MiB</TableHead>
                    <TableHead className="text-right">Flows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {talkers.map((t, i) => (
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
              <CardTitle>Recent flows ({flows?.totalAfterFilter ?? 0})</CardTitle>
              <CardDescription>Newest first. Server tier: {flows?.tier}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time (UTC)</TableHead>
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
        </>
      )}
    </div>
  );
}
