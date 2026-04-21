"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Trash2,
  Eye,
  Upload,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, differenceInDays } from "date-fns";
import { Search } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface Certificate {
  id: string;
  name: string;
  type: string;
  issuer: string;
  domains: string[];
  status: string;
  createdAt: string;
  expiresAt: string;
  autoRenew: boolean;
  algorithm: string;
}

// Mock certificates
const mockCertificates = [
  {
    id: "cert-001",
    name: "*.cloudplatform.io",
    type: "wildcard",
    issuer: "Let's Encrypt",
    domains: ["*.cloudplatform.io", "cloudplatform.io"],
    status: "active",
    createdAt: "2024-01-15T00:00:00Z",
    expiresAt: "2024-04-15T00:00:00Z",
    autoRenew: true,
    algorithm: "RSA-2048",
  },
  {
    id: "cert-002",
    name: "api.cloudplatform.io",
    type: "single",
    issuer: "DigiCert",
    domains: ["api.cloudplatform.io"],
    status: "active",
    createdAt: "2023-12-01T00:00:00Z",
    expiresAt: "2024-12-01T00:00:00Z",
    autoRenew: true,
    algorithm: "ECDSA-P384",
  },
  {
    id: "cert-003",
    name: "Internal CA Root",
    type: "ca",
    issuer: "Self-signed",
    domains: [],
    status: "active",
    createdAt: "2023-01-01T00:00:00Z",
    expiresAt: "2033-01-01T00:00:00Z",
    autoRenew: false,
    algorithm: "RSA-4096",
  },
  {
    id: "cert-004",
    name: "*.staging.cloudplatform.io",
    type: "wildcard",
    issuer: "Let's Encrypt",
    domains: ["*.staging.cloudplatform.io"],
    status: "expiring",
    createdAt: "2024-01-01T00:00:00Z",
    expiresAt: "2024-03-20T00:00:00Z",
    autoRenew: true,
    algorithm: "RSA-2048",
  },
  {
    id: "cert-005",
    name: "old-api.cloudplatform.io",
    type: "single",
    issuer: "Let's Encrypt",
    domains: ["old-api.cloudplatform.io"],
    status: "expired",
    createdAt: "2023-06-01T00:00:00Z",
    expiresAt: "2024-03-01T00:00:00Z",
    autoRenew: false,
    algorithm: "RSA-2048",
  },
  {
    id: "cert-006",
    name: "mTLS Client Cert",
    type: "client",
    issuer: "Internal CA",
    domains: [],
    status: "active",
    createdAt: "2024-02-01T00:00:00Z",
    expiresAt: "2025-02-01T00:00:00Z",
    autoRenew: false,
    algorithm: "ECDSA-P256",
  },
];

const statusConfig = {
  active: { icon: CheckCircle, color: "text-green-500", variant: "default" as const },
  expiring: { icon: Clock, color: "text-yellow-500", variant: "secondary" as const },
  expired: { icon: AlertTriangle, color: "text-red-500", variant: "destructive" as const },
};

const typeConfig: Record<string, { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  wildcard: { label: "Wildcard", color: "default" },
  single: { label: "Single Domain", color: "outline" },
  ca: { label: "CA Certificate", color: "secondary" },
  client: { label: "Client Cert", color: "outline" },
};

export default function CertificatesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [certForDetails, setCertForDetails] = useState<Certificate | null>(null);
  const [certToDelete, setCertToDelete] = useState<Certificate | null>(null);

  const filteredCerts = mockCertificates.filter((cert) =>
    cert.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCerts = mockCertificates.filter((c) => c.status === "active").length;
  const expiringCerts = mockCertificates.filter((c) => c.status === "expiring").length;
  const expiredCerts = mockCertificates.filter((c) => c.status === "expired").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
          <p className="text-muted-foreground">
            TLS/SSL certificate management
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Certificate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Certificate</DialogTitle>
                <DialogDescription>
                  Upload or create a new SSL/TLS certificate
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Certificate Name</Label>
                  <Input placeholder="my-certificate" />
                </div>
                <div className="grid gap-2">
                  <Label>Certificate (PEM)</Label>
                  <Textarea
                    className="font-mono text-xs h-32"
                    placeholder="-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Private Key (PEM)</Label>
                  <Textarea
                    className="font-mono text-xs h-32"
                    placeholder="-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>CA Bundle (Optional)</Label>
                  <Textarea
                    className="font-mono text-xs h-24"
                    placeholder="Intermediate certificates..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockCertificates.length}</div>
            <p className="text-xs text-muted-foreground">Managed certificates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCerts}</div>
            <p className="text-xs text-muted-foreground">Valid certificates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringCerts}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredCerts}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search certificates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Certificates Table */}
      <Card>
        <CardHeader>
          <CardTitle>SSL/TLS Certificates</CardTitle>
          <CardDescription>
            Manage certificates for secure communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Auto Renew</TableHead>
                <TableHead>Algorithm</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCerts.map((cert) => {
                const StatusIcon = statusConfig[cert.status as keyof typeof statusConfig].icon;
                const daysUntilExpiry = differenceInDays(new Date(cert.expiresAt), new Date());

                return (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cert.name}</p>
                        {cert.domains.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {cert.domains.length} domain(s)
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeConfig[cert.type as keyof typeof typeConfig].color}>
                        {typeConfig[cert.type as keyof typeof typeConfig].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cert.issuer}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${statusConfig[cert.status as keyof typeof statusConfig].color}`} />
                        <Badge variant={statusConfig[cert.status as keyof typeof statusConfig].variant}>
                          {cert.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{format(new Date(cert.expiresAt), "MMM d, yyyy")}</p>
                        <p className={`text-xs ${daysUntilExpiry < 30 ? "text-yellow-500" : daysUntilExpiry < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                          {daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : `Expired ${Math.abs(daysUntilExpiry)} days ago`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cert.autoRenew ? "default" : "outline"}>
                        {cert.autoRenew ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {cert.algorithm}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setCertForDetails(cert)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toast({ title: "Download Started", description: `Downloading ${cert.name}` })}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toast({ title: "Renewal Initiated", description: `Renewing ${cert.name}` })}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Renew Now
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onSelect={() => setCertToDelete(cert)}>
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
        </CardContent>
      </Card>

      {/* Certificate Details Dialog */}
      <Dialog open={!!certForDetails} onOpenChange={() => setCertForDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{certForDetails?.name}</DialogTitle>
            <DialogDescription>Certificate Details</DialogDescription>
          </DialogHeader>
          {certForDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Type</Label>
                  <Badge variant={typeConfig[certForDetails.type as keyof typeof typeConfig]?.color}>
                    {typeConfig[certForDetails.type as keyof typeof typeConfig]?.label}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={statusConfig[certForDetails.status as keyof typeof statusConfig]?.variant}>
                    {certForDetails.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Issuer</Label>
                  <p className="font-medium">{certForDetails.issuer}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Algorithm</Label>
                  <p className="font-medium">{certForDetails.algorithm}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{format(new Date(certForDetails.createdAt), "MMM d, yyyy")}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Expires</Label>
                  <p className="font-medium">{format(new Date(certForDetails.expiresAt), "MMM d, yyyy")}</p>
                </div>
              </div>
              {certForDetails.domains.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-muted-foreground">Domains</Label>
                  <div className="flex flex-wrap gap-2">
                    {certForDetails.domains.map((domain) => (
                      <Badge key={domain} variant="outline" className="font-mono">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label>Auto Renew</Label>
                  <p className="text-sm text-muted-foreground">Automatically renew before expiry</p>
                </div>
                <Badge variant={certForDetails.autoRenew ? "default" : "outline"}>
                  {certForDetails.autoRenew ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertForDetails(null)}>
              Close
            </Button>
            <Button onClick={() => {
              toast({ title: "Download Started", description: `Downloading ${certForDetails?.name}` });
              setCertForDetails(null);
            }}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Certificate Confirmation */}
      <AlertDialog open={!!certToDelete} onOpenChange={() => setCertToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{certToDelete?.name}</strong>?
              This may affect services using this certificate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Certificate Deleted",
                  description: `${certToDelete?.name} has been deleted`,
                  variant: "destructive",
                });
                setCertToDelete(null);
              }}
            >
              Delete Certificate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
