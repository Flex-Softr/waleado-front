export type LeadStage =
  | "NEW"
  | "INTERESTED"
  | "READY_TO_BUY"
  | "OBJECTION"
  | "CONVERTED"
  | "LOST";

export type FollowUpStatus = "NONE" | "SCHEDULED" | "SENT" | "CANCELED";

export type FollowUpApi = {
  id: string;
  deviceId: string;
  peerPhone: string | null;
  peerLabel: string;
  displayTitle: string;
  stage: LeadStage;
  summary: string;
  needsHuman: boolean;
  followUpStatus: FollowUpStatus;
  followUpAt: string | null;
  followUpMessage: string | null;
  followUpsSent: number;
  lastFollowUpSentAt: string | null;
  lastConversationAt: string;
  canSend: boolean;
};

export type FollowUpsListResponse = { items: FollowUpApi[] };
export type FollowUpMutationResponse = { item: FollowUpApi };

export type FollowUpView = "today" | "scheduled" | "converted" | "all";

export type FollowUpPatch = {
  stage?: LeadStage;
  followUpAt?: string | null;
  followUpMessage?: string | null;
  followUpStatus?: "SCHEDULED" | "CANCELED";
  needsHuman?: boolean;
};

export type FollowUpSettings = {
  /** False until the owner saves once (then the browser timezone is suggested). */
  configured: boolean;
  autoSend: boolean;
  timezone: string;
  windowStartHour: number;
  windowEndHour: number;
  maxFollowUps: number;
  dailyLimitPerDevice: number;
  idleHours: number;
  maxDays: number;
  instructions: string;
};

export type FollowUpSettingsResponse = { settings: FollowUpSettings };
