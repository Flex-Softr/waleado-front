import { FeatureGate } from "@/features/billing/components/upgrade-prompt";
import { GroupGrabberClient } from "@/features/group-grabber/components/group-grabber-client";

export default function GroupGrabberPage() {
  return (
    <FeatureGate
      feature="groupGrabber"
      title="Group grabber"
      description="Export members of your WhatsApp groups into contacts."
    >
      <GroupGrabberClient />
    </FeatureGate>
  );
}
