"use client";

import { useState } from "react";
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  Server,
  Layers,
} from "lucide-react";
import { ApiRequiredBanner } from "@/components/api-required-banner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

// Mock data for metrics
const cpuData = [
  { time: "00:00", vm1: 45, vm2: 62, vm3: 38, cluster1: 55 },
  { time: "01:00", vm1: 52, vm2: 58, vm3: 42, cluster1: 51 },
  { time: "02:00", vm1: 48, vm2: 65, vm3: 35, cluster1: 53 },
  { time: "03:00", vm1: 70, vm2: 72, vm3: 55, cluster1: 68 },
  { time: "04:00", vm1: 65, vm2: 68, vm3: 48, cluster1: 62 },
  { time: "05:00", vm1: 58, vm2: 55, vm3: 40, cluster1: 52 },
  { time: "06:00", vm1: 72, vm2: 78, vm3: 60, cluster1: 70 },
  { time: "07:00", vm1: 85, vm2: 82, vm3: 72, cluster1: 80 },
  { time: "08:00", vm1: 78, vm2: 75, vm3: 65, cluster1: 73 },
  { time: "09:00", vm1: 82, vm2: 80, vm3: 70, cluster1: 78 },
  { time: "10:00", vm1: 75, vm2: 72, vm3: 62, cluster1: 70 },
  { time: "11:00", vm1: 68, vm2: 65, vm3: 55, cluster1: 63 },
];

const memoryData = [
  { time: "00:00", used: 12.5, cached: 4.2, total: 32 },
  { time: "01:00", used: 13.1, cached: 4.5, total: 32 },
  { time: "02:00", used: 12.8, cached: 4.3, total: 32 },
  { time: "03:00", used: 15.2, cached: 5.1, total: 32 },
  { time: "04:00", used: 14.8, cached: 4.9, total: 32 },
  { time: "05:00", used: 14.2, cached: 4.6, total: 32 },
  { time: "06:00", used: 16.5, cached: 5.5, total: 32 },
  { time: "07:00", used: 18.2, cached: 6.1, total: 32 },
  { time: "08:00", used: 17.5, cached: 5.8, total: 32 },
  { time: "09:00", used: 19.1, cached: 6.4, total: 32 },
  { time: "10:00", used: 18.0, cached: 6.0, total: 32 },
  { time: "11:00", used: 16.8, cached: 5.6, total: 32 },
];

const networkData = [
  { time: "00:00", inbound: 125, outbound: 85 },
  { time: "01:00", inbound: 142, outbound: 92 },
  { time: "02:00", inbound: 118, outbound: 78 },
  { time: "03:00", inbound: 185, outbound: 125 },
  { time: "04:00", inbound: 165, outbound: 112 },
  { time: "05:00", inbound: 148, outbound: 98 },
  { time: "06:00", inbound: 210, outbound: 145 },
  { time: "07:00", inbound: 285, outbound: 192 },
  { time: "08:00", inbound: 252, outbound: 175 },
  { time: "09:00", inbound: 298, outbound: 205 },
  { time: "10:00", inbound: 275, outbound: 188 },
  { time: "11:00", inbound: 232, outbound: 158 },
];

const diskData = [
  { time: "00:00", read: 45, write: 32 },
  { time: "01:00", read: 52, write: 38 },
  { time: "02:00", read: 48, write: 35 },
  { time: "03:00", read: 68, write: 52 },
  { time: "04:00", read: 62, write: 48 },
  { time: "05:00", read: 55, write: 42 },
  { time: "06:00", read: 78, write: 62 },
  { time: "07:00", read: 92, write: 75 },
  { time: "08:00", read: 85, write: 68 },
  { time: "09:00", read: 98, write: 82 },
  { time: "10:00", read: 88, write: 72 },
  { time: "11:00", read: 75, write: 58 },
];

const resources = [
  { id: "all", name: "All Resources", type: "all" },
  { id: "vm-web-prod-01", name: "web-prod-01", type: "vm" },
  { id: "vm-web-prod-02", name: "web-prod-02", type: "vm" },
  { id: "vm-api-server", name: "api-server", type: "vm" },
  { id: "vm-db-primary", name: "db-primary", type: "vm" },
  { id: "cluster-k8s-prod", name: "k8s-production", type: "cluster" },
  { id: "cluster-k8s-staging", name: "k8s-staging", type: "cluster" },
];

const chartConfig = {
  vm1: {
    label: "web-prod-01",
    color: "hsl(var(--chart-1))",
  },
  vm2: {
    label: "web-prod-02",
    color: "hsl(var(--chart-2))",
  },
  vm3: {
    label: "api-server",
    color: "hsl(var(--chart-3))",
  },
  cluster1: {
    label: "k8s-production",
    color: "hsl(var(--chart-4))",
  },
  used: {
    label: "Used",
    color: "hsl(var(--chart-1))",
  },
  cached: {
    label: "Cached",
    color: "hsl(var(--chart-2))",
  },
  inbound: {
    label: "Inbound",
    color: "hsl(var(--chart-1))",
  },
  outbound: {
    label: "Outbound",
    color: "hsl(var(--chart-2))",
  },
  read: {
    label: "Read",
    color: "hsl(var(--chart-1))",
  },
  write: {
    label: "Write",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const summaryMetrics = [
  {
    title: "Avg CPU Usage",
    value: "68.5%",
    change: "+5.2%",
    trend: "up",
    icon: Cpu,
    description: "Across all resources",
  },
  {
    title: "Memory Utilization",
    value: "16.2 GB",
    change: "-2.1%",
    trend: "down",
    icon: MemoryStick,
    description: "50.6% of 32 GB",
  },
  {
    title: "Network Traffic",
    value: "1.2 TB",
    change: "+12.3%",
    trend: "up",
    icon: Network,
    description: "Last 24 hours",
  },
  {
    title: "Disk I/O",
    value: "458 MB/s",
    change: "+8.7%",
    trend: "up",
    icon: HardDrive,
    description: "Peak throughput",
  },
];

export default function MetricsPage() {
  const [timeRange, setTimeRange] = useState("24h");
  const [selectedResource, setSelectedResource] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Metrics"
        apis={[
          "GET /api/metrics",
          "GET /api/metrics/{resourceId}",
          "GET /api/metrics/aggregated",
          "POST /api/metrics/query"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>
          <p className="text-muted-foreground">
            Monitor resource performance and usage across your infrastructure
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedResource} onValueChange={setSelectedResource}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select resource" />
            </SelectTrigger>
            <SelectContent>
              {resources.map((resource) => (
                <SelectItem key={resource.id} value={resource.id}>
                  <div className="flex items-center gap-2">
                    {resource.type === "vm" ? (
                      <Server className="h-3 w-3" />
                    ) : resource.type === "cluster" ? (
                      <Layers className="h-3 w-3" />
                    ) : (
                      <Activity className="h-3 w-3" />
                    )}
                    {resource.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1 hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metric.trend === "up" ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                )}
                <span className={metric.trend === "up" ? "text-green-600" : "text-red-600"}>
                  {metric.change}
                </span>
                <span className="ml-1">{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="cpu" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cpu" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            CPU
          </TabsTrigger>
          <TabsTrigger value="memory" className="flex items-center gap-2">
            <MemoryStick className="h-4 w-4" />
            Memory
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Network
          </TabsTrigger>
          <TabsTrigger value="disk" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Disk I/O
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cpu" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CPU Utilization</CardTitle>
              <CardDescription>CPU usage percentage over time by resource</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <LineChart data={cpuData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="vm1"
                    name="web-prod-01"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="vm2"
                    name="web-prod-02"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="vm3"
                    name="api-server"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cluster1"
                    name="k8s-production"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CPU by Resource Type</CardTitle>
                <CardDescription>Average CPU usage by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <BarChart
                    data={[
                      { name: "VMs", avg: 72, max: 92 },
                      { name: "Kubernetes", avg: 65, max: 85 },
                      { name: "Databases", avg: 45, max: 68 },
                      { name: "Load Balancers", avg: 28, max: 42 },
                    ]}
                    layout="vertical"
                  >
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avg" name="Average" fill="hsl(var(--chart-1))" radius={4} />
                    <Bar dataKey="max" name="Peak" fill="hsl(var(--chart-2))" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">High CPU Resources</CardTitle>
                <CardDescription>Resources with highest CPU usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "web-prod-01", cpu: 85, status: "warning" },
                    { name: "web-prod-02", cpu: 82, status: "warning" },
                    { name: "k8s-production", cpu: 78, status: "normal" },
                    { name: "api-server", cpu: 72, status: "normal" },
                    { name: "db-primary", cpu: 68, status: "normal" },
                  ].map((resource) => (
                    <div key={resource.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{resource.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              resource.status === "warning" ? "bg-yellow-500" : "bg-green-500"
                            }`}
                            style={{ width: `${resource.cpu}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {resource.cpu}%
                        </span>
                        {resource.status === "warning" && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            High
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Memory Usage</CardTitle>
              <CardDescription>Memory utilization and cache usage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <AreaChart data={memoryData}>
                  <defs>
                    <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCached" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value} GB`}
                    domain={[0, 32]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="used"
                    name="Used Memory"
                    stroke="hsl(var(--chart-1))"
                    fillOpacity={1}
                    fill="url(#colorUsed)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="cached"
                    name="Cached"
                    stroke="hsl(var(--chart-2))"
                    fillOpacity={1}
                    fill="url(#colorCached)"
                    stackId="1"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Traffic</CardTitle>
              <CardDescription>Inbound and outbound network throughput (MB/s)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <AreaChart data={networkData}>
                  <defs>
                    <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value} MB/s`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="inbound"
                    name="Inbound"
                    stroke="hsl(var(--chart-1))"
                    fillOpacity={1}
                    fill="url(#colorInbound)"
                  />
                  <Area
                    type="monotone"
                    dataKey="outbound"
                    name="Outbound"
                    stroke="hsl(var(--chart-2))"
                    fillOpacity={1}
                    fill="url(#colorOutbound)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disk I/O</CardTitle>
              <CardDescription>Read and write throughput (MB/s)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <BarChart data={diskData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value} MB/s`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="read" name="Read" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="write" name="Write" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
