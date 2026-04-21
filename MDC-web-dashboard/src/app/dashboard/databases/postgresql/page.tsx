"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, Database, Activity, Clock, Copy, Loader2, ExternalLink, Trash2, Square, Maximize2, Save } from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { mockDatabases } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import { Database as ManagedDatabase } from "@/types";

export default function PostgreSQLPage() {
  const { currentProject } = useAuthStore();
  const { toast } = useToast();
  const databases = mockDatabases.filter(
    (db) => db.projectId === currentProject?.id && db.engine === "postgresql"
  );

  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Dialog states
  const [dbForDetails, setDbForDetails] = useState<ManagedDatabase | null>(null);
  const [dbForConnection, setDbForConnection] = useState<ManagedDatabase | null>(null);
  const [dbToBackup, setDbToBackup] = useState<ManagedDatabase | null>(null);
  const [dbToResize, setDbToResize] = useState<ManagedDatabase | null>(null);
  const [dbToStop, setDbToStop] = useState<ManagedDatabase | null>(null);
  const [dbToDelete, setDbToDelete] = useState<ManagedDatabase | null>(null);
  const [dbForMetrics, setDbForMetrics] = useState<ManagedDatabase | null>(null);
  const [dbForBackups, setDbForBackups] = useState<ManagedDatabase | null>(null);

  // Form states
  const [backupName, setBackupName] = useState("");
  const [newStorage, setNewStorage] = useState(0);
  const [newVcpus, setNewVcpus] = useState("");

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleBackup = async () => {
    if (!dbToBackup || !backupName) return;
    setIsLoading("backup");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Backup Created",
      description: `Backup "${backupName}" has been created for ${dbToBackup.name}`,
    });
    setDbToBackup(null);
    setBackupName("");
  };

  const handleResize = async () => {
    if (!dbToResize) return;
    setIsLoading("resize");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsLoading(null);
    toast({
      title: "Database Resized",
      description: `${dbToResize.name} has been resized`,
    });
    setDbToResize(null);
  };

  const handleStop = async () => {
    if (!dbToStop) return;
    setIsLoading("stop");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Database Stopped",
      description: `${dbToStop.name} has been stopped`,
    });
    setDbToStop(null);
  };

  const handleDelete = async () => {
    if (!dbToDelete) return;
    setIsLoading("delete");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Database Deleted",
      description: `${dbToDelete.name} has been deleted`,
      variant: "destructive",
    });
    setDbToDelete(null);
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="PostgreSQL Databases"
        apis={[
          "GET /api/databases/postgresql",
          "POST /api/databases/postgresql",
          "PUT /api/databases/postgresql/{id}",
          "DELETE /api/databases/postgresql/{id}",
          "POST /api/databases/postgresql/{id}/backup"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PostgreSQL Databases</h1>
          <p className="text-muted-foreground">
            Managed PostgreSQL database instances
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/databases/postgresql/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Database
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {databases.map((db) => (
          <Card key={db.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Database className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    <button
                      onClick={() => setDbForDetails(db)}
                      className="hover:underline text-left"
                    >
                      {db.name}
                    </button>
                  </CardTitle>
                  <CardDescription>PostgreSQL {db.version}</CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setDbForDetails(db)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDbForConnection(db)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Connection Info
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => {
                    setDbToBackup(db);
                    setBackupName(`${db.name}-backup-${Date.now()}`);
                  }}>
                    <Save className="mr-2 h-4 w-4" />
                    Create Backup
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => {
                    setDbToResize(db);
                    setNewStorage(db.storage);
                    setNewVcpus(String(db.vcpus));
                  }}>
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Resize
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setDbToStop(db)}>
                    <Square className="mr-2 h-4 w-4" />
                    Stop Database
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => setDbToDelete(db)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Database
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={db.status === "running" ? "default" : "secondary"}>
                  {db.status}
                </Badge>
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
                  <span>{Math.round(db.storage * 0.45)} / {db.storage} GB</span>
                </div>
                <Progress value={45} />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Endpoint</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => db.endpoint && copyToClipboard(db.endpoint, "Endpoint")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                  {db.endpoint}
                </code>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDbForMetrics(db)}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Metrics
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDbForBackups(db)}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Backups
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
            <h3 className="text-lg font-semibold mb-1">No PostgreSQL databases</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first managed PostgreSQL database
            </p>
            <Button asChild>
              <Link href="/dashboard/databases/postgresql/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Database
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Database Details Dialog */}
      <Dialog open={!!dbForDetails} onOpenChange={() => setDbForDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              {dbForDetails?.name}
            </DialogTitle>
            <DialogDescription>
              PostgreSQL {dbForDetails?.version} - {dbForDetails?.region}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={dbForDetails?.status === "running" ? "default" : "secondary"}>
                    {dbForDetails?.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="font-medium">PostgreSQL {dbForDetails?.version}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">vCPUs</p>
                  <p className="font-medium">{dbForDetails?.vcpus}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Memory</p>
                  <p className="font-medium">{dbForDetails?.memory} GB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Storage</p>
                  <p className="font-medium">{dbForDetails?.storage} GB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">High Availability</p>
                  <p className="font-medium">{dbForDetails?.highAvailability ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="connection" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Host</Label>
                  <div className="flex gap-2">
                    <Input value={dbForDetails?.endpoint} readOnly />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => dbForDetails && copyToClipboard(dbForDetails.endpoint, "Host")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input value="5432" readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Database</Label>
                    <Input value="postgres" readOnly />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Connection String</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`postgresql://user:password@${dbForDetails?.endpoint}:5432/postgres`}
                      readOnly
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => dbForDetails && copyToClipboard(
                        `postgresql://user:password@${dbForDetails.endpoint}:5432/postgres`,
                        "Connection string"
                      )}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="configuration" className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Automatic Backups</span>
                  <span>Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Backup Retention</span>
                  <span>7 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maintenance Window</span>
                  <span>Sun 02:00-03:00 UTC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SSL Required</span>
                  <span>Yes</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDbForDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connection Info Dialog */}
      <Dialog open={!!dbForConnection} onOpenChange={() => setDbForConnection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connection Information</DialogTitle>
            <DialogDescription>
              Use these details to connect to {dbForConnection?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Host</Label>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                  {dbForConnection?.endpoint}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => dbForConnection && copyToClipboard(dbForConnection.endpoint, "Host")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Port</Label>
                <code className="block bg-muted px-3 py-2 rounded text-sm">5432</code>
              </div>
              <div className="space-y-2">
                <Label>Database</Label>
                <code className="block bg-muted px-3 py-2 rounded text-sm">postgres</code>
              </div>
            </div>
            <div className="space-y-2">
              <Label>psql Command</Label>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm text-xs overflow-x-auto">
                  psql -h {dbForConnection?.endpoint} -p 5432 -U postgres -d postgres
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => dbForConnection && copyToClipboard(
                    `psql -h ${dbForConnection.endpoint} -p 5432 -U postgres -d postgres`,
                    "psql command"
                  )}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDbForConnection(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Backup Dialog */}
      <Dialog open={!!dbToBackup} onOpenChange={() => setDbToBackup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Backup</DialogTitle>
            <DialogDescription>
              Create a backup of {dbToBackup?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-name">Backup Name</Label>
              <Input
                id="backup-name"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="Enter backup name"
              />
            </div>
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Database Size</span>
                <span>{Math.round((dbToBackup?.storage || 0) * 0.45)} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Time</span>
                <span>~2-5 minutes</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDbToBackup(null)}>
              Cancel
            </Button>
            <Button onClick={handleBackup} disabled={!backupName || isLoading === "backup"}>
              {isLoading === "backup" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Backup"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resize Dialog */}
      <Dialog open={!!dbToResize} onOpenChange={() => setDbToResize(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resize Database</DialogTitle>
            <DialogDescription>
              Scale {dbToResize?.name} resources
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Instance Size</Label>
              <Select value={newVcpus} onValueChange={setNewVcpus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 vCPU / 2 GB RAM</SelectItem>
                  <SelectItem value="2">2 vCPU / 4 GB RAM</SelectItem>
                  <SelectItem value="4">4 vCPU / 8 GB RAM</SelectItem>
                  <SelectItem value="8">8 vCPU / 16 GB RAM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Storage (GB)</Label>
                <span className="text-sm font-medium">{newStorage} GB</span>
              </div>
              <Slider
                value={[newStorage]}
                onValueChange={(values) => setNewStorage(values[0])}
                min={dbToResize?.storage || 20}
                max={500}
                step={10}
              />
            </div>
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              Note: The database will be restarted during the resize operation. This may take a few minutes.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDbToResize(null)}>
              Cancel
            </Button>
            <Button onClick={handleResize} disabled={isLoading === "resize"}>
              {isLoading === "resize" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resizing...
                </>
              ) : (
                "Resize Database"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Metrics Dialog */}
      <Dialog open={!!dbForMetrics} onOpenChange={() => setDbForMetrics(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Database Metrics</DialogTitle>
            <DialogDescription>
              Performance metrics for {dbForMetrics?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">CPU Usage</p>
                <p className="text-2xl font-bold">23%</p>
                <Progress value={23} className="mt-2" />
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Memory Usage</p>
                <p className="text-2xl font-bold">67%</p>
                <Progress value={67} className="mt-2" />
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Connections</p>
                <p className="text-2xl font-bold">12 / 100</p>
                <Progress value={12} className="mt-2" />
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold">45%</p>
                <Progress value={45} className="mt-2" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Real-time metrics would be displayed here with charts and graphs.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDbForMetrics(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backups Dialog */}
      <Dialog open={!!dbForBackups} onOpenChange={() => setDbForBackups(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Database Backups</DialogTitle>
            <DialogDescription>
              Backup history for {dbForBackups?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {[
              { name: "Automatic backup", date: "Today, 02:00 AM", size: "1.2 GB" },
              { name: "Automatic backup", date: "Yesterday, 02:00 AM", size: "1.1 GB" },
              { name: "Manual backup", date: "2 days ago", size: "1.1 GB" },
            ].map((backup, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{backup.name}</p>
                  <p className="text-sm text-muted-foreground">{backup.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{backup.size}</span>
                  <Button variant="outline" size="sm">Restore</Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDbForBackups(null)}>
              Close
            </Button>
            <Button onClick={() => {
              setDbForBackups(null);
              if (dbForBackups) {
                setDbToBackup(dbForBackups);
                setBackupName(`${dbForBackups.name}-backup-${Date.now()}`);
              }
            }}>
              Create New Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Database Confirmation */}
      <AlertDialog open={!!dbToStop} onOpenChange={() => setDbToStop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Database?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop <strong>{dbToStop?.name}</strong>?
              The database will be unavailable until started again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStop} disabled={isLoading === "stop"}>
              {isLoading === "stop" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                "Stop Database"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Database Confirmation */}
      <AlertDialog open={!!dbToDelete} onOpenChange={() => setDbToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Database?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{dbToDelete?.name}</strong>?
              This action cannot be undone. All data will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading === "delete"}
            >
              {isLoading === "delete" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Database"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
