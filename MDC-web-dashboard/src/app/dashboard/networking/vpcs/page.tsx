"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, Network, Globe, Lock, Trash2, Loader2, Edit, Route, PlusCircle } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { mockVPCs } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import { VPC } from "@/types";

export default function VPCsPage() {
  const { currentProject } = useAuthStore();
  const { toast } = useToast();
  const vpcs = mockVPCs.filter((v) => v.projectId === currentProject?.id);

  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Dialog states
  const [vpcToEdit, setVpcToEdit] = useState<VPC | null>(null);
  const [vpcForSubnet, setVpcForSubnet] = useState<VPC | null>(null);
  const [vpcForRoutes, setVpcForRoutes] = useState<VPC | null>(null);
  const [vpcToDelete, setVpcToDelete] = useState<VPC | null>(null);

  // Form states
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [subnetName, setSubnetName] = useState("");
  const [subnetCidr, setSubnetCidr] = useState("");
  const [subnetZone, setSubnetZone] = useState("");
  const [subnetIsPublic, setSubnetIsPublic] = useState(false);

  const handleEditVPC = async () => {
    if (!vpcToEdit) return;
    setIsLoading("edit");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "VPC Updated",
      description: `VPC "${editName}" has been updated`,
    });
    setVpcToEdit(null);
  };

  const handleAddSubnet = async () => {
    if (!vpcForSubnet || !subnetName || !subnetCidr || !subnetZone) return;
    setIsLoading("subnet");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Subnet Created",
      description: `Subnet "${subnetName}" has been added to ${vpcForSubnet.name}`,
    });
    setVpcForSubnet(null);
    setSubnetName("");
    setSubnetCidr("");
    setSubnetZone("");
    setSubnetIsPublic(false);
  };

  const handleDelete = async () => {
    if (!vpcToDelete) return;
    setIsLoading("delete");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "VPC Deleted",
      description: `VPC "${vpcToDelete.name}" has been deleted`,
      variant: "destructive",
    });
    setVpcToDelete(null);
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Virtual Private Clouds"
        apis={[
          "GET /api/vpcs",
          "POST /api/vpcs",
          "PUT /api/vpcs/{id}",
          "DELETE /api/vpcs/{id}"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virtual Private Clouds</h1>
          <p className="text-muted-foreground">
            Manage isolated virtual networks for your resources
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/networking/vpcs/create">
            <Plus className="mr-2 h-4 w-4" />
            Create VPC
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {vpcs.map((vpc) => (
          <Card key={vpc.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Network className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{vpc.name}</CardTitle>
                  <CardDescription>
                    {vpc.cidr} / {vpc.region}
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
                  <DropdownMenuItem onSelect={() => {
                    setVpcToEdit(vpc);
                    setEditName(vpc.name);
                    setEditDescription("");
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit VPC
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setVpcForSubnet(vpc)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Subnet
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setVpcForRoutes(vpc)}>
                    <Route className="mr-2 h-4 w-4" />
                    Route Tables
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => setVpcToDelete(vpc)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete VPC
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center border rounded-lg p-4">
                  <div>
                    <p className="text-2xl font-bold">{vpc.subnets.length}</p>
                    <p className="text-xs text-muted-foreground">Subnets</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vpc.subnets.filter((s) => s.isPublic).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Public</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vpc.subnets.filter((s) => !s.isPublic).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Private</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {new Set(vpc.subnets.map((s) => s.zone)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">AZs</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subnet Name</TableHead>
                      <TableHead>CIDR Block</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vpc.subnets.map((subnet) => (
                      <TableRow key={subnet.id}>
                        <TableCell className="font-medium">{subnet.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {subnet.cidr}
                          </code>
                        </TableCell>
                        <TableCell>{subnet.zone}</TableCell>
                        <TableCell>
                          <Badge variant={subnet.isPublic ? "default" : "secondary"}>
                            {subnet.isPublic ? (
                              <><Globe className="mr-1 h-3 w-3" /> Public</>
                            ) : (
                              <><Lock className="mr-1 h-3 w-3" /> Private</>
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}

        {vpcs.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Network className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No VPCs found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first Virtual Private Cloud to get started
              </p>
              <Button asChild>
                <Link href="/dashboard/networking/vpcs/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create VPC
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit VPC Dialog */}
      <Dialog open={!!vpcToEdit} onOpenChange={() => setVpcToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit VPC</DialogTitle>
            <DialogDescription>
              Update the settings for {vpcToEdit?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vpc-name">Name</Label>
              <Input
                id="vpc-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vpc-description">Description</Label>
              <Input
                id="vpc-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label>CIDR Block</Label>
              <Input value={vpcToEdit?.cidr} disabled />
              <p className="text-xs text-muted-foreground">CIDR block cannot be changed after creation</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVpcToEdit(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditVPC} disabled={!editName || isLoading === "edit"}>
              {isLoading === "edit" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subnet Dialog */}
      <Dialog open={!!vpcForSubnet} onOpenChange={() => setVpcForSubnet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subnet</DialogTitle>
            <DialogDescription>
              Add a new subnet to {vpcForSubnet?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subnet-name">Subnet Name</Label>
              <Input
                id="subnet-name"
                value={subnetName}
                onChange={(e) => setSubnetName(e.target.value)}
                placeholder="e.g., public-subnet-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subnet-cidr">CIDR Block</Label>
              <Input
                id="subnet-cidr"
                value={subnetCidr}
                onChange={(e) => setSubnetCidr(e.target.value)}
                placeholder="e.g., 10.0.1.0/24"
              />
              <p className="text-xs text-muted-foreground">
                Must be within VPC CIDR: {vpcForSubnet?.cidr}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Availability Zone</Label>
              <Select value={subnetZone} onValueChange={setSubnetZone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1a">us-east-1a</SelectItem>
                  <SelectItem value="us-east-1b">us-east-1b</SelectItem>
                  <SelectItem value="us-east-1c">us-east-1c</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public Subnet</Label>
                <p className="text-sm text-muted-foreground">
                  Enable auto-assign public IP
                </p>
              </div>
              <Switch
                checked={subnetIsPublic}
                onCheckedChange={setSubnetIsPublic}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVpcForSubnet(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSubnet}
              disabled={!subnetName || !subnetCidr || !subnetZone || isLoading === "subnet"}
            >
              {isLoading === "subnet" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Subnet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route Tables Dialog */}
      <Dialog open={!!vpcForRoutes} onOpenChange={() => setVpcForRoutes(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Route Tables</DialogTitle>
            <DialogDescription>
              Manage route tables for {vpcForRoutes?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destination</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {vpcForRoutes?.cidr}
                    </code>
                  </TableCell>
                  <TableCell>local</TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">0.0.0.0/0</code>
                  </TableCell>
                  <TableCell>igw-12345678</TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-4">
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Route
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVpcForRoutes(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete VPC Confirmation */}
      <AlertDialog open={!!vpcToDelete} onOpenChange={() => setVpcToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete VPC?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{vpcToDelete?.name}</strong>?
              This will also delete all subnets, route tables, and security groups associated with this VPC.
              This action cannot be undone.
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
                "Delete VPC"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
