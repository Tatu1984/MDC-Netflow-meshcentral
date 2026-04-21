"use client";

import { useState, useMemo } from "react";
import {
  MoreHorizontal,
  Network,
  Users,
  Shield,
  Settings,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Search, Trash2, Edit, Globe as GlobeIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRemoteNetworks, useUpdateRemoteNetwork, useSites, useWorkspaces } from "@/lib/mdc/hooks";
import { RemoteNetwork, RemoteNetworkMember } from "@/lib/mdc/types";

// Helper to get CIDR from IP assignment pools
function getNetworkCIDR(network: RemoteNetwork): string {
  if (network.ipAssignmentPools && network.ipAssignmentPools.length > 0) {
    const pool = network.ipAssignmentPools[0];
    return `${pool.ipRangeStart} - ${pool.ipRangeEnd}`;
  }
  return "Auto-assigned";
}

// Helper to get member status
function getMemberStatus(member: RemoteNetworkMember): "online" | "offline" | "pending" {
  if (!member.authorized) return "pending";
  return member.online ? "online" : "offline";
}

export default function ZeroTierPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [networkForConfig, setNetworkForConfig] = useState<RemoteNetwork | null>(null);
  const [memberForEdit, setMemberForEdit] = useState<RemoteNetworkMember & { networkId: string } | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<RemoteNetworkMember & { networkId: string } | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberIP, setMemberIP] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch remote networks from MDC API
  const { data: remoteNetworks, isLoading, isError, error, refetch } = useRemoteNetworks();
  const { data: sites } = useSites();
  const { data: workspaces } = useWorkspaces();
  const updateRemoteNetwork = useUpdateRemoteNetwork();

  // Map networks and members for display
  const networks = useMemo(() => {
    if (!remoteNetworks) return [];
    return remoteNetworks.map((network) => ({
      ...network,
      memberCount: network.members?.length || 0,
      onlineMembers: network.members?.filter((m) => m.online).length || 0,
      cidr: getNetworkCIDR(network),
      flowRules: network.managedRoutes?.length || 0,
    }));
  }, [remoteNetworks]);

  // Flatten all members with network reference
  const allMembers = useMemo(() => {
    if (!remoteNetworks) return [];
    return remoteNetworks.flatMap((network) =>
      (network.members || []).map((member) => ({
        ...member,
        networkId: network.id,
        networkName: network.name || `Network ${network.id.slice(0, 8)}`,
      }))
    );
  }, [remoteNetworks]);

  // Filter members
  const filteredMembers = useMemo(() => {
    return allMembers.filter((member) => {
      const matchesSearch =
        (member.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
        member.id.includes(search);
      const matchesNetwork = !selectedNetwork || member.networkId === selectedNetwork;
      return matchesSearch && matchesNetwork;
    });
  }, [allMembers, search, selectedNetwork]);

  // Lookup helpers
  const getSiteName = (siteId: string) => {
    const site = sites?.find((s) => s.id === siteId);
    return site?.name || siteId.slice(0, 8);
  };

  const getWorkspaceName = (workspaceId: string) => {
    const workspace = workspaces?.find((w) => w.id === workspaceId);
    return workspace?.name || workspaceId.slice(0, 8);
  };

  // Stats
  const totalMembers = allMembers.length;
  const onlineMembers = allMembers.filter((m) => m.online).length;
  const pendingMembers = allMembers.filter((m) => !m.authorized).length;
  const totalRoutes = networks.reduce((sum, n) => sum + n.flowRules, 0);

  const handleAuthorize = async (member: RemoteNetworkMember & { networkId: string }) => {
    try {
      await updateRemoteNetwork.mutateAsync({
        id: member.networkId,
        update: {
          members: [{ id: member.id, authorized: true }],
        },
      });
      toast({
        title: "Member Authorized",
        description: `${member.name || member.id} has been authorized to join the network`,
      });
    } catch (err) {
      toast({
        title: "Authorization Failed",
        description: err instanceof Error ? err.message : "Failed to authorize member",
        variant: "destructive",
      });
    }
  };

  const handleDeauthorize = async (member: RemoteNetworkMember & { networkId: string }) => {
    try {
      await updateRemoteNetwork.mutateAsync({
        id: member.networkId,
        update: {
          members: [{ id: member.id, authorized: false }],
        },
      });
      toast({
        title: "Member Deauthorized",
        description: `${member.name || member.id} has been removed from the network`,
        variant: "destructive",
      });
      setMemberToRemove(null);
    } catch (err) {
      toast({
        title: "Deauthorization Failed",
        description: err instanceof Error ? err.message : "Failed to deauthorize member",
        variant: "destructive",
      });
    }
  };

  const handleEditMember = (member: RemoteNetworkMember & { networkId: string }) => {
    setMemberForEdit(member);
    setMemberName(member.name || "");
    setMemberIP(member.ipAddresses?.[0] || "");
  };

  const handleSaveMember = async () => {
    if (!memberForEdit) return;
    try {
      await updateRemoteNetwork.mutateAsync({
        id: memberForEdit.networkId,
        update: {
          members: [{
            id: memberForEdit.id,
            name: memberName || undefined,
            ipAssignments: memberIP ? [memberIP] : undefined,
          }],
        },
      });
      toast({
        title: "Member Updated",
        description: `${memberName || memberForEdit.id} has been updated`,
      });
      setMemberForEdit(null);
    } catch (err) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update member",
        variant: "destructive",
      });
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
              {error instanceof Error ? error.message : "An error occurred while loading remote networks"}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Remote Networks</h1>
          <p className="text-muted-foreground">
            Manage ZeroTier overlay networks for workspace connectivity
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Networks</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networks.length}</div>
            <p className="text-xs text-muted-foreground">Virtual networks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">{onlineMembers} online</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Auth</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMembers}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managed Routes</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRoutes}</div>
            <p className="text-xs text-muted-foreground">Active routes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="networks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="networks">Networks ({networks.length})</TabsTrigger>
          <TabsTrigger value="members">Members ({totalMembers})</TabsTrigger>
        </TabsList>

        <TabsContent value="networks" className="space-y-4">
          {networks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Network className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Remote Networks</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Remote networks are automatically created when you enable remote access on a workspace virtual network.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {networks.map((network) => (
                <Card key={network.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {network.name || `Network ${network.id.slice(0, 8)}`}
                          <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                        <CardDescription>
                          {getWorkspaceName(network.workspaceId)} / {getSiteName(network.siteId)}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setNetworkForConfig(network)}>
                            <Settings className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setSelectedNetwork(network.id)}>
                            <Users className="mr-2 h-4 w-4" />
                            View Members
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono truncate">
                        {network.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyId(network.id)}
                      >
                        {copiedId === network.id ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">IP Range</p>
                        <p className="font-mono text-xs">{network.cidr}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Members</p>
                        <p>
                          <span className="text-green-500">{network.onlineMembers}</span>
                          /{network.memberCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Routes</p>
                        <p>{network.flowRules}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedNetwork || ""}
              onChange={(e) => setSelectedNetwork(e.target.value || null)}
            >
              <option value="">All Networks</option>
              {networks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.name || `Network ${network.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Network Members</CardTitle>
              <CardDescription>Devices connected to remote networks</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No members found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => {
                      const status = getMemberStatus(member);
                      return (
                        <TableRow key={`${member.networkId}-${member.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{member.name || "Unknown Device"}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {member.id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {status === "online" ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : status === "offline" ? (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Clock className="h-4 w-4 text-yellow-500" />
                              )}
                              <Badge
                                variant={
                                  status === "online"
                                    ? "default"
                                    : status === "pending"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {status}
                              </Badge>
                              {!member.authorized && (
                                <Badge variant="destructive" className="text-xs">
                                  Unauthorized
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.networkName}
                          </TableCell>
                          <TableCell className="font-mono">
                            {member.ipAddresses?.[0] || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.clientVersion || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.lastOnline
                              ? format(new Date(member.lastOnline), "MMM d, HH:mm")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!member.authorized && (
                                  <DropdownMenuItem
                                    className="text-green-600"
                                    onSelect={() => handleAuthorize(member)}
                                    disabled={updateRemoteNetwork.isPending}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Authorize
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => handleEditMember(member)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Name
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleEditMember(member)}>
                                  <GlobeIcon className="mr-2 h-4 w-4" />
                                  Assign IP
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={() => setMemberToRemove(member)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Network Details Dialog */}
      <Dialog open={!!networkForConfig} onOpenChange={() => setNetworkForConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Network Details</DialogTitle>
            <DialogDescription>
              {networkForConfig?.name || `Network ${networkForConfig?.id.slice(0, 8)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Network ID</Label>
              <code className="block px-3 py-2 bg-muted rounded text-sm font-mono">
                {networkForConfig?.id}
              </code>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Site</Label>
                <p className="text-sm">{networkForConfig?.siteId && getSiteName(networkForConfig.siteId)}</p>
              </div>
              <div className="space-y-2">
                <Label>Workspace</Label>
                <p className="text-sm">{networkForConfig?.workspaceId && getWorkspaceName(networkForConfig.workspaceId)}</p>
              </div>
            </div>
            {networkForConfig?.ipAssignmentPools && networkForConfig.ipAssignmentPools.length > 0 && (
              <div className="space-y-2">
                <Label>IP Assignment Pools</Label>
                <div className="space-y-1">
                  {networkForConfig.ipAssignmentPools.map((pool, i) => (
                    <code key={i} className="block px-3 py-2 bg-muted rounded text-sm font-mono">
                      {pool.ipRangeStart} - {pool.ipRangeEnd}
                    </code>
                  ))}
                </div>
              </div>
            )}
            {networkForConfig?.managedRoutes && networkForConfig.managedRoutes.length > 0 && (
              <div className="space-y-2">
                <Label>Managed Routes</Label>
                <div className="space-y-1">
                  {networkForConfig.managedRoutes.map((route, i) => (
                    <code key={i} className="block px-3 py-2 bg-muted rounded text-sm font-mono">
                      {route.target} {route.via && `via ${route.via}`}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNetworkForConfig(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!memberForEdit} onOpenChange={() => setMemberForEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Device ID: {memberForEdit?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Device Name</Label>
              <Input
                id="member-name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Enter device name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-ip">Assigned IP</Label>
              <Input
                id="member-ip"
                value={memberIP}
                onChange={(e) => setMemberIP(e.target.value)}
                placeholder="Auto-assign if empty"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberForEdit(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveMember}
              disabled={updateRemoteNetwork.isPending}
            >
              {updateRemoteNetwork.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{memberToRemove?.name || memberToRemove?.id}</strong> from the network?
              They will need to be re-authorized to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => memberToRemove && handleDeauthorize(memberToRemove)}
              disabled={updateRemoteNetwork.isPending}
            >
              {updateRemoteNetwork.isPending ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
