import type {
  AutoReplyMessageModeUi,
  AutoReplyTriggerTypeUi,
} from "@/types/auto-reply";

export type AutoReplyRuleApi = {
  id: string;
  name: string;
  keyword: string;
  triggerType: AutoReplyTriggerTypeUi;
  caseSensitive: boolean;
  deviceId: string;
  deviceLabel: string;
  priority: number;
  cooldownMinutes: number;
  messageMode: AutoReplyMessageModeUi;
  templateId: string | null;
  templateName: string | null;
  mediaAssetId: string | null;
  mediaCaption: string | null;
  response: string;
  openAiEnabled: boolean;
  openAiSettings: Record<string, unknown> | null;
  aiSkillId?: string | null;
  aiSkillName?: string | null;
  active: boolean;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AutoReplyRulesListResponse = {
  rules: AutoReplyRuleApi[];
};

export type AutoReplyRuleMutationResponse = {
  rule: AutoReplyRuleApi;
};
