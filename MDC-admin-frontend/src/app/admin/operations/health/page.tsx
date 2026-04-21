"use client";

import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Network,
  HardDrive,
  Activity,
  Clock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Mock health checks
const healthChecks = [
  {
    name: "API Gateway",
    category: "Services",
    status: "healthy",
    latency: 24,
    lastCheck: "2024-03-15T10:32:00Z",
    checks: [
      { name: "HTTP Health", status: "healthy" },
      { name: "Database Connection", status: "healthy" },
      { name: "Redis Cache", status: "healthy" },
    ],
  },
  {
    name: "VM Orchestrator",
    category: "Services",
    status: "healthy",
    latency: 156,
    lastCheck: "2024-03-15T10:32:00Z",
    checks: [
      { name: "Proxmox API", status: "healthy" },
      { name: "Task Queue", status: "healthy" },
      { name: "Database", status: "healthy" },
    ],
  },
  {
    name: "Primary Database",
    category: "Databases",
    status: "healthy",
    latency: 5,
    lastCheck: "2024-03-15T10:32:00Z",
    checks: [
      { name: "Connection Pool", status: "healthy" },
      { name: "Replication Lag", status: "healthy" },
      { name: "Disk Space", status: "healthy" },
    ],
  },
  {
    name: "Redis Cluster",
    category: "Databases",
    status: "warning",
    latency: 2,
    lastCheck: "2024-03-15T10:32:00Z",
    issue: "High memory usage on node 2",
    checks: [
      { name: "Cluster Health", status: "healthy" },
      { name: "Memory Usage", status: "warning" },
      { name: "Replication", status: "healthy" },
    ],
  },
  {
    name: "Ceph Storage",
    category: "Storage",
    status: "healthy",
    latency: 12,
    lastCheck: "2024-03-15T10:32:00Z",
    checks: [
      { name: "Cluster Status", status: "healthy" },
      { name: "OSD Health", status: "healthy" },
      { name: "PG Status", status: "healthy" },
    ],
  },
  {
    name: "Object Storage (S3)",
    category: "Storage",
    status: "healthy",
    latency: 45,
    lastCheck: "2024-03-15T10:32:00Z",
    checks: [
      { name: "RGW Gateway", status: "healthy" },
      { name: "Bucket Access", status: "healthy" },
    ],
  },
  {
    name: "Core Network",
    category: "Network",
    status: "healthy",
    latency: 1,
    lastCheck: "2024-03-15T10:32:00Z",
    checks: [
      { name: "Switch Connectivity", status: "healthy" },
      { name: "Firewall Rules", status: "healthy" },
      { name: "BGP Sessions", status: "healthy" },
    ],
  },
  {
    name: "ZeroTier Network",
    category: "Network",
    status: "error",
    latency: 0,
    lastCheck: "2024-03-15T10:32:00Z",
    issue: "Controller unreachable",
    checks: [
      { name: "Controller", status: "error" },
      { name: "Member Sync", status: "error" },
    ],
  },
  {
    name: "DNS Services",
    category: "Network",
    status: "healthy",
    latency: 8,
    lastCheck: "2024-03-15T10:32:00Z",
    checks: [
      { name: "Primary DNS", status: "healthy" },
      { name: "Secondary DNS", status: "healthy" },
    ],
  },
  {
    name: "Metrics Pipeline",
    category: "Monitoring",
    status: "healthy",
    latency: 15,
    lastCheck: "2024-03-15T10:32:00Z",
    checks: [
      { name: "Prometheus", status: "healthy" },
      { name: "Alertmanager", status: "healthy" },
      { name: "Grafana", status: "healthy" },
    ],
  },
];

const statusConfig = {
  healthy: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  error: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
};

const categoryIcons = {
  Services: Server,
  Databases: Database,
  Storage: HardDrive,
  Network: Network,
  Monitoring: Activity,
};

export default function HealthPage() {
  const healthyCount = healthChecks.filter((h) => h.status === "healthy").length;
  const warningCount = healthChecks.filter((h) => h.status === "warning").length;
  const errorCount = healthChecks.filter((h) => h.status === "error").length;

  const overallStatus = errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "healthy";
  const OverallIcon = statusConfig[overallStatus].icon;

  const categories = Array.from(new Set(healthChecks.map((h) => h.category)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Health</h1>
          <p className="text-muted-foreground">
            Platform-wide health status monitoring
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Run All Checks
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={statusConfig[overallStatus].bg}>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className={`p-3 rounded-full ${statusConfig[overallStatus].bg}`}>
            <OverallIcon className={`h-8 w-8 ${statusConfig[overallStatus].color}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold capitalize">
              Platform Status: {overallStatus === "healthy" ? "All Systems Operational" : overallStatus === "warning" ? "Degraded Performance" : "Issues Detected"}
            </h2>
            <p className="text-muted-foreground">
              {healthyCount} healthy, {warningCount} warnings, {errorCount} errors
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Last updated</p>
            <p className="font-medium">Just now</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
            <Progress value={(healthyCount / healthChecks.length) * 100} className="mt-2 [&>div]:bg-green-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            <Progress value={(warningCount / healthChecks.length) * 100} className="mt-2 [&>div]:bg-yellow-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <Progress value={(errorCount / healthChecks.length) * 100} className="mt-2 [&>div]:bg-red-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime (30d)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.95%</div>
            <p className="text-xs text-muted-foreground">21 min downtime</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Checks by Category */}
      <div className="space-y-6">
        {categories.map((category) => {
          const categoryChecks = healthChecks.filter((h) => h.category === category);
          const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons] || Globe;

          return (
            <Card key={category}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>{category}</CardTitle>
                </div>
                <CardDescription>
                  {categoryChecks.filter((c) => c.status === "healthy").length}/
                  {categoryChecks.length} services healthy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryChecks.map((check) => {
                    const StatusIcon = statusConfig[check.status as keyof typeof statusConfig].icon;

                    return (
                      <div
                        key={check.name}
                        className={`p-4 rounded-lg border ${
                          check.status === "error"
                            ? "border-red-500/50 bg-red-500/5"
                            : check.status === "warning"
                            ? "border-yellow-500/50 bg-yellow-500/5"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{check.name}</h4>
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`h-4 w-4 ${statusConfig[check.status as keyof typeof statusConfig].color}`}
                            />
                            <Badge
                              variant={
                                check.status === "healthy"
                                  ? "default"
                                  : check.status === "warning"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {check.status}
                            </Badge>
                          </div>
                        </div>
                        {check.issue && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {check.issue}
                          </p>
                        )}
                        <div className="space-y-1">
                          {check.checks.map((subCheck, i) => {
                            const SubIcon = statusConfig[subCheck.status as keyof typeof statusConfig].icon;
                            return (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <SubIcon
                                  className={`h-3 w-3 ${statusConfig[subCheck.status as keyof typeof statusConfig].color}`}
                                />
                                <span className="text-muted-foreground">{subCheck.name}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                          <span>Latency: {check.latency}ms</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
