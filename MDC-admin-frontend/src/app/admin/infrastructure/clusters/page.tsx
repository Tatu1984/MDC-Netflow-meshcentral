"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Server,
  Cpu,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Settings,
  RefreshCw,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { mockProxmoxClusters, ProxmoxCluster } from "@/stores/mock-data";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  healthy: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
  degraded: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  offline: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
};

export default function ClustersPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [datacenterFilter, setDatacenterFilter] = useState("all");
  const [clusterForDetails, setClusterForDetails] = useState<ProxmoxCluster | null>(null);
  const [clusterToRemove, setClusterToRemove] = useState<ProxmoxCluster | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const handleSync = async (clusterId: string) => {
    setIsSyncing(clusterId);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSyncing(null);
    toast({
      title: "Sync Complete",
      description: "Cluster status has been synchronized",
    });
  };

  const filteredClusters = mockProxmoxClusters.filter((cluster) => {
    const matchesStatus = statusFilter === "all" || cluster.status === statusFilter;
    const matchesDatacenter =
      datacenterFilter === "all" || cluster.datacenterId === datacenterFilter;
    return matchesStatus && matchesDatacenter;
  });

  const totalClusters = mockProxmoxClusters.length;
  const healthyClusters = mockProxmoxClusters.filter((c) => c.status === "healthy").length;
  const totalNodes = mockProxmoxClusters.reduce((sum, c) => sum + c.nodeCount, 0);
  const totalVMs = mockProxmoxClusters.reduce((sum, c) => sum + c.totalVMs, 0);

  const datacenters = Array.from(
    new Set(mockProxmoxClusters.map((c) => JSON.stringify({ id: c.datacenterId, name: c.datacenterName })))
  ).map((s) => JSON.parse(s));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proxmox Clusters</h1>
          <p className="text-muted-foreground">
            Manage virtualization cluster infrastructure
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync All
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Cluster
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clusters</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClusters}</div>
            <p className="text-xs text-muted-foreground">
              {healthyClusters} healthy, {totalClusters - healthyClusters} issues
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNodes}</div>
            <p className="text-xs text-muted-foreground">Physical servers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total VMs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVMs}</div>
            <p className="text-xs text-muted-foreground">Across all clusters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HA Enabled</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockProxmoxClusters.filter((c) => c.ha).length}/{totalClusters}
            </div>
            <p className="text-xs text-muted-foreground">High availability clusters</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        <Select value={datacenterFilter} onValueChange={setDatacenterFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Datacenter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Datacenters</SelectItem>
            {datacenters.map((dc) => (
              <SelectItem key={dc.id} value={dc.id}>
                {dc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clusters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clusters</CardTitle>
          <CardDescription>
            Proxmox VE clusters across all datacenters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cluster</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datacenter</TableHead>
                <TableHead>Nodes</TableHead>
                <TableHead>CPU Usage</TableHead>
                <TableHead>Memory Usage</TableHead>
                <TableHead>Storage Usage</TableHead>
                <TableHead>VMs</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClusters.map((cluster) => {
                const StatusIcon = statusConfig[cluster.status].icon;
                const cpuPercent = Math.round((cluster.usedCpu / cluster.totalCpu) * 100);
                const memPercent = Math.round((cluster.usedMemory / cluster.totalMemory) * 100);
                const storagePercent = Math.round((cluster.usedStorage / cluster.totalStorage) * 100);

                return (
                  <TableRow key={cluster.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cluster.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Proxmox VE {cluster.version}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${statusConfig[cluster.status].color}`} />
                        <Badge
                          variant={
                            cluster.status === "healthy"
                              ? "default"
                              : cluster.status === "degraded"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {cluster.status}
                        </Badge>
                        {cluster.quorum && (
                          <Badge variant="outline" className="text-xs">
                            Quorum
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cluster.datacenterName}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{cluster.nodeCount}</span>
                    </TableCell>
                    <TableCell>
                      <div className="w-24 space-y-1">
                        <Progress
                          value={cpuPercent}
                          className={cpuPercent > 80 ? "[&>div]:bg-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                          {cluster.usedCpu}/{cluster.totalCpu} cores ({cpuPercent}%)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-24 space-y-1">
                        <Progress
                          value={memPercent}
                          className={memPercent > 80 ? "[&>div]:bg-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                          {Math.round(cluster.usedMemory / 1024)}/{Math.round(cluster.totalMemory / 1024)} TB ({memPercent}%)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-24 space-y-1">
                        <Progress value={storagePercent} />
                        <p className="text-xs text-muted-foreground">
                          {Math.round(cluster.usedStorage / 1000)}/{Math.round(cluster.totalStorage / 1000)} TB ({storagePercent}%)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cluster.runningVMs}/{cluster.totalVMs}</p>
                        <p className="text-xs text-muted-foreground">running</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setClusterForDetails(cluster)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => window.location.href = `/admin/infrastructure/nodes?cluster=${cluster.id}`}>
                            <Server className="mr-2 h-4 w-4" />
                            Manage Nodes
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toast({ title: "Configure", description: `Opening configuration for ${cluster.name}` })}>
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleSync(cluster.id)} disabled={isSyncing === cluster.id}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing === cluster.id ? "animate-spin" : ""}`} />
                            {isSyncing === cluster.id ? "Syncing..." : "Sync Status"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onSelect={() => setClusterToRemove(cluster)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Cluster
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={!!clusterForDetails} onOpenChange={() => setClusterForDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{clusterForDetails?.name}</DialogTitle>
            <DialogDescription>
              Proxmox VE {clusterForDetails?.version} - {clusterForDetails?.datacenterName}
            </DialogDescription>
          </DialogHeader>
          {clusterForDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        clusterForDetails.status === "healthy"
                          ? "default"
                          : clusterForDetails.status === "degraded"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {clusterForDetails.status}
                    </Badge>
                    {clusterForDetails.quorum && (
                      <Badge variant="outline">Quorum</Badge>
                    )}
                    {clusterForDetails.ha && (
                      <Badge variant="outline">HA</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nodes</Label>
                  <p className="font-medium">{clusterForDetails.nodeCount}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">VMs</Label>
                  <p className="font-medium">{clusterForDetails.runningVMs}/{clusterForDetails.totalVMs} running</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium">Resource Utilization</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU</span>
                    <span className="font-medium">{clusterForDetails.usedCpu}/{clusterForDetails.totalCpu} cores</span>
                  </div>
                  <Progress value={(clusterForDetails.usedCpu / clusterForDetails.totalCpu) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory</span>
                    <span className="font-medium">{Math.round(clusterForDetails.usedMemory / 1024)}/{Math.round(clusterForDetails.totalMemory / 1024)} TB</span>
                  </div>
                  <Progress value={(clusterForDetails.usedMemory / clusterForDetails.totalMemory) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Storage</span>
                    <span className="font-medium">{Math.round(clusterForDetails.usedStorage / 1000)}/{Math.round(clusterForDetails.totalStorage / 1000)} TB</span>
                  </div>
                  <Progress value={(clusterForDetails.usedStorage / clusterForDetails.totalStorage) * 100} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClusterForDetails(null)}>
              Close
            </Button>
            <Button onClick={() => window.location.href = `/admin/infrastructure/nodes?cluster=${clusterForDetails?.id}`}>
              <Server className="mr-2 h-4 w-4" />
              Manage Nodes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Cluster Confirmation */}
      <AlertDialog open={!!clusterToRemove} onOpenChange={() => setClusterToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Cluster?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{clusterToRemove?.name}</strong> from management?
              This will not delete the actual Proxmox cluster, but will remove it from this dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Cluster Removed",
                  description: `${clusterToRemove?.name} has been removed from management`,
                  variant: "destructive",
                });
                setClusterToRemove(null);
              }}
            >
              Remove Cluster
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
