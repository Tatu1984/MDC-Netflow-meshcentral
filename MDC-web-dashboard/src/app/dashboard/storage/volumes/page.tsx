"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, HardDrive, Link2, Loader2, Camera, Maximize2, Unlink } from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
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
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { mockVolumes, mockVMs } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import { Volume } from "@/types";

export default function VolumesPage() {
  const { currentProject } = useAuthStore();
  const { toast } = useToast();
  const volumes = mockVolumes.filter((v) => v.projectId === currentProject?.id);
  const projectVMs = mockVMs.filter((vm) => vm.projectId === currentProject?.id);
  const totalStorage = volumes.reduce((sum, v) => sum + v.size, 0);
  const usedStorage = volumes.filter((v) => v.status === "in-use").reduce((sum, v) => sum + v.size, 0);

  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Dialog states
  const [volumeToDelete, setVolumeToDelete] = useState<Volume | null>(null);
  const [volumeToAttach, setVolumeToAttach] = useState<Volume | null>(null);
  const [volumeToDetach, setVolumeToDetach] = useState<Volume | null>(null);
  const [volumeToResize, setVolumeToResize] = useState<Volume | null>(null);
  const [volumeToSnapshot, setVolumeToSnapshot] = useState<Volume | null>(null);

  // Form states
  const [selectedVMId, setSelectedVMId] = useState<string>("");
  const [newSize, setNewSize] = useState<number>(0);
  const [snapshotName, setSnapshotName] = useState("");

  const handleAttach = async () => {
    if (!volumeToAttach || !selectedVMId) return;
    setIsLoading("attach");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    const vm = projectVMs.find((v) => v.id === selectedVMId);
    toast({
      title: "Volume Attached",
      description: `Volume "${volumeToAttach.name}" has been attached to ${vm?.name}`,
    });
    setVolumeToAttach(null);
    setSelectedVMId("");
  };

  const handleDetach = async () => {
    if (!volumeToDetach) return;
    setIsLoading("detach");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Volume Detached",
      description: `Volume "${volumeToDetach.name}" has been detached`,
    });
    setVolumeToDetach(null);
  };

  const handleResize = async () => {
    if (!volumeToResize) return;
    setIsLoading("resize");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Volume Resized",
      description: `Volume "${volumeToResize.name}" has been resized to ${newSize} GB`,
    });
    setVolumeToResize(null);
    setNewSize(0);
  };

  const handleSnapshot = async () => {
    if (!volumeToSnapshot || !snapshotName) return;
    setIsLoading("snapshot");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Snapshot Created",
      description: `Snapshot "${snapshotName}" has been created for volume "${volumeToSnapshot.name}"`,
    });
    setVolumeToSnapshot(null);
    setSnapshotName("");
  };

  const handleDelete = async () => {
    if (!volumeToDelete) return;
    setIsLoading("delete");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Volume Deleted",
      description: `Volume "${volumeToDelete.name}" has been deleted`,
      variant: "destructive",
    });
    setVolumeToDelete(null);
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Block Volumes"
        apis={[
          "GET /api/volumes",
          "POST /api/volumes",
          "PUT /api/volumes/{id}",
          "DELETE /api/volumes/{id}",
          "POST /api/volumes/{id}/attach",
          "POST /api/volumes/{id}/detach"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Block Volumes</h1>
          <p className="text-muted-foreground">
            Manage persistent block storage volumes
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/storage/volumes/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Volume
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volumes</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{volumes.length}</div>
            <p className="text-xs text-muted-foreground">
              {volumes.filter((v) => v.status === "in-use").length} attached,{" "}
              {volumes.filter((v) => v.status === "available").length} available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStorage} GB</div>
            <Progress value={(usedStorage / totalStorage) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {usedStorage} GB attached
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <span className="text-2xl">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalStorage * 0.10).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              $0.10 per GB/month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volumes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Volumes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attached To</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {volumes.map((volume) => {
                const attachedVM = mockVMs.find((vm) => vm.id === volume.attachedTo);
                return (
                  <TableRow key={volume.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{volume.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{volume.size} GB</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {volume.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          volume.status === "in-use"
                            ? "default"
                            : volume.status === "available"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {volume.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {attachedVM ? (
                        <Link
                          href={`/dashboard/compute/vms/${attachedVM.id}`}
                          className="flex items-center gap-1 text-sm hover:underline"
                        >
                          <Link2 className="h-3 w-3" />
                          {attachedVM.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{volume.region}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {volume.status === "available" ? (
                            <DropdownMenuItem onSelect={() => setVolumeToAttach(volume)}>
                              <Link2 className="mr-2 h-4 w-4" />
                              Attach to VM
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => setVolumeToDetach(volume)}>
                              <Unlink className="mr-2 h-4 w-4" />
                              Detach
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => {
                            setVolumeToResize(volume);
                            setNewSize(volume.size);
                          }}>
                            <Maximize2 className="mr-2 h-4 w-4" />
                            Resize
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => {
                            setVolumeToSnapshot(volume);
                            setSnapshotName(`${volume.name}-snapshot-${Date.now()}`);
                          }}>
                            <Camera className="mr-2 h-4 w-4" />
                            Create Snapshot
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setVolumeToDelete(volume)}
                            disabled={volume.status === "in-use"}
                          >
                            Delete Volume
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {volumes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No volumes found</p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/storage/volumes/create">
                          <Plus className="mr-2 h-4 w-4" />
                          Create your first volume
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Attach Volume Dialog */}
      <Dialog open={!!volumeToAttach} onOpenChange={() => setVolumeToAttach(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach Volume</DialogTitle>
            <DialogDescription>
              Attach <strong>{volumeToAttach?.name}</strong> to a virtual machine.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Virtual Machine</Label>
              <Select value={selectedVMId} onValueChange={setSelectedVMId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a VM" />
                </SelectTrigger>
                <SelectContent>
                  {projectVMs.filter((vm) => vm.status === "running").map((vm) => (
                    <SelectItem key={vm.id} value={vm.id}>
                      {vm.name} ({vm.privateIp})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projectVMs.filter((vm) => vm.status === "running").length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No running VMs available. Start a VM first.
                </p>
              )}
            </div>
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume Size</span>
                <span>{volumeToAttach?.size} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume Type</span>
                <span>{volumeToAttach?.type.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVolumeToAttach(null)}>
              Cancel
            </Button>
            <Button onClick={handleAttach} disabled={!selectedVMId || isLoading === "attach"}>
              {isLoading === "attach" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Attaching...
                </>
              ) : (
                "Attach Volume"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detach Volume Confirmation */}
      <AlertDialog open={!!volumeToDetach} onOpenChange={() => setVolumeToDetach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detach Volume?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to detach <strong>{volumeToDetach?.name}</strong>?
              Make sure no applications are using this volume before detaching.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDetach} disabled={isLoading === "detach"}>
              {isLoading === "detach" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Detaching...
                </>
              ) : (
                "Detach Volume"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resize Volume Dialog */}
      <Dialog open={!!volumeToResize} onOpenChange={() => setVolumeToResize(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resize Volume</DialogTitle>
            <DialogDescription>
              Increase the size of <strong>{volumeToResize?.name}</strong>.
              Volume size can only be increased, not decreased.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>New Size (GB)</Label>
                <span className="text-sm font-medium">{newSize} GB</span>
              </div>
              <Slider
                value={[newSize]}
                onValueChange={(values) => setNewSize(values[0])}
                min={volumeToResize?.size || 10}
                max={1000}
                step={10}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Current: {volumeToResize?.size} GB</span>
                <span>Max: 1000 GB</span>
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Additional Cost</span>
                <span>${((newSize - (volumeToResize?.size || 0)) * 0.10).toFixed(2)}/month</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVolumeToResize(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleResize}
              disabled={newSize <= (volumeToResize?.size || 0) || isLoading === "resize"}
            >
              {isLoading === "resize" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resizing...
                </>
              ) : (
                "Resize Volume"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Snapshot Dialog */}
      <Dialog open={!!volumeToSnapshot} onOpenChange={() => setVolumeToSnapshot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Snapshot</DialogTitle>
            <DialogDescription>
              Create a point-in-time snapshot of <strong>{volumeToSnapshot?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="snapshot-name">Snapshot Name</Label>
              <Input
                id="snapshot-name"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                placeholder="Enter snapshot name"
              />
            </div>
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume Size</span>
                <span>{volumeToSnapshot?.size} GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Cost</span>
                <span>${((volumeToSnapshot?.size || 0) * 0.05).toFixed(2)}/month</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVolumeToSnapshot(null)}>
              Cancel
            </Button>
            <Button onClick={handleSnapshot} disabled={!snapshotName || isLoading === "snapshot"}>
              {isLoading === "snapshot" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Snapshot"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Volume Confirmation */}
      <AlertDialog open={!!volumeToDelete} onOpenChange={() => setVolumeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Volume?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{volumeToDelete?.name}</strong>?
              This action cannot be undone. All data on this volume will be permanently lost.
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
                "Delete Volume"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
