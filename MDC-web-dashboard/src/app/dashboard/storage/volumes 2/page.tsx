"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function VolumesPage() {
  return (
    <FeatureNotAvailable
      title="Block Volumes"
      description="Manage persistent block storage volumes"
      featureName="Block Volume Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
