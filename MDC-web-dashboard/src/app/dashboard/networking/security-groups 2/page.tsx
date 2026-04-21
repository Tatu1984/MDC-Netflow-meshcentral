"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function SecurityGroupsPage() {
  return (
    <FeatureNotAvailable
      title="Security Groups"
      description="Manage firewall rules for your resources"
      featureName="Security Group Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
