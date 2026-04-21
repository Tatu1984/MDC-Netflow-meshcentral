"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Server,
  Network,
  Globe,
  RefreshCw,
  Loader2,
  Building2,
  Boxes,
} from "lucide-react";
import Link from "next/link";
import { cpuMetrics } from "@/stores/mock-data";
import { useAuthStore } from "@/stores/auth-store";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useMDCDashboard, useWorkspaces, useSites, useRemoteNetworks } from "@/lib/mdc/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const chartConfig = {
  value: {
    label: "Usage",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { organization, currentProject } = useAuthStore();

  // MicroDataCluster data
  const { data: mdcData, isLoading: mdcLoading, isError: mdcError, refetchAll } = useMDCDashboard();

  const chartData = cpuMetrics.slice(-12).map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString("en-US", { hour: "2-digit" }),
    value: Math.round(m.value),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your {currentProject?.name} project.
          </p>
        </div>
        {/* Create VM button removed — not in use */}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/infrastructure/workspaces">
                <Boxes className="mr-2 h-4 w-4" />
                Manage Workspaces
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/settings/organization">
                <Building2 className="mr-2 h-4 w-4" />
                Organizations
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/settings/users">
                <Server className="mr-2 h-4 w-4" />
                Users &amp; Teams
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/infrastructure/remote-networks">
                <Network className="mr-2 h-4 w-4" />
                Remote Networks
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MicroDataCluster Infrastructure */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">MicroDataCluster Infrastructure</h2>
            <p className="text-sm text-muted-foreground">Real-time data from MicroDataCluster API</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchAll()} disabled={mdcLoading}>
            {mdcLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* MDC Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{mdcData?.workspaces.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {mdcData?.totalVMs || 0} total VMs
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sites</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{mdcData?.sites.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">{mdcData?.onlineNodes || 0}</span>
                    <span className="text-muted-foreground"> / {mdcData?.totalNodes || 0} nodes online</span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remote Networks</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{mdcData?.remoteNetworks.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">{mdcData?.onlineMembers || 0}</span>
                    <span className="text-muted-foreground"> / {mdcData?.totalMembers || 0} members online</span>
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{mdcData?.organizations.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {mdcData?.organizations.filter(o => o.active).length || 0} active
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MDC Workspaces List */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Workspaces</CardTitle>
              <CardDescription>MicroDataCluster workspaces</CardDescription>
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : mdcError ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Unable to load workspaces</p>
                  <p className="text-xs">Check your authentication</p>
                </div>
              ) : mdcData?.workspaces.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No workspaces found
                </div>
              ) : (
                <div className="space-y-4">
                  {mdcData?.workspaces.slice(0, 5).map((workspace) => (
                    <div key={workspace.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div>
                          <p className="text-sm font-medium leading-none">{workspace.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {workspace.virtualMachines?.length || 0} VMs / {workspace.virtualNetworks?.length || 0} Networks
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {workspace.virtualMachines?.length || 0} VMs
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Site Nodes</CardTitle>
              <CardDescription>Infrastructure node status</CardDescription>
            </CardHeader>
            <CardContent>
              {mdcLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : mdcError ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Unable to load sites</p>
                  <p className="text-xs">Check your authentication</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mdcData?.sites.flatMap((site) =>
                    (site.nodes || []).slice(0, 5).map((node) => (
                      <div key={`${site.id}-${node.name}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              node.online ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium leading-none">{node.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {node.cpuInfo?.cores || 0} cores @ {node.cpuInfo?.mhz || 0} MHz
                            </p>
                          </div>
                        </div>
                        <Badge variant={node.online ? "default" : "destructive"}>
                          {node.online ? "Online" : "Offline"}
                        </Badge>
                      </div>
                    ))
                  )}
                  {mdcData?.sites.every((s) => !s.nodes?.length) && (
                    <div className="text-center py-4 text-muted-foreground">
                      No nodes found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
