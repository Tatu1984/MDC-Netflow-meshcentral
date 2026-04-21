"use client";

import { ApiRequiredBanner } from "@/components/api-required-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { Download, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { billingData } from "@/stores/mock-data";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Line, LineChart, Area, AreaChart } from "recharts";

const chartConfig = {
  cost: {
    label: "Cost",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const dailyCostData = [
  { day: "Jan 1", cost: 85 },
  { day: "Jan 2", cost: 92 },
  { day: "Jan 3", cost: 88 },
  { day: "Jan 4", cost: 95 },
  { day: "Jan 5", cost: 91 },
  { day: "Jan 6", cost: 87 },
  { day: "Jan 7", cost: 94 },
  { day: "Jan 8", cost: 98 },
  { day: "Jan 9", cost: 96 },
  { day: "Jan 10", cost: 102 },
  { day: "Jan 11", cost: 95 },
];

const serviceBreakdown = [
  { name: "Compute", cost: 1842.60, percentage: 64.7 },
  { name: "Storage", cost: 349.50, percentage: 12.3 },
  { name: "Kubernetes", cost: 300.00, percentage: 10.5 },
  { name: "Database", cost: 166.12, percentage: 5.8 },
  { name: "Load Balancers", cost: 148.80, percentage: 5.2 },
  { name: "Network", cost: 40.50, percentage: 1.4 },
];

export default function BillingUsagePage() {
  return (
    <div className="space-y-6">
      <ApiRequiredBanner
        featureName="Usage & Billing"
        apis={[
          "GET /api/billing/usage",
          "GET /api/billing/usage/breakdown",
          "GET /api/billing/costs",
          "POST /api/billing/usage/export"
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage & Billing</h1>
          <p className="text-muted-foreground">
            Monitor your resource usage and costs
          </p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="current">
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">January 2026</SelectItem>
              <SelectItem value="previous">December 2025</SelectItem>
              <SelectItem value="nov">November 2025</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Cost Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${billingData.currentMonthTotal.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
              <span className="text-green-600">+7.2%</span>
              <span className="ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${billingData.forecast.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated month-end total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${billingData.lastMonthTotal.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              December 2025
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$5,000</div>
            <Progress value={(billingData.currentMonthTotal / 5000) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {((billingData.currentMonthTotal / 5000) * 100).toFixed(0)}% used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Costs</CardTitle>
          <CardDescription>Cost breakdown over the current billing period</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={dailyCostData}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
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
                tickFormatter={(value) => `$${value}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="hsl(var(--chart-1))"
                fillOpacity={1}
                fill="url(#colorCost)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Service Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Service</CardTitle>
            <CardDescription>Breakdown of costs by resource type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceBreakdown.map((service) => (
                <div key={service.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{service.name}</span>
                    <span className="font-medium">${service.cost.toFixed(2)}</span>
                  </div>
                  <Progress value={service.percentage} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Usage</CardTitle>
            <CardDescription>Detailed usage metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingData.breakdown.map((item) => (
                  <TableRow key={item.resource}>
                    <TableCell className="font-medium">{item.resource}</TableCell>
                    <TableCell>
                      {item.usage.toLocaleString()} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      ${item.cost.toFixed(2)}
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
