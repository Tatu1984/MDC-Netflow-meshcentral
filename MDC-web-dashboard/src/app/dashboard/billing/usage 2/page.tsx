import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function BillingUsagePage() {
  return (
    <FeatureNotAvailable
      title="Usage & Billing"
      description="Monitor your resource usage and costs"
      featureName="Usage & Billing"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
