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
import {
  CreditCard,
  Plus,
  MoreHorizontal,
  Star,
  Trash2,
  Edit,
  Building2,
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock payment methods
const mockPaymentMethods = [
  {
    id: "pm-001",
    type: "visa",
    brand: "Visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2027,
    isDefault: true,
    name: "John Smith",
    addedAt: "2024-01-15",
  },
  {
    id: "pm-002",
    type: "mastercard",
    brand: "Mastercard",
    last4: "8888",
    expMonth: 6,
    expYear: 2026,
    isDefault: false,
    name: "John Smith",
    addedAt: "2023-06-20",
  },
  {
    id: "pm-003",
    type: "amex",
    brand: "American Express",
    last4: "1234",
    expMonth: 3,
    expYear: 2028,
    isDefault: false,
    name: "John Smith",
    addedAt: "2024-09-10",
  },
];

// Mock billing address
const mockBillingAddress = {
  name: "Acme Corporation",
  attention: "John Smith",
  addressLine1: "123 Business Ave",
  addressLine2: "Suite 100",
  city: "San Francisco",
  state: "CA",
  postalCode: "94102",
  country: "United States",
  phone: "+1 (555) 123-4567",
  email: "billing@acme.com",
  taxId: "XX-XXXXXXX",
};

// Mock transaction history
const mockTransactions = [
  {
    id: "txn-001",
    date: "2026-01-10",
    description: "Invoice INV-2026-001 - December 2025",
    amount: -2847.52,
    type: "payment",
    status: "completed",
    method: "Visa ending in 4242",
    invoiceId: "INV-2026-001",
  },
  {
    id: "txn-002",
    date: "2026-01-05",
    description: "Promotional credit applied",
    amount: 50.00,
    type: "credit",
    status: "completed",
    method: null,
    invoiceId: null,
  },
  {
    id: "txn-003",
    date: "2025-12-12",
    description: "Invoice INV-2025-012 - November 2025",
    amount: -2654.18,
    type: "payment",
    status: "completed",
    method: "Visa ending in 4242",
    invoiceId: "INV-2025-012",
  },
  {
    id: "txn-004",
    date: "2025-11-14",
    description: "Invoice INV-2025-011 - October 2025",
    amount: -2489.90,
    type: "payment",
    status: "completed",
    method: "Visa ending in 4242",
    invoiceId: "INV-2025-011",
  },
  {
    id: "txn-005",
    date: "2025-11-01",
    description: "Annual commitment credit",
    amount: 500.00,
    type: "credit",
    status: "completed",
    method: null,
    invoiceId: null,
  },
  {
    id: "txn-006",
    date: "2025-10-15",
    description: "Invoice INV-2025-010 - September 2025",
    amount: -2312.45,
    type: "payment",
    status: "completed",
    method: "Visa ending in 4242",
    invoiceId: "INV-2025-010",
  },
  {
    id: "txn-007",
    date: "2025-09-10",
    description: "Invoice INV-2025-009 - August 2025",
    amount: -2156.80,
    type: "payment",
    status: "completed",
    method: "Mastercard ending in 8888",
    invoiceId: "INV-2025-009",
  },
  {
    id: "txn-008",
    date: "2025-08-12",
    description: "Invoice INV-2025-008 - July 2025",
    amount: -1987.32,
    type: "payment",
    status: "completed",
    method: "Mastercard ending in 8888",
    invoiceId: "INV-2025-008",
  },
];

const getCardIcon = (type: string) => {
  // In production, you'd use actual card brand icons
  const iconColors: Record<string, string> = {
    visa: "text-blue-600",
    mastercard: "text-orange-600",
    amex: "text-blue-800",
  };
  return <CreditCard className={`h-6 w-6 ${iconColors[type] || "text-muted-foreground"}`} />;
};

const getCardBgColor = (type: string) => {
  const bgColors: Record<string, string> = {
    visa: "bg-gradient-to-br from-blue-600 to-blue-800",
    mastercard: "bg-gradient-to-br from-orange-500 to-red-600",
    amex: "bg-gradient-to-br from-slate-600 to-slate-800",
  };
  return bgColors[type] || "bg-gradient-to-br from-gray-600 to-gray-800";
};

export default function PaymentPage() {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState(mockPaymentMethods);
  const [billingAddress, setBillingAddress] = useState(mockBillingAddress);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [editedAddress, setEditedAddress] = useState(mockBillingAddress);

  // Form state for new card
  const [newCard, setNewCard] = useState({
    cardNumber: "",
    expMonth: "",
    expYear: "",
    cvc: "",
    name: "",
  });

  const handleSetDefault = (cardId: string) => {
    setPaymentMethods(methods =>
      methods.map(method => ({
        ...method,
        isDefault: method.id === cardId,
      }))
    );
  };

  const handleDeleteCard = (cardId: string) => {
    setPaymentMethods(methods => methods.filter(m => m.id !== cardId));
    setCardToDelete(null);
  };

  const handleAddCard = () => {
    // Simulate adding a card
    const newPaymentMethod = {
      id: `pm-${Date.now()}`,
      type: "visa",
      brand: "Visa",
      last4: newCard.cardNumber.slice(-4) || "0000",
      expMonth: parseInt(newCard.expMonth) || 1,
      expYear: parseInt(newCard.expYear) || 2025,
      isDefault: paymentMethods.length === 0,
      name: newCard.name || "Card Holder",
      addedAt: new Date().toISOString().split("T")[0],
    };
    setPaymentMethods([...paymentMethods, newPaymentMethod]);
    setIsAddCardOpen(false);
    setNewCard({ cardNumber: "", expMonth: "", expYear: "", cvc: "", name: "" });
  };

  const handleSaveAddress = () => {
    setBillingAddress(editedAddress);
    setIsEditAddressOpen(false);
  };

  const handleEditCard = (cardId: string, brand: string) => {
    toast({
      title: "Edit Payment Method",
      description: `Opening editor for ${brand} card`,
    });
  };

  const totalCredits = mockTransactions
    .filter(t => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayments = mockTransactions
    .filter(t => t.type === "payment")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Payment Methods"
        apis={[
          "GET /api/billing/payment-methods",
          "POST /api/billing/payment-methods",
          "DELETE /api/billing/payment-methods/{id}",
          "PUT /api/billing/payment-methods/{id}/default"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
          <p className="text-muted-foreground">
            Manage your payment methods and billing information
          </p>
        </div>
        <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Method
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Add Payment Method
              </DialogTitle>
              <DialogDescription>
                Add a new credit or debit card to your account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={newCard.cardNumber}
                  onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expMonth">Exp. Month</Label>
                  <Select
                    value={newCard.expMonth}
                    onValueChange={(value) => setNewCard({ ...newCard, expMonth: value })}
                  >
                    <SelectTrigger id="expMonth">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>
                          {String(i + 1).padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expYear">Exp. Year</Label>
                  <Select
                    value={newCard.expYear}
                    onValueChange={(value) => setNewCard({ ...newCard, expYear: value })}
                  >
                    <SelectTrigger id="expYear">
                      <SelectValue placeholder="YYYY" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => (
                        <SelectItem key={i} value={String(2024 + i)}>
                          {2024 + i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    maxLength={4}
                    value={newCard.cvc}
                    onChange={(e) => setNewCard({ ...newCard, cvc: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardName">Name on Card</Label>
                <Input
                  id="cardName"
                  placeholder="John Smith"
                  value={newCard.name}
                  onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">
                  Your payment information is encrypted and secure
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCardOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCard}>
                Add Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentMethods.length}</div>
            <p className="text-xs text-muted-foreground">
              {paymentMethods.filter(m => m.isDefault).length > 0 ? "1 default" : "No default set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$0.00</div>
            <p className="text-xs text-muted-foreground">
              No outstanding balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Applied to next invoice
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid (YTD)</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPayments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {mockTransactions.filter(t => t.type === "payment").length} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="methods" className="space-y-4">
        <TabsList>
          <TabsTrigger value="methods">
            <CreditCard className="mr-2 h-4 w-4" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="address">
            <Building2 className="mr-2 h-4 w-4" />
            Billing Address
          </TabsTrigger>
          <TabsTrigger value="transactions">
            <History className="mr-2 h-4 w-4" />
            Transaction History
          </TabsTrigger>
        </TabsList>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paymentMethods.map((method) => (
              <Card key={method.id} className={method.isDefault ? "border-primary" : ""}>
                <CardContent className="pt-6">
                  {/* Card Visual */}
                  <div className={`${getCardBgColor(method.type)} rounded-lg p-4 text-white mb-4 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                      <div className="flex justify-between items-start mb-8">
                        <div className="w-10 h-7 bg-gradient-to-br from-yellow-200 to-yellow-400 rounded" />
                        {method.isDefault && (
                          <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                            <Star className="mr-1 h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="font-mono text-lg tracking-wider mb-4">
                        **** **** **** {method.last4}
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-xs text-white/70">Card Holder</div>
                          <div className="text-sm">{method.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-white/70">Expires</div>
                          <div className="text-sm">
                            {String(method.expMonth).padStart(2, "0")}/{method.expYear}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCardIcon(method.type)}
                      <div>
                        <div className="font-medium">{method.brand} ending in {method.last4}</div>
                        <div className="text-sm text-muted-foreground">
                          Added {new Date(method.addedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!method.isDefault && (
                          <DropdownMenuItem onSelect={() => handleSetDefault(method.id)}>
                            <Star className="mr-2 h-4 w-4" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => handleEditCard(method.id, method.brand)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setCardToDelete(method.id)}
                          disabled={method.isDefault}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add New Card Placeholder */}
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">Add a new payment method</p>
                <Button variant="outline" onClick={() => setIsAddCardOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Card
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Payment Settings Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">Auto-pay</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically pay invoices on due date
                    </div>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-600">Enabled</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium">3D Secure</div>
                    <div className="text-sm text-muted-foreground">
                      Additional authentication for payments
                    </div>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-600">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Address Tab */}
        <TabsContent value="address" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Billing Address</CardTitle>
                <CardDescription>
                  This address will appear on your invoices
                </CardDescription>
              </div>
              <Dialog open={isEditAddressOpen} onOpenChange={setIsEditAddressOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Address
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Edit Billing Address</DialogTitle>
                    <DialogDescription>
                      Update your billing address information
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          value={editedAddress.name}
                          onChange={(e) => setEditedAddress({ ...editedAddress, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="attention">Attention</Label>
                        <Input
                          id="attention"
                          value={editedAddress.attention}
                          onChange={(e) => setEditedAddress({ ...editedAddress, attention: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addressLine1">Address Line 1</Label>
                      <Input
                        id="addressLine1"
                        value={editedAddress.addressLine1}
                        onChange={(e) => setEditedAddress({ ...editedAddress, addressLine1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addressLine2">Address Line 2</Label>
                      <Input
                        id="addressLine2"
                        value={editedAddress.addressLine2}
                        onChange={(e) => setEditedAddress({ ...editedAddress, addressLine2: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={editedAddress.city}
                          onChange={(e) => setEditedAddress({ ...editedAddress, city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State / Province</Label>
                        <Input
                          id="state"
                          value={editedAddress.state}
                          onChange={(e) => setEditedAddress({ ...editedAddress, state: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          value={editedAddress.postalCode}
                          onChange={(e) => setEditedAddress({ ...editedAddress, postalCode: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select
                          value={editedAddress.country}
                          onValueChange={(value) => setEditedAddress({ ...editedAddress, country: value })}
                        >
                          <SelectTrigger id="country">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="United States">United States</SelectItem>
                            <SelectItem value="Canada">Canada</SelectItem>
                            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                            <SelectItem value="Germany">Germany</SelectItem>
                            <SelectItem value="France">France</SelectItem>
                            <SelectItem value="Australia">Australia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={editedAddress.phone}
                          onChange={(e) => setEditedAddress({ ...editedAddress, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Billing Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editedAddress.email}
                          onChange={(e) => setEditedAddress({ ...editedAddress, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                      <Input
                        id="taxId"
                        value={editedAddress.taxId}
                        onChange={(e) => setEditedAddress({ ...editedAddress, taxId: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditAddressOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveAddress}>
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">{billingAddress.name}</div>
                      <div className="text-sm text-muted-foreground">Attn: {billingAddress.attention}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <div>{billingAddress.addressLine1}</div>
                      {billingAddress.addressLine2 && <div>{billingAddress.addressLine2}</div>}
                      <div>{billingAddress.city}, {billingAddress.state} {billingAddress.postalCode}</div>
                      <div>{billingAddress.country}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 flex items-center justify-center text-muted-foreground">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                      </svg>
                    </div>
                    <div className="text-sm">{billingAddress.phone}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 flex items-center justify-center text-muted-foreground">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
                      </svg>
                    </div>
                    <div className="text-sm">{billingAddress.email}</div>
                  </div>
                  {billingAddress.taxId && (
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 flex items-center justify-center text-muted-foreground">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10,9 9,9 8,9" />
                        </svg>
                      </div>
                      <div className="text-sm">Tax ID: {billingAddress.taxId}</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Invoice Format</div>
                  <div className="text-sm text-muted-foreground">
                    How invoices are delivered
                  </div>
                </div>
                <Badge variant="outline">PDF via Email</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Invoice Currency</div>
                  <div className="text-sm text-muted-foreground">
                    Currency for all billing
                  </div>
                </div>
                <Badge variant="outline">USD ($)</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Billing Cycle</div>
                  <div className="text-sm text-muted-foreground">
                    When invoices are generated
                  </div>
                </div>
                <Badge variant="outline">Monthly (1st of month)</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                A complete record of all billing transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTransactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(txn.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <div className="font-medium truncate">{txn.description}</div>
                          {txn.invoiceId && (
                            <Button variant="link" className="h-auto p-0 text-xs text-primary">
                              View Invoice
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={txn.type === "credit" ? "default" : "secondary"}>
                          {txn.type === "credit" ? (
                            <>
                              <ArrowDownRight className="mr-1 h-3 w-3" />
                              Credit
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="mr-1 h-3 w-3" />
                              Payment
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {txn.method ? (
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{txn.method}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={txn.amount > 0 ? "text-green-600 font-medium" : "font-medium"}>
                          {txn.amount > 0 ? "+" : ""}${Math.abs(txn.amount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Completed
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

      {/* Delete Card Confirmation Dialog */}
      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this payment method? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cardToDelete && handleDeleteCard(cardToDelete)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
