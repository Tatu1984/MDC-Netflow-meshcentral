"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function BackupsPage() {
  return (
    <FeatureNotAvailable
      title="Backup Management"
      description="Manage backup policies, schedules, and restore points"
      featureName="Backup Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
