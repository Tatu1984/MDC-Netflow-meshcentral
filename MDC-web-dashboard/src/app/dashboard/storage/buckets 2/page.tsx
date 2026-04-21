"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function BucketsPage() {
  return (
    <FeatureNotAvailable
      title="Object Storage"
      description="S3-compatible object storage buckets"
      featureName="Object Storage Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
