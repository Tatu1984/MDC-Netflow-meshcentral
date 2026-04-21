"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  Building2,
  X,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUsers, useOrganizations, useRegisterUser, useSetUserRegistration } from "@/lib/mdc/hooks";
import { UserOrganizationRole, UserRegistrationDescriptor } from "@/lib/mdc/types";

// ── types ─────────────────────────────────────────────────────────────────────

type DisplayRole = "admin" | "member" | "viewer";

interface DisplayUser {
  id: string;
  name: string;
  emailAddress?: string;
  isRegistered: boolean;
  appRoles: string[];
  roles: UserOrganizationRole[];
  primaryRole: DisplayRole;
  organizationCount: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function mapRole(role: string): DisplayRole {
  const l = role.toLowerCase();
  if (l.includes("admin") || l.includes("owner")) return "admin";
  if (l.includes("viewer") || l.includes("read")) return "viewer";
  return "member";
}

function getPrimaryRole(roles: UserOrganizationRole[]): DisplayRole {
  if (roles.some((r) => mapRole(r.role) === "admin")) return "admin";
  if (roles.some((r) => mapRole(r.role) === "member")) return "member";
  return "viewer";
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const roleBadgeVariants: Record<DisplayRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  member: "secondary",
  viewer: "outline",
};

const roleLabels: Record<DisplayRole, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newUserAppRoles, setNewUserAppRoles] = useState<string[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedOrgRole, setSelectedOrgRole] = useState("");

  const { data: users, isLoading: usersLoading, isError: usersError, error: usersErrorData, refetch: refetchUsers } = useUsers({});
  const { data: organizations, isLoading: orgsLoading, isError: orgsError, refetch: refetchOrgs } = useOrganizations();
  const registerUser = useRegisterUser();
  const setRegistration = useSetUserRegistration();

  const orgNameMap = useMemo(() => {
    const map = new Map<string, string>();
    organizations?.forEach((org) => map.set(org.id, org.name));
    return map;
  }, [organizations]);

  const isLoading = usersLoading || orgsLoading;
  const isError = usersError || orgsError;

  const displayUsers = useMemo<DisplayUser[]>(() => {
    if (!users) return [];
    return users.map((user) => ({
      id: user.id,
      name: user.displayName,
      emailAddress: user.emailAddress,
      isRegistered: user.isRegistered,
      appRoles: user.appRoles ?? [],
      roles: user.organizationRoles ?? [],
      primaryRole: getPrimaryRole(user.organizationRoles ?? []),
      organizationCount: new Set((user.organizationRoles ?? []).map((r) => r.organizationId)).size,
    }));
  }, [users]);

  const filteredUsers = useMemo(() => {
    return displayUsers.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
        (user.emailAddress?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesRole = roleFilter === "all" || user.primaryRole === roleFilter;
      const matchesOrg = orgFilter === "all" || user.roles.some((r) => r.organizationId === orgFilter);
      return matchesSearch && matchesRole && matchesOrg;
    });
  }, [displayUsers, search, roleFilter, orgFilter]);

  const adminCount = displayUsers.filter((u) => u.primaryRole === "admin").length;
  const memberCount = displayUsers.filter((u) => u.primaryRole === "member").length;
  const viewerCount = displayUsers.filter((u) => u.primaryRole === "viewer").length;

  const handleRefresh = () => { refetchUsers(); refetchOrgs(); };

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
              <AlertCircle className="h-5 w-5" /> Failed to Load Users
            </CardTitle>
            <CardDescription>
              {usersErrorData instanceof Error ? usersErrorData.message : "An error occurred while loading users"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRefresh} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users & Teams</h1>
          <p className="text-muted-foreground">Manage users and their organization roles</p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayUsers.length}</div>
            <p className="text-xs text-muted-foreground">Across {organizations?.length || 0} organizations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <ShieldCheck className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
            <p className="text-xs text-muted-foreground">Full access</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberCount}</div>
            <p className="text-xs text-muted-foreground">Standard access</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viewers</CardTitle>
            <Eye className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{viewerCount}</div>
            <p className="text-xs text-muted-foreground">Read-only access</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="users">Users ({displayUsers.length})</TabsTrigger>
            <TabsTrigger value="organizations">Organizations ({organizations?.length || 0})</TabsTrigger>
          </TabsList>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Register User
          </Button>
        </div>

        {/* ── Users tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="member">Members</SelectItem>
                    <SelectItem value="viewer">Viewers</SelectItem>
                  </SelectContent>
                </Select>
                {organizations && organizations.length > 0 && (
                  <Select value={orgFilter} onValueChange={setOrgFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by org" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All organizations</SelectItem>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Orgs</TableHead>
                      <TableHead>App Roles</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          if (!user.isRegistered) {
                            toast({
                              title: "User not registered",
                              description: `${user.name} is not registered. Use the Register button to register this user before viewing their details.`,
                              variant: "destructive",
                            });
                            return;
                          }
                          router.push(`/dashboard/settings/users/${user.id}`);
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="font-medium">{user.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.emailAddress || <span className="italic">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isRegistered ? "outline" : "secondary"} className={user.isRegistered ? "text-green-600 border-green-300" : ""}>
                            {user.isRegistered ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariants[user.primaryRole]}>
                            {roleLabels[user.primaryRole]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{user.organizationCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.appRoles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {user.appRoles.slice(0, 2).map((r) => (
                                <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                              ))}
                              {user.appRoles.length > 2 && (
                                <Badge variant="outline" className="text-xs">+{user.appRoles.length - 2}</Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {user.isRegistered ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <UserCheck className="h-3.5 w-3.5 text-green-500" />
                              Already Registered
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={setRegistration.isPending}
                              onClick={() =>
                                setRegistration.mutate({ id: user.id, isRegistered: true }, {
                                  onSuccess: () => toast({ title: "User Registered", description: `${user.name} has been registered.` }),
                                  onError: (err) => toast({ title: "Failed", description: err instanceof Error ? err.message : "An error occurred", variant: "destructive" }),
                                })
                              }
                            >
                              {setRegistration.isPending && setRegistration.variables?.id === user.id
                                ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                : <UserPlus className="mr-1 h-3 w-3" />}
                              Register
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Organizations tab ─────────────────────────────────────────────── */}
        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>View all organizations and their members</CardDescription>
            </CardHeader>
            <CardContent>
              {!organizations || organizations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No organizations found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sites</TableHead>
                      <TableHead>Members</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow
                        key={org.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/settings/organization/${org.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{org.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{org.id.slice(0, 8)}…</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.active ? "default" : "secondary"} className={org.active ? "bg-green-600 hover:bg-green-600" : ""}>
                            {org.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{org.sites?.length ?? org.siteIds?.length ?? 0}</TableCell>
                        <TableCell>{org.organizationUserRoles?.length ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Register User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register User</DialogTitle>
            <DialogDescription>Register an Azure AD user into the MDC system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">Azure AD Object ID *</Label>
              <Input
                id="userId"
                placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Application Role</Label>
              <Select value={newUserAppRoles[0] || ""} onValueChange={(val) => setNewUserAppRoles(val ? [val] : [])}>
                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GlobalAdministrator">Global Administrator</SelectItem>
                  <SelectItem value="DatacenterTechnician">Datacenter Technician</SelectItem>
                  <SelectItem value="WorkspaceManager">Workspace Manager</SelectItem>
                  <SelectItem value="WorkspaceUser">Workspace User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Organization (optional)</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOrgId && (
              <div className="space-y-2">
                <Label>Organization Role</Label>
                <Select value={selectedOrgRole} onValueChange={setSelectedOrgRole}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin User">Admin User</SelectItem>
                    <SelectItem value="Standard User">Standard User</SelectItem>
                    <SelectItem value="Read Only">Read Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!newUserId.trim() || registerUser.isPending}
              onClick={() => {
                const descriptor: UserRegistrationDescriptor = {
                  id: newUserId.trim(),
                  applicationRoles: newUserAppRoles.length > 0 ? newUserAppRoles : undefined,
                  organizationRoles: selectedOrgId && selectedOrgRole
                    ? [{ organizationId: selectedOrgId, role: selectedOrgRole }]
                    : undefined,
                };
                registerUser.mutate(descriptor, {
                  onSuccess: () => {
                    toast({ title: "User Registered", description: "User has been registered successfully." });
                    setCreateDialogOpen(false);
                    setNewUserId("");
                    setNewUserAppRoles([]);
                    setSelectedOrgId("");
                    setSelectedOrgRole("");
                  },
                  onError: (err) => {
                    toast({ title: "Registration Failed", description: err instanceof Error ? err.message : "An error occurred", variant: "destructive" });
                  },
                });
              }}
            >
              {registerUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
