"use client";

import { useState } from "react";
import {
  ScrollText,
  Search,
  Download,
  Filter,
  Calendar,
  User,
  Server,
  Shield,
  Database,
  Network,
  Key,
  Settings,
  Trash2,
  Plus,
  Edit,
  Eye,
  RefreshCw,
  ChevronRight,
  X,
  Clock,
  MapPin,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

type ActionType = "create" | "update" | "delete" | "login" | "logout" | "view" | "export" | "invite" | "revoke";
type ResourceType = "vm" | "volume" | "database" | "network" | "user" | "api_key" | "settings" | "billing";
type Severity = "info" | "warning" | "critical";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: ActionType;
  resourceType: ResourceType;
  resourceName: string;
  resourceId: string;
  actor: {
    id: string;
    name: string;
    email: string;
    type: "user" | "api_key" | "system";
  };
  ipAddress: string;
  userAgent: string;
  location: string;
  status: "success" | "failure";
  severity: Severity;
  details: Record<string, unknown>;
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

// Mock data
const auditLogEntries: AuditLogEntry[] = [
  {
    id: "audit-001",
    timestamp: "2026-01-12T10:45:23Z",
    action: "create",
    resourceType: "vm",
    resourceName: "web-server-prod-03",
    resourceId: "vm-012",
    actor: { id: "user-001", name: "John Smith", email: "john.smith@acme.com", type: "user" },
    ipAddress: "203.0.113.45",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    location: "New York, US",
    status: "success",
    severity: "info",
    details: { vcpus: 4, memory: 8, disk: 100, os: "Ubuntu 22.04 LTS", region: "us-east-1" },
  },
  {
    id: "audit-002",
    timestamp: "2026-01-12T10:32:11Z",
    action: "delete",
    resourceType: "api_key",
    resourceName: "Old Integration Key",
    resourceId: "key-005",
    actor: { id: "user-001", name: "John Smith", email: "john.smith@acme.com", type: "user" },
    ipAddress: "203.0.113.45",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    location: "New York, US",
    status: "success",
    severity: "warning",
    details: { reason: "Security policy compliance" },
  },
  {
    id: "audit-003",
    timestamp: "2026-01-12T09:58:47Z",
    action: "update",
    resourceType: "settings",
    resourceName: "Organization Settings",
    resourceId: "org-001",
    actor: { id: "user-002", name: "Sarah Johnson", email: "sarah.johnson@acme.com", type: "user" },
    ipAddress: "203.0.113.52",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    location: "San Francisco, US",
    status: "success",
    severity: "info",
    details: {},
    changes: [
      { field: "billingEmail", oldValue: "old-billing@acme.com", newValue: "billing@acme.com" },
      { field: "website", oldValue: "https://old.acme.com", newValue: "https://acme.com" },
    ],
  },
  {
    id: "audit-004",
    timestamp: "2026-01-12T09:15:33Z",
    action: "login",
    resourceType: "user",
    resourceName: "mike.chen@acme.com",
    resourceId: "user-003",
    actor: { id: "user-003", name: "Mike Chen", email: "mike.chen@acme.com", type: "user" },
    ipAddress: "203.0.113.78",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    location: "Los Angeles, US",
    status: "success",
    severity: "info",
    details: { mfaUsed: true, authMethod: "password" },
  },
  {
    id: "audit-005",
    timestamp: "2026-01-12T08:42:19Z",
    action: "create",
    resourceType: "api_key",
    resourceName: "Backup Automation",
    resourceId: "key-006",
    actor: { id: "user-006", name: "Lisa Brown", email: "lisa.brown@acme.com", type: "user" },
    ipAddress: "203.0.113.91",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    location: "Chicago, US",
    status: "success",
    severity: "warning",
    details: { permissions: ["storage:read", "storage:write", "database:read", "database:write"], expiresIn: "365 days" },
  },
  {
    id: "audit-006",
    timestamp: "2026-01-12T07:30:00Z",
    action: "update",
    resourceType: "database",
    resourceName: "prod-primary",
    resourceId: "db-001",
    actor: { id: "api-key-001", name: "CI/CD Pipeline", email: "ci-cd@system", type: "api_key" },
    ipAddress: "10.0.1.50",
    userAgent: "curl/7.79.1",
    location: "Internal",
    status: "success",
    severity: "info",
    details: { action: "backup", backupSize: "125 GB" },
  },
  {
    id: "audit-007",
    timestamp: "2026-01-11T23:45:12Z",
    action: "login",
    resourceType: "user",
    resourceName: "unknown@attacker.com",
    resourceId: "unknown",
    actor: { id: "unknown", name: "Unknown", email: "unknown@attacker.com", type: "user" },
    ipAddress: "192.168.1.100",
    userAgent: "python-requests/2.28.0",
    location: "Unknown",
    status: "failure",
    severity: "critical",
    details: { reason: "Invalid credentials", attempts: 5 },
  },
  {
    id: "audit-008",
    timestamp: "2026-01-11T22:18:45Z",
    action: "invite",
    resourceType: "user",
    resourceName: "david.miller@acme.com",
    resourceId: "inv-001",
    actor: { id: "user-001", name: "John Smith", email: "john.smith@acme.com", type: "user" },
    ipAddress: "203.0.113.45",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    location: "New York, US",
    status: "success",
    severity: "info",
    details: { role: "member", expiresIn: "7 days" },
  },
  {
    id: "audit-009",
    timestamp: "2026-01-11T20:05:33Z",
    action: "delete",
    resourceType: "vm",
    resourceName: "old-staging-server",
    resourceId: "vm-old-001",
    actor: { id: "user-003", name: "Mike Chen", email: "mike.chen@acme.com", type: "user" },
    ipAddress: "203.0.113.78",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    location: "Los Angeles, US",
    status: "success",
    severity: "warning",
    details: { reason: "Resource cleanup", dataBackedUp: true },
  },
  {
    id: "audit-010",
    timestamp: "2026-01-11T18:30:00Z",
    action: "update",
    resourceType: "network",
    resourceName: "production-vpc",
    resourceId: "vpc-001",
    actor: { id: "user-002", name: "Sarah Johnson", email: "sarah.johnson@acme.com", type: "user" },
    ipAddress: "203.0.113.52",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    location: "San Francisco, US",
    status: "success",
    severity: "warning",
    details: {},
    changes: [
      { field: "securityGroup", oldValue: "sg-old", newValue: "sg-002" },
    ],
  },
  {
    id: "audit-011",
    timestamp: "2026-01-11T16:45:22Z",
    action: "export",
    resourceType: "billing",
    resourceName: "January 2026 Invoice",
    resourceId: "inv-2026-01",
    actor: { id: "user-001", name: "John Smith", email: "john.smith@acme.com", type: "user" },
    ipAddress: "203.0.113.45",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    location: "New York, US",
    status: "success",
    severity: "info",
    details: { format: "PDF", period: "January 2026" },
  },
];

const actionConfig: Record<ActionType, { label: string; icon: React.ElementType; color: string }> = {
  create: { label: "Created", icon: Plus, color: "text-green-500" },
  update: { label: "Updated", icon: Edit, color: "text-blue-500" },
  delete: { label: "Deleted", icon: Trash2, color: "text-red-500" },
  login: { label: "Logged In", icon: User, color: "text-purple-500" },
  logout: { label: "Logged Out", icon: User, color: "text-slate-500" },
  view: { label: "Viewed", icon: Eye, color: "text-cyan-500" },
  export: { label: "Exported", icon: Download, color: "text-orange-500" },
  invite: { label: "Invited", icon: User, color: "text-indigo-500" },
  revoke: { label: "Revoked", icon: Key, color: "text-red-500" },
};

const resourceTypeConfig: Record<ResourceType, { label: string; icon: React.ElementType }> = {
  vm: { label: "Virtual Machine", icon: Server },
  volume: { label: "Volume", icon: Database },
  database: { label: "Database", icon: Database },
  network: { label: "Network", icon: Network },
  user: { label: "User", icon: User },
  api_key: { label: "API Key", icon: Key },
  settings: { label: "Settings", icon: Settings },
  billing: { label: "Billing", icon: Download },
};

const severityConfig: Record<Severity, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  info: { label: "Info", color: "text-blue-500", bgColor: "bg-blue-500/10", icon: CheckCircle },
  warning: { label: "Warning", color: "text-yellow-500", bgColor: "bg-yellow-500/10", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle },
};

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const filteredEntries = auditLogEntries.filter((entry) => {
    const matchesSearch =
      entry.resourceName.toLowerCase().includes(search.toLowerCase()) ||
      entry.actor.name.toLowerCase().includes(search.toLowerCase()) ||
      entry.actor.email.toLowerCase().includes(search.toLowerCase()) ||
      entry.ipAddress.includes(search);
    const matchesAction = actionFilter === "all" || entry.action === actionFilter;
    const matchesResource = resourceFilter === "all" || entry.resourceType === resourceFilter;
    const matchesSeverity = severityFilter === "all" || entry.severity === severityFilter;
    return matchesSearch && matchesAction && matchesResource && matchesSeverity;
  });

  const activeFiltersCount = [actionFilter, resourceFilter, severityFilter].filter((f) => f !== "all").length;

  const clearFilters = () => {
    setActionFilter("all");
    setResourceFilter("all");
    setSeverityFilter("all");
  };

  // Statistics
  const totalEvents = auditLogEntries.length;
  const criticalEvents = auditLogEntries.filter((e) => e.severity === "critical").length;
  const failedEvents = auditLogEntries.filter((e) => e.status === "failure").length;
  const uniqueUsers = new Set(auditLogEntries.map((e) => e.actor.id)).size;

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Audit Log"
        apis={[
          "GET /api/audit-logs",
          "GET /api/audit-logs/{id}",
          "POST /api/audit-logs/search",
          "POST /api/audit-logs/export"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            Track and review all activity in your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <ScrollText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
            <XCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedEvents}</div>
            <p className="text-xs text-muted-foreground">Blocked or denied</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">Unique actors</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by resource, user, or IP address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="relative">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filters</h4>
                      {activeFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          Clear all
                        </Button>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Action Type</Label>
                      <Select value={actionFilter} onValueChange={setActionFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All actions</SelectItem>
                          {Object.entries(actionConfig).map(([action, config]) => (
                            <SelectItem key={action} value={action}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Resource Type</Label>
                      <Select value={resourceFilter} onValueChange={setResourceFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All resources</SelectItem>
                          {Object.entries(resourceTypeConfig).map(([type, config]) => (
                            <SelectItem key={type} value={type}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select value={severityFilter} onValueChange={setSeverityFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All severities</SelectItem>
                          {Object.entries(severityConfig).map(([severity, config]) => (
                            <SelectItem key={severity} value={severity}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => {
                const actionInfo = actionConfig[entry.action];
                const resourceInfo = resourceTypeConfig[entry.resourceType];
                const severityInfo = severityConfig[entry.severity];
                const ActionIcon = actionInfo.icon;
                const ResourceIcon = resourceInfo.icon;
                const SeverityIcon = severityInfo.icon;

                return (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${severityInfo.bgColor}`}>
                          <ActionIcon className={`h-4 w-4 ${actionInfo.color}`} />
                        </div>
                        <span className="font-medium">{actionInfo.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ResourceIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{entry.resourceName}</p>
                          <p className="text-xs text-muted-foreground">{resourceInfo.label}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.actor.type === "api_key" ? (
                          <Key className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{entry.actor.name}</p>
                          <p className="text-xs text-muted-foreground">{entry.actor.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1 rounded">{entry.ipAddress}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.status === "success" ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No audit log entries found</p>
                      {activeFiltersCount > 0 && (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          <X className="mr-2 h-4 w-4" />
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl">
          {selectedEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`p-2 rounded ${severityConfig[selectedEntry.severity].bgColor}`}>
                    {(() => {
                      const ActionIcon = actionConfig[selectedEntry.action].icon;
                      return <ActionIcon className={`h-5 w-5 ${actionConfig[selectedEntry.action].color}`} />;
                    })()}
                  </div>
                  {actionConfig[selectedEntry.action].label} {resourceTypeConfig[selectedEntry.resourceType].label}
                </DialogTitle>
                <DialogDescription>
                  {selectedEntry.resourceName} ({selectedEntry.resourceId})
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6 py-4">
                  {/* Status and Severity */}
                  <div className="flex items-center gap-4">
                    {selectedEntry.status === "success" ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                    <Badge variant="outline" className={`${severityConfig[selectedEntry.severity].color}`}>
                      {severityConfig[selectedEntry.severity].label}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Event Details */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Timestamp
                      </div>
                      <p className="font-medium">{formatTimestamp(selectedEntry.timestamp)}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        Actor
                      </div>
                      <p className="font-medium">{selectedEntry.actor.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedEntry.actor.email}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        Location
                      </div>
                      <p className="font-medium">{selectedEntry.location}</p>
                      <p className="text-sm text-muted-foreground">{selectedEntry.ipAddress}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Monitor className="h-4 w-4" />
                        User Agent
                      </div>
                      <p className="text-sm font-mono break-all">{selectedEntry.userAgent}</p>
                    </div>
                  </div>

                  {/* Changes */}
                  {selectedEntry.changes && selectedEntry.changes.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Changes Made
                        </h4>
                        <div className="space-y-2">
                          {selectedEntry.changes.map((change, index) => (
                            <div key={index} className="p-3 rounded-lg bg-muted/50 space-y-1">
                              <p className="text-sm font-medium">{change.field}</p>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">From: </span>
                                  <code className="text-red-500">{change.oldValue}</code>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">To: </span>
                                  <code className="text-green-500">{change.newValue}</code>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Additional Details */}
                  {Object.keys(selectedEntry.details).length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Additional Details
                        </h4>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <pre className="text-sm font-mono whitespace-pre-wrap">
                            {JSON.stringify(selectedEntry.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Event ID */}
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Event ID</span>
                    <code className="bg-muted px-2 py-1 rounded">{selectedEntry.id}</code>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
