"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Server,
  Cpu,
  HardDrive,
  Network,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Wrench,
  Power,
  RefreshCw,
  Terminal,
  Loader2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSites, useWorkspaces } from "@/lib/mdc";
import { SiteNode } from "@/lib/mdc/types";
import { Search } from "lucide-react";

// Extended node type that includes site information
interface ExtendedNode extends SiteNode {
  siteId: string;
  siteName: string;
}

const statusConfig = {
  online: { icon: CheckCircle, color: "text-green-500", variant: "default" as const },
  offline: { icon: XCircle, color: "text-red-500", variant: "destructive" as const },
  maintenance: { icon: Wrench, color: "text-yellow-500", variant: "secondary" as const },
  unknown: { icon: AlertCircle, color: "text-gray-500", variant: "outline" as const },
};

function getNodeStatus(node: SiteNode | null): "online" | "offline" | "maintenance" | "unknown" {
  if (!node) return "unknown";
  if (node.online) return "online";
  if (node.configured === false) return "maintenance";
  if (!node.online) return "offline";
  return "unknown";
}

export default function NodesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Fetch real data from MDC API
  const { data: sites, isLoading: sitesLoading, error: sitesError, refetch: refetchSites } = useSites();
  const { data: workspaces } = useWorkspaces();

  // Dialog states
  const [nodeForConsole, setNodeForConsole] = useState<ExtendedNode | null>(null);
  const [nodeForIPMI, setNodeForIPMI] = useState<ExtendedNode | null>(null);
  const [nodeForVMs, setNodeForVMs] = useState<ExtendedNode | null>(null);
  const [nodeForMaintenance, setNodeForMaintenance] = useState<ExtendedNode | null>(null);
  const [nodeForPower, setNodeForPower] = useState<ExtendedNode | null>(null);
  const [nodeToRemove, setNodeToRemove] = useState<ExtendedNode | null>(null);
  const [addNodeOpen, setAddNodeOpen] = useState(false);

  // Form states
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeIP, setNewNodeIP] = useState("");
  const [newNodeSite, setNewNodeSite] = useState("");
  const [powerAction, setPowerAction] = useState("");

  // Extract all nodes from all sites with site info attached
  const allNodes: ExtendedNode[] = sites?.flatMap(site =>
    (site.nodes || []).map(node => ({
      ...node,
      siteId: site.id,
      siteName: site.name,
    }))
  ) || [];

  // Filter nodes
  const filteredNodes = allNodes.filter((node) => {
    const matchesSearch = node.name.toLowerCase().includes(search.toLowerCase());
    const nodeStatus = getNodeStatus(node);
    const matchesStatus = statusFilter === "all" || nodeStatus === statusFilter;
    const matchesSite = siteFilter === "all" || node.siteId === siteFilter;
    return matchesSearch && matchesStatus && matchesSite;
  });

  // Calculate totals
  const totalNodes = allNodes.length;
  const onlineNodes = allNodes.filter((n) => n.online).length;
  const totalCores = allNodes.reduce((sum, n) => sum + (n.cpuInfo?.cores || 0) * (n.cpuInfo?.sockets || 1), 0);
  const totalCPUs = allNodes.reduce((sum, n) => sum + (n.cpuInfo?.cpUs || 0), 0);

  // Count VMs across all workspaces
  const totalVMs = workspaces?.reduce((sum, ws) => sum + (ws.virtualMachines?.length || 0), 0) || 0;

  const handleRefreshAll = async () => {
    setIsLoading("refresh");
    await refetchSites();
    setIsLoading(null);
    toast({
      title: "Nodes Refreshed",
      description: "All node data has been refreshed from Proxmox sites",
    });
  };

  const handleAddNode = async () => {
    if (!newNodeName || !newNodeIP || !newNodeSite) return;
    setIsLoading("add");
    // Note: Adding nodes requires Proxmox cluster operations - not yet implemented in API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(null);
    toast({
      title: "Feature Coming Soon",
      description: "Adding nodes requires Proxmox cluster operations. Use Proxmox UI for now.",
      variant: "destructive",
    });
    setAddNodeOpen(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleMaintenance = async (enter: boolean) => {
    if (!nodeForMaintenance) return;
    setIsLoading("maintenance");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(null);
    toast({
      title: "Feature Coming Soon",
      description: "Maintenance mode operations are not yet implemented in the API",
    });
    setNodeForMaintenance(null);
  };

  const handlePowerAction = async () => {
    if (!nodeForPower || !powerAction) return;
    setIsLoading("power");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(null);
    toast({
      title: "Feature Coming Soon",
      description: "Power actions require IPMI/BMC integration",
    });
    setNodeForPower(null);
    setPowerAction("");
  };

  const handleRemove = async () => {
    if (!nodeToRemove) return;
    setIsLoading("remove");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(null);
    toast({
      title: "Feature Coming Soon",
      description: "Node removal requires Proxmox cluster operations. Use Proxmox UI for now.",
      variant: "destructive",
    });
    setNodeToRemove(null);
  };

  // Loading state
  if (sitesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Physical Nodes</h1>
            <p className="text-muted-foreground">Loading node data from Proxmox sites...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading nodes from MDC API...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (sitesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Physical Nodes</h1>
            <p className="text-muted-foreground">Manage physical server infrastructure</p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold">Failed to load nodes</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {sitesError.message || "Could not connect to MDC API"}
                </p>
              </div>
              <Button onClick={() => refetchSites()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Physical Nodes</h1>
          <p className="text-muted-foreground">
            Manage physical server infrastructure across {sites?.length || 0} Proxmox sites
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={isLoading === "refresh"}
          >
            {isLoading === "refresh" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh All
          </Button>
          <Button onClick={() => setAddNodeOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Node
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNodes}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">{onlineNodes} online</span>
              {totalNodes - onlineNodes > 0 && (
                <span className="text-red-500 ml-2">{totalNodes - onlineNodes} offline</span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CPU Cores</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCores}</div>
            <p className="text-xs text-muted-foreground">{totalCPUs} logical CPUs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proxmox Sites</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sites?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Datacenter clusters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaces?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active workspaces</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total VMs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVMs}</div>
            <p className="text-xs text-muted-foreground">Virtual machines</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by node name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sites?.map((site) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nodes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Nodes</CardTitle>
          <CardDescription>
            Physical servers across all Proxmox sites ({filteredNodes.length} nodes)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No nodes found</p>
              <p className="text-sm">
                {allNodes.length === 0
                  ? "No Proxmox sites have been registered yet"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>CPU Info</TableHead>
                  <TableHead>Authorized</TableHead>
                  <TableHead>Configured</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNodes.map((node, index) => {
                  const status = getNodeStatus(node);
                  const StatusIcon = statusConfig[status].icon;

                  return (
                    <TableRow key={`${node.siteId}-${node.name}-${index}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{node.name}</p>
                          {node.cpuInfo && (
                            <p className="text-xs text-muted-foreground">
                              {node.cpuInfo.model}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${statusConfig[status].color}`} />
                          <Badge variant={statusConfig[status].variant}>
                            {status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {node.siteName}
                        </span>
                      </TableCell>
                      <TableCell>
                        {node.cpuInfo ? (
                          <div className="text-sm">
                            <p>{node.cpuInfo.sockets} socket(s) × {node.cpuInfo.cores} cores</p>
                            <p className="text-xs text-muted-foreground">
                              {node.cpuInfo.cpUs} CPUs @ {node.cpuInfo.mhz?.toFixed(0) || "N/A"} MHz
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {node.authorized ? (
                          <Badge variant="default">Yes</Badge>
                        ) : node.authorized === false ? (
                          <Badge variant="destructive">No</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {node.configured ? (
                          <Badge variant="default">Yes</Badge>
                        ) : node.configured === false ? (
                          <Badge variant="secondary">No</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setNodeForConsole(node)}>
                              <Terminal className="mr-2 h-4 w-4" />
                              SSH Console
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setNodeForIPMI(node)}>
                              <Network className="mr-2 h-4 w-4" />
                              IPMI Console
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setNodeForVMs(node)}>
                              <Server className="mr-2 h-4 w-4" />
                              View Workspaces
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {status === "online" ? (
                              <DropdownMenuItem onSelect={() => setNodeForMaintenance(node)}>
                                <Wrench className="mr-2 h-4 w-4" />
                                Enter Maintenance
                              </DropdownMenuItem>
                            ) : status === "maintenance" ? (
                              <DropdownMenuItem onSelect={() => setNodeForMaintenance(node)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Exit Maintenance
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onSelect={() => setNodeForPower(node)}>
                              <Power className="mr-2 h-4 w-4" />
                              Power Actions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => setNodeToRemove(node)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove from Cluster
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

      {/* Add Node Dialog */}
      <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Node</DialogTitle>
            <DialogDescription>
              Add a new physical server to a Proxmox site
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
              <p className="font-medium text-yellow-600">Note</p>
              <p className="text-muted-foreground mt-1">
                Adding nodes to a Proxmox cluster requires direct cluster operations.
                Use the Proxmox web UI for now.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-name">Node Name</Label>
              <Input
                id="node-name"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="pve-node-04"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-ip">IP Address</Label>
              <Input
                id="node-ip"
                value={newNodeIP}
                onChange={(e) => setNewNodeIP(e.target.value)}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label>Site</Label>
              <Select value={newNodeSite} onValueChange={setNewNodeSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNodeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNode}
              disabled={!newNodeName || !newNodeIP || !newNodeSite || isLoading === "add"}
            >
              {isLoading === "add" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Node"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SSH Console Dialog */}
      <Dialog open={!!nodeForConsole} onOpenChange={() => setNodeForConsole(null)}>
        <DialogContent className="max-w-4xl h-[600px]">
          <DialogHeader>
            <DialogTitle>SSH Console - {nodeForConsole?.name}</DialogTitle>
            <DialogDescription>
              Terminal access to {nodeForConsole?.siteName} / {nodeForConsole?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-black rounded-lg p-4 font-mono text-green-400 text-sm overflow-auto h-[450px]">
            <div>$ ssh root@{nodeForConsole?.name}</div>
            <div className="mt-2">Last login: {new Date().toLocaleString()}</div>
            <div className="mt-2">
              <span className="text-blue-400">root@{nodeForConsole?.name}</span>
              <span className="text-white">:~# </span>
              <span className="animate-pulse">_</span>
            </div>
            <div className="mt-4 text-yellow-500 text-xs">
              Note: SSH console access requires integration with ZT Bridge Guacamole.
              Use the Guacamole web UI at /guacamole/ for now.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* IPMI Console Dialog */}
      <Dialog open={!!nodeForIPMI} onOpenChange={() => setNodeForIPMI(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>IPMI Console</DialogTitle>
            <DialogDescription>
              Out-of-band management for {nodeForIPMI?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Node</span>
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  {nodeForIPMI?.name}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site</span>
                <span>{nodeForIPMI?.siteName}</span>
              </div>
            </div>
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">
              <p className="text-muted-foreground">
                IPMI/BMC console access requires direct network access to the server&apos;s
                management interface. This feature is not yet integrated.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeForIPMI(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Workspaces Dialog */}
      <Dialog open={!!nodeForVMs} onOpenChange={() => setNodeForVMs(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workspaces on {nodeForVMs?.siteName}</DialogTitle>
            <DialogDescription>
              Workspaces running on this site
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[400px] overflow-y-auto">
            {workspaces
              ?.filter(ws => sites?.find(s => s.id === ws.siteId)?.id === nodeForVMs?.siteId)
              .map((ws) => (
                <div key={ws.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{ws.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ws.virtualMachines?.length || 0} VMs / {ws.virtualNetworks?.length || 0} Networks
                      </p>
                    </div>
                  </div>
                  <Badge variant={ws.locked ? "secondary" : "default"}>
                    {ws.locked ? "Locked" : "Active"}
                  </Badge>
                </div>
              )) || (
              <div className="text-center py-4 text-muted-foreground">
                No workspaces on this site
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeForVMs(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Mode Confirmation */}
      <AlertDialog open={!!nodeForMaintenance} onOpenChange={() => setNodeForMaintenance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {getNodeStatus(nodeForMaintenance!) === "online" ? "Enter Maintenance Mode?" : "Exit Maintenance Mode?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getNodeStatus(nodeForMaintenance!) === "online"
                ? `This will migrate all VMs off ${nodeForMaintenance?.name} and prevent new VMs from being scheduled.`
                : `This will bring ${nodeForMaintenance?.name} back online and allow VMs to be scheduled.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleMaintenance(getNodeStatus(nodeForMaintenance!) === "online")}
              disabled={isLoading === "maintenance"}
            >
              {isLoading === "maintenance" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : getNodeStatus(nodeForMaintenance!) === "online" ? (
                "Enter Maintenance"
              ) : (
                "Exit Maintenance"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Power Actions Dialog */}
      <Dialog open={!!nodeForPower} onOpenChange={() => setNodeForPower(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Power Actions</DialogTitle>
            <DialogDescription>
              Control power state for {nodeForPower?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={powerAction} onValueChange={setPowerAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restart">Restart (Graceful)</SelectItem>
                  <SelectItem value="shutdown">Shutdown (Graceful)</SelectItem>
                  <SelectItem value="power-cycle">Power Cycle (Hard)</SelectItem>
                  <SelectItem value="power-off">Power Off (Hard)</SelectItem>
                  <SelectItem value="power-on">Power On</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Warning:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Hard power actions may cause data loss</li>
                <li>VMs will be affected by node power changes</li>
                <li>Consider entering maintenance mode first</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNodeForPower(null)}>
              Cancel
            </Button>
            <Button
              onClick={handlePowerAction}
              disabled={!powerAction || isLoading === "power"}
              variant={powerAction?.includes("power-off") ? "destructive" : "default"}
            >
              {isLoading === "power" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                "Execute"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Cluster Confirmation */}
      <AlertDialog open={!!nodeToRemove} onOpenChange={() => setNodeToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Node from Cluster?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{nodeToRemove?.name}</strong> from the cluster?
              All VMs must be migrated off this node first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading === "remove"}
            >
              {isLoading === "remove" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Node"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
