"use client";

import { useState } from "react";
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Building,
  Ban,
  CheckCircle,
  Mail,
  Loader2,
  ExternalLink,
  Settings,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { mockTenants } from "@/stores/mock-data";
import { Tenant } from "@/types";
import { format } from "date-fns";

export default function TenantsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Dialog states
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [tenantForDetails, setTenantForDetails] = useState<Tenant | null>(null);
  const [tenantForQuotas, setTenantForQuotas] = useState<Tenant | null>(null);
  const [tenantForPlan, setTenantForPlan] = useState<Tenant | null>(null);
  const [tenantToSuspend, setTenantToSuspend] = useState<Tenant | null>(null);
  const [tenantToActivate, setTenantToActivate] = useState<Tenant | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedTenantForContact, setSelectedTenantForContact] = useState<Tenant | null>(null);

  // Form states
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [newTenantPlan, setNewTenantPlan] = useState("starter");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [quotaVMs, setQuotaVMs] = useState(10);
  const [quotaVCPUs, setQuotaVCPUs] = useState(32);
  const [quotaMemory, setQuotaMemory] = useState(64);
  const [quotaStorage, setQuotaStorage] = useState(500);
  const [selectedPlan, setSelectedPlan] = useState("");

  const filteredTenants = mockTenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(search.toLowerCase()) ||
      tenant.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || tenant.status === statusFilter;
    const matchesPlan =
      planFilter === "all" || tenant.organization.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const totalRevenue = mockTenants
    .filter((t) => t.status === "active")
    .reduce((sum, t) => sum + t.monthlySpend, 0);

  const handleOnboard = async () => {
    if (!newTenantName || !newTenantEmail) return;
    setIsLoading("onboard");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Tenant Onboarded",
      description: `${newTenantName} has been successfully onboarded`,
    });
    setOnboardOpen(false);
    setNewTenantName("");
    setNewTenantEmail("");
    setNewTenantPlan("starter");
  };

  const handleContact = async () => {
    if (!selectedTenantForContact || !contactSubject || !contactMessage) return;
    setIsLoading("contact");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Message Sent",
      description: `Email sent to ${selectedTenantForContact.email}`,
    });
    setContactOpen(false);
    setSelectedTenantForContact(null);
    setContactSubject("");
    setContactMessage("");
  };

  const handleUpdateQuotas = async () => {
    if (!tenantForQuotas) return;
    setIsLoading("quotas");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Quotas Updated",
      description: `Quotas for ${tenantForQuotas.name} have been updated`,
    });
    setTenantForQuotas(null);
  };

  const handleChangePlan = async () => {
    if (!tenantForPlan || !selectedPlan) return;
    setIsLoading("plan");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Plan Changed",
      description: `${tenantForPlan.name} has been moved to ${selectedPlan} plan`,
    });
    setTenantForPlan(null);
    setSelectedPlan("");
  };

  const handleSuspend = async () => {
    if (!tenantToSuspend) return;
    setIsLoading("suspend");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Account Suspended",
      description: `${tenantToSuspend.name} has been suspended`,
      variant: "destructive",
    });
    setTenantToSuspend(null);
  };

  const handleActivate = async () => {
    if (!tenantToActivate) return;
    setIsLoading("activate");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Account Activated",
      description: `${tenantToActivate.name} has been activated`,
    });
    setTenantToActivate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage customer organizations and accounts
          </p>
        </div>
        <Button onClick={() => setOnboardOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Onboard Tenant
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTenants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockTenants.filter((t) => t.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {mockTenants.filter((t) => t.status === "suspended").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead>Monthly Spend</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <button
                          onClick={() => setTenantForDetails(tenant)}
                          className="font-medium hover:underline text-left"
                        >
                          {tenant.name}
                        </button>
                        <p className="text-xs text-muted-foreground">{tenant.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tenant.status === "active"
                          ? "default"
                          : tenant.status === "suspended"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {tenant.organization.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {tenant.resourceUsage.vms} VMs / {tenant.resourceUsage.vcpus} vCPUs
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tenant.resourceUsage.memory} GB RAM / {tenant.resourceUsage.storage} GB Storage
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      ${tenant.monthlySpend.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setTenantForDetails(tenant)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => {
                          setSelectedTenantForContact(tenant);
                          setContactOpen(true);
                        }}>
                          <Mail className="mr-2 h-4 w-4" />
                          Contact
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => {
                          setTenantForQuotas(tenant);
                          setQuotaVMs(tenant.resourceUsage.vms + 5);
                          setQuotaVCPUs(tenant.resourceUsage.vcpus + 16);
                          setQuotaMemory(tenant.resourceUsage.memory + 32);
                          setQuotaStorage(tenant.resourceUsage.storage + 100);
                        }}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit Quotas
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => {
                          setTenantForPlan(tenant);
                          setSelectedPlan(tenant.organization.plan);
                        }}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Change Plan
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {tenant.status === "active" ? (
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => setTenantToSuspend(tenant)}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Suspend Account
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-green-600"
                            onSelect={() => setTenantToActivate(tenant)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Activate Account
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Onboard Tenant Dialog */}
      <Dialog open={onboardOpen} onOpenChange={setOnboardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onboard New Tenant</DialogTitle>
            <DialogDescription>
              Create a new customer organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Organization Name</Label>
              <Input
                id="tenant-name"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-email">Admin Email</Label>
              <Input
                id="tenant-email"
                type="email"
                value={newTenantEmail}
                onChange={(e) => setNewTenantEmail(e.target.value)}
                placeholder="admin@acme.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Initial Plan</Label>
              <Select value={newTenantPlan} onValueChange={setNewTenantPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter - $99/mo</SelectItem>
                  <SelectItem value="professional">Professional - $299/mo</SelectItem>
                  <SelectItem value="enterprise">Enterprise - Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOnboardOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleOnboard}
              disabled={!newTenantName || !newTenantEmail || isLoading === "onboard"}
            >
              {isLoading === "onboard" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Onboard Tenant"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenant Details Dialog */}
      <Dialog open={!!tenantForDetails} onOpenChange={() => setTenantForDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {tenantForDetails?.name}
            </DialogTitle>
            <DialogDescription>
              {tenantForDetails?.email}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={tenantForDetails?.status === "active" ? "default" : "destructive"}
                  >
                    {tenantForDetails?.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium capitalize">{tenantForDetails?.organization.plan}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {tenantForDetails?.createdAt ? format(new Date(tenantForDetails.createdAt), "PPP") : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Monthly Spend</p>
                  <p className="font-medium">${tenantForDetails?.monthlySpend.toLocaleString()}</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="resources" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Virtual Machines</p>
                  <p className="text-2xl font-bold">{tenantForDetails?.resourceUsage.vms}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">vCPUs</p>
                  <p className="text-2xl font-bold">{tenantForDetails?.resourceUsage.vcpus}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Memory</p>
                  <p className="text-2xl font-bold">{tenantForDetails?.resourceUsage.memory} GB</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Storage</p>
                  <p className="text-2xl font-bold">{tenantForDetails?.resourceUsage.storage} GB</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="billing" className="space-y-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Plan</span>
                  <span className="font-medium capitalize">{tenantForDetails?.organization.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Spend</span>
                  <span className="font-medium">${tenantForDetails?.monthlySpend.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status</span>
                  <Badge variant="default">Current</Badge>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTenantForDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Tenant</DialogTitle>
            <DialogDescription>
              Send an email to {selectedTenantForContact?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="Account Update"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleContact}
              disabled={!contactSubject || !contactMessage || isLoading === "contact"}
            >
              {isLoading === "contact" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quotas Dialog */}
      <Dialog open={!!tenantForQuotas} onOpenChange={() => setTenantForQuotas(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quotas</DialogTitle>
            <DialogDescription>
              Set resource limits for {tenantForQuotas?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max VMs</Label>
                <span className="text-sm font-medium">{quotaVMs}</span>
              </div>
              <Slider
                value={[quotaVMs]}
                onValueChange={(v) => setQuotaVMs(v[0])}
                min={1}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max vCPUs</Label>
                <span className="text-sm font-medium">{quotaVCPUs}</span>
              </div>
              <Slider
                value={[quotaVCPUs]}
                onValueChange={(v) => setQuotaVCPUs(v[0])}
                min={4}
                max={256}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max Memory (GB)</Label>
                <span className="text-sm font-medium">{quotaMemory} GB</span>
              </div>
              <Slider
                value={[quotaMemory]}
                onValueChange={(v) => setQuotaMemory(v[0])}
                min={8}
                max={512}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max Storage (GB)</Label>
                <span className="text-sm font-medium">{quotaStorage} GB</span>
              </div>
              <Slider
                value={[quotaStorage]}
                onValueChange={(v) => setQuotaStorage(v[0])}
                min={100}
                max={5000}
                step={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTenantForQuotas(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateQuotas} disabled={isLoading === "quotas"}>
              {isLoading === "quotas" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Quotas"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={!!tenantForPlan} onOpenChange={() => setTenantForPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Update the subscription plan for {tenantForPlan?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <p className="font-medium capitalize">{tenantForPlan?.organization.plan}</p>
            </div>
            <div className="space-y-2">
              <Label>New Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter - $99/mo</SelectItem>
                  <SelectItem value="professional">Professional - $299/mo</SelectItem>
                  <SelectItem value="enterprise">Enterprise - Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTenantForPlan(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={!selectedPlan || selectedPlan === tenantForPlan?.organization.plan || isLoading === "plan"}
            >
              {isLoading === "plan" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Change Plan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Account Confirmation */}
      <AlertDialog open={!!tenantToSuspend} onOpenChange={() => setTenantToSuspend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend <strong>{tenantToSuspend?.name}</strong>?
              This will immediately stop all running resources and prevent access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading === "suspend"}
            >
              {isLoading === "suspend" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                "Suspend Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Account Confirmation */}
      <AlertDialog open={!!tenantToActivate} onOpenChange={() => setTenantToActivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate <strong>{tenantToActivate?.name}</strong>?
              This will restore access to the platform and allow them to manage resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              disabled={isLoading === "activate"}
            >
              {isLoading === "activate" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                "Activate Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
