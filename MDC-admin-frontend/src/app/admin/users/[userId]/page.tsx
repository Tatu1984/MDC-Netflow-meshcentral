"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Pencil,
  Plus,
  X,
  UserMinus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useUser,
  useOrganizations,
  useUpdateUser,
  useDeleteUser,
  useSetUserRegistration,
} from "@/lib/mdc/hooks";
import { UserOrganizationRole } from "@/lib/mdc/types";
import { useToast } from "@/hooks/use-toast";

// ── App role badge ────────────────────────────────────────────────────────────

function AppRoleBadge({ role }: { role: string }) {
  const lower = role.toLowerCase();
  const cls =
    lower.includes("global") || lower.includes("admin")
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      : lower.includes("manager") || lower.includes("workspace")
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {role}
    </span>
  );
}

// ── Org role badge ────────────────────────────────────────────────────────────

function OrgRoleBadge({ role }: { role: string }) {
  const lower = role.toLowerCase();
  const cls =
    lower === "admin"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      : lower === "manager"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      : lower === "developer"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : lower === "user"
      ? "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
      : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {role}
    </span>
  );
}

// ── Initials helper ───────────────────────────────────────────────────────────

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Edit Permissions Dialog ───────────────────────────────────────────────────

const APP_ROLES = [
  "GlobalAdministrator",
  "DatacenterTechnician",
  "WorkspaceManager",
  "WorkspaceUser",
];

const ORG_ROLES = ["admin", "manager", "developer", "user"];

interface EditPermissionsDialogProps {
  userId: string;
  currentAppRoles: string[];
  currentOrgRoles: UserOrganizationRole[];
  organizations: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

function EditPermissionsDialog({
  userId,
  currentAppRoles,
  currentOrgRoles,
  organizations,
  onSuccess,
}: EditPermissionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [appRoles, setAppRoles] = useState<string[]>(currentAppRoles);
  const [orgRoles, setOrgRoles] =
    useState<UserOrganizationRole[]>(currentOrgRoles);
  const [newOrgId, setNewOrgId] = useState("");
  const [newOrgRole, setNewOrgRole] = useState("user");
  const [newAppRole, setNewAppRole] = useState("");
  const { mutateAsync: updateUser, isPending } = useUpdateUser();
  const { toast } = useToast();

  const handleOpen = (val: boolean) => {
    if (val) {
      setAppRoles(currentAppRoles);
      setOrgRoles(currentOrgRoles);
      setNewOrgId("");
      setNewOrgRole("user");
      setNewAppRole("");
    }
    setOpen(val);
  };

  const addAppRole = () => {
    if (newAppRole && !appRoles.includes(newAppRole)) {
      setAppRoles((prev) => [...prev, newAppRole]);
      setNewAppRole("");
    }
  };

  const removeAppRole = (role: string) => {
    setAppRoles((prev) => prev.filter((r) => r !== role));
  };

  const addOrgRole = () => {
    if (!newOrgId) return;
    const exists = orgRoles.some(
      (r) => r.organizationId === newOrgId && r.role === newOrgRole
    );
    if (!exists) {
      setOrgRoles((prev) => [
        ...prev,
        { organizationId: newOrgId, role: newOrgRole },
      ]);
    }
    setNewOrgId("");
    setNewOrgRole("user");
  };

  const removeOrgRole = (orgId: string, role: string) => {
    setOrgRoles((prev) =>
      prev.filter((r) => !(r.organizationId === orgId && r.role === role))
    );
  };

  const handleSave = async () => {
    const addApplicationRoles = appRoles.filter(
      (r) => !currentAppRoles.includes(r)
    );
    const removeApplicationRoles = currentAppRoles.filter(
      (r) => !appRoles.includes(r)
    );
    const addOrganizationRoles = orgRoles.filter(
      (r) =>
        !currentOrgRoles.some(
          (c) => c.organizationId === r.organizationId && c.role === r.role
        )
    );
    const removeOrganizationRoles = currentOrgRoles.filter(
      (c) =>
        !orgRoles.some(
          (r) => r.organizationId === c.organizationId && r.role === c.role
        )
    );

    try {
      await updateUser({
        id: userId,
        descriptor: {
          addApplicationRoles: addApplicationRoles.length
            ? addApplicationRoles
            : undefined,
          removeApplicationRoles: removeApplicationRoles.length
            ? removeApplicationRoles
            : undefined,
          addOrganizationRoles: addOrganizationRoles.length
            ? addOrganizationRoles
            : undefined,
          removeOrganizationRoles: removeOrganizationRoles.length
            ? removeOrganizationRoles
            : undefined,
        },
      });
      toast({
        title: "Permissions updated",
        description: "User permissions have been saved successfully.",
      });
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast({
        title: "Failed to save",
        description:
          err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const getOrgName = (id: string) =>
    organizations.find((o) => o.id === id)?.name ?? id;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Edit Permissions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Permissions</DialogTitle>
          <DialogDescription>
            Manage platform roles and organization memberships for this user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Platform roles */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Platform Roles</Label>
            <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
              {appRoles.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                  No roles assigned
                </span>
              )}
              {appRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                >
                  {role}
                  <button
                    type="button"
                    onClick={() => removeAppRole(role)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={newAppRole} onValueChange={setNewAppRole}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {APP_ROLES.filter((r) => !appRoles.includes(r)).map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 px-3"
                onClick={addAppRole}
                disabled={!newAppRole}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          <div className="border-t" />

          {/* Org memberships */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">
                Organization Memberships
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add or remove this user from organizations.
              </p>
            </div>

            {orgRoles.length === 0 ? (
              <div className="rounded-lg border border-dashed py-6 text-center">
                <Building2 className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground opacity-50" />
                <p className="text-xs text-muted-foreground">
                  No organization memberships
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-lg border overflow-hidden">
                {orgRoles.map((r) => (
                  <div
                    key={`${r.organizationId}-${r.role}`}
                    className="flex items-center justify-between px-3 py-2.5 bg-background gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {getOrgName(r.organizationId)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {r.organizationId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <OrgRoleBadge role={r.role} />
                      <button
                        type="button"
                        onClick={() =>
                          removeOrgRole(r.organizationId, r.role)
                        }
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new membership */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Add Membership
              </p>
              <div className="flex gap-2">
                <Select value={newOrgId} onValueChange={setNewOrgId}>
                  <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue placeholder="Select organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newOrgRole} onValueChange={setNewOrgRole}>
                  <SelectTrigger className="w-32 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-9 px-3 shrink-0"
                  onClick={addOrgRole}
                  disabled={!newOrgId}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { toast } = useToast();

  const {
    data: user,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useUser(userId);
  const { data: organizations } = useOrganizations();
  const { mutateAsync: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutateAsync: setRegistration, isPending: isSettingRegistration } =
    useSetUserRegistration();

  const [unregisterOpen, setUnregisterOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const getOrgName = (id: string) =>
    organizations?.find((o) => o.id === id)?.name ?? id;

  const orgList =
    organizations?.map((o) => ({ id: o.id, name: o.name })) ?? [];

  // Group org roles by organizationId (case-insensitive dedup)
  const groupedOrgRoles = (() => {
    if (!user?.organizationRoles?.length) return [];
    const map = new Map<string, string[]>();
    for (const r of user.organizationRoles) {
      const existing = map.get(r.organizationId) ?? [];
      if (!existing.some((e) => e.toLowerCase() === r.role.toLowerCase())) {
        existing.push(r.role);
      }
      map.set(r.organizationId, existing);
    }
    return Array.from(map.entries()).map(([orgId, roles]) => ({
      orgId,
      roles,
    }));
  })();

  const handleDelete = async () => {
    await deleteUser(userId);
    router.push("/admin/users");
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
            <h1 className="text-3xl font-bold tracking-tight">
              {user?.displayName ?? "User"}
            </h1>
          )}
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {userId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          {user && (
            <>
              {user.isRegistered && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSettingRegistration}
                    onClick={() => setUnregisterOpen(true)}
                  >
                    {isSettingRegistration ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="mr-2 h-4 w-4" />
                    )}
                    Unregister
                  </Button>
                  <AlertDialog open={unregisterOpen} onOpenChange={setUnregisterOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Unregister user?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark{" "}
                          <span className="font-semibold text-foreground">
                            {user.displayName || userId}
                          </span>{" "}
                          as unregistered on the MDC platform. They will lose
                          access until re-registered.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSettingRegistration}>
                          Cancel
                        </AlertDialogCancel>
                        <Button
                          onClick={async () => {
                            try {
                              await setRegistration({
                                id: userId,
                                isRegistered: false,
                              });
                              setUnregisterOpen(false);
                              refetch();
                              toast({
                                title: "User Unregistered",
                                description:
                                  "The user has been marked as unregistered.",
                              });
                            } catch (err) {
                              toast({
                                title: "Failed",
                                description:
                                  err instanceof Error
                                    ? err.message
                                    : "An error occurred",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={isSettingRegistration}
                        >
                          {isSettingRegistration && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Unregister
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              <EditPermissionsDialog
                userId={userId}
                currentAppRoles={user.appRoles ?? []}
                currentOrgRoles={user.organizationRoles ?? []}
                organizations={orgList}
                onSuccess={() => refetch()}
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteOpen(true)}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete User
              </Button>
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete user?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete{" "}
                      <span className="font-semibold text-foreground">
                        {user.displayName || userId}
                      </span>{" "}
                      from the MDC platform. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await handleDelete();
                          setDeleteOpen(false);
                        } catch (err) {
                          toast({
                            title: "Failed",
                            description:
                              err instanceof Error
                                ? err.message
                                : "An error occurred",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={isDeleting}
                    >
                      {isDeleting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Delete
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error */}
      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-center text-muted-foreground">
            Failed to load user.{" "}
            <Button variant="link" className="px-1" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Not-registered banner */}
      {user && !user.isRegistered && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  User not registered
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  This user has not been registered on the MDC platform and
                  cannot access resources.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-900/30"
              disabled={isSettingRegistration}
              onClick={async () => {
                try {
                  await setRegistration({ id: userId, isRegistered: true });
                  refetch();
                  toast({
                    title: "User Registered",
                    description: `${user.displayName || userId} has been registered successfully.`,
                  });
                } catch (err) {
                  toast({
                    title: "Failed",
                    description:
                      err instanceof Error
                        ? err.message
                        : "An error occurred",
                    variant: "destructive",
                  });
                }
              }}
            >
              {isSettingRegistration ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Register Now
            </Button>
          </CardContent>
        </Card>
      )}

      {user && (
        <>
          {/* Profile card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 shrink-0">
                  <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                    {initials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <dl className="grid grid-cols-1 gap-y-3 sm:grid-cols-2 flex-1">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Display Name
                    </dt>
                    <dd className="mt-1 font-medium">
                      {user.displayName || (
                        <span className="italic text-muted-foreground">
                          —
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      Status
                    </dt>
                    <dd className="mt-1">
                      {user.isRegistered ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-500 text-sm font-medium">
                          <XCircle className="h-3.5 w-3.5" /> Not Registered
                        </span>
                      )}
                    </dd>
                  </div>
                  {user.emailAddress && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email
                      </dt>
                      <dd className="mt-1 text-sm">{user.emailAddress}</dd>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide">
                      User ID
                    </dt>
                    <dd className="mt-1 font-mono text-xs text-muted-foreground break-all">
                      {user.id}
                    </dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>

          {/* App Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Platform Roles
                {(user.appRoles?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {user.appRoles!.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Global roles assigned on the MDC platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(user.appRoles?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No platform roles assigned</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.appRoles!.map((role) => (
                    <AppRoleBadge key={role} role={role} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organization Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Organization Memberships
                {groupedOrgRoles.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {groupedOrgRoles.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {groupedOrgRoles.length === 0
                  ? "Not a member of any organization"
                  : `Member of ${groupedOrgRoles.length} organization${groupedOrgRoles.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupedOrgRoles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No organization memberships</p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border overflow-hidden">
                  {groupedOrgRoles.map(({ orgId, roles }) => (
                    <div
                      key={orgId}
                      className="flex items-center justify-between px-4 py-3 bg-background gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getOrgName(orgId)}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {orgId}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {roles.map((r) => (
                          <OrgRoleBadge key={r} role={r} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
