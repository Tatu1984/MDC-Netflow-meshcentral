"use client";

import { useState } from "react";
import {
  HardDrive,
  Network,
  Cpu,
  Download,
  TrendingUp,
  Calendar,
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
import { Progress } from "@/components/ui/progress";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

// Mock usage data
const resourceUsage = [
  {
    resource: "Compute (vCPUs)",
    unit: "vCPU-hours",
    current: 245800,
    previous: 228500,
    quota: 500000,
    cost: 0.04,
  },
  {
    resource: "Memory",
    unit: "GB-hours",
    current: 892400,
    previous: 845200,
    quota: 2000000,
    cost: 0.006,
  },
  {
    resource: "Block Storage",
    unit: "GB-months",
    current: 125000,
    previous: 118000,
    quota: 500000,
    cost: 0.10,
  },
  {
    resource: "Object Storage",
    unit: "GB",
    current: 48500,
    previous: 42800,
    quota: 200000,
    cost: 0.023,
  },
  {
    resource: "Network Egress",
    unit: "GB",
    current: 12400,
    previous: 11200,
    quota: 100000,
    cost: 0.09,
  },
  {
    resource: "Load Balancers",
    unit: "LB-hours",
    current: 5580,
    previous: 5400,
    quota: 20000,
    cost: 0.025,
  },
];

const usageByTenant = [
  {
    tenant: "Global Media Co",
    compute: 89200,
    storage: 45000,
    network: 5200,
    database: 8500,
    total: 11420,
  },
  {
    tenant: "Acme Corporation",
    compute: 52400,
    storage: 28000,
    network: 2800,
    database: 4200,
    total: 5840,
  },
  {
    tenant: "TechStartup Inc",
    compute: 28500,
    storage: 12000,
    network: 1500,
    database: 2100,
    total: 2450,
  },
  {
    tenant: "DataFlow Analytics",
    compute: 35200,
    storage: 18500,
    network: 980,
    database: 3200,
    total: 3120,
  },
  {
    tenant: "DevShop Agency",
    compute: 8900,
    storage: 4200,
    network: 320,
    database: 850,
    total: 680,
  },
];

const dailyUsage = [
  { day: "Mon", compute: 8200, storage: 4100, network: 520 },
  { day: "Tue", compute: 9100, storage: 4250, network: 580 },
  { day: "Wed", compute: 8800, storage: 4180, network: 540 },
  { day: "Thu", compute: 9500, storage: 4320, network: 620 },
  { day: "Fri", compute: 8900, storage: 4200, network: 560 },
  { day: "Sat", compute: 6200, storage: 3800, network: 380 },
  { day: "Sun", compute: 5800, storage: 3650, network: 340 },
];

const chartConfig = {
  compute: { label: "Compute", color: "hsl(var(--chart-1))" },
  storage: { label: "Storage", color: "hsl(var(--chart-2))" },
  network: { label: "Network", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

export default function UsagePage() {
  const [timeRange, setTimeRange] = useState("30d");

  const totalUsageCost = resourceUsage.reduce((sum, r) => sum + r.current * r.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage Analytics</h1>
          <p className="text-muted-foreground">
            Platform resource consumption and trends
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compute</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(resourceUsage[0].current / 1000).toFixed(0)}K vCPU-h
            </div>
            <div className="flex items-center text-xs text-green-500">
              <TrendingUp className="h-3 w-3 mr-1" />
              {(((resourceUsage[0].current - resourceUsage[0].previous) / resourceUsage[0].previous) * 100).toFixed(1)}% from last period
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((resourceUsage[2].current + resourceUsage[3].current) / 1000).toFixed(0)} TB
            </div>
            <p className="text-xs text-muted-foreground">Block + Object storage</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Traffic</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(resourceUsage[4].current / 1000).toFixed(1)} TB
            </div>
            <p className="text-xs text-muted-foreground">Egress this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Cost</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalUsageCost / 1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground">This billing period</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage</CardTitle>
          <CardDescription>Resource consumption over the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={dailyUsage}>
              <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="compute" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="storage" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="network" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Resource Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Breakdown</CardTitle>
            <CardDescription>Usage against allocated quotas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resourceUsage.map((resource) => {
                const usagePercent = Math.round((resource.current / resource.quota) * 100);
                const growthPercent = ((resource.current - resource.previous) / resource.previous) * 100;

                return (
                  <div key={resource.resource} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{resource.resource}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {resource.current.toLocaleString()} / {resource.quota.toLocaleString()} {resource.unit}
                        </span>
                        <Badge variant={growthPercent > 10 ? "secondary" : "outline"}>
                          {growthPercent > 0 ? "+" : ""}{growthPercent.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress
                      value={usagePercent}
                      className={usagePercent > 80 ? "[&>div]:bg-yellow-500" : ""}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Usage by Tenant */}
        <Card>
          <CardHeader>
            <CardTitle>Top Consumers</CardTitle>
            <CardDescription>Resource usage by tenant</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Compute</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Est. Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageByTenant.map((tenant) => (
                  <TableRow key={tenant.tenant}>
                    <TableCell className="font-medium">{tenant.tenant}</TableCell>
                    <TableCell>
                      {(tenant.compute / 1000).toFixed(0)}K vCPU-h
                    </TableCell>
                    <TableCell>{(tenant.storage / 1000).toFixed(0)} TB</TableCell>
                    <TableCell className="font-medium">
                      ${tenant.total.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
