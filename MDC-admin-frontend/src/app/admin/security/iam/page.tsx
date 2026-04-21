"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Shield,
  Users,
  Key,
  FileText,
  Copy,
  Loader2,
  RefreshCw,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Import IAM hooks
import {
  useRoles,
  useRoleMembers,
  useCreateRole,
  useDeleteRole,
  useUpdateRolePermissions,
  usePermissionsGrouped,
  useServiceAccounts,
  useCreateServiceAccount,
  useUpdateServiceAccount,
  useDeleteServiceAccount,
  useRotateServiceAccountKey,
  useActivateServiceAccount,
  useDeactivateServiceAccount,
} from "@/hooks/use-iam";

import type {
  Role,
  ServiceAccount,
} from "@/lib/api/iam";

export default function IAMPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  // API hooks
  const { data: roles, isLoading: rolesLoading, refetch: refetchRoles } = useRoles();
  const { data: permissionGroups, isLoading: permissionsLoading } = usePermissionsGrouped();
  const { data: serviceAccounts, isLoading: serviceAccountsLoading, refetch: refetchServiceAccounts } = useServiceAccounts();

  const createRoleMutation = useCreateRole();
  const deleteRoleMutation = useDeleteRole();
  const updateRolePermissionsMutation = useUpdateRolePermissions();

  const createServiceAccountMutation = useCreateServiceAccount();
  const updateServiceAccountMutation = useUpdateServiceAccount();
  const deleteServiceAccountMutation = useDeleteServiceAccount();
  const rotateKeyMutation = useRotateServiceAccountKey();
  const activateServiceAccountMutation = useActivateServiceAccount();
  const deactivateServiceAccountMutation = useDeactivateServiceAccount();

  // Dialog states
  const [createRoleDialogOpen, setCreateRoleDialogOpen] = useState(false);
  const [viewRoleDialogOpen, setViewRoleDialogOpen] = useState(false);
  const [editPermissionsDialogOpen, setEditPermissionsDialogOpen] = useState(false);
  const [viewMembersDialogOpen, setViewMembersDialogOpen] = useState(false);
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const [createServiceAccountDialogOpen, setCreateServiceAccountDialogOpen] = useState(false);
  const [editServiceAccountDialogOpen, setEditServiceAccountDialogOpen] = useState(false);
  const [deleteServiceAccountDialogOpen, setDeleteServiceAccountDialogOpen] = useState(false);
  const [selectedServiceAccount, setSelectedServiceAccount] = useState<ServiceAccount | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  // Form states
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDisplayName, setNewRoleDisplayName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

  const [newServiceAccountName, setNewServiceAccountName] = useState("");
  const [newServiceAccountDescription, setNewServiceAccountDescription] = useState("");
  const [newServiceAccountRoleId, setNewServiceAccountRoleId] = useState("");

  // Role Members hook (only when a role is selected)
  const { data: roleMembers, isLoading: membersLoading } = useRoleMembers(
    selectedRole?.id || "",
    { enabled: !!selectedRole && viewMembersDialogOpen }
  );

  // Flatten permissions for easier access
  const allPermissions = permissionGroups?.flatMap(g => g.permissions) || [];

  // Filter functions
  const filteredRoles = roles?.filter(role =>
    role.name.toLowerCase().includes(search.toLowerCase()) ||
    role.displayName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const filteredServiceAccounts = serviceAccounts?.filter(sa =>
    sa.name.toLowerCase().includes(search.toLowerCase()) ||
    (sa.description?.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  // Role handlers
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Validation Error",
        description: "Role name is required.",
        variant: "destructive",
      });
      return;
    }
    if (!newRoleDisplayName.trim()) {
      toast({
        title: "Validation Error",
        description: "Display name is required.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createRoleMutation.mutateAsync({
        name: newRoleName,
        displayName: newRoleDisplayName,
        description: newRoleDescription,
        permissionIds: selectedPermissionIds,
      });
      toast({
        title: "Role Created",
        description: `${newRoleDisplayName} has been created successfully.`,
      });
      setCreateRoleDialogOpen(false);
      resetRoleForm();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create role. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleViewRole = (role: Role) => {
    setSelectedRole(role);
    setViewRoleDialogOpen(true);
  };

  const handleEditPermissions = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissionIds(role.permissions.map(p => p.id));
    setEditPermissionsDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      await updateRolePermissionsMutation.mutateAsync({
        id: selectedRole.id,
        permissionIds: selectedPermissionIds,
      });
      toast({
        title: "Permissions Updated",
        description: `${selectedRole.displayName} permissions have been updated.`,
      });
      setEditPermissionsDialogOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update permissions. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleViewMembers = (role: Role) => {
    setSelectedRole(role);
    setViewMembersDialogOpen(true);
  };

  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setDeleteRoleDialogOpen(true);
  };

  const confirmDeleteRole = async () => {
    if (!selectedRole) return;
    try {
      await deleteRoleMutation.mutateAsync(selectedRole.id);
      toast({
        title: "Role Deleted",
        description: `${selectedRole.displayName} has been deleted.`,
      });
      setDeleteRoleDialogOpen(false);
      setSelectedRole(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete role. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetRoleForm = () => {
    setNewRoleName("");
    setNewRoleDisplayName("");
    setNewRoleDescription("");
    setSelectedPermissionIds([]);
  };

  // Service Account handlers
  const handleCreateServiceAccount = async () => {
    try {
      const result = await createServiceAccountMutation.mutateAsync({
        name: newServiceAccountName,
        description: newServiceAccountDescription,
        roleId: newServiceAccountRoleId || undefined,
      });
      setNewApiKey(result.apiKey);
      setShowApiKeyDialog(true);
      toast({
        title: "Service Account Created",
        description: `${newServiceAccountName} has been created. Save the API key now!`,
      });
      setCreateServiceAccountDialogOpen(false);
      resetServiceAccountForm();
    } catch {
      toast({
        title: "Error",
        description: "Failed to create service account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRotateKeys = async (sa: ServiceAccount) => {
    try {
      const result = await rotateKeyMutation.mutateAsync(sa.id);
      setNewApiKey(result.apiKey);
      setShowApiKeyDialog(true);
      toast({
        title: "Keys Rotated",
        description: `New keys have been generated for ${sa.name}. Save the API key now!`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to rotate keys. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditServiceAccount = (sa: ServiceAccount) => {
    setSelectedServiceAccount(sa);
    setNewServiceAccountName(sa.name);
    setNewServiceAccountDescription(sa.description || "");
    setNewServiceAccountRoleId(sa.roleId || "");
    setEditServiceAccountDialogOpen(true);
  };

  const handleSaveServiceAccount = async () => {
    if (!selectedServiceAccount) return;
    try {
      await updateServiceAccountMutation.mutateAsync({
        id: selectedServiceAccount.id,
        data: {
          name: newServiceAccountName,
          description: newServiceAccountDescription,
          roleId: newServiceAccountRoleId || undefined,
        },
      });
      toast({
        title: "Service Account Updated",
        description: `${newServiceAccountName} has been updated.`,
      });
      setEditServiceAccountDialogOpen(false);
      setSelectedServiceAccount(null);
      resetServiceAccountForm();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update service account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleServiceAccount = async (sa: ServiceAccount) => {
    try {
      if (sa.status === "active") {
        await deactivateServiceAccountMutation.mutateAsync(sa.id);
        toast({
          title: "Service Account Deactivated",
          description: `${sa.name} is now inactive.`,
        });
      } else {
        await activateServiceAccountMutation.mutateAsync(sa.id);
        toast({
          title: "Service Account Activated",
          description: `${sa.name} is now active.`,
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update service account status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteServiceAccount = (sa: ServiceAccount) => {
    setSelectedServiceAccount(sa);
    setDeleteServiceAccountDialogOpen(true);
  };

  const confirmDeleteServiceAccount = async () => {
    if (!selectedServiceAccount) return;
    try {
      await deleteServiceAccountMutation.mutateAsync(selectedServiceAccount.id);
      toast({
        title: "Service Account Deleted",
        description: `${selectedServiceAccount.name} has been deleted.`,
      });
      setDeleteServiceAccountDialogOpen(false);
      setSelectedServiceAccount(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete service account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetServiceAccountForm = () => {
    setNewServiceAccountName("");
    setNewServiceAccountDescription("");
    setNewServiceAccountRoleId("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard.",
    });
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IAM Management</h1>
          <p className="text-muted-foreground">
            Identity and access management configuration
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { refetchRoles(); refetchServiceAccounts(); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allPermissions.length}</div>
            <p className="text-xs text-muted-foreground">
              {permissionGroups?.length || 0} resource groups
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {roles?.filter(r => r.isSystem).length || 0} system, {roles?.filter(r => !r.isSystem).length || 0} custom
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Accounts</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceAccounts?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {serviceAccounts?.filter(s => s.status === "active").length || 0} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles?.reduce((sum, r) => sum + r.memberCount, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Role assignments</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="service-accounts">Service Accounts</TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Dialog open={createRoleDialogOpen} onOpenChange={setCreateRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Role</DialogTitle>
                  <DialogDescription>
                    Define a new role with specific permissions
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Role Name (identifier)</Label>
                    <Input
                      placeholder="my_custom_role"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Display Name</Label>
                    <Input
                      placeholder="My Custom Role"
                      value={newRoleDisplayName}
                      onChange={(e) => setNewRoleDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="What this role is for..."
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Permissions</Label>
                    <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-4">
                      {permissionGroups?.map((group) => (
                        <div key={group.resource}>
                          <h4 className="font-medium mb-2">{group.displayName}</h4>
                          <div className="grid gap-2 pl-4">
                            {group.permissions.map((perm) => (
                              <div key={perm.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={perm.id}
                                  checked={selectedPermissionIds.includes(perm.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPermissionIds([...selectedPermissionIds, perm.id]);
                                    } else {
                                      setSelectedPermissionIds(selectedPermissionIds.filter(id => id !== perm.id));
                                    }
                                  }}
                                />
                                <label htmlFor={perm.id} className="text-sm cursor-pointer">
                                  <span className="font-medium">{perm.name}</span>
                                  <span className="text-muted-foreground ml-2">- {perm.description}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setCreateRoleDialogOpen(false); resetRoleForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRole} disabled={createRoleMutation.isPending}>
                    {createRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Permission groups with attached users</CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{role.displayName}</div>
                            <div className="text-xs text-muted-foreground">{role.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.isSystem ? "default" : "outline"}>
                            {role.isSystem ? "system" : "custom"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {role.description}
                        </TableCell>
                        <TableCell>{role.permissions.length}</TableCell>
                        <TableCell>{role.memberCount}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleViewRole(role)}>
                                View Role
                              </DropdownMenuItem>
                              {!role.isSystem && (
                                <DropdownMenuItem onSelect={() => handleEditPermissions(role)}>
                                  Edit Permissions
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onSelect={() => handleViewMembers(role)}>
                                View Members
                              </DropdownMenuItem>
                              {!role.isSystem && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteRole(role)}>
                                    Delete Role
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>Available permissions grouped by resource</CardDescription>
            </CardHeader>
            <CardContent>
              {permissionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  {permissionGroups?.map((group) => (
                    <div key={group.resource}>
                      <h3 className="font-semibold text-lg mb-3">{group.displayName}</h3>
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {group.permissions.map((perm) => (
                          <div key={perm.id} className="border rounded-md p-3">
                            <div className="font-medium text-sm">{perm.name}</div>
                            <div className="text-xs text-muted-foreground">{perm.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Accounts Tab */}
        <TabsContent value="service-accounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Service Accounts</CardTitle>
                <CardDescription>Non-human identities for automation</CardDescription>
              </div>
              <Dialog open={createServiceAccountDialogOpen} onOpenChange={setCreateServiceAccountDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Service Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Service Account</DialogTitle>
                    <DialogDescription>
                      Create a new service account for API access
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="my-service-account"
                        value={newServiceAccountName}
                        onChange={(e) => setNewServiceAccountName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="What this service account is for..."
                        value={newServiceAccountDescription}
                        onChange={(e) => setNewServiceAccountDescription(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Role</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        value={newServiceAccountRoleId}
                        onChange={(e) => setNewServiceAccountRoleId(e.target.value)}
                      >
                        <option value="">No role assigned</option>
                        {roles?.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setCreateServiceAccountDialogOpen(false); resetServiceAccountForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateServiceAccount} disabled={createServiceAccountMutation.isPending}>
                      {createServiceAccountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {serviceAccountsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServiceAccounts.map((sa) => (
                      <TableRow key={sa.id}>
                        <TableCell className="font-medium font-mono">{sa.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {sa.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sa.roleName || "No role"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sa.status === "active" ? "default" : "secondary"}>
                            {sa.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sa.lastUsedAt ? format(new Date(sa.lastUsedAt), "MMM d, HH:mm") : "Never"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleRotateKeys(sa)}>
                                <Key className="mr-2 h-4 w-4" />
                                Rotate Keys
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleEditServiceAccount(sa)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {sa.status === "active" ? (
                                <DropdownMenuItem onSelect={() => handleToggleServiceAccount(sa)}>
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onSelect={() => handleToggleServiceAccount(sa)}>
                                  Activate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteServiceAccount(sa)}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Role Dialog */}
      <Dialog open={viewRoleDialogOpen} onOpenChange={setViewRoleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRole?.displayName}</DialogTitle>
            <DialogDescription>{selectedRole?.description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <p className="font-medium">{selectedRole?.isSystem ? "System" : "Custom"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Members</Label>
                <p className="font-medium">{selectedRole?.memberCount}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Permissions ({selectedRole?.permissions.length})</Label>
              <div className="flex flex-wrap gap-1 mt-2 max-h-40 overflow-y-auto">
                {selectedRole?.permissions.map((perm) => (
                  <Badge key={perm.id} variant="secondary" className="text-xs">
                    {perm.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRoleDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Permissions Dialog */}
      <Dialog open={editPermissionsDialogOpen} onOpenChange={setEditPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role Permissions</DialogTitle>
            <DialogDescription>Manage permissions for {selectedRole?.displayName}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-96 overflow-y-auto">
            {permissionGroups?.map((group) => (
              <div key={group.resource}>
                <h4 className="font-medium mb-2">{group.displayName}</h4>
                <div className="grid gap-2 pl-4">
                  {group.permissions.map((perm) => (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${perm.id}`}
                        checked={selectedPermissionIds.includes(perm.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPermissionIds([...selectedPermissionIds, perm.id]);
                          } else {
                            setSelectedPermissionIds(selectedPermissionIds.filter(id => id !== perm.id));
                          }
                        }}
                      />
                      <label htmlFor={`edit-${perm.id}`} className="text-sm cursor-pointer">
                        <span className="font-medium">{perm.name}</span>
                        <span className="text-muted-foreground ml-2">- {perm.description}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={updateRolePermissionsMutation.isPending}>
              {updateRolePermissionsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Members Dialog */}
      <Dialog open={viewMembersDialogOpen} onOpenChange={setViewMembersDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRole?.displayName} Members</DialogTitle>
            <DialogDescription>{selectedRole?.memberCount} members with this role</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {membersLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : roleMembers && roleMembers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">No members assigned to this role</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMembersDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={deleteRoleDialogOpen} onOpenChange={setDeleteRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedRole?.displayName}&quot;? This will affect {selectedRole?.memberCount} members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRole}>Delete Role</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Service Account Dialog */}
      <Dialog open={editServiceAccountDialogOpen} onOpenChange={setEditServiceAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service Account</DialogTitle>
            <DialogDescription>Update service account details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={newServiceAccountName}
                onChange={(e) => setNewServiceAccountName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={newServiceAccountDescription}
                onChange={(e) => setNewServiceAccountDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={newServiceAccountRoleId}
                onChange={(e) => setNewServiceAccountRoleId(e.target.value)}
              >
                <option value="">No role assigned</option>
                {roles?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditServiceAccountDialogOpen(false); resetServiceAccountForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveServiceAccount} disabled={updateServiceAccountMutation.isPending}>
              {updateServiceAccountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Account Confirmation */}
      <AlertDialog open={deleteServiceAccountDialogOpen} onOpenChange={setDeleteServiceAccountDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedServiceAccount?.name}&quot;? This action cannot be undone and any services using this account will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteServiceAccount}>Delete Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* API Key Display Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Copy this API key now. You will not be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={newApiKey || ""}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={() => newApiKey && copyToClipboard(newApiKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Store this key securely. It provides access to your organization&apos;s resources.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowApiKeyDialog(false); setNewApiKey(null); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
