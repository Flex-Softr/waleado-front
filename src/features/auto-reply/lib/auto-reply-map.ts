import type { AutoReplyRuleApi } from "@/types/auto-reply-api";
import type { AutoReplyRule } from "@/types/auto-reply";

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

export function ruleApiToUi(r: AutoReplyRuleApi): AutoReplyRule {
  return {
    id: r.id,
    name: r.name,
    keyword: r.keyword,
    triggerType: r.triggerType,
    caseSensitive: r.caseSensitive,
    deviceId: r.deviceId,
    deviceLabel: r.deviceLabel,
    priority: r.priority,
    cooldownMinutes: r.cooldownMinutes,
    messageMode: r.messageMode,
    templateId: r.templateId,
    templateName: r.templateName,
    mediaAssetId: r.mediaAssetId,
    mediaCaption: r.mediaCaption,
    response: r.response,
    openAiEnabled: r.openAiEnabled,
    openAiSettings: asRecord(r.openAiSettings),
    aiSkillId: r.aiSkillId ?? null,
    aiSkillName: r.aiSkillName ?? null,
    conversationHours: r.conversationHours ?? 24,
    fallbackForNewChats: r.fallbackForNewChats ?? false,
    active: r.active,
    responseCount: r.responseCount,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
