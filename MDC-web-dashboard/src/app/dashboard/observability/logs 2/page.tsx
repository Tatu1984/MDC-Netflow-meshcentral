import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function LogsPage() {
  return (
    <FeatureNotAvailable
      title="Logs"
      description="Explore and search logs from all your resources"
      featureName="Logs"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
