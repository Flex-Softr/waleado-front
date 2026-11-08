import { FeatureGate } from "@/features/billing/components/upgrade-prompt";
import { AiSkillsClient } from "@/features/ai-skills/components/ai-skills-client";

export default function AiSkillsPage() {
  return (
    <FeatureGate
      feature="ai"
      title="AI skills"
      description="Create reusable AI personas for auto-replies."
    >
      <AiSkillsClient />
    </FeatureGate>
  );
}
