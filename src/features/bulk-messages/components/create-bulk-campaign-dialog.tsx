"use client";

import * as React from "react";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Minus,
  Phone,
  Plus,
  Send,
  Shield,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useSubscription } from "@/features/billing/subscription-context";
import { AiPanelErrorBoundary } from "@/features/bulk-messages/components/ai-panel-error-boundary";
import { DeviceConnectionAlert } from "@/features/shared/components/device-connection-alert";
import { MessageTypeCards } from "@/features/single-message/components/message-type-cards";
import type { MessageFormType } from "@/features/single-message/components/message-type-cards";
import { useContacts } from "@/features/contacts/contacts-provider";
import {
  aiSettingsDefaults,
  aiSettingsFormValid,
  buildAiSettingsPayload,
} from "@/features/bulk-messages/lib/ai-settings-form";
import { maxBulkMessageContentsForPlan } from "@/features/bulk-messages/lib/bulk-message-plan-limits";
import type {
  CreateBulkCampaignPayload,
  CreateBulkCampaignResponse,
} from "@/types/bulk-campaign-api";
import type {
  AiCredentialApi,
  AiCredentialsListResponse,
  AiSettingsForm,
} from "@/types/ai-credentials-api";
import type { DeviceApiRecord, DevicesListResponse } from "@/types/device";
import type {
  MessageTemplateApiRecord,
  TemplatesListResponse,
} from "@/types/templates-api";
import { ApiError, apiFormJson, apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ATTACHMENT_TYPES = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "audio", label: "Audio" },
] as const;

/** Sentinel for Base UI Select when no credential is chosen. */
const CREDENTIAL_NONE = "__none__";

type AttachmentType = (typeof ATTACHMENT_TYPES)[number]["value"];
type SelectionMode = "groups" | "allVerified" | "manual";
type ScheduleType = "immediate" | "scheduled";
type DeviceMode = "single" | "failover" | "round_robin";
type UniquenessMode = "none" | "campaign" | "workspace_window";

const DEVICE_MODE_OPTIONS: {
  value: DeviceMode;
  title: string;
  description: string;
  icon: typeof Phone;
}[] = [
  {
    value: "single",
    title: "Single",
    description: "One device",
    icon: Phone,
  },
  {
    value: "failover",
    title: "Failover",
    description: "Sequential backup",
    icon: Shield,
  },
  {
    value: "round_robin",
    title: "Round Robin",
    description: "Rotate devices",
    icon: Shuffle,
  },
];

const WIZARD_STEPS = [
  {
    id: "setup",
    title: "Setup",
    blurb: "Name the campaign and choose sender devices.",
  },
  {
    id: "message",
    title: "Message",
    blurb: "Write content, pick a template, and attach media.",
  },
  {
    id: "audience",
    title: "Audience",
    blurb: "Select who should receive this campaign.",
  },
  {
    id: "schedule",
    title: "Schedule",
    blurb: "Choose when to send and pacing between messages.",
  },
  {
    id: "protection",
    title: "Protection",
    blurb: "Configure anti-block filters and send windows.",
  },
  {
    id: "summary",
    title: "Summary",
    blurb: "Review details and create the campaign.",
  },
] as const;

type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

function acceptForAttachmentType(t: AttachmentType): string {
  switch (t) {
    case "image":
      return "image/jpeg,image/png,image/gif,image/webp";
    case "video":
      return "video/*";
    case "audio":
      return "audio/*";
    case "document":
      return ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf";
    default:
      return "*/*";
  }
}

type CreateBulkCampaignDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

function useRecipientSummary(
  mode: SelectionMode,
  selectedGroupIds: Set<string>,
  manualNumbers: string,
  groupStats: (id: string) => { verified: number; total: number },
  globalVerified: number
) {
  return React.useMemo(() => {
    if (mode === "allVerified") {
      return {
        count: globalVerified,
        verifiedOnly: true,
      };
    }
    if (mode === "groups") {
      let n = 0;
      for (const id of selectedGroupIds) {
        n += groupStats(id).verified;
      }
      return { count: n, verifiedOnly: true };
    }
    const lines = manualNumbers
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return { count: lines.length, verifiedOnly: false };
  }, [mode, selectedGroupIds, manualNumbers, groupStats, globalVerified]);
}

function deviceName(d: DeviceApiRecord): string {
  const name = (d.name ?? "").trim();
  return name || "Unnamed device";
}

export function CreateBulkCampaignDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBulkCampaignDialogProps) {
  const { groups, groupStats, globalStats, refreshGroups } = useContacts();
  const { planId } = useSubscription();
  const maxMessageContents = maxBulkMessageContentsForPlan(planId);

  const [contextLoading, setContextLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState(0);
  const [protectionOpen, setProtectionOpen] = React.useState({
    filters: true,
    pacing: true,
    hours: false,
  });
  const [allDevices, setAllDevices] = React.useState<DeviceApiRecord[]>([]);
  const [templates, setTemplates] = React.useState<MessageTemplateApiRecord[]>(
    []
  );
  const [credentials, setCredentials] = React.useState<AiCredentialApi[]>([]);

  const [campaignName, setCampaignName] = React.useState("");
  const [deviceMode, setDeviceMode] = React.useState<DeviceMode>("round_robin");
  const [singleDeviceId, setSingleDeviceId] = React.useState("");
  const [sessionIds, setSessionIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [messageType, setMessageType] = React.useState<MessageFormType>("text");
  const [bodyTexts, setBodyTexts] = React.useState<string[]>([""]);
  const [aiRewriteEnabled, setAiRewriteEnabled] = React.useState(false);
  const [aiRewriteCount, setAiRewriteCount] = React.useState("1");
  const [aiRewriteSettings, setAiRewriteSettings] =
    React.useState<AiSettingsForm>(() => aiSettingsDefaults());
  const [templateId, setTemplateId] = React.useState("");
  const [attachmentType, setAttachmentType] =
    React.useState<AttachmentType>("image");
  const [attachmentAssetId, setAttachmentAssetId] = React.useState("");
  const [attachmentOriginalName, setAttachmentOriginalName] =
    React.useState("");
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const [scheduleType, setScheduleType] =
    React.useState<ScheduleType>("immediate");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [delayMinSec, setDelayMinSec] = React.useState("150");
  const [delayMaxSec, setDelayMaxSec] = React.useState("200");
  const [maxRetries, setMaxRetries] = React.useState("3");
  const [selectionMode, setSelectionMode] =
    React.useState<SelectionMode>("groups");
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [manualNumbers, setManualNumbers] = React.useState("");
  const [antiBlockEnabled, setAntiBlockEnabled] = React.useState(true);
  const [spintaxEnabled, setSpintaxEnabled] = React.useState(false);
  const [verifyNumbers, setVerifyNumbers] = React.useState(false);
  const [repliedOnly, setRepliedOnly] = React.useState(false);
  const [recent24hOnly, setRecent24hOnly] = React.useState(false);
  const [uniquenessMode, setUniquenessMode] =
    React.useState<UniquenessMode>("none");
  const [batchPauseEvery, setBatchPauseEvery] = React.useState("30");
  const [batchPauseSec, setBatchPauseSec] = React.useState("30");
  const [failLimitInRow, setFailLimitInRow] = React.useState("5");
  const [activeHoursStart, setActiveHoursStart] = React.useState("");
  const [activeHoursEnd, setActiveHoursEnd] = React.useState("");
  const [inactiveHoursStart, setInactiveHoursStart] = React.useState("");
  const [inactiveHoursEnd, setInactiveHoursEnd] = React.useState("");
  const g = globalStats();
  const fieldClass = "h-11";
  const textareaClass = "resize-y text-[15px] leading-relaxed";
  const sectionClass =
    "rounded-xl border border-border bg-card p-5 shadow-sm";
  const helperClass = "text-xs leading-5 text-muted-foreground";
  /** Clear field chrome on tinted panels (e.g. AI rewrites). */
  const tintedFieldClass =
    "border-border bg-card hover:bg-card focus-visible:border-border focus-visible:bg-card dark:bg-card dark:hover:bg-card dark:focus-visible:bg-card";

  const activeHoursEnabled =
  activeHoursStart.trim() !== "" &&
  activeHoursEnd.trim() !== "";


  const { count: recipientCount, verifiedOnly } = useRecipientSummary(
    selectionMode,
    selectedGroupIds,
    manualNumbers,
    groupStats,
    g.verified
  );

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setContextLoading(true);
      try {
        const loadedGroups = await refreshGroups();
        const [devRes, tplRes, credRes] = await Promise.all([
          apiJson<DevicesListResponse>("/v1/devices"),
          apiJson<TemplatesListResponse>("/v1/templates"),
          apiJson<AiCredentialsListResponse>("/v1/ai-credentials").catch(
            () => ({ credentials: [] as AiCredentialApi[] })
          ),
        ]);
        if (cancelled) return;
        setAllDevices(devRes.devices);
        setTemplates(
          tplRes.templates.filter((tpl) => tpl.active !== false)
        );
        setCredentials(
          Array.isArray(credRes.credentials) ? credRes.credentials : []
        );
        const connected = devRes.devices.filter((d) => d.status === "connected");

        setWizardStep(0);
        setProtectionOpen({ filters: true, pacing: true, hours: false });
        setCampaignName("");
        setDeviceMode("round_robin");
        setSessionIds(new Set(connected.map((d) => d.id)));
        setSingleDeviceId(connected[0]?.id ?? "");
        setMessageType("text");
        setBodyTexts([""]);
        setAiRewriteEnabled(false);
        setAiRewriteCount("1");
        setAiRewriteSettings(aiSettingsDefaults());
        setTemplateId("");
        setAttachmentType("image");
        setAttachmentAssetId("");
        setAttachmentOriginalName("");
        setScheduleType("immediate");
        setScheduledAt("");
        setDelayMinSec("150");
        setDelayMaxSec("200");
        setMaxRetries("3");
        setSelectionMode("groups");
        setSelectedGroupIds(new Set(loadedGroups.map((x) => x.id)));
        setManualNumbers("");
        setAntiBlockEnabled(true);
        setSpintaxEnabled(false);
        setVerifyNumbers(false);
        setRepliedOnly(false);
        setRecent24hOnly(false);
        setUniquenessMode("none");
        setBatchPauseEvery("30");
        setBatchPauseSec("30");
        setFailLimitInRow("5");
        setActiveHoursStart("");
        setActiveHoursEnd("");
        setInactiveHoursStart("");
        setInactiveHoursEnd("");
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof ApiError
              ? err.message
              : "Could not load devices or templates.";
          toast.error("Load failed", { description: msg });
          setAllDevices([]);
          setTemplates([]);
          setCredentials([]);
          setSessionIds(new Set());
        }
      } finally {
        if (!cancelled) {
          setContextLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, refreshGroups]);

  React.useEffect(() => {
    if (messageType === "text") setTemplateId("");
    else setAiRewriteEnabled(false);
  }, [messageType]);

  const parsedAiRewriteCount = React.useMemo(() => {
    const n = Number.parseInt(aiRewriteCount, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(20, n);
  }, [aiRewriteCount]);

  const customFilledCount = bodyTexts.filter((t) => t.trim().length > 0).length;
  // Custom message rows are capped by plan; AI count is validated separately on submit.
  const maxCustomSlots = maxMessageContents;
  const maxAiSlots = Math.max(0, maxMessageContents - Math.max(1, customFilledCount));
  const safeAiCount =
    maxAiSlots > 0 ? Math.min(parsedAiRewriteCount, maxAiSlots) : 0;
  const activeCredentials = React.useMemo(
    () => (Array.isArray(credentials) ? credentials.filter((c) => c.active) : []),
    [credentials]
  );

  function updateBodyTextAt(index: number, value: string) {
    setBodyTexts((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function addBodyText() {
    setBodyTexts((prev) => {
      if (prev.length >= maxCustomSlots) return prev;
      return [...prev, ""];
    });
  }

  function removeBodyText(index: number) {
    setBodyTexts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function toggleAiRewrite() {
    if (aiRewriteEnabled) {
      setAiRewriteEnabled(false);
      return;
    }
    if (maxAiSlots < 1) {
      toast.error("AI rewrites unavailable", {
        description: `Your plan allows ${maxMessageContents} message content(s). Keep fewer custom messages or upgrade.`,
      });
      return;
    }
    if (parsedAiRewriteCount > maxAiSlots) {
      setAiRewriteCount(String(maxAiSlots));
    }
    setAiRewriteEnabled(true);
  }

  React.useEffect(() => {
    setAttachmentAssetId("");
    setAttachmentOriginalName("");
  }, [attachmentType]);

  function toggleSession(id: string, checked: boolean) {
    const dev = allDevices.find((d) => d.id === id);
    if (dev && dev.status !== "connected") return;
    setSessionIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  const connected = React.useMemo(
    () => allDevices.filter((d) => d.status === "connected"),
    [allDevices]
  );

  React.useEffect(() => {
    if (singleDeviceId && !connected.some((d) => d.id === singleDeviceId)) {
      setSingleDeviceId("");
    }
  }, [connected, singleDeviceId]);

  React.useEffect(() => {
    if (connected.length === 1 && singleDeviceId === "") {
      setSingleDeviceId(connected[0].id);
    }
  }, [connected, singleDeviceId]);

  const selectedDevice = React.useMemo(
    () => connected.find((d) => d.id === singleDeviceId),
    [connected, singleDeviceId]
  );

  async function handleAttachmentFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachmentUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const meta = await apiFormJson<{
        id: string;
        originalName: string;
      }>("/v1/templates/media", form);
      setAttachmentAssetId(meta.id);
      setAttachmentOriginalName(meta.originalName);
      toast.success("File uploaded", { description: meta.originalName });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Upload failed.";
      toast.error("Upload failed", { description: msg });
      setAttachmentAssetId("");
      setAttachmentOriginalName("");
    } finally {
      setAttachmentUploading(false);
    }
  }

  function toggleGroup(id: string, checked: boolean) {
    setSelectedGroupIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  const messageOk =
    messageType === "text"
      ? customFilledCount > 0
      : templateId !== "" && templates.some((t) => t.id === templateId);

  const poolWithinPlan =
    messageType !== "text" ||
    customFilledCount + (aiRewriteEnabled ? safeAiCount : 0) <=
      maxMessageContents;

  const aiRewriteOk =
    messageType !== "text" ||
    !aiRewriteEnabled ||
    (aiSettingsFormValid(aiRewriteSettings) &&
      safeAiCount >= 1 &&
      poolWithinPlan);

  const recipientsOk =
    selectionMode === "groups"
      ? selectedGroupIds.size > 0
      : selectionMode === "allVerified"
        ? g.verified > 0
        : manualNumbers
            .split("\n")
            .map((l) => l.trim())
            .some(Boolean);

  const scheduleOk =
    scheduleType === "immediate" ||
    (scheduleType === "scheduled" && scheduledAt.trim().length > 0);

  const hasConnectedDevice = allDevices.some((d) => d.status === "connected");

  const devicesOk =
    deviceMode === "single"
      ? Boolean(
          singleDeviceId &&
            allDevices.some(
              (d) => d.id === singleDeviceId && d.status === "connected"
            )
        )
      : sessionIds.size > 0;

  const activeHoursPairOk =
    (activeHoursStart.trim().length === 0 && activeHoursEnd.trim().length === 0) ||
    (activeHoursStart.trim().length > 0 && activeHoursEnd.trim().length > 0);

  const inactiveHoursPairOk =
    (inactiveHoursStart.trim().length === 0 && inactiveHoursEnd.trim().length === 0) ||
    (inactiveHoursStart.trim().length > 0 && inactiveHoursEnd.trim().length > 0);

  const canSubmit =
    !contextLoading &&
    !submitting &&
    !attachmentUploading &&
    hasConnectedDevice &&
    campaignName.trim().length > 0 &&
    devicesOk &&
    messageOk &&
    aiRewriteOk &&
    poolWithinPlan &&
    recipientsOk &&
    scheduleOk &&
    activeHoursPairOk &&
    inactiveHoursPairOk;

  const setupOk =
    campaignName.trim().length > 0 && devicesOk && hasConnectedDevice;
  const messageStepOk = messageOk && aiRewriteOk && poolWithinPlan;
  const protectionOk = activeHoursPairOk && inactiveHoursPairOk;

  function stepComplete(index: number): boolean {
    switch (WIZARD_STEPS[index]?.id as WizardStepId | undefined) {
      case "setup":
        return setupOk;
      case "message":
        return messageStepOk;
      case "audience":
        return recipientsOk;
      case "schedule":
        return scheduleOk;
      case "protection":
        return protectionOk;
      case "summary":
        return canSubmit;
      default:
        return false;
    }
  }

  function validateCurrentStep(): boolean {
    const id = WIZARD_STEPS[wizardStep]?.id;
    if (id === "setup" && !setupOk) {
      toast.error("Setup incomplete", {
        description:
          "Enter a campaign name and select at least one connected device.",
      });
      return false;
    }
    if (id === "message" && !messageStepOk) {
      toast.error("Message incomplete", {
        description:
          "Add message content or a template, and keep AI settings within plan limits.",
      });
      return false;
    }
    if (id === "audience" && !recipientsOk) {
      toast.error("Audience incomplete", {
        description: "Select groups, verified contacts, or enter phone numbers.",
      });
      return false;
    }
    if (id === "schedule" && !scheduleOk) {
      toast.error("Schedule incomplete", {
        description: "Pick a send time for scheduled campaigns.",
      });
      return false;
    }
    if (id === "protection" && !protectionOk) {
      toast.error("Protection incomplete", {
        description: "Set both start and end for active/inactive hours, or clear them.",
      });
      return false;
    }
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setWizardStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1));
  }

  function goBack() {
    setWizardStep((s) => Math.max(0, s - 1));
  }

  function goToStep(index: number) {
    if (index === wizardStep) return;
    if (index < wizardStep) {
      setWizardStep(index);
      return;
    }
    for (let i = wizardStep; i < index; i += 1) {
      if (!stepComplete(i)) {
        toast.error("Complete earlier steps first", {
          description: `Finish “${WIZARD_STEPS[i].title}” before continuing.`,
        });
        setWizardStep(i);
        return;
      }
    }
    setWizardStep(index);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const rawLo = parseInt(delayMinSec, 10) || 0;
      const rawHi = parseInt(delayMaxSec, 10) || 0;
      const delayLo = Math.min(3600, Math.max(0, Math.min(rawLo, rawHi)));
      const delayHi = Math.min(3600, Math.max(0, Math.max(rawLo, rawHi)));
      const retries = Math.min(10, Math.max(0, parseInt(maxRetries, 10) || 0));
      const batchEvery = Math.min(
        5000,
        Math.max(1, parseInt(batchPauseEvery, 10) || 1)
      );
      const batchSec = Math.min(
        3600,
        Math.max(1, parseInt(batchPauseSec, 10) || 1)
      );
      const failLimit = Math.min(
        1000,
        Math.max(1, parseInt(failLimitInRow, 10) || 1)
      );
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || null;

      const deviceIds =
        deviceMode === "single" ? [singleDeviceId] : [...sessionIds];

      const normalizedBodyTexts =
        messageType === "text"
          ? bodyTexts.map((t) => t.trim()).filter(Boolean)
          : [];

      const aiSettingsPayload = aiRewriteEnabled
        ? buildAiSettingsPayload(aiRewriteSettings)
        : null;

      if (messageType === "text" && aiRewriteEnabled) {
        if (!aiSettingsPayload?.credentialId) {
          toast.error("AI rewrite incomplete", {
            description: "Select an AI credential before creating the campaign.",
          });
          return;
        }
        if (safeAiCount < 1) {
          toast.error("AI rewrite unavailable", {
            description: `Your plan allows ${maxMessageContents} total message content(s). Reduce custom variants or lower the AI count.`,
          });
          return;
        }
      }

      const payload: CreateBulkCampaignPayload = {
        name: campaignName.trim(),
        deviceIds,
        deviceMode,
        kind: messageType,
        bodyText:
          messageType === "text" ? normalizedBodyTexts[0] : undefined,
        bodyTexts:
          messageType === "text" ? normalizedBodyTexts : undefined,
        templateId:
          messageType === "template" && templateId
            ? templateId
            : undefined,
        attachmentAssetId: attachmentAssetId.trim() || null,
        selectionMode:
          selectionMode === "groups"
            ? "groups"
            : selectionMode === "allVerified"
              ? "all_verified"
              : "manual",
        groupIds:
          selectionMode === "groups"
            ? [...selectedGroupIds]
            : undefined,
        manualPhones:
          selectionMode === "manual"
            ? manualNumbers
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
            : undefined,
        attachmentType,
        scheduleType:
          scheduleType === "immediate" ? "immediate" : "scheduled",
        scheduledAt:
          scheduleType === "scheduled"
            ? new Date(scheduledAt).toISOString()
            : null,
        delayMinSec: delayLo,
        delayMaxSec: delayHi,
        maxRetries: retries,
        aiRewrite:
          messageType === "text" &&
          aiRewriteEnabled &&
          aiSettingsPayload?.credentialId &&
          safeAiCount >= 1
            ? {
                enabled: true,
                count: safeAiCount,
                credentialId: aiSettingsPayload.credentialId,
                ...(aiSettingsPayload.model
                  ? { model: aiSettingsPayload.model }
                  : {}),
                systemPrompt: aiSettingsPayload.systemPrompt,
                temperature: aiSettingsPayload.temperature,
                maxTokens: aiSettingsPayload.maxTokens,
              }
            : undefined,
        antiBlock: {
          enabled: antiBlockEnabled,
          spintax: spintaxEnabled,
          verifyNumbers,
          repliedOnly,
          recent24hOnly,
          uniquenessMode,
          batchPauseEvery: batchEvery,
          batchPauseSec: batchSec,
          failLimitInRow: failLimit,
          activeHoursStart: activeHoursStart.trim() || null,
          activeHoursEnd: activeHoursEnd.trim() || null,
          inactiveHoursStart: inactiveHoursStart.trim() || null,
          inactiveHoursEnd: inactiveHoursEnd.trim() || null,
          timezone,
        },
      };

      const out = await apiJson<CreateBulkCampaignResponse>(
        "/v1/bulk-campaigns",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const aiNote =
        messageType === "text" && aiRewriteEnabled && safeAiCount >= 1
          ? ` Includes ${safeAiCount} AI rewrite(s) in the send pool.`
          : "";
      toast.success("Campaign created", {
        description:
          out.dispatchedMessages > 0
            ? `“${out.campaign.name}” — ${out.dispatchedMessages} message(s) recorded (${out.campaign.recipientCount} recipients).${aiNote}`
            : `“${out.campaign.name}” is scheduled (${out.campaign.recipientCount} recipients).${aiNote}`,
      });
      if (out.note) {
        toast.message("Note", { description: out.note });
      }
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not create campaign.";
      toast.error("Create failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  function deviceLabel(d: DeviceApiRecord): string {
    const bits = [d.name];
    if (d.phone) bits.push(d.phone);
    return bits.join(" · ");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[min(94vh,900px)] max-w-[calc(100%-.5rem)] flex-col gap-0 overflow-hidden rounded-xl p-0",
          "border border-border bg-card shadow-xl",
          "sm:max-w-6xl md:flex-row"
        )}
      >
        <AiPanelErrorBoundary label="Campaign dialog crashed while updating.">
          {/* Sidebar wizard stepper */}
          <aside className="flex shrink-0 flex-col border-b border-border bg-muted/60 md:w-70 md:border-b-0 md:border-r">
            <DialogHeader className="space-y-1 px-5 pb-4 pt-5 text-left sm:px-6 sm:pt-6">
              <DialogTitle className="font-heading text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Build Campaign
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Follow each step, then confirm and send.
              </DialogDescription>
            </DialogHeader>

            <nav
              aria-label="Campaign wizard steps"
              className="flex gap-2 overflow-x-auto px-5 pb-4 sm:px-6 md:flex-col md:gap-0 md:overflow-visible md:px-4 md:pb-2"
            >
              {WIZARD_STEPS.map((step, index) => {
                const isActive = wizardStep === index;
                const isComplete = index < wizardStep && stepComplete(index);
                const isUpcoming = index > wizardStep && !isComplete;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(index)}
                    className={cn(
                      "flex min-w-30 shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors md:min-w-0 md:w-full md:px-3 md:py-3",
                      isActive && "bg-white shadow-sm dark:bg-slate-950/60",
                      !isActive && "hover:bg-white/70 dark:hover:bg-slate-950/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isActive &&
                          "border-slate-900 bg-slate-900 dark:border-primary dark:bg-primary",
                        isComplete &&
                          !isActive &&
                          "border-primary bg-primary text-white dark:border-primary dark:bg-primary",
                        isUpcoming &&
                          "border-slate-200 bg-transparent dark:border-slate-700"
                      )}
                    >
                      {isComplete && !isActive ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : isActive ? (
                        <span className="size-2 rounded-full bg-white" />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        isActive
                          ? "font-semibold text-slate-900 dark:text-slate-100"
                          : isComplete
                            ? "font-medium text-slate-700 dark:text-slate-300"
                            : "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto hidden border-t border-border px-5 py-4 md:block sm:px-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="text-sm font-medium text-muted-foreground underline decoration-dashed underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
              >
                Save &amp; Close
              </button>
            </div>
          </aside>

          {/* Main content pane */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            {contextLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
                <Loader2 className="size-10 animate-spin text-foreground" />
                <p className="text-sm">Loading devices and templates...</p>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
                  <div className="mb-6 space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      {WIZARD_STEPS[wizardStep].title}
                    </h2>
                    <p className={helperClass}>{WIZARD_STEPS[wizardStep].blurb}</p>
                  </div>

                  <div className="space-y-5">
                    {WIZARD_STEPS[wizardStep].id === "setup" ? (
                      <>
                        {!hasConnectedDevice && !contextLoading ? (
                          <DeviceConnectionAlert
                            title="No WhatsApp Device Connected"
                            description="You need at least one connected WhatsApp device to send campaigns. Please link a device under Devices first."
                            actionText="Connect Device"
                            actionHref="/devices"
                          />
                        ) : null}
                        <div className={cn(sectionClass, "rounded-xl")}>
                          <div className="space-y-2.5">
                            <Label
                              htmlFor="bulk-campaign-name"
                              className="text-sm font-semibold"
                            >
                              Campaign Name{" "}
                              <span className="font-normal text-red-600 dark:text-red-400">
                                *
                              </span>
                            </Label>
                            <Input
                              id="bulk-campaign-name"
                              value={campaignName}
                              onChange={(e) => setCampaignName(e.target.value)}
                              placeholder="e.g., Product Launch Announcement"
                              className={`${fieldClass} text-[15px]`}
                            />
                          </div>
                        </div>

                        <div className={cn(sectionClass, "rounded-xl")}>
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Device mode</Label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {DEVICE_MODE_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const active = deviceMode === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDeviceMode(opt.value)}
                            className={cn(
                              "flex min-h-24 flex-col items-start gap-2 rounded-xl border px-4 py-3.5 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20",
                              active
                                ? "border-foreground/20 bg-muted text-foreground ring-2 ring-foreground/10"
                                : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-10 items-center justify-center rounded-lg",
                                active
                                  ? "bg-foreground text-background"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              <Icon
                                className="size-5"
                              />
                            </span>
                            <span className="flex flex-col gap-1">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {opt.title}
                              </span>
                              <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {opt.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                Single:
                              </span>{" "}
                              all sends use one session.{" "}
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                Failover:
                              </span>{" "}
                              try the next device if the previous is offline.{" "}
                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                Round robin:
                              </span>{" "}
                              spread recipients across selected devices.
                            </p>
                          </div>
                        </div>

                        {deviceMode === "single" ? (
                          <div className={cn(sectionClass, "rounded-xl")}>
                            <div className="space-y-2.5">
                              <Label
                                htmlFor="bulk-single-device"
                                className="text-sm font-semibold"
                              >
                                Device{" "}
                                <span className="font-normal text-red-600 dark:text-red-400">
                                  *
                                </span>
                              </Label>
                              <Select
                                value={singleDeviceId}
                                onValueChange={(v) => setSingleDeviceId(v ?? "")}
                                items={connected.map((d) => ({
                                  value: d.id,
                                  label: deviceName(d),
                                }))}
                              >
                                <SelectTrigger
                                  id="bulk-single-device"
                                  size="default"
                                  className={`${fieldClass} w-full min-w-0`}
                                >
                                  <SelectValue placeholder="Choose a connected device…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {connected.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {deviceName(d)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedDevice ? (
                                <p className={helperClass}>
                                  Outgoing messages will use this WhatsApp session (
                                  {selectedDevice.phone ?? "number on file"}).
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div className={cn(sectionClass, "rounded-xl")}>
                            <div className="space-y-2.5">
                              <Label className="text-sm font-semibold">
                                WhatsApp sessions{" "}
                                <span className="font-normal text-red-600 dark:text-red-400">
                                  *
                                </span>
                                <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                                  (select one or more)
                                </span>
                              </Label>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {allDevices.length === 0 ? (
                                  <p className="col-span-full px-3 py-8 text-center text-sm text-slate-500">
                                    No devices yet — add a session under Devices.
                                  </p>
                                ) : (
                                  allDevices.map((d) => {
                                    const isConnected = d.status === "connected";
                                    return (
                                      <label
                                        key={d.id}
                                        className={cn(
                                          "flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors",
                                          isConnected
                                            ? sessionIds.has(d.id)
                                              ? "cursor-pointer border-border bg-muted dark:border-border dark:bg-muted/30"
                                              : "cursor-pointer border-slate-100 bg-white hover:border-border hover:bg-muted/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-border"
                                            : "cursor-not-allowed border-slate-100 bg-white opacity-60 dark:border-slate-800 dark:bg-slate-950"
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          disabled={!isConnected}
                                          checked={sessionIds.has(d.id)}
                                          onChange={(e) =>
                                            toggleSession(d.id, e.target.checked)
                                          }
                                          className="size-4 shrink-0 rounded border-slate-300 text-foreground focus:ring-ring/20 disabled:opacity-50"
                                        />
                                        <span className="min-w-0 flex-1">
                                          <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {deviceLabel(d)}
                                          </span>
                                        </span>
                                        <span
                                          className={cn(
                                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                            isConnected
                                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                          )}
                                        >
                                          {isConnected ? "Connected" : "Inactive"}
                                        </span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}

                    {WIZARD_STEPS[wizardStep].id === "message" ? (
                      <>
                        <div className={cn(sectionClass, "rounded-xl")}>
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Message Type</Label>
                            <MessageTypeCards
                              value={messageType}
                              onChange={setMessageType}
                            />
                          </div>
                        </div>

                        {messageType === "text" ? (
                          <>
                            <div className={cn(sectionClass, "rounded-xl")}>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold">
                            Message Content{" "}
                            <span className="font-normal text-red-600 dark:text-red-400">
                              *
                            </span>
                          </Label>
                          <p className={helperClass}>
                            Add multiple variants. One is picked at random per
                            recipient. Plan allows up to {maxMessageContents}{" "}
                            total (custom + AI).
                          </p>
                        </div>
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground dark:bg-muted dark:text-foreground">
                          {customFilledCount +
                            (aiRewriteEnabled ? safeAiCount : 0)}
                          /{maxMessageContents}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {bodyTexts.map((text, index) => (
                          <div key={index} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <Label
                                htmlFor={`bulk-message-${index}`}
                                className="text-xs font-medium text-slate-600 dark:text-slate-300"
                              >
                                Variant {index + 1}
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-destructive hover:text-destructive"
                                disabled={bodyTexts.length <= 1}
                                onClick={() => removeBodyText(index)}
                              >
                                <Trash2 className="size-3.5" />
                                Remove
                              </Button>
                            </div>
                            <Textarea
                              id={`bulk-message-${index}`}
                              value={text}
                              onChange={(e) =>
                                updateBodyTextAt(index, e.target.value)
                              }
                              placeholder="Enter your message here..."
                              className={`${textareaClass} min-h-28`}
                            />
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-md"
                        disabled={bodyTexts.length >= maxCustomSlots}
                        onClick={addBodyText}
                      >
                        <Plus className="size-3.5" />
                        Add message
                      </Button>
                      {!poolWithinPlan ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Custom messages + AI rewrites exceed your plan limit (
                          {maxMessageContents}). Reduce variants or upgrade.
                        </p>
                      ) : null}
                    </div>
                    </div>

                    <div
                      className={cn(
                        sectionClass,
                        "rounded-xl border-sky-200/80 bg-sky-50/40 dark:border-sky-900/60 dark:bg-sky-950/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Sparkles className="size-4 text-sky-600 dark:text-sky-400" />
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              AI message rewrites
                            </span>
                            <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/80 dark:text-sky-200">
                              AI Powered
                            </span>
                          </div>
                          <p className={helperClass}>
                            Generate extra paraphrases from your first message at
                            create time. Counts toward your plan limit.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={aiRewriteEnabled}
                          onClick={toggleAiRewrite}
                          className={cn(
                            "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
                            aiRewriteEnabled
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-slate-200 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform",
                              aiRewriteEnabled && "translate-x-5"
                            )}
                          />
                        </button>
                      </div>

                      {aiRewriteEnabled ? (
                        <div className="mt-4 space-y-4 border-t border-sky-200/70 pt-4 dark:border-sky-900/50">
                          <div className="space-y-2">
                            <Label
                              htmlFor="bulk-ai-rewrite-count"
                              className="text-sm font-semibold"
                            >
                              Number of AI variants
                            </Label>
                            <Input
                              id="bulk-ai-rewrite-count"
                              type="number"
                              min={1}
                              max={Math.max(1, maxAiSlots)}
                              value={aiRewriteCount}
                              onChange={(e) => setAiRewriteCount(e.target.value)}
                              className={cn(fieldClass, "w-full", tintedFieldClass)}
                            />
                            <p className={helperClass}>
                              Remaining slots after custom messages: {maxAiSlots}.
                            </p>
                          </div>

                          {activeCredentials.length === 0 ? (
                            <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                              No AI credentials yet. Open{" "}
                              <span className="font-semibold">AI Credentials</span>{" "}
                              in the sidebar and add a Gemini or OpenRouter key
                              first.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <Label
                                htmlFor="bulk-ai-credential"
                                className="text-xs font-semibold"
                              >
                                Credential{" "}
                                <span className="text-red-600">*</span>
                              </Label>
                              <Select
                                value={
                                  aiRewriteSettings.credentialId.trim() &&
                                  activeCredentials.some(
                                    (c) => c.id === aiRewriteSettings.credentialId
                                  )
                                    ? aiRewriteSettings.credentialId
                                    : CREDENTIAL_NONE
                                }
                                onValueChange={(v) =>
                                  setAiRewriteSettings((prev) => ({
                                    ...prev,
                                    credentialId:
                                      !v || v === CREDENTIAL_NONE ? "" : v,
                                    model: "",
                                  }))
                                }
                                items={[
                                  {
                                    value: CREDENTIAL_NONE,
                                    label: "Select credential…",
                                  },
                                  ...activeCredentials.map((c) => ({
                                    value: c.id,
                                    label: `${c.name} · ${
                                      c.provider === "gemini"
                                        ? "Gemini"
                                        : "OpenRouter"
                                    } (${c.apiKeyMasked})`,
                                  })),
                                ]}
                              >
                                <SelectTrigger
                                  id="bulk-ai-credential"
                                  className={cn(
                                    fieldClass,
                                    "w-full",
                                    tintedFieldClass
                                  )}
                                >
                                  <SelectValue placeholder="Select credential…" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={CREDENTIAL_NONE}>
                                    Select credential…
                                  </SelectItem>
                                  {activeCredentials.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name} ·{" "}
                                      {c.provider === "gemini"
                                        ? "Gemini"
                                        : "OpenRouter"}{" "}
                                      ({c.apiKeyMasked})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label
                              htmlFor="bulk-ai-system-prompt"
                              className="text-xs font-semibold"
                            >
                              System prompt (optional)
                            </Label>
                            <Textarea
                              id="bulk-ai-system-prompt"
                              value={aiRewriteSettings.systemPrompt}
                              onChange={(e) =>
                                setAiRewriteSettings((prev) => ({
                                  ...prev,
                                  systemPrompt: e.target.value,
                                }))
                              }
                              placeholder="Keep the same meaning; vary wording naturally…"
                              className={cn(
                                textareaClass,
                                "min-h-28 w-full",
                                tintedFieldClass
                              )}
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label
                                htmlFor="bulk-ai-temperature"
                                className="text-xs font-semibold"
                              >
                                Temperature
                              </Label>
                              <Input
                                id="bulk-ai-temperature"
                                type="number"
                                step="0.1"
                                min={0}
                                max={2}
                                value={aiRewriteSettings.temperature}
                                onChange={(e) =>
                                  setAiRewriteSettings((prev) => ({
                                    ...prev,
                                    temperature: e.target.value,
                                  }))
                                }
                                className={cn(
                                  fieldClass,
                                  "w-full",
                                  tintedFieldClass
                                )}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="bulk-ai-max-tokens"
                                className="text-xs font-semibold"
                              >
                                Max tokens (optional)
                              </Label>
                              <Input
                                id="bulk-ai-max-tokens"
                                value={aiRewriteSettings.maxTokens}
                                onChange={(e) =>
                                  setAiRewriteSettings((prev) => ({
                                    ...prev,
                                    maxTokens: e.target.value,
                                  }))
                                }
                                placeholder="Leave empty for default"
                                className={cn(
                                  fieldClass,
                                  "w-full",
                                  tintedFieldClass
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                          </>
                        ) : (
                          <div className={cn(sectionClass, "rounded-xl")}>
                    <div className="space-y-2.5">
                      <Label
                        htmlFor="bulk-template"
                        className="text-sm font-semibold"
                      >
                        Template{" "}
                        <span className="font-normal text-red-600 dark:text-red-400">
                          *
                        </span>
                      </Label>
                      {templates.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground dark:border-slate-800 dark:bg-slate-900/60">
                          No templates — create one under Templates.
                        </p>
                      ) : (
                        <Select
                          value={templateId || "__none__"}
                          onValueChange={(v) =>
                            setTemplateId(
                              v === "__none__" || v == null ? "" : v
                            )
                          }
                          items={[
                            { value: "__none__", label: "Choose a template…" },
                            ...templates.map((t) => ({
                              value: t.id,
                              label: t.name,
                            })),
                          ]}
                        >
                          <SelectTrigger
                            id="bulk-template"
                            className={`${fieldClass} w-full`}
                          >
                            <SelectValue placeholder="Choose a template..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              Choose a template…
                            </SelectItem>
                            {templates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                            </div>
                          </div>
                        )}

                        <div className={cn(sectionClass, "rounded-xl")}>
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Attachment
                              </h3>
                              <p className={helperClass}>
                                Optional media or document attached to each text send.
                              </p>
                            </div>
                          </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Attachment type
                      </Label>
                      <Select
                        value={attachmentType}
                        onValueChange={(v) =>
                          setAttachmentType(v as AttachmentType)
                        }
                        items={ATTACHMENT_TYPES.map((t) => ({
                          value: t.value,
                          label: t.label,
                        }))}
                      >
                        <SelectTrigger className={`${fieldClass} w-full`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ATTACHMENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        File upload
                      </Label>
                      <label className="block">
                        <Input
                          id="bulk-file"
                          type="file"
                          disabled={attachmentUploading}
                          accept={acceptForAttachmentType(attachmentType)}
                          onChange={(e) => void handleAttachmentFile(e)}
                          className="sr-only"
                        />
                        <span className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted dark:border-border dark:bg-slate-950 dark:text-foreground dark:hover:bg-muted/50">
                          {attachmentUploading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Upload className="size-4" />
                          )}
                          {attachmentUploading ? "Uploading..." : "Upload file"}
                        </span>
                      </label>
                      {attachmentOriginalName ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Selected:</span>{" "}
                            {attachmentOriginalName}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="h-7 text-xs text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                            onClick={() => {
                              setAttachmentAssetId("");
                              setAttachmentOriginalName("");
                            }}
                          >
                            <X className="size-3" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <p className={helperClass}>
                          Optional. File is stored and linked to this campaign (max
                          16 MB). Types above filter the file picker.
                        </p>
                      )}
                    </div>
                        </div>
                      </>
                    ) : null}

                    {WIZARD_STEPS[wizardStep].id === "audience" ? (
                      <>
                        <div className={cn(sectionClass, "rounded-xl")}>
                          <div className="flex flex-col gap-2.5">
                            {(
                              [
                                {
                                  value: "groups" as const,
                                  title: "Contact Groups (Recommended)",
                                },
                                {
                                  value: "allVerified" as const,
                                  title: "All Verified Contacts",
                                },
                                {
                                  value: "manual" as const,
                                  title: "Manual Selection",
                                },
                              ] satisfies { value: SelectionMode; title: string }[]
                            ).map((opt) => (
                              <label
                                key={opt.value}
                                className={cn(
                                  "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 shadow-sm transition-colors",
                                  selectionMode === opt.value
                                    ? "border-foreground/20 bg-muted text-foreground ring-2 ring-foreground/10"
                                    : "border-border bg-card hover:bg-muted/50"
                                )}
                              >
                                <input
                                  type="radio"
                                  name="bulk-selection"
                                  className="size-4 shrink-0 text-foreground focus:ring-ring/30"
                                  checked={selectionMode === opt.value}
                                  onChange={() => setSelectionMode(opt.value)}
                                />
                                <span className="text-[15px] font-medium text-slate-800 dark:text-slate-100">
                                  {opt.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {selectionMode === "groups" ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <Label className="text-sm font-semibold">
                                {groups.length}{" "}
                                {groups.length === 1 ? "Group" : "Groups"} Found
                              </Label>
                              {selectedGroupIds.size > 0 ? (
                                <button
                                  type="button"
                                  className="text-sm font-medium text-slate-500 underline decoration-dashed underline-offset-4 hover:text-foreground dark:hover:text-foreground"
                                  onClick={() => setSelectedGroupIds(new Set())}
                                >
                                  Clear
                                </button>
                              ) : null}
                            </div>
                            {groups.length === 0 ? (
                              <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                                No groups yet — create one under Contacts.
                              </p>
                            ) : (
                              <div className="grid max-h-[min(48vh,420px)] gap-3 overflow-y-auto sm:grid-cols-2">
                                {groups.map((gr) => {
                                  const st = groupStats(gr.id);
                                  const selected = selectedGroupIds.has(gr.id);
                                  return (
                                    <div
                                      key={gr.id}
                                      className={cn(
                                        "flex flex-col rounded-xl border bg-white p-4 shadow-sm transition-colors dark:bg-slate-950",
                                        selected
                                          ? "border-border ring-2 ring-ring/20 dark:border-border"
                                          : "border-slate-200 dark:border-slate-800"
                                      )}
                                    >
                                      <div className="mb-4 flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-3">
                                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            {gr.name.slice(0, 2).toUpperCase()}
                                          </span>
                                          <div className="min-w-0">
                                            <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                                              {gr.name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                              {st.total} contacts
                                            </p>
                                          </div>
                                        </div>
                                        <span
                                          className={cn(
                                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                            st.verified > 0
                                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                          )}
                                        >
                                          {st.verified > 0 ? "Active" : "Empty"}
                                        </span>
                                      </div>
                                      <div className="mb-4 grid grid-cols-2 gap-3">
                                        <div>
                                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                            Verified
                                          </p>
                                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {st.verified}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                            Total
                                          </p>
                                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {st.total}
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        className={cn(
                                          "mt-auto h-10 w-full rounded-lg font-semibold",
                                          selected
                                            ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90"
                                            : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                        )}
                                        onClick={() =>
                                          toggleGroup(gr.id, !selected)
                                        }
                                      >
                                        {selected ? "Selected" : "Select"}
                                        <ChevronRight className="size-4" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}

                        {selectionMode === "manual" ? (
                          <div className={cn(sectionClass, "rounded-xl")}>
                            <div className="space-y-2.5">
                              <Label
                                htmlFor="bulk-manual"
                                className="text-sm font-semibold"
                              >
                                Phone numbers
                              </Label>
                              <Textarea
                                id="bulk-manual"
                                value={manualNumbers}
                                onChange={(e) => setManualNumbers(e.target.value)}
                                placeholder={
                                  "One number per line (E.164, e.g. +1234567890)"
                                }
                                className={`${textareaClass} min-h-36 font-mono text-sm`}
                              />
                            </div>
                          </div>
                        ) : null}

                        {selectionMode === "allVerified" ? (
                          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                            Every verified contact across all groups will be included.
                          </p>
                        ) : null}

                        <div className="rounded-xl border border-border bg-muted/50 px-5 py-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <CheckCircle2 className="size-4" />
                            Campaign reach
                          </div>
                          {verifiedOnly ? (
                            <>
                              <p className="text-[15px] font-semibold leading-snug">
                                {recipientCount} verified{" "}
                                {recipientCount === 1 ? "contact" : "contacts"} will
                                receive this message
                              </p>
                              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                Only WhatsApp verified contacts will be included.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-[15px] font-semibold leading-snug">
                                {recipientCount}{" "}
                                {recipientCount === 1 ? "recipient" : "recipients"}{" "}
                                from your manual list
                              </p>
                              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                Numbers are validated at send time; invalid lines are
                                skipped.
                              </p>
                            </>
                          )}
                        </div>
                      </>
                    ) : null}

                    {WIZARD_STEPS[wizardStep].id === "schedule" ? (
                      <div className={cn(sectionClass, "rounded-xl grid gap-5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-5")}>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Schedule type
                      </Label>
                      <Select
                        value={scheduleType}
                        onValueChange={(v) =>
                          setScheduleType((v ?? "immediate") as ScheduleType)
                        }
                        items={[
                          { value: "immediate", label: "Send immediately" },
                          { value: "scheduled", label: "Scheduled" },
                        ]}
                      >
                        <SelectTrigger className={`${fieldClass} w-full`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">
                            Send immediately
                          </SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-semibold">
                        Random delay between messages (seconds)
                      </Label>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="bulk-delay-min"
                            className="text-xs font-medium text-slate-500 dark:text-slate-400"
                          >
                            Min
                          </Label>
                          <Input
                            id="bulk-delay-min"
                            type="number"
                            min={0}
                            max={3600}
                            value={delayMinSec}
                            onChange={(e) => setDelayMinSec(e.target.value)}
                            className={`${fieldClass} w-24`}
                          />
                        </div>
                        <span className="pb-2.5 text-sm text-slate-400">to</span>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="bulk-delay-max"
                            className="text-xs font-medium text-slate-500 dark:text-slate-400"
                          >
                            Max
                          </Label>
                          <Input
                            id="bulk-delay-max"
                            type="number"
                            min={0}
                            max={3600}
                            value={delayMaxSec}
                            onChange={(e) => setDelayMaxSec(e.target.value)}
                            className={`${fieldClass} w-24`}
                          />
                        </div>
                      </div>
                      <div
                        className={cn(
                          "rounded-md border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-xs leading-relaxed",
                          "text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100"
                        )}
                      >
                        WhatsApp anti-ban guideline: Recommended 150–200s random
                        delay between sends (approx. 1 message every 2.5–3.5
                        minutes) to protect your WhatsApp account from being blocked.
                      </div>
                    </div>
                    {scheduleType === "scheduled" ? (
                      <div className="space-y-2 sm:col-span-2">
                        <Label
                          htmlFor="bulk-when"
                          className="text-sm font-medium"
                        >
                          Send at
                        </Label>
                        <Input
                          id="bulk-when"
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className={`${fieldClass} max-w-md`}
                        />
                      </div>
                    ) : null}
                    <div className="space-y-2 sm:col-span-2">
                      <Label
                        htmlFor="bulk-retries"
                        className="text-sm font-medium"
                      >
                        Max retries for failed messages
                      </Label>
                      <Input
                        id="bulk-retries"
                        type="number"
                        min={0}
                        value={maxRetries}
                        onChange={(e) => setMaxRetries(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                      </div>
                    ) : null}

                    {WIZARD_STEPS[wizardStep].id === "protection" ? (
                      <>
                        <div className={cn(sectionClass, "rounded-xl")}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <Label className="text-sm font-semibold">
                                Anti-block protection
                              </Label>
                              <p className={helperClass}>
                                Control pacing, filtering, and send windows.
                              </p>
                            </div>
                            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-foreground shadow-sm dark:border-border dark:bg-slate-950 dark:text-foreground">
                              <input
                                type="checkbox"
                                checked={antiBlockEnabled}
                                onChange={(e) => setAntiBlockEnabled(e.target.checked)}
                                className="size-4 rounded border-slate-300 text-foreground focus:ring-ring/20"
                              />
                              Enabled
                            </label>
                          </div>
                        </div>

                        <div className={cn(sectionClass, "rounded-xl")}>
                          <button
                            type="button"
                            aria-expanded={protectionOpen.filters}
                            onClick={() =>
                              setProtectionOpen((p) => ({ ...p, filters: !p.filters }))
                            }
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              {protectionOpen.filters ? (
                                <Minus className="size-4" />
                              ) : (
                                <Plus className="size-4" />
                              )}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Filters
                            </span>
                          </button>
                          {protectionOpen.filters ? (
                            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Filter options
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {(
                                  [
                                    ["spintax", "Spintax", spintaxEnabled, setSpintaxEnabled],
                                    ["verify", "Verify Numbers", verifyNumbers, setVerifyNumbers],
                                    ["replied", "Replied Only", repliedOnly, setRepliedOnly],
                                    ["window24", "24h Window", recent24hOnly, setRecent24hOnly],
                                  ] as const
                                ).map(([key, title, value, setter]) => (
                                  <label
                                    key={key}
                                    className={cn(
                                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                                      value
                                        ? "border-border bg-muted text-foreground dark:border-border dark:bg-muted/30 dark:text-foreground"
                                        : "border-slate-200 bg-white hover:border-border hover:bg-muted/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-border"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={value}
                                      onChange={(e) => setter(e.target.checked)}
                                      className="size-4 rounded border-slate-300 text-foreground focus:ring-ring/20"
                                    />
                                    {title}
                                  </label>
                                ))}
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Uniqueness
                                </Label>
                                <Select
                                  value={uniquenessMode}
                                  onValueChange={(v) =>
                                    setUniquenessMode((v ?? "none") as UniquenessMode)
                                  }
                                  items={[
                                    { value: "none", label: "None" },
                                    { value: "campaign", label: "Campaign" },
                                    {
                                      value: "workspace_window",
                                      label: "Workspace (24h)",
                                    },
                                  ]}
                                >
                                  <SelectTrigger className={`${fieldClass} h-10`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="campaign">Campaign</SelectItem>
                                    <SelectItem value="workspace_window">
                                      Workspace (24h)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className={cn(sectionClass, "rounded-xl")}>
                          <button
                            type="button"
                            aria-expanded={protectionOpen.pacing}
                            onClick={() =>
                              setProtectionOpen((p) => ({ ...p, pacing: !p.pacing }))
                            }
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              {protectionOpen.pacing ? (
                                <Minus className="size-4" />
                              ) : (
                                <Plus className="size-4" />
                              )}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Pacing
                            </span>
                          </button>
                          {protectionOpen.pacing ? (
                            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Batch controls
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-500">
                                    Batch pause
                                  </Label>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Input
                                      type="number"
                                      min={1}
                                      value={batchPauseEvery}
                                      onChange={(e) => setBatchPauseEvery(e.target.value)}
                                      className={`${fieldClass} h-10 w-20`}
                                    />
                                    <span>msgs, wait</span>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={batchPauseSec}
                                      onChange={(e) => setBatchPauseSec(e.target.value)}
                                      className={`${fieldClass} h-10 w-20`}
                                    />
                                    <span>sec</span>
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-500">
                                    Fail limit in a row
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={failLimitInRow}
                                    onChange={(e) => setFailLimitInRow(e.target.value)}
                                    className={`${fieldClass} h-10 w-20`}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className={cn(sectionClass, "rounded-xl")}>
                          <button
                            type="button"
                            aria-expanded={protectionOpen.hours}
                            onClick={() =>
                              setProtectionOpen((p) => ({ ...p, hours: !p.hours }))
                            }
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              {protectionOpen.hours ? (
                                <Minus className="size-4" />
                              ) : (
                                <Plus className="size-4" />
                              )}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Hours
                            </span>
                          </button>
                          {protectionOpen.hours ? (
                            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Send windows
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-500">Active hours</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="time"
                                      value={activeHoursStart}
                                      onChange={(e) => setActiveHoursStart(e.target.value)}
                                      className={`${fieldClass} h-10`}
                                    />
                                    <span className="text-xs text-slate-500">to</span>
                                    <Input
                                      type="time"
                                      value={activeHoursEnd}
                                      onChange={(e) => setActiveHoursEnd(e.target.value)}
                                      className={`${fieldClass} h-10`}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-500">Inactive hours</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="time"
                                      value={inactiveHoursStart}
                                      onChange={(e) => setInactiveHoursStart(e.target.value)}
                                      className={`${fieldClass} h-10 dark:text-white`}
                                      disabled={!activeHoursEnabled}
                                    />
                                    <span className="text-xs text-slate-500">to</span>
                                    <Input
                                      type="time"
                                      value={inactiveHoursEnd}
                                      onChange={(e) => setInactiveHoursEnd(e.target.value)}
                                      className={`${fieldClass} h-10 dark:text-white`}
                                      disabled={!activeHoursEnabled}
                                    />
                                  </div>
                                </div>
                              </div>
                              {!activeHoursPairOk ? (
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  Set both active-hours start and end, or leave both empty.
                                </p>
                              ) : null}
                              {!inactiveHoursPairOk ? (
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  Set both inactive-hours start and end, or leave both empty.
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : null}

                    {WIZARD_STEPS[wizardStep].id === "summary" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className={cn(sectionClass, "rounded-xl")}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Campaign
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {campaignName.trim() || "—"}
                          </p>
                        </div>
                        <div className={cn(sectionClass, "rounded-xl")}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Devices
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            {deviceMode === "single"
                              ? selectedDevice
                                ? deviceName(selectedDevice)
                                : "—"
                              : `${sessionIds.size} session(s) · ${DEVICE_MODE_OPTIONS.find((o) => o.value === deviceMode)?.title ?? deviceMode}`}
                          </p>
                        </div>
                        <div className={cn(sectionClass, "rounded-xl sm:col-span-2")}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Message
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            {messageType === "text"
                              ? `${customFilledCount} variant(s)${aiRewriteEnabled ? ` + ${safeAiCount} AI rewrite(s)` : ""}`
                              : templates.find((t) => t.id === templateId)?.name ?? "Template not selected"}
                            {attachmentOriginalName
                              ? ` · Attachment: ${attachmentOriginalName}`
                              : ""}
                          </p>
                        </div>
                        <div className={cn(sectionClass, "rounded-xl")}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Audience
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            {recipientCount}{" "}
                            {verifiedOnly ? "verified contact(s)" : "recipient(s)"}
                            {" · "}
                            {selectionMode === "groups"
                              ? `${selectedGroupIds.size} group(s)`
                              : selectionMode === "allVerified"
                                ? "All verified"
                                : "Manual list"}
                          </p>
                        </div>
                        <div className={cn(sectionClass, "rounded-xl")}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Schedule
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            {scheduleType === "immediate"
                              ? "Send immediately"
                              : scheduledAt
                                ? `Scheduled · ${scheduledAt}`
                                : "Scheduled (time not set)"}
                            {" · "}
                            Delay {delayMinSec}–{delayMaxSec}s · {maxRetries} retries
                          </p>
                        </div>
                        <div className={cn(sectionClass, "rounded-xl sm:col-span-2")}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Protection
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            {antiBlockEnabled ? "Anti-block enabled" : "Anti-block disabled"}
                            {antiBlockEnabled
                              ? ` · Spintax ${spintaxEnabled ? "on" : "off"} · Verify ${verifyNumbers ? "on" : "off"} · Uniqueness ${uniquenessMode}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      disabled={wizardStep === 0 || submitting}
                      onClick={goBack}
                    >
                      Back
                    </Button>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      disabled={submitting}
                      className="text-sm font-medium text-muted-foreground underline decoration-dashed underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50 md:hidden"
                    >
                      Save &amp; Close
                    </button>
                  </div>
                  {WIZARD_STEPS[wizardStep].id === "summary" ? (
                    <Button
                      type="button"
                      size="lg"
                      disabled={!canSubmit}
                      className="w-full sm:w-auto"
                      onClick={() => void handleSubmit()}
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Create &amp; send
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="lg"
                      className="w-full sm:w-auto"
                      onClick={goNext}
                    >
                      Continue
                      <ChevronRight className="size-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </AiPanelErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
