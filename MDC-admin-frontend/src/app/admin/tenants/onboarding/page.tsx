"use client";

import { useState, ComponentType } from "react";
import {
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Mail,
  Building,
  ArrowRight,
  FileText,
  CreditCard,
  Loader2,
  User,
  ExternalLink,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search } from "lucide-react";

interface OnboardingRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  requestedPlan: string;
  estimatedSpend: number;
  useCase: string;
  status: string;
  source: string;
  createdAt: string;
  assignedTo: string | null;
  currentStep?: string;
  rejectionReason?: string;
}

// Mock onboarding requests
const mockOnboardingRequests: OnboardingRequest[] = [
  {
    id: "onb-001",
    companyName: "Innovative Tech Solutions",
    contactName: "Sarah Johnson",
    email: "sarah@innovativetech.io",
    phone: "+1-555-0123",
    requestedPlan: "enterprise",
    estimatedSpend: 5000,
    useCase: "Cloud migration for legacy applications",
    status: "pending_review",
    source: "website",
    createdAt: "2024-03-14T10:30:00Z",
    assignedTo: null,
  },
  {
    id: "onb-002",
    companyName: "DataFlow Analytics",
    contactName: "Michael Chen",
    email: "mchen@dataflow.com",
    phone: "+1-555-0456",
    requestedPlan: "professional",
    estimatedSpend: 2500,
    useCase: "Big data processing and ML workloads",
    status: "in_progress",
    source: "sales_referral",
    createdAt: "2024-03-13T14:00:00Z",
    assignedTo: "Alex Thompson",
    currentStep: "technical_review",
  },
  {
    id: "onb-003",
    companyName: "GreenLeaf Retail",
    contactName: "Emma Williams",
    email: "emma@greenleaf.shop",
    phone: "+1-555-0789",
    requestedPlan: "starter",
    estimatedSpend: 500,
    useCase: "E-commerce hosting",
    status: "pending_verification",
    source: "website",
    createdAt: "2024-03-12T09:15:00Z",
    assignedTo: "Jordan Lee",
    currentStep: "identity_verification",
  },
  {
    id: "onb-004",
    companyName: "FinSecure Corp",
    contactName: "Robert Davis",
    email: "rdavis@finsecure.com",
    phone: "+1-555-0321",
    requestedPlan: "enterprise",
    estimatedSpend: 15000,
    useCase: "PCI-compliant financial services infrastructure",
    status: "approved",
    source: "partner_referral",
    createdAt: "2024-03-10T11:00:00Z",
    assignedTo: "Sarah Miller",
    currentStep: "provisioning",
  },
  {
    id: "onb-005",
    companyName: "QuickStart Games",
    contactName: "Lisa Park",
    email: "lisa@quickstartgames.io",
    phone: "+1-555-0654",
    requestedPlan: "professional",
    estimatedSpend: 3500,
    useCase: "Game server hosting and CDN",
    status: "rejected",
    source: "website",
    createdAt: "2024-03-08T16:30:00Z",
    assignedTo: null,
    rejectionReason: "High-risk industry, compliance concerns",
  },
];

const statusConfig: Record<string, { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline'; icon: ComponentType<{ className?: string }> }> = {
  pending_review: { label: "Pending Review", color: "secondary", icon: Clock },
  in_progress: { label: "In Progress", color: "default", icon: ArrowRight },
  pending_verification: { label: "Pending Verification", color: "secondary", icon: FileText },
  approved: { label: "Approved", color: "default", icon: CheckCircle },
  rejected: { label: "Rejected", color: "destructive", icon: XCircle },
};

const planConfig: Record<string, { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  starter: { label: "Starter", color: "outline" },
  professional: { label: "Professional", color: "secondary" },
  enterprise: { label: "Enterprise", color: "default" },
};

export default function OnboardingPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Dialog states
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  // Form states
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPlan, setNewPlan] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filteredRequests = mockOnboardingRequests.filter((req) => {
    const matchesSearch =
      req.companyName.toLowerCase().includes(search.toLowerCase()) ||
      req.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = mockOnboardingRequests.filter(
    (r) => r.status === "pending_review"
  ).length;
  const inProgressCount = mockOnboardingRequests.filter(
    (r) => r.status === "in_progress" || r.status === "pending_verification"
  ).length;
  const approvedCount = mockOnboardingRequests.filter(
    (r) => r.status === "approved"
  ).length;
  const potentialMRR = mockOnboardingRequests
    .filter((r) => r.status !== "rejected")
    .reduce((sum, r) => sum + r.estimatedSpend, 0);

  const handleCreateTenant = async () => {
    if (!newCompany || !newEmail || !newPlan) return;
    setIsLoading("create");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Tenant Created",
      description: `${newCompany} has been successfully onboarded`,
    });
    setIsDialogOpen(false);
    setNewCompany("");
    setNewContact("");
    setNewEmail("");
    setNewPlan("");
    setNewNotes("");
  };

  const handleContact = async () => {
    if (!selectedRequest || !contactSubject || !contactMessage) return;
    setIsLoading("contact");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Message Sent",
      description: `Email sent to ${selectedRequest.email}`,
    });
    setContactOpen(false);
    setSelectedRequest(null);
    setContactSubject("");
    setContactMessage("");
  };

  const handleAssignToMe = async (request: OnboardingRequest) => {
    setIsLoading(`assign-${request.id}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(null);
    toast({
      title: "Assigned",
      description: `${request.companyName} has been assigned to you`,
    });
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsLoading("approve");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(null);
    toast({
      title: "Application Approved",
      description: `${selectedRequest.companyName} has been approved for onboarding`,
    });
    setApproveOpen(false);
    setSelectedRequest(null);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) return;
    setIsLoading("reject");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Application Rejected",
      description: `${selectedRequest.companyName} has been rejected`,
      variant: "destructive",
    });
    setRejectOpen(false);
    setSelectedRequest(null);
    setRejectionReason("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Onboarding</h1>
          <p className="text-muted-foreground">
            Review and process new tenant applications
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Manual Onboard
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manual Tenant Onboarding</DialogTitle>
              <DialogDescription>
                Create a new tenant account manually
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  placeholder="Acme Corporation"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact">Contact Name</Label>
                <Input
                  id="contact"
                  placeholder="John Doe"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@acme.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan">Initial Plan</Label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTenant}
                disabled={!newCompany || !newEmail || !newPlan || isLoading === "create"}
              >
                {isLoading === "create" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Tenant"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting initial review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <ArrowRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved (30d)</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Ready to provision</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential MRR</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${potentialMRR.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From pending tenants</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="pending_verification">Pending Verification</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Onboarding Table */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Requests</CardTitle>
          <CardDescription>
            New tenant applications and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Est. Spend</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => {
                const StatusIcon = statusConfig[request.status as keyof typeof statusConfig].icon;
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Building className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setDetailsOpen(true);
                            }}
                            className="font-medium hover:underline text-left"
                          >
                            {request.companyName}
                          </button>
                          <p className="text-xs text-muted-foreground">{request.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" />
                        <Badge
                          variant={
                            statusConfig[request.status as keyof typeof statusConfig]
                              .color
                          }
                        >
                          {statusConfig[request.status as keyof typeof statusConfig].label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          planConfig[request.requestedPlan as keyof typeof planConfig]
                            .color
                        }
                      >
                        {planConfig[request.requestedPlan as keyof typeof planConfig].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        ${request.estimatedSpend.toLocaleString()}/mo
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {request.source.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      {request.assignedTo || (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(request.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => {
                            setSelectedRequest(request);
                            setDetailsOpen(true);
                          }}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => {
                            setSelectedRequest(request);
                            setContactOpen(true);
                          }}>
                            <Mail className="mr-2 h-4 w-4" />
                            Contact
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleAssignToMe(request)}
                            disabled={isLoading === `assign-${request.id}`}
                          >
                            <User className="mr-2 h-4 w-4" />
                            {isLoading === `assign-${request.id}` ? "Assigning..." : "Assign to Me"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {request.status === "pending_review" && (
                            <>
                              <DropdownMenuItem
                                className="text-green-600"
                                onSelect={() => {
                                  setSelectedRequest(request);
                                  setApproveOpen(true);
                                }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => {
                                  setSelectedRequest(request);
                                  setRejectOpen(true);
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
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

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {selectedRequest?.companyName}
            </DialogTitle>
            <DialogDescription>
              Onboarding request details
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="info" className="mt-4">
            <TabsList>
              <TabsTrigger value="info">Information</TabsTrigger>
              <TabsTrigger value="usecase">Use Case</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Contact Name</p>
                  <p className="font-medium">{selectedRequest?.contactName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedRequest?.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedRequest?.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Requested Plan</p>
                  <Badge variant="outline" className="capitalize">
                    {selectedRequest?.requestedPlan}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Estimated Spend</p>
                  <p className="font-medium">${selectedRequest?.estimatedSpend.toLocaleString()}/mo</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium capitalize">{selectedRequest?.source.replace("_", " ")}</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="usecase" className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-2">Use Case Description</p>
                <p>{selectedRequest?.useCase}</p>
              </div>
            </TabsContent>
            <TabsContent value="history" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Application Submitted</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRequest?.createdAt && format(new Date(selectedRequest.createdAt), "PPpp")}
                    </p>
                  </div>
                </div>
                {selectedRequest?.assignedTo && (
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Assigned to {selectedRequest.assignedTo}</p>
                      <p className="text-xs text-muted-foreground">Currently in: {selectedRequest.currentStep?.replace("_", " ")}</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedRequest?.status === "pending_review" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailsOpen(false);
                    setRejectOpen(true);
                  }}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setDetailsOpen(false);
                    setApproveOpen(true);
                  }}
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Applicant</DialogTitle>
            <DialogDescription>
              Send an email to {selectedRequest?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="Regarding your application..."
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

      {/* Approve Confirmation */}
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve <strong>{selectedRequest?.companyName}</strong>?
              This will move them to the provisioning stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isLoading === "approve"}
            >
              {isLoading === "approve" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Reject the application from {selectedRequest?.companyName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason || isLoading === "reject"}
            >
              {isLoading === "reject" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Application"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
