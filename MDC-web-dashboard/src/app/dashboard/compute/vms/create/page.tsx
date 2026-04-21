"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { vmTemplates } from "@/stores/mock-data";

const machineTypes = [
  { id: "standard-1x2", vcpus: 1, memory: 2, price: 0.012 },
  { id: "standard-2x4", vcpus: 2, memory: 4, price: 0.024 },
  { id: "standard-4x8", vcpus: 4, memory: 8, price: 0.048 },
  { id: "standard-8x16", vcpus: 8, memory: 16, price: 0.096 },
  { id: "standard-16x32", vcpus: 16, memory: 32, price: 0.192 },
  { id: "highmem-4x16", vcpus: 4, memory: 16, price: 0.064 },
  { id: "highmem-8x32", vcpus: 8, memory: 32, price: 0.128 },
  { id: "highcpu-8x8", vcpus: 8, memory: 8, price: 0.080 },
];

const regions = [
  { id: "us-east-1", name: "US East (New York)", zones: ["us-east-1a", "us-east-1b", "us-east-1c"] },
  { id: "us-west-1", name: "US West (Los Angeles)", zones: ["us-west-1a", "us-west-1b"] },
  { id: "eu-west-1", name: "EU West (Amsterdam)", zones: ["eu-west-1a", "eu-west-1b"] },
  { id: "ap-southeast-1", name: "Asia Pacific (Singapore)", zones: ["ap-southeast-1a"] },
];

export default function CreateVMPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedMachineType, setSelectedMachineType] = useState("standard-2x4");
  const [diskSize, setDiskSize] = useState([50]);
  const [region, setRegion] = useState("us-east-1");
  const [zone, setZone] = useState("us-east-1a");
  const [enablePublicIp, setEnablePublicIp] = useState(true);
  const [vpc, setVpc] = useState("");
  const [sshKey, setSshKey] = useState("");
  const [tags, setTags] = useState("");

  const selectedMachine = machineTypes.find((m) => m.id === selectedMachineType);
  const selectedRegion = regions.find((r) => r.id === region);
  const estimatedCost = selectedMachine
    ? (selectedMachine.price + diskSize[0] * 0.0001) * 730
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submit
    router.push("/dashboard/compute/vms");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/compute/vms">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Virtual Machine</h1>
          <p className="text-muted-foreground">
            Deploy a new virtual machine instance
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Configure the basic settings for your VM</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Instance Name</Label>
                  <Input
                    id="name"
                    placeholder="my-vm-instance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use lowercase letters, numbers, and hyphens only
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Operating System</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {vmTemplates.filter((t) => t.category === "linux").map((template) => (
                      <div
                        key={template.id}
                        className={`relative flex cursor-pointer rounded-lg border p-4 hover:border-primary ${
                          selectedTemplate === template.id
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        </div>
                        {selectedTemplate === template.id && (
                          <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Machine Type */}
            <Card>
              <CardHeader>
                <CardTitle>Machine Configuration</CardTitle>
                <CardDescription>Select CPU, memory, and storage resources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Machine Type</Label>
                  <RadioGroup
                    value={selectedMachineType}
                    onValueChange={setSelectedMachineType}
                    className="grid grid-cols-2 gap-3"
                  >
                    {machineTypes.map((machine) => (
                      <div key={machine.id}>
                        <RadioGroupItem
                          value={machine.id}
                          id={machine.id}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={machine.id}
                          className="flex flex-col items-start justify-between rounded-lg border p-4 hover:border-primary peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="text-sm font-medium">{machine.id}</span>
                            <Badge variant="secondary">
                              ${machine.price.toFixed(3)}/hr
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {machine.vcpus} vCPU / {machine.memory} GB RAM
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Boot Disk Size</Label>
                    <span className="text-sm font-medium">{diskSize[0]} GB</span>
                  </div>
                  <Slider
                    value={diskSize}
                    onValueChange={setDiskSize}
                    min={20}
                    max={1000}
                    step={10}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>20 GB</span>
                    <span>1000 GB</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Networking */}
            <Card>
              <CardHeader>
                <CardTitle>Networking</CardTitle>
                <CardDescription>Configure network settings and firewall</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Select value={region} onValueChange={(v) => { setRegion(v); setZone(regions.find(r => r.id === v)?.zones[0] || ""); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Availability Zone</Label>
                    <Select value={zone} onValueChange={setZone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedRegion?.zones.map((z) => (
                          <SelectItem key={z} value={z}>
                            {z}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>VPC Network</Label>
                  <Select value={vpc} onValueChange={setVpc}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select VPC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vpc-001">production-vpc (10.0.0.0/16)</SelectItem>
                      <SelectItem value="vpc-002">staging-vpc (10.1.0.0/16)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Public IP Address</Label>
                    <p className="text-xs text-muted-foreground">
                      Assign a public IP to this instance
                    </p>
                  </div>
                  <Switch
                    checked={enablePublicIp}
                    onCheckedChange={setEnablePublicIp}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle>Security & Access</CardTitle>
                <CardDescription>Configure SSH keys and access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SSH Public Key</Label>
                  <Textarea
                    placeholder="ssh-rsa AAAA..."
                    value={sshKey}
                    onChange={(e) => setSshKey(e.target.value)}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your SSH public key for secure access
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    placeholder="production, web, api"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of tags for organization
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Instance Name</span>
                    <span className="font-medium">{name || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Machine Type</span>
                    <span className="font-medium">{selectedMachineType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">vCPU</span>
                    <span className="font-medium">{selectedMachine?.vcpus}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-medium">{selectedMachine?.memory} GB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Boot Disk</span>
                    <span className="font-medium">{diskSize[0]} GB SSD</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Region</span>
                    <span className="font-medium">{zone}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Estimated Monthly Cost
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Based on 730 hours/month
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-3xl font-bold">
                    ${estimatedCost.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Compute: ${((selectedMachine?.price || 0) * 730).toFixed(2)} +
                    Storage: ${(diskSize[0] * 0.0001 * 730).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Button type="submit" className="w-full">
                    Create Instance
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard/compute/vms">Cancel</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
