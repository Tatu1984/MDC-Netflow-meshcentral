"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Globe,
  Server,
  ChevronRight,
  LayoutGrid,
  Lock,
  Unlock,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useOrganization, useCreateWorkspace } from "@/lib/mdc/hooks";
import { Organization } from "@/lib/mdc/types";

function RoleBadge({ role }: { role: string }) {
  const lower = role.toLowerCase();
  const cls =
    lower === "globaladministrator" || lower === "admin"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      : lower === "manager" || lower === "workspacemanager"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      : lower === "developer" || lower === "datacentertechnician"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : lower === "user" || lower === "workspaceuser"
      ? "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {role}
    </span>
  );
}

function groupByUser(roles: Organization["organizationUserRoles"]) {
  if (!roles?.length) return [];
  const map = new Map<string, string[]>();
  for (const r of roles) {
    const existing = map.get(r.userId) ?? [];
    if (!existing.includes(r.role)) existing.push(r.role);
    map.set(r.userId, existing);
  }
  return Array.from(map.entries()).map(([userId, userRoles]) => ({ userId, roles: userRoles }));
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const { toast } = useToast();
  const { data: org, isLoading, isError, refetch, isFetching } = useOrganization(orgId);
  const createWorkspaceMutation = useCreateWorkspace();

  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDescription, setWsDescription] = useState("");
  const [wsSiteId, setWsSiteId] = useState("");

  const grouped = groupByUser(org?.organizationUserRoles);
  const sites = org?.sites ?? [];
  const workspaces = org?.workspaces ?? [];

  const handleCreateWorkspace = async () => {
    if (!wsName.trim()) {
      toast({ title: "Validation Error", description: "Workspace name is required", variant: "destructive" });
      return;
    }
    if (!wsSiteId) {
      toast({ title: "Validation Error", description: "Please select a site", variant: "destructive" });
      return;
    }
    try {
      await createWorkspaceMutation.mutateAsync({
        siteId: wsSiteId,
        organizationId: orgId,
        descriptor: {
          name: wsName.trim(),
          description: wsDescription.trim() || undefined,
        },
      });
      toast({ title: "Workspace Created", description: `"${wsName}" has been created successfully` });
      setWsDialogOpen(false);
      setWsName("");
      setWsDescription("");
      setWsSiteId("");
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
            <h1 className="text-3xl font-bold tracking-tight">{org?.name ?? "Organization"}</h1>
          )}
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{orgId}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
        <Button size="sm" onClick={() => { setWsName(""); setWsDescription(""); setWsSiteId(""); setWsDialogOpen(true); }} disabled={isLoading || isError}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 flex flex-col items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm">Failed to load organization.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {org && (
        <>
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">Name</dt>
                  <dd className="mt-1 font-medium">{org.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">Status</dt>
                  <dd className="mt-1">
                    {org.active ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 text-sm font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Inactive
                      </span>
                    )}
                  </dd>
                </div>
                {org.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">Description</dt>
                    <dd className="mt-1 text-sm">{org.description}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground uppercase tracking-wide">Organization ID</dt>
                  <dd className="mt-1 font-mono text-xs text-muted-foreground break-all">{org.id}</dd>
                </div>
              </dl>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">{grouped.length}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                    <Users className="h-3 w-3" /> Members
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">{sites.length}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                    <Globe className="h-3 w-3" /> Sites
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">{workspaces.length}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                    <LayoutGrid className="h-3 w-3" /> Workspaces
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Sites
                {sites.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{sites.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {sites.length === 0
                  ? "No sites linked to this organization"
                  : `${sites.length} site${sites.length !== 1 ? "s" : ""} linked · click to view details`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No sites linked</p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border overflow-hidden">
                  {sites.map((site) => {
                    const nodes = site.siteNodes ?? site.nodes ?? [];
                    const onlineNodes = nodes.filter((n) => n.online).length;
                    const serials = nodes.map((n) => n.serialNumber).filter(Boolean) as string[];

                    return (
                      <button
                        key={site.id}
                        className="w-full text-left px-4 py-3 bg-background hover:bg-muted/50 cursor-pointer transition-colors group"
                        onClick={() => router.push(`/dashboard/infrastructure/sites/${site.id}`)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{site.name}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">{site.id}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {nodes.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Server className="h-3 w-3" />
                                <span className="text-green-600 font-medium">{onlineNodes}</span>
                                <span>/ {nodes.length} online</span>
                              </span>
                            )}
                            {serials.length > 0 && (
                              <div className="hidden sm:flex flex-wrap gap-1">
                                {serials.slice(0, 2).map((s) => (
                                  <span key={s} className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {s}
                                  </span>
                                ))}
                                {serials.length > 2 && (
                                  <span className="text-xs text-muted-foreground">+{serials.length - 2}</span>
                                )}
                              </div>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workspaces */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutGrid className="h-4 w-4" />
                Workspaces
                {workspaces.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{workspaces.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {workspaces.length === 0
                  ? "No workspaces in this organization"
                  : `${workspaces.length} workspace${workspaces.length !== 1 ? "s" : ""} · click to view details`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workspaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <LayoutGrid className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No workspaces found</p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border overflow-hidden">
                  {workspaces.map((ws) => {
                    const vmCount = ws.virtualMachines?.length ?? 0;
                    const netCount = ws.virtualNetworks?.length ?? 0;
                    const created = new Date(ws.createdAt).toLocaleDateString(undefined, {
                      year: "numeric", month: "short", day: "numeric",
                    });

                    return (
                      <button
                        key={ws.id}
                        className="w-full text-left px-4 py-3 bg-background hover:bg-muted/50 cursor-pointer transition-colors group"
                        onClick={() => router.push(`/dashboard/infrastructure/workspaces/${ws.id}`)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {ws.locked
                              ? <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                              : <Unlock className="h-4 w-4 text-muted-foreground shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{ws.name}</p>
                              {ws.description && (
                                <p className="text-xs text-muted-foreground truncate">{ws.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground font-mono truncate">{ws.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {ws.locked && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Locked</Badge>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {vmCount > 0 && (
                                <span>{vmCount} VM{vmCount !== 1 ? "s" : ""}</span>
                              )}
                              {netCount > 0 && (
                                <span>{netCount} net{netCount !== 1 ? "s" : ""}</span>
                              )}
                              <span className="hidden sm:inline">{created}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Members
                {grouped.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{grouped.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {grouped.length === 0
                  ? "No members assigned to this organization"
                  : `${grouped.length} unique user${grouped.length !== 1 ? "s" : ""} with access · click to view profile`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {grouped.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No members assigned</p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border overflow-hidden">
                  {grouped.map(({ userId, roles }) => (
                    <button
                      key={userId}
                      className="w-full text-left flex items-center justify-between px-4 py-3 bg-background hover:bg-muted/50 cursor-pointer transition-colors group gap-4"
                      onClick={() => router.push(`/dashboard/settings/users/${userId}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {userId.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate">{userId}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex gap-1 flex-wrap justify-end">
                          {roles.map((r) => <RoleBadge key={r} role={r} />)}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Workspace Dialog */}
      <Dialog open={wsDialogOpen} onOpenChange={(open) => { if (!open) setWsDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace for <strong>{org?.name}</strong>
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
              <Label>Site <span className="text-destructive">*</span></Label>
              <Select value={wsSiteId} onValueChange={setWsSiteId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.length > 0 ? (
                    sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))
                  ) : (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">
                      No sites assigned to this organization
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
