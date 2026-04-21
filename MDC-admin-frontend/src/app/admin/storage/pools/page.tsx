"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  HardDrive,
  Database,
  Settings,
  Trash2,
  Edit,
  Copy,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Search, BarChart3 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface StoragePool {
  id: string;
  name: string;
  cluster: string;
  type: string;
  size: number;
  minSize: number;
  pgNum: number;
  totalCapacity: number;
  usedCapacity: number;
  objects: number;
  application: string;
  crushRule: string;
  compression: string;
  quotaMaxBytes: number;
  quotaMaxObjects: number;
}

// Mock storage pools
const mockStoragePools = [
  {
    id: "pool-001",
    name: "vm-images",
    cluster: "ceph-east-primary",
    type: "replicated",
    size: 3,
    minSize: 2,
    pgNum: 64,
    totalCapacity: 50000,
    usedCapacity: 32500,
    objects: 1250,
    application: "rbd",
    crushRule: "replicated_rule",
    compression: "lz4",
    quotaMaxBytes: 0,
    quotaMaxObjects: 0,
  },
  {
    id: "pool-002",
    name: "vm-volumes",
    cluster: "ceph-east-primary",
    type: "replicated",
    size: 3,
    minSize: 2,
    pgNum: 128,
    totalCapacity: 100000,
    usedCapacity: 78000,
    objects: 4520,
    application: "rbd",
    crushRule: "replicated_rule",
    compression: "none",
    quotaMaxBytes: 0,
    quotaMaxObjects: 0,
  },
  {
    id: "pool-003",
    name: "object-store",
    cluster: "ceph-east-primary",
    type: "erasure",
    size: 0,
    minSize: 0,
    pgNum: 256,
    ecProfile: "ec-4-2",
    totalCapacity: 200000,
    usedCapacity: 125000,
    objects: 15420000,
    application: "rgw",
    crushRule: "erasure_rule",
    compression: "zstd",
    quotaMaxBytes: 0,
    quotaMaxObjects: 0,
  },
  {
    id: "pool-004",
    name: "backup-archive",
    cluster: "ceph-west-primary",
    type: "erasure",
    size: 0,
    minSize: 0,
    pgNum: 128,
    ecProfile: "ec-8-3",
    totalCapacity: 150000,
    usedCapacity: 89000,
    objects: 892000,
    application: "rbd",
    crushRule: "erasure_rule",
    compression: "zstd",
    quotaMaxBytes: 200000000000000,
    quotaMaxObjects: 0,
  },
  {
    id: "pool-005",
    name: "cephfs-data",
    cluster: "ceph-east-primary",
    type: "replicated",
    size: 3,
    minSize: 2,
    pgNum: 64,
    totalCapacity: 80000,
    usedCapacity: 45000,
    objects: 2890000,
    application: "cephfs",
    crushRule: "replicated_rule",
    compression: "lz4",
    quotaMaxBytes: 0,
    quotaMaxObjects: 0,
  },
  {
    id: "pool-006",
    name: "cephfs-metadata",
    cluster: "ceph-east-primary",
    type: "replicated",
    size: 3,
    minSize: 2,
    pgNum: 32,
    totalCapacity: 10000,
    usedCapacity: 1200,
    objects: 125000,
    application: "cephfs",
    crushRule: "ssd_rule",
    compression: "none",
    quotaMaxBytes: 0,
    quotaMaxObjects: 0,
  },
];

const applicationColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  rbd: "default",
  rgw: "secondary",
  cephfs: "outline",
};

export default function PoolsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [clusterFilter, setClusterFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [poolForEdit, setPoolForEdit] = useState<StoragePool | null>(null);
  const [poolForQuota, setPoolForQuota] = useState<StoragePool | null>(null);
  const [poolToDelete, setPoolToDelete] = useState<StoragePool | null>(null);
  const [quotaBytes, setQuotaBytes] = useState("");
  const [quotaObjects, setQuotaObjects] = useState("");

  const filteredPools = mockStoragePools.filter((pool) => {
    const matchesSearch = pool.name.toLowerCase().includes(search.toLowerCase());
    const matchesCluster = clusterFilter === "all" || pool.cluster === clusterFilter;
    return matchesSearch && matchesCluster;
  });

  const totalCapacity = mockStoragePools.reduce((sum, p) => sum + p.totalCapacity, 0);
  const usedCapacity = mockStoragePools.reduce((sum, p) => sum + p.usedCapacity, 0);

  const clusters = Array.from(new Set(mockStoragePools.map((p) => p.cluster)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Storage Pools</h1>
          <p className="text-muted-foreground">
            Manage Ceph storage pools and quotas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Pool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Storage Pool</DialogTitle>
              <DialogDescription>
                Create a new Ceph storage pool
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Pool Name</Label>
                <Input id="name" placeholder="my-pool" />
              </div>
              <div className="grid gap-2">
                <Label>Cluster</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cluster" />
                  </SelectTrigger>
                  <SelectContent>
                    {clusters.map((cluster) => (
                      <SelectItem key={cluster} value={cluster}>
                        {cluster}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Pool Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replicated">Replicated (3x)</SelectItem>
                    <SelectItem value="erasure">Erasure Coded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pg">PG Count</Label>
                  <Input id="pg" type="number" placeholder="128" />
                </div>
                <div className="grid gap-2">
                  <Label>Application</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rbd">RBD (Block)</SelectItem>
                      <SelectItem value="rgw">RGW (Object)</SelectItem>
                      <SelectItem value="cephfs">CephFS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Create Pool</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pools</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStoragePools.length}</div>
            <p className="text-xs text-muted-foreground">Across all clusters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalCapacity / 1000).toFixed(0)} TB</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((usedCapacity / totalCapacity) * 100)}% used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replicated</CardTitle>
            <Copy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockStoragePools.filter((p) => p.type === "replicated").length}
            </div>
            <p className="text-xs text-muted-foreground">3x replication</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erasure Coded</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockStoragePools.filter((p) => p.type === "erasure").length}
            </div>
            <p className="text-xs text-muted-foreground">Space efficient</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={clusterFilter} onValueChange={setClusterFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Cluster" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clusters</SelectItem>
            {clusters.map((cluster) => (
              <SelectItem key={cluster} value={cluster}>
                {cluster}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pools Table */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Pools</CardTitle>
          <CardDescription>
            Ceph pools for block, object, and file storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pool Name</TableHead>
                <TableHead>Cluster</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>PGs</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Objects</TableHead>
                <TableHead>Compression</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPools.map((pool) => {
                const usagePercent = Math.round((pool.usedCapacity / pool.totalCapacity) * 100);
                return (
                  <TableRow key={pool.id}>
                    <TableCell className="font-medium">{pool.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {pool.cluster}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {pool.type === "replicated" ? `${pool.size}x rep` : pool.ecProfile}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={applicationColors[pool.application as keyof typeof applicationColors]}>
                        {pool.application}
                      </Badge>
                    </TableCell>
                    <TableCell>{pool.pgNum}</TableCell>
                    <TableCell>
                      <div className="w-28 space-y-1">
                        <Progress
                          value={usagePercent}
                          className={usagePercent > 80 ? "[&>div]:bg-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                          {(pool.usedCapacity / 1000).toFixed(0)}/{(pool.totalCapacity / 1000).toFixed(0)} TB
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pool.objects > 1000000
                        ? `${(pool.objects / 1000000).toFixed(1)}M`
                        : pool.objects > 1000
                        ? `${(pool.objects / 1000).toFixed(0)}K`
                        : pool.objects}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pool.compression === "none" ? "outline" : "secondary"}>
                        {pool.compression}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setPoolForEdit(pool)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Pool
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => { setPoolForQuota(pool); setQuotaBytes(pool.quotaMaxBytes > 0 ? String(pool.quotaMaxBytes / 1000000000) : ""); setQuotaObjects(pool.quotaMaxObjects > 0 ? String(pool.quotaMaxObjects) : ""); }}>
                            <Settings className="mr-2 h-4 w-4" />
                            Set Quota
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toast({ title: "Pool Statistics", description: `${pool.name}: ${pool.objects} objects, ${(pool.usedCapacity / 1000).toFixed(0)} TB used` })}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            View Statistics
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onSelect={() => setPoolToDelete(pool)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Pool
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

      {/* Edit Pool Dialog */}
      <Dialog open={!!poolForEdit} onOpenChange={() => setPoolForEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pool</DialogTitle>
            <DialogDescription>{poolForEdit?.name}</DialogDescription>
          </DialogHeader>
          {poolForEdit && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium capitalize">{poolForEdit.type}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Application</Label>
                  <Badge>{poolForEdit.application}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pool-size">Replication Size</Label>
                  <Input id="pool-size" type="number" defaultValue={poolForEdit.size} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pool-pg">PG Count</Label>
                  <Input id="pool-pg" type="number" defaultValue={poolForEdit.pgNum} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Compression</Label>
                <Select defaultValue={poolForEdit.compression}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="lz4">LZ4</SelectItem>
                    <SelectItem value="zstd">ZSTD</SelectItem>
                    <SelectItem value="snappy">Snappy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoolForEdit(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Pool Updated", description: `${poolForEdit?.name} configuration saved` });
              setPoolForEdit(null);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Quota Dialog */}
      <Dialog open={!!poolForQuota} onOpenChange={() => setPoolForQuota(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Pool Quota</DialogTitle>
            <DialogDescription>{poolForQuota?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quota-bytes">Max Size (GB)</Label>
              <Input
                id="quota-bytes"
                type="number"
                placeholder="0 = unlimited"
                value={quotaBytes}
                onChange={(e) => setQuotaBytes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quota-objects">Max Objects</Label>
              <Input
                id="quota-objects"
                type="number"
                placeholder="0 = unlimited"
                value={quotaObjects}
                onChange={(e) => setQuotaObjects(e.target.value)}
              />
            </div>
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Setting quotas will prevent the pool from exceeding the specified limits.
                Leave empty or set to 0 for unlimited.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoolForQuota(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Quota Set", description: `Quota updated for ${poolForQuota?.name}` });
              setPoolForQuota(null);
            }}>
              Apply Quota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Pool Confirmation */}
      <AlertDialog open={!!poolToDelete} onOpenChange={() => setPoolToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pool?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{poolToDelete?.name}</strong>?
              This will permanently delete all {poolToDelete?.objects} objects in this pool.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Pool Deleted",
                  description: `${poolToDelete?.name} has been deleted`,
                  variant: "destructive",
                });
                setPoolToDelete(null);
              }}
            >
              Delete Pool
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
