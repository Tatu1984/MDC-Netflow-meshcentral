"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  ShieldCheck,
  Search,
  MoreHorizontal,
  RefreshCw,
  Loader2,
  AlertCircle,
  Trash2,
  Pencil,
  Eye,
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
  useUsers,
  useOrganizations,
  useRegisterUser,
  useUpdateUser,
  useDeleteUser,
} from "@/lib/mdc/hooks";
import type { User, UserOrganizationRole } from "@/lib/mdc/types";

const APP_ROLES = ["GlobalAdministrator", "WorkspaceManager", "WorkspaceUser", "DatacenterTechnician"] as const;
const ORG_ROLES = ["admin", "manager", "developer"] as const;

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "GlobalAdministrator") return "default";
  if (role === "WorkspaceManager") return "secondary";
  return "outline";
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialogs
  const [registerOpen, setRegisterOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // Register form
  const [regObjectId, setRegObjectId] = useState("");
  const [regAppRoles, setRegAppRoles] = useState<string[]>([]);
  const [regOrgId, setRegOrgId] = useState("");
  const [regOrgRole, setRegOrgRole] = useState("");

  // Edit form
  const [editAddAppRoles, setEditAddAppRoles] = useState<string[]>([]);
  const [editRemoveAppRoles, setEditRemoveAppRoles] = useState<string[]>([]);
  const [editAddOrgRole, setEditAddOrgRole] = useState<{ orgId: string; role: string } | null>(null);
  const [editRemoveOrgRoles, setEditRemoveOrgRoles] = useState<UserOrganizationRole[]>([]);

  // Data
  const { data: users, isLoading, isError, error, refetch } = useUsers({ includeUnregistered: true });
  const { data: organizations } = useOrganizations();
  const registerMutation = useRegisterUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  // Org name lookup
  const orgNameMap = useMemo(() => {
    const map = new Map<string, string>();
    organizations?.forEach((org) => map.set(org.id, org.name));
    return map;
  }, [organizations]);

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const matchesSearch =
        user.displayName.toLowerCase().includes(search.toLowerCase()) ||
        user.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "registered" && user.isRegistered) ||
        (statusFilter === "unregistered" && !user.isRegistered);
      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  // Stats
  const totalUsers = users?.length ?? 0;
  const registeredCount = users?.filter((u) => u.isRegistered).length ?? 0;
  const unregisteredCount = totalUsers - registeredCount;
  const globalAdminCount = users?.filter((u) => u.appRoles.includes("GlobalAdministrator")).length ?? 0;

  // Handlers
  const handleRegister = async () => {
    if (!regObjectId.trim()) {
      toast({ title: "Validation Error", description: "Object ID is required", variant: "destructive" });
      return;
    }

    const orgRoles: UserOrganizationRole[] = [];
    if (regOrgId && regOrgRole) {
      orgRoles.push({ organizationId: regOrgId, role: regOrgRole });
    }

    try {
      await registerMutation.mutateAsync({
        id: regObjectId.trim(),
        applicationRoles: regAppRoles.length > 0 ? regAppRoles : undefined,
        organizationRoles: orgRoles.length > 0 ? orgRoles : undefined,
      });
      toast({ title: "User Registered", description: "User has been registered successfully" });
      setRegisterOpen(false);
      resetRegisterForm();
    } catch (err) {
      toast({
        title: "Registration Failed",
        description: err instanceof Error ? err.message : "Failed to register user",
        variant: "destructive",
      });
    }
  };

  const resetRegisterForm = () => {
    setRegObjectId("");
    setRegAppRoles([]);
    setRegOrgId("");
    setRegOrgRole("");
  };

  const handleEditSave = async () => {
    if (!editUser) return;

    const addOrgRoles: UserOrganizationRole[] = [];
    if (editAddOrgRole?.orgId && editAddOrgRole?.role) {
      addOrgRoles.push({ organizationId: editAddOrgRole.orgId, role: editAddOrgRole.role });
    }

    try {
      await updateMutation.mutateAsync({
        id: editUser.id,
        descriptor: {
          addApplicationRoles: editAddAppRoles.length > 0 ? editAddAppRoles : undefined,
          removeApplicationRoles: editRemoveAppRoles.length > 0 ? editRemoveAppRoles : undefined,
          addOrganizationRoles: addOrgRoles.length > 0 ? addOrgRoles : undefined,
          removeOrganizationRoles: editRemoveOrgRoles.length > 0 ? editRemoveOrgRoles : undefined,
        },
      });
      toast({ title: "User Updated", description: `Roles updated for ${editUser.displayName}` });
      setEditUser(null);
      resetEditForm();
    } catch (err) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const resetEditForm = () => {
    setEditAddAppRoles([]);
    setEditRemoveAppRoles([]);
    setEditAddOrgRole(null);
    setEditRemoveOrgRoles([]);
  };

  const openEditDialog = (user: User) => {
    resetEditForm();
    setEditUser(user);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "User Deleted", description: `${deleteTarget.displayName} has been deleted` });
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: err instanceof Error ? err.message : "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const toggleAppRole = (role: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(role) ? list.filter((r) => r !== role) : [...list, role]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading users...</p>
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
              Failed to Load Users
            </CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "An error occurred while loading users"}
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
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage platform users, roles, and registrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => { resetRegisterForm(); setRegisterOpen(true); }}>
            <UserPlus className="mr-2 h-4 w-4" />
            Register User
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registeredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unregistered</CardTitle>
            <UserX className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unregisteredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Admins</CardTitle>
            <ShieldCheck className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalAdminCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="unregistered">Unregistered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>App Roles</TableHead>
                  <TableHead>Org Roles</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => {
                      if (!user.isRegistered) {
                        toast({
                          title: "User Not Registered",
                          description: "This user is not registered yet.",
                          variant: "destructive",
                        });
                        return;
                      }
                      router.push(`/admin/users/${user.id}`);
                    }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {user.id.slice(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.emailAddress || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isRegistered ? "default" : "secondary"}>
                        {user.isRegistered ? "Registered" : "Unregistered"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.appRoles.length > 0 ? (
                          user.appRoles.map((role) => (
                            <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.organizationRoles.length > 0 ? (
                        <Badge variant="outline" className="text-xs">
                          {user.organizationRoles.length} org{user.organizationRoles.length !== 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setDetailsUser(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEditDialog(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Roles
                          </DropdownMenuItem>
                          {!user.isRegistered && (
                            <DropdownMenuItem
                              onSelect={() => {
                                resetRegisterForm();
                                setRegObjectId(user.id);
                                setRegisterOpen(true);
                              }}
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Register
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => setDeleteTarget(user)}
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
          )}
        </CardContent>
      </Card>

      {/* Register User Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register User</DialogTitle>
            <DialogDescription>
              Register an Azure AD user into the MDC system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-object-id">User ID <span className="text-destructive">*</span></Label>
              <Input
                id="reg-object-id"
                placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                value={regObjectId}
                onChange={(e) => setRegObjectId(e.target.value)}
                readOnly={!!users?.some((u) => u.id === regObjectId && !u.isRegistered)}
                className={users?.some((u) => u.id === regObjectId && !u.isRegistered) ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={regOrgId} onValueChange={setRegOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Organization Role</Label>
              <Select
                value={regOrgRole}
                onValueChange={setRegOrgRole}
                disabled={!regOrgId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={regOrgId ? "Select organization role" : "Select an organization first"} />
                </SelectTrigger>
                <SelectContent>
                  {ORG_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Application Role</Label>
              <Select
                value={regAppRoles[0] ?? ""}
                onValueChange={(value) => setRegAppRoles([value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select application role" />
                </SelectTrigger>
                <SelectContent>
                  {APP_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={registerMutation.isPending}>
              {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!detailsUser} onOpenChange={(open) => !open && setDetailsUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Full role breakdown for {detailsUser?.displayName}
            </DialogDescription>
          </DialogHeader>
          {detailsUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Display Name</p>
                  <p className="font-medium">{detailsUser.displayName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={detailsUser.isRegistered ? "default" : "secondary"}>
                    {detailsUser.isRegistered ? "Registered" : "Unregistered"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{detailsUser.emailAddress || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono text-xs break-all">{detailsUser.id}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Application Roles</p>
                <div className="flex flex-wrap gap-1">
                  {detailsUser.appRoles.length > 0 ? (
                    detailsUser.appRoles.map((role) => (
                      <Badge key={role} variant={getRoleBadgeVariant(role)}>
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No application roles</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Organization Roles</p>
                {detailsUser.organizationRoles.length > 0 ? (
                  <div className="space-y-2">
                    {detailsUser.organizationRoles.map((orgRole, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-sm">
                          {orgNameMap.get(orgRole.organizationId) || orgRole.organizationId.slice(0, 8) + "..."}
                        </span>
                        <Badge variant="outline">{orgRole.role}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No organization roles</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Roles Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) { setEditUser(null); resetEditForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Roles</DialogTitle>
            <DialogDescription>
              Modify roles for {editUser?.displayName}
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              {/* Current App Roles + Remove */}
              <div>
                <Label className="mb-2 block">Current App Roles</Label>
                <div className="flex flex-wrap gap-1">
                  {editUser.appRoles.map((role) => (
                    <Badge
                      key={role}
                      variant={editRemoveAppRoles.includes(role) ? "outline" : getRoleBadgeVariant(role)}
                      className={editRemoveAppRoles.includes(role) ? "line-through opacity-50 cursor-pointer" : "cursor-pointer"}
                      onClick={() => toggleAppRole(role, editRemoveAppRoles, setEditRemoveAppRoles)}
                    >
                      {role}
                      {editRemoveAppRoles.includes(role) ? " (removing)" : ""}
                    </Badge>
                  ))}
                  {editUser.appRoles.length === 0 && (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
                {editUser.appRoles.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Click a role to toggle removal</p>
                )}
              </div>

              {/* Add App Roles */}
              <div>
                <Label className="mb-2 block">Add App Roles</Label>
                {APP_ROLES.filter((r) => !editUser.appRoles.includes(r)).length === 0 ? (
                  <span className="text-sm text-muted-foreground">User has all roles</span>
                ) : (
                  <div className="space-y-2">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!editAddAppRoles.includes(value)) {
                          setEditAddAppRoles([...editAddAppRoles, value]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_ROLES.filter((r) => !editUser.appRoles.includes(r) && !editAddAppRoles.includes(r)).map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editAddAppRoles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {editAddAppRoles.map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => setEditAddAppRoles(editAddAppRoles.filter((r) => r !== role))}
                          >
                            {role} &times;
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Current Org Roles + Remove */}
              <div>
                <Label className="mb-2 block">Current Org Roles</Label>
                {editUser.organizationRoles.length > 0 ? (
                  <div className="space-y-1">
                    {editUser.organizationRoles.map((orgRole, i) => {
                      const isMarked = editRemoveOrgRoles.some(
                        (r) => r.organizationId === orgRole.organizationId && r.role === orgRole.role
                      );
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer ${isMarked ? "opacity-50 line-through" : ""}`}
                          onClick={() => {
                            if (isMarked) {
                              setEditRemoveOrgRoles(editRemoveOrgRoles.filter(
                                (r) => !(r.organizationId === orgRole.organizationId && r.role === orgRole.role)
                              ));
                            } else {
                              setEditRemoveOrgRoles([...editRemoveOrgRoles, orgRole]);
                            }
                          }}
                        >
                          <span className="text-sm">
                            {orgNameMap.get(orgRole.organizationId) || orgRole.organizationId.slice(0, 8) + "..."}
                          </span>
                          <Badge variant="outline">{orgRole.role}</Badge>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground mt-1">Click a role to toggle removal</p>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>

              {/* Add Org Role */}
              <div>
                <Label className="mb-2 block">Add Org Role</Label>
                <div className="flex gap-2">
                  <Select
                    value={editAddOrgRole?.orgId ?? ""}
                    onValueChange={(v) => setEditAddOrgRole({ orgId: v, role: editAddOrgRole?.role ?? "" })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={editAddOrgRole?.role ?? ""}
                    onValueChange={(v) => setEditAddOrgRole({ orgId: editAddOrgRole?.orgId ?? "", role: v })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditUser(null); resetEditForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.displayName}</strong>?
              This action cannot be undone. The user will lose all roles and access.
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
