"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  MoreHorizontal,
  Database,
  Activity,
  Clock,
  Copy,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Settings,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertCircle,
  XCircle,
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
import { mockDatabases } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";

// Extended mock data for MySQL databases
const mockMySQLDatabases = [
  {
    id: "db-003",
    name: "app-mysql",
    projectId: "proj-1",
    engine: "mysql" as const,
    version: "8.0.35",
    status: "running" as const,
    vcpus: 4,
    memory: 16,
    storage: 200,
    storageUsed: 78,
    endpoint: "app-mysql.db.cloudplatform.io:3306",
    region: "us-east-1",
    createdAt: "2024-02-01T11:00:00Z",
    connections: 45,
    maxConnections: 150,
    replication: "none",
    sslEnabled: true,
    backupEnabled: true,
    lastBackup: "2024-03-15T03:00:00Z",
  },
  {
    id: "db-004",
    name: "ecommerce-db",
    projectId: "proj-1",
    engine: "mysql" as const,
    version: "8.0.35",
    status: "running" as const,
    vcpus: 8,
    memory: 32,
    storage: 500,
    storageUsed: 234,
    endpoint: "ecommerce-db.db.cloudplatform.io:3306",
    region: "us-east-1",
    createdAt: "2024-01-20T09:00:00Z",
    connections: 128,
    maxConnections: 300,
    replication: "read-replica",
    sslEnabled: true,
    backupEnabled: true,
    lastBackup: "2024-03-15T03:00:00Z",
  },
  {
    id: "db-005",
    name: "legacy-mysql",
    projectId: "proj-1",
    engine: "mysql" as const,
    version: "5.7.44",
    status: "running" as const,
    vcpus: 2,
    memory: 8,
    storage: 100,
    storageUsed: 67,
    endpoint: "legacy-mysql.db.cloudplatform.io:3306",
    region: "us-east-1",
    createdAt: "2023-06-15T14:00:00Z",
    connections: 12,
    maxConnections: 100,
    replication: "none",
    sslEnabled: true,
    backupEnabled: true,
    lastBackup: "2024-03-15T03:00:00Z",
  },
  {
    id: "db-006",
    name: "staging-mysql",
    projectId: "proj-2",
    engine: "mysql" as const,
    version: "8.0.35",
    status: "stopped" as const,
    vcpus: 2,
    memory: 4,
    storage: 50,
    storageUsed: 12,
    endpoint: "staging-mysql.db.cloudplatform.io:3306",
    region: "us-east-1",
    createdAt: "2024-02-28T16:00:00Z",
    connections: 0,
    maxConnections: 50,
    replication: "none",
    sslEnabled: true,
    backupEnabled: false,
    lastBackup: null,
  },
];

// Mock metrics data
const mockMetrics = {
  queriesPerSecond: 1250,
  slowQueries: 3,
  avgQueryTime: 12.5,
  bufferPoolUsage: 78,
  threadsCached: 8,
  threadsConnected: 45,
  tableLocksWaited: 2,
  innodbRowsRead: 152340,
};

const instanceSizes = [
  { id: "small", name: "Small", vcpus: 2, memory: 4, price: 45 },
  { id: "medium", name: "Medium", vcpus: 4, memory: 16, price: 120 },
  { id: "large", name: "Large", vcpus: 8, memory: 32, price: 240 },
  { id: "xlarge", name: "X-Large", vcpus: 16, memory: 64, price: 480 },
];

const mysqlVersions = ["8.0.35", "8.0.34", "5.7.44", "5.7.43"];

export default function MySQLPage() {
  const { toast } = useToast();
  const { currentProject } = useAuthStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [selectedDb, setSelectedDb] = useState<typeof mockMySQLDatabases[0] | null>(null);
  const [activeTab, setActiveTab] = useState("instances");

  // Form state for create dialog
  const [newDbName, setNewDbName] = useState("");
  const [newDbVersion, setNewDbVersion] = useState("8.0.35");
  const [newDbSize, setNewDbSize] = useState("medium");
  const [newDbStorage, setNewDbStorage] = useState("100");

  const databases = mockMySQLDatabases.filter(
    (db) => db.projectId === currentProject?.id
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "stopped":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case "provisioning":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Running</Badge>;
      case "stopped":
        return <Badge variant="secondary">Stopped</Badge>;
      case "provisioning":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Provisioning</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleShowConnectionInfo = (db: typeof mockMySQLDatabases[0]) => {
    setSelectedDb(db);
    setConnectionDialogOpen(true);
  };

  const handleViewMetrics = (db: typeof mockMySQLDatabases[0]) => {
    toast({
      title: "View Metrics",
      description: `Opening metrics for ${db.name}`,
    });
  };

  const handleViewBackups = (db: typeof mockMySQLDatabases[0]) => {
    toast({
      title: "View Backups",
      description: `Navigating to backups for ${db.name}`,
    });
  };

  const handleConfiguration = (db: typeof mockMySQLDatabases[0]) => {
    toast({
      title: "Configuration",
      description: `Opening configuration for ${db.name}`,
    });
  };

  const handleStopDatabase = (db: typeof mockMySQLDatabases[0]) => {
    toast({
      title: "Stopping Database",
      description: `${db.name} is being stopped`,
    });
  };

  const handleStartDatabase = (db: typeof mockMySQLDatabases[0]) => {
    toast({
      title: "Starting Database",
      description: `${db.name} is being started`,
    });
  };

  const handleRestartDatabase = (db: typeof mockMySQLDatabases[0]) => {
    toast({
      title: "Restarting Database",
      description: `${db.name} is being restarted`,
    });
  };

  const handleDeleteDatabase = (db: typeof mockMySQLDatabases[0]) => {
    toast({
      title: "Delete Database",
      description: `Confirm deletion of ${db.name}`,
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="MySQL Databases"
        apis={[
          "GET /api/databases/mysql",
          "POST /api/databases/mysql",
          "PUT /api/databases/mysql/{id}",
          "DELETE /api/databases/mysql/{id}",
          "POST /api/databases/mysql/{id}/backup"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MySQL Databases</h1>
          <p className="text-muted-foreground">
            Managed MySQL database instances with automated backups and high availability
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Database
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create MySQL Database</DialogTitle>
              <DialogDescription>
                Deploy a new managed MySQL database instance
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="db-name">Database Name</Label>
                <Input
                  id="db-name"
                  placeholder="my-database"
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="db-version">MySQL Version</Label>
                <Select value={newDbVersion} onValueChange={setNewDbVersion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {mysqlVersions.map((version) => (
                      <SelectItem key={version} value={version}>
                        MySQL {version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Instance Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  {instanceSizes.map((size) => (
                    <div
                      key={size.id}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                        newDbSize === size.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-muted-foreground/50"
                      }`}
                      onClick={() => setNewDbSize(size.id)}
                    >
                      <div className="font-medium">{size.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {size.vcpus} vCPU, {size.memory} GB RAM
                      </div>
                      <div className="text-sm font-medium text-primary">
                        ${size.price}/mo
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="db-storage">Storage (GB)</Label>
                <Select value={newDbStorage} onValueChange={setNewDbStorage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select storage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 GB</SelectItem>
                    <SelectItem value="100">100 GB</SelectItem>
                    <SelectItem value="200">200 GB</SelectItem>
                    <SelectItem value="500">500 GB</SelectItem>
                    <SelectItem value="1000">1 TB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateDialogOpen(false)}>
                Create Database
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Instances</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{databases.length}</div>
            <p className="text-xs text-muted-foreground">
              {databases.filter((db) => db.status === "running").length} running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {databases.reduce((acc, db) => acc + db.storage, 0)} GB
            </div>
            <p className="text-xs text-muted-foreground">
              {databases.reduce((acc, db) => acc + db.storageUsed, 0)} GB used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {databases.reduce((acc, db) => acc + db.connections, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              across all instances
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queries/sec</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.queriesPerSecond}</div>
            <p className="text-xs text-muted-foreground">
              {mockMetrics.slowQueries} slow queries
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="instances">Instances</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="space-y-4">
          {/* Database Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {databases.map((db) => (
              <Card key={db.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-orange-500/10 p-2">
                      <Database className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{db.name}</CardTitle>
                      <CardDescription>MySQL {db.version}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleShowConnectionInfo(db)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Connection Info
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleViewMetrics(db)}>
                        <Activity className="mr-2 h-4 w-4" />
                        View Metrics
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleViewBackups(db)}>
                        <Clock className="mr-2 h-4 w-4" />
                        View Backups
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleConfiguration(db)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Configuration
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {db.status === "running" ? (
                        <DropdownMenuItem onSelect={() => handleStopDatabase(db)}>
                          <Square className="mr-2 h-4 w-4" />
                          Stop Database
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => handleStartDatabase(db)}>
                          <Play className="mr-2 h-4 w-4" />
                          Start Database
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => handleRestartDatabase(db)}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Restart Database
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteDatabase(db)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Database
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(db.status)}
                    <span className="text-sm text-muted-foreground">{db.region}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center border rounded-lg p-3">
                    <div>
                      <p className="text-lg font-bold">{db.vcpus}</p>
                      <p className="text-xs text-muted-foreground">vCPUs</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{db.memory}</p>
                      <p className="text-xs text-muted-foreground">GB RAM</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{db.storage}</p>
                      <p className="text-xs text-muted-foreground">GB</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Storage Used</span>
                      <span>
                        {db.storageUsed} / {db.storage} GB
                      </span>
                    </div>
                    <Progress value={(db.storageUsed / db.storage) * 100} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Connections</span>
                      <span>
                        {db.connections} / {db.maxConnections}
                      </span>
                    </div>
                    <Progress
                      value={(db.connections / db.maxConnections) * 100}
                      className="h-1"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Endpoint</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(db.endpoint)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                      {db.endpoint}
                    </code>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {db.sslEnabled && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="mr-1 h-3 w-3" />
                        SSL
                      </Badge>
                    )}
                    {db.backupEnabled && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        Backups
                      </Badge>
                    )}
                    {db.replication !== "none" && (
                      <Badge variant="outline" className="text-xs">
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Replica
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleShowConnectionInfo(db)}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Connect
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Activity className="mr-2 h-4 w-4" />
                      Metrics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {databases.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No MySQL databases</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first managed MySQL database
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Database
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Buffer Pool Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockMetrics.bufferPoolUsage}%</div>
                <Progress value={mockMetrics.bufferPoolUsage} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Query Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockMetrics.avgQueryTime} ms</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mockMetrics.slowQueries} slow queries today
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Threads Connected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockMetrics.threadsConnected}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {mockMetrics.threadsCached} cached
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  InnoDB Rows Read
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(mockMetrics.innodbRowsRead / 1000).toFixed(1)}K
                </div>
                <p className="text-xs text-muted-foreground mt-1">per second</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Database Performance</CardTitle>
              <CardDescription>
                Real-time performance metrics for all MySQL instances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Connections</TableHead>
                    <TableHead>Queries/s</TableHead>
                    <TableHead>CPU</TableHead>
                    <TableHead>Memory</TableHead>
                    <TableHead>Storage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {databases.map((db) => (
                    <TableRow key={db.id}>
                      <TableCell className="font-medium">{db.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(db.status)}
                          <span className="capitalize">{db.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {db.connections}/{db.maxConnections}
                      </TableCell>
                      <TableCell>
                        {db.status === "running" ? Math.floor(Math.random() * 500 + 100) : 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={db.status === "running" ? Math.random() * 60 + 20 : 0}
                            className="w-16 h-2"
                          />
                          <span className="text-sm">
                            {db.status === "running"
                              ? Math.floor(Math.random() * 60 + 20)
                              : 0}
                            %
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={db.status === "running" ? Math.random() * 40 + 40 : 0}
                            className="w-16 h-2"
                          />
                          <span className="text-sm">
                            {db.status === "running"
                              ? Math.floor(Math.random() * 40 + 40)
                              : 0}
                            %
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {db.storageUsed}/{db.storage} GB
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connection Info Dialog */}
      <Dialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Connection Information</DialogTitle>
            <DialogDescription>
              Use these credentials to connect to {selectedDb?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedDb && (
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Host</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                    {selectedDb.endpoint.split(":")[0]}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(selectedDb.endpoint.split(":")[0])}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Port</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                    3306
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard("3306")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Username</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                    admin
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard("admin")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Connection String</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm truncate">
                    mysql://admin:****@{selectedDb.endpoint}/database
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(
                        `mysql://admin:****@${selectedDb.endpoint}/database`
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Your password was set during database creation.
                  For security, we do not display it here. You can reset your password
                  from the database settings.
                </p>
              </div>
              {selectedDb.sslEnabled && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Shield className="h-4 w-4" />
                  <span>SSL/TLS encryption enabled</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectionDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
