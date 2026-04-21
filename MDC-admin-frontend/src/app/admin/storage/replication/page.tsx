"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Pause,
  Play,
  Settings,
  Activity,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Mock replication jobs
const mockReplicationJobs = [
  {
    id: "repl-001",
    name: "East to West VM Volumes",
    sourceCluster: "ceph-east-primary",
    sourcePool: "vm-volumes",
    targetCluster: "ceph-west-primary",
    targetPool: "vm-volumes-replica",
    status: "active",
    mode: "async",
    schedule: "*/15 * * * *",
    scheduleDescription: "Every 15 minutes",
    lastSync: "2024-03-15T10:30:00Z",
    nextSync: "2024-03-15T10:45:00Z",
    lag: 245,
    objectsSynced: 4520,
    bytesTransferred: 78000000000,
    health: "healthy",
  },
  {
    id: "repl-002",
    name: "Object Store Geo-Replication",
    sourceCluster: "ceph-east-primary",
    sourcePool: "object-store",
    targetCluster: "ceph-eu-primary",
    targetPool: "object-store-replica",
    status: "active",
    mode: "async",
    schedule: "0 * * * *",
    scheduleDescription: "Every hour",
    lastSync: "2024-03-15T10:00:00Z",
    nextSync: "2024-03-15T11:00:00Z",
    lag: 1824,
    objectsSynced: 15420000,
    bytesTransferred: 125000000000,
    health: "warning",
    healthDetail: "High replication lag",
  },
  {
    id: "repl-003",
    name: "Backup Archive Sync",
    sourceCluster: "ceph-west-primary",
    sourcePool: "backup-archive",
    targetCluster: "ceph-eu-primary",
    targetPool: "backup-archive-dr",
    status: "paused",
    mode: "async",
    schedule: "0 2 * * *",
    scheduleDescription: "Daily at 2 AM",
    lastSync: "2024-03-14T02:00:00Z",
    nextSync: null,
    lag: 0,
    objectsSynced: 892000,
    bytesTransferred: 89000000000,
    health: "paused",
  },
  {
    id: "repl-004",
    name: "CephFS Data Mirror",
    sourceCluster: "ceph-east-primary",
    sourcePool: "cephfs-data",
    targetCluster: "ceph-west-primary",
    targetPool: "cephfs-data-mirror",
    status: "active",
    mode: "sync",
    schedule: null,
    scheduleDescription: "Synchronous",
    lastSync: "2024-03-15T10:32:15Z",
    nextSync: null,
    lag: 12,
    objectsSynced: 2890000,
    bytesTransferred: 45000000000,
    health: "healthy",
  },
  {
    id: "repl-005",
    name: "VM Images Cross-DC",
    sourceCluster: "ceph-east-primary",
    sourcePool: "vm-images",
    targetCluster: "ceph-eu-primary",
    targetPool: "vm-images-replica",
    status: "error",
    mode: "async",
    schedule: "0 */6 * * *",
    scheduleDescription: "Every 6 hours",
    lastSync: "2024-03-15T06:00:00Z",
    nextSync: "2024-03-15T12:00:00Z",
    lag: 0,
    objectsSynced: 1250,
    bytesTransferred: 32500000000,
    health: "error",
    healthDetail: "Connection timeout to target",
  },
];

const statusConfig = {
  active: { icon: CheckCircle, color: "text-green-500", variant: "default" as const },
  paused: { icon: Pause, color: "text-yellow-500", variant: "secondary" as const },
  error: { icon: AlertTriangle, color: "text-red-500", variant: "destructive" as const },
};

const healthConfig = {
  healthy: { icon: CheckCircle, color: "text-green-500" },
  warning: { icon: AlertTriangle, color: "text-yellow-500" },
  error: { icon: AlertTriangle, color: "text-red-500" },
  paused: { icon: Pause, color: "text-gray-500" },
};

function formatBytes(bytes: number): string {
  if (bytes >= 1000000000000) return `${(bytes / 1000000000000).toFixed(1)} TB`;
  if (bytes >= 1000000000) return `${(bytes / 1000000000).toFixed(1)} GB`;
  if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
  return `${bytes} B`;
}

interface ReplicationJob {
  id: string;
  name: string;
  sourceCluster: string;
  sourcePool: string;
  targetCluster: string;
  targetPool: string;
  status: string;
  mode: string;
  schedule: string | null;
  scheduleDescription: string;
  lastSync: string;
  nextSync: string | null;
  lag: number;
  objectsSynced: number;
  bytesTransferred: number;
  health: string;
  healthDetail?: string;
}

function formatLag(seconds: number): string {
  if (seconds === 0) return "-";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function ReplicationPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ReplicationJob | null>(null);

  const activeJobs = mockReplicationJobs.filter((j) => j.status === "active").length;
  const healthyJobs = mockReplicationJobs.filter((j) => j.health === "healthy").length;
  const totalTransferred = mockReplicationJobs.reduce((sum, j) => sum + j.bytesTransferred, 0);

  const handleSyncNow = (job: ReplicationJob) => {
    toast({
      title: "Sync Started",
      description: `Manual sync initiated for ${job.name}.`,
    });
  };

  const handlePause = (job: ReplicationJob) => {
    toast({
      title: "Replication Paused",
      description: `${job.name} has been paused.`,
    });
  };

  const handleResume = (job: ReplicationJob) => {
    toast({
      title: "Replication Resumed",
      description: `${job.name} has been resumed.`,
    });
  };

  const handleConfigure = (job: ReplicationJob) => {
    setSelectedJob(job);
    setConfigDialogOpen(true);
  };

  const handleViewLogs = (job: ReplicationJob) => {
    setSelectedJob(job);
    setLogsDialogOpen(true);
  };

  const handleDelete = (job: ReplicationJob) => {
    setSelectedJob(job);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    toast({
      title: "Replication Job Deleted",
      description: `${selectedJob?.name} has been deleted.`,
    });
    setDeleteDialogOpen(false);
    setSelectedJob(null);
  };

  const saveConfig = () => {
    toast({
      title: "Configuration Saved",
      description: `${selectedJob?.name} configuration has been updated.`,
    });
    setConfigDialogOpen(false);
    setSelectedJob(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Replication</h1>
          <p className="text-muted-foreground">
            Cross-cluster data replication and disaster recovery
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Replication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Replication Job</DialogTitle>
              <DialogDescription>
                Set up data replication between storage pools
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Job Name</Label>
                <Input placeholder="My Replication Job" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Source Cluster</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ceph-east-primary">ceph-east-primary</SelectItem>
                      <SelectItem value="ceph-west-primary">ceph-west-primary</SelectItem>
                      <SelectItem value="ceph-eu-primary">ceph-eu-primary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Source Pool</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vm-volumes">vm-volumes</SelectItem>
                      <SelectItem value="vm-images">vm-images</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Target Cluster</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ceph-east-primary">ceph-east-primary</SelectItem>
                      <SelectItem value="ceph-west-primary">ceph-west-primary</SelectItem>
                      <SelectItem value="ceph-eu-primary">ceph-eu-primary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Target Pool</Label>
                  <Input placeholder="Pool name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Mode</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="async">Asynchronous</SelectItem>
                      <SelectItem value="sync">Synchronous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Schedule (Cron)</Label>
                  <Input placeholder="*/15 * * * *" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replication Jobs</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockReplicationJobs.length}</div>
            <p className="text-xs text-muted-foreground">{activeJobs} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthyJobs}/{mockReplicationJobs.length}</div>
            <p className="text-xs text-muted-foreground">Jobs healthy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Replicated</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalTransferred)}</div>
            <p className="text-xs text-muted-foreground">Total transferred</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockReplicationJobs.filter((j) => j.health !== "healthy" && j.health !== "paused").length}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Replication Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Replication Jobs</CardTitle>
          <CardDescription>
            Active and scheduled replication configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Name</TableHead>
                <TableHead>Source → Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Lag</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReplicationJobs.map((job) => {
                const StatusIcon = statusConfig[job.status as keyof typeof statusConfig].icon;
                const HealthIcon = healthConfig[job.health as keyof typeof healthConfig].icon;

                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">{job.sourceCluster}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{job.targetCluster}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {job.sourcePool} → {job.targetPool}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${statusConfig[job.status as keyof typeof statusConfig].color}`} />
                        <Badge variant={statusConfig[job.status as keyof typeof statusConfig].variant}>
                          {job.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{job.mode}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.scheduleDescription}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(job.lastSync), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <span className={job.lag > 1800 ? "text-yellow-500 font-medium" : ""}>
                        {formatLag(job.lag)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <HealthIcon className={`h-4 w-4 ${healthConfig[job.health as keyof typeof healthConfig].color}`} />
                        {job.healthDetail && (
                          <span className="text-xs text-muted-foreground" title={job.healthDetail}>
                            {job.health}
                          </span>
                        )}
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
                          <DropdownMenuItem onSelect={() => handleSyncNow(job)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync Now
                          </DropdownMenuItem>
                          {job.status === "active" ? (
                            <DropdownMenuItem onSelect={() => handlePause(job)}>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => handleResume(job)}>
                              <Play className="mr-2 h-4 w-4" />
                              Resume
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => handleConfigure(job)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleViewLogs(job)}>
                            View Logs
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onSelect={() => handleDelete(job)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Job
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

      {/* View Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Replication Logs - {selectedJob?.name}</DialogTitle>
            <DialogDescription>
              Recent sync activity for this replication job
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md font-mono text-sm h-64 overflow-y-auto">
            <p className="text-muted-foreground">[2024-03-15 10:30:00] INFO: Sync completed successfully</p>
            <p className="text-muted-foreground">[2024-03-15 10:29:55] INFO: Transferred 1,250 objects (2.4 GB)</p>
            <p className="text-muted-foreground">[2024-03-15 10:28:00] INFO: Starting incremental sync</p>
            <p className="text-muted-foreground">[2024-03-15 10:15:00] INFO: Sync completed successfully</p>
            <p className="text-yellow-500">[2024-03-15 10:14:30] WARN: Slow network detected, retrying transfer</p>
            <p className="text-muted-foreground">[2024-03-15 10:13:00] INFO: Starting incremental sync</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Replication Job</DialogTitle>
            <DialogDescription>
              Update settings for {selectedJob?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Job Name</Label>
              <Input defaultValue={selectedJob?.name} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Mode</Label>
                <Select defaultValue={selectedJob?.mode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="async">Asynchronous</SelectItem>
                    <SelectItem value="sync">Synchronous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Schedule (Cron)</Label>
                <Input defaultValue={selectedJob?.schedule || ""} placeholder="*/15 * * * *" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Bandwidth Limit (MB/s)</Label>
              <Input type="number" placeholder="Unlimited" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveConfig}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Replication Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedJob?.name}&quot;? This will stop all replication between the source and target clusters. Existing replicated data will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete Job</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
