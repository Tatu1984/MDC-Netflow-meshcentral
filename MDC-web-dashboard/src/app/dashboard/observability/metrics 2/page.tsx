import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function MetricsPage() {
  return (
    <FeatureNotAvailable
      title="Metrics"
      description="Monitor resource performance and usage across your infrastructure"
      featureName="Metrics"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
