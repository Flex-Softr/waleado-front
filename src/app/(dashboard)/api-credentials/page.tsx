import { FeatureGate } from "@/features/billing/components/upgrade-prompt";
import { ApiCredentialsClient } from "@/features/api-credentials/components/api-credentials-client";

export default function ApiCredentialsPage() {
  return (
    <FeatureGate
      feature="api"
      title="API access"
      description="Send WhatsApp messages from your own apps and websites."
    >
      <ApiCredentialsClient />
    </FeatureGate>
  );
}
