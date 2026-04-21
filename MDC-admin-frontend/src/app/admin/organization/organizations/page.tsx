"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  RefreshCw,
  Loader2,
  AlertCircle,
  Trash2,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  UserRoundCheck,
  UserRoundX,
  LayoutGrid,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useOrganizationsPage,
  useOrganization,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useCreateWorkspace,
  useSites,
  useUsers,
  useMDCClient,
} from "@/lib/mdc/hooks";
import type {
  Organization,
  OrganizationUpdateDescriptor,
} from "@/lib/mdc/types";

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const ORG_ROLES = ["Admin", "User"] as const;

// ─── Details Dialog Sub-component ────────────────────────────────────────────
// Rendered as its own component so useOrganization hook only fires when
// the dialog is open (orgId !== null) — triggering GET /odata/Organizations({id}).
function OrgDetailsDialog({
  orgId,
  onClose,
}: {
  orgId: string | null;
  onClose: () => void;
}) {
  const { data: org, isLoading, isError, refetch } = useOrganization(orgId ?? "", {
    enabled: !!orgId,
  });
  const { data: users = [] } = useUsers({}, { enabled: !!orgId });
  const userMap = useMemo(
    () => new Map(users.map((u) => [u.id, u.displayName])),
    [users]
  );

  return (
    <Dialog open={!!orgId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Organization Details</DialogTitle>
          <DialogDescription>
            {isLoading ? "Fetching details…" : org?.name ?? ""}
          </DialogDescription>
        </DialogHeader>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-8 text-sm text-destructive">
            <AlertCircle className="h-6 w-6" />
            <p>Failed to load organization details.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Content */}
        {org && !isLoading && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{org.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={org.active ? "default" : "secondary"}>
                  {org.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">ID</p>
                <p className="font-mono text-xs break-all">{org.id}</p>
              </div>
              {org.description && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Description</p>
                  <p>{org.description}</p>
                </div>
              )}
            </div>

            {/* Members */}
            <div>
              <p className="text-muted-foreground mb-2 font-medium">
                Members ({org.organizationUserRoles?.length ?? 0})
              </p>
              {org.organizationUserRoles && org.organizationUserRoles.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto rounded-md border p-1">
                  {org.organizationUserRoles.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded px-3 py-2 hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-xs">{userMap.get(r.userId) || r.userName || r.userId.slice(0, 8)}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {r.userId.slice(0, 8)}…
                        </p>
                      </div>
                      <Badge variant="outline">{r.role}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">No members</p>
              )}
            </div>

            {/* Sites */}
            <div>
              <p className="text-muted-foreground mb-2 font-medium">
                Sites ({org.sites?.length ?? org.siteIds?.length ?? 0})
              </p>
              {org.sites && org.sites.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto rounded-md border p-1">
                  {org.sites.map((site) => (
                    <div key={site.id} className="flex items-center justify-between rounded px-3 py-2 hover:bg-muted/50">
                      <div>
                        <p className="font-medium text-xs">{site.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{site.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : org.siteIds && org.siteIds.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto rounded-md border p-1">
                  {org.siteIds.map((id) => (
                    <div key={id} className="rounded px-3 py-2 hover:bg-muted/50">
                      <span className="font-mono text-xs">{id}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">No sites assigned</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Form State ────────────────────────────────────────────────────────
interface CreateFormState {
  name: string;
  description: string;
  sites: string[];
  users: { role: string; userId: string }[];
}

const emptyCreateForm = (): CreateFormState => ({ name: "", description: "", sites: [], users: [{ role: "", userId: "" }] });

// ─── Workspace Create Form State ─────────────────────────────────────────────
interface WorkspaceCreateFormState {
  name: string;
  description: string;
  siteId: string;
}

const emptyWorkspaceForm = (): WorkspaceCreateFormState => ({ name: "", description: "", siteId: "" });

// ─── Edit Form State ──────────────────────────────────────────────────────────
interface EditFormState {
  name: string;
  description: string;
  sites: string[];
  users: { role: string; userId: string }[];
}

export default function OrganizationsPage() {
  const { toast } = useToast();

  // ── Pagination / search / sort state ──────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // committed on enter / debounce
  const [orderby, setOrderby] = useState("name asc");

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm());

  const [detailsOrgId, setDetailsOrgId] = useState<string | null>(null);

  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ name: "", description: "", sites: [], users: [] });

  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);

  const [workspaceOrg, setWorkspaceOrg] = useState<Organization | null>(null);
  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceCreateFormState>(emptyWorkspaceForm());

  // ── Data ──────────────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useOrganizationsPage({ page, pageSize, search, orderby });

  const mdcClient = useMDCClient();
  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();
  const deleteMutation = useDeleteOrganization();
  const createWorkspaceMutation = useCreateWorkspace();

  // Fetch sites & users for create/edit dialogs
  const anyFormOpen = createOpen || !!editOrg || !!workspaceOrg;
  const { data: allSites = [], isLoading: sitesLoading } = useSites({ enabled: anyFormOpen });
  const { data: allUsers = [], isLoading: usersLoading } = useUsers({}, { enabled: anyFormOpen });

  const organizations = useMemo(() => data?.value ?? [], [data]);
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // ── Stats derived from current page (full count from OData $count) ────────
  const activeCount = useMemo(
    () => organizations.filter((o) => o.active).length,
    [organizations]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const commitSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleCreateSave = async () => {
    if (!createForm.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        organizationUserRoles: createForm.users.filter((u) => u.userId && u.role),
        siteIds: createForm.sites,
      });
      toast({ title: "Organization Created", description: `"${createForm.name}" has been created` });
      setCreateOpen(false);
      setCreateForm(emptyCreateForm());
      setPage(1);
    } catch (err) {
      toast({
        title: "Create Failed",
        description: err instanceof Error ? err.message : "Failed to create organization",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = async (org: Organization) => {
    // Fetch fresh data from detail endpoint to ensure accurate diff baseline
    let fresh: Organization;
    try {
      fresh = await mdcClient.getOrganization(org.id);
    } catch {
      toast({ title: "Error", description: "Failed to load organization details", variant: "destructive" });
      return;
    }
    // Deduplicate roles by userId:role key
    const seen = new Set<string>();
    const dedupedRoles = (fresh.organizationUserRoles ?? []).filter((r) => {
      const key = `${r.userId}:${r.role}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const dedupedOrg = { ...fresh, organizationUserRoles: dedupedRoles };
    setEditOrg(dedupedOrg);
    setEditForm({
      name: fresh.name,
      description: fresh.description ?? "",
      sites: fresh.siteIds ?? fresh.sites?.map((s) => s.id) ?? [],
      users: dedupedRoles.length
        ? dedupedRoles.map((r) => ({ role: r.role, userId: r.userId }))
        : [{ role: "", userId: "" }],
    });
  };

  const handleEditSave = async () => {
    if (!editOrg) return;
    if (!editForm.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required", variant: "destructive" });
      return;
    }

    // Sites diff
    const origSiteIds = editOrg.siteIds ?? editOrg.sites?.map((s) => s.id) ?? [];
    const origSites = new Set(origSiteIds);
    const newSites = new Set(editForm.sites);
    const addSiteIds = editForm.sites.filter((id) => !origSites.has(id));
    const removeSiteIds = origSiteIds.filter((id) => !newSites.has(id));

    // User-role diff (keyed by userId:role)
    const origRoleKeys = new Set(
      (editOrg.organizationUserRoles ?? []).map((r) => `${r.userId}:${r.role}`)
    );
    const validUsers = editForm.users.filter((u) => u.userId && u.role);
    const newRoleKeys = new Set(validUsers.map((u) => `${u.userId}:${u.role}`));
    const addRoles = validUsers.filter((u) => !origRoleKeys.has(`${u.userId}:${u.role}`));
    const removeRoles = (editOrg.organizationUserRoles ?? [])
      .filter((r) => !newRoleKeys.has(`${r.userId}:${r.role}`))
      .map((r) => ({ userId: r.userId, role: r.role }));

    const descriptor: OrganizationUpdateDescriptor = {
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      addOrganizationUserRoles: addRoles,
      removeOrganizationUserRoles: removeRoles,
      addSiteIds,
      removeSiteIds,
    };

    try {
      await updateMutation.mutateAsync({ id: editOrg.id, descriptor });
      toast({ title: "Organization Updated", description: `"${editOrg.name}" has been updated` });
      setEditOrg(null);
    } catch (err) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update organization",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Organization Deleted", description: `"${deleteTarget.name}" has been deleted` });
      setDeleteTarget(null);
      if (organizations.length === 1 && page > 1) setPage((p) => p - 1);
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: err instanceof Error ? err.message : "Failed to delete organization",
        variant: "destructive",
      });
    }
  };

  const openWorkspaceDialog = async (org: Organization) => {
    let fresh: Organization;
    try {
      fresh = await mdcClient.getOrganization(org.id);
    } catch {
      toast({ title: "Error", description: "Failed to load organization details", variant: "destructive" });
      return;
    }
    setWorkspaceOrg(fresh);
    setWorkspaceForm(emptyWorkspaceForm());
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceOrg) return;
    if (!workspaceForm.name.trim()) {
      toast({ title: "Validation Error", description: "Workspace name is required", variant: "destructive" });
      return;
    }
    if (!workspaceForm.siteId) {
      toast({ title: "Validation Error", description: "Please select a site", variant: "destructive" });
      return;
    }
    try {
      await createWorkspaceMutation.mutateAsync({
        siteId: workspaceForm.siteId,
        organizationId: workspaceOrg.id,
        descriptor: {
          name: workspaceForm.name.trim(),
          description: workspaceForm.description.trim() || undefined,
        },
      });
      toast({ title: "Workspace Created", description: `"${workspaceForm.name}" has been created for ${workspaceOrg.name}` });
      setWorkspaceOrg(null);
      setWorkspaceForm(emptyWorkspaceForm());
    } catch (err) {
      toast({
        title: "Create Workspace Failed",
        description: err instanceof Error ? err.message : "Failed to create workspace",
        variant: "destructive",
      });
    }
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Failed to Load Organizations
            </CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "An error occurred while loading organizations"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage organizations, members, and site assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => { setCreateForm(emptyCreateForm()); setCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">on this page</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations.length - activeCount}</div>
            <p className="text-xs text-muted-foreground">on this page</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Table Card ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitSearch()}
                className="pl-8"
              />
            </div>
            {/* Sort */}
            <Select
              value={orderby}
              onValueChange={(v) => { setOrderby(v); setPage(1); }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name asc">Name A→Z</SelectItem>
                <SelectItem value="name desc">Name Z→A</SelectItem>
              </SelectContent>
            </Select>
            {/* Page size */}
            <Select
              value={String(pageSize)}
              onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? `No organizations matching "${search}"` : "No organizations found"}
              </p>
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Sites</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {org.id.slice(0, 8)}…
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {org.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.active ? "default" : "secondary"}>
                          {org.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {org.organizationUserRoles?.length ?? 0}
                      </TableCell>
                      <TableCell className="text-sm">
                        {org.sites?.length ?? org.siteIds?.length ?? 0}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setDetailsOrgId(org.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEditDialog(org)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openWorkspaceDialog(org)}>
                              <LayoutGrid className="mr-2 h-4 w-4" />
                              Create Workspace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => setDeleteTarget(org)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* ── Pagination ── */}
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  Showing {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, totalCount)} of {totalCount}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isFetching}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ════ Create Organization Dialog ════ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization. You can add members and sites after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="create-name"
                placeholder="e.g. Acme Corp"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Input
                id="create-description"
                placeholder="Optional description"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {/* Sites multi-select */}
            <div className="space-y-2">
              <Label>Sites</Label>
              <Select
                value=""
                onValueChange={(siteId) => {
                  if (!createForm.sites.includes(siteId)) {
                    setCreateForm((f) => ({ ...f, sites: [...f.sites, siteId] }));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={sitesLoading ? "Loading sites…" : "Select sites to assign"} />
                </SelectTrigger>
                <SelectContent>
                  {allSites
                    .filter((s) => !createForm.sites.includes(s.id))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  {allSites.length > 0 && allSites.every((s) => createForm.sites.includes(s.id)) && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">All sites selected</p>
                  )}
                </SelectContent>
              </Select>
              {createForm.sites.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {createForm.sites.map((siteId) => {
                    const site = allSites.find((s) => s.id === siteId);
                    return (
                      <Badge key={siteId} variant="secondary" className="gap-1">
                        {site?.name ?? siteId.slice(0, 8)}
                        <button
                          type="button"
                          className="ml-1 hover:text-destructive"
                          onClick={() => setCreateForm((f) => ({ ...f, sites: f.sites.filter((id) => id !== siteId) }))}
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Users multi-select with role */}
            <div className="space-y-2">
              <Label>Users</Label>
              {createForm.users.map((entry, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select
                    value={entry.userId}
                    onValueChange={(userId) => {
                      setCreateForm((f) => {
                        const users = [...f.users] as typeof f.users;
                        users[idx] = { ...users[idx], userId };
                        return { ...f, users };
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={usersLoading ? "Loading…" : "Select user"} />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2 text-left">
                            {u.isRegistered ? (
                              <UserRoundCheck className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <UserRoundX className="h-4 w-4 text-orange-500 shrink-0" />
                            )}
                            <div className="flex flex-col">
                              <span>{u.displayName}</span>
                              <span className="text-xs text-muted-foreground font-mono">{u.id}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={entry.role}
                    onValueChange={(role) => {
                      setCreateForm((f) => {
                        const users = [...f.users] as typeof f.users;
                        users[idx] = { ...users[idx], role };
                        return { ...f, users };
                      });
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {createForm.users.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setCreateForm((f) => ({
                        ...f,
                        users: f.users.filter((_, i) => i !== idx) as typeof f.users,
                      }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateForm((f) => ({
                  ...f,
                  users: [...f.users, { role: "", userId: "" }] as typeof f.users,
                }))}
              >
                <Plus className="mr-1 h-3 w-3" /> Add User
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSave} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ View Details Dialog ════ */}
      <OrgDetailsDialog
        orgId={detailsOrgId}
        onClose={() => setDetailsOrgId(null)}
      />

      {/* ════ Edit Organization Dialog ════ */}
      <Dialog
        open={!!editOrg}
        onOpenChange={(open) => !open && setEditOrg(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update details for {editOrg?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {/* Sites multi-select */}
            <div className="space-y-2">
              <Label>Sites</Label>
              <Select
                value=""
                onValueChange={(siteId) => {
                  if (!editForm.sites.includes(siteId)) {
                    setEditForm((f) => ({ ...f, sites: [...f.sites, siteId] }));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={sitesLoading ? "Loading sites…" : "Select sites to assign"} />
                </SelectTrigger>
                <SelectContent>
                  {allSites
                    .filter((s) => !editForm.sites.includes(s.id))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  {allSites.length > 0 && allSites.every((s) => editForm.sites.includes(s.id)) && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">All sites selected</p>
                  )}
                </SelectContent>
              </Select>
              {editForm.sites.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {editForm.sites.map((siteId) => {
                    const site = allSites.find((s) => s.id === siteId);
                    return (
                      <Badge key={siteId} variant="secondary" className="gap-1">
                        {site?.name ?? siteId.slice(0, 8)}
                        <button
                          type="button"
                          className="ml-1 hover:text-destructive"
                          onClick={() => setEditForm((f) => ({ ...f, sites: f.sites.filter((id) => id !== siteId) }))}
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Users with roles */}
            <div className="space-y-2">
              <Label>Users</Label>
              {editForm.users.map((entry, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select
                    value={entry.userId}
                    onValueChange={(userId) => {
                      setEditForm((f) => {
                        const users = [...f.users];
                        users[idx] = { ...users[idx], userId };
                        return { ...f, users };
                      });
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={usersLoading ? "Loading…" : "Select user"} />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2 text-left">
                            {u.isRegistered ? (
                              <UserRoundCheck className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <UserRoundX className="h-4 w-4 text-orange-500 shrink-0" />
                            )}
                            <div className="flex flex-col">
                              <span>{u.displayName}</span>
                              <span className="text-xs text-muted-foreground font-mono">{u.id}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={entry.role}
                    onValueChange={(role) => {
                      setEditForm((f) => {
                        const users = [...f.users];
                        users[idx] = { ...users[idx], role };
                        return { ...f, users };
                      });
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editForm.users.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setEditForm((f) => ({
                        ...f,
                        users: f.users.filter((_, i) => i !== idx),
                      }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditForm((f) => ({
                  ...f,
                  users: [...f.users, { role: "", userId: "" }],
                }))}
              >
                <Plus className="mr-1 h-3 w-3" /> Add User
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrg(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ Create Workspace Dialog ════ */}
      <Dialog
        open={!!workspaceOrg}
        onOpenChange={(open) => {
          if (!open) {
            setWorkspaceOrg(null);
            setWorkspaceForm(emptyWorkspaceForm());
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace for <strong>{workspaceOrg?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="ws-name"
                placeholder="e.g. Development Workspace"
                value={workspaceForm.name}
                onChange={(e) => setWorkspaceForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-description">Description</Label>
              <Input
                id="ws-description"
                placeholder="Optional description"
                value={workspaceForm.description}
                onChange={(e) => setWorkspaceForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Site <span className="text-destructive">*</span></Label>
              <Select
                value={workspaceForm.siteId}
                onValueChange={(siteId) => setWorkspaceForm((f) => ({ ...f, siteId }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={sitesLoading ? "Loading sites…" : "Select a site"} />
                </SelectTrigger>
                <SelectContent>
                  {(workspaceOrg?.sites && workspaceOrg.sites.length > 0
                    ? workspaceOrg.sites
                    : allSites.filter((s) =>
                        workspaceOrg?.siteIds?.includes(s.id)
                      )
                  ).map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                  {(() => {
                    const orgSites = workspaceOrg?.sites ?? [];
                    const orgSiteIds = workspaceOrg?.siteIds ?? [];
                    if (orgSites.length === 0 && orgSiteIds.length === 0) {
                      return (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                          No sites assigned to this organization
                        </p>
                      );
                    }
                    return null;
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWorkspaceOrg(null); setWorkspaceForm(emptyWorkspaceForm()); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={createWorkspaceMutation.isPending}>
              {createWorkspaceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ Delete Confirmation ════ */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
              All members will lose access to this organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
