import { FeatureGate } from "@/features/billing/components/upgrade-prompt";
import { ChatbotClient } from "@/features/chatbot/components/chatbot-client";

export default function ChatbotPage() {
  return (
    <FeatureGate
      feature="chatbot"
      title="Chatbot flows"
      description="Build guided WhatsApp conversations with buttons and menus."
    >
      <ChatbotClient />
    </FeatureGate>
  );
}
