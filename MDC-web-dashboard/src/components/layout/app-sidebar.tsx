"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getEnv } from "@/lib/env";
import {
  Server,
  Settings,
  LayoutDashboard,
  Network,
  HardDrive,
  Database,
  BarChart3,
  CreditCard,
  Cloud,
  ChevronDown,
  Boxes,
  Shield,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";

const tenantNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Infrastructure",
    icon: Boxes,
    items: [
      { title: "Workspaces", url: "/dashboard/infrastructure/workspaces" },
      { title: "Sites", url: "/dashboard/infrastructure/sites" },
      { title: "Remote Networks", url: "/dashboard/infrastructure/remote-networks" },
    ],
  },
  // {
  //   title: "Compute",
  //   icon: Server,
  //   items: [
  //     { title: "Virtual Machines", url: "/dashboard/compute/vms" },
  //     { title: "Templates", url: "/dashboard/compute/templates" },
  //     { title: "Snapshots", url: "/dashboard/compute/snapshots" },
  //   ],
  // },
  // {
  //   title: "Networking",
  //   icon: Network,
  //   items: [
  //     { title: "VPCs", url: "/dashboard/networking/vpcs" },
  //     { title: "Subnets", url: "/dashboard/networking/subnets" },
  //     { title: "Security Groups", url: "/dashboard/networking/security-groups" },
  //     { title: "Public IPs", url: "/dashboard/networking/public-ips" },
  //     { title: "Load Balancers", url: "/dashboard/networking/load-balancers" },
  //     { title: "DNS", url: "/dashboard/networking/dns" },
  //   ],
  // },
  // {
  //   title: "Storage",
  //   icon: HardDrive,
  //   items: [
  //     { title: "Volumes", url: "/dashboard/storage/volumes" },
  //     { title: "Buckets", url: "/dashboard/storage/buckets" },
  //     { title: "File Shares", url: "/dashboard/storage/file-shares" },
  //     { title: "Backups", url: "/dashboard/storage/backups" },
  //   ],
  // },
  // {
  //   title: "Databases",
  //   icon: Database,
  //   items: [
  //     { title: "PostgreSQL", url: "/dashboard/databases/postgresql" },
  //     { title: "MySQL", url: "/dashboard/databases/mysql" },
  //     { title: "Backups", url: "/dashboard/databases/backups" },
  //   ],
  // },
  // {
  //   title: "Observability",
  //   icon: BarChart3,
  //   items: [
  //     { title: "Metrics", url: "/dashboard/observability/metrics" },
  //     { title: "Logs", url: "/dashboard/observability/logs" },
  //     { title: "Alerts", url: "/dashboard/observability/alerts" },
  //   ],
  // },
  // {
  //   title: "Billing",
  //   icon: CreditCard,
  //   items: [
  //     { title: "Usage", url: "/dashboard/billing/usage" },
  //     { title: "Invoices", url: "/dashboard/billing/invoices" },
  //     { title: "Payment", url: "/dashboard/billing/payment" },
  //   ],
  // },
  {
    title: "Settings",
    icon: Settings,
    items: [
      { title: "Organization", url: "/dashboard/settings/organization" },
      { title: "Users & Teams", url: "/dashboard/settings/users" },
      { title: "Activity Logs", url: "/dashboard/settings/activity-logs" },
      // { title: "API Keys", url: "/dashboard/settings/api-keys" },
      // { title: "Audit Log", url: "/dashboard/settings/audit-log" },
      {title: "Auth Test", url: "/dashboard/auth-test"}
    ],
  },
  // {
  //   title: "Auth Test",
  //   url: "/dashboard/auth-test",
  //   icon: Shield,
  // },
];

export function TenantSidebar() {
  const pathname = usePathname();
  const { user, organization, logout } = useAuthStore();
  const [buildInfo, setBuildInfo] = useState<{ tag: string } | null>(null);

  useEffect(() => {
    getEnv().then((env) => {
      if (env.environment === "development" && env.buildTag) {
        setBuildInfo({ tag: env.buildTag });
      }
    });
  }, []);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cloud className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">TS Edge Nest</span>
            <span className="text-xs text-muted-foreground">{organization?.name}</span>
          </div>
        </div>
        {/* Environment dropdown removed — not in use */}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {tenantNavItems.map((item) => {
                if (!item.items) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link href={item.url!}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const isActive = item.items.some((sub) => pathname.startsWith(sub.url));

                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.url}
                              >
                                <Link href={subItem.url}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {buildInfo && (
          <div className="px-3 py-2">
            <span className="text-xs text-muted-foreground font-mono">
              tag: 1.0.{buildInfo.tag}
            </span>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-muted-foreground">{user?.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuItem onSelect={() => logout()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
