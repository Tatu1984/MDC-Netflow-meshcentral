"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, Camera, RotateCcw, Trash2, Server, Calendar, HardDrive } from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { mockVMs } from "@/stores/mock-data";

const mockSnapshots = [
  { id: "snap-001", name: "web-server-backup-daily", vmId: "vm-001", vmName: "web-server-prod-01", size: 45, status: "available", createdAt: new Date(Date.now() - 86400000), type: "manual" },
  { id: "snap-002", name: "api-server-pre-deploy", vmId: "vm-002", vmName: "api-server-prod-01", size: 82, status: "available", createdAt: new Date(Date.now() - 172800000), type: "manual" },
  { id: "snap-003", name: "db-primary-weekly", vmId: "vm-003", vmName: "db-primary-01", size: 156, status: "available", createdAt: new Date(Date.now() - 604800000), type: "scheduled" },
  { id: "snap-004", name: "web-server-auto-2024-01-10", vmId: "vm-001", vmName: "web-server-prod-01", size: 44, status: "available", createdAt: new Date(Date.now() - 259200000), type: "scheduled" },
  { id: "snap-005", name: "cache-server-snapshot", vmId: "vm-004", vmName: "cache-server-01", size: 12, status: "creating", createdAt: new Date(), type: "manual" },
];

type Snapshot = typeof mockSnapshots[0];

export default function SnapshotsPage() {
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [createVMDialogOpen, setCreateVMDialogOpen] = useState(false);
  const [snapshotForAction, setSnapshotForAction] = useState<Snapshot | null>(null);
  const { toast } = useToast();

  const totalSize = mockSnapshots.reduce((sum, s) => sum + s.size, 0);

  const handleRestoreToVM = (snapshot: Snapshot) => {
    setSnapshotForAction(snapshot);
    setRestoreDialogOpen(true);
  };

  const handleCreateVMFromSnapshot = (snapshot: Snapshot) => {
    setSnapshotForAction(snapshot);
    setCreateVMDialogOpen(true);
  };

  const openDeleteDialog = (snapshot: Snapshot) => {
    setSnapshotForAction(snapshot);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSnapshot = () => {
    if (!snapshotForAction) return;
    toast({
      title: "Snapshot Deleted",
      description: `${snapshotForAction.name} has been deleted successfully.`,
      variant: "destructive",
    });
    setDeleteDialogOpen(false);
    setSnapshotForAction(null);
  };

  const handleRestoreConfirm = () => {
    if (!snapshotForAction) return;
    toast({
      title: "Restore Initiated",
      description: `Restoring ${snapshotForAction.vmName} from ${snapshotForAction.name}...`,
    });
    setRestoreDialogOpen(false);
    setSnapshotForAction(null);
  };

  const handleCreateVMConfirm = () => {
    if (!snapshotForAction) return;
    toast({
      title: "VM Creation Started",
      description: `Creating new VM from snapshot ${snapshotForAction.name}...`,
    });
    setCreateVMDialogOpen(false);
    setSnapshotForAction(null);
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Snapshots"
        apis={[
          "GET /api/snapshots",
          "POST /api/snapshots",
          "DELETE /api/snapshots/{id}",
          "POST /api/snapshots/{id}/restore"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Snapshots</h1>
          <p className="text-muted-foreground">
            Point-in-time backups of your virtual machines
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Snapshot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Snapshot</DialogTitle>
              <DialogDescription>
                Create a point-in-time snapshot of a virtual machine
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Source VM</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a VM" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockVMs.filter(vm => vm.status === "running").map((vm) => (
                      <SelectItem key={vm.id} value={vm.id}>
                        {vm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Snapshot Name</Label>
                <Input placeholder="my-snapshot-name" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input placeholder="Pre-deployment backup" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsCreateOpen(false)}>
                Create Snapshot
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Snapshots</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSnapshots.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSize} GB</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockSnapshots.filter((s) => s.type === "manual").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockSnapshots.filter((s) => s.type === "scheduled").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Snapshots Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Snapshots</CardTitle>
            {selectedSnapshots.length > 0 && (
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedSnapshots.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedSnapshots.length === mockSnapshots.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedSnapshots(mockSnapshots.map((s) => s.id));
                      } else {
                        setSelectedSnapshots([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Source VM</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSnapshots.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSnapshots.includes(snapshot.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSnapshots([...selectedSnapshots, snapshot.id]);
                        } else {
                          setSelectedSnapshots(selectedSnapshots.filter((id) => id !== snapshot.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{snapshot.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/compute/vms/${snapshot.vmId}`}
                      className="flex items-center gap-1 text-sm hover:underline"
                    >
                      <Server className="h-3 w-3" />
                      {snapshot.vmName}
                    </Link>
                  </TableCell>
                  <TableCell>{snapshot.size} GB</TableCell>
                  <TableCell>
                    <Badge variant={snapshot.type === "scheduled" ? "secondary" : "outline"}>
                      {snapshot.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        snapshot.status === "available"
                          ? "default"
                          : snapshot.status === "creating"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {snapshot.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(snapshot.createdAt, "MMM d, yyyy HH:mm")}
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
                          onSelect={() => handleRestoreToVM(snapshot)}
                          disabled={snapshot.status !== "available"}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore to VM
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleCreateVMFromSnapshot(snapshot)}
                          disabled={snapshot.status !== "available"}
                        >
                          <Server className="mr-2 h-4 w-4" />
                          Create VM from Snapshot
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => openDeleteDialog(snapshot)}
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

      {/* Restore to VM Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Snapshot to VM</DialogTitle>
            <DialogDescription>
              This will restore the snapshot to the original VM. The VM will be restarted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Snapshot</p>
                    <p className="text-sm text-muted-foreground">
                      {snapshotForAction?.name}
                    </p>
                  </div>
                  <Badge variant="outline">{snapshotForAction?.size} GB</Badge>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Target VM</p>
                    <p className="text-sm text-muted-foreground">
                      {snapshotForAction?.vmName}
                    </p>
                  </div>
                  <Badge variant="secondary">Will Restart</Badge>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestoreConfirm}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create VM from Snapshot Dialog */}
      <Dialog open={createVMDialogOpen} onOpenChange={setCreateVMDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create VM from Snapshot</DialogTitle>
            <DialogDescription>
              Create a new virtual machine using this snapshot as the base image.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-vm-name">New VM Name</Label>
              <Input
                id="new-vm-name"
                placeholder={`${snapshotForAction?.vmName}-restored`}
                defaultValue={`${snapshotForAction?.vmName}-restored`}
              />
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Source Snapshot</p>
                  <p className="text-sm text-muted-foreground">
                    {snapshotForAction?.name}
                  </p>
                </div>
                <Badge variant="outline">{snapshotForAction?.size} GB</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateVMDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVMConfirm}>
              <Server className="mr-2 h-4 w-4" />
              Create VM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {snapshotForAction?.name}? This action cannot be undone.
              The snapshot data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSnapshot}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Snapshot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
