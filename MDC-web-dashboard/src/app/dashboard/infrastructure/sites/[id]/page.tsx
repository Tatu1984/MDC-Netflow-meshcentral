"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Server,
  Cpu,
  CheckCircle2,
  XCircle,
  FileBox,
  MemoryStick,
  HardDrive,
  Loader2,
  RefreshCw,
  AlertCircle,
  Router,
  MonitorCheck,
  Hash,
  Building2,
  Network,
  ExternalLink,
  Lock,
  Unlock,
  Users,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSite, useDownloadableTemplates, useDownloadTemplate, useCreateWorkspace } from "@/lib/mdc/hooks";
import { Site, SiteNode, Template } from "@/lib/mdc/types";
import { useToast } from "@/hooks/use-toast";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtMemory(mb?: string | number): string {
  if (mb == null) return "N/A";
  const n = typeof mb === "string" ? parseInt(mb, 10) : mb;
  if (isNaN(n)) return String(mb);
  return n >= 1024 ? `${(n / 1024).toFixed(n % 1024 === 0 ? 0 : 1)} GB` : `${n} MB`;
}

function fmtBytes(bytes?: number): string {
  if (bytes == null) return "N/A";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${bytes} B`;
}

function fmtStorageList(storage?: { controllerType?: string; controllerIndex?: number; size?: number | null }[]): string {
  if (!storage || storage.length === 0) return "N/A";
  const withSize = storage.filter((s) => s.size != null && s.size > 0);
  if (withSize.length === 0) return "N/A";
  return withSize.map((s) => fmtBytes(s.size!)).join(" + ");
}

function UsageBar({ used, total, label }: { used?: number; total?: number; label: string }) {
  if (used == null || total == null || total === 0) return null;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct}% — {fmtBytes(used)} / {fmtBytes(total)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Node card ─────────────────────────────────────────────────────────────────

function NodeCard({ node }: { node: SiteNode }) {
  const cpuPct = node.cpu != null ? Math.round(node.cpu * 100) : null;
  const cpuColor = cpuPct != null ? (cpuPct > 90 ? "bg-red-500" : cpuPct > 70 ? "bg-amber-500" : "bg-green-500") : "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            {node.name}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {node.online ? (
              <Badge className="bg-green-600 hover:bg-green-600">Online</Badge>
            ) : (
              <Badge variant="destructive">Offline</Badge>
            )}
            {node.authorized && <Badge variant="outline">Authorized</Badge>}
            {node.configured && <Badge variant="secondary">Configured</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Meta row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {node.serialNumber && (
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" />Serial</p>
              <p className="font-mono font-medium">{node.serialNumber}</p>
            </div>
          )}
          {node.hostName && (
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MonitorCheck className="h-3 w-3" />Hostname</p>
              <p className="font-medium truncate">{node.hostName}</p>
            </div>
          )}
          {node.registered && (
            <div>
              <p className="text-xs text-muted-foreground">Registered</p>
              <p className="font-medium">{new Date(node.registered).toLocaleDateString()}</p>
            </div>
          )}
          {node.id && (
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Node ID</p>
              <p className="font-mono text-xs break-all">{node.id}</p>
            </div>
          )}
        </div>

        {/* CPU info */}
        {node.cpuInfo && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">CPU</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="font-medium text-xs">{node.cpuInfo.model}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sockets</p>
                <p className="font-medium">{node.cpuInfo.sockets}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cores</p>
                <p className="font-medium">{node.cpuInfo.cores}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Threads</p>
                <p className="font-medium">{node.cpuInfo.cpUs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Frequency</p>
                <p className="font-medium">{node.cpuInfo.mhz.toFixed(0)} MHz</p>
              </div>
            </div>
            {cpuPct != null && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />CPU Usage</span>
                  <span>{cpuPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${cpuColor}`} style={{ width: `${cpuPct}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Memory */}
        {node.memory && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <MemoryStick className="h-3 w-3" />Memory
            </p>
            <UsageBar used={node.memory.used} total={node.memory.total} label="RAM" />
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
              <div><span className="block text-foreground font-medium">{fmtBytes(node.memory.used)}</span>Used</div>
              <div><span className="block text-foreground font-medium">{fmtBytes(node.memory.free)}</span>Free</div>
              <div><span className="block text-foreground font-medium">{fmtBytes(node.memory.total)}</span>Total</div>
            </div>
          </div>
        )}

        {/* Storage */}
        {node.storage && (node.storage.maxDisk != null) && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <HardDrive className="h-3 w-3" />Storage
            </p>
            <UsageBar used={node.storage.disk} total={node.storage.maxDisk} label="Disk" />
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
              <div><span className="block text-foreground font-medium">{fmtBytes(node.storage.disk)}</span>Used</div>
              <div><span className="block text-foreground font-medium">{fmtBytes(node.storage.maxDisk)}</span>Total</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Templates tab ─────────────────────────────────────────────────────────────

function TemplatesTab({ site }: { site: Site }) {
  const { toast } = useToast();
  const { data: downloadable, isLoading: loadingDownloadable } = useDownloadableTemplates(site.id);
  const downloadMutation = useDownloadTemplate();

  const handleDownload = async (template: Template) => {
    try {
      await downloadMutation.mutateAsync({ siteId: site.id, descriptor: { digest: template.digest } });
      toast({ title: "Download started", description: `"${template.name}" is being downloaded to ${site.name}.` });
    } catch (err: unknown) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const vmTemplates = site.virtualMachineTemplates || [];
  const gwTemplates = site.gatewayTemplates || [];
  const hasLocal = vmTemplates.length + gwTemplates.length > 0;

  return (
    <div className="space-y-6">
      {/* Installed VM Templates */}
      {vmTemplates.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Server className="h-4 w-4 text-purple-600" />VM Templates
            <Badge variant="secondary">{vmTemplates.length}</Badge>
          </h4>
          <div className="space-y-2">
            {vmTemplates.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileBox className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">Rev. {t.revision}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {t.cores != null && (
                    <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{t.cores} cores</span>
                  )}
                  {t.memory && (
                    <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />{fmtMemory(t.memory)}</span>
                  )}
                  {t.storage && fmtStorageList(t.storage) !== "N/A" && (
                    <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{fmtStorageList(t.storage)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gateway Templates */}
      {gwTemplates.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Router className="h-4 w-4 text-orange-500" />Gateway Templates
            <Badge variant="secondary">{gwTemplates.length}</Badge>
          </h4>
          <div className="space-y-2">
            {gwTemplates.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileBox className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">Rev. {t.revision}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {t.cores != null && (
                    <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{t.cores} cores</span>
                  )}
                  {t.memory && (
                    <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />{fmtMemory(t.memory)}</span>
                  )}
                  {t.storage && fmtStorageList(t.storage) !== "N/A" && (
                    <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{fmtStorageList(t.storage)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downloadable Templates */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          Available to Download
          {loadingDownloadable && <Loader2 className="h-3 w-3 animate-spin" />}
          {downloadable && <Badge variant="secondary">{downloadable.length}</Badge>}
        </h4>
        {downloadable && downloadable.length > 0 ? (
          <div className="space-y-2">
            {downloadable.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileBox className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline">Rev. {t.revision}</Badge>
                  <Badge variant="secondary">{t.type}</Badge>
                  {t.downloaded && <Badge className="bg-green-600 hover:bg-green-600">Downloaded</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                    {t.cores != null && <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{t.cores} cores</span>}
                    {t.memory && <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />{fmtMemory(t.memory)}</span>}
                  </span>
                  {!t.downloaded && (
                    <Button size="sm" variant="outline" onClick={() => handleDownload(t)} disabled={downloadMutation.isPending}>
                      {downloadMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Download"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !loadingDownloadable ? (
          <p className="text-sm text-muted-foreground">No templates available for download.</p>
        ) : null}
      </div>

      {!hasLocal && (!downloadable || downloadable.length === 0) && !loadingDownloadable && (
        <div className="text-center py-8 text-muted-foreground">
          <FileBox className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No templates available for this site</p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const siteId = params.id as string;

  const { data: site, isLoading, isError, refetch, isFetching } = useSite(siteId);
  const createWorkspaceMutation = useCreateWorkspace();

  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDescription, setWsDescription] = useState("");
  const [wsOrgId, setWsOrgId] = useState("");

  const nodes = site?.siteNodes || site?.nodes || [];
  const onlineNodes = nodes.filter((n) => n.online).length;
  const totalNodes = nodes.length;
  const totalTemplates = (site?.virtualMachineTemplates?.length || 0) + (site?.gatewayTemplates?.length || 0);
  const workspaces = site?.workspaces || [];
  const organizations = site?.organizations || [];

  const openWsDialog = () => {
    setWsName("");
    setWsDescription("");
    setWsOrgId(organizations.length === 1 ? organizations[0].id : "");
    setWsDialogOpen(true);
  };

  const handleCreateWorkspace = async () => {
    if (!wsName.trim()) {
      toast({ title: "Validation Error", description: "Workspace name is required", variant: "destructive" });
      return;
    }
    if (!wsOrgId) {
      toast({ title: "Validation Error", description: "Please select an organization", variant: "destructive" });
      return;
    }
    try {
      await createWorkspaceMutation.mutateAsync({
        siteId,
        organizationId: wsOrgId,
        descriptor: {
          name: wsName.trim(),
          description: wsDescription.trim() || undefined,
        },
      });
      toast({ title: "Workspace Created", description: `"${wsName}" has been created successfully` });
      setWsDialogOpen(false);
      refetch();
    } catch (err) {
      toast({
        title: "Create Workspace Failed",
        description: err instanceof Error ? err.message : "Failed to create workspace",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">{site?.name ?? "Site"}</h1>
          )}
          {site?.clusterName && site.clusterName !== site.name && (
            <p className="text-sm text-muted-foreground">Cluster: {site.clusterName}</p>
          )}
          <p className="text-xs text-muted-foreground font-mono">{siteId}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
        <Button size="sm" onClick={openWsDialog} disabled={isLoading || isError}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Failed to load site
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {site && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalNodes}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{onlineNodes}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offline</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{totalNodes - onlineNodes}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <FileBox className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalTemplates}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{workspaces.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{organizations.length}</div></CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="nodes">
            <TabsList>
              <TabsTrigger value="nodes">Nodes ({totalNodes})</TabsTrigger>
              <TabsTrigger value="workspaces">Workspaces ({workspaces.length})</TabsTrigger>
              <TabsTrigger value="organizations">Organizations ({organizations.length})</TabsTrigger>
              <TabsTrigger value="templates">Templates ({totalTemplates})</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            {/* Nodes */}
            <TabsContent value="nodes" className="mt-4 space-y-3">
              {nodes.length > 0 ? (
                nodes.map((node, i) => <NodeCard key={node.id || i} node={node} />)
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Server className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No nodes registered for this site</p>
                </div>
              )}
            </TabsContent>

            {/* Workspaces */}
            <TabsContent value="workspaces" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Network className="h-4 w-4" /> Workspaces
                  </CardTitle>
                  <CardDescription>Workspaces running on this site</CardDescription>
                </CardHeader>
                <CardContent>
                  {workspaces.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Network className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No workspaces on this site</p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border overflow-hidden">
                      {workspaces.map((ws) => (
                        <Link key={ws.id} href={`/dashboard/infrastructure/workspaces/${ws.id}`}>
                          <div className="flex items-center justify-between px-4 py-3 bg-background hover:bg-muted/50 cursor-pointer transition-colors gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{ws.name}</p>
                                {ws.locked ? (
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                  <Unlock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                )}
                              </div>
                              {ws.description && (
                                <p className="text-xs text-muted-foreground truncate">{ws.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground font-mono">{ws.id}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                              {ws.virtualMachines && ws.virtualMachines.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Server className="h-3.5 w-3.5" />{ws.virtualMachines.length} VM{ws.virtualMachines.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              {ws.virtualNetworks && ws.virtualNetworks.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Network className="h-3.5 w-3.5" />{ws.virtualNetworks.length} net
                                </span>
                              )}
                              <span className="text-muted-foreground/60">Addr: {ws.address}</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Organizations */}
            <TabsContent value="organizations" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Organizations
                  </CardTitle>
                  <CardDescription>Organizations associated with this site</CardDescription>
                </CardHeader>
                <CardContent>
                  {organizations.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No organizations linked to this site</p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border overflow-hidden">
                      {organizations.map((org) => (
                        <Link key={org.id} href={`/dashboard/settings/organization/${org.id}`}>
                          <div className="flex items-center justify-between px-4 py-3 bg-background hover:bg-muted/50 cursor-pointer transition-colors gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{org.name}</p>
                                <Badge variant={org.active ? "outline" : "secondary"} className={org.active ? "text-green-600 border-green-300 text-xs" : "text-xs"}>
                                  {org.active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              {org.description && (
                                <p className="text-xs text-muted-foreground truncate">{org.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground font-mono">{org.id}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                              {org.organizationUserRoles && org.organizationUserRoles.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {new Set(org.organizationUserRoles.map(r => r.userId)).size} member{new Set(org.organizationUserRoles.map(r => r.userId)).size !== 1 ? "s" : ""}
                                </span>
                              )}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Templates */}
            <TabsContent value="templates" className="mt-4">
              <TemplatesTab site={site} />
            </TabsContent>

            {/* Info */}
            <TabsContent value="info" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Site ID</dt>
                      <dd className="mt-1 font-mono text-sm break-all">{site.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Cluster Name</dt>
                      <dd className="mt-1 text-sm">{site.clusterName || <span className="italic text-muted-foreground">—</span>}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">Description</dt>
                      <dd className="mt-1 text-sm">{site.description || <span className="italic text-muted-foreground">—</span>}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create Workspace Dialog */}
      <Dialog open={wsDialogOpen} onOpenChange={(open) => { if (!open) setWsDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace on site <strong>{site?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="ws-name"
                placeholder="e.g. Development Workspace"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-desc">Description</Label>
              <Input
                id="ws-desc"
                placeholder="Optional description"
                value={wsDescription}
                onChange={(e) => setWsDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Organization <span className="text-destructive">*</span></Label>
              <Select value={wsOrgId} onValueChange={setWsOrgId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.length > 0 ? (
                    organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))
                  ) : (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">
                      No organizations linked to this site
                    </p>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={createWorkspaceMutation.isPending}>
              {createWorkspaceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
