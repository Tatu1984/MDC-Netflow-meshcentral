"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function DNSPage() {
  return (
    <FeatureNotAvailable
      title="DNS Management"
      description="Manage DNS zones and records"
      featureName="DNS Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
