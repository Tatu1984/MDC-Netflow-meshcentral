"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function PublicIPsPage() {
  return (
    <FeatureNotAvailable
      title="Public IPs"
      description="Manage public IP address allocations"
      featureName="Public IP Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
