"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Bell,
  BellOff,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Trash2,
  Edit,
  Copy,
  Mail,
  MessageSquare,
  Webhook,
  Phone,
  History,
  Settings,
  Filter,
  RefreshCw,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

type AlertSeverity = "critical" | "warning" | "info";
type AlertStatus = "firing" | "resolved" | "acknowledged";

interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  resource: string;
  resourceType: string;
  message: string;
  triggeredAt: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: string;
  threshold: number;
  duration: string;
  severity: AlertSeverity;
  enabled: boolean;
  notificationChannels: string[];
  lastTriggered?: string;
}

interface NotificationChannel {
  id: string;
  name: string;
  type: "email" | "slack" | "webhook" | "pagerduty";
  config: string;
  enabled: boolean;
}

interface AlertHistoryEntry {
  id: string;
  alertName: string;
  severity: AlertSeverity;
  status: "fired" | "resolved";
  resource: string;
  timestamp: string;
  duration?: string;
}

const mockAlerts: Alert[] = [
  {
    id: "alert-001",
    name: "High CPU Usage",
    severity: "critical",
    status: "firing",
    resource: "web-prod-01",
    resourceType: "VM",
    message: "CPU usage has exceeded 90% for more than 5 minutes",
    triggeredAt: "2026-01-12T14:25:00Z",
  },
  {
    id: "alert-002",
    name: "Memory Pressure",
    severity: "warning",
    status: "firing",
    resource: "k8s-production",
    resourceType: "Cluster",
    message: "Memory usage on node-3 is at 85%",
    triggeredAt: "2026-01-12T14:18:00Z",
  },
  {
    id: "alert-003",
    name: "Database Connection Pool",
    severity: "warning",
    status: "acknowledged",
    resource: "db-primary",
    resourceType: "Database",
    message: "Connection pool usage is at 75%",
    triggeredAt: "2026-01-12T13:45:00Z",
    acknowledgedBy: "john.doe@example.com",
  },
  {
    id: "alert-004",
    name: "Disk Space Low",
    severity: "critical",
    status: "resolved",
    resource: "api-server",
    resourceType: "VM",
    message: "Disk usage exceeded 90%",
    triggeredAt: "2026-01-12T12:30:00Z",
    resolvedAt: "2026-01-12T13:15:00Z",
  },
  {
    id: "alert-005",
    name: "High Error Rate",
    severity: "critical",
    status: "firing",
    resource: "api-gateway",
    resourceType: "Service",
    message: "Error rate has exceeded 5% in the last 10 minutes",
    triggeredAt: "2026-01-12T14:30:00Z",
  },
];

const mockAlertRules: AlertRule[] = [
  {
    id: "rule-001",
    name: "High CPU Usage",
    description: "Alert when CPU usage exceeds threshold",
    metric: "cpu_usage_percent",
    condition: ">",
    threshold: 90,
    duration: "5m",
    severity: "critical",
    enabled: true,
    notificationChannels: ["email-ops", "slack-alerts"],
    lastTriggered: "2026-01-12T14:25:00Z",
  },
  {
    id: "rule-002",
    name: "Memory Pressure",
    description: "Alert when memory usage is high",
    metric: "memory_usage_percent",
    condition: ">",
    threshold: 85,
    duration: "10m",
    severity: "warning",
    enabled: true,
    notificationChannels: ["slack-alerts"],
    lastTriggered: "2026-01-12T14:18:00Z",
  },
  {
    id: "rule-003",
    name: "Disk Space Low",
    description: "Alert when disk space is running low",
    metric: "disk_usage_percent",
    condition: ">",
    threshold: 85,
    duration: "15m",
    severity: "warning",
    enabled: true,
    notificationChannels: ["email-ops"],
  },
  {
    id: "rule-004",
    name: "High Error Rate",
    description: "Alert when error rate is elevated",
    metric: "error_rate_percent",
    condition: ">",
    threshold: 5,
    duration: "5m",
    severity: "critical",
    enabled: true,
    notificationChannels: ["pagerduty-oncall", "slack-alerts"],
    lastTriggered: "2026-01-12T14:30:00Z",
  },
  {
    id: "rule-005",
    name: "High Latency",
    description: "Alert when response latency is high",
    metric: "response_latency_p99",
    condition: ">",
    threshold: 500,
    duration: "5m",
    severity: "warning",
    enabled: false,
    notificationChannels: ["slack-alerts"],
  },
];

const mockNotificationChannels: NotificationChannel[] = [
  {
    id: "email-ops",
    name: "Operations Team Email",
    type: "email",
    config: "ops-team@example.com",
    enabled: true,
  },
  {
    id: "slack-alerts",
    name: "Slack #alerts",
    type: "slack",
    config: "#alerts",
    enabled: true,
  },
  {
    id: "pagerduty-oncall",
    name: "PagerDuty On-Call",
    type: "pagerduty",
    config: "service-key-xxx",
    enabled: true,
  },
  {
    id: "webhook-custom",
    name: "Custom Webhook",
    type: "webhook",
    config: "https://api.example.com/alerts",
    enabled: false,
  },
];

const mockAlertHistory: AlertHistoryEntry[] = [
  {
    id: "hist-001",
    alertName: "High CPU Usage",
    severity: "critical",
    status: "fired",
    resource: "web-prod-01",
    timestamp: "2026-01-12T14:25:00Z",
  },
  {
    id: "hist-002",
    alertName: "High Error Rate",
    severity: "critical",
    status: "fired",
    resource: "api-gateway",
    timestamp: "2026-01-12T14:30:00Z",
  },
  {
    id: "hist-003",
    alertName: "Disk Space Low",
    severity: "critical",
    status: "resolved",
    resource: "api-server",
    timestamp: "2026-01-12T13:15:00Z",
    duration: "45m",
  },
  {
    id: "hist-004",
    alertName: "Memory Pressure",
    severity: "warning",
    status: "fired",
    resource: "k8s-production",
    timestamp: "2026-01-12T14:18:00Z",
  },
  {
    id: "hist-005",
    alertName: "High Latency",
    severity: "warning",
    status: "resolved",
    resource: "api-gateway",
    timestamp: "2026-01-12T11:30:00Z",
    duration: "15m",
  },
  {
    id: "hist-006",
    alertName: "Database Connection Pool",
    severity: "warning",
    status: "fired",
    resource: "db-primary",
    timestamp: "2026-01-12T13:45:00Z",
  },
];

const severityConfig: Record<
  AlertSeverity,
  { icon: typeof AlertCircle; color: string; bgColor: string; badgeVariant: "destructive" | "secondary" | "outline" }
> = {
  critical: {
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    badgeVariant: "destructive",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    badgeVariant: "secondary",
  },
  info: {
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    badgeVariant: "outline",
  },
};

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  slack: MessageSquare,
  webhook: Webhook,
  pagerduty: Phone,
};

function CreateAlertRuleDialog() {
  const [open, setOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("");
  const [condition, setCondition] = useState(">");
  const [threshold, setThreshold] = useState("");
  const [duration, setDuration] = useState("5m");
  const [severity, setSeverity] = useState<AlertSeverity>("warning");

  const handleCreate = () => {
    // Handle creation logic here
    setOpen(false);
    // Reset form
    setRuleName("");
    setDescription("");
    setMetric("");
    setCondition(">");
    setThreshold("");
    setDuration("5m");
    setSeverity("warning");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Alert Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Alert Rule</DialogTitle>
          <DialogDescription>
            Configure a new alert rule to monitor your resources
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              placeholder="e.g., High CPU Usage"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe when this alert should trigger..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="metric">Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpu_usage_percent">CPU Usage (%)</SelectItem>
                  <SelectItem value="memory_usage_percent">Memory Usage (%)</SelectItem>
                  <SelectItem value="disk_usage_percent">Disk Usage (%)</SelectItem>
                  <SelectItem value="network_in_bytes">Network In (bytes)</SelectItem>
                  <SelectItem value="network_out_bytes">Network Out (bytes)</SelectItem>
                  <SelectItem value="error_rate_percent">Error Rate (%)</SelectItem>
                  <SelectItem value="response_latency_p99">Response Latency p99 (ms)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="severity">Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as AlertSeverity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="condition">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Greater than</SelectItem>
                  <SelectItem value=">=">Greater or equal</SelectItem>
                  <SelectItem value="<">Less than</SelectItem>
                  <SelectItem value="<=">Less or equal</SelectItem>
                  <SelectItem value="==">Equal to</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="threshold">Threshold</Label>
              <Input
                id="threshold"
                type="number"
                placeholder="e.g., 90"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">For Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 minute</SelectItem>
                  <SelectItem value="5m">5 minutes</SelectItem>
                  <SelectItem value="10m">10 minutes</SelectItem>
                  <SelectItem value="15m">15 minutes</SelectItem>
                  <SelectItem value="30m">30 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notification Channels</Label>
            <div className="flex flex-wrap gap-2">
              {mockNotificationChannels
                .filter((c) => c.enabled)
                .map((channel) => {
                  const ChannelIcon = channelIcons[channel.type];
                  return (
                    <Badge key={channel.id} variant="outline" className="cursor-pointer hover:bg-muted">
                      <ChannelIcon className="h-3 w-3 mr-1" />
                      {channel.name}
                    </Badge>
                  );
                })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Rule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AlertsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog states for alerts
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [viewRuleOpen, setViewRuleOpen] = useState(false);
  const [viewHistoryOpen, setViewHistoryOpen] = useState(false);

  // Dialog states for alert rules
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [editRuleOpen, setEditRuleOpen] = useState(false);
  const [deleteRuleOpen, setDeleteRuleOpen] = useState(false);

  // Dialog states for notification channels
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel | null>(null);
  const [editChannelOpen, setEditChannelOpen] = useState(false);
  const [deleteChannelOpen, setDeleteChannelOpen] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeSince = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const filteredAlerts = mockAlerts.filter((alert) => {
    const matchesSearch =
      alert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.resource.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || alert.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const activeAlerts = mockAlerts.filter((a) => a.status === "firing").length;
  const criticalAlerts = mockAlerts.filter((a) => a.severity === "critical" && a.status === "firing").length;

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Alerts"
        apis={[
          "GET /api/alerts",
          "POST /api/alerts/rules",
          "PUT /api/alerts/rules/{id}",
          "DELETE /api/alerts/rules/{id}",
          "POST /api/alerts/{id}/acknowledge"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">
            Monitor, configure, and manage alerts for your infrastructure
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <CreateAlertRuleDialog />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAlerts}</div>
            <p className="text-xs text-muted-foreground">Currently firing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alert Rules</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAlertRules.length}</div>
            <p className="text-xs text-muted-foreground">
              {mockAlertRules.filter((r) => r.enabled).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Channels</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockNotificationChannels.length}</div>
            <p className="text-xs text-muted-foreground">Notification channels</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Active Alerts
            {activeAlerts > 0 && (
              <Badge variant="destructive" className="ml-1">
                {activeAlerts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Alert Rules
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notification Channels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search alerts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="firing">Firing</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Triggered</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => {
                    const config = severityConfig[alert.severity];
                    const SeverityIcon = config.icon;
                    return (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${config.bgColor}`}>
                              <SeverityIcon className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <div>
                              <p className="font-medium">{alert.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {alert.message}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.badgeVariant} className="capitalize">
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              alert.status === "firing"
                                ? "destructive"
                                : alert.status === "acknowledged"
                                ? "secondary"
                                : "outline"
                            }
                            className="capitalize"
                          >
                            {alert.status === "firing" && (
                              <span className="mr-1 h-2 w-2 rounded-full bg-red-400 animate-pulse inline-block" />
                            )}
                            {alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{alert.resource}</p>
                            <p className="text-xs text-muted-foreground">{alert.resourceType}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{getTimeSince(alert.triggeredAt)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(alert.triggeredAt)}
                            </p>
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
                              {alert.status === "firing" && (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    toast({
                                      title: "Alert acknowledged",
                                      description: `${alert.name} has been acknowledged.`,
                                    });
                                  }}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Acknowledge
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onSelect={() => {
                                  toast({
                                    title: "Alert silenced",
                                    description: `${alert.name} will be silenced for 1 hour.`,
                                  });
                                }}
                              >
                                <BellOff className="mr-2 h-4 w-4" />
                                Silence (1h)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => {
                                  setSelectedAlert(alert);
                                  setViewRuleOpen(true);
                                }}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                View Rule
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setSelectedAlert(alert);
                                  setViewHistoryOpen(true);
                                }}
                              >
                                <History className="mr-2 h-4 w-4" />
                                View History
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredAlerts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="h-8 w-8 text-green-500" />
                          <p className="text-muted-foreground">No alerts matching your filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>Configure rules that trigger alerts based on metric conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAlertRules.map((rule) => {
                    const config = severityConfig[rule.severity];
                    return (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rule.name}</p>
                            <p className="text-xs text-muted-foreground">{rule.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {rule.metric} {rule.condition} {rule.threshold} for {rule.duration}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.badgeVariant} className="capitalize">
                            {rule.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {rule.notificationChannels.slice(0, 2).map((channelId) => {
                              const channel = mockNotificationChannels.find((c) => c.id === channelId);
                              if (!channel) return null;
                              const ChannelIcon = channelIcons[channel.type];
                              return (
                                <Badge key={channelId} variant="outline" className="text-xs">
                                  <ChannelIcon className="h-3 w-3 mr-1" />
                                  {channel.name}
                                </Badge>
                              );
                            })}
                            {rule.notificationChannels.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{rule.notificationChannels.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {rule.lastTriggered ? (
                            <span className="text-sm">{getTimeSince(rule.lastTriggered)}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch checked={rule.enabled} />
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
                                  setSelectedRule(rule);
                                  setEditRuleOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  toast({
                                    title: "Rule duplicated",
                                    description: `A copy of "${rule.name}" has been created.`,
                                  });
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => {
                                  setSelectedRule(rule);
                                  setDeleteRuleOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>View past alert events and their resolution status</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {mockAlertHistory.map((entry) => {
                    const config = severityConfig[entry.severity];
                    const SeverityIcon = config.icon;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className={`p-2 rounded ${config.bgColor}`}>
                          <SeverityIcon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{entry.alertName}</p>
                            <Badge
                              variant={entry.status === "fired" ? "destructive" : "secondary"}
                              className="capitalize"
                            >
                              {entry.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Resource: {entry.resource}
                          </p>
                          {entry.duration && (
                            <p className="text-xs text-muted-foreground">
                              Duration: {entry.duration}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm">{getTimeSince(entry.timestamp)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>Configure where alert notifications are sent</CardDescription>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Channel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {mockNotificationChannels.map((channel) => {
                  const ChannelIcon = channelIcons[channel.type];
                  return (
                    <Card key={channel.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-muted rounded">
                              <ChannelIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">{channel.name}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {channel.type}
                              </p>
                              <code className="text-xs bg-muted px-1 rounded mt-1 inline-block">
                                {channel.config}
                              </code>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={channel.enabled} />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setSelectedChannel(channel);
                                    setEditChannelOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    toast({
                                      title: "Test notification sent",
                                      description: `A test notification was sent to ${channel.name}.`,
                                    });
                                  }}
                                >
                                  <Bell className="mr-2 h-4 w-4" />
                                  Send Test
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={() => {
                                    setSelectedChannel(channel);
                                    setDeleteChannelOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Rule Dialog */}
      <Dialog open={viewRuleOpen} onOpenChange={setViewRuleOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Alert Rule: {selectedAlert?.name}</DialogTitle>
            <DialogDescription>
              View the rule configuration for this alert
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Resource</Label>
              <p className="text-sm">{selectedAlert?.resource} ({selectedAlert?.resourceType})</p>
            </div>
            <div className="grid gap-2">
              <Label>Message</Label>
              <p className="text-sm text-muted-foreground">{selectedAlert?.message}</p>
            </div>
            <div className="grid gap-2">
              <Label>Triggered At</Label>
              <p className="text-sm">{selectedAlert?.triggeredAt && formatTime(selectedAlert.triggeredAt)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRuleOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setViewRuleOpen(false);
              setEditRuleOpen(true);
            }}>
              Edit Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View History Dialog */}
      <Dialog open={viewHistoryOpen} onOpenChange={setViewHistoryOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Alert History: {selectedAlert?.name}</DialogTitle>
            <DialogDescription>
              Historical events for this alert
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] mt-4">
            <div className="space-y-3">
              {mockAlertHistory
                .filter(h => h.alertName === selectedAlert?.name)
                .map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={entry.status === "fired" ? "destructive" : "secondary"}>
                        {entry.status}
                      </Badge>
                      <span className="text-sm">{entry.resource}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{getTimeSince(entry.timestamp)}</span>
                  </div>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={editRuleOpen} onOpenChange={setEditRuleOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Alert Rule</DialogTitle>
            <DialogDescription>
              Modify the configuration for {selectedRule?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-rule-name">Rule Name</Label>
              <Input id="edit-rule-name" defaultValue={selectedRule?.name} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-rule-desc">Description</Label>
              <Textarea id="edit-rule-desc" defaultValue={selectedRule?.description} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Condition</Label>
                <Select defaultValue={selectedRule?.condition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">Greater than</SelectItem>
                    <SelectItem value=">=">Greater or equal</SelectItem>
                    <SelectItem value="<">Less than</SelectItem>
                    <SelectItem value="<=">Less or equal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-threshold">Threshold</Label>
                <Input id="edit-threshold" type="number" defaultValue={selectedRule?.threshold} />
              </div>
              <div className="grid gap-2">
                <Label>Duration</Label>
                <Select defaultValue={selectedRule?.duration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 minute</SelectItem>
                    <SelectItem value="5m">5 minutes</SelectItem>
                    <SelectItem value="10m">10 minutes</SelectItem>
                    <SelectItem value="15m">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRuleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setEditRuleOpen(false);
              toast({
                title: "Rule updated",
                description: `${selectedRule?.name} has been updated.`,
              });
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation */}
      <AlertDialog open={deleteRuleOpen} onOpenChange={setDeleteRuleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRule?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Rule deleted",
                  description: `${selectedRule?.name} has been deleted.`,
                });
                setSelectedRule(null);
              }}
            >
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Channel Dialog */}
      <Dialog open={editChannelOpen} onOpenChange={setEditChannelOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Notification Channel</DialogTitle>
            <DialogDescription>
              Modify the configuration for {selectedChannel?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-channel-name">Channel Name</Label>
              <Input id="edit-channel-name" defaultValue={selectedChannel?.name} />
            </div>
            <div className="grid gap-2">
              <Label>Channel Type</Label>
              <Select defaultValue={selectedChannel?.type}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="pagerduty">PagerDuty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-channel-config">Configuration</Label>
              <Input id="edit-channel-config" defaultValue={selectedChannel?.config} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditChannelOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setEditChannelOpen(false);
              toast({
                title: "Channel updated",
                description: `${selectedChannel?.name} has been updated.`,
              });
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Channel Confirmation */}
      <AlertDialog open={deleteChannelOpen} onOpenChange={setDeleteChannelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification Channel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedChannel?.name}"? Alert rules using this channel will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Channel deleted",
                  description: `${selectedChannel?.name} has been deleted.`,
                });
                setSelectedChannel(null);
              }}
            >
              Delete Channel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
