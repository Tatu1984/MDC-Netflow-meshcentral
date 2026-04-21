"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Network,
  Globe,
  Lock,
  Trash2,
  Edit,
  Copy,
  Filter,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// Extended subnet type with VPC reference
interface SubnetWithVPC {
  id: string;
  name: string;
  cidr: string;
  zone: string;
  isPublic: boolean;
  vpcId: string;
  vpcName: string;
  vpcCidr: string;
  availableIPs: number;
  usedIPs: number;
  routeTableId: string;
  natGatewayId?: string;
  createdAt: string;
}

// Mock subnet data
const mockSubnets: SubnetWithVPC[] = [
  {
    id: "sub-001",
    name: "public-subnet-1a",
    cidr: "10.0.1.0/24",
    zone: "us-east-1a",
    isPublic: true,
    vpcId: "vpc-001",
    vpcName: "production-vpc",
    vpcCidr: "10.0.0.0/16",
    availableIPs: 251,
    usedIPs: 3,
    routeTableId: "rtb-001",
    createdAt: "2024-01-05T09:00:00Z",
  },
  {
    id: "sub-002",
    name: "public-subnet-1b",
    cidr: "10.0.2.0/24",
    zone: "us-east-1b",
    isPublic: true,
    vpcId: "vpc-001",
    vpcName: "production-vpc",
    vpcCidr: "10.0.0.0/16",
    availableIPs: 250,
    usedIPs: 4,
    routeTableId: "rtb-001",
    createdAt: "2024-01-05T09:05:00Z",
  },
  {
    id: "sub-003",
    name: "private-subnet-1a",
    cidr: "10.0.10.0/24",
    zone: "us-east-1a",
    isPublic: false,
    vpcId: "vpc-001",
    vpcName: "production-vpc",
    vpcCidr: "10.0.0.0/16",
    availableIPs: 240,
    usedIPs: 14,
    routeTableId: "rtb-002",
    natGatewayId: "nat-001",
    createdAt: "2024-01-05T09:10:00Z",
  },
  {
    id: "sub-004",
    name: "private-subnet-1b",
    cidr: "10.0.11.0/24",
    zone: "us-east-1b",
    isPublic: false,
    vpcId: "vpc-001",
    vpcName: "production-vpc",
    vpcCidr: "10.0.0.0/16",
    availableIPs: 245,
    usedIPs: 9,
    routeTableId: "rtb-002",
    natGatewayId: "nat-002",
    createdAt: "2024-01-05T09:15:00Z",
  },
  {
    id: "sub-005",
    name: "database-subnet-1a",
    cidr: "10.0.20.0/24",
    zone: "us-east-1a",
    isPublic: false,
    vpcId: "vpc-001",
    vpcName: "production-vpc",
    vpcCidr: "10.0.0.0/16",
    availableIPs: 252,
    usedIPs: 2,
    routeTableId: "rtb-003",
    createdAt: "2024-01-06T10:00:00Z",
  },
  {
    id: "sub-006",
    name: "database-subnet-1b",
    cidr: "10.0.21.0/24",
    zone: "us-east-1b",
    isPublic: false,
    vpcId: "vpc-001",
    vpcName: "production-vpc",
    vpcCidr: "10.0.0.0/16",
    availableIPs: 252,
    usedIPs: 2,
    routeTableId: "rtb-003",
    createdAt: "2024-01-06T10:05:00Z",
  },
  {
    id: "sub-007",
    name: "staging-public",
    cidr: "10.1.1.0/24",
    zone: "us-east-1a",
    isPublic: true,
    vpcId: "vpc-002",
    vpcName: "staging-vpc",
    vpcCidr: "10.1.0.0/16",
    availableIPs: 248,
    usedIPs: 6,
    routeTableId: "rtb-004",
    createdAt: "2024-02-01T09:00:00Z",
  },
  {
    id: "sub-008",
    name: "staging-private",
    cidr: "10.1.10.0/24",
    zone: "us-east-1a",
    isPublic: false,
    vpcId: "vpc-002",
    vpcName: "staging-vpc",
    vpcCidr: "10.1.0.0/16",
    availableIPs: 250,
    usedIPs: 4,
    routeTableId: "rtb-005",
    natGatewayId: "nat-003",
    createdAt: "2024-02-01T09:05:00Z",
  },
];

const vpcs = [
  { id: "vpc-001", name: "production-vpc" },
  { id: "vpc-002", name: "staging-vpc" },
];

const zones = ["us-east-1a", "us-east-1b", "us-east-1c"];

export default function SubnetsPage() {
  const [search, setSearch] = useState("");
  const [vpcFilter, setVpcFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedSubnets, setSelectedSubnets] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeTableDialogOpen, setRouteTableDialogOpen] = useState(false);
  const [subnetForAction, setSubnetForAction] = useState<SubnetWithVPC | null>(null);
  const { toast } = useToast();

  const filteredSubnets = mockSubnets.filter((subnet) => {
    const matchesSearch =
      subnet.name.toLowerCase().includes(search.toLowerCase()) ||
      subnet.cidr.includes(search);
    const matchesVpc = vpcFilter === "all" || subnet.vpcId === vpcFilter;
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "public" && subnet.isPublic) ||
      (typeFilter === "private" && !subnet.isPublic);
    return matchesSearch && matchesVpc && matchesType;
  });

  const toggleSelectAll = () => {
    if (selectedSubnets.length === filteredSubnets.length) {
      setSelectedSubnets([]);
    } else {
      setSelectedSubnets(filteredSubnets.map((s) => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedSubnets((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const totalPublic = mockSubnets.filter((s) => s.isPublic).length;
  const totalPrivate = mockSubnets.filter((s) => !s.isPublic).length;
  const totalAvailableIPs = mockSubnets.reduce((acc, s) => acc + s.availableIPs, 0);

  const handleEditSubnet = (subnet: SubnetWithVPC) => {
    setSubnetForAction(subnet);
    setEditDialogOpen(true);
  };

  const handleCopyCIDR = (subnet: SubnetWithVPC) => {
    navigator.clipboard.writeText(subnet.cidr);
    toast({
      title: "CIDR Copied",
      description: `${subnet.cidr} has been copied to clipboard.`,
    });
  };

  const handleRouteTable = (subnet: SubnetWithVPC) => {
    setSubnetForAction(subnet);
    setRouteTableDialogOpen(true);
  };

  const openDeleteDialog = (subnet: SubnetWithVPC) => {
    setSubnetForAction(subnet);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSubnet = () => {
    if (!subnetForAction) return;
    toast({
      title: "Subnet Deleted",
      description: `${subnetForAction.name} has been deleted successfully.`,
      variant: "destructive",
    });
    setDeleteDialogOpen(false);
    setSubnetForAction(null);
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Subnets"
        apis={[
          "GET /api/subnets",
          "POST /api/subnets",
          "PUT /api/subnets/{id}",
          "DELETE /api/subnets/{id}"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subnets</h1>
          <p className="text-muted-foreground">
            Manage subnet configurations within your VPCs
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Subnet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Subnet</DialogTitle>
              <DialogDescription>
                Create a new subnet within an existing VPC
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="subnet-name">Subnet Name</Label>
                <Input id="subnet-name" placeholder="e.g., app-subnet-1a" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vpc-select">VPC</Label>
                <Select>
                  <SelectTrigger id="vpc-select">
                    <SelectValue placeholder="Select VPC" />
                  </SelectTrigger>
                  <SelectContent>
                    {vpcs.map((vpc) => (
                      <SelectItem key={vpc.id} value={vpc.id}>
                        {vpc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cidr">CIDR Block</Label>
                <Input id="cidr" placeholder="e.g., 10.0.3.0/24" />
                <p className="text-xs text-muted-foreground">
                  Must be within the VPC CIDR range and not overlap with existing subnets
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zone-select">Availability Zone</Label>
                <Select>
                  <SelectTrigger id="zone-select">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="is-public" />
                <Label htmlFor="is-public" className="text-sm font-normal">
                  Public subnet (auto-assign public IPs to instances)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateDialogOpen(false)}>
                Create Subnet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subnets</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSubnets.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {vpcs.length} VPCs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public Subnets</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPublic}</div>
            <p className="text-xs text-muted-foreground">
              Internet-accessible
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Private Subnets</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrivate}</div>
            <p className="text-xs text-muted-foreground">
              Internal only
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available IPs</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAvailableIPs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all subnets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subnet Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or CIDR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={vpcFilter} onValueChange={setVpcFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by VPC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All VPCs</SelectItem>
                {vpcs.map((vpc) => (
                  <SelectItem key={vpc.id} value={vpc.id}>
                    {vpc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
            {selectedSubnets.length > 0 && (
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedSubnets.length})
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
                    checked={
                      selectedSubnets.length === filteredSubnets.length &&
                      filteredSubnets.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Subnet Name</TableHead>
                <TableHead>CIDR Block</TableHead>
                <TableHead>Availability Zone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>VPC</TableHead>
                <TableHead>Available IPs</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubnets.map((subnet) => (
                <TableRow key={subnet.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSubnets.includes(subnet.id)}
                      onCheckedChange={() => toggleSelect(subnet.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-lg p-1.5 ${
                          subnet.isPublic
                            ? "bg-green-500/10"
                            : "bg-blue-500/10"
                        }`}
                      >
                        {subnet.isPublic ? (
                          <Globe className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{subnet.name}</p>
                        <p className="text-xs text-muted-foreground">{subnet.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {subnet.cidr}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{subnet.zone}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subnet.isPublic ? "default" : "secondary"}>
                      {subnet.isPublic ? "Public" : "Private"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/networking/vpcs/${subnet.vpcId}`}
                      className="hover:underline"
                    >
                      <div>
                        <p className="text-sm">{subnet.vpcName}</p>
                        <p className="text-xs text-muted-foreground">
                          {subnet.vpcCidr}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{subnet.availableIPs}</span>
                      <span className="text-muted-foreground"> / 254</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${(subnet.usedIPs / 254) * 100}%`,
                        }}
                      />
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
                        <DropdownMenuItem onSelect={() => handleEditSubnet(subnet)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Subnet
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleCopyCIDR(subnet)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy CIDR
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleRouteTable(subnet)}>
                          <Network className="mr-2 h-4 w-4" />
                          Route Table
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => openDeleteDialog(subnet)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Subnet
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSubnets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No subnets found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCreateDialogOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create your first subnet
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Subnet Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Subnet</DialogTitle>
            <DialogDescription>
              Update settings for {subnetForAction?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-subnet-name">Subnet Name</Label>
              <Input id="edit-subnet-name" defaultValue={subnetForAction?.name} />
            </div>
            <div className="grid gap-2">
              <Label>CIDR Block</Label>
              <Input value={subnetForAction?.cidr} disabled />
              <p className="text-xs text-muted-foreground">
                CIDR block cannot be changed after creation
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="edit-is-public" defaultChecked={subnetForAction?.isPublic} />
              <Label htmlFor="edit-is-public" className="text-sm font-normal">
                Public subnet (auto-assign public IPs to instances)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Subnet Updated",
                description: `${subnetForAction?.name} has been updated successfully.`,
              });
              setEditDialogOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Route Table Dialog */}
      <Dialog open={routeTableDialogOpen} onOpenChange={setRouteTableDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Route Table</DialogTitle>
            <DialogDescription>
              Route table configuration for {subnetForAction?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Associated Route Table</p>
                    <p className="text-sm text-muted-foreground">
                      {subnetForAction?.routeTableId}
                    </p>
                  </div>
                  <Badge variant="outline">Active</Badge>
                </div>
              </div>
              {subnetForAction?.natGatewayId && (
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">NAT Gateway</p>
                      <p className="text-sm text-muted-foreground">
                        {subnetForAction.natGatewayId}
                      </p>
                    </div>
                    <Badge variant="secondary">Configured</Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteTableDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              toast({
                title: "Edit Route Table",
                description: "Opening route table editor...",
              });
            }}>
              Edit Routes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subnet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {subnetForAction?.name}? This action cannot be undone.
              Make sure no resources are using this subnet before deleting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubnet}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Subnet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
