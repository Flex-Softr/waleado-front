import { FeatureGate } from "@/features/billing/components/upgrade-prompt";
import { CallResponderClient } from "@/features/call-responder/components/call-responder-client";

export default function CallResponderPage() {
  return (
    <FeatureGate
      feature="callResponder"
      title="Call responder"
      description="Reply automatically when someone calls your WhatsApp."
    >
      <CallResponderClient />
    </FeatureGate>
  );
}
