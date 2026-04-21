"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Server,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { mockDatacenters, mockTenants } from "@/stores/mock-data";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { XAxis, YAxis, Bar, BarChart } from "recharts";

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const revenueData = [
  { month: "Aug", revenue: 42500 },
  { month: "Sep", revenue: 48200 },
  { month: "Oct", revenue: 52100 },
  { month: "Nov", revenue: 58400 },
  { month: "Dec", revenue: 62800 },
  { month: "Jan", revenue: 68500 },
];

const platformHealth = {
  apiGateway: "healthy",
  controlPlane: "healthy",
  scheduler: "healthy",
  networkController: "healthy",
  storageController: "warning",
  billingEngine: "healthy",
};

export default function AdminDashboardPage() {
  const totalVMs = mockDatacenters.reduce((sum, dc) => sum + dc.totalVMs, 0);
  const totalNodes = mockDatacenters.reduce((sum, dc) => sum + dc.totalNodes, 0);
  const totalRevenue = mockTenants.reduce((sum, t) => sum + t.monthlySpend, 0);
  const activeTenants = mockTenants.filter((t) => t.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cloud Operator Console</h1>
          <p className="text-muted-foreground">
            Global platform overview and management
          </p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          All Systems Operational
        </Badge>
      </div>

      {/* Global Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Datacenters</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDatacenters.length}</div>
            <p className="text-xs text-muted-foreground">
              {mockDatacenters.filter((dc) => dc.status === "online").length} online,{" "}
              {mockDatacenters.filter((dc) => dc.status === "maintenance").length} maintenance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTenants}</div>
            <p className="text-xs text-muted-foreground">
              {mockTenants.length} total accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total VMs</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVMs}</div>
            <p className="text-xs text-muted-foreground">
              Across {totalNodes} physical nodes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              +9.2% from last month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Infrastructure & Revenue */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Platform revenue trend over 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={revenueData}>
                <XAxis
                  dataKey="month"
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
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>Control plane service status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(platformHealth).map(([service, status]) => (
                <div key={service} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {status === "healthy" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : status === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm capitalize">
                      {service.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                  </div>
                  <Badge
                    variant={
                      status === "healthy"
                        ? "default"
                        : status === "warning"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Datacenter Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Datacenter Overview</CardTitle>
            <CardDescription>Resource utilization across all regions</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/infrastructure/datacenters">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {mockDatacenters.map((dc) => (
              <div key={dc.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{dc.name}</span>
                  </div>
                  <Badge
                    variant={
                      dc.status === "online"
                        ? "default"
                        : dc.status === "maintenance"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {dc.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{dc.location}</p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>CPU</span>
                      <span>{dc.cpuUsage}%</span>
                    </div>
                    <Progress value={dc.cpuUsage} className="h-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Memory</span>
                      <span>{dc.memoryUsage}%</span>
                    </div>
                    <Progress value={dc.memoryUsage} className="h-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Storage</span>
                      <span>{dc.storageUsage}%</span>
                    </div>
                    <Progress value={dc.storageUsage} className="h-1" />
                  </div>
                </div>
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {dc.totalNodes} nodes / {dc.totalVMs} VMs
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Tenants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Tenants by Revenue</CardTitle>
            <CardDescription>Highest spending customers this month</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/tenants">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTenants
              .filter((t) => t.status === "active")
              .sort((a, b) => b.monthlySpend - a.monthlySpend)
              .slice(0, 5)
              .map((tenant, index) => (
                <div key={tenant.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-muted-foreground w-8">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tenant.resourceUsage.vms} VMs / {tenant.resourceUsage.vcpus} vCPUs
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${tenant.monthlySpend.toLocaleString()}</p>
                    <Badge variant="outline">{tenant.organization.plan}</Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
