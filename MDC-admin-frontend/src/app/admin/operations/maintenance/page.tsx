"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Calendar,
  Clock,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Play,
  Trash2,
  Edit,
  Server,
  Users,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Mock maintenance windows
const mockMaintenanceWindows = [
  {
    id: "mw-001",
    title: "Database Upgrade - PostgreSQL 16",
    description: "Upgrading production PostgreSQL cluster to version 16",
    type: "upgrade",
    status: "scheduled",
    priority: "high",
    startTime: "2024-03-20T02:00:00Z",
    endTime: "2024-03-20T06:00:00Z",
    affectedServices: ["API Gateway", "VM Orchestrator", "Billing Service"],
    notifyTenants: true,
    createdBy: "admin@cloudplatform.io",
    createdAt: "2024-03-10T10:00:00Z",
  },
  {
    id: "mw-002",
    title: "Network Switch Firmware Update",
    description: "Rolling firmware update for core switches in US-East",
    type: "update",
    status: "scheduled",
    priority: "medium",
    startTime: "2024-03-18T04:00:00Z",
    endTime: "2024-03-18T05:00:00Z",
    affectedServices: ["Core Network"],
    notifyTenants: false,
    createdBy: "netops@cloudplatform.io",
    createdAt: "2024-03-12T14:00:00Z",
  },
  {
    id: "mw-003",
    title: "Ceph OSD Rebalancing",
    description: "Adding new OSDs and rebalancing storage cluster",
    type: "maintenance",
    status: "in_progress",
    priority: "medium",
    startTime: "2024-03-15T08:00:00Z",
    endTime: "2024-03-15T14:00:00Z",
    affectedServices: ["Storage Manager", "Object Storage"],
    notifyTenants: true,
    createdBy: "storage@cloudplatform.io",
    createdAt: "2024-03-08T09:00:00Z",
  },
  {
    id: "mw-004",
    title: "SSL Certificate Renewal",
    description: "Renewing wildcard certificates for *.cloudplatform.io",
    type: "update",
    status: "completed",
    priority: "high",
    startTime: "2024-03-14T10:00:00Z",
    endTime: "2024-03-14T10:30:00Z",
    affectedServices: ["API Gateway", "Auth Service"],
    notifyTenants: false,
    createdBy: "security@cloudplatform.io",
    createdAt: "2024-03-07T11:00:00Z",
    completedAt: "2024-03-14T10:25:00Z",
  },
  {
    id: "mw-005",
    title: "Proxmox Cluster Update",
    description: "Updating Proxmox VE to 8.1.5 with security patches",
    type: "upgrade",
    status: "scheduled",
    priority: "critical",
    startTime: "2024-03-25T01:00:00Z",
    endTime: "2024-03-25T07:00:00Z",
    affectedServices: ["VM Orchestrator", "All VM workloads"],
    notifyTenants: true,
    createdBy: "admin@cloudplatform.io",
    createdAt: "2024-03-14T16:00:00Z",
  },
];

const statusConfig = {
  scheduled: { icon: Calendar, color: "text-blue-500", variant: "secondary" as const },
  in_progress: { icon: Wrench, color: "text-yellow-500", variant: "default" as const },
  completed: { icon: CheckCircle, color: "text-green-500", variant: "outline" as const },
  cancelled: { icon: AlertTriangle, color: "text-gray-500", variant: "outline" as const },
};

const priorityConfig = {
  low: { color: "text-gray-500", variant: "outline" as const },
  medium: { color: "text-blue-500", variant: "secondary" as const },
  high: { color: "text-orange-500", variant: "default" as const },
  critical: { color: "text-red-500", variant: "destructive" as const },
};

const typeConfig = {
  maintenance: "Maintenance",
  upgrade: "Upgrade",
  update: "Update",
  emergency: "Emergency",
};

interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  startTime: string;
  endTime: string;
  affectedServices: string[];
  notifyTenants: boolean;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export default function MaintenancePage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<MaintenanceWindow | null>(null);

  const scheduledCount = mockMaintenanceWindows.filter((m) => m.status === "scheduled").length;
  const inProgressCount = mockMaintenanceWindows.filter((m) => m.status === "in_progress").length;
  const completedCount = mockMaintenanceWindows.filter((m) => m.status === "completed").length;

  const upcomingWindows = mockMaintenanceWindows.filter(
    (m) => m.status === "scheduled" || m.status === "in_progress"
  );
  const pastWindows = mockMaintenanceWindows.filter(
    (m) => m.status === "completed" || m.status === "cancelled"
  );

  const handleViewDetails = (window: MaintenanceWindow) => {
    setSelectedWindow(window);
    setDetailsDialogOpen(true);
  };

  const handleEdit = (window: MaintenanceWindow) => {
    setSelectedWindow(window);
    setEditDialogOpen(true);
  };

  const handleStartNow = (window: MaintenanceWindow) => {
    toast({
      title: "Maintenance Started",
      description: `${window.title} has been started.`,
    });
  };

  const handleMarkComplete = (window: MaintenanceWindow) => {
    toast({
      title: "Maintenance Completed",
      description: `${window.title} has been marked as complete.`,
    });
  };

  const handleCancel = (window: MaintenanceWindow) => {
    setSelectedWindow(window);
    setCancelDialogOpen(true);
  };

  const confirmCancel = () => {
    toast({
      title: "Maintenance Cancelled",
      description: `${selectedWindow?.title} has been cancelled.`,
    });
    setCancelDialogOpen(false);
    setSelectedWindow(null);
  };

  const saveEdit = () => {
    toast({
      title: "Maintenance Updated",
      description: `${selectedWindow?.title} has been updated.`,
    });
    setEditDialogOpen(false);
    setSelectedWindow(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">
            Schedule and manage maintenance windows
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Maintenance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule Maintenance Window</DialogTitle>
              <DialogDescription>
                Plan a new maintenance or upgrade window
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input placeholder="Maintenance window title" />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the maintenance activities..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="upgrade">Upgrade</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Time</Label>
                  <Input type="datetime-local" />
                </div>
                <div className="grid gap-2">
                  <Label>End Time</Label>
                  <Input type="datetime-local" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Affected Services</Label>
                <Input placeholder="API Gateway, Storage Manager, ..." />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notify Tenants</Label>
                  <p className="text-xs text-muted-foreground">
                    Send notification to affected customers
                  </p>
                </div>
                <Switch />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledCount}</div>
            <p className="text-xs text-muted-foreground">Upcoming windows</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed (30d)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Window</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Mar 18</div>
            <p className="text-xs text-muted-foreground">Network Switch Update</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming & Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Maintenance</CardTitle>
              <CardDescription>
                Upcoming and in-progress maintenance windows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Maintenance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Affected</TableHead>
                    <TableHead>Notify</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingWindows.map((window) => {
                    const StatusIcon = statusConfig[window.status as keyof typeof statusConfig].icon;

                    return (
                      <TableRow key={window.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{window.title}</p>
                            <p className="text-xs text-muted-foreground max-w-xs truncate">
                              {window.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`h-4 w-4 ${statusConfig[window.status as keyof typeof statusConfig].color}`}
                            />
                            <Badge
                              variant={statusConfig[window.status as keyof typeof statusConfig].variant}
                            >
                              {window.status.replace("_", " ")}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {typeConfig[window.type as keyof typeof typeConfig]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={priorityConfig[window.priority as keyof typeof priorityConfig].variant}
                          >
                            {window.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(window.startTime), "MMM d, HH:mm")}</p>
                            <p className="text-muted-foreground">
                              - {format(new Date(window.endTime), "HH:mm")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Server className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{window.affectedServices.length}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {window.notifyTenants ? (
                            <Users className="h-4 w-4 text-green-500" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleViewDetails(window)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleEdit(window)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {window.status === "scheduled" && (
                                <DropdownMenuItem onSelect={() => handleStartNow(window)}>
                                  <Play className="mr-2 h-4 w-4" />
                                  Start Now
                                </DropdownMenuItem>
                              )}
                              {window.status === "in_progress" && (
                                <DropdownMenuItem onSelect={() => handleMarkComplete(window)}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onSelect={() => handleCancel(window)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Cancel
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
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>
                Completed and cancelled maintenance windows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Maintenance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastWindows.map((window) => {
                    const StatusIcon = statusConfig[window.status as keyof typeof statusConfig].icon;

                    return (
                      <TableRow key={window.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{window.title}</p>
                            <p className="text-xs text-muted-foreground max-w-xs truncate">
                              {window.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`h-4 w-4 ${statusConfig[window.status as keyof typeof statusConfig].color}`}
                            />
                            <Badge
                              variant={statusConfig[window.status as keyof typeof statusConfig].variant}
                            >
                              {window.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {typeConfig[window.type as keyof typeof typeConfig]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(window.startTime), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          30 min
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

      {/* View Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedWindow?.title}</DialogTitle>
            <DialogDescription>{selectedWindow?.description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="font-medium">{selectedWindow?.type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Priority</Label>
                <p className="font-medium">{selectedWindow?.priority}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Start Time</Label>
                <p className="font-medium">
                  {selectedWindow?.startTime && format(new Date(selectedWindow.startTime), "MMM d, yyyy HH:mm")}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">End Time</Label>
                <p className="font-medium">
                  {selectedWindow?.endTime && format(new Date(selectedWindow.endTime), "MMM d, yyyy HH:mm")}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Affected Services</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedWindow?.affectedServices.map((service) => (
                  <Badge key={service} variant="secondary">{service}</Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Created By</Label>
              <p className="font-medium">{selectedWindow?.createdBy}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Window</DialogTitle>
            <DialogDescription>
              Update maintenance window details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input defaultValue={selectedWindow?.title} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea defaultValue={selectedWindow?.description} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Time</Label>
                <Input type="datetime-local" />
              </div>
              <div className="grid gap-2">
                <Label>End Time</Label>
                <Input type="datetime-local" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Maintenance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel &quot;{selectedWindow?.title}&quot;? This action cannot be undone and any notifications already sent to tenants will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Scheduled</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Cancel Maintenance</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
