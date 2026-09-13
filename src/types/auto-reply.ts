export type AutoReplyTriggerTypeUi =
  | "keyword"
  | "exact"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "regex";

export type AutoReplyMessageModeUi = "text" | "template" | "media";

export type AutoReplyRule = {
  id: string;
  name: string;
  /** One or more triggers (comma / newline / ; / | separated). Semantics depend on triggerType. */
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
