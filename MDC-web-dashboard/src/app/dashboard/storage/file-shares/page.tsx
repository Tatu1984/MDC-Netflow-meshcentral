"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  FolderOpen,
  Server,
  Shield,
  Settings,
  Trash2,
  Copy,
  Users,
  HardDrive,
  Zap,
  Network,
  Terminal,
  Eye,
  Edit,
  RefreshCw,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
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
import { Label } from "@/components/ui/label";
import { mockFileShares } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import { FileShare } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Protocol configuration
const protocolConfig: Record<FileShare["protocol"], { label: string; icon: string; color: string }> = {
  nfs: { label: "NFS v4", icon: "linux", color: "bg-orange-500" },
  smb: { label: "SMB/CIFS", icon: "windows", color: "bg-blue-500" },
  "nfs-smb": { label: "NFS + SMB", icon: "both", color: "bg-purple-500" },
};

// Performance tier configuration
const tierConfig: Record<FileShare["performanceTier"], { label: string; iops: string; throughput: string; color: string }> = {
  standard: { label: "Standard", iops: "3,000 IOPS", throughput: "125 MB/s", color: "text-gray-500" },
  premium: { label: "Premium", iops: "16,000 IOPS", throughput: "500 MB/s", color: "text-blue-500" },
  extreme: { label: "Extreme", iops: "100,000 IOPS", throughput: "2,000 MB/s", color: "text-purple-500" },
};

// Status badge variants
const statusConfig: Record<FileShare["status"], { variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  available: { variant: "default", color: "bg-green-500" },
  creating: { variant: "outline", color: "bg-blue-500" },
  error: { variant: "destructive", color: "bg-red-500" },
  deleting: { variant: "secondary", color: "bg-yellow-500" },
};

export default function FileSharesPage() {
  const { toast } = useToast();
  const { currentProject } = useAuthStore();
  const [search, setSearch] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [selectedShare, setSelectedShare] = useState<FileShare | null>(null);

  // Dialog states
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [mountInstructionsOpen, setMountInstructionsOpen] = useState(false);
  const [accessControlOpen, setAccessControlOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [deleteShareOpen, setDeleteShareOpen] = useState(false);

  // ACL rule dialog states
  const [editRuleOpen, setEditRuleOpen] = useState(false);
  const [deleteRuleOpen, setDeleteRuleOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<FileShare["accessControl"][0] | null>(null);

  const fileShares = mockFileShares.filter((fs) => fs.projectId === currentProject?.id);

  const filteredShares = fileShares.filter((share) => {
    const matchesSearch = share.name.toLowerCase().includes(search.toLowerCase());
    const matchesProtocol = protocolFilter === "all" || share.protocol === protocolFilter;
    const matchesTier = tierFilter === "all" || share.performanceTier === tierFilter;
    return matchesSearch && matchesProtocol && matchesTier;
  });

  // Calculate totals
  const totalCapacity = fileShares.reduce((sum, fs) => sum + fs.size, 0);
  const totalUsed = fileShares.reduce((sum, fs) => sum + fs.used, 0);
  const availableShares = fileShares.filter((fs) => fs.status === "available").length;

  // Calculate by protocol
  const sharesByProtocol = {
    nfs: fileShares.filter((fs) => fs.protocol === "nfs" || fs.protocol === "nfs-smb").length,
    smb: fileShares.filter((fs) => fs.protocol === "smb" || fs.protocol === "nfs-smb").length,
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Generate mount commands
  const getMountCommand = (share: FileShare, type: "nfs" | "smb") => {
    if (type === "nfs") {
      return `sudo mount -t nfs4 ${share.mountTarget} /mnt/${share.name}`;
    } else {
      const smbPath = share.protocol === "smb"
        ? share.mountTarget
        : share.mountTarget.replace(":/", "\\\\").replace("/", "\\");
      return `mount -t cifs //${smbPath.replace("\\\\", "").replace("\\", "/")} /mnt/${share.name} -o username=USER,password=PASS`;
    }
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="File Shares"
        apis={[
          "GET /api/file-shares",
          "POST /api/file-shares",
          "PUT /api/file-shares/{id}",
          "DELETE /api/file-shares/{id}",
          "PUT /api/file-shares/{id}/acl"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Shares</h1>
          <p className="text-muted-foreground">
            Managed NFS and SMB file storage
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/storage/file-shares/create">
            <Plus className="mr-2 h-4 w-4" />
            Create File Share
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalCapacity / 1000).toFixed(1)} TB</div>
            <Progress value={(totalUsed / totalCapacity) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {totalUsed} GB used of {totalCapacity} GB
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">File Shares</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fileShares.length}</div>
            <p className="text-xs text-muted-foreground">
              {availableShares} available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocol Support</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-sm">NFS: {sharesByProtocol.nfs}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm">SMB: {sharesByProtocol.smb}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <span className="text-2xl text-muted-foreground">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalCapacity * 0.15).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              $0.15 per GB/month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* File Shares List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search file shares..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={protocolFilter} onValueChange={setProtocolFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Protocol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All protocols</SelectItem>
                <SelectItem value="nfs">NFS</SelectItem>
                <SelectItem value="smb">SMB</SelectItem>
                <SelectItem value="nfs-smb">NFS + SMB</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Performance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="extreme">Extreme</SelectItem>
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
                <TableHead>Protocol</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShares.map((share) => (
                <TableRow key={share.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              className="font-medium hover:underline text-left"
                              onClick={() => setSelectedShare(share)}
                            >
                              {share.name}
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>File Share: {share.name}</DialogTitle>
                              <DialogDescription>
                                Managed file storage details and mount information
                              </DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="overview" className="mt-4">
                              <TabsList>
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="mount">Mount Instructions</TabsTrigger>
                                <TabsTrigger value="access">Access Control</TabsTrigger>
                              </TabsList>
                              <TabsContent value="overview" className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Size</p>
                                    <p className="font-medium">{share.size} GB</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Used</p>
                                    <p className="font-medium">{share.used} GB ({Math.round((share.used / share.size) * 100)}%)</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Protocol</p>
                                    <p className="font-medium">{protocolConfig[share.protocol].label}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Performance Tier</p>
                                    <p className={`font-medium ${tierConfig[share.performanceTier].color}`}>
                                      {tierConfig[share.performanceTier].label}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Region / Zone</p>
                                    <p className="font-medium">{share.region} / {share.zone}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Created</p>
                                    <p className="font-medium">
                                      {new Date(share.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">Performance Specifications</p>
                                  <div className="grid grid-cols-2 gap-4 rounded-lg border p-3">
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm">{tierConfig[share.performanceTier].iops}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Network className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm">{tierConfig[share.performanceTier].throughput}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Storage Usage</span>
                                    <span>{share.used} / {share.size} GB</span>
                                  </div>
                                  <Progress value={(share.used / share.size) * 100} />
                                </div>
                              </TabsContent>
                              <TabsContent value="mount" className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">Mount Target</p>
                                  <div className="flex items-center gap-2">
                                    <code className="flex-1 text-xs bg-muted px-2 py-1 rounded">
                                      {share.mountTarget}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => copyToClipboard(share.mountTarget)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                {(share.protocol === "nfs" || share.protocol === "nfs-smb") && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Terminal className="h-4 w-4" />
                                      <p className="text-sm font-medium">NFS Mount Command (Linux/macOS)</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono">
                                        {getMountCommand(share, "nfs")}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => copyToClipboard(getMountCommand(share, "nfs"))}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {(share.protocol === "smb" || share.protocol === "nfs-smb") && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Terminal className="h-4 w-4" />
                                      <p className="text-sm font-medium">SMB Mount Command (Linux)</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">
                                        {getMountCommand(share, "smb")}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => copyToClipboard(getMountCommand(share, "smb"))}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      For Windows, use: net use Z: {share.protocol === "smb" ? share.mountTarget : `\\\\${share.mountTarget.split(":")[0].replace(".", "\\")}`}
                                    </p>
                                  </div>
                                )}
                              </TabsContent>
                              <TabsContent value="access" className="space-y-4 pt-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">Access Control List</p>
                                  <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Rule
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {share.accessControl.map((acl) => (
                                    <div
                                      key={acl.id}
                                      className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Network className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                          <p className="font-medium font-mono text-sm">{acl.cidr}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Squash: {acl.squash}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={
                                            acl.permission === "admin"
                                              ? "destructive"
                                              : acl.permission === "read-write"
                                              ? "default"
                                              : "secondary"
                                          }
                                        >
                                          {acl.permission}
                                        </Badge>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onSelect={() => {
                                                setSelectedRule(acl);
                                                setEditRuleOpen(true);
                                              }}
                                            >
                                              <Edit className="mr-2 h-4 w-4" />
                                              Edit Rule
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-destructive"
                                              onSelect={() => {
                                                setSelectedRule(acl);
                                                setDeleteRuleOpen(true);
                                              }}
                                            >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              Delete Rule
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                        <p className="text-xs text-muted-foreground">
                          {share.zone}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 w-fit"
                    >
                      <div className={`h-2 w-2 rounded-full ${protocolConfig[share.protocol].color}`} />
                      {protocolConfig[share.protocol].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{share.size} GB</span>
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>{share.used} GB</span>
                        <span className="text-muted-foreground">
                          {Math.round((share.used / share.size) * 100)}%
                        </span>
                      </div>
                      <Progress value={(share.used / share.size) * 100} className="h-1.5" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Zap className={`h-3 w-3 ${tierConfig[share.performanceTier].color}`} />
                      <span className={`text-sm ${tierConfig[share.performanceTier].color}`}>
                        {tierConfig[share.performanceTier].label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[share.status].variant}>
                      <div className={`h-2 w-2 rounded-full mr-1 ${statusConfig[share.status].color}`} />
                      {share.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{share.region}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setSelectedShare(share);
                            setViewDetailsOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setSelectedShare(share);
                            setMountInstructionsOpen(true);
                          }}
                        >
                          <Terminal className="mr-2 h-4 w-4" />
                          Mount Instructions
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            copyToClipboard(share.mountTarget);
                            toast({
                              title: "Copied to clipboard",
                              description: "Mount target has been copied.",
                            });
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Mount Target
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => {
                            setSelectedShare(share);
                            setAccessControlOpen(true);
                          }}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Access Control
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setSelectedShare(share);
                            setSettingsOpen(true);
                          }}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setSelectedShare(share);
                            setResizeOpen(true);
                          }}
                        >
                          <HardDrive className="mr-2 h-4 w-4" />
                          Resize
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => {
                            setSelectedShare(share);
                            setDeleteShareOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete File Share
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredShares.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FolderOpen className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No file shares found</p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/storage/file-shares/create">
                          <Plus className="mr-2 h-4 w-4" />
                          Create your first file share
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

      {/* Performance Tiers Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Tiers</CardTitle>
          <CardDescription>Compare available performance options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gray-500" />
                <h4 className="font-medium">Standard</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Cost-effective storage for general workloads
              </p>
              <div className="space-y-1 text-sm">
                <p>Up to 3,000 IOPS</p>
                <p>125 MB/s throughput</p>
                <p className="font-medium text-green-600">$0.10/GB/month</p>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <h4 className="font-medium text-blue-700">Premium</h4>
                <Badge variant="secondary" className="text-xs">Popular</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                High performance for demanding applications
              </p>
              <div className="space-y-1 text-sm">
                <p>Up to 16,000 IOPS</p>
                <p>500 MB/s throughput</p>
                <p className="font-medium text-green-600">$0.20/GB/month</p>
              </div>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <h4 className="font-medium text-purple-700">Extreme</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Maximum performance for critical workloads
              </p>
              <div className="space-y-1 text-sm">
                <p>Up to 100,000 IOPS</p>
                <p>2,000 MB/s throughput</p>
                <p className="font-medium text-green-600">$0.35/GB/month</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>File Share Details</DialogTitle>
            <DialogDescription>
              Details for {selectedShare?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Size</Label>
                <p className="font-medium">{selectedShare?.size} GB</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Used</Label>
                <p className="font-medium">{selectedShare?.used} GB</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Protocol</Label>
                <p className="font-medium">{selectedShare && protocolConfig[selectedShare.protocol].label}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Performance</Label>
                <p className="font-medium">{selectedShare && tierConfig[selectedShare.performanceTier].label}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Region</Label>
                <p className="font-medium">{selectedShare?.region}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Zone</Label>
                <p className="font-medium">{selectedShare?.zone}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mount Instructions Dialog */}
      <Dialog open={mountInstructionsOpen} onOpenChange={setMountInstructionsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Mount Instructions</DialogTitle>
            <DialogDescription>
              Commands to mount {selectedShare?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mount Target</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded">
                  {selectedShare?.mountTarget}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedShare) copyToClipboard(selectedShare.mountTarget);
                    toast({ title: "Copied!", description: "Mount target copied to clipboard." });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {selectedShare && (selectedShare.protocol === "nfs" || selectedShare.protocol === "nfs-smb") && (
              <div className="space-y-2">
                <Label>NFS Mount (Linux/macOS)</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono">
                    {getMountCommand(selectedShare, "nfs")}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedShare) copyToClipboard(getMountCommand(selectedShare, "nfs"));
                      toast({ title: "Copied!", description: "NFS mount command copied." });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMountInstructionsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Control Dialog */}
      <Dialog open={accessControlOpen} onOpenChange={setAccessControlOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Access Control</DialogTitle>
            <DialogDescription>
              Manage access rules for {selectedShare?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedShare?.accessControl.map((acl) => (
              <div key={acl.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-mono text-sm">{acl.cidr}</p>
                  <p className="text-xs text-muted-foreground">{acl.permission}</p>
                </div>
                <Badge variant={acl.permission === "admin" ? "destructive" : "default"}>
                  {acl.permission}
                </Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessControlOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>File Share Settings</DialogTitle>
            <DialogDescription>
              Update settings for {selectedShare?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fs-name">Name</Label>
              <Input id="fs-name" defaultValue={selectedShare?.name} />
            </div>
            <div className="grid gap-2">
              <Label>Performance Tier</Label>
              <Select defaultValue={selectedShare?.performanceTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="extreme">Extreme</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setSettingsOpen(false);
              toast({
                title: "Settings updated",
                description: `Settings for ${selectedShare?.name} have been updated.`,
              });
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resize Dialog */}
      <Dialog open={resizeOpen} onOpenChange={setResizeOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Resize File Share</DialogTitle>
            <DialogDescription>
              Increase the capacity of {selectedShare?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Current Size</Label>
              <p className="font-medium">{selectedShare?.size} GB</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-size">New Size (GB)</Label>
              <Input id="new-size" type="number" defaultValue={selectedShare?.size} min={selectedShare?.size} />
              <p className="text-xs text-muted-foreground">
                File shares can only be increased in size, not decreased.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResizeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setResizeOpen(false);
              toast({
                title: "Resize initiated",
                description: `${selectedShare?.name} is being resized.`,
              });
            }}>
              Resize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete File Share Confirmation */}
      <AlertDialog open={deleteShareOpen} onOpenChange={setDeleteShareOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File Share</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedShare?.name}"? This will permanently delete all data stored in this file share.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "File share deleted",
                  description: `${selectedShare?.name} has been deleted.`,
                });
                setSelectedShare(null);
              }}
            >
              Delete File Share
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit ACL Rule Dialog */}
      <Dialog open={editRuleOpen} onOpenChange={setEditRuleOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Access Rule</DialogTitle>
            <DialogDescription>
              Update the access control rule
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rule-cidr">CIDR</Label>
              <Input id="rule-cidr" defaultValue={selectedRule?.cidr} />
            </div>
            <div className="grid gap-2">
              <Label>Permission</Label>
              <Select defaultValue={selectedRule?.permission}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read-only">Read Only</SelectItem>
                  <SelectItem value="read-write">Read Write</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRuleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setEditRuleOpen(false);
              toast({
                title: "Rule updated",
                description: "Access rule has been updated.",
              });
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete ACL Rule Confirmation */}
      <AlertDialog open={deleteRuleOpen} onOpenChange={setDeleteRuleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Access Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the access rule for "{selectedRule?.cidr}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Rule deleted",
                  description: "Access rule has been deleted.",
                });
                setSelectedRule(null);
              }}
            >
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
