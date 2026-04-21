"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw, Server, HardDrive, Cpu, MemoryStick, FileBox, Building2 } from "lucide-react";
import { useSites } from "@/lib/mdc/hooks";
import { VirtualMachineTemplate, Site } from "@/lib/mdc/types";

interface DisplayTemplate extends VirtualMachineTemplate {
  type: 'gateway' | 'bastion' | 'virtualMachine';
  siteName: string;
  siteId: string;
}

// Get type badge color
function getTypeBadgeVariant(type: DisplayTemplate['type']): "default" | "secondary" | "outline" {
  switch (type) {
    case 'gateway': return 'default';
    case 'bastion': return 'secondary';
    case 'virtualMachine': return 'outline';
  }
}

// Format memory string (e.g., "4096" -> "4 GB")
function formatMemory(memory?: string): string {
  if (!memory) return 'N/A';
  const mb = parseInt(memory, 10);
  if (isNaN(mb)) return memory;
  if (mb >= 1024) {
    return `${Math.round(mb / 1024)} GB`;
  }
  return `${mb} MB`;
}

// Calculate total storage from storage array
function getTotalStorage(storage?: { size?: number }[]): string {
  if (!storage || storage.length === 0) return 'N/A';
  const total = storage.reduce((sum, s) => sum + (s.size || 0), 0);
  if (total === 0) return 'N/A';
  return `${total} GB`;
}

export default function TemplatesPage() {
  const { data: sites, isLoading, isError, error, refetch } = useSites();

  // Extract all templates from all sites
  const templates = useMemo<DisplayTemplate[]>(() => {
    if (!sites) return [];

    const allTemplates: DisplayTemplate[] = [];

    sites.forEach((site: Site) => {
      // Gateway templates
      (site.gatewayTemplates || []).forEach((t) => {
        allTemplates.push({
          ...t,
          type: 'gateway',
          siteName: site.name,
          siteId: site.id,
        });
      });

      // Bastion templates
      (site.bastionTemplates || []).forEach((t) => {
        allTemplates.push({
          ...t,
          type: 'bastion',
          siteName: site.name,
          siteId: site.id,
        });
      });

      // VM templates
      (site.virtualMachineTemplates || []).forEach((t) => {
        allTemplates.push({
          ...t,
          type: 'virtualMachine',
          siteName: site.name,
          siteId: site.id,
        });
      });
    });

    return allTemplates;
  }, [sites]);

  // Group templates by type
  const groupedTemplates = useMemo(() => {
    return {
      virtualMachine: templates.filter((t) => t.type === 'virtualMachine'),
      bastion: templates.filter((t) => t.type === 'bastion'),
      gateway: templates.filter((t) => t.type === 'gateway'),
    };
  }, [templates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Failed to Load Templates
            </CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "An error occurred while loading templates"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">VM Templates</h1>
            <p className="text-muted-foreground">Pre-configured virtual machine images</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileBox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Templates are provided by sites. Make sure your sites have templates configured.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">VM Templates</h1>
          <p className="text-muted-foreground">Pre-configured virtual machine images from {sites?.length || 0} sites</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VM Templates</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupedTemplates.virtualMachine.length}</div>
            <p className="text-xs text-muted-foreground">General purpose VMs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bastion Templates</CardTitle>
            <Server className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupedTemplates.bastion.length}</div>
            <p className="text-xs text-muted-foreground">Secure access hosts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gateway Templates</CardTitle>
            <Server className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupedTemplates.gateway.length}</div>
            <p className="text-xs text-muted-foreground">Network gateways</p>
          </CardContent>
        </Card>
      </div>

      {/* VM Templates Section */}
      {groupedTemplates.virtualMachine.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Virtual Machine Templates</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedTemplates.virtualMachine.map((template, index) => (
              <Card key={`${template.siteId}-vm-${template.name}-${template.revision}-${index}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline">v{template.revision}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {template.siteName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {template.cores && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        {template.cores} Cores
                      </Badge>
                    )}
                    {template.memory && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <MemoryStick className="h-3 w-3" />
                        {formatMemory(template.memory)}
                      </Badge>
                    )}
                    {template.storage && template.storage.length > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {getTotalStorage(template.storage)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Bastion Templates Section */}
      {groupedTemplates.bastion.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Bastion Templates</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedTemplates.bastion.map((template, index) => (
              <Card key={`${template.siteId}-bastion-${template.name}-${template.revision}-${index}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="secondary">v{template.revision}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {template.siteName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {template.cores && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        {template.cores} Cores
                      </Badge>
                    )}
                    {template.memory && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MemoryStick className="h-3 w-3" />
                        {formatMemory(template.memory)}
                      </Badge>
                    )}
                    {template.storage && template.storage.length > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {getTotalStorage(template.storage)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Gateway Templates Section */}
      {groupedTemplates.gateway.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Gateway Templates</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedTemplates.gateway.map((template, index) => (
              <Card key={`${template.siteId}-gateway-${template.name}-${template.revision}-${index}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="default">v{template.revision}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {template.siteName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {template.cores && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        {template.cores} Cores
                      </Badge>
                    )}
                    {template.memory && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MemoryStick className="h-3 w-3" />
                        {formatMemory(template.memory)}
                      </Badge>
                    )}
                    {template.storage && template.storage.length > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {getTotalStorage(template.storage)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
