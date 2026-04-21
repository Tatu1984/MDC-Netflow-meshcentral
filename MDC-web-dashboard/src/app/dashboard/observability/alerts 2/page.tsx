import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function AlertsPage() {
  return (
    <FeatureNotAvailable
      title="Alerts"
      description="Monitor, configure, and manage alerts for your infrastructure"
      featureName="Alerts"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
