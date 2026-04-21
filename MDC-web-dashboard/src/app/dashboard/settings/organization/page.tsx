"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RefreshCw,
  Globe,
  Server,
  LayoutGrid,
  Lock,
  Unlock,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizations } from "@/lib/mdc/hooks";
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

function uniqueUserCount(roles: Organization["organizationUserRoles"]) {
  if (!roles?.length) return 0;
  return new Set(roles.map((r) => r.userId)).size;
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

function ExpandedPanel({ org }: { org: Organization }) {
  const router = useRouter();
  const sites = org.sites ?? [];
  const workspaces = org.workspaces ?? [];
  const grouped = groupByUser(org.organizationUserRoles);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-1">

      {/* Sites */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Sites ({sites.length})
          </span>
        </div>
        {sites.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sites linked</p>
        ) : (
          <div className="flex flex-col gap-1">
            {sites.map((site) => {
              const nodes = site.siteNodes ?? site.nodes ?? [];
              return (
                <button
                  key={site.id}
                  className="flex items-center justify-between text-left rounded-md px-3 py-1.5 text-sm bg-background border hover:bg-accent hover:text-accent-foreground transition-colors group"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/infrastructure/sites/${site.id}`);
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{site.name}</p>
                    {nodes.length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Server className="h-2.5 w-2.5" />{nodes.length} node{nodes.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-accent-foreground shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Workspaces */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Workspaces ({workspaces.length})
          </span>
        </div>
        {workspaces.length === 0 ? (
          <p className="text-xs text-muted-foreground">No workspaces</p>
        ) : (
          <div className="flex flex-col gap-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                className="flex items-center justify-between text-left rounded-md px-3 py-1.5 text-sm bg-background border hover:bg-accent hover:text-accent-foreground transition-colors group"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/infrastructure/workspaces/${ws.id}`);
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {ws.locked
                    ? <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                    : <Unlock className="h-3 w-3 text-muted-foreground shrink-0" />}
                  <span className="font-medium truncate">{ws.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {ws.virtualMachines && ws.virtualMachines.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {ws.virtualMachines.length} VM{ws.virtualMachines.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-accent-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Members */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Members ({grouped.length})
          </span>
        </div>
        {grouped.length === 0 ? (
          <p className="text-xs text-muted-foreground">No members assigned</p>
        ) : (
          <div className="flex flex-col gap-1">
            {grouped.map(({ userId, roles }) => (
              <button
                key={userId}
                className="flex items-center justify-between text-left rounded-md px-3 py-1.5 text-sm bg-background border hover:bg-accent hover:text-accent-foreground transition-colors group"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/settings/users/${userId}`);
                }}
              >
                <span className="text-xs font-mono text-muted-foreground truncate">{userId}</span>
                <div className="flex gap-1 flex-wrap justify-end shrink-0 ml-2">
                  {roles.map((r) => <RoleBadge key={r} role={r} />)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default function OrganizationPage() {
  const router = useRouter();
  const { data: organizations, isLoading, isError, refetch, isFetching } = useOrganizations();
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  const toggleExpand = (orgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId);
      else next.add(orgId);
      return next;
    });
  };

  const totalSites = organizations
    ? new Set(organizations.flatMap((o) => (o.sites ?? []).map((s) => s.id))).size
    : 0;
  const totalWorkspaces = organizations
    ? organizations.reduce((acc, o) => acc + (o.workspaces?.length ?? 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            {organizations
              ? `${organizations.length} organization${organizations.length !== 1 ? "s" : ""} registered`
              : "All organizations registered in the MDC platform"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {!isLoading && !isError && organizations && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations.length}</div>
              <p className="text-xs text-muted-foreground">Total registered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {organizations.filter((o) => o.active).length}
              </div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sites</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSites}</div>
              <p className="text-xs text-muted-foreground">Unique sites linked</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWorkspaces}</div>
              <p className="text-xs text-muted-foreground">Across all orgs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
          <CardDescription>Click a row to view details · Click expand to see sites, workspaces &amp; members</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load organizations.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : !organizations || organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Building2 className="h-10 w-10 opacity-40" />
              <p>No organizations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Sites</TableHead>
                  <TableHead>Workspaces</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => {
                  const isExpanded = expandedOrgs.has(org.id);
                  const sites = org.sites ?? [];
                  const workspaces = org.workspaces ?? [];
                  const memberCount = uniqueUserCount(org.organizationUserRoles);
                  const hasExpandable = sites.length > 0 || workspaces.length > 0 || memberCount > 0;

                  return (
                    <React.Fragment key={org.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/settings/organization/${org.id}`)}
                      >
                        {/* Expand toggle */}
                        <TableCell className="pr-0">
                          {hasExpandable && (
                            <button
                              className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted text-muted-foreground"
                              onClick={(e) => toggleExpand(org.id, e)}
                              title={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded
                                ? <ChevronUp className="h-3.5 w-3.5" />
                                : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </TableCell>

                        {/* Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{org.name}</div>
                              {org.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">{org.description}</div>
                              )}
                              <div className="text-xs text-muted-foreground font-mono">{org.id}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {org.active ? (
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-red-500 border-red-300">
                              <XCircle className="h-3 w-3" /> Inactive
                            </Badge>
                          )}
                        </TableCell>

                        {/* Members */}
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            {memberCount === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : memberCount}
                          </span>
                        </TableCell>

                        {/* Sites */}
                        <TableCell>
                          {sites.length === 0 ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <div className="flex gap-1 flex-wrap">
                              {sites.slice(0, 2).map((s) => (
                                <Badge
                                  key={s.id}
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-secondary/80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/dashboard/infrastructure/sites/${s.id}`);
                                  }}
                                >
                                  {s.name}
                                </Badge>
                              ))}
                              {sites.length > 2 && (
                                <Badge variant="outline" className="text-xs">+{sites.length - 2}</Badge>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* Workspaces */}
                        <TableCell>
                          {workspaces.length === 0 ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <span className="text-sm font-medium">{workspaces.length}</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded row */}
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={5} className="py-3 px-4">
                            <ExpandedPanel org={org} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
