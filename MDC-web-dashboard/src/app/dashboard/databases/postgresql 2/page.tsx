"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function PostgreSQLPage() {
  return (
    <FeatureNotAvailable
      title="PostgreSQL Databases"
      description="Managed PostgreSQL database instances"
      featureName="PostgreSQL Database Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
