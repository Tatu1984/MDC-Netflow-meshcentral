"use client";

import { useState } from "react";
import {
  Key,
  Plus,
  Search,
  MoreHorizontal,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Clock,
  Shield,
  Eye,
  EyeOff,
  Calendar,
  Activity,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
  status: "active" | "expired" | "revoked";
  permissions: string[];
  createdBy: string;
}

// Mock data
const apiKeys: APIKey[] = [
  {
    id: "key-001",
    name: "Production API Key",
    prefix: "sk_prod_abc123",
    createdAt: "2024-06-15T10:00:00Z",
    expiresAt: null,
    lastUsed: "2026-01-12T09:45:00Z",
    status: "active",
    permissions: ["compute:read", "compute:write", "storage:read", "storage:write", "network:read"],
    createdBy: "John Smith",
  },
  {
    id: "key-002",
    name: "CI/CD Pipeline",
    prefix: "sk_prod_def456",
    createdAt: "2024-08-20T14:30:00Z",
    expiresAt: "2026-02-20T14:30:00Z",
    lastUsed: "2026-01-12T08:15:00Z",
    status: "active",
    permissions: ["compute:read", "compute:write", "storage:read", "storage:write"],
    createdBy: "Sarah Johnson",
  },
  {
    id: "key-003",
    name: "Monitoring Service",
    prefix: "sk_prod_ghi789",
    createdAt: "2024-10-01T09:00:00Z",
    expiresAt: "2026-04-01T09:00:00Z",
    lastUsed: "2026-01-11T23:59:00Z",
    status: "active",
    permissions: ["compute:read", "storage:read", "network:read", "billing:read"],
    createdBy: "Mike Chen",
  },
  {
    id: "key-004",
    name: "Development Testing",
    prefix: "sk_test_jkl012",
    createdAt: "2024-11-15T16:00:00Z",
    expiresAt: "2025-11-15T16:00:00Z",
    lastUsed: "2025-10-20T11:30:00Z",
    status: "expired",
    permissions: ["compute:read", "storage:read"],
    createdBy: "Emily Davis",
  },
  {
    id: "key-005",
    name: "Old Integration Key",
    prefix: "sk_prod_mno345",
    createdAt: "2024-03-01T12:00:00Z",
    expiresAt: null,
    lastUsed: "2024-09-15T10:00:00Z",
    status: "revoked",
    permissions: ["compute:read", "compute:write", "storage:read", "storage:write"],
    createdBy: "John Smith",
  },
  {
    id: "key-006",
    name: "Backup Automation",
    prefix: "sk_prod_pqr678",
    createdAt: "2025-01-05T08:00:00Z",
    expiresAt: "2026-01-05T08:00:00Z",
    lastUsed: "2026-01-12T02:00:00Z",
    status: "active",
    permissions: ["storage:read", "storage:write", "database:read", "database:write"],
    createdBy: "Lisa Brown",
  },
];

const availablePermissions = [
  { id: "compute:read", label: "Compute (Read)", category: "Compute" },
  { id: "compute:write", label: "Compute (Write)", category: "Compute" },
  { id: "storage:read", label: "Storage (Read)", category: "Storage" },
  { id: "storage:write", label: "Storage (Write)", category: "Storage" },
  { id: "network:read", label: "Network (Read)", category: "Network" },
  { id: "network:write", label: "Network (Write)", category: "Network" },
  { id: "database:read", label: "Database (Read)", category: "Database" },
  { id: "database:write", label: "Database (Write)", category: "Database" },
  { id: "billing:read", label: "Billing (Read)", category: "Billing" },
  { id: "admin:read", label: "Admin (Read)", category: "Admin" },
  { id: "admin:write", label: "Admin (Write)", category: "Admin" },
];

const statusConfig: Record<APIKey["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  expired: { label: "Expired", variant: "secondary" },
  revoked: { label: "Revoked", variant: "destructive" },
};

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function maskApiKey(prefix: string): string {
  return `${prefix}${"*".repeat(24)}`;
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyExpiration, setKeyExpiration] = useState("never");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);

  const filteredKeys = apiKeys.filter((key) => {
    const matchesSearch =
      key.name.toLowerCase().includes(search.toLowerCase()) ||
      key.prefix.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || key.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateKey = async () => {
    setIsCreating(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsCreating(false);
    // Show the newly created key
    setNewlyCreatedKey("sk_prod_xyz789abcdefghijklmnopqrstuvwxyz123456");
  };

  const handleCopyKey = (keyId: string, keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setKeyName("");
    setKeyExpiration("never");
    setSelectedPermissions([]);
    setNewlyCreatedKey(null);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleViewDetails = (key: APIKey) => {
    toast({
      title: "API Key Details",
      description: `Opening details for ${key.name}`,
    });
  };

  const handleViewUsage = (key: APIKey) => {
    toast({
      title: "API Key Usage",
      description: `Opening usage analytics for ${key.name}`,
    });
  };

  const handleRegenerateKey = (key: APIKey) => {
    toast({
      title: "Regenerate Key",
      description: `A new key will be generated for ${key.name}. The old key will be invalidated.`,
    });
  };

  const handleDeletePermanently = (key: APIKey) => {
    toast({
      title: "Delete Key",
      description: `${key.name} will be permanently deleted`,
      variant: "destructive",
    });
  };

  const activeKeysCount = apiKeys.filter((k) => k.status === "active").length;
  const expiredKeysCount = apiKeys.filter((k) => k.status === "expired").length;

  // Group permissions by category
  const permissionsByCategory = availablePermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof availablePermissions>);

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="API Keys"
        apis={[
          "GET /api/api-keys",
          "POST /api/api-keys",
          "DELETE /api/api-keys/{id}",
          "POST /api/api-keys/{id}/revoke"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access to your resources
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseCreateDialog();
          else setIsCreateDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            {newlyCreatedKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Created</DialogTitle>
                  <DialogDescription>
                    Your new API key has been created successfully
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <Alert className="border-yellow-500 bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Make sure to copy your API key now. You will not be able to see it again!
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="flex gap-2">
                      <code className="flex-1 block p-3 rounded-lg bg-muted font-mono text-sm break-all">
                        {newlyCreatedKey}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyKey("new", newlyCreatedKey)}
                      >
                        {copiedKey === "new" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseCreateDialog}>Done</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key with specific permissions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production API Key"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A descriptive name to identify this key
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiration">Expiration</Label>
                    <Select value={keyExpiration} onValueChange={setKeyExpiration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never expires</SelectItem>
                        <SelectItem value="30d">30 days</SelectItem>
                        <SelectItem value="90d">90 days</SelectItem>
                        <SelectItem value="180d">180 days</SelectItem>
                        <SelectItem value="1y">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Set an expiration date for enhanced security
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Permissions</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPermissions(availablePermissions.map((p) => p.id))}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPermissions([])}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select the permissions this API key should have
                    </p>

                    <div className="space-y-4">
                      {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="text-sm font-medium">{category}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {permissions.map((perm) => (
                              <div
                                key={perm.id}
                                className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                                onClick={() => togglePermission(perm.id)}
                              >
                                <Checkbox
                                  id={perm.id}
                                  checked={selectedPermissions.includes(perm.id)}
                                  onCheckedChange={() => togglePermission(perm.id)}
                                />
                                <Label htmlFor={perm.id} className="cursor-pointer text-sm">
                                  {perm.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseCreateDialog}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateKey}
                    disabled={!keyName || selectedPermissions.length === 0 || isCreating}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    {isCreating ? "Creating..." : "Create Key"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeKeysCount}</div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Keys</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredKeysCount}</div>
            <p className="text-xs text-muted-foreground">Need renewal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls (24h)</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,847</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or key prefix..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeys.map((key) => {
                const statusInfo = statusConfig[key.status];
                const isShowingKey = showKeyId === key.id;

                return (
                  <TableRow key={key.id} className={key.status !== "active" ? "opacity-60" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Created by {key.createdBy}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {isShowingKey ? key.prefix : maskApiKey(key.prefix.substring(0, 12))}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowKeyId(isShowingKey ? null : key.id)}
                        >
                          {isShowingKey ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyKey(key.id, key.prefix)}
                        >
                          {copiedKey === key.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {key.permissions.slice(0, 2).map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                        {key.permissions.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{key.permissions.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        {formatRelativeTime(key.lastUsed)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.expiresAt ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(key.expiresAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleCopyKey(key.id, key.prefix)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Key Prefix
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleViewDetails(key)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleViewUsage(key)}>
                            <Activity className="mr-2 h-4 w-4" />
                            View Usage
                          </DropdownMenuItem>
                          {key.status === "active" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => setKeyToRevoke(key)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Revoke Key
                              </DropdownMenuItem>
                            </>
                          )}
                          {key.status === "expired" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleRegenerateKey(key)}>
                                <Key className="mr-2 h-4 w-4" />
                                Regenerate Key
                              </DropdownMenuItem>
                            </>
                          )}
                          {key.status === "revoked" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onSelect={() => handleDeletePermanently(key)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Permanently
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Key className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No API keys found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreateDialogOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create your first API key
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Recommendations
          </CardTitle>
          <CardDescription>
            Best practices for managing your API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Check className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium">Use expiring keys</h4>
                <p className="text-sm text-muted-foreground">
                  Set expiration dates on your API keys to reduce risk if they are compromised
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Check className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium">Principle of least privilege</h4>
                <p className="text-sm text-muted-foreground">
                  Only grant the minimum permissions required for each API key
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-medium">Rotate keys regularly</h4>
                <p className="text-sm text-muted-foreground">
                  Consider rotating your API keys every 90 days for enhanced security
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg border">
              <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-medium">Monitor key usage</h4>
                <p className="text-sm text-muted-foreground">
                  Review API key activity regularly to detect unauthorized access
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revoke Key Confirmation Dialog */}
      <AlertDialog open={!!keyToRevoke} onOpenChange={() => setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to revoke the API key{" "}
                <strong className="text-foreground">{keyToRevoke?.name}</strong>?
              </p>
              <p className="text-yellow-600">
                Any applications or services using this key will immediately lose access.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
