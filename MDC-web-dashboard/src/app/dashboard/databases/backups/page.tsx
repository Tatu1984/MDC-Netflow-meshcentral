"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Database,
  Clock,
  Download,
  Trash2,
  RotateCcw,
  Calendar,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Settings,
  History,
  Shield,
  Timer,
  Play,
  Pause,
  Archive,
  FileArchive,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";

// Mock data for backups
const mockBackups = [
  {
    id: "bkp-001",
    databaseId: "db-001",
    databaseName: "prod-primary",
    engine: "postgresql",
    type: "automated",
    status: "completed",
    size: 12.5,
    createdAt: "2024-03-15T03:00:00Z",
    completedAt: "2024-03-15T03:12:45Z",
    retentionDays: 30,
    encrypted: true,
    projectId: "proj-1",
  },
  {
    id: "bkp-002",
    databaseId: "db-001",
    databaseName: "prod-primary",
    engine: "postgresql",
    type: "automated",
    status: "completed",
    size: 12.4,
    createdAt: "2024-03-14T03:00:00Z",
    completedAt: "2024-03-14T03:11:32Z",
    retentionDays: 30,
    encrypted: true,
    projectId: "proj-1",
  },
  {
    id: "bkp-003",
    databaseId: "db-002",
    databaseName: "prod-analytics",
    engine: "postgresql",
    type: "automated",
    status: "completed",
    size: 45.8,
    createdAt: "2024-03-15T03:00:00Z",
    completedAt: "2024-03-15T03:28:15Z",
    retentionDays: 30,
    encrypted: true,
    projectId: "proj-1",
  },
  {
    id: "bkp-004",
    databaseId: "db-003",
    databaseName: "app-mysql",
    engine: "mysql",
    type: "manual",
    status: "completed",
    size: 8.2,
    createdAt: "2024-03-14T14:30:00Z",
    completedAt: "2024-03-14T14:38:22Z",
    retentionDays: 90,
    encrypted: true,
    projectId: "proj-1",
  },
  {
    id: "bkp-005",
    databaseId: "db-004",
    databaseName: "ecommerce-db",
    engine: "mysql",
    type: "automated",
    status: "in_progress",
    size: 0,
    createdAt: "2024-03-15T03:00:00Z",
    completedAt: null,
    retentionDays: 30,
    encrypted: true,
    projectId: "proj-1",
  },
  {
    id: "bkp-006",
    databaseId: "db-001",
    databaseName: "prod-primary",
    engine: "postgresql",
    type: "manual",
    status: "completed",
    size: 12.3,
    createdAt: "2024-03-13T09:15:00Z",
    completedAt: "2024-03-13T09:26:45Z",
    retentionDays: 90,
    encrypted: true,
    projectId: "proj-1",
  },
  {
    id: "bkp-007",
    databaseId: "db-002",
    databaseName: "prod-analytics",
    engine: "postgresql",
    type: "automated",
    status: "failed",
    size: 0,
    createdAt: "2024-03-12T03:00:00Z",
    completedAt: null,
    retentionDays: 30,
    encrypted: true,
    error: "Insufficient storage space",
    projectId: "proj-1",
  },
];

// Mock backup schedules
const mockSchedules = [
  {
    id: "sched-001",
    databaseId: "db-001",
    databaseName: "prod-primary",
    engine: "postgresql",
    enabled: true,
    frequency: "daily",
    time: "03:00",
    timezone: "UTC",
    retentionDays: 30,
    lastRun: "2024-03-15T03:00:00Z",
    nextRun: "2024-03-16T03:00:00Z",
    projectId: "proj-1",
  },
  {
    id: "sched-002",
    databaseId: "db-002",
    databaseName: "prod-analytics",
    engine: "postgresql",
    enabled: true,
    frequency: "daily",
    time: "03:00",
    timezone: "UTC",
    retentionDays: 30,
    lastRun: "2024-03-15T03:00:00Z",
    nextRun: "2024-03-16T03:00:00Z",
    projectId: "proj-1",
  },
  {
    id: "sched-003",
    databaseId: "db-003",
    databaseName: "app-mysql",
    engine: "mysql",
    enabled: true,
    frequency: "daily",
    time: "04:00",
    timezone: "UTC",
    retentionDays: 14,
    lastRun: "2024-03-15T04:00:00Z",
    nextRun: "2024-03-16T04:00:00Z",
    projectId: "proj-1",
  },
  {
    id: "sched-004",
    databaseId: "db-004",
    databaseName: "ecommerce-db",
    engine: "mysql",
    enabled: true,
    frequency: "hourly",
    time: null,
    timezone: "UTC",
    retentionDays: 7,
    lastRun: "2024-03-15T14:00:00Z",
    nextRun: "2024-03-15T15:00:00Z",
    projectId: "proj-1",
  },
  {
    id: "sched-005",
    databaseId: "db-005",
    databaseName: "legacy-mysql",
    engine: "mysql",
    enabled: false,
    frequency: "weekly",
    time: "02:00",
    timezone: "UTC",
    retentionDays: 60,
    lastRun: "2024-03-10T02:00:00Z",
    nextRun: null,
    projectId: "proj-1",
  },
];

// Mock retention policies
const mockRetentionPolicies = [
  { id: "daily", name: "Daily (7 days)", days: 7, description: "Keep daily backups for 7 days" },
  { id: "standard", name: "Standard (14 days)", days: 14, description: "Keep daily backups for 14 days" },
  { id: "extended", name: "Extended (30 days)", days: 30, description: "Keep daily backups for 30 days" },
  { id: "compliance", name: "Compliance (90 days)", days: 90, description: "Keep daily backups for 90 days" },
  { id: "archive", name: "Archive (365 days)", days: 365, description: "Keep daily backups for 1 year" },
];

// Mock databases for selection
const mockDatabases = [
  { id: "db-001", name: "prod-primary", engine: "postgresql" },
  { id: "db-002", name: "prod-analytics", engine: "postgresql" },
  { id: "db-003", name: "app-mysql", engine: "mysql" },
  { id: "db-004", name: "ecommerce-db", engine: "mysql" },
  { id: "db-005", name: "legacy-mysql", engine: "mysql" },
];

export default function BackupsPage() {
  const { toast } = useToast();
  const { currentProject } = useAuthStore();
  const [activeTab, setActiveTab] = useState("backups");
  const [createBackupDialogOpen, setCreateBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [pitrDialogOpen, setPitrDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<typeof mockBackups[0] | null>(null);

  // Additional dialog states
  const [deleteBackupOpen, setDeleteBackupOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<typeof mockSchedules[0] | null>(null);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);
  const [deleteScheduleOpen, setDeleteScheduleOpen] = useState(false);

  // Form state
  const [selectedDatabase, setSelectedDatabase] = useState("");
  const [backupRetention, setBackupRetention] = useState("30");
  const [scheduleFrequency, setScheduleFrequency] = useState("daily");
  const [scheduleTime, setScheduleTime] = useState("03:00");
  const [pitrTimestamp, setPitrTimestamp] = useState("");

  const backups = mockBackups.filter((b) => b.projectId === currentProject?.id);
  const schedules = mockSchedules.filter((s) => s.projectId === currentProject?.id);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">In Progress</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEngineColor = (engine: string) => {
    return engine === "postgresql" ? "text-blue-500" : "text-orange-500";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (sizeGB: number) => {
    if (sizeGB === 0) return "-";
    if (sizeGB < 1) return `${(sizeGB * 1024).toFixed(0)} MB`;
    return `${sizeGB.toFixed(1)} GB`;
  };

  const handleRestore = (backup: typeof mockBackups[0]) => {
    setSelectedBackup(backup);
    setRestoreDialogOpen(true);
  };

  const totalBackupSize = backups.reduce((acc, b) => acc + b.size, 0);
  const completedBackups = backups.filter((b) => b.status === "completed").length;
  const failedBackups = backups.filter((b) => b.status === "failed").length;

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Database Backups"
        apis={[
          "GET /api/database-backups",
          "POST /api/database-backups",
          "DELETE /api/database-backups/{id}",
          "POST /api/database-backups/{id}/restore",
          "GET /api/database-backup-policies"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Backups</h1>
          <p className="text-muted-foreground">
            Manage automated backups, manual snapshots, and point-in-time recovery
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={pitrDialogOpen} onOpenChange={setPitrDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <History className="mr-2 h-4 w-4" />
                Point-in-Time Recovery
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Point-in-Time Recovery</DialogTitle>
                <DialogDescription>
                  Restore a database to a specific point in time within the retention window
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="pitr-database">Database</Label>
                  <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select database" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockDatabases.map((db) => (
                        <SelectItem key={db.id} value={db.id}>
                          <div className="flex items-center gap-2">
                            <Database className={`h-4 w-4 ${getEngineColor(db.engine)}`} />
                            {db.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pitr-timestamp">Target Timestamp</Label>
                  <Input
                    id="pitr-timestamp"
                    type="datetime-local"
                    value={pitrTimestamp}
                    onChange={(e) => setPitrTimestamp(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select the exact point in time you want to restore to
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pitr-target">Target Instance Name</Label>
                  <Input
                    id="pitr-target"
                    placeholder="restored-database"
                  />
                  <p className="text-xs text-muted-foreground">
                    A new database instance will be created with the restored data
                  </p>
                </div>
                <div className="rounded-lg border p-3 bg-muted/50">
                  <div className="flex items-start gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Recovery Window</p>
                      <p className="text-muted-foreground">
                        You can restore to any point within the last 7 days for this database.
                        Earliest available: March 8, 2024 03:00 UTC
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPitrDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setPitrDialogOpen(false)}>
                  Start Recovery
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createBackupDialogOpen} onOpenChange={setCreateBackupDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Backup
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Manual Backup</DialogTitle>
                <DialogDescription>
                  Create a point-in-time backup of your database
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="backup-database">Database</Label>
                  <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select database" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockDatabases.map((db) => (
                        <SelectItem key={db.id} value={db.id}>
                          <div className="flex items-center gap-2">
                            <Database className={`h-4 w-4 ${getEngineColor(db.engine)}`} />
                            {db.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="backup-name">Backup Name (optional)</Label>
                  <Input
                    id="backup-name"
                    placeholder="e.g., pre-migration-backup"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="backup-retention">Retention Period</Label>
                  <Select value={backupRetention} onValueChange={setBackupRetention}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select retention period" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockRetentionPolicies.map((policy) => (
                        <SelectItem key={policy.id} value={policy.days.toString()}>
                          {policy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/50">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Backup will be encrypted at rest</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateBackupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setCreateBackupDialogOpen(false)}>
                  Create Backup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedBackups} completed, {failedBackups} failed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBackupSize.toFixed(1)} GB</div>
            <p className="text-xs text-muted-foreground">
              across all backups
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedules.filter((s) => s.enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {schedules.length} total schedules
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h ago</div>
            <p className="text-xs text-muted-foreground">
              prod-primary (12.5 GB)
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="retention">Retention Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Backups</CardTitle>
              <CardDescription>
                View and manage all database backups across your project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Database</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Database className={`h-4 w-4 ${getEngineColor(backup.engine)}`} />
                          <div>
                            <div className="font-medium">{backup.databaseName}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {backup.engine}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {backup.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(backup.status)}
                          <span className="capitalize">{backup.status.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatSize(backup.size)}</TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(backup.createdAt)}</div>
                        {backup.completedAt && (
                          <div className="text-xs text-muted-foreground">
                            Completed: {formatDate(backup.completedAt)}
                          </div>
                        )}
                        {backup.error && (
                          <div className="text-xs text-red-500">{backup.error}</div>
                        )}
                      </TableCell>
                      <TableCell>{backup.retentionDays} days</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={backup.status !== "completed"}
                              onSelect={() => handleRestore(backup)}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={backup.status !== "completed"}
                              onSelect={() => {
                                toast({
                                  title: "Download started",
                                  description: `Downloading backup for ${backup.databaseName}...`,
                                });
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => {
                                setSelectedBackup(backup);
                                setDeleteBackupOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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

        <TabsContent value="schedules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Backup Schedule</DialogTitle>
                  <DialogDescription>
                    Set up automated backups for your database
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="schedule-database">Database</Label>
                    <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select database" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockDatabases.map((db) => (
                          <SelectItem key={db.id} value={db.id}>
                            <div className="flex items-center gap-2">
                              <Database className={`h-4 w-4 ${getEngineColor(db.engine)}`} />
                              {db.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="schedule-frequency">Frequency</Label>
                    <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {scheduleFrequency !== "hourly" && (
                    <div className="grid gap-2">
                      <Label htmlFor="schedule-time">Time (UTC)</Label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="schedule-retention">Retention Period</Label>
                    <Select value={backupRetention} onValueChange={setBackupRetention}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select retention period" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockRetentionPolicies.map((policy) => (
                          <SelectItem key={policy.id} value={policy.days.toString()}>
                            {policy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setScheduleDialogOpen(false)}>
                    Create Schedule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Backup Schedules</CardTitle>
              <CardDescription>
                Manage automated backup schedules for your databases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Database</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Database className={`h-4 w-4 ${getEngineColor(schedule.engine)}`} />
                          <div>
                            <div className="font-medium">{schedule.databaseName}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {schedule.engine}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{schedule.frequency}</TableCell>
                      <TableCell>
                        {schedule.time ? `${schedule.time} ${schedule.timezone}` : "Every hour"}
                      </TableCell>
                      <TableCell>{schedule.retentionDays} days</TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(schedule.lastRun)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {schedule.nextRun ? formatDate(schedule.nextRun) : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {schedule.enabled ? (
                            <>
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <span className="text-sm">Active</span>
                            </>
                          ) : (
                            <>
                              <div className="h-2 w-2 rounded-full bg-gray-400" />
                              <span className="text-sm text-muted-foreground">Paused</span>
                            </>
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
                            <DropdownMenuItem
                              onSelect={() => {
                                toast({
                                  title: "Backup started",
                                  description: `Running backup for ${schedule.databaseName} now...`,
                                });
                              }}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Run Now
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                setSelectedSchedule(schedule);
                                setEditScheduleOpen(true);
                              }}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Edit Schedule
                            </DropdownMenuItem>
                            {schedule.enabled ? (
                              <DropdownMenuItem
                                onSelect={() => {
                                  toast({
                                    title: "Schedule paused",
                                    description: `Backup schedule for ${schedule.databaseName} has been paused.`,
                                  });
                                }}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Pause Schedule
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onSelect={() => {
                                  toast({
                                    title: "Schedule resumed",
                                    description: `Backup schedule for ${schedule.databaseName} has been resumed.`,
                                  });
                                }}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Resume Schedule
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => {
                                setSelectedSchedule(schedule);
                                setDeleteScheduleOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Schedule
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

        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Retention Policies</CardTitle>
              <CardDescription>
                Configure how long backups are kept before automatic deletion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockRetentionPolicies.map((policy) => (
                  <Card key={policy.id} className="border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{policy.name}</CardTitle>
                        <Badge variant="outline">{policy.days} days</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {policy.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Databases using:
                        </span>
                        <span className="font-medium">
                          {schedules.filter((s) => s.retentionDays === policy.days).length}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 rounded-lg border p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <FileArchive className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h4 className="font-medium">Backup Storage</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      All backups are stored in highly durable object storage with 99.999999999%
                      durability. Backups are encrypted at rest using AES-256 encryption.
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <div>
                        <span className="text-2xl font-bold">{totalBackupSize.toFixed(1)}</span>
                        <span className="text-muted-foreground ml-1">GB used</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        $0.023 / GB / month
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              Restore {selectedBackup?.databaseName} from backup
            </DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-3 bg-muted/50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Backup ID:</span>
                    <span className="ml-2 font-mono">{selectedBackup.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <span className="ml-2">{formatSize(selectedBackup.size)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2">{formatDate(selectedBackup.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 capitalize">{selectedBackup.type}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Restore Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <input type="radio" name="restore-option" id="restore-new" defaultChecked />
                    <Label htmlFor="restore-new" className="flex-1 cursor-pointer">
                      <div className="font-medium">Create new database</div>
                      <div className="text-sm text-muted-foreground">
                        Restore to a new database instance
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <input type="radio" name="restore-option" id="restore-replace" />
                    <Label htmlFor="restore-replace" className="flex-1 cursor-pointer">
                      <div className="font-medium">Replace existing database</div>
                      <div className="text-sm text-muted-foreground">
                        Overwrite the source database (destructive)
                      </div>
                    </Label>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="restore-name">New Database Name</Label>
                <Input
                  id="restore-name"
                  placeholder={`${selectedBackup.databaseName}-restored`}
                  defaultValue={`${selectedBackup.databaseName}-restored`}
                />
              </div>

              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-600">Restoration Notice</p>
                    <p className="text-muted-foreground">
                      The restore process may take several minutes depending on the backup size.
                      The new database will be available once restoration is complete.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setRestoreDialogOpen(false);
              toast({
                title: "Restore started",
                description: `Restoring backup for ${selectedBackup?.databaseName}. This may take a few minutes.`,
              });
            }}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Start Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Backup Confirmation */}
      <AlertDialog open={deleteBackupOpen} onOpenChange={setDeleteBackupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup for "{selectedBackup?.databaseName}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Backup deleted",
                  description: `Backup for ${selectedBackup?.databaseName} has been deleted.`,
                });
                setSelectedBackup(null);
              }}
            >
              Delete Backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={editScheduleOpen} onOpenChange={setEditScheduleOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Backup Schedule</DialogTitle>
            <DialogDescription>
              Update backup schedule for {selectedSchedule?.databaseName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-schedule-frequency">Frequency</Label>
              <Select defaultValue={selectedSchedule?.frequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedSchedule?.frequency !== "hourly" && (
              <div className="grid gap-2">
                <Label htmlFor="edit-schedule-time">Time (UTC)</Label>
                <Input
                  id="edit-schedule-time"
                  type="time"
                  defaultValue={selectedSchedule?.time || "03:00"}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-schedule-retention">Retention Period</Label>
              <Select defaultValue={selectedSchedule?.retentionDays?.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setEditScheduleOpen(false);
              toast({
                title: "Schedule updated",
                description: `Backup schedule for ${selectedSchedule?.databaseName} has been updated.`,
              });
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Schedule Confirmation */}
      <AlertDialog open={deleteScheduleOpen} onOpenChange={setDeleteScheduleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the backup schedule for "{selectedSchedule?.databaseName}"?
              Automated backups will stop running for this database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Schedule deleted",
                  description: `Backup schedule for ${selectedSchedule?.databaseName} has been deleted.`,
                });
                setSelectedSchedule(null);
              }}
            >
              Delete Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
