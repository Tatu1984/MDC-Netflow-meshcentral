"use client";

import { useState } from "react";
import {
  Search,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Server,
  Shield,
  Calendar,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

// Mock audit logs
const mockAuditLogs = [
  {
    id: "audit-001",
    timestamp: "2024-03-15T10:32:15Z",
    actor: "admin@cloudplatform.io",
    actorType: "user",
    action: "vm.create",
    resource: "vm-prod-web-01",
    resourceType: "vm",
    status: "success",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0",
    details: { vcpus: 4, memory: 8, disk: 100, region: "us-east-1" },
  },
  {
    id: "audit-002",
    timestamp: "2024-03-15T10:30:00Z",
    actor: "backup-service",
    actorType: "service",
    action: "backup.create",
    resource: "db-primary",
    resourceType: "database",
    status: "success",
    ipAddress: "10.0.1.50",
    details: { type: "full", size: "125GB" },
  },
  {
    id: "audit-003",
    timestamp: "2024-03-15T10:28:45Z",
    actor: "user@acme.com",
    actorType: "user",
    action: "auth.login",
    resource: "session-abc123",
    resourceType: "auth",
    status: "success",
    ipAddress: "203.0.113.50",
    userAgent: "Chrome/120.0",
    details: { mfa: true, method: "totp" },
  },
  {
    id: "audit-004",
    timestamp: "2024-03-15T10:25:00Z",
    actor: "unknown",
    actorType: "user",
    action: "auth.login",
    resource: "session-failed",
    resourceType: "auth",
    status: "failure",
    ipAddress: "198.51.100.25",
    details: { reason: "invalid_credentials", attempts: 3 },
  },
  {
    id: "audit-005",
    timestamp: "2024-03-15T10:20:00Z",
    actor: "admin@cloudplatform.io",
    actorType: "user",
    action: "policy.update",
    resource: "TenantAdmin",
    resourceType: "iam",
    status: "success",
    ipAddress: "192.168.1.100",
    details: { changes: ["Added vm:resize permission"] },
  },
  {
    id: "audit-006",
    timestamp: "2024-03-15T10:15:30Z",
    actor: "ci-cd-pipeline",
    actorType: "service",
    action: "vm.deploy",
    resource: "k8s-node-pool-03",
    resourceType: "kubernetes",
    status: "success",
    ipAddress: "10.0.2.100",
    details: { nodes: 3, machineType: "standard-4x8" },
  },
  {
    id: "audit-007",
    timestamp: "2024-03-15T10:10:00Z",
    actor: "admin@cloudplatform.io",
    actorType: "user",
    action: "tenant.suspend",
    resource: "tenant-old-company",
    resourceType: "tenant",
    status: "success",
    ipAddress: "192.168.1.100",
    details: { reason: "payment_overdue" },
  },
  {
    id: "audit-008",
    timestamp: "2024-03-15T10:05:00Z",
    actor: "monitoring-agent",
    actorType: "service",
    action: "alert.trigger",
    resource: "cpu-high-alert",
    resourceType: "monitoring",
    status: "success",
    ipAddress: "10.0.1.25",
    details: { metric: "cpu_usage", threshold: 90, value: 95.2 },
  },
  {
    id: "audit-009",
    timestamp: "2024-03-15T10:00:00Z",
    actor: "user@techstartup.io",
    actorType: "user",
    action: "api_key.create",
    resource: "api-key-prod",
    resourceType: "credentials",
    status: "success",
    ipAddress: "203.0.113.75",
    details: { permissions: ["read", "write"], expiry: "90d" },
  },
  {
    id: "audit-010",
    timestamp: "2024-03-15T09:55:00Z",
    actor: "admin@cloudplatform.io",
    actorType: "user",
    action: "certificate.renew",
    resource: "*.cloudplatform.io",
    resourceType: "certificate",
    status: "success",
    ipAddress: "192.168.1.100",
    details: { issuer: "Let's Encrypt", validity: "90d" },
  },
];

const statusConfig = {
  success: { icon: CheckCircle, color: "text-green-500", variant: "default" as const },
  failure: { icon: XCircle, color: "text-red-500", variant: "destructive" as const },
  warning: { icon: AlertTriangle, color: "text-yellow-500", variant: "secondary" as const },
};

const actorTypeConfig = {
  user: { icon: User, color: "text-blue-500" },
  service: { icon: Server, color: "text-purple-500" },
};

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<typeof mockAuditLogs[0] | null>(null);

  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesAction = actionFilter === "all" || log.action.startsWith(actionFilter);
    return matchesSearch && matchesStatus && matchesAction;
  });

  const actionCategories = Array.from(
    new Set(mockAuditLogs.map((log) => log.action.split(".")[0]))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Platform activity and security audit trail
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAuditLogs.length}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockAuditLogs.filter((l) => l.status === "success").length}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(
                (mockAuditLogs.filter((l) => l.status === "success").length /
                  mockAuditLogs.length) *
                  100
              )}
              % success rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockAuditLogs.filter((l) => l.status === "failure").length}
            </div>
            <p className="text-xs text-muted-foreground">Requires review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Actors</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(mockAuditLogs.map((l) => l.actor)).size}
            </div>
            <p className="text-xs text-muted-foreground">Users and services</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by actor, action, or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon">
          <Calendar className="h-4 w-4" />
        </Button>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Detailed audit trail of all platform activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => {
                const StatusIcon = statusConfig[log.status as keyof typeof statusConfig].icon;
                const ActorIcon = actorTypeConfig[log.actorType as keyof typeof actorTypeConfig].icon;

                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ActorIcon
                          className={`h-4 w-4 ${actorTypeConfig[log.actorType as keyof typeof actorTypeConfig].color}`}
                        />
                        <span className="font-medium">{log.actor}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.resource}</p>
                        <p className="text-xs text-muted-foreground">{log.resourceType}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          className={`h-4 w-4 ${statusConfig[log.status as keyof typeof statusConfig].color}`}
                        />
                        <Badge variant={statusConfig[log.status as keyof typeof statusConfig].variant}>
                          {log.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {log.ipAddress}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              Full audit log entry information
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.timestamp), "PPpp")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      statusConfig[selectedLog.status as keyof typeof statusConfig].variant
                    }
                  >
                    {selectedLog.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actor</p>
                  <p className="font-medium">{selectedLog.actor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actor Type</p>
                  <p className="font-medium capitalize">{selectedLog.actorType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resource</p>
                  <p className="font-medium">{selectedLog.resource}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono">{selectedLog.ipAddress}</p>
                </div>
                {selectedLog.userAgent && (
                  <div>
                    <p className="text-sm text-muted-foreground">User Agent</p>
                    <p className="font-medium text-sm truncate">{selectedLog.userAgent}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Details</p>
                <pre className="p-3 bg-muted rounded-lg text-sm overflow-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
