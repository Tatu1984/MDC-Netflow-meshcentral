"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Network,
  Router,
  Shield,
  Loader2,
  RefreshCw,
  AlertCircle,
  LayoutGrid,
  Server,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRemoteNetwork, useWorkspaces, useSites } from "@/lib/mdc/hooks";
import { useToast } from "@/hooks/use-toast";

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function RemoteNetworkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const networkId = params.id as string;

  const { data: network, isLoading, isError, refetch, isFetching } = useRemoteNetwork(networkId);
  const { data: workspaces } = useWorkspaces();
  const { data: sites } = useSites();

  const getWorkspaceName = (id?: string) =>
    id ? (workspaces?.find((w) => w.id === id)?.name || id) : "—";
  const getSiteName = (id?: string) =>
    id ? (sites?.find((s) => s.id === id)?.name || id) : "—";

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const onlineMembers = (network?.members || []).filter((m) => m.online).length;
  const totalMembers = (network?.members || []).length;
  const authorizedMembers = (network?.members || []).filter((m) => m.authorized).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">{network?.name || "Remote Network"}</h1>
          )}
          <p className="text-sm text-muted-foreground font-mono">{networkId}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Failed to load network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {network && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalMembers}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{onlineMembers}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Authorized</CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{authorizedMembers}</div></CardContent>
            </Card>
          </div>

          <Tabs defaultValue="members">
            <TabsList>
              <TabsTrigger value="members">Members ({totalMembers})</TabsTrigger>
              <TabsTrigger value="routes">Routes</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            {/* Members Tab */}
            <TabsContent value="members" className="mt-4">
              {network.members && network.members.length > 0 ? (
                <Card>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>IP Addresses</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Online</TableHead>
                          <TableHead>Latency</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {network.members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{member.name || member.id}</p>
                                {member.description && (
                                  <p className="text-xs text-muted-foreground">{member.description}</p>
                                )}
                                <p className="text-xs font-mono text-muted-foreground">{member.id}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {member.ipAddresses?.map((ip, i) => (
                                  <div key={i} className="flex items-center gap-1">
                                    <code className="text-xs bg-muted px-1 rounded">{ip}</code>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(ip, "IP")}>
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                {(!member.ipAddresses || member.ipAddresses.length === 0) && (
                                  <span className="text-muted-foreground text-sm">No IP assigned</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {member.online ? (
                                  <Badge className="bg-green-500 w-fit">Online</Badge>
                                ) : (
                                  <Badge variant="secondary" className="w-fit">Offline</Badge>
                                )}
                                {member.authorized ? (
                                  <Badge variant="outline" className="w-fit text-blue-600">Authorized</Badge>
                                ) : (
                                  <Badge variant="outline" className="w-fit text-yellow-600">Pending</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatRelativeTime(member.lastOnline)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {member.latency !== undefined ? (
                                <span className="text-sm">{member.latency}ms</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No members in this network</p>
                  <p className="text-sm mt-1 font-mono">{network.id}</p>
                </div>
              )}
            </TabsContent>

            {/* Routes Tab */}
            <TabsContent value="routes" className="mt-4 space-y-4">
              {network.ipAssignmentPools && network.ipAssignmentPools.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Network className="h-4 w-4" /> IP Assignment Pools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {network.ipAssignmentPools.map((pool, i) => (
                      <div key={i} className="p-3 rounded-lg border font-mono text-sm">
                        {pool.ipRangeStart} — {pool.ipRangeEnd}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {network.managedRoutes && network.managedRoutes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Router className="h-4 w-4" /> Managed Routes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {network.managedRoutes.map((route, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                        <code className="text-sm">{route.target}</code>
                        {route.via && (
                          <span className="text-sm text-muted-foreground">via <code>{route.via}</code></span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {!network.ipAssignmentPools?.length && !network.managedRoutes?.length && (
                <div className="text-center py-12 text-muted-foreground">
                  <Router className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No routes configured</p>
                </div>
              )}
            </TabsContent>

            {/* Info Tab */}
            <TabsContent value="info" className="mt-4 space-y-4">
              {/* Identity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Identity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Remote Network ID</dt>
                      <dd className="mt-1 font-mono text-xs break-all flex items-center gap-1 text-muted-foreground">
                        {network.id}
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => copyToClipboard(network.id, "Remote Network ID")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">ZeroTier Network ID</dt>
                      <dd className="mt-1 font-mono text-sm flex items-center gap-1">
                        {network.networkId ?? "—"}
                        {network.networkId && (
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => copyToClipboard(network.networkId!, "ZeroTier Network ID")}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Name</dt>
                      <dd className="mt-1 font-mono text-sm">{network.name ?? "—"}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Linked Resources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" /> Linked Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Workspace</dt>
                      <dd className="mt-1 space-y-0.5">
                        <button
                          className="text-sm font-medium text-primary hover:underline underline-offset-2 text-left block"
                          onClick={() => router.push(`/dashboard/infrastructure/workspaces/${network.workspaceId}`)}
                        >
                          {getWorkspaceName(network.workspaceId)}
                        </button>
                        <p className="font-mono text-xs text-muted-foreground">{network.workspaceId}</p>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Site</dt>
                      <dd className="mt-1 space-y-0.5">
                        <button
                          className="text-sm font-medium text-primary hover:underline underline-offset-2 text-left block"
                          onClick={() => router.push(`/dashboard/infrastructure/sites/${network.siteId}`)}
                        >
                          {getSiteName(network.siteId)}
                        </button>
                        <p className="font-mono text-xs text-muted-foreground">{network.siteId}</p>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Virtual Network ID</dt>
                      <dd className="mt-1 space-y-0.5">
                        <button
                          className="font-mono text-xs text-primary hover:underline underline-offset-2 text-left break-all block"
                          onClick={() => router.push(`/dashboard/infrastructure/workspaces/${network.workspaceId}`)}
                          title="View in Workspace"
                        >
                          {network.virtualNetworkId}
                        </button>
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Join Command */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4" /> Join Command
                  </CardTitle>
                  <CardDescription>Run this on any device to connect to this network</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                    <code className="text-sm flex-1">zerotier-cli join {network.networkId ?? network.id}</code>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(`zerotier-cli join ${network.networkId ?? network.id}`, "Join command")}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
