"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Server,
  Building2,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Lock,
  Unlock,
  Cpu,
  MemoryStick,
  HardDrive,
  Hash,
  MonitorCheck,
} from "lucide-react";
import { useSitesQuery, SitesQueryParams } from "@/lib/mdc/hooks";
import { Site } from "@/lib/mdc/types";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

type SortField = "name" | "description";
type SortDir = "asc" | "desc";

function SortIcon({ field, current, dir }: { field: SortField; current: SortField | null; dir: SortDir }) {
  if (current !== field) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
  return dir === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 text-foreground" />
    : <ArrowDown className="h-3 w-3 ml-1 text-foreground" />;
}

function nodeStats(site: Site) {
  const nodes = site.siteNodes || site.nodes || [];
  return {
    total: nodes.length,
    online: nodes.filter((n) => n.online).length,
  };
}

function fmtBytes(bytes?: number): string {
  if (bytes == null) return "N/A";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${bytes} B`;
}

export default function SitesPage() {
  const router = useRouter();

  // ── OData query params ────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Search / filter bar
  const [searchInput, setSearchInput] = useState("");
  const [filterField, setFilterField] = useState<"name" | "description">("name");
  const [activeFilter, setActiveFilter] = useState("");

  // Expanded rows: Set of site IDs
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());

  const queryParams = useMemo<SitesQueryParams>(() => ({
    top: pageSize,
    skip: (page - 1) * pageSize,
    count: true,
    ...(sortField ? { orderby: `${sortField} ${sortDir}` } : {}),
    ...(activeFilter ? { filter: `contains(${filterField}, '${activeFilter.replace(/'/g, "''")}')` } : {}),
  }), [page, pageSize, sortField, sortDir, activeFilter, filterField]);

  const { data, isLoading, isError, error, refetch, isFetching } = useSitesQuery(queryParams);

  const sites = data?.value ?? [];
  const totalCount = data?.count;
  const totalPages = totalCount != null ? Math.ceil(totalCount / pageSize) : null;

  // Aggregate stats from current page (best-effort; full count comes from API)
  const stats = useMemo(() => {
    const allNodes = sites.flatMap((s) => s.siteNodes || s.nodes || []);
    return {
      total: sites.length,
      totalNodes: allNodes.length,
      online: allNodes.filter((n) => n.online).length,
      offline: allNodes.filter((n) => !n.online).length,
    };
  }, [sites]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const applySearch = () => {
    setActiveFilter(searchInput.trim());
    setPage(1);
  };

  const clearFilter = () => {
    setSearchInput("");
    setActiveFilter("");
    setPage(1);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const changePageSize = (val: string) => {
    setPageSize(Number(val));
    setPage(1);
  };

  const toggleExpand = (siteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sites</h1>
          <p className="text-muted-foreground">
            {totalCount != null
              ? `${totalCount} site${totalCount !== 1 ? "s" : ""} · ${stats.online} node${stats.online !== 1 ? "s" : ""} online`
              : "Infrastructure locations"}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Summary cards — only shown when data loaded */}
      {!isLoading && !isError && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount ?? sites.length}</div>
              <p className="text-xs text-muted-foreground">Infrastructure locations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalNodes}</div>
              <p className="text-xs text-muted-foreground">Across this page</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.online}</div>
              <p className="text-xs text-muted-foreground">Healthy nodes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offline</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.offline}</div>
              <p className="text-xs text-muted-foreground">Unavailable nodes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sites table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>All Sites</CardTitle>
              <CardDescription>Click a row to view site details · Click expand to see workspaces &amp; organizations</CardDescription>
            </div>

            {/* OData filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground sr-only">Filter by</Label>
                <Select value={filterField} onValueChange={(v) => setFilterField(v as "name" | "description")}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="description">Description</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  className="h-8 w-48 text-xs"
                  placeholder={`Filter by ${filterField}...`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                />
                <Button size="sm" className="h-8 px-3" onClick={applySearch}>
                  <Search className="h-3.5 w-3.5" />
                </Button>
                {activeFilter && (
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={clearFilter}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Active filter badge */}
          {activeFilter && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Active filter:</span>
              <Badge variant="secondary" className="text-xs gap-1">
                {filterField} contains &ldquo;{activeFilter}&rdquo;
                <button onClick={clearFilter} className="ml-1 hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Failed to load sites"}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Building2 className="h-10 w-10 opacity-40" />
              <p>{activeFilter ? `No sites match "${activeFilter}"` : "No sites available"}</p>
              {activeFilter && <Button variant="outline" size="sm" onClick={clearFilter}>Clear filter</Button>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium hover:text-foreground"
                      onClick={() => toggleSort("name")}
                    >
                      Name <SortIcon field="name" current={sortField} dir={sortDir} />
                    </button>
                  </TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Organizations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Serial Numbers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => {
                  const ns = nodeStats(site);
                  const nodes = site.siteNodes || site.nodes || [];
                  const workspaces = site.workspaces || [];
                  const orgs = site.organizations || [];
                  const serials = nodes
                    .map((n) => n.serialNumber)
                    .filter(Boolean) as string[];
                  const isExpanded = expandedSites.has(site.id);
                  const hasExpandable = workspaces.length > 0 || orgs.length > 0 || nodes.length > 0;

                  return (
                    <React.Fragment key={site.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/infrastructure/sites/${site.id}`)}
                      >
                        {/* Expand toggle */}
                        <TableCell className="pr-0">
                          {hasExpandable ? (
                            <button
                              className="flex items-center justify-center h-6 w-6 rounded hover:bg-muted text-muted-foreground"
                              onClick={(e) => toggleExpand(site.id, e)}
                              title={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded
                                ? <ChevronUp className="h-3.5 w-3.5" />
                                : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{site.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{site.id}</div>
                        </TableCell>
                        <TableCell>
                          {ns.total === 0 ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <span className="text-sm">
                              <span className="text-green-600 font-medium">{ns.online}</span>
                              <span className="text-muted-foreground"> / {ns.total} online</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {workspaces.length === 0 ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <span className="text-sm font-medium">{workspaces.length}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {orgs.length === 0 ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <div className="flex gap-1 flex-wrap">
                              {orgs.slice(0, 2).map((org) => (
                                <Badge
                                  key={org.id}
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-secondary/80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/dashboard/settings/organization/${org.id}`);
                                  }}
                                >
                                  {org.name}
                                </Badge>
                              ))}
                              {orgs.length > 2 && (
                                <Badge variant="outline" className="text-xs">+{orgs.length - 2}</Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {ns.online > 0 ? (
                            <Badge className="bg-green-600 hover:bg-green-600">Online</Badge>
                          ) : ns.total > 0 ? (
                            <Badge variant="destructive">Offline</Badge>
                          ) : (
                            <Badge variant="secondary">No nodes</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {serials.length === 0 ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {serials.map((s) => (
                                <span key={s} className="font-mono text-xs">{s}</span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={6} className="py-3 px-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                              {/* Site Nodes panel */}
                              <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Server className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Site Nodes ({nodes.length})
                                  </span>
                                </div>
                                {nodes.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No nodes</p>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    {nodes.map((node) => {
                                      const cpuPct = node.cpu != null ? Math.round(node.cpu * 100) : null;
                                      const memPct = node.memory?.used != null && node.memory?.total
                                        ? Math.round((node.memory.used / node.memory.total) * 100)
                                        : null;
                                      return (
                                        <div
                                          key={node.id || node.name}
                                          className="rounded-md px-3 py-2 text-sm bg-background border space-y-1.5"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-xs font-mono truncate">{node.name}</span>
                                            <Badge
                                              className={`text-[10px] px-1.5 py-0 ${node.online ? "bg-green-600 hover:bg-green-600" : ""}`}
                                              variant={node.online ? "default" : "destructive"}
                                            >
                                              {node.online ? "Online" : "Offline"}
                                            </Badge>
                                          </div>
                                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                            {node.serialNumber && (
                                              <span className="flex items-center gap-1 truncate">
                                                <Hash className="h-2.5 w-2.5 shrink-0" />{node.serialNumber}
                                              </span>
                                            )}
                                            {node.hostName && (
                                              <span className="flex items-center gap-1 truncate">
                                                <MonitorCheck className="h-2.5 w-2.5 shrink-0" />{node.hostName.length > 12 ? node.hostName.slice(0, 12) + "…" : node.hostName}
                                              </span>
                                            )}
                                            {node.cpuInfo && (
                                              <span className="flex items-center gap-1 col-span-2 truncate">
                                                <Cpu className="h-2.5 w-2.5 shrink-0" />{node.cpuInfo.cores}C/{node.cpuInfo.cpUs}T
                                                {cpuPct != null && <span className="ml-auto font-medium text-foreground">{cpuPct}%</span>}
                                              </span>
                                            )}
                                            {node.memory && (
                                              <span className="flex items-center gap-1 col-span-2">
                                                <MemoryStick className="h-2.5 w-2.5 shrink-0" />{fmtBytes(node.memory.used)} / {fmtBytes(node.memory.total)}
                                                {memPct != null && <span className="ml-auto font-medium text-foreground">{memPct}%</span>}
                                              </span>
                                            )}
                                            {node.storage?.maxDisk != null && (
                                              <span className="flex items-center gap-1 col-span-2">
                                                <HardDrive className="h-2.5 w-2.5 shrink-0" />{fmtBytes(node.storage.disk)} / {fmtBytes(node.storage.maxDisk)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Workspaces panel */}
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

                              {/* Organizations panel */}
                              <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Organizations ({orgs.length})
                                  </span>
                                </div>
                                {orgs.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No organizations</p>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    {orgs.map((org) => (
                                      <button
                                        key={org.id}
                                        className="flex items-center justify-between text-left rounded-md px-3 py-1.5 text-sm bg-background border hover:bg-accent hover:text-accent-foreground transition-colors group"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(`/dashboard/settings/organization/${org.id}`);
                                        }}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className={`h-2 w-2 rounded-full shrink-0 ${org.active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                                          <span className="font-medium truncate">{org.name}</span>
                                          {!org.active && (
                                            <Badge variant="outline" className="text-xs py-0 h-4">Inactive</Badge>
                                          )}
                                        </div>
                                        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-accent-foreground shrink-0 ml-2" />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!isLoading && !isError && sites.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page</span>
                <Select value={String(pageSize)} onValueChange={changePageSize}>
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-sm">
                {totalCount != null && (
                  <span className="text-muted-foreground">
                    {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground text-xs">
                  Page {page}{totalPages != null ? ` / ${totalPages}` : ""}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={(totalPages != null && page >= totalPages) || isFetching || sites.length < pageSize}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
