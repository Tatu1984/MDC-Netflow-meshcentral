"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Users,
  UserCog,
  Building2,
  Globe,
  Activity,
  Boxes,
  Wallet,
  LayoutDashboard,
  ChevronDown,
  Network,
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

const adminNavItems = [
  {
    title: "Overview",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Organization",
    icon: Network,
    items: [
      { title: "Organizations", url: "/admin/organization/organizations" },
      { title: "Sites", url: "/admin/organization/sites" },
    ],
  },
  {
    title: "Tenants",
    icon: Users,
    items: [
      { title: "All Tenants", url: "/admin/tenants" },
      { title: "Onboarding", url: "/admin/tenants/onboarding" },
      { title: "Plans & Quotas", url: "/admin/tenants/plans" },
    ],
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: UserCog,
  },
  {
    title: "Infrastructure",
    icon: Building2,
    items: [
      { title: "Datacenters", url: "/admin/infrastructure/datacenters" },
      { title: "Proxmox Clusters", url: "/admin/infrastructure/clusters" },
      { title: "Nodes", url: "/admin/infrastructure/nodes" },
    ],
  },
  {
    title: "Network Fabric",
    icon: Globe,
    items: [
      { title: "Topology", url: "/admin/network/topology" },
      { title: "ZeroTier Networks", url: "/admin/network/zerotier" },
      { title: "Traffic Control", url: "/admin/network/traffic" },
    ],
  },
  {
    title: "Storage",
    icon: Boxes,
    items: [
      { title: "Ceph Clusters", url: "/admin/storage/ceph" },
      { title: "Storage Pools", url: "/admin/storage/pools" },
      { title: "Replication", url: "/admin/storage/replication" },
    ],
  },
  {
    title: "Security",
    icon: Shield,
    items: [
      { title: "IAM Policies", url: "/admin/security/iam" },
      { title: "Certificates", url: "/admin/security/certificates" },
      { title: "Audit Logs", url: "/admin/security/audit" },
    ],
  },
  {
    title: "Operations",
    icon: Activity,
    items: [
      { title: "Control Plane", url: "/admin/operations/control-plane" },
      { title: "Service Health", url: "/admin/operations/health" },
      { title: "Maintenance", url: "/admin/operations/maintenance" },
    ],
  },
  {
    title: "Financials",
    icon: Wallet,
    items: [
      { title: "Revenue", url: "/admin/financials/revenue" },
      { title: "Usage Analytics", url: "/admin/financials/usage" },
      { title: "Pricing", url: "/admin/financials/pricing" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">TS Edge Nest Admin</span>
            {/* <span className="text-xs text-muted-foreground">Cloud Operator</span> */}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
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
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-destructive text-destructive-foreground">
                      {user?.name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-xs">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-muted-foreground">Super Admin</span>
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
