"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Server,
  HardDrive,
  Network,
  Tag,
  History,
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
  CardFooter,
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Mock pricing data
const computePricing = [
  { sku: "vm.standard.1x2", name: "Standard 1 vCPU / 2GB", hourly: 0.012, monthly: 8.64 },
  { sku: "vm.standard.2x4", name: "Standard 2 vCPU / 4GB", hourly: 0.024, monthly: 17.28 },
  { sku: "vm.standard.4x8", name: "Standard 4 vCPU / 8GB", hourly: 0.048, monthly: 34.56 },
  { sku: "vm.standard.8x16", name: "Standard 8 vCPU / 16GB", hourly: 0.096, monthly: 69.12 },
  { sku: "vm.highmem.2x8", name: "High Memory 2 vCPU / 8GB", hourly: 0.032, monthly: 23.04 },
  { sku: "vm.highmem.4x16", name: "High Memory 4 vCPU / 16GB", hourly: 0.064, monthly: 46.08 },
  { sku: "vm.highmem.8x32", name: "High Memory 8 vCPU / 32GB", hourly: 0.128, monthly: 92.16 },
  { sku: "vm.highcpu.4x4", name: "High CPU 4 vCPU / 4GB", hourly: 0.056, monthly: 40.32 },
  { sku: "vm.highcpu.8x8", name: "High CPU 8 vCPU / 8GB", hourly: 0.112, monthly: 80.64 },
];

const storagePricing = [
  { sku: "storage.block.ssd", name: "SSD Block Storage", unit: "GB/month", price: 0.10 },
  { sku: "storage.block.hdd", name: "HDD Block Storage", unit: "GB/month", price: 0.04 },
  { sku: "storage.object.standard", name: "Object Storage - Standard", unit: "GB/month", price: 0.023 },
  { sku: "storage.object.infrequent", name: "Object Storage - Infrequent", unit: "GB/month", price: 0.0125 },
  { sku: "storage.object.archive", name: "Object Storage - Archive", unit: "GB/month", price: 0.004 },
  { sku: "storage.file.standard", name: "File Storage - Standard", unit: "GB/month", price: 0.12 },
  { sku: "storage.file.premium", name: "File Storage - Premium", unit: "GB/month", price: 0.20 },
  { sku: "storage.backup", name: "Backup Storage", unit: "GB/month", price: 0.05 },
];

const networkPricing = [
  { sku: "network.egress.internet", name: "Internet Egress", unit: "GB", price: 0.09, tiers: true },
  { sku: "network.egress.region", name: "Cross-Region Egress", unit: "GB", price: 0.02 },
  { sku: "network.lb.standard", name: "Standard Load Balancer", unit: "hour", price: 0.025 },
  { sku: "network.lb.premium", name: "Premium Load Balancer", unit: "hour", price: 0.05 },
  { sku: "network.ip.static", name: "Static IP Address", unit: "hour", price: 0.005 },
  { sku: "network.vpn.gateway", name: "VPN Gateway", unit: "hour", price: 0.05 },
];

const databasePricing = [
  { sku: "db.postgresql.small", name: "PostgreSQL - Small (2 vCPU / 4GB)", unit: "hour", price: 0.068 },
  { sku: "db.postgresql.medium", name: "PostgreSQL - Medium (4 vCPU / 8GB)", unit: "hour", price: 0.136 },
  { sku: "db.postgresql.large", name: "PostgreSQL - Large (8 vCPU / 16GB)", unit: "hour", price: 0.272 },
  { sku: "db.mysql.small", name: "MySQL - Small (2 vCPU / 4GB)", unit: "hour", price: 0.068 },
  { sku: "db.mysql.medium", name: "MySQL - Medium (4 vCPU / 8GB)", unit: "hour", price: 0.136 },
  { sku: "db.mysql.large", name: "MySQL - Large (8 vCPU / 16GB)", unit: "hour", price: 0.272 },
];

const discounts = [
  { name: "1-Year Reserved", type: "commitment", discount: 30, minCommitment: "$1,000/mo" },
  { name: "3-Year Reserved", type: "commitment", discount: 50, minCommitment: "$1,000/mo" },
  { name: "Startup Program", type: "program", discount: 25, eligibility: "< 2 years old, VC backed" },
  { name: "Non-Profit", type: "program", discount: 20, eligibility: "501(c)(3) status" },
  { name: "Volume Discount", type: "usage", discount: 15, threshold: "> $10,000/mo" },
];

export default function PricingPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editPriceDialogOpen, setEditPriceDialogOpen] = useState(false);
  const [priceHistoryDialogOpen, setPriceHistoryDialogOpen] = useState(false);
  const [disableSkuDialogOpen, setDisableSkuDialogOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState<{ sku: string; name: string } | null>(null);

  const handleEditPrice = (sku: string, name: string) => {
    setSelectedSku({ sku, name });
    setEditPriceDialogOpen(true);
  };

  const handleViewHistory = (sku: string, name: string) => {
    setSelectedSku({ sku, name });
    setPriceHistoryDialogOpen(true);
  };

  const handleDisableSku = (sku: string, name: string) => {
    setSelectedSku({ sku, name });
    setDisableSkuDialogOpen(true);
  };

  const confirmDisableSku = () => {
    toast({
      title: "SKU Disabled",
      description: `${selectedSku?.sku} has been disabled successfully.`,
    });
    setDisableSkuDialogOpen(false);
    setSelectedSku(null);
  };

  const savePrice = () => {
    toast({
      title: "Price Updated",
      description: `Pricing for ${selectedSku?.sku} has been updated.`,
    });
    setEditPriceDialogOpen(false);
    setSelectedSku(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
          <p className="text-muted-foreground">
            Manage product pricing and discount programs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" />
            Price History
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Product SKU</DialogTitle>
                <DialogDescription>
                  Create a new billable product
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>SKU</Label>
                  <Input placeholder="vm.custom.4x8" />
                </div>
                <div className="grid gap-2">
                  <Label>Display Name</Label>
                  <Input placeholder="Custom 4 vCPU / 8GB" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compute">Compute</SelectItem>
                        <SelectItem value="storage">Storage</SelectItem>
                        <SelectItem value="network">Network</SelectItem>
                        <SelectItem value="database">Database</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Billing Unit</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hour">Per Hour</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="gb">Per GB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Price (USD)</Label>
                  <Input type="number" step="0.001" placeholder="0.048" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>Add Product</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compute SKUs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{computePricing.length}</div>
            <p className="text-xs text-muted-foreground">VM configurations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage SKUs</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storagePricing.length}</div>
            <p className="text-xs text-muted-foreground">Storage options</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network SKUs</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networkPricing.length}</div>
            <p className="text-xs text-muted-foreground">Network services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Discounts</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discounts.length}</div>
            <p className="text-xs text-muted-foreground">Discount programs</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compute" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compute">Compute</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
        </TabsList>

        <TabsContent value="compute">
          <Card>
            <CardHeader>
              <CardTitle>Compute Pricing</CardTitle>
              <CardDescription>Virtual machine instance pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Hourly</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {computePricing.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>${item.hourly.toFixed(3)}</TableCell>
                      <TableCell className="font-medium">${item.monthly.toFixed(2)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEditPrice(item.sku, item.name)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Price
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleViewHistory(item.sku, item.name)}>
                              View History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleDisableSku(item.sku, item.name)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Disable SKU
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

        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle>Storage Pricing</CardTitle>
              <CardDescription>Block, object, and file storage pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storagePricing.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="font-medium">${item.price.toFixed(3)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle>Network Pricing</CardTitle>
              <CardDescription>Bandwidth and network service pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {networkPricing.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>
                        {item.name}
                        {item.tiers && <Badge variant="outline" className="ml-2">Tiered</Badge>}
                      </TableCell>
                      <TableCell>per {item.unit}</TableCell>
                      <TableCell className="font-medium">${item.price.toFixed(3)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Pricing</CardTitle>
              <CardDescription>Managed database service pricing</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Configuration</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Hourly</TableHead>
                    <TableHead>Monthly Est.</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {databasePricing.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>per {item.unit}</TableCell>
                      <TableCell>${item.price.toFixed(3)}</TableCell>
                      <TableCell className="font-medium">${(item.price * 720).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Discount Programs</CardTitle>
                <CardDescription>Active discount and commitment programs</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Discount
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {discounts.map((discount, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{discount.name}</CardTitle>
                        <Badge>{discount.type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {discount.discount}% off
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {discount.minCommitment || discount.threshold || discount.eligibility}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="mr-2 h-3 w-3" />
                        Configure
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Price Dialog */}
      <Dialog open={editPriceDialogOpen} onOpenChange={setEditPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Price</DialogTitle>
            <DialogDescription>
              Update pricing for {selectedSku?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>SKU</Label>
              <Input value={selectedSku?.sku || ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Hourly Price (USD)</Label>
              <Input type="number" step="0.001" placeholder="0.048" />
            </div>
            <div className="grid gap-2">
              <Label>Monthly Price (USD)</Label>
              <Input type="number" step="0.01" placeholder="34.56" />
            </div>
            <div className="grid gap-2">
              <Label>Effective Date</Label>
              <Input type="date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPriceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePrice}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={priceHistoryDialogOpen} onOpenChange={setPriceHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Price History</DialogTitle>
            <DialogDescription>
              Historical pricing for {selectedSku?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Hourly</TableHead>
                  <TableHead>Monthly</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Mar 1, 2024</TableCell>
                  <TableCell>$0.048</TableCell>
                  <TableCell>$34.56</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Jan 1, 2024</TableCell>
                  <TableCell>$0.045</TableCell>
                  <TableCell>$32.40</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Oct 1, 2023</TableCell>
                  <TableCell>$0.042</TableCell>
                  <TableCell>$30.24</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable SKU Confirmation */}
      <AlertDialog open={disableSkuDialogOpen} onOpenChange={setDisableSkuDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable SKU</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable {selectedSku?.sku}? This will prevent new resources from being provisioned with this SKU. Existing resources will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisableSku}>Disable SKU</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
