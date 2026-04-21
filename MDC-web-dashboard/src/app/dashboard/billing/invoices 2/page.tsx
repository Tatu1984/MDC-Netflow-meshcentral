import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function InvoicesPage() {
  return (
    <FeatureNotAvailable
      title="Invoices"
      description="View and manage your billing invoices"
      featureName="Billing Invoices"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
