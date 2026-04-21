"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Shield,
  AlertTriangle,
  Ban,
  Plus,
  MoreHorizontal,
  RefreshCw,
  Clock,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

// Generate traffic data
const generateTrafficData = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    inbound: Math.round(50 + Math.random() * 150),
    outbound: Math.round(30 + Math.random() * 100),
  }));
};

const trafficData = generateTrafficData();

// Mock rate limiting rules
const rateLimitRules = [
  {
    id: "rl-001",
    name: "API Rate Limit",
    target: "api.cloudplatform.io",
    type: "requests",
    limit: 1000,
    window: "1m",
    currentUsage: 742,
    status: "active",
  },
  {
    id: "rl-002",
    name: "SSH Brute Force Protection",
    target: "All SSH Endpoints",
    type: "connections",
    limit: 5,
    window: "1m",
    currentUsage: 2,
    status: "active",
  },
  {
    id: "rl-003",
    name: "CDN Bandwidth Limit",
    target: "cdn.cloudplatform.io",
    type: "bandwidth",
    limit: 10000,
    window: "1s",
    currentUsage: 4521,
    status: "active",
  },
];

// Mock blocked IPs
const blockedIPs = [
  {
    ip: "192.168.1.100",
    reason: "Brute force SSH",
    blockedAt: "2024-03-15T08:30:00Z",
    expiresAt: "2024-03-15T20:30:00Z",
    hits: 1247,
  },
  {
    ip: "10.0.0.55",
    reason: "DDoS attempt",
    blockedAt: "2024-03-14T14:00:00Z",
    expiresAt: null,
    hits: 89421,
  },
  {
    ip: "172.16.0.23",
    reason: "Port scanning",
    blockedAt: "2024-03-15T06:15:00Z",
    expiresAt: "2024-03-16T06:15:00Z",
    hits: 5632,
  },
];

// Mock bandwidth usage by tenant
const tenantBandwidth = [
  { name: "Acme Corporation", ingress: 245.8, egress: 189.2, total: 435.0 },
  { name: "Global Media Co", ingress: 198.4, egress: 312.7, total: 511.1 },
  { name: "TechStartup Inc", ingress: 87.3, egress: 65.4, total: 152.7 },
  { name: "DevShop Agency", ingress: 23.1, egress: 18.9, total: 42.0 },
];

const chartConfig = {
  inbound: { label: "Inbound", color: "hsl(var(--chart-1))" },
  outbound: { label: "Outbound", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

interface RateLimitRule {
  id: string;
  name: string;
  target: string;
  type: string;
  limit: number;
  window: string;
  currentUsage: number;
  status: string;
}

export default function TrafficPage() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("24h");
  const [editRuleDialogOpen, setEditRuleDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [disableRuleDialogOpen, setDisableRuleDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<RateLimitRule | null>(null);

  const totalInbound = trafficData.reduce((sum, d) => sum + d.inbound, 0);
  const totalOutbound = trafficData.reduce((sum, d) => sum + d.outbound, 0);

  const handleEditRule = (rule: RateLimitRule) => {
    setSelectedRule(rule);
    setEditRuleDialogOpen(true);
  };

  const handleViewLogs = (rule: RateLimitRule) => {
    setSelectedRule(rule);
    setLogsDialogOpen(true);
  };

  const handleDisableRule = (rule: RateLimitRule) => {
    setSelectedRule(rule);
    setDisableRuleDialogOpen(true);
  };

  const confirmDisableRule = () => {
    toast({
      title: "Rule Disabled",
      description: `${selectedRule?.name} has been disabled.`,
    });
    setDisableRuleDialogOpen(false);
    setSelectedRule(null);
  };

  const saveRule = () => {
    toast({
      title: "Rule Updated",
      description: `${selectedRule?.name} has been updated.`,
    });
    setEditRuleDialogOpen(false);
    setSelectedRule(null);
  };

  const handleUnblockIP = (ip: string) => {
    toast({
      title: "IP Unblocked",
      description: `${ip} has been removed from the blocklist.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Traffic Control</h1>
          <p className="text-muted-foreground">
            Monitor and manage network traffic
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1h</SelectItem>
              <SelectItem value="6h">Last 6h</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7d</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inbound Traffic</CardTitle>
            <ArrowDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalInbound / 1000).toFixed(1)} TB</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outbound Traffic</CardTitle>
            <ArrowUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalOutbound / 1000).toFixed(1)} TB</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rateLimitRules.length}</div>
            <p className="text-xs text-muted-foreground">Rate limit policies</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked IPs</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedIPs.length}</div>
            <p className="text-xs text-muted-foreground">Currently blocked</p>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Overview</CardTitle>
          <CardDescription>Network bandwidth utilization over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="inbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outbound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} GB`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="inbound"
                stroke="hsl(var(--chart-1))"
                fill="url(#inbound)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="outbound"
                stroke="hsl(var(--chart-2))"
                fill="url(#outbound)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="ratelimits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ratelimits">Rate Limits</TabsTrigger>
          <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
          <TabsTrigger value="tenants">Tenant Bandwidth</TabsTrigger>
        </TabsList>

        <TabsContent value="ratelimits" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rate Limiting Rules</CardTitle>
                <CardDescription>Traffic shaping and rate limit policies</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Current Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateLimitRules.map((rule) => {
                    const usagePercent = Math.round((rule.currentUsage / rule.limit) * 100);
                    return (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell className="text-muted-foreground">{rule.target}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {rule.limit.toLocaleString()}/{rule.window}
                        </TableCell>
                        <TableCell>
                          <div className="w-32 space-y-1">
                            <Progress
                              value={usagePercent}
                              className={usagePercent > 80 ? "[&>div]:bg-yellow-500" : ""}
                            />
                            <p className="text-xs text-muted-foreground">
                              {rule.currentUsage.toLocaleString()} ({usagePercent}%)
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.status === "active" ? "default" : "secondary"}>
                            {rule.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleEditRule(rule)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Rule
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleViewLogs(rule)}>
                                View Logs
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onSelect={() => handleDisableRule(rule)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Disable Rule
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
        </TabsContent>

        <TabsContent value="blocked" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Blocked IP Addresses</CardTitle>
                <CardDescription>IPs currently blocked from network access</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Block IP
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blocked At</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Hits Blocked</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIPs.map((ip) => (
                    <TableRow key={ip.ip}>
                      <TableCell className="font-mono font-medium">{ip.ip}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          {ip.reason}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(ip.blockedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {ip.expiresAt ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ip.expiresAt).toLocaleString()}
                          </div>
                        ) : (
                          <Badge variant="destructive">Permanent</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {ip.hits.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleUnblockIP(ip.ip)}>
                          Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bandwidth by Tenant</CardTitle>
              <CardDescription>Network usage breakdown per customer</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Ingress</TableHead>
                    <TableHead>Egress</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantBandwidth.map((tenant) => {
                    const maxBandwidth = Math.max(...tenantBandwidth.map((t) => t.total));
                    const usagePercent = Math.round((tenant.total / maxBandwidth) * 100);
                    return (
                      <TableRow key={tenant.name}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ArrowDown className="h-3 w-3 text-green-500" />
                            {tenant.ingress.toFixed(1)} GB
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ArrowUp className="h-3 w-3 text-blue-500" />
                            {tenant.egress.toFixed(1)} GB
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {tenant.total.toFixed(1)} GB
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <Progress value={usagePercent} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Rule Dialog */}
      <Dialog open={editRuleDialogOpen} onOpenChange={setEditRuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Rate Limit Rule</DialogTitle>
            <DialogDescription>
              Update configuration for {selectedRule?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Rule Name</Label>
              <Input defaultValue={selectedRule?.name} />
            </div>
            <div className="grid gap-2">
              <Label>Target</Label>
              <Input defaultValue={selectedRule?.target} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Limit</Label>
                <Input type="number" defaultValue={selectedRule?.limit} />
              </div>
              <div className="grid gap-2">
                <Label>Window</Label>
                <Select defaultValue={selectedRule?.window}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1s">1 second</SelectItem>
                    <SelectItem value="1m">1 minute</SelectItem>
                    <SelectItem value="1h">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select defaultValue={selectedRule?.type}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requests">Requests</SelectItem>
                  <SelectItem value="connections">Connections</SelectItem>
                  <SelectItem value="bandwidth">Bandwidth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRule}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rate Limit Logs - {selectedRule?.name}</DialogTitle>
            <DialogDescription>
              Recent rate limiting activity
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md font-mono text-sm h-64 overflow-y-auto">
            <p className="text-muted-foreground">[2024-03-15 10:32:15] INFO: Request allowed (742/1000)</p>
            <p className="text-yellow-500">[2024-03-15 10:32:10] WARN: Rate limit approaching (950/1000)</p>
            <p className="text-red-500">[2024-03-15 10:32:05] ERROR: Rate limit exceeded - request blocked</p>
            <p className="text-muted-foreground">[2024-03-15 10:32:00] INFO: Request allowed (890/1000)</p>
            <p className="text-muted-foreground">[2024-03-15 10:31:55] INFO: Request allowed (650/1000)</p>
            <p className="text-muted-foreground">[2024-03-15 10:31:50] INFO: Counter reset for new window</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Rule Confirmation */}
      <AlertDialog open={disableRuleDialogOpen} onOpenChange={setDisableRuleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Rate Limit Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable &quot;{selectedRule?.name}&quot;? Traffic to {selectedRule?.target} will no longer be rate limited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisableRule}>Disable Rule</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
