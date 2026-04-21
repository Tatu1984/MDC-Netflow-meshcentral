import { FeatureNotAvailable } from "@/components/feature-not-available";

export default function PaymentPage() {
  return (
    <FeatureNotAvailable
      title="Payment Methods"
      description="Manage your payment methods and billing information"
      featureName="Payment Methods"
      backHref="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
}
