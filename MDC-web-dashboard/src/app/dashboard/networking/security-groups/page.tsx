"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, Shield, ArrowDownLeft, ArrowUpRight, Trash2, Loader2, Edit, Server } from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { mockSecurityGroups } from "@/stores/mock-data";
import { SecurityGroup } from "@/types";

export default function SecurityGroupsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Dialog states
  const [sgToEdit, setSgToEdit] = useState<SecurityGroup | null>(null);
  const [sgForResources, setSgForResources] = useState<SecurityGroup | null>(null);
  const [sgToDelete, setSgToDelete] = useState<SecurityGroup | null>(null);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [selectedSgForRule, setSelectedSgForRule] = useState<SecurityGroup | null>(null);

  // Form states
  const [ruleDirection, setRuleDirection] = useState<"inbound" | "outbound">("inbound");
  const [ruleProtocol, setRuleProtocol] = useState("");
  const [rulePortRange, setRulePortRange] = useState("");
  const [ruleSource, setRuleSource] = useState("");
  const [ruleAction, setRuleAction] = useState<"allow" | "deny">("allow");

  const handleAddRule = async () => {
    if (!selectedSgForRule || !ruleProtocol || !rulePortRange || !ruleSource) return;
    setIsLoading("add-rule");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Rule Added",
      description: `New ${ruleDirection} rule has been added to ${selectedSgForRule.name}`,
    });
    setAddRuleOpen(false);
    setSelectedSgForRule(null);
    setRuleProtocol("");
    setRulePortRange("");
    setRuleSource("");
  };

  const handleDelete = async () => {
    if (!sgToDelete) return;
    setIsLoading("delete");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(null);
    toast({
      title: "Security Group Deleted",
      description: `Security group "${sgToDelete.name}" has been deleted`,
      variant: "destructive",
    });
    setSgToDelete(null);
  };

  const openAddRuleDialog = (sg: SecurityGroup, direction: "inbound" | "outbound") => {
    setSelectedSgForRule(sg);
    setRuleDirection(direction);
    setAddRuleOpen(true);
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Security Groups"
        apis={[
          "GET /api/security-groups",
          "POST /api/security-groups",
          "PUT /api/security-groups/{id}",
          "DELETE /api/security-groups/{id}",
          "PUT /api/security-groups/{id}/rules"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Groups</h1>
          <p className="text-muted-foreground">
            Configure firewall rules for your resources
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/networking/security-groups/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Security Group
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {mockSecurityGroups.map((sg) => (
          <Card key={sg.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-orange-500/10 p-2">
                  <Shield className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">{sg.name}</CardTitle>
                  <CardDescription>{sg.description}</CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setSgToEdit(sg)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Rules
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSgForResources(sg)}>
                    <Server className="mr-2 h-4 w-4" />
                    View Attached Resources
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => setSgToDelete(sg)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Security Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="inbound">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      Inbound Rules ({sg.rules.filter((r) => r.direction === "inbound").length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocol</TableHead>
                          <TableHead>Port Range</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sg.rules
                          .filter((r) => r.direction === "inbound")
                          .map((rule) => (
                            <TableRow key={rule.id}>
                              <TableCell>
                                <Badge variant="outline">{rule.protocol.toUpperCase()}</Badge>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {rule.portRange}
                                </code>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {rule.source}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={rule.action === "allow" ? "default" : "destructive"}
                                >
                                  {rule.action}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddRuleDialog(sg, "inbound")}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Inbound Rule
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="outbound">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-blue-500" />
                      Outbound Rules ({sg.rules.filter((r) => r.direction === "outbound").length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Protocol</TableHead>
                          <TableHead>Port Range</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sg.rules
                          .filter((r) => r.direction === "outbound")
                          .map((rule) => (
                            <TableRow key={rule.id}>
                              <TableCell>
                                <Badge variant="outline">{rule.protocol.toUpperCase()}</Badge>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {rule.portRange}
                                </code>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {rule.source}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={rule.action === "allow" ? "default" : "destructive"}
                                >
                                  {rule.action}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddRuleDialog(sg, "outbound")}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Outbound Rule
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Rules Dialog */}
      <Dialog open={!!sgToEdit} onOpenChange={() => setSgToEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Security Group Rules</DialogTitle>
            <DialogDescription>
              Manage rules for {sgToEdit?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-green-500" />
                Inbound Rules
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sgToEdit?.rules
                    .filter((r) => r.direction === "inbound")
                    .map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.protocol.toUpperCase()}</TableCell>
                        <TableCell>{rule.portRange}</TableCell>
                        <TableCell>{rule.source}</TableCell>
                        <TableCell>
                          <Badge variant={rule.action === "allow" ? "default" : "destructive"}>
                            {rule.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={() => sgToEdit && openAddRuleDialog(sgToEdit, "inbound")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-blue-500" />
                Outbound Rules
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sgToEdit?.rules
                    .filter((r) => r.direction === "outbound")
                    .map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.protocol.toUpperCase()}</TableCell>
                        <TableCell>{rule.portRange}</TableCell>
                        <TableCell>{rule.source}</TableCell>
                        <TableCell>
                          <Badge variant={rule.action === "allow" ? "default" : "destructive"}>
                            {rule.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={() => sgToEdit && openAddRuleDialog(sgToEdit, "outbound")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSgToEdit(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {ruleDirection === "inbound" ? "Inbound" : "Outbound"} Rule</DialogTitle>
            <DialogDescription>
              Add a new firewall rule to {selectedSgForRule?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={ruleProtocol} onValueChange={setRuleProtocol}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="icmp">ICMP</SelectItem>
                  <SelectItem value="all">All Traffic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="port-range">Port Range</Label>
              <Input
                id="port-range"
                value={rulePortRange}
                onChange={(e) => setRulePortRange(e.target.value)}
                placeholder="e.g., 80, 443, 22, 1000-2000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">{ruleDirection === "inbound" ? "Source" : "Destination"}</Label>
              <Input
                id="source"
                value={ruleSource}
                onChange={(e) => setRuleSource(e.target.value)}
                placeholder="e.g., 0.0.0.0/0, 10.0.0.0/8"
              />
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={ruleAction} onValueChange={(v) => setRuleAction(v as "allow" | "deny")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRuleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddRule}
              disabled={!ruleProtocol || !rulePortRange || !ruleSource || isLoading === "add-rule"}
            >
              {isLoading === "add-rule" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Rule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attached Resources Dialog */}
      <Dialog open={!!sgForResources} onOpenChange={() => setSgForResources(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attached Resources</DialogTitle>
            <DialogDescription>
              Resources using {sgForResources?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">web-server-1</p>
                    <p className="text-sm text-muted-foreground">Virtual Machine</p>
                  </div>
                </div>
                <Badge>Running</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">api-server-1</p>
                    <p className="text-sm text-muted-foreground">Virtual Machine</p>
                  </div>
                </div>
                <Badge>Running</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">db-primary</p>
                    <p className="text-sm text-muted-foreground">Database Instance</p>
                  </div>
                </div>
                <Badge>Running</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSgForResources(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Security Group Confirmation */}
      <AlertDialog open={!!sgToDelete} onOpenChange={() => setSgToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Security Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{sgToDelete?.name}</strong>?
              You must first remove this security group from all attached resources.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading === "delete"}
            >
              {isLoading === "delete" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Security Group"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
