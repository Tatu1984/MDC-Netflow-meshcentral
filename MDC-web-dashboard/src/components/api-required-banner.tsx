"use client";

import { AlertTriangle, Code2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// BUILD MARKER: 2024-02-05-v1 - Remove after debugging

interface ApiRequiredBannerProps {
  featureName?: string;
  apis?: string[];
  compact?: boolean;
}

export function ApiRequiredBanner({
  featureName,
  apis = [],
  compact = false
}: ApiRequiredBannerProps) {
  if (compact) {
    return (
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1">
        <AlertTriangle className="h-3 w-3" />
        API Required
      </Badge>
    );
  }

  return (
    <Alert className="bg-yellow-500/10 border-yellow-500/30 mb-6">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-600">API Required</AlertTitle>
      <AlertDescription className="text-yellow-600/80">
        <p>
          {featureName ? `${featureName} requires` : "This feature requires"} backend API implementation to function.
          Currently showing UI preview with mock data.
        </p>
        {apis.length > 0 && (
          <div className="mt-2">
            <span className="font-medium">Required endpoints:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {apis.map((api, i) => (
                <code key={i} className="text-xs bg-yellow-500/20 px-1.5 py-0.5 rounded">
                  {api}
                </code>
              ))}
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Compact inline badge for use in headers
export function ApiRequiredBadge() {
  return (
    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1 ml-2">
      <Code2 className="h-3 w-3" />
      API Required
    </Badge>
  );
}
