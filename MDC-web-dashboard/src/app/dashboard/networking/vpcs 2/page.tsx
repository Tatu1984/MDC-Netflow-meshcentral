"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function VPCsPage() {
  return (
    <FeatureNotAvailable
      title="Virtual Private Clouds"
      description="Manage isolated virtual networks for your resources"
      featureName="VPC Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
