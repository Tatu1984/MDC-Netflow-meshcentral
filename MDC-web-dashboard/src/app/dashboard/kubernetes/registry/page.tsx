"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function RegistryPage() {
  return (
    <FeatureNotAvailable
      title="Container Registry"
      description="Store and manage your container images"
      featureName="Container Registry"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
