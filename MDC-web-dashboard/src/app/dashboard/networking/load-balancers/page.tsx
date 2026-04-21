"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Scale,
  Activity,
  Server,
  Settings,
  Trash2,
  Edit,
  Copy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Globe,
  RefreshCw,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Extended Load Balancer type
interface LoadBalancerExtended {
  id: string;
  name: string;
  type: "L4" | "L7";
  status: "active" | "provisioning" | "degraded" | "error";
  publicIp: string;
  vpcId: string;
  vpcName: string;
  region: string;
  listeners: Listener[];
  backends: Backend[];
  trafficMetrics: TrafficMetrics;
  createdAt: string;
}

interface Listener {
  id: string;
  protocol: "HTTP" | "HTTPS" | "TCP" | "UDP";
  port: number;
  targetPort: number;
  sslCertificate?: string;
}

interface Backend {
  id: string;
  name: string;
  type: "vm" | "ip";
  target: string;
  port: number;
  weight: number;
  status: "healthy" | "unhealthy" | "draining";
  lastCheck: string;
  responseTime: number;
}

interface TrafficMetrics {
  requestsPerSecond: number;
  activeConnections: number;
  bytesIn: number;
  bytesOut: number;
  errorRate: number;
  avgLatency: number;
}

// Mock load balancer data
const mockLoadBalancers: LoadBalancerExtended[] = [
  {
    id: "lb-001",
    name: "prod-web-lb",
    type: "L7",
    status: "active",
    publicIp: "203.0.113.100",
    vpcId: "vpc-001",
    vpcName: "production-vpc",
    region: "us-east-1",
    listeners: [
      { id: "lst-1", protocol: "HTTPS", port: 443, targetPort: 8080, sslCertificate: "cert-prod-wildcard" },
      { id: "lst-2", protocol: "HTTP", port: 80, targetPort: 8080 },
    ],
    backends: [
      { id: "be-1", name: "web-server-prod-01", type: "vm", target: "10.0.1.10", port: 8080, weight: 50, status: "healthy", lastCheck: "2024-03-15T10:30:00Z", responseTime: 45 },
      { id: "be-2", name: "web-server-prod-02", type: "vm", target: "10.0.1.11", port: 8080, weight: 50, status: "healthy", lastCheck: "2024-03-15T10:30:00Z", responseTime: 38 },
      { id: "be-3", name: "web-server-prod-03", type: "vm", target: "10.0.2.10", port: 8080, weight: 50, status: "healthy", lastCheck: "2024-03-15T10:30:00Z", responseTime: 52 },
    ],
    trafficMetrics: {
      requestsPerSecond: 2450,
      activeConnections: 12840,
      bytesIn: 524288000,
      bytesOut: 2147483648,
      errorRate: 0.12,
      avgLatency: 45,
    },
    createdAt: "2024-01-20T12:00:00Z",
  },
  {
    id: "lb-002",
    name: "prod-api-lb",
    type: "L7",
    status: "active",
    publicIp: "203.0.113.101",
    vpcId: "vpc-001",
    vpcName: "production-vpc",
    region: "us-east-1",
    listeners: [
      { id: "lst-3", protocol: "HTTPS", port: 443, targetPort: 3000, sslCertificate: "cert-api-wildcard" },
    ],
    backends: [
      { id: "be-4", name: "api-server-01", type: "vm", target: "10.0.1.20", port: 3000, weight: 33, status: "healthy", lastCheck: "2024-03-15T10:30:00Z", responseTime: 28 },
      { id: "be-5", name: "api-server-02", type: "vm", target: "10.0.1.21", port: 3000, weight: 33, status: "healthy", lastCheck: "2024-03-15T10:30:00Z", responseTime: 32 },
      { id: "be-6", name: "api-server-03", type: "vm", target: "10.0.2.20", port: 3000, weight: 34, status: "unhealthy", lastCheck: "2024-03-15T10:28:00Z", responseTime: 0 },
    ],
    trafficMetrics: {
      requestsPerSecond: 5680,
      activeConnections: 8420,
      bytesIn: 1073741824,
      bytesOut: 3221225472,
      errorRate: 0.85,
      avgLatency: 32,
    },
    createdAt: "2024-01-22T14:00:00Z",
  },
  {
    id: "lb-003",
    name: "internal-db-lb",
    type: "L4",
    status: "active",
    publicIp: "10.0.100.1",
    vpcId: "vpc-001",
    vpcName: "production-vpc",
    region: "us-east-1",
    listeners: [
      { id: "lst-4", protocol: "TCP", port: 5432, targetPort: 5432 },
    ],
    backends: [
      { id: "be-7", name: "db-primary", type: "vm", target: "10.0.10.5", port: 5432, weight: 100, status: "healthy", lastCheck: "2024-03-15T10:30:00Z", responseTime: 2 },
      { id: "be-8", name: "db-replica-1", type: "vm", target: "10.0.10.6", port: 5432, weight: 0, status: "healthy", lastCheck: "2024-03-15T10:30:00Z", responseTime: 3 },
    ],
    trafficMetrics: {
      requestsPerSecond: 890,
      activeConnections: 245,
      bytesIn: 104857600,
      bytesOut: 209715200,
      errorRate: 0,
      avgLatency: 2,
    },
    createdAt: "2024-01-25T09:00:00Z",
  },
  {
    id: "lb-004",
    name: "staging-web-lb",
    type: "L7",
    status: "degraded",
    publicIp: "203.0.113.150",
    vpcId: "vpc-002",
    vpcName: "staging-vpc",
    region: "us-east-1",
    listeners: [
      { id: "lst-5", protocol: "HTTP", port: 80, targetPort: 8080 },
    ],
    backends: [
      { id: "be-9", name: "staging-web-01", type: "vm", target: "10.1.1.10", port: 8080, weight: 50, status: "healthy", lastCheck: "2024-03-15T10:30:00Z", responseTime: 65 },
      { id: "be-10", name: "staging-web-02", type: "vm", target: "10.1.1.11", port: 8080, weight: 50, status: "unhealthy", lastCheck: "2024-03-15T10:25:00Z", responseTime: 0 },
    ],
    trafficMetrics: {
      requestsPerSecond: 120,
      activeConnections: 45,
      bytesIn: 10485760,
      bytesOut: 52428800,
      errorRate: 2.5,
      avgLatency: 85,
    },
    createdAt: "2024-02-10T11:00:00Z",
  },
];

const statusColors: Record<LoadBalancerExtended["status"], string> = {
  active: "bg-green-500",
  provisioning: "bg-blue-500",
  degraded: "bg-yellow-500",
  error: "bg-red-500",
};

const statusBadgeVariants: Record<LoadBalancerExtended["status"], "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  provisioning: "outline",
  degraded: "secondary",
  error: "destructive",
};

const healthStatusIcon = (status: Backend["status"]) => {
  switch (status) {
    case "healthy":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "unhealthy":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "draining":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  }
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function LoadBalancersPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLB, setSelectedLB] = useState<LoadBalancerExtended | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lbToDelete, setLbToDelete] = useState<LoadBalancerExtended | null>(null);
  const { toast } = useToast();

  const filteredLBs = mockLoadBalancers.filter((lb) => {
    const matchesSearch =
      lb.name.toLowerCase().includes(search.toLowerCase()) ||
      lb.publicIp.includes(search);
    const matchesType = typeFilter === "all" || lb.type === typeFilter;
    const matchesStatus = statusFilter === "all" || lb.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalActive = mockLoadBalancers.filter((lb) => lb.status === "active").length;
  const totalL7 = mockLoadBalancers.filter((lb) => lb.type === "L7").length;
  const totalL4 = mockLoadBalancers.filter((lb) => lb.type === "L4").length;
  const totalRPS = mockLoadBalancers.reduce((acc, lb) => acc + lb.trafficMetrics.requestsPerSecond, 0);

  const handleCopyIP = (ip: string) => {
    navigator.clipboard.writeText(ip);
    toast({
      title: "IP Copied",
      description: `${ip} has been copied to clipboard.`,
    });
  };

  const handleForceHealthCheck = () => {
    if (!selectedLB) return;
    toast({
      title: "Health Check Initiated",
      description: `Forcing health check on ${selectedLB.name}...`,
    });
  };

  const handleEditConfiguration = () => {
    if (!selectedLB) return;
    setEditDialogOpen(true);
  };

  const handleDeleteLB = () => {
    if (!lbToDelete) return;
    toast({
      title: "Load Balancer Deleted",
      description: `${lbToDelete.name} has been deleted successfully.`,
      variant: "destructive",
    });
    setDeleteDialogOpen(false);
    setLbToDelete(null);
    if (selectedLB?.id === lbToDelete.id) {
      setSelectedLB(null);
    }
  };

  const openDeleteDialog = (lb: LoadBalancerExtended) => {
    setLbToDelete(lb);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Load Balancers"
        apis={[
          "GET /api/load-balancers",
          "POST /api/load-balancers",
          "PUT /api/load-balancers/{id}",
          "DELETE /api/load-balancers/{id}",
          "PUT /api/load-balancers/{id}/targets"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Load Balancers</h1>
          <p className="text-muted-foreground">
            Distribute traffic across your backend services
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Load Balancer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Load Balancer</DialogTitle>
              <DialogDescription>
                Configure a new load balancer to distribute traffic
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="lb-name">Name</Label>
                <Input id="lb-name" placeholder="e.g., prod-api-lb" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lb-type">Type</Label>
                  <Select>
                    <SelectTrigger id="lb-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L7">Application (L7)</SelectItem>
                      <SelectItem value="L4">Network (L4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lb-region">Region</Label>
                  <Select>
                    <SelectTrigger id="lb-region">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us-east-1">US East 1</SelectItem>
                      <SelectItem value="us-west-1">US West 1</SelectItem>
                      <SelectItem value="eu-west-1">EU West 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lb-vpc">VPC</Label>
                <Select>
                  <SelectTrigger id="lb-vpc">
                    <SelectValue placeholder="Select VPC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vpc-001">production-vpc</SelectItem>
                    <SelectItem value="vpc-002">staging-vpc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Listener Configuration</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HTTP">HTTP</SelectItem>
                      <SelectItem value="HTTPS">HTTPS</SelectItem>
                      <SelectItem value="TCP">TCP</SelectItem>
                      <SelectItem value="UDP">UDP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Port (e.g., 443)" type="number" />
                  <Input placeholder="Target Port" type="number" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateDialogOpen(false)}>
                Create Load Balancer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Load Balancers</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockLoadBalancers.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalActive} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Application (L7)</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalL7}</div>
            <p className="text-xs text-muted-foreground">
              HTTP/HTTPS routing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network (L4)</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalL4}</div>
            <p className="text-xs text-muted-foreground">
              TCP/UDP forwarding
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests/sec</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRPS.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all load balancers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Load Balancer List and Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Load Balancer Table */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or IP..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="L7">L7 (HTTP)</SelectItem>
                  <SelectItem value="L4">L4 (TCP)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="degraded">Degraded</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredLBs.map((lb) => (
                <div
                  key={lb.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedLB?.id === lb.id
                      ? "border-primary bg-muted/50"
                      : "hover:bg-muted/30"
                  }`}
                  onClick={() => setSelectedLB(lb)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${statusColors[lb.status]}`} />
                      <div>
                        <p className="font-medium">{lb.name}</p>
                        <p className="text-xs text-muted-foreground">{lb.publicIp}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{lb.type}</Badge>
                      <Badge variant={statusBadgeVariants[lb.status]}>{lb.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{lb.listeners.length} listener(s)</span>
                    <span>{lb.backends.length} backend(s)</span>
                    <span>{lb.trafficMetrics.requestsPerSecond} req/s</span>
                  </div>
                </div>
              ))}
              {filteredLBs.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No load balancers found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Load Balancer Details */}
        <Card className="lg:col-span-1">
          {selectedLB ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    {selectedLB.name}
                  </CardTitle>
                  <CardDescription>
                    {selectedLB.type === "L7" ? "Application" : "Network"} Load Balancer
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={handleEditConfiguration}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Configuration
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleCopyIP(selectedLB.publicIp)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy IP
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleForceHealthCheck}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Force Health Check
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => openDeleteDialog(selectedLB)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="backends">Backends</TabsTrigger>
                    <TabsTrigger value="listeners">Listeners</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    {/* Traffic Metrics */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Requests/sec</p>
                        <p className="text-xl font-bold">
                          {selectedLB.trafficMetrics.requestsPerSecond.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Active Connections</p>
                        <p className="text-xl font-bold">
                          {selectedLB.trafficMetrics.activeConnections.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ArrowDownRight className="h-3 w-3 text-green-500" />
                          Bytes In
                        </p>
                        <p className="text-lg font-medium">
                          {formatBytes(selectedLB.trafficMetrics.bytesIn)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3 text-blue-500" />
                          Bytes Out
                        </p>
                        <p className="text-lg font-medium">
                          {formatBytes(selectedLB.trafficMetrics.bytesOut)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Error Rate</span>
                        <span className={selectedLB.trafficMetrics.errorRate > 1 ? "text-red-500" : ""}>
                          {selectedLB.trafficMetrics.errorRate}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(selectedLB.trafficMetrics.errorRate * 10, 100)}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Latency</span>
                        <span>{selectedLB.trafficMetrics.avgLatency}ms</span>
                      </div>
                      <Progress
                        value={Math.min(selectedLB.trafficMetrics.avgLatency, 100)}
                        className="h-2"
                      />
                    </div>

                    {/* Details */}
                    <div className="pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Public IP</span>
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">
                          {selectedLB.publicIp}
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VPC</span>
                        <span>{selectedLB.vpcName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Region</span>
                        <span>{selectedLB.region}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created</span>
                        <span>{new Date(selectedLB.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="backends" className="space-y-4">
                    <div className="mt-4 space-y-2">
                      {selectedLB.backends.map((backend) => (
                        <div
                          key={backend.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {healthStatusIcon(backend.status)}
                            <div>
                              <p className="font-medium text-sm">{backend.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {backend.target}:{backend.port}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                backend.status === "healthy"
                                  ? "default"
                                  : backend.status === "unhealthy"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {backend.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {backend.responseTime > 0
                                ? `${backend.responseTime}ms`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Backend
                    </Button>
                  </TabsContent>

                  <TabsContent value="listeners" className="space-y-4">
                    <div className="mt-4 space-y-2">
                      {selectedLB.listeners.map((listener) => (
                        <div
                          key={listener.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                              {listener.protocol === "HTTPS" || listener.protocol === "HTTP" ? (
                                <Globe className="h-4 w-4 text-primary" />
                              ) : (
                                <Server className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {listener.protocol} :{listener.port}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Forward to port {listener.targetPort}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {listener.sslCertificate && (
                              <Badge variant="outline" className="text-xs">
                                SSL
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Listener
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Scale className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Select a load balancer to view details
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Edit Configuration Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Load Balancer Configuration</DialogTitle>
            <DialogDescription>
              Update settings for {selectedLB?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-lb-name">Name</Label>
              <Input id="edit-lb-name" defaultValue={selectedLB?.name} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select defaultValue={selectedLB?.type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L7">Application (L7)</SelectItem>
                    <SelectItem value="L4">Network (L4)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Region</Label>
                <Select defaultValue={selectedLB?.region}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east-1">US East 1</SelectItem>
                    <SelectItem value="us-west-1">US West 1</SelectItem>
                    <SelectItem value="eu-west-1">EU West 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Configuration Updated",
                description: `${selectedLB?.name} has been updated successfully.`,
              });
              setEditDialogOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Load Balancer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {lbToDelete?.name}? This action cannot be undone
              and will remove all associated listeners and backend configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLB}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Load Balancer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
