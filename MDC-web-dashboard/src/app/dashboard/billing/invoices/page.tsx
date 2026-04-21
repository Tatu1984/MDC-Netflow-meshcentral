"use client";

import { useState } from "react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Eye,
  FileText,
  Calendar,
  Search,
  MoreHorizontal,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
  CreditCard,
  Building2,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock invoice data
const mockInvoices = [
  {
    id: "INV-2026-001",
    date: "2026-01-01",
    dueDate: "2026-01-15",
    amount: 2847.52,
    status: "paid",
    paidDate: "2026-01-10",
    period: "December 2025",
    paymentMethod: "Visa ending in 4242",
  },
  {
    id: "INV-2025-012",
    date: "2025-12-01",
    dueDate: "2025-12-15",
    amount: 2654.18,
    status: "paid",
    paidDate: "2025-12-12",
    period: "November 2025",
    paymentMethod: "Visa ending in 4242",
  },
  {
    id: "INV-2025-011",
    date: "2025-11-01",
    dueDate: "2025-11-15",
    amount: 2489.90,
    status: "paid",
    paidDate: "2025-11-14",
    period: "October 2025",
    paymentMethod: "Visa ending in 4242",
  },
  {
    id: "INV-2025-010",
    date: "2025-10-01",
    dueDate: "2025-10-15",
    amount: 2312.45,
    status: "paid",
    paidDate: "2025-10-15",
    period: "September 2025",
    paymentMethod: "Visa ending in 4242",
  },
  {
    id: "INV-2025-009",
    date: "2025-09-01",
    dueDate: "2025-09-15",
    amount: 2156.80,
    status: "paid",
    paidDate: "2025-09-10",
    period: "August 2025",
    paymentMethod: "Mastercard ending in 8888",
  },
  {
    id: "INV-2025-008",
    date: "2025-08-01",
    dueDate: "2025-08-15",
    amount: 1987.32,
    status: "paid",
    paidDate: "2025-08-12",
    period: "July 2025",
    paymentMethod: "Mastercard ending in 8888",
  },
];

// Mock current period charges (pending invoice)
const currentCharges = {
  id: "INV-2026-002",
  date: "2026-02-01",
  dueDate: "2026-02-15",
  amount: 3120.00,
  status: "pending",
  period: "January 2026",
  lineItems: [
    { description: "Compute - Standard VMs", usage: "1,420 hours", unitPrice: 0.13, amount: 1842.60 },
    { description: "Block Storage - SSD", usage: "1,800 GB-months", unitPrice: 0.18, amount: 324.00 },
    { description: "Object Storage", usage: "170 GB-months", unitPrice: 0.15, amount: 25.50 },
    { description: "Network Egress", usage: "450 GB", unitPrice: 0.09, amount: 40.50 },
    { description: "Load Balancers - Application", usage: "744 hours", unitPrice: 0.20, amount: 148.80 },
    { description: "Kubernetes Clusters", usage: "2 clusters", unitPrice: 150.00, amount: 300.00 },
    { description: "Managed PostgreSQL - Standard", usage: "2 instances", unitPrice: 45.50, amount: 91.00 },
    { description: "Managed PostgreSQL - High Memory", usage: "1 instance", unitPrice: 75.12, amount: 75.12 },
    { description: "DNS Queries", usage: "10M queries", unitPrice: 0.50, amount: 5.00 },
    { description: "Snapshot Storage", usage: "250 GB", unitPrice: 0.05, amount: 12.50 },
  ],
  subtotal: 2865.02,
  credits: -45.02,
  tax: 300.00,
  total: 3120.00,
};

// Mock payment history
const paymentHistory = [
  { id: "PAY-001", date: "2026-01-10", amount: 2847.52, method: "Visa ending in 4242", invoiceId: "INV-2026-001", status: "successful" },
  { id: "PAY-002", date: "2025-12-12", amount: 2654.18, method: "Visa ending in 4242", invoiceId: "INV-2025-012", status: "successful" },
  { id: "PAY-003", date: "2025-11-14", amount: 2489.90, method: "Visa ending in 4242", invoiceId: "INV-2025-011", status: "successful" },
  { id: "PAY-004", date: "2025-10-15", amount: 2312.45, method: "Visa ending in 4242", invoiceId: "INV-2025-010", status: "successful" },
  { id: "PAY-005", date: "2025-09-10", amount: 2156.80, method: "Mastercard ending in 8888", invoiceId: "INV-2025-009", status: "successful" },
  { id: "PAY-006", date: "2025-08-12", amount: 1987.32, method: "Mastercard ending in 8888", invoiceId: "INV-2025-008", status: "successful" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-1 h-3 w-3" />Paid</Badge>;
    case "pending":
      return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
    case "overdue":
      return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Overdue</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function InvoicesPage() {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<typeof currentCharges | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch = invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.period.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewInvoice = (invoice: typeof mockInvoices[0]) => {
    // For demo purposes, show current charges details for all invoices
    setSelectedInvoice({
      ...currentCharges,
      id: invoice.id,
      date: invoice.date,
      dueDate: invoice.dueDate,
      amount: invoice.amount,
      status: invoice.status,
      period: invoice.period,
      total: invoice.amount,
    });
  };

  const handleDownloadPDF = (invoiceId: string) => {
    toast({
      title: "Downloading Invoice",
      description: `Preparing PDF for ${invoiceId}`,
    });
  };

  const handleEmailInvoice = (invoiceId: string) => {
    toast({
      title: "Email Sent",
      description: `Invoice ${invoiceId} has been sent to your email`,
    });
  };

  const totalPaid = mockInvoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Invoices"
        apis={[
          "GET /api/billing/invoices",
          "GET /api/billing/invoices/{id}",
          "GET /api/billing/invoices/{id}/pdf",
          "POST /api/billing/invoices/{id}/pay"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            View and manage your billing invoices
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Period</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentCharges.amount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Due {new Date(currentCharges.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Invoice</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mockInvoices[0].amount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {mockInvoices[0].period}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Year to Date</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {mockInvoices.length} invoices paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">All Paid</div>
            <p className="text-xs text-muted-foreground">
              No overdue invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Period Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Current Billing Period
              </CardTitle>
              <CardDescription>January 1 - January 31, 2026</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${currentCharges.amount.toLocaleString()}</div>
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                <Clock className="mr-1 h-3 w-3" />
                Estimated
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Invoice will be generated on February 1, 2026
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(currentCharges)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Invoices and Payment History */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">
            <FileText className="mr-2 h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-2 h-4 w-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>A list of all your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Billing Period</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {invoice.id}
                        </div>
                      </TableCell>
                      <TableCell>{invoice.period}</TableCell>
                      <TableCell>
                        {new Date(invoice.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="font-medium">${invoice.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleViewInvoice(invoice)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDownloadPDF(invoice.id)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEmailInvoice(invoice.id)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Email Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>A record of all your payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.id}</TableCell>
                      <TableCell>
                        {new Date(payment.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell>
                        <Button variant="link" className="h-auto p-0 text-primary">
                          {payment.invoiceId}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          {payment.method}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${payment.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Successful
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice {selectedInvoice?.id}
            </DialogTitle>
            <DialogDescription>
              Billing period: {selectedInvoice?.period}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="flex justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Building2 className="h-4 w-4" />
                    Bill To
                  </div>
                  <div className="font-medium">Acme Corporation</div>
                  <div className="text-sm text-muted-foreground">
                    123 Business Ave, Suite 100<br />
                    San Francisco, CA 94102<br />
                    United States
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-2">{getStatusBadge(selectedInvoice.status)}</div>
                  <div className="text-sm text-muted-foreground">
                    Invoice Date: {new Date(selectedInvoice.date).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Due Date: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Line Items */}
              <div>
                <h4 className="font-medium mb-4">Charges</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentCharges.lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-muted-foreground">{item.usage}</TableCell>
                        <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${item.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${currentCharges.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credits Applied</span>
                  <span className="text-green-600">{currentCharges.credits < 0 ? "-" : ""}${Math.abs(currentCharges.credits).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${currentCharges.tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>${selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Invoice
                </Button>
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
