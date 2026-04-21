"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function MySQLPage() {
  return (
    <FeatureNotAvailable
      title="MySQL Databases"
      description="Managed MySQL database instances with automated backups and high availability"
      featureName="MySQL Database Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
