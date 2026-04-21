"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Globe,
  Server,
  Trash2,
  Edit,
  Copy,
  FileText,
  Mail,
  Type,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

// DNS Zone type
interface DNSZone {
  id: string;
  name: string;
  status: "active" | "pending" | "error";
  type: "public" | "private";
  recordCount: number;
  nameservers: string[];
  createdAt: string;
  updatedAt: string;
}

// DNS Record type
interface DNSRecord {
  id: string;
  zoneId: string;
  name: string;
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "SRV" | "CAA";
  value: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
}

// Mock DNS zones
const mockDNSZones: DNSZone[] = [
  {
    id: "zone-001",
    name: "acme.com",
    status: "active",
    type: "public",
    recordCount: 12,
    nameservers: ["ns1.cloudplatform.io", "ns2.cloudplatform.io"],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-03-15T10:30:00Z",
  },
  {
    id: "zone-002",
    name: "api.acme.com",
    status: "active",
    type: "public",
    recordCount: 5,
    nameservers: ["ns1.cloudplatform.io", "ns2.cloudplatform.io"],
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-03-10T14:00:00Z",
  },
  {
    id: "zone-003",
    name: "internal.acme.local",
    status: "active",
    type: "private",
    recordCount: 8,
    nameservers: ["ns-internal.cloudplatform.io"],
    createdAt: "2024-02-01T00:00:00Z",
    updatedAt: "2024-03-12T09:00:00Z",
  },
  {
    id: "zone-004",
    name: "staging.acme.com",
    status: "pending",
    type: "public",
    recordCount: 3,
    nameservers: ["ns1.cloudplatform.io", "ns2.cloudplatform.io"],
    createdAt: "2024-03-15T00:00:00Z",
    updatedAt: "2024-03-15T00:00:00Z",
  },
];

// Mock DNS records
const mockDNSRecords: DNSRecord[] = [
  // acme.com records
  { id: "rec-001", zoneId: "zone-001", name: "@", type: "A", value: "203.0.113.100", ttl: 300 },
  { id: "rec-002", zoneId: "zone-001", name: "www", type: "A", value: "203.0.113.100", ttl: 300 },
  { id: "rec-003", zoneId: "zone-001", name: "www", type: "AAAA", value: "2001:db8::1", ttl: 300 },
  { id: "rec-004", zoneId: "zone-001", name: "api", type: "CNAME", value: "api.acme.com", ttl: 3600 },
  { id: "rec-005", zoneId: "zone-001", name: "@", type: "MX", value: "mail.acme.com", ttl: 3600, priority: 10 },
  { id: "rec-006", zoneId: "zone-001", name: "@", type: "MX", value: "mail2.acme.com", ttl: 3600, priority: 20 },
  { id: "rec-007", zoneId: "zone-001", name: "@", type: "TXT", value: "v=spf1 include:_spf.google.com ~all", ttl: 3600 },
  { id: "rec-008", zoneId: "zone-001", name: "_dmarc", type: "TXT", value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@acme.com", ttl: 3600 },
  { id: "rec-009", zoneId: "zone-001", name: "mail", type: "A", value: "203.0.113.25", ttl: 300 },
  { id: "rec-010", zoneId: "zone-001", name: "mail2", type: "A", value: "203.0.113.26", ttl: 300 },
  { id: "rec-011", zoneId: "zone-001", name: "blog", type: "CNAME", value: "acme.ghost.io", ttl: 3600 },
  { id: "rec-012", zoneId: "zone-001", name: "status", type: "CNAME", value: "statuspage.io", ttl: 3600 },
  // api.acme.com records
  { id: "rec-013", zoneId: "zone-002", name: "@", type: "A", value: "203.0.113.101", ttl: 60 },
  { id: "rec-014", zoneId: "zone-002", name: "v1", type: "CNAME", value: "api-v1.acme.com", ttl: 300 },
  { id: "rec-015", zoneId: "zone-002", name: "v2", type: "CNAME", value: "api-v2.acme.com", ttl: 300 },
  { id: "rec-016", zoneId: "zone-002", name: "staging", type: "A", value: "203.0.113.150", ttl: 60 },
  { id: "rec-017", zoneId: "zone-002", name: "@", type: "AAAA", value: "2001:db8::2", ttl: 60 },
  // internal.acme.local records
  { id: "rec-018", zoneId: "zone-003", name: "db-primary", type: "A", value: "10.0.10.5", ttl: 60 },
  { id: "rec-019", zoneId: "zone-003", name: "db-replica", type: "A", value: "10.0.10.6", ttl: 60 },
  { id: "rec-020", zoneId: "zone-003", name: "cache", type: "A", value: "10.0.1.20", ttl: 60 },
  { id: "rec-021", zoneId: "zone-003", name: "queue", type: "A", value: "10.0.1.30", ttl: 60 },
  { id: "rec-022", zoneId: "zone-003", name: "monitoring", type: "A", value: "10.0.5.10", ttl: 60 },
  { id: "rec-023", zoneId: "zone-003", name: "logging", type: "A", value: "10.0.5.20", ttl: 60 },
  { id: "rec-024", zoneId: "zone-003", name: "vault", type: "A", value: "10.0.5.30", ttl: 60 },
  { id: "rec-025", zoneId: "zone-003", name: "consul", type: "A", value: "10.0.5.40", ttl: 60 },
  // staging.acme.com records
  { id: "rec-026", zoneId: "zone-004", name: "@", type: "A", value: "203.0.113.150", ttl: 300 },
  { id: "rec-027", zoneId: "zone-004", name: "www", type: "CNAME", value: "staging.acme.com", ttl: 300 },
  { id: "rec-028", zoneId: "zone-004", name: "api", type: "A", value: "203.0.113.151", ttl: 300 },
];

const recordTypeIcons: Record<string, React.ReactNode> = {
  A: <Server className="h-4 w-4" />,
  AAAA: <Server className="h-4 w-4" />,
  CNAME: <ArrowRight className="h-4 w-4" />,
  MX: <Mail className="h-4 w-4" />,
  TXT: <Type className="h-4 w-4" />,
  NS: <Globe className="h-4 w-4" />,
  SOA: <FileText className="h-4 w-4" />,
  SRV: <Server className="h-4 w-4" />,
  CAA: <CheckCircle2 className="h-4 w-4" />,
};

const recordTypeColors: Record<string, string> = {
  A: "bg-blue-500/10 text-blue-500",
  AAAA: "bg-purple-500/10 text-purple-500",
  CNAME: "bg-green-500/10 text-green-500",
  MX: "bg-orange-500/10 text-orange-500",
  TXT: "bg-yellow-500/10 text-yellow-600",
  NS: "bg-cyan-500/10 text-cyan-500",
  SOA: "bg-gray-500/10 text-gray-500",
  SRV: "bg-pink-500/10 text-pink-500",
  CAA: "bg-red-500/10 text-red-500",
};

const statusColors: Record<DNSZone["status"], string> = {
  active: "bg-green-500",
  pending: "bg-yellow-500",
  error: "bg-red-500",
};

const statusBadgeVariants: Record<DNSZone["status"], "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending: "outline",
  error: "destructive",
};

const recordTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];

export default function DNSPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedZone, setSelectedZone] = useState<DNSZone | null>(null);
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>("all");
  const [createZoneOpen, setCreateZoneOpen] = useState(false);
  const [createRecordOpen, setCreateRecordOpen] = useState(false);
  const [newRecordType, setNewRecordType] = useState<string>("A");

  // Dialog states for zone actions
  const [editZoneOpen, setEditZoneOpen] = useState(false);
  const [deleteZoneOpen, setDeleteZoneOpen] = useState(false);

  // Dialog states for record actions
  const [editRecordOpen, setEditRecordOpen] = useState(false);
  const [deleteRecordOpen, setDeleteRecordOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DNSRecord | null>(null);

  const filteredZones = mockDNSZones.filter((zone) =>
    zone.name.toLowerCase().includes(search.toLowerCase())
  );

  const zoneRecords = selectedZone
    ? mockDNSRecords.filter((record) => {
        const matchesZone = record.zoneId === selectedZone.id;
        const matchesType = recordTypeFilter === "all" || record.type === recordTypeFilter;
        return matchesZone && matchesType;
      })
    : [];

  const totalZones = mockDNSZones.length;
  const totalRecords = mockDNSRecords.length;
  const publicZones = mockDNSZones.filter((z) => z.type === "public").length;
  const privateZones = mockDNSZones.filter((z) => z.type === "private").length;

  const formatTTL = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${seconds / 60}m`;
    if (seconds < 86400) return `${seconds / 3600}h`;
    return `${seconds / 86400}d`;
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="DNS Management"
        apis={[
          "GET /api/dns/zones",
          "POST /api/dns/zones",
          "DELETE /api/dns/zones/{id}",
          "GET /api/dns/zones/{id}/records",
          "POST /api/dns/zones/{id}/records",
          "DELETE /api/dns/records/{id}"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DNS Management</h1>
          <p className="text-muted-foreground">
            Manage DNS zones and records for your domains
          </p>
        </div>
        <Dialog open={createZoneOpen} onOpenChange={setCreateZoneOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create DNS Zone</DialogTitle>
              <DialogDescription>
                Add a new DNS zone for your domain
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="zone-name">Domain Name</Label>
                <Input id="zone-name" placeholder="e.g., example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zone-type">Zone Type</Label>
                <Select defaultValue="public">
                  <SelectTrigger id="zone-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (Internet-facing)</SelectItem>
                    <SelectItem value="private">Private (Internal only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">After creating the zone:</p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Update your domain registrar with our nameservers</li>
                  <li>Wait for DNS propagation (up to 48 hours)</li>
                  <li>Add your DNS records</li>
                </ol>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateZoneOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setCreateZoneOpen(false)}>
                Create Zone
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalZones}</div>
            <p className="text-xs text-muted-foreground">
              Managed domains
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public Zones</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publicZones}</div>
            <p className="text-xs text-muted-foreground">
              Internet-facing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Private Zones</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{privateZones}</div>
            <p className="text-xs text-muted-foreground">
              Internal only
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
            <p className="text-xs text-muted-foreground">
              Across all zones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DNS Zones and Records */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Zones List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">DNS Zones</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search zones..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredZones.map((zone) => (
                <div
                  key={zone.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedZone?.id === zone.id
                      ? "border-primary bg-muted/50"
                      : "hover:bg-muted/30"
                  }`}
                  onClick={() => setSelectedZone(zone)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${statusColors[zone.status]}`} />
                      <div>
                        <p className="font-medium text-sm">{zone.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {zone.recordCount} records
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {zone.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {filteredZones.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No zones found
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Records View */}
        <Card className="lg:col-span-2">
          {selectedZone ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {selectedZone.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <Badge variant={statusBadgeVariants[selectedZone.status]} className="mr-2">
                      {selectedZone.status}
                    </Badge>
                    <Badge variant="outline">{selectedZone.type}</Badge>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog open={createRecordOpen} onOpenChange={setCreateRecordOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Record
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px]">
                      <DialogHeader>
                        <DialogTitle>Add DNS Record</DialogTitle>
                        <DialogDescription>
                          Add a new record to {selectedZone.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="record-type">Type</Label>
                            <Select value={newRecordType} onValueChange={setNewRecordType}>
                              <SelectTrigger id="record-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {recordTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    <div className="flex items-center gap-2">
                                      <span className={`p-1 rounded ${recordTypeColors[type]}`}>
                                        {recordTypeIcons[type]}
                                      </span>
                                      {type}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="record-name">Name</Label>
                            <Input
                              id="record-name"
                              placeholder="@ for root, or subdomain"
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="record-value">
                            {newRecordType === "A" || newRecordType === "AAAA"
                              ? "IP Address"
                              : newRecordType === "CNAME"
                              ? "Target Domain"
                              : newRecordType === "MX"
                              ? "Mail Server"
                              : newRecordType === "TXT"
                              ? "Text Value"
                              : "Value"}
                          </Label>
                          {newRecordType === "TXT" ? (
                            <Textarea
                              id="record-value"
                              placeholder="e.g., v=spf1 include:_spf.google.com ~all"
                              rows={3}
                            />
                          ) : (
                            <Input
                              id="record-value"
                              placeholder={
                                newRecordType === "A"
                                  ? "e.g., 203.0.113.100"
                                  : newRecordType === "AAAA"
                                  ? "e.g., 2001:db8::1"
                                  : newRecordType === "CNAME"
                                  ? "e.g., target.example.com"
                                  : newRecordType === "MX"
                                  ? "e.g., mail.example.com"
                                  : "Enter value..."
                              }
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="record-ttl">TTL (seconds)</Label>
                            <Select defaultValue="300">
                              <SelectTrigger id="record-ttl">
                                <SelectValue placeholder="Select TTL" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="60">1 minute (60)</SelectItem>
                                <SelectItem value="300">5 minutes (300)</SelectItem>
                                <SelectItem value="3600">1 hour (3600)</SelectItem>
                                <SelectItem value="86400">1 day (86400)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {newRecordType === "MX" && (
                            <div className="grid gap-2">
                              <Label htmlFor="record-priority">Priority</Label>
                              <Input
                                id="record-priority"
                                type="number"
                                placeholder="e.g., 10"
                                defaultValue="10"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateRecordOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => setCreateRecordOpen(false)}>
                          Add Record
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          toast({
                            title: "Checking DNS propagation",
                            description: `Verifying propagation status for ${selectedZone?.name}...`,
                          });
                        }}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Check Propagation
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          toast({
                            title: "Zone file exported",
                            description: `${selectedZone?.name} zone file has been downloaded.`,
                          });
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Export Zone File
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setEditZoneOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Zone
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => setDeleteZoneOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Zone
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="records" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="records">Records</TabsTrigger>
                    <TabsTrigger value="nameservers">Nameservers</TabsTrigger>
                  </TabsList>

                  <TabsContent value="records" className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {recordTypes.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        {zoneRecords.length} record(s)
                      </span>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Type</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead className="w-[80px]">TTL</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {zoneRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`${recordTypeColors[record.type]}`}
                              >
                                {record.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-sm">
                                {record.name === "@" ? selectedZone.name : `${record.name}.${selectedZone.name}`}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {record.priority !== undefined && (
                                  <Badge variant="secondary" className="text-xs">
                                    {record.priority}
                                  </Badge>
                                )}
                                <code className="text-xs bg-muted px-2 py-1 rounded max-w-[300px] truncate block">
                                  {record.value}
                                </code>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {formatTTL(record.ttl)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setSelectedRecord(record);
                                      setEditRecordOpen(true);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      navigator.clipboard.writeText(record.value);
                                      toast({
                                        title: "Value copied",
                                        description: "Record value copied to clipboard.",
                                      });
                                    }}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Value
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={() => {
                                      setSelectedRecord(record);
                                      setDeleteRecordOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                        {zoneRecords.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <p className="text-muted-foreground">No records found</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCreateRecordOpen(true)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add your first record
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="nameservers" className="space-y-4">
                    <div className="rounded-lg border p-4 space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Nameservers</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Update your domain registrar to use these nameservers:
                        </p>
                        <div className="space-y-2">
                          {selectedZone.nameservers.map((ns, index) => (
                            <div
                              key={ns}
                              className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">{index + 1}</Badge>
                                <code className="text-sm">{ns}</code>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="flex items-start gap-3">
                          {selectedZone.status === "active" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">
                              {selectedZone.status === "active"
                                ? "Nameservers configured correctly"
                                : "Waiting for nameserver configuration"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedZone.status === "active"
                                ? "DNS queries are being resolved by our nameservers."
                                : "Please update your domain registrar with our nameservers. DNS propagation can take up to 48 hours."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Select a zone to view and manage DNS records
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Edit Zone Dialog */}
      <Dialog open={editZoneOpen} onOpenChange={setEditZoneOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit DNS Zone</DialogTitle>
            <DialogDescription>
              Update settings for {selectedZone?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-zone-name">Domain Name</Label>
              <Input
                id="edit-zone-name"
                defaultValue={selectedZone?.name}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Domain name cannot be changed after creation
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-zone-type">Zone Type</Label>
              <Select defaultValue={selectedZone?.type}>
                <SelectTrigger id="edit-zone-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (Internet-facing)</SelectItem>
                  <SelectItem value="private">Private (Internal only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditZoneOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setEditZoneOpen(false);
                toast({
                  title: "Zone updated",
                  description: `${selectedZone?.name} has been updated successfully.`,
                });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Zone Confirmation */}
      <AlertDialog open={deleteZoneOpen} onOpenChange={setDeleteZoneOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete DNS Zone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the zone "{selectedZone?.name}"?
              This will remove all {selectedZone?.recordCount} DNS records and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Zone deleted",
                  description: `${selectedZone?.name} has been deleted.`,
                });
                setSelectedZone(null);
              }}
            >
              Delete Zone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Record Dialog */}
      <Dialog open={editRecordOpen} onOpenChange={setEditRecordOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit DNS Record</DialogTitle>
            <DialogDescription>
              Update the {selectedRecord?.type} record
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-record-type">Type</Label>
                <Input
                  id="edit-record-type"
                  defaultValue={selectedRecord?.type}
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-record-name">Name</Label>
                <Input
                  id="edit-record-name"
                  defaultValue={selectedRecord?.name}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-record-value">Value</Label>
              <Input
                id="edit-record-value"
                defaultValue={selectedRecord?.value}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-record-ttl">TTL</Label>
              <Select defaultValue={selectedRecord?.ttl?.toString()}>
                <SelectTrigger id="edit-record-ttl">
                  <SelectValue placeholder="Select TTL" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1 minute (60)</SelectItem>
                  <SelectItem value="300">5 minutes (300)</SelectItem>
                  <SelectItem value="3600">1 hour (3600)</SelectItem>
                  <SelectItem value="86400">1 day (86400)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecordOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setEditRecordOpen(false);
                toast({
                  title: "Record updated",
                  description: "DNS record has been updated successfully.",
                });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Record Confirmation */}
      <AlertDialog open={deleteRecordOpen} onOpenChange={setDeleteRecordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete DNS Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {selectedRecord?.type} record for "
              {selectedRecord?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Record deleted",
                  description: "DNS record has been deleted.",
                });
                setSelectedRecord(null);
              }}
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
