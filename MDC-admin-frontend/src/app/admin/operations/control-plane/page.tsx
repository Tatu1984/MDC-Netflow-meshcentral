"use client";

import { useState } from "react";
import {
  Server,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Play,
  Pause,
  Settings,
  MoreHorizontal,
  Clock,
  Zap,
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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

// Mock control plane services
const mockServices = [
  {
    id: "svc-001",
    name: "API Gateway",
    description: "Main API entry point",
    status: "running",
    instances: 3,
    healthyInstances: 3,
    version: "2.4.1",
    cpu: 45,
    memory: 62,
    requests: 12500,
    latency: 24,
    uptime: 892800,
  },
  {
    id: "svc-002",
    name: "VM Orchestrator",
    description: "Virtual machine lifecycle management",
    status: "running",
    instances: 2,
    healthyInstances: 2,
    version: "1.8.3",
    cpu: 32,
    memory: 48,
    requests: 450,
    latency: 156,
    uptime: 892800,
  },
  {
    id: "svc-003",
    name: "Network Controller",
    description: "SDN and networking management",
    status: "running",
    instances: 2,
    healthyInstances: 2,
    version: "1.5.0",
    cpu: 28,
    memory: 35,
    requests: 890,
    latency: 45,
    uptime: 892800,
  },
  {
    id: "svc-004",
    name: "Storage Manager",
    description: "Ceph and storage pool management",
    status: "running",
    instances: 2,
    healthyInstances: 2,
    version: "1.3.2",
    cpu: 22,
    memory: 41,
    requests: 320,
    latency: 89,
    uptime: 892800,
  },
  {
    id: "svc-005",
    name: "Billing Service",
    description: "Usage metering and billing",
    status: "degraded",
    instances: 2,
    healthyInstances: 1,
    version: "1.2.1",
    cpu: 15,
    memory: 28,
    requests: 180,
    latency: 234,
    uptime: 432000,
    issue: "1 instance unhealthy",
  },
  {
    id: "svc-006",
    name: "Auth Service",
    description: "Authentication and authorization",
    status: "running",
    instances: 3,
    healthyInstances: 3,
    version: "2.1.0",
    cpu: 38,
    memory: 52,
    requests: 8900,
    latency: 12,
    uptime: 892800,
  },
  {
    id: "svc-007",
    name: "Metrics Collector",
    description: "Prometheus metrics aggregation",
    status: "running",
    instances: 2,
    healthyInstances: 2,
    version: "1.0.5",
    cpu: 55,
    memory: 72,
    requests: 25000,
    latency: 8,
    uptime: 892800,
  },
  {
    id: "svc-008",
    name: "Job Scheduler",
    description: "Background job processing",
    status: "stopped",
    instances: 1,
    healthyInstances: 0,
    version: "1.1.0",
    cpu: 0,
    memory: 0,
    requests: 0,
    latency: 0,
    uptime: 0,
    issue: "Manually stopped for maintenance",
  },
];

const statusConfig = {
  running: { icon: CheckCircle, color: "text-green-500", variant: "default" as const },
  degraded: { icon: AlertTriangle, color: "text-yellow-500", variant: "secondary" as const },
  stopped: { icon: XCircle, color: "text-red-500", variant: "destructive" as const },
};

interface ControlPlaneService {
  id: string;
  name: string;
  description: string;
  status: string;
  instances: number;
  healthyInstances: number;
  version: string;
  cpu: number;
  memory: number;
  requests: number;
  latency: number;
  uptime: number;
  issue?: string;
}

function formatUptime(seconds: number): string {
  if (seconds === 0) return "Stopped";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

export default function ControlPlanePage() {
  const { toast } = useToast();
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ControlPlaneService | null>(null);

  const runningServices = mockServices.filter((s) => s.status === "running").length;
  const degradedServices = mockServices.filter((s) => s.status === "degraded").length;
  const totalRequests = mockServices.reduce((sum, s) => sum + s.requests, 0);
  const avgLatency = Math.round(
    mockServices.filter((s) => s.status === "running").reduce((sum, s) => sum + s.latency, 0) /
      mockServices.filter((s) => s.status === "running").length
  );

  const handleViewLogs = (service: ControlPlaneService) => {
    setSelectedService(service);
    setLogsDialogOpen(true);
  };

  const handleViewMetrics = (service: ControlPlaneService) => {
    setSelectedService(service);
    setMetricsDialogOpen(true);
  };

  const handleConfigure = (service: ControlPlaneService) => {
    setSelectedService(service);
    setConfigDialogOpen(true);
  };

  const handleStopService = (service: ControlPlaneService) => {
    setSelectedService(service);
    setStopDialogOpen(true);
  };

  const handleStartService = (service: ControlPlaneService) => {
    toast({
      title: "Service Starting",
      description: `${service.name} is starting up...`,
    });
  };

  const handleRestartService = (service: ControlPlaneService) => {
    setSelectedService(service);
    setRestartDialogOpen(true);
  };

  const confirmStop = () => {
    toast({
      title: "Service Stopped",
      description: `${selectedService?.name} has been stopped.`,
    });
    setStopDialogOpen(false);
    setSelectedService(null);
  };

  const confirmRestart = () => {
    toast({
      title: "Service Restarting",
      description: `${selectedService?.name} is restarting...`,
    });
    setRestartDialogOpen(false);
    setSelectedService(null);
  };

  const saveConfig = () => {
    toast({
      title: "Configuration Saved",
      description: `${selectedService?.name} configuration has been updated.`,
    });
    setConfigDialogOpen(false);
    setSelectedService(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Plane</h1>
          <p className="text-muted-foreground">
            Platform service management and monitoring
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockServices.length}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">{runningServices} running</span>
              {degradedServices > 0 && (
                <span className="text-yellow-500 ml-1">, {degradedServices} degraded</span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Instances</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockServices.reduce((sum, s) => sum + s.healthyInstances, 0)}/
              {mockServices.reduce((sum, s) => sum + s.instances, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Healthy instances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests/min</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalRequests / 60).toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Current throughput</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLatency}ms</div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Services</CardTitle>
          <CardDescription>
            Core control plane services status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Instances</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Requests/s</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockServices.map((service) => {
                const StatusIcon = statusConfig[service.status as keyof typeof statusConfig].icon;

                return (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          v{service.version}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          className={`h-4 w-4 ${statusConfig[service.status as keyof typeof statusConfig].color}`}
                        />
                        <Badge
                          variant={statusConfig[service.status as keyof typeof statusConfig].variant}
                        >
                          {service.status}
                        </Badge>
                      </div>
                      {service.issue && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {service.issue}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          service.healthyInstances < service.instances
                            ? "text-yellow-500 font-medium"
                            : ""
                        }
                      >
                        {service.healthyInstances}/{service.instances}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="w-20 space-y-1">
                        <Progress
                          value={service.cpu}
                          className={service.cpu > 80 ? "[&>div]:bg-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground">{service.cpu}%</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-20 space-y-1">
                        <Progress
                          value={service.memory}
                          className={service.memory > 80 ? "[&>div]:bg-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground">{service.memory}%</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.requests > 0 ? (service.requests / 60).toFixed(0) : "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          service.latency > 200 ? "text-yellow-500 font-medium" : ""
                        }
                      >
                        {service.latency > 0 ? `${service.latency}ms` : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatUptime(service.uptime)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleViewLogs(service)}>
                            View Logs
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleViewMetrics(service)}>
                            View Metrics
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleConfigure(service)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {service.status === "running" ? (
                            <DropdownMenuItem onSelect={() => handleStopService(service)}>
                              <Pause className="mr-2 h-4 w-4" />
                              Stop Service
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => handleStartService(service)}>
                              <Play className="mr-2 h-4 w-4" />
                              Start Service
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => handleRestartService(service)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Restart
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

      {/* View Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Service Logs - {selectedService?.name}</DialogTitle>
            <DialogDescription>
              Recent log entries from {selectedService?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md font-mono text-sm h-64 overflow-y-auto">
            <p className="text-muted-foreground">[2024-03-15 10:32:15] INFO: Health check passed</p>
            <p className="text-muted-foreground">[2024-03-15 10:32:10] INFO: Processing request #12847</p>
            <p className="text-muted-foreground">[2024-03-15 10:32:05] INFO: Connection established from 10.0.1.25</p>
            <p className="text-yellow-500">[2024-03-15 10:32:00] WARN: High memory usage detected (78%)</p>
            <p className="text-muted-foreground">[2024-03-15 10:31:55] INFO: Request completed in 24ms</p>
            <p className="text-muted-foreground">[2024-03-15 10:31:50] INFO: Processing request #12846</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Metrics Dialog */}
      <Dialog open={metricsDialogOpen} onOpenChange={setMetricsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Service Metrics - {selectedService?.name}</DialogTitle>
            <DialogDescription>
              Real-time performance metrics
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">CPU Usage</Label>
                <div className="flex items-center gap-2">
                  <Progress value={selectedService?.cpu || 0} className="flex-1" />
                  <span className="font-medium">{selectedService?.cpu}%</span>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Memory Usage</Label>
                <div className="flex items-center gap-2">
                  <Progress value={selectedService?.memory || 0} className="flex-1" />
                  <span className="font-medium">{selectedService?.memory}%</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Requests/sec</Label>
                <p className="text-2xl font-bold">{((selectedService?.requests || 0) / 60).toFixed(0)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Avg Latency</Label>
                <p className="text-2xl font-bold">{selectedService?.latency}ms</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Instances</Label>
              <p className="font-medium">{selectedService?.healthyInstances}/{selectedService?.instances} healthy</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetricsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure {selectedService?.name}</DialogTitle>
            <DialogDescription>
              Update service configuration settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Replicas</Label>
              <Input type="number" defaultValue={selectedService?.instances} />
            </div>
            <div className="grid gap-2">
              <Label>CPU Limit (cores)</Label>
              <Input type="number" defaultValue="2" />
            </div>
            <div className="grid gap-2">
              <Label>Memory Limit (GB)</Label>
              <Input type="number" defaultValue="4" />
            </div>
            <div className="grid gap-2">
              <Label>Log Level</Label>
              <Input defaultValue="INFO" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveConfig}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Service Confirmation */}
      <AlertDialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop {selectedService?.name}? This may affect dependent services and tenant workloads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStop}>Stop Service</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restart Service Confirmation */}
      <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restart {selectedService?.name}? This will cause a brief interruption to the service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestart}>Restart Service</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
