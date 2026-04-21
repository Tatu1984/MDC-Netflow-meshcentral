"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Terminal,
  Copy,
  ExternalLink,
  Loader2,
  Server,
  Network,
  AlertTriangle,
  RefreshCw,
  Monitor,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsoleOpenButton } from "@/components/console-open-button";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaces, useSites } from "@/lib/mdc";
import { VirtualMachine, Workspace, VirtualMachineNetworkAdapter } from "@/lib/mdc/types";

// Extended VM type with workspace context
interface ExtendedVM extends VirtualMachine {
  workspaceId: string;
  workspaceName: string;
  siteId: string;
}

const statusColors: Record<string, string> = {
  running: "bg-green-500",
  stopped: "bg-yellow-500",
  paused: "bg-blue-500",
  error: "bg-red-500",
  unknown: "bg-gray-500",
};

const statusBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  running: "default",
  stopped: "secondary",
  paused: "outline",
  error: "destructive",
  unknown: "outline",
};

function normalizeStatus(status?: string): string {
  if (!status) return "unknown";
  const lower = status.toLowerCase();
  if (lower === "running" || lower === "started") return "running";
  if (lower === "stopped" || lower === "shutdown") return "stopped";
  if (lower === "paused" || lower === "suspended") return "paused";
  if (lower === "error" || lower === "failed") return "error";
  return "unknown";
}

function getIPFromNetworkAdapter(adapter?: VirtualMachineNetworkAdapter): string | undefined {
  if (!adapter?.networkInterfaces?.[0]) return undefined;
  return adapter.networkInterfaces[0].ipAddress;
}

export default function VMsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");
  const [selectedVMs, setSelectedVMs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Fetch real data from MDC API
  const { data: workspaces, isLoading: workspacesLoading, error: workspacesError, refetch: refetchWorkspaces } = useWorkspaces();
  const { data: sites } = useSites();

  // Dialog states
  const [vmToDelete, setVmToDelete] = useState<ExtendedVM | null>(null);
  const [vmForDetails, setVmForDetails] = useState<ExtendedVM | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Extract all VMs from workspaces
  const allVMs: ExtendedVM[] = useMemo(() => {
    if (!workspaces) return [];
    return workspaces.flatMap(ws =>
      (ws.virtualMachines || []).map(vm => ({
        ...vm,
        workspaceId: ws.id,
        workspaceName: ws.name,
        siteId: ws.siteId,
      }))
    );
  }, [workspaces]);

  // Include bastion VMs
  const allVMsWithBastions: ExtendedVM[] = useMemo(() => {
    if (!workspaces) return allVMs;
    const bastionVMs = workspaces
      .filter(ws => ws.bastion)
      .map(ws => ({
        ...ws.bastion!,
        workspaceId: ws.id,
        workspaceName: ws.name,
        siteId: ws.siteId,
        name: ws.bastion!.name || `${ws.name}-bastion`,
      }));
    return [...allVMs, ...bastionVMs];
  }, [workspaces, allVMs]);

  // Filter VMs
  const filteredVMs = useMemo(() => {
    return allVMsWithBastions.filter((vm) => {
      const matchesSearch = vm.name.toLowerCase().includes(search.toLowerCase());
      const vmStatus = normalizeStatus(vm.status);
      const matchesStatus = statusFilter === "all" || vmStatus === statusFilter;
      const matchesWorkspace = workspaceFilter === "all" || vm.workspaceId === workspaceFilter;
      return matchesSearch && matchesStatus && matchesWorkspace;
    });
  }, [allVMsWithBastions, search, statusFilter, workspaceFilter]);

  const toggleSelectAll = () => {
    if (selectedVMs.length === filteredVMs.length) {
      setSelectedVMs([]);
    } else {
      setSelectedVMs(filteredVMs.map((vm) => `${vm.workspaceId}-${vm.index}`));
    }
  };

  const toggleSelect = (vm: ExtendedVM) => {
    const id = `${vm.workspaceId}-${vm.index}`;
    setSelectedVMs((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleVMAction = async (vm: ExtendedVM, action: "start" | "stop" | "restart") => {
    setIsLoading(`${vm.workspaceId}-${vm.index}-${action}`);
    // Note: VM power operations are not yet implemented in the MDC API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(null);

    toast({
      title: "Feature Coming Soon",
      description: `VM power operations (${action}) are not yet implemented in the MDC API`,
    });
  };

  const handleDelete = async () => {
    if (!vmToDelete) return;
    setIsLoading(`${vmToDelete.workspaceId}-${vmToDelete.index}-delete`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(null);
    setVmToDelete(null);
    toast({
      title: "Feature Coming Soon",
      description: "Individual VM deletion requires workspace update. Use workspace management to modify VMs.",
    });
  };

  const handleBulkDelete = async () => {
    setIsLoading("bulk-delete");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(null);
    setBulkDeleteOpen(false);
    setSelectedVMs([]);
    toast({
      title: "Feature Coming Soon",
      description: "Bulk VM operations are not yet implemented",
    });
  };

  const handleRefresh = async () => {
    setIsLoading("refresh");
    await refetchWorkspaces();
    setIsLoading(null);
    toast({
      title: "Refreshed",
      description: "VM list has been updated from workspaces",
    });
  };

  // Loading state
  if (workspacesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Virtual Machines</h1>
            <p className="text-muted-foreground">Loading VMs from workspaces...</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading virtual machines from MDC API...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (workspacesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Virtual Machines</h1>
            <p className="text-muted-foreground">Manage and monitor your virtual machine instances</p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold">Failed to load VMs</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {workspacesError.message || "Could not connect to MDC API"}
                </p>
              </div>
              <Button onClick={() => refetchWorkspaces()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virtual Machines</h1>
          <p className="text-muted-foreground">
            {allVMsWithBastions.length} VMs across {workspaces?.length || 0} workspaces
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading === "refresh"}>
            {isLoading === "refresh" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button asChild>
            <Link href="/dashboard/infrastructure/workspaces">
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total VMs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allVMsWithBastions.length}</div>
            <p className="text-xs text-muted-foreground">Across all workspaces</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {allVMsWithBastions.filter(vm => normalizeStatus(vm.status) === "running").length}
            </div>
            <p className="text-xs text-muted-foreground">Active instances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stopped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {allVMsWithBastions.filter(vm => normalizeStatus(vm.status) === "stopped").length}
            </div>
            <p className="text-xs text-muted-foreground">Inactive instances</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaces?.length || 0}</div>
            <p className="text-xs text-muted-foreground">VM containers</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by VM name..."
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
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workspaces</SelectItem>
                {workspaces?.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedVMs.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedVMs.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredVMs.length === 0 ? (
            <div className="text-center py-12">
              <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold">No virtual machines found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {allVMsWithBastions.length === 0
                  ? "Create a workspace to provision VMs"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              {allVMsWithBastions.length === 0 && (
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/dashboard/infrastructure/workspaces">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workspace
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedVMs.length === filteredVMs.length && filteredVMs.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVMs.map((vm, idx) => {
                  const status = normalizeStatus(vm.status);
                  const primaryAdapter = vm.networkAdapters?.[0];
                  const ipAddress = getIPFromNetworkAdapter(primaryAdapter);
                  const siteName = sites?.find(s => s.id === vm.siteId)?.name || "Unknown";
                  const vmKey = `${vm.workspaceId}-${vm.index}-${idx}`;

                  return (
                    <TableRow key={vmKey}>
                      <TableCell>
                        <Checkbox
                          checked={selectedVMs.includes(`${vm.workspaceId}-${vm.index}`)}
                          onCheckedChange={() => toggleSelect(vm)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
                          <button
                            onClick={() => setVmForDetails(vm)}
                            className="font-medium hover:underline text-left"
                          >
                            {vm.name}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">Index: {vm.index}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariants[status]}>
                          {vm.status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href="/dashboard/infrastructure/workspaces"
                          className="text-sm hover:underline"
                        >
                          {vm.workspaceName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {vm.networkAdapters && vm.networkAdapters.length > 0 ? (
                          <div className="space-y-1">
                            {vm.networkAdapters.slice(0, 2).map((adapter, i) => (
                              <div key={i} className="flex items-center gap-1 text-sm">
                                <Network className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{adapter.name}</span>
                                {adapter.networkInterfaces?.[0]?.ipAddress && (
                                  <>
                                    <code className="text-xs bg-muted px-1 rounded">
                                      {adapter.networkInterfaces[0].ipAddress}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => copyToClipboard(adapter.networkInterfaces![0].ipAddress!, "IP")}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ))}
                            {vm.networkAdapters.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{vm.networkAdapters.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No network</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{siteName}</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <ConsoleOpenButton
                              variant="dropdown-item"
                              workspaceId={vm.workspaceId}
                              vm={String(vm.index)}
                            />
                            <DropdownMenuItem onSelect={() => setVmForDetails(vm)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {status === "running" ? (
                              <>
                                <DropdownMenuItem
                                  onSelect={() => handleVMAction(vm, "stop")}
                                  disabled={!!isLoading}
                                >
                                  <Square className="mr-2 h-4 w-4" />
                                  Stop
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleVMAction(vm, "restart")}
                                  disabled={!!isLoading}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Restart
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onSelect={() => handleVMAction(vm, "start")}
                                disabled={!!isLoading}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Start
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => setVmToDelete(vm)}
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
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!vmToDelete} onOpenChange={() => setVmToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Virtual Machine?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{vmToDelete?.name}</strong>?
              This will remove the VM from workspace <strong>{vmToDelete?.workspaceName}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete VM"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedVMs.length} Virtual Machines?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected VMs will be removed from their workspaces.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading === "bulk-delete"}
            >
              {isLoading === "bulk-delete" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedVMs.length} VMs`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* VM Details Dialog */}
      <Dialog open={!!vmForDetails} onOpenChange={() => setVmForDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${vmForDetails ? statusColors[normalizeStatus(vmForDetails.status)] : ''}`} />
              {vmForDetails?.name}
            </DialogTitle>
            <DialogDescription>
              Virtual machine in workspace {vmForDetails?.workspaceName}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={vmForDetails ? statusBadgeVariants[normalizeStatus(vmForDetails.status)] : 'default'}>
                    {vmForDetails?.status || "unknown"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Index</p>
                  <p className="font-medium">{vmForDetails?.index}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Workspace</p>
                  <p className="font-medium">{vmForDetails?.workspaceName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Site</p>
                  <p className="font-medium">
                    {sites?.find(s => s.id === vmForDetails?.siteId)?.name || "Unknown"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Network Adapters</p>
                  <p className="font-medium">{vmForDetails?.networkAdapters?.length || 0}</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="network" className="space-y-4">
              {vmForDetails?.networkAdapters && vmForDetails.networkAdapters.length > 0 ? (
                <div className="space-y-3">
                  {vmForDetails.networkAdapters.map((adapter, i) => (
                    <div key={i} className="rounded-lg border p-4">
                      <h4 className="font-medium mb-2">{adapter.name}</h4>
                      <div className="space-y-2 text-sm">
                        {adapter.macAddress && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">MAC Address</span>
                            <code className="bg-muted px-2 py-1 rounded">{adapter.macAddress}</code>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Disconnected</span>
                          <span>{adapter.isDisconnected ? "Yes" : "No"}</span>
                        </div>
                        {adapter.networkInterfaces?.map((iface, j) => (
                          <div key={j} className="flex items-center justify-between">
                            <span className="text-muted-foreground">IP ({iface.name})</span>
                            <div className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded">
                                {iface.ipAddress || "N/A"}{iface.prefix ? `/${iface.prefix}` : ""}
                              </code>
                              {iface.ipAddress && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(iface.ipAddress!, "IP")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No network adapters configured
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVmForDetails(null)}>
              Close
            </Button>
            {vmForDetails && (
              <ConsoleOpenButton
                variant="button"
                workspaceId={vmForDetails.workspaceId}
                vm={String(vmForDetails.index)}
              />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
