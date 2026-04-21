"use client";

import { useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  Users,
  Server,
  HardDrive,
  Network,
  Database,
  Copy,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { mockTenants } from "@/stores/mock-data";

// Mock plans data
const mockPlans = [
  {
    id: "plan-starter",
    name: "Starter",
    description: "For small teams and startups",
    basePrice: 0,
    active: true,
    tenantCount: 15,
    quotas: {
      maxVMs: 5,
      maxvCPUs: 16,
      maxMemory: 32,
      maxStorage: 500,
      maxSnapshots: 10,
      maxLoadBalancers: 1,
      maxDatabases: 2,
      maxUsers: 5,
      supportLevel: "community",
      backupRetention: 7,
    },
    features: ["Basic monitoring", "Email support", "99.9% SLA"],
  },
  {
    id: "plan-professional",
    name: "Professional",
    description: "For growing businesses",
    basePrice: 99,
    active: true,
    tenantCount: 42,
    quotas: {
      maxVMs: 25,
      maxvCPUs: 64,
      maxMemory: 256,
      maxStorage: 5000,
      maxSnapshots: 50,
      maxLoadBalancers: 5,
      maxDatabases: 10,
      maxUsers: 25,
      supportLevel: "business",
      backupRetention: 30,
    },
    features: [
      "Advanced monitoring",
      "24/7 email support",
      "99.95% SLA",
      "Managed databases",
      "Auto-scaling",
    ],
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    description: "For large organizations",
    basePrice: 499,
    active: true,
    tenantCount: 8,
    quotas: {
      maxVMs: -1,
      maxvCPUs: -1,
      maxMemory: -1,
      maxStorage: -1,
      maxSnapshots: -1,
      maxLoadBalancers: -1,
      maxDatabases: -1,
      maxUsers: -1,
      supportLevel: "premium",
      backupRetention: 90,
    },
    features: [
      "Full monitoring suite",
      "24/7 phone + email support",
      "99.99% SLA",
      "Dedicated account manager",
      "Custom integrations",
      "Compliance reports",
      "Private networking",
    ],
  },
];

// Default quota templates
const quotaTemplates = [
  { name: "Compute Heavy", vms: 50, vcpus: 256, memory: 512, storage: 2000 },
  { name: "Storage Heavy", vms: 10, vcpus: 32, memory: 64, storage: 20000 },
  { name: "Balanced", vms: 25, vcpus: 128, memory: 256, storage: 5000 },
];

interface Plan {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  active: boolean;
  tenantCount: number;
  quotas: {
    maxVMs: number;
    maxvCPUs: number;
    maxMemory: number;
    maxStorage: number;
    maxSnapshots: number;
    maxLoadBalancers: number;
    maxDatabases: number;
    maxUsers: number;
    supportLevel: string;
    backupRetention: number;
  };
  features: string[];
}

interface QuotaTemplate {
  name: string;
  vms: number;
  vcpus: number;
  memory: number;
  storage: number;
}

function formatQuota(value: number): string {
  if (value === -1) return "Unlimited";
  return value.toLocaleString();
}

export default function PlansPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Plan state
  const [editPlanDialogOpen, setEditPlanDialogOpen] = useState(false);
  const [deletePlanDialogOpen, setDeletePlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Template state
  const [editTemplateDialogOpen, setEditTemplateDialogOpen] = useState(false);
  const [applyTemplateDialogOpen, setApplyTemplateDialogOpen] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuotaTemplate | null>(null);

  const planDistribution = {
    starter: mockTenants.filter((t) => t.organization.plan === "starter").length,
    professional: mockTenants.filter((t) => t.organization.plan === "professional").length,
    enterprise: mockTenants.filter((t) => t.organization.plan === "enterprise").length,
  };

  // Plan handlers
  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setEditPlanDialogOpen(true);
  };

  const handleDuplicatePlan = (plan: Plan) => {
    toast({
      title: "Plan Duplicated",
      description: `${plan.name} has been duplicated as "${plan.name} (Copy)".`,
    });
  };

  const handleDeletePlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setDeletePlanDialogOpen(true);
  };

  const confirmDeletePlan = () => {
    toast({
      title: "Plan Deleted",
      description: `${selectedPlan?.name} has been deleted.`,
    });
    setDeletePlanDialogOpen(false);
    setSelectedPlan(null);
  };

  const savePlan = () => {
    toast({
      title: "Plan Updated",
      description: `${selectedPlan?.name} has been updated.`,
    });
    setEditPlanDialogOpen(false);
    setSelectedPlan(null);
  };

  // Template handlers
  const handleEditTemplate = (template: QuotaTemplate) => {
    setSelectedTemplate(template);
    setEditTemplateDialogOpen(true);
  };

  const handleApplyTemplate = (template: QuotaTemplate) => {
    setSelectedTemplate(template);
    setApplyTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = (template: QuotaTemplate) => {
    setSelectedTemplate(template);
    setDeleteTemplateDialogOpen(true);
  };

  const confirmDeleteTemplate = () => {
    toast({
      title: "Template Deleted",
      description: `${selectedTemplate?.name} has been deleted.`,
    });
    setDeleteTemplateDialogOpen(false);
    setSelectedTemplate(null);
  };

  const saveTemplate = () => {
    toast({
      title: "Template Updated",
      description: `${selectedTemplate?.name} has been updated.`,
    });
    setEditTemplateDialogOpen(false);
    setSelectedTemplate(null);
  };

  const confirmApplyTemplate = () => {
    toast({
      title: "Template Applied",
      description: `${selectedTemplate?.name} quotas have been applied to the selected tenant.`,
    });
    setApplyTemplateDialogOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans & Quotas</h1>
          <p className="text-muted-foreground">
            Manage subscription plans and resource quotas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>
                Define a new subscription plan with custom quotas
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input id="name" placeholder="Custom Plan" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Base Price ($/mo)</Label>
                  <Input id="price" type="number" placeholder="199" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Plan description..." />
              </div>
              <div className="border-t pt-4">
                <Label className="text-base">Resource Quotas</Label>
                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div className="grid gap-2">
                    <Label htmlFor="vms" className="text-xs">Max VMs</Label>
                    <Input id="vms" type="number" placeholder="25" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vcpus" className="text-xs">Max vCPUs</Label>
                    <Input id="vcpus" type="number" placeholder="64" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="memory" className="text-xs">Max Memory (GB)</Label>
                    <Input id="memory" type="number" placeholder="256" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="storage" className="text-xs">Max Storage (GB)</Label>
                    <Input id="storage" type="number" placeholder="5000" />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Create Plan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="quotas">Quota Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          {/* Plan Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {mockPlans.map((plan) => (
              <Card key={plan.id} className="relative">
                {plan.name === "Professional" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEditPlan(plan)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDuplicatePlan(plan)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => handleDeletePlan(plan)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Plan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold">
                      ${plan.basePrice}
                    </span>
                    <span className="text-muted-foreground">/month base</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{planDistribution[plan.name.toLowerCase() as keyof typeof planDistribution] || 0}</span>
                    <span className="text-muted-foreground">active tenants</span>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium">Resource Limits</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Server className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxVMs)} VMs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Server className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxvCPUs)} vCPUs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxMemory)} GB RAM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxStorage)} GB</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Network className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxLoadBalancers)} LBs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <span>{formatQuota(plan.quotas.maxDatabases)} DBs</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium">Features</p>
                    <ul className="space-y-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm text-muted-foreground">
                      {plan.active ? "Active" : "Inactive"}
                    </span>
                    <Switch checked={plan.active} />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quotas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quota Templates</CardTitle>
              <CardDescription>
                Pre-defined quota configurations for quick tenant setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Max VMs</TableHead>
                    <TableHead>Max vCPUs</TableHead>
                    <TableHead>Max Memory</TableHead>
                    <TableHead>Max Storage</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotaTemplates.map((template, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.vms}</TableCell>
                      <TableCell>{template.vcpus}</TableCell>
                      <TableCell>{template.memory} GB</TableCell>
                      <TableCell>{template.storage} GB</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleEditTemplate(template)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleApplyTemplate(template)}>
                              Apply to Tenant
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteTemplate(template)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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

          {/* Default Limits Card */}
          <Card>
            <CardHeader>
              <CardTitle>Default Resource Limits</CardTitle>
              <CardDescription>
                Global defaults applied to new tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Max VMs per Tenant</Label>
                  <Input type="number" defaultValue="10" />
                </div>
                <div className="space-y-2">
                  <Label>Max vCPUs per VM</Label>
                  <Input type="number" defaultValue="32" />
                </div>
                <div className="space-y-2">
                  <Label>Max Memory per VM (GB)</Label>
                  <Input type="number" defaultValue="128" />
                </div>
                <div className="space-y-2">
                  <Label>Max Disk per VM (GB)</Label>
                  <Input type="number" defaultValue="2000" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button onClick={() => toast({ title: "Defaults Saved", description: "Default resource limits have been updated." })}>
                Save Defaults
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanDialogOpen} onOpenChange={setEditPlanDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update {selectedPlan?.name} plan configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Plan Name</Label>
                <Input defaultValue={selectedPlan?.name} />
              </div>
              <div className="grid gap-2">
                <Label>Base Price ($/mo)</Label>
                <Input type="number" defaultValue={selectedPlan?.basePrice} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input defaultValue={selectedPlan?.description} />
            </div>
            <div className="border-t pt-4">
              <Label className="text-base">Resource Quotas</Label>
              <div className="grid grid-cols-4 gap-4 mt-3">
                <div className="grid gap-2">
                  <Label className="text-xs">Max VMs</Label>
                  <Input type="number" defaultValue={selectedPlan?.quotas.maxVMs === -1 ? "" : selectedPlan?.quotas.maxVMs} placeholder="Unlimited" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Max vCPUs</Label>
                  <Input type="number" defaultValue={selectedPlan?.quotas.maxvCPUs === -1 ? "" : selectedPlan?.quotas.maxvCPUs} placeholder="Unlimited" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Max Memory (GB)</Label>
                  <Input type="number" defaultValue={selectedPlan?.quotas.maxMemory === -1 ? "" : selectedPlan?.quotas.maxMemory} placeholder="Unlimited" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Max Storage (GB)</Label>
                  <Input type="number" defaultValue={selectedPlan?.quotas.maxStorage === -1 ? "" : selectedPlan?.quotas.maxStorage} placeholder="Unlimited" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlanDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePlan}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Confirmation */}
      <AlertDialog open={deletePlanDialogOpen} onOpenChange={setDeletePlanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{selectedPlan?.name}&quot; plan? Tenants on this plan will need to be migrated to another plan first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePlan}>Delete Plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Template Dialog */}
      <Dialog open={editTemplateDialogOpen} onOpenChange={setEditTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Quota Template</DialogTitle>
            <DialogDescription>
              Update {selectedTemplate?.name} template configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Template Name</Label>
              <Input defaultValue={selectedTemplate?.name} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Max VMs</Label>
                <Input type="number" defaultValue={selectedTemplate?.vms} />
              </div>
              <div className="grid gap-2">
                <Label>Max vCPUs</Label>
                <Input type="number" defaultValue={selectedTemplate?.vcpus} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Max Memory (GB)</Label>
                <Input type="number" defaultValue={selectedTemplate?.memory} />
              </div>
              <div className="grid gap-2">
                <Label>Max Storage (GB)</Label>
                <Input type="number" defaultValue={selectedTemplate?.storage} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Template Dialog */}
      <Dialog open={applyTemplateDialogOpen} onOpenChange={setApplyTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply Template to Tenant</DialogTitle>
            <DialogDescription>
              Apply &quot;{selectedTemplate?.name}&quot; quotas to a tenant
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Select Tenant</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {mockTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm font-medium mb-2">Quotas to apply:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>VMs: {selectedTemplate?.vms}</p>
                <p>vCPUs: {selectedTemplate?.vcpus}</p>
                <p>Memory: {selectedTemplate?.memory} GB</p>
                <p>Storage: {selectedTemplate?.storage} GB</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmApplyTemplate}>Apply Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <AlertDialog open={deleteTemplateDialogOpen} onOpenChange={setDeleteTemplateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &quot;{selectedTemplate?.name}&quot; template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTemplate}>Delete Template</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
