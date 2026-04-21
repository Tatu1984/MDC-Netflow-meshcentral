"use client";

import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function LoadBalancersPage() {
  return (
    <FeatureNotAvailable
      title="Load Balancers"
      description="Distribute traffic across your resources"
      featureName="Load Balancer Management"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
