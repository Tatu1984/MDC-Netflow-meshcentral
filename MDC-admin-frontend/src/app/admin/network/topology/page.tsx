"use client";

import { useState } from "react";
import {
  Network,
  Server,
  Globe,
  Router,
  ArrowRight,
  RefreshCw,
  Eye,
  Settings,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockDatacenters } from "@/stores/mock-data";
import { useToast } from "@/hooks/use-toast";

interface NetworkDevice {
  id: string;
  name: string;
  type: string;
  model: string;
  datacenter: string;
  status: string;
  ports: number;
  activePorts: number;
  throughput: number;
  uptime: number;
}

interface VLAN {
  id: number;
  name: string;
  cidr: string;
  devices: number;
  status: string;
}

// Mock network topology data
const networkDevices: NetworkDevice[] = [
  {
    id: "sw-core-01",
    name: "Core Switch 01",
    type: "switch",
    model: "Cisco Nexus 9336C-FX2",
    datacenter: "US-East Primary",
    status: "online",
    ports: 36,
    activePorts: 28,
    throughput: 245.8,
    uptime: 892800,
  },
  {
    id: "sw-core-02",
    name: "Core Switch 02",
    type: "switch",
    model: "Cisco Nexus 9336C-FX2",
    datacenter: "US-East Primary",
    status: "online",
    ports: 36,
    activePorts: 32,
    throughput: 312.4,
    uptime: 892800,
  },
  {
    id: "rtr-edge-01",
    name: "Edge Router 01",
    type: "router",
    model: "Juniper MX204",
    datacenter: "US-East Primary",
    status: "online",
    ports: 8,
    activePorts: 6,
    throughput: 89.2,
    uptime: 1728000,
  },
  {
    id: "fw-perimeter-01",
    name: "Perimeter Firewall 01",
    type: "firewall",
    model: "Palo Alto PA-5250",
    datacenter: "US-East Primary",
    status: "online",
    ports: 16,
    activePorts: 12,
    throughput: 156.7,
    uptime: 432000,
  },
  {
    id: "lb-public-01",
    name: "Public Load Balancer 01",
    type: "loadbalancer",
    model: "F5 BIG-IP i5800",
    datacenter: "US-East Primary",
    status: "online",
    ports: 8,
    activePorts: 4,
    throughput: 78.3,
    uptime: 259200,
  },
];

const networkLinks = [
  { source: "rtr-edge-01", target: "fw-perimeter-01", bandwidth: 100, utilization: 45 },
  { source: "fw-perimeter-01", target: "sw-core-01", bandwidth: 100, utilization: 62 },
  { source: "fw-perimeter-01", target: "sw-core-02", bandwidth: 100, utilization: 58 },
  { source: "sw-core-01", target: "sw-core-02", bandwidth: 400, utilization: 34 },
  { source: "sw-core-01", target: "lb-public-01", bandwidth: 100, utilization: 28 },
];

const vlans: VLAN[] = [
  { id: 100, name: "Management", cidr: "10.0.100.0/24", devices: 48, status: "active" },
  { id: 200, name: "Production VMs", cidr: "10.0.200.0/22", devices: 342, status: "active" },
  { id: 300, name: "Storage Network", cidr: "10.0.300.0/24", devices: 24, status: "active" },
  { id: 400, name: "Backup Network", cidr: "10.0.400.0/24", devices: 12, status: "active" },
  { id: 500, name: "DMZ", cidr: "192.168.1.0/24", devices: 8, status: "active" },
  { id: 999, name: "Quarantine", cidr: "10.99.0.0/24", devices: 0, status: "inactive" },
];

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

export default function TopologyPage() {
  const { toast } = useToast();
  const [selectedDatacenter, setSelectedDatacenter] = useState("all");
  const [deviceForDetails, setDeviceForDetails] = useState<NetworkDevice | null>(null);
  const [deviceForConfig, setDeviceForConfig] = useState<NetworkDevice | null>(null);
  const [vlanForConfig, setVlanForConfig] = useState<VLAN | null>(null);
  const [vlanName, setVlanName] = useState("");
  const [vlanCidr, setVlanCidr] = useState("");

  const handleVlanConfig = (vlan: VLAN) => {
    setVlanForConfig(vlan);
    setVlanName(vlan.name);
    setVlanCidr(vlan.cidr);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Network Topology</h1>
          <p className="text-muted-foreground">
            Physical and logical network infrastructure
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast({ title: "Refreshing", description: "Network topology data refreshed" })}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => toast({ title: "Visual Map", description: "Visual map feature coming soon" })}>
            <Eye className="mr-2 h-4 w-4" />
            Visual Map
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Devices</CardTitle>
            <Router className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networkDevices.length}</div>
            <p className="text-xs text-muted-foreground">
              {networkDevices.filter((d) => d.status === "online").length} online
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active VLANs</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vlans.filter((v) => v.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">{vlans.length} total configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Throughput</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {networkDevices.reduce((sum, d) => sum + d.throughput, 0).toFixed(1)} Gbps
            </div>
            <p className="text-xs text-muted-foreground">Current aggregate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Port Utilization</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                (networkDevices.reduce((sum, d) => sum + d.activePorts, 0) /
                  networkDevices.reduce((sum, d) => sum + d.ports, 0)) *
                  100
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {networkDevices.reduce((sum, d) => sum + d.activePorts, 0)}/
              {networkDevices.reduce((sum, d) => sum + d.ports, 0)} ports active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedDatacenter} onValueChange={setSelectedDatacenter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Datacenter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Datacenters</SelectItem>
            {mockDatacenters.map((dc) => (
              <SelectItem key={dc.id} value={dc.id}>
                {dc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">Network Devices</TabsTrigger>
          <TabsTrigger value="vlans">VLANs</TabsTrigger>
          <TabsTrigger value="links">Interconnects</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {networkDevices.map((device) => (
              <Card key={device.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {device.type === "router" && <Globe className="h-5 w-5 text-blue-500" />}
                      {device.type === "switch" && <Network className="h-5 w-5 text-green-500" />}
                      {device.type === "firewall" && <Server className="h-5 w-5 text-red-500" />}
                      {device.type === "loadbalancer" && <Layers className="h-5 w-5 text-purple-500" />}
                      <div>
                        <CardTitle className="text-base">{device.name}</CardTitle>
                        <CardDescription>{device.model}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={device.status === "online" ? "default" : "destructive"}>
                      {device.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Ports</p>
                      <p className="font-medium">{device.activePorts}/{device.ports} active</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Throughput</p>
                      <p className="font-medium">{device.throughput} Gbps</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeviceForDetails(device)}>
                      <Eye className="mr-2 h-3 w-3" />
                      Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeviceForConfig(device)}>
                      <Settings className="mr-2 h-3 w-3" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vlans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>VLAN Configuration</CardTitle>
              <CardDescription>
                Virtual LAN segments across the network fabric
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vlans.map((vlan) => (
                  <div
                    key={vlan.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold">
                        {vlan.id}
                      </div>
                      <div>
                        <p className="font-medium">{vlan.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {vlan.cidr}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-medium">{vlan.devices}</p>
                        <p className="text-xs text-muted-foreground">devices</p>
                      </div>
                      <Badge variant={vlan.status === "active" ? "default" : "secondary"}>
                        {vlan.status}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => handleVlanConfig(vlan)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Interconnects</CardTitle>
              <CardDescription>
                Links between network devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {networkLinks.map((link, i) => {
                  const sourceDevice = networkDevices.find((d) => d.id === link.source);
                  const targetDevice = networkDevices.find((d) => d.id === link.target);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <p className="font-medium">{sourceDevice?.name}</p>
                          <p className="text-xs text-muted-foreground">Source</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <p className="font-medium">{targetDevice?.name}</p>
                          <p className="text-xs text-muted-foreground">Target</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-medium">{link.bandwidth} Gbps</p>
                          <p className="text-xs text-muted-foreground">capacity</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${link.utilization > 70 ? "text-yellow-500" : ""}`}>
                            {link.utilization}%
                          </p>
                          <p className="text-xs text-muted-foreground">utilized</p>
                        </div>
                        <Badge variant={link.utilization > 80 ? "destructive" : "default"}>
                          {link.utilization > 80 ? "High" : "Normal"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Device Details Dialog */}
      <Dialog open={!!deviceForDetails} onOpenChange={() => setDeviceForDetails(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deviceForDetails?.name}</DialogTitle>
            <DialogDescription>{deviceForDetails?.model}</DialogDescription>
          </DialogHeader>
          {deviceForDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium capitalize">{deviceForDetails.type}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={deviceForDetails.status === "online" ? "default" : "destructive"}>
                    {deviceForDetails.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Datacenter</Label>
                  <p className="font-medium">{deviceForDetails.datacenter}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Uptime</Label>
                  <p className="font-medium">{formatUptime(deviceForDetails.uptime)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Ports</Label>
                  <p className="font-medium">{deviceForDetails.activePorts}/{deviceForDetails.ports} active</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Throughput</Label>
                  <p className="font-medium">{deviceForDetails.throughput} Gbps</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceForDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Device Config Dialog */}
      <Dialog open={!!deviceForConfig} onOpenChange={() => setDeviceForConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {deviceForConfig?.name}</DialogTitle>
            <DialogDescription>
              Device configuration options
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Configuration for {deviceForConfig?.model} would typically be done through the device&apos;s native management interface.
                This panel can be extended to support common configuration options.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Device IP/Hostname</Label>
              <Input value={deviceForConfig?.id || ""} readOnly />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceForConfig(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Configuration Saved", description: `${deviceForConfig?.name} configuration updated` });
              setDeviceForConfig(null);
            }}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VLAN Config Dialog */}
      <Dialog open={!!vlanForConfig} onOpenChange={() => setVlanForConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure VLAN {vlanForConfig?.id}</DialogTitle>
            <DialogDescription>
              Edit VLAN settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vlan-name">VLAN Name</Label>
              <Input
                id="vlan-name"
                value={vlanName}
                onChange={(e) => setVlanName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vlan-cidr">CIDR</Label>
              <Input
                id="vlan-cidr"
                value={vlanCidr}
                onChange={(e) => setVlanCidr(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Connected Devices</Label>
              <p className="font-medium">{vlanForConfig?.devices}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVlanForConfig(null)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "VLAN Updated", description: `VLAN ${vlanForConfig?.id} configuration saved` });
              setVlanForConfig(null);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
