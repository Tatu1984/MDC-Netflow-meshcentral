"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  User,
  Building2,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityLogs } from "@/lib/mdc/hooks";
import { ActivityLog } from "@/lib/mdc/types";

const PAGE_SIZE = 10;

const ALL_ENTITIES = "__all__";

const ENTITY_FILTERS = [
  { label: "All Entities", value: ALL_ENTITIES },
  { label: "Workspace", value: "DbWorkspace" },
  { label: "Virtual Network", value: "DbVirtualNetwork" },
  { label: "Site", value: "DbSite" },
  { label: "Organization", value: "DbOrganization" },
  { label: "User", value: "DbUser" },
  { label: "Remote Network", value: "DbRemoteNetwork" },
];

const ORDER_OPTIONS = [
  { label: "Newest First", value: "timestampUtc desc" },
  { label: "Oldest First", value: "timestampUtc asc" },
];

const SEARCH_FIELDS: { label: string; value: string; isGuid?: boolean }[] = [
  { label: "Entity Name", value: "entityName" },
  { label: "Entity ID",   value: "entityId",  isGuid: true },
  { label: "Action",      value: "action" },
  { label: "User ID",     value: "userId",    isGuid: true },
];

const ACTION_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  Added:    { label: "Added",    variant: "default",     icon: <Plus    className="h-3 w-3" /> },
  Modified: { label: "Modified", variant: "secondary",   icon: <Pencil  className="h-3 w-3" /> },
  Deleted:  { label: "Deleted",  variant: "destructive", icon: <Trash2  className="h-3 w-3" /> },
};

function parseChanges(changesJson: string): Record<string, { Old?: unknown; New?: unknown }> {
  try { return JSON.parse(changesJson); } catch { return {}; }
}

function EntityBadge({ name }: { name: string }) {
  return (
    <Badge variant="outline" className="font-mono text-xs">
      {name.replace(/^Db/, "")}
    </Badge>
  );
}

function ActionBadge({ action }: { action: string }) {
  const config = ACTION_CONFIG[action] ?? { label: action, variant: "outline" as const, icon: null };
  return (
    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
      {config.icon}
      {config.label}
    </Badge>
  );
}

function UserCell({ log, onNavigate }: { log: ActivityLog; onNavigate: (path: string) => void }) {
  const user = log.user;
  if (!user) {
    return (
      <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px] block">
        {log.userId}
      </span>
    );
  }

  return (
    <div className="space-y-0.5 min-w-0">
      {/* Name — clickable → user detail */}
      <button
        className="flex items-center gap-1 text-xs font-medium hover:underline text-foreground truncate max-w-[200px]"
        onClick={(e) => { e.stopPropagation(); onNavigate(`/dashboard/settings/users/${user.id}`); }}
      >
        <User className="h-3 w-3 shrink-0 text-muted-foreground" />
        {user.displayName ?? user.id}
      </button>
      {/* Email */}
      {user.emailAddress && (
        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user.emailAddress}</p>
      )}
      {/* App roles */}
      {user.appRoles && user.appRoles.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {user.appRoles.map((r) => (
            <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{r}</Badge>
          ))}
        </div>
      )}
      {/* Org roles — each clickable → org detail */}
      {user.organizationRoles && user.organizationRoles.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {user.organizationRoles.map((or) => (
            <button
              key={or.organizationId}
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0 h-4 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); onNavigate(`/dashboard/settings/organization/${or.organizationId}`); }}
              title={or.organizationId}
            >
              <Building2 className="h-2.5 w-2.5 shrink-0" />
              {or.role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChangesRow({ log, onNavigate }: { log: ActivityLog; onNavigate: (path: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const changes = useMemo(() => parseChanges(log.changesJson), [log.changesJson]);
  const keys = Object.keys(changes);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50 align-top"
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell className="w-8 pt-3">
          {expanded
            ? <ChevronDown  className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap pt-3">
          {new Date(log.timestampUtc).toLocaleString()}
        </TableCell>
        <TableCell className="pt-3"><EntityBadge name={log.entityName} /></TableCell>
        <TableCell className="pt-3"><ActionBadge action={log.action} /></TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate pt-3">
          {log.entityId}
        </TableCell>
        <TableCell className="pt-2 pb-2">
          <UserCell log={log} onNavigate={onNavigate} />
        </TableCell>
        <TableCell className="text-xs text-muted-foreground pt-3">
          {keys.length} field{keys.length !== 1 ? "s" : ""}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-0">
            <div className="px-6 py-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-left pb-1 pr-6 font-medium w-40">Field</th>
                    <th className="text-left pb-1 pr-6 font-medium">Old Value</th>
                    <th className="text-left pb-1 font-medium">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => {
                    const change = changes[key];
                    return (
                      <tr key={key} className="border-b last:border-0">
                        <td className="py-1 pr-6 font-mono font-medium">{key}</td>
                        <td className="py-1 pr-6 font-mono text-muted-foreground">
                          {"Old" in change ? String(change.Old ?? "null") : "—"}
                        </td>
                        <td className="py-1 font-mono">
                          {"New" in change ? String(change.New ?? "null") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function ActivityLogsPage() {
  const router = useRouter();
  const [page, setPage]               = useState(1);
  const [entityName, setEntityName]   = useState(ALL_ENTITIES);
  const [orderBy, setOrderBy]         = useState("timestampUtc desc");
  const [searchField, setSearchField] = useState(SEARCH_FIELDS[0].value);
  const [searchValue, setSearchValue] = useState("");
  const [appliedFilter, setAppliedFilter] = useState<{ field: string; value: string; isGuid?: boolean } | null>(null);
  const [jumpInput, setJumpInput]     = useState("");
  const jumpRef = useRef<HTMLInputElement>(null);

  // Build the $filter string: dropdown OR search, not both
  const activeFilter = useMemo(() => {
    if (entityName !== ALL_ENTITIES) return `entityName eq '${entityName}'`;
    if (appliedFilter) {
      const val = appliedFilter.isGuid
        ? appliedFilter.value
        : `'${appliedFilter.value}'`;
      return `${appliedFilter.field} eq ${val}`;
    }
    return undefined;
  }, [entityName, appliedFilter]);

  const params = useMemo(
    () => ({ page, pageSize: PAGE_SIZE, entityName: activeFilter, orderBy }),
    [page, activeFilter, orderBy]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useActivityLogs(params);

  const items      = data?.items      ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleEntityChange = (val: string) => {
    setEntityName(val);
    setSearchValue("");
    setAppliedFilter(null);
    setPage(1);
  };

  const handleOrderChange = (val: string) => { setOrderBy(val); setPage(1); };

  const handleSearchApply = () => {
    if (!searchValue.trim()) return;
    const fieldDef = SEARCH_FIELDS.find((f) => f.value === searchField);
    setEntityName(ALL_ENTITIES);
    setAppliedFilter({ field: searchField, value: searchValue.trim(), isGuid: fieldDef?.isGuid });
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearchValue("");
    setAppliedFilter(null);
    setPage(1);
  };

  const handleJumpToPage = () => {
    const n = parseInt(jumpInput);
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      setPage(n);
    }
    setJumpInput("");
    jumpRef.current?.blur();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Activity Logs</h1>
            <p className="text-sm text-muted-foreground">
              Audit trail of all entity changes across the platform
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>All Events</CardTitle>
              <CardDescription>
                {data
                  ? `Page ${page} of ${totalPages} — ${total} total events`
                  : "Loading..."}
              </CardDescription>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Field search */}
              <div className="flex items-center gap-1">
                <Select value={searchField} onValueChange={setSearchField}>
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCH_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Input
                    className="h-8 w-40 text-sm pr-7"
                    placeholder="Search value..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearchApply(); }}
                  />
                  {searchValue && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={handleSearchClear}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleSearchApply}
                  disabled={!searchValue.trim()}
                >
                  <Search className="h-3 w-3 mr-1" />
                  Search
                </Button>
              </div>

              {/* Entity dropdown filter */}
              <Select value={entityName} onValueChange={handleEntityChange}>
                <SelectTrigger className="h-8 w-44 text-sm">
                  <SelectValue placeholder="Filter by entity" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={orderBy} onValueChange={handleOrderChange}>
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter indicator */}
          {appliedFilter && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Active filter:</span>
              <Badge variant="secondary" className="text-xs font-mono flex items-center gap-1">
                {appliedFilter.field} eq &apos;{appliedFilter.value}&apos;
                <button onClick={handleSearchClear} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isError ? (
            <div className="p-6 text-sm text-destructive">
              Failed to load activity logs:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead className="whitespace-nowrap">Timestamp</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={7}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    : items.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                            No activity logs found.
                          </TableCell>
                        </TableRow>
                      )
                    : items.map((log) => (
                        <ChangesRow key={log.id} log={log} onNavigate={(path) => router.push(path)} />
                      ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t gap-4 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  Showing {items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + items.length} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-1">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isFetching}
                  >
                    Next
                    <ChevronDown className="h-4 w-4 ml-1 -rotate-90" />
                  </Button>

                  {/* Jump to page */}
                  <div className="flex items-center gap-1 ml-2 border-l pl-3">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Go to</span>
                    <Input
                      ref={jumpRef}
                      className="h-8 w-16 text-sm text-center"
                      type="number"
                      min={1}
                      max={totalPages}
                      placeholder="—"
                      value={jumpInput}
                      onChange={(e) => setJumpInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleJumpToPage(); }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={handleJumpToPage}
                      disabled={!jumpInput || isFetching}
                    >
                      Go
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
