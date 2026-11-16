import { FeatureGate } from "@/features/billing/components/upgrade-prompt";
import { FollowUpsClient } from "@/features/follow-ups/components/follow-ups-client";

export default function FollowUpsPage() {
  return (
    <FeatureGate
      feature="ai"
      title="Follow-ups"
      description="Review today's conversations and the follow-ups the AI planned."
    >
      <FollowUpsClient />
    </FeatureGate>
  );
}
