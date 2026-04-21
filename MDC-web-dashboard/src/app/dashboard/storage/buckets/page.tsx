"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Archive,
  Lock,
  Unlock,
  Globe,
  Shield,
  Settings,
  Trash2,
  Copy,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  BarChart3,
  Clock,
  Eye,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { mockBuckets } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import { Bucket } from "@/types";

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper function to format numbers
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

// Storage class colors and labels
const storageClassConfig: Record<Bucket["storageClass"], { label: string; color: string }> = {
  standard: { label: "Standard", color: "bg-blue-500" },
  infrequent: { label: "Infrequent Access", color: "bg-yellow-500" },
  archive: { label: "Archive", color: "bg-gray-500" },
};

export default function BucketsPage() {
  const { currentProject } = useAuthStore();
  const [search, setSearch] = useState("");
  const [storageClassFilter, setStorageClassFilter] = useState<string>("all");
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bucketToDelete, setBucketToDelete] = useState<Bucket | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [lifecycleDialogOpen, setLifecycleDialogOpen] = useState(false);
  const [accessPoliciesDialogOpen, setAccessPoliciesDialogOpen] = useState(false);
  const [bucketForAction, setBucketForAction] = useState<Bucket | null>(null);
  const { toast } = useToast();

  const buckets = mockBuckets.filter((b) => b.projectId === currentProject?.id);

  const filteredBuckets = buckets.filter((bucket) => {
    const matchesSearch = bucket.name.toLowerCase().includes(search.toLowerCase());
    const matchesClass =
      storageClassFilter === "all" || bucket.storageClass === storageClassFilter;
    return matchesSearch && matchesClass;
  });

  // Calculate totals
  const totalStorage = buckets.reduce((sum, b) => sum + b.size, 0);
  const totalObjects = buckets.reduce((sum, b) => sum + b.objectCount, 0);
  const publicBuckets = buckets.filter((b) => b.publicAccess).length;
  const encryptedBuckets = buckets.filter((b) => b.encryption).length;

  // Calculate storage by class
  const storageByClass = {
    standard: buckets
      .filter((b) => b.storageClass === "standard")
      .reduce((sum, b) => sum + b.size, 0),
    infrequent: buckets
      .filter((b) => b.storageClass === "infrequent")
      .reduce((sum, b) => sum + b.size, 0),
    archive: buckets
      .filter((b) => b.storageClass === "archive")
      .reduce((sum, b) => sum + b.size, 0),
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Endpoint URL has been copied.",
    });
  };

  const handleBrowseObjects = (bucket: Bucket) => {
    toast({
      title: "Opening Browser",
      description: `Browsing objects in ${bucket.name}...`,
    });
  };

  const handleViewMetrics = (bucket: Bucket) => {
    toast({
      title: "Loading Metrics",
      description: `Loading metrics for ${bucket.name}...`,
    });
  };

  const handleOpenSettings = (bucket: Bucket) => {
    setBucketForAction(bucket);
    setSettingsDialogOpen(true);
  };

  const handleCopyEndpoint = (bucket: Bucket) => {
    const endpoint = `https://${bucket.name}.s3.${bucket.region}.cloudplatform.io`;
    navigator.clipboard.writeText(endpoint);
    toast({
      title: "Endpoint Copied",
      description: `${endpoint} has been copied to clipboard.`,
    });
  };

  const handleLifecycleRules = (bucket: Bucket) => {
    setBucketForAction(bucket);
    setLifecycleDialogOpen(true);
  };

  const handleAccessPolicies = (bucket: Bucket) => {
    setBucketForAction(bucket);
    setAccessPoliciesDialogOpen(true);
  };

  const openDeleteDialog = (bucket: Bucket) => {
    setBucketToDelete(bucket);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBucket = () => {
    if (!bucketToDelete) return;
    toast({
      title: "Bucket Deleted",
      description: `${bucketToDelete.name} has been deleted successfully.`,
      variant: "destructive",
    });
    setDeleteDialogOpen(false);
    setBucketToDelete(null);
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Object Storage (Buckets)"
        apis={[
          "GET /api/buckets",
          "POST /api/buckets",
          "PUT /api/buckets/{id}",
          "DELETE /api/buckets/{id}",
          "GET /api/buckets/{id}/objects",
          "PUT /api/buckets/{id}/lifecycle"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Object Storage</h1>
          <p className="text-muted-foreground">
            S3-compatible object storage buckets
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/storage/buckets/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Bucket
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalStorage)}</div>
            <p className="text-xs text-muted-foreground">
              Across {buckets.length} buckets
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Objects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalObjects)}</div>
            <p className="text-xs text-muted-foreground">
              Files and folders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <span className="text-2xl text-muted-foreground">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((totalStorage / (1024 * 1024 * 1024)) * 0.023).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              $0.023 per GB/month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {encryptedBuckets}/{buckets.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Encrypted buckets, {publicBuckets} public
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storage Distribution by Class</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary">
              {totalStorage > 0 && (
                <>
                  <div
                    className="bg-blue-500 transition-all"
                    style={{
                      width: `${(storageByClass.standard / totalStorage) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-yellow-500 transition-all"
                    style={{
                      width: `${(storageByClass.infrequent / totalStorage) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-gray-500 transition-all"
                    style={{
                      width: `${(storageByClass.archive / totalStorage) * 100}%`,
                    }}
                  />
                </>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span>Standard: {formatBytes(storageByClass.standard)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span>Infrequent: {formatBytes(storageByClass.infrequent)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-500" />
                <span>Archive: {formatBytes(storageByClass.archive)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buckets List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search buckets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={storageClassFilter} onValueChange={setStorageClassFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by storage class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All storage classes</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="infrequent">Infrequent Access</SelectItem>
                <SelectItem value="archive">Archive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Objects</TableHead>
                <TableHead>Storage Class</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuckets.map((bucket) => (
                <TableRow key={bucket.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              className="font-medium hover:underline text-left"
                              onClick={() => setSelectedBucket(bucket)}
                            >
                              {bucket.name}
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Bucket Details: {bucket.name}</DialogTitle>
                              <DialogDescription>
                                Configuration and settings for this bucket
                              </DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="overview" className="mt-4">
                              <TabsList>
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="settings">Settings</TabsTrigger>
                                <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
                              </TabsList>
                              <TabsContent value="overview" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Size</p>
                                    <p className="font-medium">{formatBytes(bucket.size)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Objects</p>
                                    <p className="font-medium">{formatNumber(bucket.objectCount)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Storage Class</p>
                                    <p className="font-medium">{storageClassConfig[bucket.storageClass].label}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Region</p>
                                    <p className="font-medium">{bucket.region}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Created</p>
                                    <p className="font-medium">
                                      {new Date(bucket.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Monthly Cost</p>
                                    <p className="font-medium">
                                      ${((bucket.size / (1024 * 1024 * 1024)) * 0.023).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">Endpoint</p>
                                  <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs bg-muted px-2 py-1 rounded">
                                      https://{bucket.name}.s3.{bucket.region}.cloudplatform.io
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() =>
                                        copyToClipboard(
                                          `https://${bucket.name}.s3.${bucket.region}.cloudplatform.io`
                                        )
                                      }
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </TabsContent>
                              <TabsContent value="settings" className="space-y-4 pt-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <Label>Versioning</Label>
                                    <p className="text-sm text-muted-foreground">
                                      Keep multiple versions of objects
                                    </p>
                                  </div>
                                  <Switch checked={bucket.versioning} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <Label>Encryption</Label>
                                    <p className="text-sm text-muted-foreground">
                                      Server-side encryption at rest
                                    </p>
                                  </div>
                                  <Switch checked={bucket.encryption} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <Label>Public Access</Label>
                                    <p className="text-sm text-muted-foreground">
                                      Allow public read access
                                    </p>
                                  </div>
                                  <Switch checked={bucket.publicAccess} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <Label>CORS</Label>
                                    <p className="text-sm text-muted-foreground">
                                      Cross-origin resource sharing
                                    </p>
                                  </div>
                                  <Switch checked={bucket.cors || false} />
                                </div>
                              </TabsContent>
                              <TabsContent value="lifecycle" className="space-y-4 pt-4">
                                {bucket.lifecycle?.enabled ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                      <div className="h-2 w-2 rounded-full bg-green-500" />
                                      Lifecycle rules enabled
                                    </div>
                                    {bucket.lifecycle.rules.map((rule) => (
                                      <div
                                        key={rule.id}
                                        className="rounded-lg border p-3 space-y-2"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{rule.name}</span>
                                          <Badge
                                            variant={rule.enabled ? "default" : "secondary"}
                                          >
                                            {rule.enabled ? "Active" : "Disabled"}
                                          </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                          {rule.prefix && (
                                            <p>Prefix: {rule.prefix}</p>
                                          )}
                                          {rule.transitionDays && (
                                            <p>
                                              Transition to {rule.transitionClass} after{" "}
                                              {rule.transitionDays} days
                                            </p>
                                          )}
                                          {rule.expirationDays && (
                                            <p>Delete after {rule.expirationDays} days</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <Clock className="h-8 w-8 mx-auto mb-2" />
                                    <p>No lifecycle rules configured</p>
                                    <Button variant="outline" size="sm" className="mt-2">
                                      Add Lifecycle Rule
                                    </Button>
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(bucket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatBytes(bucket.size)}</span>
                  </TableCell>
                  <TableCell>{formatNumber(bucket.objectCount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 w-fit"
                    >
                      <div
                        className={`h-2 w-2 rounded-full ${storageClassConfig[bucket.storageClass].color}`}
                      />
                      {storageClassConfig[bucket.storageClass].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {bucket.versioning && (
                        <Badge variant="secondary" className="text-xs">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Versioning
                        </Badge>
                      )}
                      {bucket.encryption ? (
                        <Badge variant="secondary" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Encrypted
                        </Badge>
                      ) : null}
                      {bucket.publicAccess && (
                        <Badge variant="destructive" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{bucket.region}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleBrowseObjects(bucket)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Browse Objects
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleViewMetrics(bucket)}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          View Metrics
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleOpenSettings(bucket)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Bucket Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleCopyEndpoint(bucket)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Endpoint
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleLifecycleRules(bucket)}>
                          <Clock className="mr-2 h-4 w-4" />
                          Lifecycle Rules
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleAccessPolicies(bucket)}>
                          <Shield className="mr-2 h-4 w-4" />
                          Access Policies
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => openDeleteDialog(bucket)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Bucket
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBuckets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Archive className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No buckets found</p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/storage/buckets/create">
                          <Plus className="mr-2 h-4 w-4" />
                          Create your first bucket
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bucket Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bucket Settings</DialogTitle>
            <DialogDescription>
              Configure settings for {bucketForAction?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Versioning</Label>
                <p className="text-sm text-muted-foreground">
                  Keep multiple versions of objects
                </p>
              </div>
              <Switch checked={bucketForAction?.versioning} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Encryption</Label>
                <p className="text-sm text-muted-foreground">
                  Server-side encryption at rest
                </p>
              </div>
              <Switch checked={bucketForAction?.encryption} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public Access</Label>
                <p className="text-sm text-muted-foreground">
                  Allow public read access
                </p>
              </div>
              <Switch checked={bucketForAction?.publicAccess} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Settings Updated",
                description: `${bucketForAction?.name} settings have been updated.`,
              });
              setSettingsDialogOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lifecycle Rules Dialog */}
      <Dialog open={lifecycleDialogOpen} onOpenChange={setLifecycleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lifecycle Rules</DialogTitle>
            <DialogDescription>
              Manage lifecycle rules for {bucketForAction?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {bucketForAction?.lifecycle?.enabled ? (
              <div className="space-y-3">
                {bucketForAction.lifecycle.rules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No lifecycle rules configured</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLifecycleDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              toast({
                title: "Add Lifecycle Rule",
                description: "Opening lifecycle rule editor...",
              });
            }}>
              Add Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Policies Dialog */}
      <Dialog open={accessPoliciesDialogOpen} onOpenChange={setAccessPoliciesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Access Policies</DialogTitle>
            <DialogDescription>
              Manage access policies for {bucketForAction?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Default Policy</p>
                    <p className="text-sm text-muted-foreground">
                      {bucketForAction?.publicAccess ? "Public read access enabled" : "Private access only"}
                    </p>
                  </div>
                  <Badge variant={bucketForAction?.publicAccess ? "destructive" : "default"}>
                    {bucketForAction?.publicAccess ? "Public" : "Private"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessPoliciesDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              toast({
                title: "Edit Policy",
                description: "Opening policy editor...",
              });
            }}>
              Edit Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bucket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {bucketToDelete?.name}? This action cannot be undone.
              All objects in the bucket will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBucket}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Bucket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
