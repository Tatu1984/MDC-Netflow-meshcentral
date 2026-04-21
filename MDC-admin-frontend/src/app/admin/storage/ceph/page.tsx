"use client";

import { useState } from "react";
import {
  HardDrive,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  MoreHorizontal,
  Database,
  Gauge,
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface CephCluster {
  id: string;
  name: string;
  datacenter: string;
  status: string;
  statusDetail?: string;
  version: string;
  mons: number;
  mgrs: number;
  osds: number;
  osdsUp: number;
  osdsIn: number;
  pgs: number;
  pgActive: number;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  iops: number;
  throughput: number;
  pools: number;
  objects: number;
}

interface OSD {
  id: number;
  name: string;
  host: string;
  status: string;
  weight: number;
  reweight: number;
  size: number;
  used: number;
  utilization: number;
  class: string;
}

// Mock Ceph clusters
const cephClusters = [
  {
    id: "ceph-001",
    name: "ceph-east-primary",
    datacenter: "US-East Primary",
    status: "HEALTH_OK",
    version: "18.2.0 (Reef)",
    mons: 3,
    mgrs: 2,
    osds: 48,
    osdsUp: 48,
    osdsIn: 48,
    pgs: 256,
    pgActive: 256,
    totalCapacity: 480000,
    usedCapacity: 312000,
    availableCapacity: 168000,
    iops: 45200,
    throughput: 2.8,
    pools: 8,
    objects: 15420000,
  },
  {
    id: "ceph-002",
    name: "ceph-west-primary",
    datacenter: "US-West Primary",
    status: "HEALTH_WARN",
    statusDetail: "1 OSD near full",
    version: "18.2.0 (Reef)",
    mons: 3,
    mgrs: 2,
    osds: 36,
    osdsUp: 36,
    osdsIn: 36,
    pgs: 192,
    pgActive: 192,
    totalCapacity: 360000,
    usedCapacity: 288000,
    availableCapacity: 72000,
    iops: 32100,
    throughput: 2.1,
    pools: 6,
    objects: 10890000,
  },
  {
    id: "ceph-003",
    name: "ceph-eu-primary",
    datacenter: "EU-West Primary",
    status: "HEALTH_OK",
    version: "18.1.2 (Reef)",
    mons: 3,
    mgrs: 2,
    osds: 24,
    osdsUp: 24,
    osdsIn: 24,
    pgs: 128,
    pgActive: 128,
    totalCapacity: 240000,
    usedCapacity: 120000,
    availableCapacity: 120000,
    iops: 18500,
    throughput: 1.4,
    pools: 5,
    objects: 5230000,
  },
];

// Mock OSDs
const mockOSDs = [
  { id: 0, name: "osd.0", host: "ceph-node-01", status: "up", weight: 1.0, reweight: 1.0, size: 10000, used: 6500, utilization: 65, class: "ssd" },
  { id: 1, name: "osd.1", host: "ceph-node-01", status: "up", weight: 1.0, reweight: 1.0, size: 10000, used: 7200, utilization: 72, class: "ssd" },
  { id: 2, name: "osd.2", host: "ceph-node-02", status: "up", weight: 1.0, reweight: 1.0, size: 10000, used: 5800, utilization: 58, class: "ssd" },
  { id: 3, name: "osd.3", host: "ceph-node-02", status: "up", weight: 1.0, reweight: 1.0, size: 10000, used: 8900, utilization: 89, class: "ssd" },
  { id: 4, name: "osd.4", host: "ceph-node-03", status: "down", weight: 1.0, reweight: 0, size: 10000, used: 0, utilization: 0, class: "ssd" },
];

const statusConfig = {
  HEALTH_OK: { icon: CheckCircle, color: "text-green-500", variant: "default" as const },
  HEALTH_WARN: { icon: AlertTriangle, color: "text-yellow-500", variant: "secondary" as const },
  HEALTH_ERR: { icon: XCircle, color: "text-red-500", variant: "destructive" as const },
};

export default function CephPage() {
  const { toast } = useToast();
  const [clusterForConfig, setClusterForConfig] = useState<CephCluster | null>(null);
  const [clusterForHealth, setClusterForHealth] = useState<CephCluster | null>(null);
  const [osdForDetails, setOsdForDetails] = useState<OSD | null>(null);
  const [osdForReweight, setOsdForReweight] = useState<OSD | null>(null);
  const [osdToRemove, setOsdToRemove] = useState<OSD | null>(null);
  const [reweightValue, setReweightValue] = useState("1.0");

  const totalCapacity = cephClusters.reduce((sum, c) => sum + c.totalCapacity, 0);
  const usedCapacity = cephClusters.reduce((sum, c) => sum + c.usedCapacity, 0);
  const totalOSDs = cephClusters.reduce((sum, c) => sum + c.osds, 0);
  const totalIOPS = cephClusters.reduce((sum, c) => sum + c.iops, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ceph Clusters</h1>
          <p className="text-muted-foreground">
            Distributed storage cluster management
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Status
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalCapacity / 1000).toFixed(0)} TB</div>
            <Progress value={(usedCapacity / totalCapacity) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((usedCapacity / totalCapacity) * 100)}% used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total OSDs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOSDs}</div>
            <p className="text-xs text-muted-foreground">
              {cephClusters.reduce((sum, c) => sum + c.osdsUp, 0)} up, {cephClusters.reduce((sum, c) => sum + c.osdsIn, 0)} in
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IOPS</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalIOPS / 1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground">Across all clusters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cluster Health</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cephClusters.filter((c) => c.status === "HEALTH_OK").length}/{cephClusters.length}
            </div>
            <p className="text-xs text-muted-foreground">Clusters healthy</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clusters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clusters">Clusters</TabsTrigger>
          <TabsTrigger value="osds">OSDs</TabsTrigger>
        </TabsList>

        <TabsContent value="clusters" className="space-y-4">
          <div className="grid gap-4">
            {cephClusters.map((cluster) => {
              const StatusIcon = statusConfig[cluster.status as keyof typeof statusConfig].icon;
              const usagePercent = Math.round((cluster.usedCapacity / cluster.totalCapacity) * 100);

              return (
                <Card key={cluster.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <Database className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {cluster.name}
                            <Badge
                              variant={statusConfig[cluster.status as keyof typeof statusConfig].variant}
                              className="flex items-center gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {cluster.status.replace("HEALTH_", "")}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {cluster.datacenter} | {cluster.version}
                            {cluster.statusDetail && (
                              <span className="text-yellow-500 ml-2">- {cluster.statusDetail}</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setClusterForConfig(cluster)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toast({ title: "Dashboard", description: `Opening dashboard for ${cluster.name}` })}>
                            <Activity className="mr-2 h-4 w-4" />
                            View Dashboard
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setClusterForHealth(cluster)}>
                            <Gauge className="mr-2 h-4 w-4" />
                            Health Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => toast({ title: "Scrub Started", description: `Initiated deep scrub on all OSDs in ${cluster.name}` })}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Scrub All
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-5">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Storage</p>
                        <Progress value={usagePercent} className={usagePercent > 80 ? "[&>div]:bg-red-500" : ""} />
                        <p className="text-sm">
                          {(cluster.usedCapacity / 1000).toFixed(0)} / {(cluster.totalCapacity / 1000).toFixed(0)} TB
                          <span className="text-muted-foreground ml-1">({usagePercent}%)</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">MONs / MGRs</p>
                        <p className="text-xl font-medium">{cluster.mons} / {cluster.mgrs}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">OSDs (up/in)</p>
                        <p className="text-xl font-medium">
                          {cluster.osdsUp}/{cluster.osdsIn}/{cluster.osds}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">IOPS / Throughput</p>
                        <p className="text-xl font-medium">
                          {(cluster.iops / 1000).toFixed(1)}K / {cluster.throughput} GB/s
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pools / Objects</p>
                        <p className="text-xl font-medium">
                          {cluster.pools} / {(cluster.objects / 1000000).toFixed(1)}M
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="osds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OSD Status</CardTitle>
              <CardDescription>Object Storage Daemon status across clusters</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OSD</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOSDs.map((osd) => (
                    <TableRow key={osd.id}>
                      <TableCell className="font-medium">{osd.name}</TableCell>
                      <TableCell className="text-muted-foreground">{osd.host}</TableCell>
                      <TableCell>
                        <Badge variant={osd.status === "up" ? "default" : "destructive"}>
                          {osd.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{osd.class}</Badge>
                      </TableCell>
                      <TableCell>{osd.weight.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="w-24 space-y-1">
                          <Progress
                            value={osd.utilization}
                            className={osd.utilization > 85 ? "[&>div]:bg-red-500" : osd.utilization > 70 ? "[&>div]:bg-yellow-500" : ""}
                          />
                          <p className="text-xs text-muted-foreground">{osd.utilization}%</p>
                        </div>
                      </TableCell>
                      <TableCell>{(osd.size / 1000).toFixed(0)} TB</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setOsdForDetails(osd)}>
                              <Activity className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => { setOsdForReweight(osd); setReweightValue(osd.reweight.toString()); }}>
                              <Settings className="mr-2 h-4 w-4" />
                              Reweight
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => toast({ title: "OSD Marked Out", description: `${osd.name} has been marked out` })}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Mark Out
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => setOsdToRemove(osd)}>
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              Remove OSD
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cluster Config Dialog */}
      <Dialog open={!!clusterForConfig} onOpenChange={() => setClusterForConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Cluster</DialogTitle>
            <DialogDescription>{clusterForConfig?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Datacenter</Label>
                <p className="font-medium">{clusterForConfig?.datacenter}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Version</Label>
                <p className="font-medium">{clusterForConfig?.version}</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Advanced configuration options would be available here. In production,
                this would connect to the Ceph cluster for live configuration.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClusterForConfig(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cluster Health Dialog */}
      <Dialog open={!!clusterForHealth} onOpenChange={() => setClusterForHealth(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{clusterForHealth?.name} Health</DialogTitle>
            <DialogDescription>Detailed health status</DialogDescription>
          </DialogHeader>
          {clusterForHealth && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                {clusterForHealth.status === "HEALTH_OK" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : clusterForHealth.status === "HEALTH_WARN" ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium text-lg">{clusterForHealth.status}</span>
                {clusterForHealth.statusDetail && (
                  <span className="text-muted-foreground">- {clusterForHealth.statusDetail}</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">MONs</p>
                  <p className="text-xl font-medium">{clusterForHealth.mons}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MGRs</p>
                  <p className="text-xl font-medium">{clusterForHealth.mgrs}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">OSDs</p>
                  <p className="text-xl font-medium">{clusterForHealth.osdsUp}/{clusterForHealth.osds}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PGs</p>
                  <p className="text-xl font-medium">{clusterForHealth.pgActive}/{clusterForHealth.pgs}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClusterForHealth(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OSD Details Dialog */}
      <Dialog open={!!osdForDetails} onOpenChange={() => setOsdForDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{osdForDetails?.name}</DialogTitle>
            <DialogDescription>OSD Details</DialogDescription>
          </DialogHeader>
          {osdForDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Host</Label>
                  <p className="font-medium">{osdForDetails.host}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={osdForDetails.status === "up" ? "default" : "destructive"}>
                    {osdForDetails.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Device Class</Label>
                  <p className="font-medium uppercase">{osdForDetails.class}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Weight</Label>
                  <p className="font-medium">{osdForDetails.weight.toFixed(2)}</p>
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-muted-foreground">Utilization</Label>
                <Progress value={osdForDetails.utilization} />
                <p className="text-sm">
                  {(osdForDetails.used / 1000).toFixed(1)} / {(osdForDetails.size / 1000).toFixed(1)} TB
                  ({osdForDetails.utilization}%)
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOsdForDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OSD Reweight Dialog */}
      <Dialog open={!!osdForReweight} onOpenChange={() => setOsdForReweight(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reweight {osdForReweight?.name}</DialogTitle>
            <DialogDescription>Adjust the CRUSH weight for this OSD</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reweight">Reweight Value (0.0 - 1.0)</Label>
              <Input
                id="reweight"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={reweightValue}
                onChange={(e) => setReweightValue(e.target.value)}
              />
            </div>
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Lowering the reweight will cause data to migrate away from this OSD.
                Set to 0 to completely drain the OSD.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOsdForReweight(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "OSD Reweighted", description: `${osdForReweight?.name} reweight set to ${reweightValue}` });
              setOsdForReweight(null);
            }}>
              Apply Reweight
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove OSD Confirmation */}
      <AlertDialog open={!!osdToRemove} onOpenChange={() => setOsdToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove OSD?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{osdToRemove?.name}</strong>?
              This will begin data migration and permanently remove the OSD from the cluster.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "OSD Removal Started",
                  description: `${osdToRemove?.name} is being removed from the cluster`,
                  variant: "destructive",
                });
                setOsdToRemove(null);
              }}
            >
              Remove OSD
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
