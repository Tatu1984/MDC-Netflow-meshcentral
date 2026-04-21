"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function DatabaseBackupsPage() {
  return (
    <FeatureNotAvailable
      title="Database Backups"
      description="Manage automated backups, manual snapshots, and point-in-time recovery"
      featureName="Database Backup Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
