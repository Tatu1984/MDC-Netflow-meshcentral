"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Globe,
  Server,
  Trash2,
  Edit,
  Copy,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Scale,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

// Public IP type
interface PublicIP {
  id: string;
  address: string;
  version: "IPv4" | "IPv6";
  status: "allocated" | "associated" | "pending" | "releasing";
  region: string;
  associatedResource?: {
    id: string;
    name: string;
    type: "vm" | "load-balancer" | "nat-gateway";
  };
  reverseDns?: string;
  tags: string[];
  createdAt: string;
  monthlyRate: number;
}

// Mock public IP data
const mockPublicIPs: PublicIP[] = [
  {
    id: "eip-001",
    address: "203.0.113.10",
    version: "IPv4",
    status: "associated",
    region: "us-east-1",
    associatedResource: {
      id: "vm-001",
      name: "web-server-prod-01",
      type: "vm",
    },
    reverseDns: "web1.acme.com",
    tags: ["production", "web"],
    createdAt: "2024-01-15T10:30:00Z",
    monthlyRate: 3.50,
  },
  {
    id: "eip-002",
    address: "203.0.113.11",
    version: "IPv4",
    status: "associated",
    region: "us-east-1",
    associatedResource: {
      id: "vm-002",
      name: "api-server-prod-01",
      type: "vm",
    },
    reverseDns: "api.acme.com",
    tags: ["production", "api"],
    createdAt: "2024-01-15T10:35:00Z",
    monthlyRate: 3.50,
  },
  {
    id: "eip-003",
    address: "203.0.113.100",
    version: "IPv4",
    status: "associated",
    region: "us-east-1",
    associatedResource: {
      id: "lb-001",
      name: "prod-web-lb",
      type: "load-balancer",
    },
    reverseDns: "lb.acme.com",
    tags: ["production", "load-balancer"],
    createdAt: "2024-01-20T12:00:00Z",
    monthlyRate: 3.50,
  },
  {
    id: "eip-004",
    address: "203.0.113.101",
    version: "IPv4",
    status: "associated",
    region: "us-east-1",
    associatedResource: {
      id: "lb-002",
      name: "prod-api-lb",
      type: "load-balancer",
    },
    tags: ["production", "api"],
    createdAt: "2024-01-22T14:00:00Z",
    monthlyRate: 3.50,
  },
  {
    id: "eip-005",
    address: "203.0.113.50",
    version: "IPv4",
    status: "associated",
    region: "us-east-1",
    associatedResource: {
      id: "vm-006",
      name: "staging-web-01",
      type: "vm",
    },
    tags: ["staging"],
    createdAt: "2024-02-15T11:00:00Z",
    monthlyRate: 3.50,
  },
  {
    id: "eip-006",
    address: "203.0.113.200",
    version: "IPv4",
    status: "allocated",
    region: "us-east-1",
    tags: ["reserved"],
    createdAt: "2024-03-01T09:00:00Z",
    monthlyRate: 3.50,
  },
  {
    id: "eip-007",
    address: "203.0.113.201",
    version: "IPv4",
    status: "allocated",
    region: "us-east-1",
    tags: ["reserved", "dr"],
    createdAt: "2024-03-01T09:05:00Z",
    monthlyRate: 3.50,
  },
  {
    id: "eip-008",
    address: "203.0.113.202",
    version: "IPv4",
    status: "pending",
    region: "us-east-1",
    tags: [],
    createdAt: "2024-03-15T10:00:00Z",
    monthlyRate: 3.50,
  },
  {
    id: "eip-009",
    address: "2001:db8::1",
    version: "IPv6",
    status: "associated",
    region: "us-east-1",
    associatedResource: {
      id: "vm-001",
      name: "web-server-prod-01",
      type: "vm",
    },
    tags: ["production", "ipv6"],
    createdAt: "2024-02-01T10:00:00Z",
    monthlyRate: 0,
  },
  {
    id: "eip-010",
    address: "2001:db8::2",
    version: "IPv6",
    status: "allocated",
    region: "us-east-1",
    tags: ["ipv6"],
    createdAt: "2024-02-01T10:05:00Z",
    monthlyRate: 0,
  },
];

const resourceTypeIcons: Record<string, React.ReactNode> = {
  vm: <Server className="h-4 w-4" />,
  "load-balancer": <Scale className="h-4 w-4" />,
  "nat-gateway": <Globe className="h-4 w-4" />,
};

const statusColors: Record<PublicIP["status"], string> = {
  associated: "bg-green-500",
  allocated: "bg-blue-500",
  pending: "bg-yellow-500",
  releasing: "bg-red-500",
};

const statusBadgeVariants: Record<PublicIP["status"], "default" | "secondary" | "destructive" | "outline"> = {
  associated: "default",
  allocated: "secondary",
  pending: "outline",
  releasing: "destructive",
};

export default function PublicIpsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [versionFilter, setVersionFilter] = useState<string>("all");
  const [selectedIPs, setSelectedIPs] = useState<string[]>([]);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [associateDialogOpen, setAssociateDialogOpen] = useState(false);
  const [selectedIP, setSelectedIP] = useState<PublicIP | null>(null);

  // Additional dialog states
  const [editRdnsOpen, setEditRdnsOpen] = useState(false);
  const [editTagsOpen, setEditTagsOpen] = useState(false);
  const [releaseIpOpen, setReleaseIpOpen] = useState(false);

  const filteredIPs = mockPublicIPs.filter((ip) => {
    const matchesSearch =
      ip.address.toLowerCase().includes(search.toLowerCase()) ||
      ip.associatedResource?.name.toLowerCase().includes(search.toLowerCase()) ||
      ip.reverseDns?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || ip.status === statusFilter;
    const matchesVersion = versionFilter === "all" || ip.version === versionFilter;
    return matchesSearch && matchesStatus && matchesVersion;
  });

  const toggleSelectAll = () => {
    if (selectedIPs.length === filteredIPs.length) {
      setSelectedIPs([]);
    } else {
      setSelectedIPs(filteredIPs.map((ip) => ip.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIPs((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const totalAllocated = mockPublicIPs.filter((ip) => ip.status === "allocated").length;
  const totalAssociated = mockPublicIPs.filter((ip) => ip.status === "associated").length;
  const totalIPv4 = mockPublicIPs.filter((ip) => ip.version === "IPv4").length;
  const totalIPv6 = mockPublicIPs.filter((ip) => ip.version === "IPv6").length;
  const monthlyCost = mockPublicIPs.reduce((acc, ip) => acc + ip.monthlyRate, 0);

  // Mock resources for association
  const availableResources = [
    { id: "vm-005", name: "worker-node-01", type: "vm" },
    { id: "vm-007", name: "dev-sandbox-01", type: "vm" },
    { id: "lb-005", name: "new-api-lb", type: "load-balancer" },
  ];

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Public IPs"
        apis={[
          "GET /api/public-ips",
          "POST /api/public-ips",
          "DELETE /api/public-ips/{id}",
          "POST /api/public-ips/{id}/associate",
          "POST /api/public-ips/{id}/disassociate"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Public IPs</h1>
          <p className="text-muted-foreground">
            Manage elastic IP addresses for your resources
          </p>
        </div>
        <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Allocate IP
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Allocate Public IP</DialogTitle>
              <DialogDescription>
                Reserve a new public IP address for your resources
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="ip-version">IP Version</Label>
                <Select defaultValue="IPv4">
                  <SelectTrigger id="ip-version">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IPv4">IPv4</SelectItem>
                    <SelectItem value="IPv6">IPv6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ip-region">Region</Label>
                <Select defaultValue="us-east-1">
                  <SelectTrigger id="ip-region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east-1">US East 1</SelectItem>
                    <SelectItem value="us-west-1">US West 1</SelectItem>
                    <SelectItem value="eu-west-1">EU West 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ip-tags">Tags (comma-separated)</Label>
                <Input id="ip-tags" placeholder="e.g., production, web" />
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">Pricing</p>
                <p className="text-muted-foreground">
                  IPv4: $3.50/month | IPv6: Free
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAllocateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setAllocateDialogOpen(false)}>
                Allocate IP
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IPs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPublicIPs.length}</div>
            <p className="text-xs text-muted-foreground">
              Allocated addresses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Associated</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssociated}</div>
            <p className="text-xs text-muted-foreground">
              In use
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAllocated}</div>
            <p className="text-xs text-muted-foreground">
              Ready to assign
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPv4 / IPv6</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIPv4} / {totalIPv6}</div>
            <p className="text-xs text-muted-foreground">
              By version
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              IPv4 only
            </p>
          </CardContent>
        </Card>
      </div>

      {/* IP Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by IP, resource, or rDNS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="associated">Associated</SelectItem>
                <SelectItem value="allocated">Allocated</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={versionFilter} onValueChange={setVersionFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Version" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Versions</SelectItem>
                <SelectItem value="IPv4">IPv4</SelectItem>
                <SelectItem value="IPv6">IPv6</SelectItem>
              </SelectContent>
            </Select>
            {selectedIPs.length > 0 && (
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Release ({selectedIPs.length})
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
                      selectedIPs.length === filteredIPs.length &&
                      filteredIPs.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Associated Resource</TableHead>
                <TableHead>Reverse DNS</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIPs.map((ip) => (
                <TableRow key={ip.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIPs.includes(ip.id)}
                      onCheckedChange={() => toggleSelect(ip.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${statusColors[ip.status]}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-medium bg-muted px-2 py-0.5 rounded">
                            {ip.address}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {ip.version}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{ip.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariants[ip.status]}>
                      {ip.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ip.associatedResource ? (
                      <Link
                        href={`/dashboard/${ip.associatedResource.type === "vm" ? "compute/vms" : "networking/load-balancers"}/${ip.associatedResource.id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <div className="rounded-lg bg-muted p-1.5">
                          {resourceTypeIcons[ip.associatedResource.type]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{ip.associatedResource.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {ip.associatedResource.type.replace("-", " ")}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not associated</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ip.reverseDns ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {ip.reverseDns}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ip.region}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {ip.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {ip.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{ip.tags.length - 2}
                        </Badge>
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
                            setSelectedIP(ip);
                            setAssociateDialogOpen(true);
                          }}
                        >
                          {ip.associatedResource ? (
                            <>
                              <Unlink className="mr-2 h-4 w-4" />
                              Disassociate
                            </>
                          ) : (
                            <>
                              <Link2 className="mr-2 h-4 w-4" />
                              Associate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            navigator.clipboard.writeText(ip.address);
                            toast({
                              title: "IP copied",
                              description: `${ip.address} copied to clipboard.`,
                            });
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy IP
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setSelectedIP(ip);
                            setEditRdnsOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Reverse DNS
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setSelectedIP(ip);
                            setEditTagsOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Tags
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => {
                            setSelectedIP(ip);
                            setReleaseIpOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Release IP
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredIPs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No public IPs found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAllocateDialogOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Allocate your first IP
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Associate Dialog */}
      <Dialog open={associateDialogOpen} onOpenChange={setAssociateDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {selectedIP?.associatedResource ? "Disassociate IP" : "Associate IP"}
            </DialogTitle>
            <DialogDescription>
              {selectedIP?.associatedResource
                ? `Disassociate ${selectedIP.address} from ${selectedIP.associatedResource.name}`
                : `Associate ${selectedIP?.address} with a resource`}
            </DialogDescription>
          </DialogHeader>
          {selectedIP?.associatedResource ? (
            <div className="py-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">IP Address</span>
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">
                    {selectedIP.address}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Currently associated with</span>
                  <span className="text-sm font-medium">{selectedIP.associatedResource.name}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">
                  The resource will lose its public IP address
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Select Resource</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableResources.map((resource) => (
                      <SelectItem key={resource.id} value={resource.id}>
                        <div className="flex items-center gap-2">
                          {resourceTypeIcons[resource.type]}
                          <span>{resource.name}</span>
                          <span className="text-muted-foreground text-xs capitalize">
                            ({resource.type.replace("-", " ")})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssociateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={selectedIP?.associatedResource ? "destructive" : "default"}
              onClick={() => {
                setAssociateDialogOpen(false);
                toast({
                  title: selectedIP?.associatedResource ? "IP disassociated" : "IP associated",
                  description: selectedIP?.associatedResource
                    ? `${selectedIP.address} has been disassociated.`
                    : `${selectedIP?.address} has been associated.`,
                });
              }}
            >
              {selectedIP?.associatedResource ? "Disassociate" : "Associate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Reverse DNS Dialog */}
      <Dialog open={editRdnsOpen} onOpenChange={setEditRdnsOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Reverse DNS</DialogTitle>
            <DialogDescription>
              Update the reverse DNS record for {selectedIP?.address}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rdns">Reverse DNS Hostname</Label>
              <Input
                id="rdns"
                defaultValue={selectedIP?.reverseDns || ""}
                placeholder="e.g., server.example.com"
              />
              <p className="text-xs text-muted-foreground">
                The hostname must point to this IP address for verification.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRdnsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setEditRdnsOpen(false);
              toast({
                title: "Reverse DNS updated",
                description: `Reverse DNS for ${selectedIP?.address} has been updated.`,
              });
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tags Dialog */}
      <Dialog open={editTagsOpen} onOpenChange={setEditTagsOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Tags</DialogTitle>
            <DialogDescription>
              Manage tags for {selectedIP?.address}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                defaultValue={selectedIP?.tags.join(", ") || ""}
                placeholder="e.g., production, web, frontend"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedIP?.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTagsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setEditTagsOpen(false);
              toast({
                title: "Tags updated",
                description: `Tags for ${selectedIP?.address} have been updated.`,
              });
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release IP Confirmation */}
      <AlertDialog open={releaseIpOpen} onOpenChange={setReleaseIpOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Public IP</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to release {selectedIP?.address}?
              {selectedIP?.associatedResource && (
                <span className="block mt-2 text-yellow-600">
                  Warning: This IP is currently associated with {selectedIP.associatedResource.name}.
                  The resource will lose its public IP address.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "IP released",
                  description: `${selectedIP?.address} has been released.`,
                });
                setSelectedIP(null);
              }}
            >
              Release IP
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
