export type BulkCampaignStatusApi =
  | "scheduled"
  | "completed"
  | "failed"
  | "pending"
  | "running"
  | "paused";

export type BulkCampaignDeviceModeApi =
  | "single"
  | "failover"
  | "round_robin";

export type BulkCampaignAntiBlockApi = {
  enabled: boolean;
  spintax: boolean;
  verifyNumbers: boolean;
  repliedOnly: boolean;
  recent24hOnly: boolean;
  uniquenessMode: "none" | "campaign" | "workspace_window";
  batchPauseEvery: number;
  batchPauseSec: number;
  failLimitInRow: number;
  activeHoursStart: string | null;
  activeHoursEnd: string | null;
  inactiveHoursStart: string | null;
  inactiveHoursEnd: string | null;
  timezone: string | null;
};

export type BulkCampaignListItemApi = {
  id: string;
  name: string;
  status: BulkCampaignStatusApi;
  kind: "text" | "template";
  selectionMode: "groups" | "all_verified" | "manual";
  deviceMode: BulkCampaignDeviceModeApi;
  scheduleType: "immediate" | "scheduled";
  scheduledAt: string | null;
  timezone: string | null;
  recipientCount: number;
  delayMinSec: number;
  delayMaxSec: number;
  maxRetries: number;
  attachmentType: string | null;
  attachmentAssetId: string | null;
  attachmentFileName: string | null;
  antiBlock: BulkCampaignAntiBlockApi;
  progress: {
    sent: number;
    failed: number;
    pending: number;
    sending: number;
    replied: number;
    total: number;
    percent: number;
    etaSeconds: number | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type BulkCampaignsListResponse = {
  campaigns: BulkCampaignListItemApi[];
};

export type CreateBulkCampaignResponse = {
  campaign: BulkCampaignListItemApi;
  dispatchedMessages: number;
  note?: string;
};

/** Optional AI rewrite block on POST /v1/bulk-campaigns (TEXT only). */
export type BulkCampaignAiRewritePayload = {
  enabled: true;
  count: number;
  credentialId: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number | null;
};

export type CreateBulkCampaignPayload = {
  name: string;
  deviceIds: string[];
  deviceMode: BulkCampaignDeviceModeApi;
  kind: "text" | "template";
  bodyText?: string;
  bodyTexts?: string[];
  templateId?: string;
  attachmentAssetId?: string | null;
  attachmentType?: "image" | "video" | "document" | "audio";
  selectionMode: "groups" | "all_verified" | "manual";
  groupIds?: string[];
  manualPhones?: string[];
  scheduleType: "immediate" | "scheduled";
  scheduledAt?: string | null;
  delayMinSec: number;
  delayMaxSec: number;
  maxRetries: number;
  aiRewrite?: BulkCampaignAiRewritePayload;
  antiBlock?: {
    enabled?: boolean;
    spintax?: boolean;
    verifyNumbers?: boolean;
    repliedOnly?: boolean;
    recent24hOnly?: boolean;
    uniquenessMode?: "none" | "campaign" | "workspace_window";
    batchPauseEvery?: number;
    batchPauseSec?: number;
    failLimitInRow?: number;
    activeHoursStart?: string | null;
    activeHoursEnd?: string | null;
    inactiveHoursStart?: string | null;
    inactiveHoursEnd?: string | null;
    timezone?: string | null;
  };
};

export type BulkCampaignDeviceRowApi = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
};

export type BulkCampaignDeviceSendStatsApi = {
  deviceId: string;
  deviceName: string;
  phone: string | null;
  sent: number;
  failed: number;
  queued: number;
  simulated: number;
  total: number;
};

export type BulkCampaignOutboundStatsApi = {
  targetRecipients: number;
  totalOutboundRows: number;
  sent: number;
  failed: number;
  queued: number;
  simulated: number;
  delivered: number;
  seen: number;
  replied: number;
  noReply: number;
  pendingInQueue: number;
  notDispatchedYet: number;
  readReceiptsTracked: true;
  seenCount: number;
};

export type BulkCampaignRecentMessageApi = {
  id: string;
  toPhone: string;
  status: string;
  deviceId: string;
  deviceName: string;
  devicePhone: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type BulkCampaignRecipientApi = {
  id: string;
  phone: string;
  status:
    | "pending"
    | "queued"
    | "sending"
    | "sent"
    | "failed"
    | "simulated"
    | "skipped"
    | "canceled";
  deviceId: string | null;
  deviceName: string | null;
  attempts: number;
  lastError: string | null;
  queuedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  seenAt: string | null;
  repliedAt: string | null;
  lastReplyAt: string | null;
  lastReplyText: string | null;
  failedAt: string | null;
  createdAt: string;
};

export type BulkCampaignRecipientStatusApi = BulkCampaignRecipientApi["status"];

export type BulkCampaignRecipientsResponse = {
  recipients: BulkCampaignRecipientApi[];
  page: number;
  pageSize: number;
  total: number;
};

export type BulkCampaignDailyStatApi = {
  date: string;
  sent: number;
  delivered: number;
  seen: number;
  replied: number;
  failed: number;
  seenRate: number;
  replyRate: number;
};

export type BulkCampaignDetailApi = {
  campaign: BulkCampaignListItemApi;
  template: { id: string; name: string; typeId: string } | null;
  messagePreview: string | null;
  /** Final TEXT message pool (custom + AI). Null/empty for templates. */
  bodyTexts?: string[] | null;
  devices: BulkCampaignDeviceRowApi[];
  deviceSendStats: BulkCampaignDeviceSendStatsApi[];
  stats: BulkCampaignOutboundStatsApi;
  dateWiseStats?: BulkCampaignDailyStatApi[];
  recentMessages: BulkCampaignRecentMessageApi[];
  recentRecipients: BulkCampaignRecipientApi[];
};
