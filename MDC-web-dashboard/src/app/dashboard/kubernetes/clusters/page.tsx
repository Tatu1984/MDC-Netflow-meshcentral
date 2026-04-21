"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function KubernetesClustersPage() {
  return (
    <FeatureNotAvailable
      title="Kubernetes Clusters"
      description="Manage your managed Kubernetes clusters"
      featureName="Kubernetes Cluster Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
