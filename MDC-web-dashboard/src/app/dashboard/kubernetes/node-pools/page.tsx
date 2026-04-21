"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function NodePoolsPage() {
  return (
    <FeatureNotAvailable
      title="Node Pools"
      description="Manage Kubernetes node pools across your clusters"
      featureName="Node Pool Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
