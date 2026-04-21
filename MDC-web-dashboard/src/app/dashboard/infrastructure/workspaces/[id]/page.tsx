"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Server,
  Network,
  Lock,
  Unlock,
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Wifi,
  Copy,
  WifiOff,
  Cpu,
  MemoryStick,
  HardDrive,
  MapPin,
  Building2,
  FileJson,
  Maximize2,
  Minimize2,
} from "lucide-react";
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
// Table still used for virtual networks section below
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { ConsoleOpenButton } from "@/components/console-open-button";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspace, useSite, useUpdateWorkspaceDescriptor, useLockWorkspace, useDeleteWorkspace, useWorkspaceDescriptor, mdcQueryKeys } from "@/lib/mdc/hooks";
import {
  VirtualNetwork,
  VirtualMachineDescriptorOperation,
  WorkspaceDescriptor,
} from "@/lib/mdc/types";


function toDescriptorJson(data: unknown): string {
  if (data && typeof data === "object") {
    const { "@odata.context": _, ...rest } = data as Record<string, unknown>;
    return JSON.stringify(rest, null, 2);
  }
  return JSON.stringify(data, null, 2);
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  const lower = status.toLowerCase();
  if (lower === "running")
    return <Badge className="bg-green-600 hover:bg-green-600">Running</Badge>;
  if (lower === "stopped")
    return <Badge variant="secondary">Stopped</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const workspaceId = params.id as string;

  const { data: workspace, isLoading, isFetching, isError, refetch } =
    useWorkspace(workspaceId, { staleTime: 0 });

  const { data: descriptorData, isLoading: descriptorLoading, refetch: refetchDescriptor } =
    useWorkspaceDescriptor(workspaceId, { enabled: !!workspaceId });

  // organization and site summary come from $expand=organization,site on the workspace endpoint
  const site = workspace?.site;
  const organization = workspace?.organization;

  // Fetch full site only when Create VM dialog is open, to get virtualMachineTemplates
  const [createVMOpen, setCreateVMOpen] = useState(false);
  const effectiveSiteId = workspace?.siteId || workspace?.site?.id || "";
  const { data: fullSite, isLoading: siteLoading } = useSite(effectiveSiteId, {
    enabled: !!effectiveSiteId && createVMOpen,
  });
  const availableTemplates = fullSite?.virtualMachineTemplates || [];

  const queryClient = useQueryClient();
  const updateDescriptor = useUpdateWorkspaceDescriptor();
  const lockWorkspace = useLockWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [descriptorOpen, setDescriptorOpen] = useState(false);
  const [descriptorEditorText, setDescriptorEditorText] = useState("");
  const [descriptorJsonError, setDescriptorJsonError] = useState<string | null>(null);
  const [fetchingDescriptor, setFetchingDescriptor] = useState(false);
  const [descriptorFullscreen, setDescriptorFullscreen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [expandedVM, setExpandedVM] = useState<number | null>(null);

  // Remote network toggle state
  const [remoteNetworkConfirm, setRemoteNetworkConfirm] = useState<{
    network: VirtualNetwork;
    enable: boolean;
  } | null>(null);
  const [togglingNetworkId, setTogglingNetworkId] = useState<string | null>(null);

  const handleToggleRemoteNetwork = async (network: VirtualNetwork, enable: boolean) => {
    if (!workspace) return;
    setTogglingNetworkId(network.id);
    try {
      await updateDescriptor.mutateAsync({
        workspaceId,
        delta: {
          name: workspace.name,
          virtualNetworks: [
            {
              name: network.name,
              enableRemoteNetwork: enable,
            },
          ],
        },
      });
      // hook's onSuccess already invalidates workspace + descriptor queries;
      // also trigger a direct refetch so the UI updates immediately
      await Promise.all([
        refetch(),
        refetchDescriptor(),
      ]);
      toast({
        title: enable ? "Remote network enabled" : "Remote network disabled",
        description: `"${network.name}" remote network has been ${enable ? "enabled" : "disabled"}.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update network";
      toast({
        title: "Action failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTogglingNetworkId(null);
    }
  };

  const handleToggleLock = async () => {
    if (!workspace) return;
    const newLocked = !workspace.locked;
    try {
      await lockWorkspace.mutateAsync({ workspaceId, locked: newLocked });
      toast({
        title: newLocked ? "Workspace locked" : "Workspace unlocked",
        description: `"${workspace.name}" has been ${newLocked ? "locked" : "unlocked"}.`,
      });
    } catch {
      toast({
        title: "Action failed",
        description: `Could not ${newLocked ? "lock" : "unlock"} "${workspace.name}".`,
        variant: "destructive",
      });
    }
  };

  // Create VM dialog state
  const [vmName, setVmName] = useState("");
  const [vmTemplateName, setVmTemplateName] = useState("");
  const [vmCpuCores, setVmCpuCores] = useState("");
  const [vmMemoryMB, setVmMemoryMB] = useState("");

  interface VMNetworkAdapterForm {
    name: string;
    refVirtualNetworkName: string;
    isFirewallEnabled: boolean;
    enableRemoteNetwork: boolean;
  }
  const [vmNetworkAdapters, setVmNetworkAdapters] = useState<VMNetworkAdapterForm[]>([]);

  const selectedTemplate = availableTemplates.find((t) => t.name === vmTemplateName);

  const addVMNetworkAdapter = () => {
    const firstNet = networks[0]?.name || "";
    setVmNetworkAdapters((prev) => [
      ...prev,
      { name: `net${prev.length}`, refVirtualNetworkName: firstNet, isFirewallEnabled: true, enableRemoteNetwork: false },
    ]);
  };

  const updateVMNetworkAdapter = (idx: number, updates: Partial<VMNetworkAdapterForm>) => {
    setVmNetworkAdapters((prev) => prev.map((a, i) => (i === idx ? { ...a, ...updates } : a)));
  };

  const removeVMNetworkAdapter = (idx: number) => {
    setVmNetworkAdapters((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetVMForm = () => {
    setVmName("");
    setVmTemplateName("");
    setVmCpuCores("");
    setVmMemoryMB("");
    setVmNetworkAdapters([]);
  };

  const handleCreateVM = async () => {
    if (!vmName.trim() || !vmTemplateName) {
      toast({ title: "Validation Error", description: "VM name and template are required", variant: "destructive" });
      return;
    }
    try {
      await updateDescriptor.mutateAsync({
        workspaceId,
        delta: {
          name: workspace!.name,
          virtualMachines: [
            {
              name: vmName.trim(),
              templateName: vmTemplateName,
              cpuCores: vmCpuCores ? parseInt(vmCpuCores) : undefined,
              memoryMB: vmMemoryMB || undefined,
              operation: VirtualMachineDescriptorOperation.Add,
              ...(vmNetworkAdapters.length > 0 ? {
                networkAdapters: vmNetworkAdapters.map((a) => ({
                  name: a.name,
                  refVirtualNetworkName: a.refVirtualNetworkName,
                  isFirewallEnabled: a.isFirewallEnabled,
                  enableRemoteNetwork: a.enableRemoteNetwork,
                })),
              } : {}),
            },
          ],
        },
      });
      toast({ title: "VM created", description: `Virtual machine "${vmName}" is being provisioned.` });
      setCreateVMOpen(false);
      resetVMForm();
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create VM";
      toast({ title: "Error creating VM", description: message, variant: "destructive" });
    }
  };

  const vms = workspace?.virtualMachines || [];

  const networks = workspace?.virtualNetworks || [];
  // const hasBastion = !!workspace?.bastion; // Bastion removed from API response

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              router.push("/dashboard/infrastructure/workspaces")
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-7 w-48 mb-1" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">
                  {workspace?.name || workspaceId}
                </h1>
                {workspace?.description && (
                  <p className="text-muted-foreground">
                    {workspace.description}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && workspace && (
            <Button
              variant="outline"
              onClick={handleToggleLock}
              disabled={lockWorkspace.isPending}
            >
              {lockWorkspace.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : workspace.locked ? (
                <Unlock className="mr-2 h-4 w-4" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {workspace.locked ? "Unlock" : "Lock"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {isError && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Unable to load workspace details.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {!isError && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Virtual Machines
                </CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-bold">{vms.length}</div>
                )}
              </CardContent>
            </Card>
            {/* Bastion stat card removed — bastion no longer in API response */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Networks</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-bold">{networks.length}</div>
                )}
              </CardContent>
            </Card>
            <Card
              className={site ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""}
              onClick={() => {
                const siteId = site?.id || workspace?.siteId || workspace?.site?.id;
                if (siteId) router.push(`/dashboard/infrastructure/sites/${siteId}`);
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Site</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-primary">
                      {site?.name || workspace?.siteId || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{site?.id || workspace?.siteId || "—"}</div>
                    {site?.clusterName && (
                      <div className="text-xs text-muted-foreground truncate">Cluster: {site.clusterName}</div>
                    )}
                    {site?.siteNodes && site.siteNodes.length > 0 && (
                      <div className="text-xs text-muted-foreground">{site.siteNodes.length} node{site.siteNodes.length !== 1 ? "s" : ""}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card
              className={organization ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""}
              onClick={() => {
                const orgId = organization?.id || workspace?.organizationId;
                if (orgId) router.push(`/dashboard/settings/organization/${orgId}`);
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organization</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-primary">{organization?.name || "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{organization?.id || workspace?.organizationId || "—"}</div>
                    {organization?.description && (
                      <div className="text-xs text-muted-foreground truncate">{organization.description}</div>
                    )}
                    {organization && (
                      <div className="text-xs">
                        <Badge variant={organization.active ? "outline" : "secondary"} className={organization.active ? "text-green-600 border-green-300 text-xs" : "text-xs"}>
                          {organization.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Workspace Lock</CardTitle>
                {workspace?.locked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Unlock className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {workspace?.locked ? (
                      <Badge variant="secondary">Locked</Badge>
                    ) : (
                      <Badge variant="secondary">Unlocked</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Workspace Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Address</dt>
                  <dd className="mt-1 font-medium font-mono">{workspace?.address ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Status</dt>
                  <dd className="mt-1">
                    {workspace?.locked
                      ? <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" />Locked</Badge>
                      : <Badge variant="outline" className="gap-1 text-green-600 border-green-300"><Unlock className="h-3 w-3" />Unlocked</Badge>}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Created At</dt>
                  <dd className="mt-1 font-medium text-sm">
                    {isLoading ? <Skeleton className="h-4 w-32" /> : (workspace?.createdAt ? new Date(workspace.createdAt).toLocaleString() : "—")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Updated At</dt>
                  <dd className="mt-1 font-medium text-sm">
                    {isLoading ? <Skeleton className="h-4 w-32" /> : (workspace?.updatedAt ? new Date(workspace.updatedAt).toLocaleString() : "—")}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Site & Org details */}
          {!isLoading && (site || organization) && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Site details */}
              {site && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Site Details
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push(`/dashboard/infrastructure/sites/${site.id}`)}>
                        View Site <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-medium">{site.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{site.id}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {site.siteNodes && site.siteNodes.length > 0 && site.siteNodes.map((node) => (
                      <div key={node.id} className="space-y-2">
                        {node.cpuInfo && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-md border bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">CPU</p>
                              <p className="mt-0.5 text-sm font-medium">{node.cpuInfo.cores}c / {node.cpuInfo.cpUs} threads</p>
                              <p className="text-xs text-muted-foreground truncate">{node.cpuInfo.model}</p>
                            </div>
                            <div className="rounded-md border bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">CPU Speed</p>
                              <p className="mt-0.5 text-sm font-medium">{(node.cpuInfo.mhz / 1000).toFixed(2)} GHz</p>
                              <p className="text-xs text-muted-foreground">{node.cpuInfo.sockets} socket{node.cpuInfo.sockets !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                        )}
                        {node.memory && (
                          <div className="rounded-md border bg-muted/30 px-3 py-2">
                            <p className="text-xs text-muted-foreground mb-1">Memory</p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{(node.memory.total! / 1073741824).toFixed(0)} GB total</span>
                              <span className="text-muted-foreground">{(node.memory.free! / 1073741824).toFixed(0)} GB free</span>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.round((node.memory.used! / node.memory.total!) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {node.storage && (
                          <div className="rounded-md border bg-muted/30 px-3 py-2">
                            <p className="text-xs text-muted-foreground mb-1">Storage</p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{(node.storage.maxDisk! / 1073741824).toFixed(0)} GB total</span>
                              <span className="text-muted-foreground">{(node.storage.disk! / 1073741824).toFixed(0)} GB used</span>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.round((node.storage.disk! / node.storage.maxDisk!) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {node.serialNumber && (
                          <p className="text-xs text-muted-foreground">Serial: <span className="font-mono">{node.serialNumber}</span></p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Organization details */}
              {organization && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Organization Details
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push(`/dashboard/settings/organization/${organization.id}`)}>
                        View Org <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-medium">{organization.name}</p>
                    <p className="text-xs text-muted-foreground">{organization.description}</p>
                  </CardHeader>
                  <CardContent>
                    {organization.organizationUserRoles && organization.organizationUserRoles.length > 0 ? (
                      <div className="divide-y rounded-md border overflow-hidden">
                        {Array.from(
                          organization.organizationUserRoles.reduce((map, r) => {
                            const roles = map.get(r.userId) ?? [];
                            if (!roles.includes(r.role)) roles.push(r.role);
                            map.set(r.userId, roles);
                            return map;
                          }, new Map<string, string[]>())
                        ).map(([userId, roles]) => (
                          <button
                            key={userId}
                            className="w-full flex items-center justify-between px-3 py-2 text-left bg-background hover:bg-muted/50 transition-colors group"
                            onClick={() => router.push(`/dashboard/settings/users/${userId}`)}
                          >
                            <span className="text-xs font-mono text-muted-foreground truncate">{userId}</span>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {roles.map((r) => (
                                <span key={r} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground capitalize">{r}</span>
                              ))}
                              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No members assigned</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* VM Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Virtual Machines</CardTitle>
                  <CardDescription>
                    Manage VMs and access consoles
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={createVMOpen} onOpenChange={(open) => {
                    setCreateVMOpen(open);
                    if (!open) resetVMForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create VM
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[520px]">
                      <DialogHeader>
                        <DialogTitle>Create Virtual Machine</DialogTitle>
                        <DialogDescription>
                          Add a new VM to workspace &quot;{workspace?.name}&quot;
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="vm-name">VM Name <span className="text-destructive">*</span></Label>
                          <Input
                            id="vm-name"
                            placeholder="e.g. web-server"
                            value={vmName}
                            onChange={(e) => setVmName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Template <span className="text-destructive">*</span></Label>
                          {siteLoading ? (
                            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading templates…
                            </div>
                          ) : availableTemplates.length > 0 ? (
                            <Select value={vmTemplateName} onValueChange={(v) => { setVmTemplateName(v); setVmCpuCores(""); setVmMemoryMB(""); }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a template" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTemplates.map((t) => (
                                  <SelectItem key={`${t.name}-${t.revision}`} value={t.name}>
                                    {t.name}
                                    {(t.cores || t.memory) && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        {t.cores ? `${t.cores} cores` : ""}
                                        {t.cores && t.memory ? " · " : ""}
                                        {t.memory ? (parseInt(t.memory) >= 1024 ? `${parseInt(t.memory) / 1024}GB` : `${t.memory}MB`) : ""}
                                      </span>
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center h-9 px-3 rounded-md border bg-muted/30 text-sm text-muted-foreground">
                              No VM templates available for this site
                            </div>
                          )}
                          {selectedTemplate && (
                            <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground flex items-center gap-4">
                              <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{selectedTemplate.cores ?? "—"} cores</span>
                              <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />
                                {selectedTemplate.memory
                                  ? parseInt(selectedTemplate.memory) >= 1024
                                    ? `${parseInt(selectedTemplate.memory) / 1024} GB`
                                    : `${selectedTemplate.memory} MB`
                                  : "—"}
                              </span>
                              <span>Revision {selectedTemplate.revision}</span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>CPU Cores <span className="text-xs text-muted-foreground">(optional)</span></Label>
                            <Select
                              value={vmCpuCores || "default"}
                              onValueChange={(v) => setVmCpuCores(v === "default" ? "" : v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={selectedTemplate?.cores ? `Default: ${selectedTemplate.cores}` : "Template default"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">Template default</SelectItem>
                                {[1, 2, 4, 8, 16, 24, 32].map((c) => (
                                  <SelectItem key={c} value={String(c)}>
                                    {c} {c === 1 ? "core" : "cores"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Memory <span className="text-xs text-muted-foreground">(optional)</span></Label>
                            <Select
                              value={vmMemoryMB || "default"}
                              onValueChange={(v) => setVmMemoryMB(v === "default" ? "" : v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={selectedTemplate?.memory
                                  ? `Default: ${parseInt(selectedTemplate.memory) >= 1024 ? `${parseInt(selectedTemplate.memory) / 1024}GB` : `${selectedTemplate.memory}MB`}`
                                  : "Template default"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">Template default</SelectItem>
                                {[
                                  { label: "512 MB", value: "512" },
                                  { label: "1 GB", value: "1024" },
                                  { label: "2 GB", value: "2048" },
                                  { label: "4 GB", value: "4096" },
                                  { label: "8 GB", value: "8192" },
                                  { label: "16 GB", value: "16384" },
                                  { label: "32 GB", value: "32768" },
                                ].map((m) => (
                                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Network Adapters */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Network Adapters</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={addVMNetworkAdapter}
                              disabled={networks.length === 0}
                              title={networks.length === 0 ? "No virtual networks in this workspace" : ""}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Add Adapter
                            </Button>
                          </div>

                          {networks.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No virtual networks available in this workspace.</p>
                          ) : vmNetworkAdapters.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No adapters. Click Add Adapter to connect this VM to a network.</p>
                          ) : (
                            <div className="rounded-md border overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-muted">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium">Name</th>
                                    <th className="px-3 py-2 text-left font-medium">Network</th>
                                    <th className="px-3 py-2 text-center font-medium">Firewall</th>
                                    <th className="px-3 py-2 text-center font-medium">Remote</th>
                                    <th className="px-3 py-2"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {vmNetworkAdapters.map((adapter, idx) => (
                                    <tr key={idx} className="border-t">
                                      <td className="px-3 py-2">
                                        <Input
                                          value={adapter.name}
                                          onChange={(e) => updateVMNetworkAdapter(idx, { name: e.target.value })}
                                          className="h-7 text-xs w-20"
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <Select
                                          value={adapter.refVirtualNetworkName}
                                          onValueChange={(v) => updateVMNetworkAdapter(idx, { refVirtualNetworkName: v })}
                                        >
                                          <SelectTrigger className="h-7 text-xs w-28">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {networks.map((net) => (
                                              <SelectItem key={net.id} value={net.name}>
                                                {net.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <Switch
                                          checked={adapter.isFirewallEnabled}
                                          onCheckedChange={(v) => updateVMNetworkAdapter(idx, { isFirewallEnabled: v })}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        <Switch
                                          checked={adapter.enableRemoteNetwork}
                                          onCheckedChange={(v) => updateVMNetworkAdapter(idx, { enableRemoteNetwork: v })}
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => removeVMNetworkAdapter(idx)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setCreateVMOpen(false);
                            resetVMForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateVM}
                          disabled={!vmName.trim() || !vmTemplateName.trim() || updateDescriptor.isPending}
                        >
                          {updateDescriptor.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          Create VM
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3"
                    >
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : vms.length === 0 ? (
                <div className="text-center py-8">
                  <Server className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">
                    No virtual machines
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    This workspace has no virtual machines yet.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border rounded-md border">
                  {vms.map((vm) => {
                    const isOpen = expandedVM === vm.index;
                    return (
                      <div key={vm.index}>
                        {/* Summary row — click to expand */}
                        <button
                          className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedVM(isOpen ? null : vm.index)}
                        >
                          <span className="text-muted-foreground">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground w-6">{vm.index}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{vm.name}</span>
                            {vm.templateName && (
                              <span className="ml-2 text-xs text-muted-foreground">({vm.templateName})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {vm.cores != null && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Cpu className="h-3 w-3" />{vm.cores}
                              </span>
                            )}
                            {vm.memory != null && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MemoryStick className="h-3 w-3" />
                                {parseInt(vm.memory) >= 1024 ? `${(parseInt(vm.memory) / 1024).toFixed(0)}GB` : `${vm.memory}MB`}
                              </span>
                            )}
                            {vm.storage && vm.storage.filter(s => s.size != null).length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <HardDrive className="h-3 w-3" />
                                {vm.storage.filter(s => s.size != null).map(s =>
                                  s.size! >= 1073741824
                                    ? `${(s.size! / 1073741824).toFixed(0)}GB`
                                    : `${(s.size! / 1048576).toFixed(0)}MB`
                                ).join("+")}
                              </span>
                            )}
                            {vm.networkAdapters?.map((a) => (
                              <Badge key={a.name} variant={a.isDisconnected ? "secondary" : "outline"} className="text-xs">
                                {a.name}
                              </Badge>
                            ))}
                            <StatusBadge status={vm.status} />
                          </div>
                        </button>

                        {/* Expanded detail panel */}
                        {isOpen && (
                          <div className="bg-muted/30 border-t border-border px-6 py-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold">VM Details</h4>
                              <ConsoleOpenButton
                                variant="button"
                                workspaceId={workspaceId}
                                vm={String(vm.index)}
                              />
                            </div>

                            {/* Resources */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                              {vm.templateName && (
                                <div className="rounded-md border border-border bg-background px-3 py-2 sm:col-span-2">
                                  <p className="text-xs text-muted-foreground">Template</p>
                                  <p className="mt-0.5 font-medium text-sm">{vm.templateName} <span className="text-xs text-muted-foreground">rev.{vm.templateRevision ?? 0}</span></p>
                                </div>
                              )}
                              {vm.cores != null && (
                                <div className="rounded-md border border-border bg-background px-3 py-2">
                                  <p className="text-xs text-muted-foreground">CPU Cores</p>
                                  <p className="mt-0.5 font-medium text-sm">{vm.cores} {vm.cores === 1 ? "core" : "cores"}</p>
                                </div>
                              )}
                              {vm.memory != null && (
                                <div className="rounded-md border border-border bg-background px-3 py-2">
                                  <p className="text-xs text-muted-foreground">Memory</p>
                                  <p className="mt-0.5 font-medium text-sm">
                                    {parseInt(vm.memory) >= 1024
                                      ? `${(parseInt(vm.memory) / 1024).toFixed(parseInt(vm.memory) % 1024 === 0 ? 0 : 1)} GB`
                                      : `${vm.memory} MB`}
                                  </p>
                                </div>
                              )}
                              {vm.storage && vm.storage.filter(s => s.size != null).map((disk, i) => (
                                <div key={i} className="rounded-md border border-border bg-background px-3 py-2">
                                  <p className="text-xs text-muted-foreground capitalize">{disk.controllerType} disk {disk.controllerIndex}</p>
                                  <p className="mt-0.5 font-medium text-sm">
                                    {disk.size! >= 1073741824
                                      ? `${(disk.size! / 1073741824).toFixed(0)} GB`
                                      : `${(disk.size! / 1048576).toFixed(0)} MB`}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* Network Adapters */}
                            {vm.networkAdapters && vm.networkAdapters.length > 0 ? (
                              <div className="space-y-3">
                                {vm.networkAdapters.map((adapter) => (
                                  <div key={adapter.name} className="rounded-md border border-border bg-background p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-sm font-medium">{adapter.name}</span>
                                        <Badge variant={adapter.isDisconnected ? "secondary" : "outline"} className="text-xs">
                                          {adapter.isDisconnected ? "Disconnected" : "Connected"}
                                        </Badge>
                                      </div>
                                      {adapter.macAddress && (
                                        <span className="font-mono text-xs text-muted-foreground">{adapter.macAddress}</span>
                                      )}
                                    </div>

                                    {/* Network Interfaces */}
                                    {adapter.networkInterfaces && adapter.networkInterfaces.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs text-muted-foreground mb-1.5">Network Interfaces</p>
                                        <div className="space-y-1">
                                          {/* Filter out loopback */}
                                          {adapter.networkInterfaces
                                            .filter((iface) => iface.name !== "lo" && iface.name !== "Loopback Pseudo-Interface 1")
                                            .map((iface, i) => (
                                              <div key={i} className="flex items-center justify-between text-xs rounded bg-muted/50 px-2 py-1">
                                                <div className="flex items-center gap-3">
                                                  <span className="font-mono text-muted-foreground w-24 truncate">{iface.name}</span>
                                                  <span className="font-mono">{iface.ipAddress}/{iface.prefix}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  {iface.macAddress && (
                                                    <span className="font-mono text-muted-foreground">{iface.macAddress}</span>
                                                  )}
                                                  <button
                                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigator.clipboard.writeText(iface.ipAddress || "");
                                                      toast({ title: "Copied", description: `${iface.ipAddress} copied to clipboard` });
                                                    }}
                                                    title="Copy IP"
                                                  >
                                                    <Copy className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No network adapters</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bastion Card removed — bastion no longer in API response */}

          {/* Networks Card */}
          <Card>
            <CardHeader>
              <CardTitle>Virtual Networks</CardTitle>
              <CardDescription>
                Network configuration for this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="py-3">
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ))}
                </div>
              ) : networks.length === 0 ? (
                <div className="text-center py-6">
                  <Network className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground mt-2 text-sm">
                    No virtual networks in this workspace.
                  </p>
                </div>
              ) : (
                <div className="divide-y rounded-md border">
                  {networks.map((net) => {
                    const descriptorNet = descriptorData?.virtualNetworks?.find(
                      (vn) => vn.name === net.name
                    );
                    const isEnabled = descriptorNet?.enableRemoteNetwork === true;
                    const isToggling = togglingNetworkId === net.id;
                    return (
                      <div key={net.id} className="px-4 py-4 space-y-3">
                        {/* Network header row */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          {/* Left: name + gateway status + remote network status */}
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-muted-foreground w-5">{net.index}</span>
                            <span className="font-medium">{net.name}</span>
                            {net.tag != null && (
                              <Badge variant="outline" className="text-xs">VLAN {net.tag}</Badge>
                            )}
                            <StatusBadge status={net.gatewayStatus} />
                            {isEnabled ? (
                              <Badge className="gap-1 bg-green-600 hover:bg-green-600 text-white text-xs">
                                <Wifi className="h-3 w-3" /> Remote Enabled
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <WifiOff className="h-3 w-3" /> Remote Disabled
                              </Badge>
                            )}
                          </div>
                          {/* Right: toggle button */}
                          <div className="flex items-center gap-2">
                            {/* Toggle button */}
                            <Button
                              variant={isEnabled ? "destructive" : "outline"}
                              size="sm"
                              disabled={isToggling}
                              onClick={() => setRemoteNetworkConfirm({ network: net, enable: !isEnabled })}
                            >
                              {isToggling ? (
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              ) : isEnabled ? (
                                <WifiOff className="mr-2 h-3 w-3" />
                              ) : (
                                <Wifi className="mr-2 h-3 w-3" />
                              )}
                              {isEnabled ? "Disable Remote" : "Enable Remote"}
                            </Button>
                          </div>
                        </div>

                        {/* Gateway details */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {net.templateName && (
                            <div className="rounded-md border bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">Gateway Template</p>
                              <p className="mt-0.5 text-sm font-medium">{net.templateName} <span className="text-xs text-muted-foreground">rev.{net.templateRevision ?? 0}</span></p>
                            </div>
                          )}
                          {net.gatewayWANNetworkType && (
                            <div className="rounded-md border bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">WAN Type</p>
                              <p className="mt-0.5 text-sm font-medium">{net.gatewayWANNetworkType}</p>
                            </div>
                          )}
                          {net.cores != null && (
                            <div className="rounded-md border bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">Gateway CPU</p>
                              <p className="mt-0.5 text-sm font-medium flex items-center gap-1"><Cpu className="h-3 w-3" />{net.cores} {net.cores === 1 ? "core" : "cores"}</p>
                            </div>
                          )}
                          {net.memory != null && (
                            <div className="rounded-md border bg-muted/30 px-3 py-2">
                              <p className="text-xs text-muted-foreground">Gateway Memory</p>
                              <p className="mt-0.5 text-sm font-medium flex items-center gap-1">
                                <MemoryStick className="h-3 w-3" />
                                {parseInt(net.memory) >= 1024 ? `${(parseInt(net.memory) / 1024).toFixed(0)} GB` : `${net.memory} MB`}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Remote Network ID — show ZeroTier short ID, click → detail page */}
                        {net.remoteNetworkId && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-medium text-foreground">Remote Network ID:</span>
                            <button
                              className="font-mono text-primary hover:underline underline-offset-2"
                              onClick={() => router.push(`/dashboard/infrastructure/remote-networks/${net.remoteNetworkId}`)}
                            >
                              {net.zeroTierNetworkId ?? net.remoteNetworkId}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workspace Descriptor */}
          <Collapsible
            open={descriptorOpen}
            onOpenChange={(open) => {
              setDescriptorOpen(open);
              if (open && descriptorData && !descriptorEditorText) {
                setDescriptorEditorText(toDescriptorJson(descriptorData));
              }
              setDescriptorJsonError(null);
            }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                      <FileJson className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Workspace Descriptor
                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${descriptorOpen ? "rotate-90" : ""}`} />
                        </CardTitle>
                        <CardDescription>Edit and apply the workspace descriptor JSON</CardDescription>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  {descriptorOpen && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={fetchingDescriptor}
                        onClick={async () => {
                          setFetchingDescriptor(true);
                          try {
                            const { data } = await refetchDescriptor();
                            if (data) {
                              setDescriptorEditorText(toDescriptorJson(data));
                              setDescriptorJsonError(null);
                              toast({ title: "Refreshed", description: "Latest descriptor loaded into editor" });
                            }
                          } finally {
                            setFetchingDescriptor(false);
                          }
                        }}
                      >
                        {fetchingDescriptor ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {fetchingDescriptor ? "Fetching..." : "Fetch Latest"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!descriptorData}
                        onClick={() => {
                          const json = toDescriptorJson(descriptorData);
                          setDescriptorEditorText(json);
                          setDescriptorJsonError(null);
                          navigator.clipboard.writeText(json);
                          toast({ title: "Copied & Reset", description: "Current descriptor copied and loaded into editor" });
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy & Reset
                      </Button>
                      <Button
                        size="sm"
                        disabled={updateDescriptor.isPending || !descriptorEditorText.trim()}
                        onClick={() => {
                          setDescriptorJsonError(null);
                          let parsed: Partial<WorkspaceDescriptor>;
                          try {
                            parsed = JSON.parse(descriptorEditorText);
                          } catch {
                            setDescriptorJsonError("Invalid JSON — please fix before submitting.");
                            return;
                          }
                          updateDescriptor.mutate(
                            { workspaceId, delta: parsed },
                            {
                              onSuccess: () => {
                                toast({ title: "Descriptor updated", description: "Workspace descriptor has been updated successfully." });
                                refetch();
                              },
                              onError: (err) => {
                                toast({
                                  title: "Update failed",
                                  description: err instanceof Error ? err.message : "Failed to update descriptor",
                                  variant: "destructive",
                                });
                              },
                            }
                          );
                        }}
                      >
                        {updateDescriptor.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Apply
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        title="Fullscreen editor"
                        onClick={() => setDescriptorFullscreen(true)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {descriptorLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : (
                    <>
                      <textarea
                        className="w-full h-80 rounded-md border bg-muted/30 p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        value={descriptorEditorText}
                        spellCheck={false}
                        onChange={(e) => {
                          setDescriptorEditorText(e.target.value);
                          setDescriptorJsonError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Tab") {
                            e.preventDefault();
                            const el = e.currentTarget;
                            const start = el.selectionStart;
                            const end = el.selectionEnd;
                            const newVal = el.value.substring(0, start) + "  " + el.value.substring(end);
                            setDescriptorEditorText(newVal);
                            requestAnimationFrame(() => {
                              el.selectionStart = el.selectionEnd = start + 2;
                            });
                          }
                        }}
                      />
                      {descriptorJsonError && (
                        <p className="text-xs text-destructive">{descriptorJsonError}</p>
                      )}
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Descriptor Fullscreen Dialog */}
          <Dialog open={descriptorFullscreen} onOpenChange={setDescriptorFullscreen}>
            <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] flex flex-col p-0 gap-0 [&>button]:hidden">
              <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0 shrink-0">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-muted-foreground" />
                  <DialogTitle>Workspace Descriptor</DialogTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={fetchingDescriptor}
                    onClick={async () => {
                      setFetchingDescriptor(true);
                      try {
                        const { data } = await refetchDescriptor();
                        if (data) {
                          setDescriptorEditorText(toDescriptorJson(data));
                          setDescriptorJsonError(null);
                          toast({ title: "Refreshed", description: "Latest descriptor loaded into editor" });
                        }
                      } finally {
                        setFetchingDescriptor(false);
                      }
                    }}
                  >
                    {fetchingDescriptor ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {fetchingDescriptor ? "Fetching..." : "Fetch Latest"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateDescriptor.isPending || !descriptorEditorText.trim()}
                    onClick={() => {
                      setDescriptorJsonError(null);
                      let parsed: Partial<WorkspaceDescriptor>;
                      try {
                        parsed = JSON.parse(descriptorEditorText);
                      } catch {
                        setDescriptorJsonError("Invalid JSON — please fix before submitting.");
                        return;
                      }
                      updateDescriptor.mutate(
                        { workspaceId, delta: parsed },
                        {
                          onSuccess: () => {
                            toast({ title: "Descriptor updated", description: "Workspace descriptor updated successfully." });
                            refetch();
                            setDescriptorFullscreen(false);
                          },
                          onError: (err) => {
                            toast({
                              title: "Update failed",
                              description: err instanceof Error ? err.message : "Failed to update descriptor",
                              variant: "destructive",
                            });
                          },
                        }
                      );
                    }}
                  >
                    {updateDescriptor.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    title="Exit fullscreen"
                    onClick={() => setDescriptorFullscreen(false)}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-hidden min-h-0 p-3">
                <textarea
                  className="w-full h-full rounded-md border bg-muted/30 p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  value={descriptorEditorText}
                  spellCheck={false}
                  onChange={(e) => {
                    setDescriptorEditorText(e.target.value);
                    setDescriptorJsonError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const el = e.currentTarget;
                      const start = el.selectionStart;
                      const end = el.selectionEnd;
                      const newVal = el.value.substring(0, start) + "  " + el.value.substring(end);
                      setDescriptorEditorText(newVal);
                      requestAnimationFrame(() => {
                        el.selectionStart = el.selectionEnd = start + 2;
                      });
                    }
                  }}
                />
              </div>
              {descriptorJsonError && (
                <p className="px-4 py-2 text-xs text-destructive border-t shrink-0">{descriptorJsonError}</p>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Workspace */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Delete Workspace</CardTitle>
              <CardDescription>
                Permanently delete this workspace and all its virtual machines, networks, and data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                disabled={isLoading || !workspace}
                onClick={() => {
                  setDeleteConfirmName("");
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Workspace
              </Button>
            </CardContent>
          </Card>

          {/* Remote Network toggle confirmation */}
          <AlertDialog
            open={!!remoteNetworkConfirm}
            onOpenChange={(open) => { if (!open) setRemoteNetworkConfirm(null); }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {remoteNetworkConfirm?.enable ? "Enable Remote Network" : "Disable Remote Network"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {remoteNetworkConfirm?.enable
                    ? `Are you sure you want to enable remote network for "${remoteNetworkConfirm.network.name}"? This will allow remote access to this virtual network.`
                    : `Are you sure you want to disable remote network for "${remoteNetworkConfirm?.network.name}"? This will remove remote access from this virtual network.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={remoteNetworkConfirm?.enable ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                  onClick={(e) => {
                    e.preventDefault();
                    const confirm = remoteNetworkConfirm;
                    setRemoteNetworkConfirm(null);
                    if (confirm) {
                      handleToggleRemoteNetwork(confirm.network, confirm.enable);
                    }
                  }}
                >
                  {remoteNetworkConfirm?.enable ? "Enable" : "Disable"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* GitHub-style delete confirmation dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
            if (!deleteWorkspace.isPending) setDeleteDialogOpen(open);
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-destructive">Delete Workspace</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      This action <strong className="text-foreground">cannot be undone</strong>. This will permanently delete the{" "}
                      <strong className="text-foreground">{workspace?.name}</strong> workspace including all virtual machines, networks, and data.
                    </p>
                    <p>
                      Please type <strong className="text-foreground select-all font-mono">{workspace?.name}</strong> to confirm.
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Input
                  placeholder={workspace?.name}
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && deleteConfirmName === workspace?.name && !deleteWorkspace.isPending) {
                      e.preventDefault();
                      deleteWorkspace.mutate(workspaceId, {
                        onSuccess: () => {
                          queryClient.removeQueries({ queryKey: mdcQueryKeys.workspace(workspaceId) });
                          setDeleteDialogOpen(false);
                          toast({ title: "Workspace deleted", description: `"${workspace?.name}" has been permanently deleted.` });
                          router.push("/dashboard/infrastructure/workspaces");
                        },
                        onError: () => {
                          toast({ title: "Delete failed", description: `Could not delete "${workspace?.name}". Please try again.`, variant: "destructive" });
                        },
                      });
                    }
                  }}
                  disabled={deleteWorkspace.isPending}
                  autoFocus
                />
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={deleteWorkspace.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirmName !== workspace?.name || deleteWorkspace.isPending}
                  onClick={() => {
                    deleteWorkspace.mutate(workspaceId, {
                      onSuccess: () => {
                        queryClient.removeQueries({ queryKey: mdcQueryKeys.workspace(workspaceId) });
                        setDeleteDialogOpen(false);
                        toast({ title: "Workspace deleted", description: `"${workspace?.name}" has been permanently deleted.` });
                        router.push("/dashboard/infrastructure/workspaces");
                      },
                      onError: () => {
                        toast({ title: "Delete failed", description: `Could not delete "${workspace?.name}". Please try again.`, variant: "destructive" });
                      },
                    });
                  }}
                >
                  {deleteWorkspace.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete this workspace
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
