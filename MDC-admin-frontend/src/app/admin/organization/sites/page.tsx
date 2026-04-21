"use client";

import { useState, useMemo } from "react";
import {
  Server,
  Plus,
  Search,
  MoreHorizontal,
  RefreshCw,
  Loader2,
  AlertCircle,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Download,
  X,
  Pencil,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  useSitesPage,
  useSite,
  useCreateSite,
  useUpdateSite,
  useDeleteSite,
  useRemoveSiteNode,
  useDownloadableTemplates,
  useDownloadTemplate,
  useOrganizations,
  useCreateWorkspace,
} from "@/lib/mdc/hooks";
import type {
  Site,
  SiteDescriptor,
  SiteNode,
  DownloadableTemplate,
} from "@/lib/mdc/types";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

// ─── Create Form ──────────────────────────────────────────────────────────────
interface CreateForm {
  memberAddress: string;
  serialNumber: string;
  machineId: string;
  registrationUserName: string;
  registrationPassword: string;
  description: string;
  validateServerCertificate: boolean;
  port: string;
  timeout: string;
  organizationIds: string[];
  importToOrganizationId: string;
  dataEgressOnMgmtNetwork: boolean;
}

const emptyCreate = (): CreateForm => ({
  memberAddress: "",
  serialNumber: "",
  machineId: "",
  registrationUserName: "",
  registrationPassword: "",
  description: "",
  validateServerCertificate: false,
  port: "",
  timeout: "",
  organizationIds: [],
  importToOrganizationId: "",
  dataEgressOnMgmtNetwork: false,
});

// ─── Details sub-component (fires GET /odata/Sites({id})) ────────────────────
function SiteDetailsDialog({
  siteId,
  onClose,
}: {
  siteId: string | null;
  onClose: () => void;
}) {
  const { data: site, isLoading, isError, refetch } = useSite(siteId ?? "", {
    enabled: !!siteId,
  });
  const { data: allOrganizations = [] } = useOrganizations();

  const [removeTarget, setRemoveTarget] = useState<SiteNode | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; description: string; organizationIds: string[] }>({
    name: "",
    description: "",
    organizationIds: [],
  });
  const removeMutation = useRemoveSiteNode();
  const updateMutation = useUpdateSite();
  const { toast } = useToast();

  const openEdit = () => {
    if (!site) return;
    setEditForm({
      name: site.name ?? "",
      description: site.description ?? "",
      organizationIds: [...(site.organizationIds ?? [])],
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!site || !siteId) return;
    const current = site.organizationIds ?? [];
    const next = editForm.organizationIds.filter((v) => v);
    const addOrganizationIds = next.filter((id) => !current.includes(id));
    const removeOrganizationIds = current.filter((id) => !next.includes(id));

    const descriptor: Record<string, unknown> = {};
    if (editForm.name.trim() && editForm.name.trim() !== site.name) descriptor.name = editForm.name.trim();
    if ((editForm.description ?? "") !== (site.description ?? "")) descriptor.description = editForm.description.trim();
    if (addOrganizationIds.length) descriptor.addOrganizationIds = addOrganizationIds;
    if (removeOrganizationIds.length) descriptor.removeOrganizationIds = removeOrganizationIds;

    if (Object.keys(descriptor).length === 0) {
      toast({ title: "No Changes", description: "Nothing to update" });
      setEditOpen(false);
      return;
    }

    try {
      await updateMutation.mutateAsync({ siteId, descriptor });
      toast({ title: "Site Updated", description: "Site details have been updated" });
      setEditOpen(false);
    } catch (err) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update site",
        variant: "destructive",
      });
    }
  };

  const handleRemoveNode = async () => {
    if (!removeTarget || !siteId) return;
    try {
      await removeMutation.mutateAsync({ siteId, descriptor: { siteNodeId: removeTarget.id } });
      toast({ title: "Node Removed", description: `Node "${removeTarget.name}" removed` });
      setRemoveTarget(null);
    } catch (err) {
      toast({
        title: "Remove Failed",
        description: err instanceof Error ? err.message : "Failed to remove node",
        variant: "destructive",
      });
    }
  };

  const nodes = site?.siteNodes ?? site?.nodes ?? [];
  

  return (
    <>
      <Dialog open={!!siteId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Site Details</DialogTitle>
              {site && !isLoading && (
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>
            <DialogDescription>
              {isLoading ? "Fetching site details…" : site?.name ?? ""}
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-3 py-8 text-sm text-destructive">
              <AlertCircle className="h-6 w-6" />
              <p>Failed to load site details.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          )}

          {site && !isLoading && (
            <div className="space-y-5 text-sm">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium font-mono text-xs">{site.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cluster</p>
                  <p className="font-medium">{site.clusterName || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono text-xs break-all">{site.id}</p>
                </div>
                {site.description && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Description</p>
                    <p>{site.description}</p>
                  </div>
                )}
              </div>

              {/* Nodes */}
              <div>
                <p className="font-medium mb-2">
                  Site Nodes ({nodes.length})
                </p>
                {nodes.length > 0 ? (
                  <div className="space-y-2">
                    {nodes.map((node) => (
                      <div
                        key={node.id}
                        className="rounded-md border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {node.online ? (
                              <Wifi className="h-4 w-4 text-green-500" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium text-xs font-mono">{node.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={node.authorized ? "default" : "secondary"}>
                              {node.authorized ? "Authorized" : "Pending"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setRemoveTarget(node)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Serial: {node.serialNumber || "—"}</span>
                          <span>Host: {node.hostName || "—"}</span>
                          {node.cpuInfo && (
                            <>
                              <span>CPU: {node.cpuInfo.model}</span>
                              <span>Cores: {node.cpuInfo.cores} ({node.cpuInfo.cpUs} vCPUs)</span>
                            </>
                          )}
                          {node.registered && (
                            <span className="col-span-2">
                              Registered: {new Date(node.registered).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">No nodes registered</p>
                )}
              </div>

              {/* Gateway Templates */}
              {site.gatewayTemplates && site.gatewayTemplates.length > 0 && (
                <div>
                  <p className="font-medium mb-2">
                    Gateway Templates ({site.gatewayTemplates.length})
                  </p>
                  <div className="space-y-1">
                    {site.gatewayTemplates.map((t, i) => (
                      <div key={i} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-muted-foreground">rev {t.revision}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit site dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Site</DialogTitle>
            <DialogDescription>Update site name, description, and organization assignments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Organization IDs</Label>
              <div className="space-y-2">
                {editForm.organizationIds.map((orgId, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Select
                      value={orgId}
                      onValueChange={(value) =>
                        setEditForm((f) => {
                          const updated = [...f.organizationIds];
                          updated[idx] = value;
                          return { ...f, organizationIds: updated };
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {allOrganizations
                          .filter((org) => org.id === orgId || !editForm.organizationIds.includes(org.id))
                          .map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name} ({org.id})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setEditForm((f) => ({
                          ...f,
                          organizationIds: f.organizationIds.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={editForm.organizationIds.length >= allOrganizations.length}
                  onClick={() => setEditForm((f) => ({ ...f, organizationIds: [...f.organizationIds, ""] }))}
                >
                  + Add Organization ID
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove node confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Node</AlertDialogTitle>
            <AlertDialogDescription>
              Remove node <strong>{removeTarget?.name}</strong> from this site?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveNode}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Templates sub-component (fires GET DownloadableTemplates on open) ────────
function TemplatesDialog({
  siteId,
  onClose,
}: {
  siteId: string | null;
  onClose: () => void;
}) {
  const { data: templates, isLoading, isError, refetch } = useDownloadableTemplates(
    siteId ?? "",
    { enabled: !!siteId }
  );
  const downloadMutation = useDownloadTemplate();
  const { toast } = useToast();
  const [confirmTemplate, setConfirmTemplate] = useState<DownloadableTemplate | null>(null);

  const handleDownload = async () => {
    if (!confirmTemplate || !siteId) return;
    try {
      await downloadMutation.mutateAsync({ siteId, descriptor: confirmTemplate });
      toast({ title: "Download Started", description: `Downloading "${confirmTemplate.name}"` });
      setConfirmTemplate(null);
    } catch (err) {
      toast({
        title: "Download Failed",
        description: err instanceof Error ? err.message : "Failed to start download",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={!!siteId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Downloadable Templates</DialogTitle>
            <DialogDescription>
              Templates available to download to this site
            </DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-3 py-8 text-sm text-destructive">
              <AlertCircle className="h-6 w-6" />
              <p>Failed to load templates.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          )}

          {templates && !isLoading && (
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No templates available</p>
              ) : (
                templates.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{t.name}</span>
                        <Badge variant="outline" className="text-xs">{t.type}</Badge>
                        {t.downloaded && (
                          <Badge variant="default" className="text-xs">Downloaded</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.cores} cores · {t.memory} MB · {formatBytes(t.size)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        digest: {t.digest}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={t.downloaded ? "outline" : "default"}
                      disabled={t.downloaded || downloadMutation.isPending}
                      onClick={() => setConfirmTemplate(t)}
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      {t.downloaded ? "Downloaded" : "Download"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Download confirmation */}
      <AlertDialog open={!!confirmTemplate} onOpenChange={(open) => !open && setConfirmTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Download Template</AlertDialogTitle>
            <AlertDialogDescription>
              Start downloading <strong>{confirmTemplate?.name}</strong> ({formatBytes(confirmTemplate?.size)}) to this site?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDownload} disabled={downloadMutation.isPending}>
              {downloadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SitesPage() {
  const { toast } = useToast();

  // Pagination / search / sort
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [orderby, setOrderby] = useState("name asc");

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate());
  const [detailsSiteId, setDetailsSiteId] = useState<string | null>(null);
  const [templatesSiteId, setTemplatesSiteId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);

  // Workspace creation state
  const [workspaceSite, setWorkspaceSite] = useState<Site | null>(null);
  const [wsName, setWsName] = useState("");
  const [wsDescription, setWsDescription] = useState("");
  const [wsOrgId, setWsOrgId] = useState("");

  // Data
  const { data, isLoading, isError, error, isFetching, refetch } = useSitesPage({
    page, pageSize, search, orderby,
  });
  const { data: allOrganizations = [] } = useOrganizations();
  const createMutation = useCreateSite();
  const deleteMutation = useDeleteSite();
  const createWorkspaceMutation = useCreateWorkspace();

  const sites = useMemo(() => data?.value ?? [], [data]);
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const onlineCount = useMemo(
    () => sites.filter((s) => (s.siteNodes ?? s.nodes ?? []).some((n) => n.online)).length,
    [sites]
  );

  const commitSearch = () => { setPage(1); setSearch(searchInput); };

  const handleCreate = async () => {
    if (!createForm.memberAddress.trim() || !createForm.registrationUserName.trim() || !createForm.registrationPassword.trim()) {
      toast({ title: "Validation Error", description: "Member address, username, and password are required", variant: "destructive" });
      return;
    }
    const descriptor: SiteDescriptor = {
      memberAddress: createForm.memberAddress.trim(),
      registrationUserName: createForm.registrationUserName.trim(),
      registrationPassword: createForm.registrationPassword,
      description: createForm.description.trim() || undefined,
      validateServerCertificate: createForm.validateServerCertificate,
      port: createForm.port ? Number(createForm.port) : undefined,
      timeout: createForm.timeout ? Number(createForm.timeout) : undefined,
      serialNumber: createForm.serialNumber.trim() || undefined,
      machineId: createForm.machineId.trim() || undefined,
      organizationIds: createForm.organizationIds.length > 0 ? createForm.organizationIds : undefined,
      importToOrganizationId: createForm.importToOrganizationId.trim() || undefined,
      dataEgressOnMgmtNetwork: createForm.dataEgressOnMgmtNetwork,
    };
    try {
      await createMutation.mutateAsync(descriptor);
      toast({ title: "Site Created", description: "New site has been registered" });
      setCreateOpen(false);
      setCreateForm(emptyCreate());
      setPage(1);
    } catch (err) {
      toast({ title: "Create Failed", description: err instanceof Error ? err.message : "Failed to create site", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Site Deleted", description: `"${deleteTarget.name}" has been deleted` });
      setDeleteTarget(null);
      if (sites.length === 1 && page > 1) setPage((p) => p - 1);
    } catch (err) {
      toast({ title: "Delete Failed", description: err instanceof Error ? err.message : "Failed to delete site", variant: "destructive" });
    }
  };

  const openWorkspaceDialog = (site: Site) => {
    setWorkspaceSite(site);
    setWsName("");
    setWsDescription("");
    // Pre-select org if the site belongs to exactly one
    setWsOrgId(site.organizationIds?.length === 1 ? site.organizationIds[0] : "");
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceSite) return;
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
        siteId: workspaceSite.id,
        organizationId: wsOrgId,
        descriptor: {
          name: wsName.trim(),
          description: wsDescription.trim() || undefined,
        },
      });
      toast({ title: "Workspace Created", description: `"${wsName}" has been created on ${workspaceSite.name}` });
      setWorkspaceSite(null);
    } catch (err) {
      toast({
        title: "Create Workspace Failed",
        description: err instanceof Error ? err.message : "Failed to create workspace",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading sites...</p>
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
              Failed to Load Sites
            </CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "An error occurred"}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sites</h1>
          <p className="text-muted-foreground">
            Manage physical sites, nodes, and VM templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => { setCreateForm(emptyCreate()); setCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Register Site
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Online Nodes</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineCount}</div>
            <p className="text-xs text-muted-foreground">on this page</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Online Nodes</CardTitle>
            <WifiOff className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sites.length - onlineCount}</div>
            <p className="text-xs text-muted-foreground">on this page</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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
            <Select value={orderby} onValueChange={(v) => { setOrderby(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name asc">Name A→Z</SelectItem>
                <SelectItem value="name desc">Name Z→A</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Server className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search ? `No sites matching "${search}"` : "No sites found"}
              </p>
              {search && (
                <Button variant="ghost" size="sm" className="mt-2"
                  onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>
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
                    <TableHead>Cluster</TableHead>
                    <TableHead>Nodes</TableHead>
                    <TableHead>Online</TableHead>
                    <TableHead>GW Templates</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => {
                    const nodes = site.siteNodes ?? site.nodes ?? [];
                    const onlineNodes = nodes.filter((n) => n.online).length;
                    return (
                      <TableRow key={site.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium font-mono text-xs">{site.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {site.id.slice(0, 8)}…
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {site.clusterName || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{nodes.length}</TableCell>
                        <TableCell>
                          {nodes.length > 0 ? (
                            <Badge variant={onlineNodes > 0 ? "default" : "secondary"}>
                              {onlineNodes}/{nodes.length}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {site.gatewayTemplates?.length ?? 0}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setDetailsSiteId(site.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setTemplatesSiteId(site.id)}>
                                <Download className="mr-2 h-4 w-4" />
                                Templates
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openWorkspaceDialog(site)}>
                                <LayoutGrid className="mr-2 h-4 w-4" />
                                Create Workspace
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => setDeleteTarget(site)}
                                className="text-destructive"
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

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isFetching}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-2">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="icon"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isFetching}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ════ Create Site Dialog ════ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register Site</DialogTitle>
            <DialogDescription>
              Register a new site by providing the ZeroTier member address and Proxmox credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="memberAddress">
                  Member Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="memberAddress"
                  placeholder="ZeroTier node address"
                  value={createForm.memberAddress}
                  onChange={(e) => setCreateForm((f) => ({ ...f, memberAddress: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regUser">
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="regUser"
                  placeholder="Proxmox user"
                  value={createForm.registrationUserName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, registrationUserName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regPass">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="regPass"
                  type="password"
                  placeholder="Proxmox password"
                  value={createForm.registrationPassword}
                  onChange={(e) => setCreateForm((f) => ({ ...f, registrationPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  placeholder="Optional"
                  value={createForm.serialNumber}
                  onChange={(e) => setCreateForm((f) => ({ ...f, serialNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="machineId">Machine ID</Label>
                <Input
                  id="machineId"
                  placeholder="Optional"
                  value={createForm.machineId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, machineId: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="importToOrganizationId">Import to Organization ID</Label>
                <Input
                  id="importToOrganizationId"
                  placeholder="Organization UUID (optional)"
                  value={createForm.importToOrganizationId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, importToOrganizationId: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Organization IDs</Label>
                <div className="space-y-2">
                  {createForm.organizationIds.map((orgId, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Select
                        value={orgId}
                        onValueChange={(value) =>
                          setCreateForm((f) => {
                            const updated = [...f.organizationIds];
                            updated[idx] = value;
                            return { ...f, organizationIds: updated };
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {allOrganizations
                            .filter(
                              (org) =>
                                org.id === orgId ||
                                !createForm.organizationIds.includes(org.id)
                            )
                            .map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name} ({org.id})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCreateForm((f) => ({
                            ...f,
                            organizationIds: f.organizationIds.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={createForm.organizationIds.length >= allOrganizations.length}
                    onClick={() =>
                      setCreateForm((f) => ({ ...f, organizationIds: [...f.organizationIds, ""] }))
                    }
                  >
                    + Add Organization ID
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="Default"
                  value={createForm.port}
                  onChange={(e) => setCreateForm((f) => ({ ...f, port: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (s)</Label>
                <Input
                  id="timeout"
                  type="number"
                  placeholder="Default"
                  value={createForm.timeout}
                  onChange={(e) => setCreateForm((f) => ({ ...f, timeout: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="validateCert"
                  checked={createForm.validateServerCertificate}
                  onCheckedChange={(v) => setCreateForm((f) => ({ ...f, validateServerCertificate: !!v }))}
                />
                <label htmlFor="validateCert" className="text-sm">Validate Server Certificate</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dataEgress"
                  checked={createForm.dataEgressOnMgmtNetwork}
                  onCheckedChange={(v) => setCreateForm((f) => ({ ...f, dataEgressOnMgmtNetwork: !!v }))}
                />
                <label htmlFor="dataEgress" className="text-sm">Data Egress on Management Network</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ View Details Dialog ════ */}
      <SiteDetailsDialog siteId={detailsSiteId} onClose={() => setDetailsSiteId(null)} />

      {/* ════ Templates Dialog ════ */}
      <TemplatesDialog siteId={templatesSiteId} onClose={() => setTemplatesSiteId(null)} />

      {/* ════ Create Workspace Dialog ════ */}
      <Dialog
        open={!!workspaceSite}
        onOpenChange={(open) => { if (!open) setWorkspaceSite(null); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace on site <strong>{workspaceSite?.name}</strong>
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
                  {(workspaceSite?.organizationIds && workspaceSite.organizationIds.length > 0
                    ? allOrganizations.filter((org) => workspaceSite.organizationIds!.includes(org.id))
                    : allOrganizations
                  ).map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkspaceSite(null)}>
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
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete site <strong>{deleteTarget?.name}</strong>?
              This action cannot be undone. All associated nodes and workspaces will lose connectivity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
