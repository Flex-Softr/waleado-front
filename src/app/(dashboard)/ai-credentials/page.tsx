import { FeatureGate } from "@/features/billing/components/upgrade-prompt";
import { AiCredentialsClient } from "@/features/ai-credentials/components/ai-credentials-client";

export default function AiCredentialsPage() {
  return (
    <FeatureGate
      feature="ai"
      title="AI replies"
      description="Connect your AI provider to reply to customers automatically."
    >
      <AiCredentialsClient />
    </FeatureGate>
  );
}
