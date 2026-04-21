"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Globe,
  Users,
  CheckCircle2,
  Shield,
  ChevronRight,
  ChevronDown,
  Network,
  Route,
  LayoutGrid,
  Server,
} from "lucide-react";
import { useRemoteNetworks, useWorkspaces, useSites } from "@/lib/mdc/hooks";
import { RemoteNetwork } from "@/lib/mdc/types";

function IdChip({
  id,
  label,
  onClick,
}: {
  id?: string;
  label?: string;
  onClick?: () => void;
}) {
  if (!id) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (!onClick) {
    return (
      <span className="font-mono text-xs text-muted-foreground">{id}</span>
    );
  }
  return (
    <button
      className="font-mono text-xs text-primary hover:underline underline-offset-2 truncate max-w-[220px] text-left"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={id}
    >
      {label ?? id}
    </button>
  );
}

function ExpandedPanel({
  network,
  workspaceName,
  siteName,
  onNavigate,
}: {
  network: RemoteNetwork;
  workspaceName: string;
  siteName: string;
  onNavigate: (path: string) => void;
}) {
  const pools = network.ipAssignmentPools ?? [];
  const routes = network.managedRoutes ?? [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-6 py-4 bg-muted/20 border-t">
      {/* Identity */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <Globe className="h-3 w-3" /> Identity
        </p>
        <dl className="space-y-1.5 text-xs">
          <div>
            <dt className="text-muted-foreground">Network ID</dt>
            <dd className="font-mono mt-0.5">{network.networkId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remote Network ID</dt>
            <dd className="font-mono mt-0.5 break-all">{network.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-mono mt-0.5">{network.name ?? "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Linked resources */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <LayoutGrid className="h-3 w-3" /> Linked Resources
        </p>
        <dl className="space-y-1.5 text-xs">
          <div>
            <dt className="text-muted-foreground">Workspace</dt>
            <dd className="mt-0.5">
              <IdChip
                id={network.workspaceId}
                label={workspaceName !== "Unknown" ? workspaceName : network.workspaceId}
                onClick={() => onNavigate(`/dashboard/infrastructure/workspaces/${network.workspaceId}`)}
              />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Site</dt>
            <dd className="mt-0.5">
              <IdChip
                id={network.siteId}
                label={siteName !== "Unknown" ? siteName : network.siteId}
                onClick={() => onNavigate(`/dashboard/infrastructure/sites/${network.siteId}`)}
              />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Virtual Network ID</dt>
            <dd className="mt-0.5">
              <IdChip
                id={network.virtualNetworkId}
                onClick={() => onNavigate(`/dashboard/infrastructure/workspaces/${network.workspaceId}`)}
              />
            </dd>
          </div>
        </dl>
      </div>

      {/* IP Assignment Pools */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <Network className="h-3 w-3" /> IP Assignment Pools
        </p>
        {pools.length === 0 ? (
          <p className="text-xs text-muted-foreground">No pools configured</p>
        ) : (
          <ul className="space-y-1">
            {pools.map((pool, i) => (
              <li key={i} className="text-xs font-mono bg-background border rounded px-2 py-1">
                {pool.ipRangeStart} – {pool.ipRangeEnd}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Managed Routes */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <Route className="h-3 w-3" /> Managed Routes
        </p>
        {routes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No routes configured</p>
        ) : (
          <ul className="space-y-1">
            {routes.map((route, i) => (
              <li key={i} className="text-xs font-mono bg-background border rounded px-2 py-1">
                {route.target}{route.via ? ` via ${route.via}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Members */}
      {network.members.length > 0 && (
        <div className="sm:col-span-2 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> Members ({network.members.length})
          </p>
          <div className="divide-y rounded-lg border overflow-hidden">
            {network.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 text-xs bg-background">
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.name ?? m.id}</p>
                  <p className="font-mono text-muted-foreground truncate">{m.id}</p>
                  {m.ipAddresses && m.ipAddresses.length > 0 && (
                    <p className="text-muted-foreground">{m.ipAddresses.join(", ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {m.authorized
                    ? <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">Auth</Badge>
                    : <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Pending</Badge>}
                  <span className={`h-2 w-2 rounded-full ${m.online ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RemoteNetworksPage() {
  const router = useRouter();
  const { data: networks, isLoading, isError, error, refetch, isFetching } = useRemoteNetworks();
  const { data: workspacesData } = useWorkspaces();
  const { data: sitesData } = useSites();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const workspaces = workspacesData ?? [];
  const sites = sitesData ?? [];

  const memberStats = useMemo(() => {
    if (!networks) return { total: 0, online: 0, authorized: 0 };
    const all = networks.flatMap((n) => n.members ?? []);
    return {
      total: all.length,
      online: all.filter((m) => m.online).length,
      authorized: all.filter((m) => m.authorized).length,
    };
  }, [networks]);

  const getWorkspaceName = (id?: string) =>
    id ? (workspaces.find((w) => w.id === id)?.name ?? "Unknown") : "Unknown";
  const getSiteName = (id?: string) =>
    id ? (sites.find((s) => s.id === id)?.name ?? "Unknown") : "Unknown";

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading remote networks...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Failed to Load Networks
            </CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "An error occurred"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!networks || networks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Remote Networks</h1>
            <p className="text-muted-foreground">ZeroTier overlay networks for secure connectivity</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Remote Networks</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Remote networks are automatically created when you enable remote access on a workspace
              virtual network.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Remote Networks</h1>
          <p className="text-muted-foreground">
            {networks.length} network{networks.length !== 1 ? "s" : ""} · {memberStats.total} member{memberStats.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Networks</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networks.length}</div>
            <p className="text-xs text-muted-foreground">ZeroTier networks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberStats.total}</div>
            <p className="text-xs text-muted-foreground">Connected devices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{memberStats.online}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authorized</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{memberStats.authorized}</div>
            <p className="text-xs text-muted-foreground">Approved members</p>
          </CardContent>
        </Card>
      </div>

      {/* Networks table */}
      <Card>
        <CardHeader>
          <CardTitle>All Networks</CardTitle>
          <CardDescription>Click a row to view details · use the chevron to expand inline</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>IP Pools</TableHead>
                <TableHead>Routes</TableHead>
                <TableHead>Members</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {networks.map((network) => {
                const expanded = expandedIds.has(network.id);
                const onlineMembers = (network.members ?? []).filter((m) => m.online).length;
                const totalMembers = (network.members ?? []).length;
                const workspaceName = getWorkspaceName(network.workspaceId);
                const siteName = getSiteName(network.siteId);

                return (
                  <React.Fragment key={network.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/infrastructure/remote-networks/${network.id}`)}
                    >
                      <TableCell className="w-8">
                        <button
                          onClick={(e) => toggleExpand(network.id, e)}
                          className="flex items-center justify-center"
                        >
                          {expanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <p className="font-medium text-sm">{network.name ?? "Unnamed"}</p>
                      </TableCell>

                      {/* Workspace */}
                      <TableCell>
                        {network.workspaceId ? (
                          <button
                            className="text-sm text-primary hover:underline underline-offset-2 text-left truncate max-w-[140px] block"
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/infrastructure/workspaces/${network.workspaceId}`); }}
                            title={network.workspaceId}
                          >
                            {workspaceName !== "Unknown" ? workspaceName : network.workspaceId.slice(0, 8) + "…"}
                          </button>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Site */}
                      <TableCell>
                        {network.siteId ? (
                          <button
                            className="text-sm text-primary hover:underline underline-offset-2 text-left truncate max-w-[140px] block"
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/infrastructure/sites/${network.siteId}`); }}
                            title={network.siteId}
                          >
                            {siteName !== "Unknown" ? siteName : network.siteId.slice(0, 8) + "…"}
                          </button>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* IP Pools */}
                      <TableCell>
                        {(network.ipAssignmentPools ?? []).length > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Network className="h-3 w-3" />
                            {network.ipAssignmentPools!.length} pool{network.ipAssignmentPools!.length !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Routes */}
                      <TableCell>
                        {(network.managedRoutes ?? []).length > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Route className="h-3 w-3" />
                            {network.managedRoutes!.length} route{network.managedRoutes!.length !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Members */}
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs">
                          <Server className="h-3 w-3 text-muted-foreground" />
                          <span className="text-green-600 font-medium">{onlineMembers}</span>
                          <span className="text-muted-foreground">/ {totalMembers}</span>
                        </span>
                      </TableCell>

                    </TableRow>

                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <ExpandedPanel
                            network={network}
                            workspaceName={workspaceName}
                            siteName={siteName}
                            onNavigate={(path) => router.push(path)}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
