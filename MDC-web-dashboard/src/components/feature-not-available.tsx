"use client";

import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface FeatureNotAvailableProps {
  title: string;
  description?: string;
  featureName: string;
  backHref?: string;
  backLabel?: string;
}

export function FeatureNotAvailable({
  title,
  description,
  featureName,
  backHref = "/dashboard",
  backLabel = "Back to Dashboard",
}: FeatureNotAvailableProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-yellow-500" />
            Feature Not Available
          </CardTitle>
          <CardDescription>
            This feature requires backend API support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            <strong>{featureName}</strong> is not currently supported by the MDC backend API.
            This feature would require additional backend development to implement.
          </p>
          <div className="rounded-lg border border-dashed p-4 bg-muted/30">
            <h4 className="font-medium mb-2">Available Features</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- Virtual Machines via Workspaces</li>
              <li>- Site/Node Infrastructure Management</li>
              <li>- Organization & User Management</li>
              <li>- Remote Networks (ZeroTier)</li>
              <li>- VM Templates</li>
            </ul>
          </div>
          <div className="pt-2">
            <Link href={backHref}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLabel}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
