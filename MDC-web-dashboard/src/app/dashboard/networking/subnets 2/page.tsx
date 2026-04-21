"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function SubnetsPage() {
  return (
    <FeatureNotAvailable
      title="Subnets"
      description="Manage network subnets within your VPCs"
      featureName="Subnet Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
