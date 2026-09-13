"use client";

import * as React from "react";
import {
  Check,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type { AutoReplyRule } from "@/types/auto-reply";
import type { AutoReplyRuleMutationResponse } from "@/types/auto-reply-api";
import type {
  AiCredentialApi,
  AiCredentialsListResponse,
  AiSettingsForm,
} from "@/types/ai-credentials-api";
import type {
  AiSkillApi,
  AiSkillsListResponse,
} from "@/types/ai-skills-api";
import type { DeviceApiRecord, DevicesListResponse } from "@/types/device";
import type {
  MessageTemplateApiRecord,
  TemplateMediaListResponse,
  TemplatesListResponse,
} from "@/types/templates-api";
import {
  CredentialModelFields,
  aiSettingsDefaults,
  aiSettingsFormValid,
  buildAiSettingsPayload,
  parseAiSettingsFromRecord,
} from "@/features/ai-credentials/components/credential-model-fields";
import { AiPanelErrorBoundary } from "@/features/bulk-messages/components/ai-panel-error-boundary";
import { ApiError, apiFormJson, apiJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
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

type CreateAutoReplyRuleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule: AutoReplyRule | null;
  onSaved: () => void;
};

const TRIGGER_OPTIONS: {
  value: AutoReplyRule["triggerType"];
  label: string;
}[] = [
  { value: "keyword", label: "Keyword" },
  { value: "exact", label: "Exact Match" },
  { value: "contains", label: "Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "regex", label: "Regex" },
];

const MESSAGE_MODES: {
  value: AutoReplyRule["messageMode"];
  label: string;
}[] = [
  { value: "text", label: "Text Message" },
  { value: "media", label: "Media Message" },
  { value: "template", label: "Template" },
];

const WIZARD_STEPS = [
  {
    id: "setup",
    title: "Setup",
    blurb: "Name the rule, pick a device, and define the trigger.",
  },
  {
    id: "message",
    title: "Message",
    blurb: "Choose how FlexoWhats should reply when the rule matches.",
  },
  {
    id: "ai",
    title: "AI",
    blurb: "Optionally generate replies with a saved AI credential.",
  },
  {
    id: "options",
    title: "Options",
    blurb: "Set priority, cooldown, and whether the rule is active.",
  },
  {
    id: "summary",
    title: "Summary",
    blurb: "Review details and save the auto-reply rule.",
  },
] as const;

type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

function deviceOptionLabel(d: DeviceApiRecord): string {
  const bits = [deviceName(d)];
  if (d.phone) bits.push(d.phone);
  const status = d.status === "connected" ? "Connected" : "QR ready";
  return `${bits.join(" · ")} · ${status}`;
}

function deviceName(d: DeviceApiRecord): string {
  const name = (d.name ?? "").trim();
  return name || "Unnamed device";
}

function openAiDefaults(): AiSettingsForm {
  return aiSettingsDefaults();
}

function parseOpenAiFromRule(
  settings: AutoReplyRule["openAiSettings"]
): AiSettingsForm {
  return parseAiSettingsFromRecord(settings);
}

function messageModeLabel(mode: AutoReplyRule["messageMode"]): string {
  return MESSAGE_MODES.find((m) => m.value === mode)?.label ?? mode;
}

function triggerTypeLabel(type: AutoReplyRule["triggerType"]): string {
  return TRIGGER_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function CreateAutoReplyRuleDialog({
  open,
  onOpenChange,
  editingRule,
  onSaved,
}: CreateAutoReplyRuleDialogProps) {
  const isEdit = editingRule != null;

  const [wizardStep, setWizardStep] = React.useState(0);
  const [contextLoading, setContextLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [mediaUploading, setMediaUploading] = React.useState(false);
  const [devices, setDevices] = React.useState<DeviceApiRecord[]>([]);
  const [templates, setTemplates] = React.useState<MessageTemplateApiRecord[]>(
    []
  );
  const [mediaAssets, setMediaAssets] = React.useState<
    { id: string; originalName: string; mimeType: string }[]
  >([]);
  const [credentials, setCredentials] = React.useState<AiCredentialApi[]>([]);

  const [name, setName] = React.useState("");
  const [keyword, setKeyword] = React.useState("");
  const [triggerType, setTriggerType] =
    React.useState<AutoReplyRule["triggerType"]>("contains");
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [deviceId, setDeviceId] = React.useState("");
  const [priority, setPriority] = React.useState("0");
  const [cooldown, setCooldown] = React.useState("0");
  const [messageMode, setMessageMode] =
    React.useState<AutoReplyRule["messageMode"]>("text");
  const [templateId, setTemplateId] = React.useState("__none__");
  const [mediaAssetId, setMediaAssetId] = React.useState("");
  const [mediaCaption, setMediaCaption] = React.useState("");
  const [response, setResponse] = React.useState("");
  const [openAiEnabled, setOpenAiEnabled] = React.useState(false);
  const [openAi, setOpenAi] = React.useState<AiSettingsForm>(openAiDefaults);
  const [aiSkills, setAiSkills] = React.useState<AiSkillApi[]>([]);
  const [aiSkillId, setAiSkillId] = React.useState("");
  const [active, setActive] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setWizardStep(0);
    let cancelled = false;
    (async () => {
      setContextLoading(true);
      try {
        const [devRes, tplRes, mediaRes, credRes, skillsRes] = await Promise.all([
          apiJson<DevicesListResponse>("/v1/devices"),
          apiJson<TemplatesListResponse>("/v1/templates"),
          apiJson<TemplateMediaListResponse>("/v1/templates/media").catch(
            () => ({ assets: [] })
          ),
          apiJson<AiCredentialsListResponse>("/v1/ai-credentials").catch(
            () => ({ credentials: [] })
          ),
          apiJson<AiSkillsListResponse>("/v1/ai-skills").catch(
            () => ({ skills: [] })
          ),
        ]);
        if (cancelled) return;
        setDevices(devRes.devices);
        setTemplates(tplRes.templates.filter((tpl) => tpl.active !== false));
        setMediaAssets(mediaRes.assets);
        setCredentials(credRes.credentials);
        setAiSkills(skillsRes.skills);

        if (editingRule) {
          setName(editingRule.name);
          setKeyword(editingRule.keyword);
          setTriggerType(editingRule.triggerType);
          setCaseSensitive(editingRule.caseSensitive);
          setDeviceId(editingRule.deviceId);
          setPriority(String(editingRule.priority));
          setCooldown(String(editingRule.cooldownMinutes));
          setMessageMode(editingRule.messageMode);
          setTemplateId(editingRule.templateId ?? "__none__");
          setMediaAssetId(editingRule.mediaAssetId ?? "");
          setMediaCaption(editingRule.mediaCaption ?? "");
          setResponse(editingRule.response);
          setOpenAiEnabled(editingRule.openAiEnabled || Boolean(editingRule.aiSkillId));
          setOpenAi(parseOpenAiFromRule(editingRule.openAiSettings));
          setAiSkillId(editingRule.aiSkillId ?? "");
          setActive(editingRule.active);
        } else {
          setName("");
          setKeyword("");
          setTriggerType("contains");
          setCaseSensitive(false);
          const connected = devRes.devices.filter((d) => d.status === "connected");
          setDeviceId(connected[0]?.id ?? devRes.devices[0]?.id ?? "");
          setPriority("0");
          setCooldown("0");
          setMessageMode("text");
          setTemplateId("__none__");
          setMediaAssetId("");
          setMediaCaption("");
          setResponse("");
          setOpenAiEnabled(false);
          setOpenAi(openAiDefaults());
          setAiSkillId("");
          setActive(true);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof ApiError
              ? err.message
              : "Could not load devices or templates.";
          toast.error("Load failed", { description: msg });
          setDevices([]);
          setTemplates([]);
          setMediaAssets([]);
          setCredentials([]);
          setAiSkills([]);
        }
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editingRule]);

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const meta = await apiFormJson<{
        id: string;
        originalName: string;
        mimeType: string;
      }>("/v1/templates/media", form);
      setMediaAssetId(meta.id);
      setMediaAssets((prev) => [
        {
          id: meta.id,
          originalName: meta.originalName,
          mimeType: meta.mimeType,
        },
        ...prev.filter((a) => a.id !== meta.id),
      ]);
      toast.success("File uploaded", { description: meta.originalName });
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Upload failed.";
      toast.error("Upload failed", { description: msg });
    } finally {
      setMediaUploading(false);
    }
  }

  const contentOk = React.useMemo(() => {
    if (openAiEnabled || Boolean(aiSkillId.trim())) return true;
    if (messageMode === "text") return response.trim().length > 0;
    if (messageMode === "template")
      return templateId !== "__none__" && templateId.length > 0;
    if (messageMode === "media") return mediaAssetId.trim().length > 0;
    return false;
  }, [openAiEnabled, aiSkillId, messageMode, response, templateId, mediaAssetId]);

  /** Allow leaving the Message step empty for text replies — AI can fill them next. */
  const messageStepOk = React.useMemo(() => {
    if (messageMode === "text") return true;
    if (messageMode === "template")
      return templateId !== "__none__" && templateId.length > 0;
    if (messageMode === "media") return mediaAssetId.trim().length > 0;
    return false;
  }, [messageMode, templateId, mediaAssetId]);

  const openAiOk =
    !openAiEnabled ||
    Boolean(aiSkillId.trim()) ||
    aiSettingsFormValid(openAi);

  const setupOk =
    name.trim().length > 0 &&
    keyword.trim().length > 0 &&
    deviceId.length > 0;

  const aiOk = openAiOk;
  const optionsOk = true;

  const canSubmit =
    !contextLoading &&
    !submitting &&
    !mediaUploading &&
    setupOk &&
    contentOk &&
    aiOk;

  const selectedDevice = devices.find((d) => d.id === deviceId);
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const selectedMedia = mediaAssets.find((a) => a.id === mediaAssetId);
  const selectedCredential = credentials.find(
    (c) => c.id === openAi.credentialId
  );
  const selectedSkill = aiSkills.find((s) => s.id === aiSkillId);

  function stepComplete(index: number): boolean {
    switch (WIZARD_STEPS[index]?.id as WizardStepId | undefined) {
      case "setup":
        return setupOk;
      case "message":
        return messageStepOk;
      case "ai":
        return aiOk;
      case "options":
        return optionsOk;
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
        description: "Enter a rule name, trigger value, and select a device.",
      });
      return false;
    }
    if (id === "message" && !messageStepOk) {
      toast.error("Message incomplete", {
        description: "Pick a template or upload media for this message type.",
      });
      return false;
    }
    if (id === "ai" && !aiOk) {
      toast.error("AI settings incomplete", {
        description: "Select an AI credential, or turn AI responses off.",
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
    const priorityNum = Math.min(
      1_000_000,
      Math.max(0, Number.parseInt(priority, 10) || 0)
    );
    const cooldownNum = Math.min(
      10_080,
      Math.max(0, Number.parseInt(cooldown, 10) || 0)
    );
    const tpl =
      messageMode === "template" && templateId !== "__none__" && templateId
        ? templateId
        : null;
    const media =
      messageMode === "media" && mediaAssetId.trim()
        ? mediaAssetId.trim()
        : null;
    const cap =
      messageMode === "media" && mediaCaption.trim()
        ? mediaCaption.trim()
        : null;

    const openAiPayload = openAiEnabled
      ? buildAiSettingsPayload(openAi, { includeContinuousChat: true })
      : null;

    const body = {
      name: name.trim(),
      keyword: keyword.trim(),
      triggerType,
      caseSensitive,
      deviceId,
      priority: priorityNum,
      cooldownMinutes: cooldownNum,
      messageMode,
      templateId: tpl,
      mediaAssetId: media,
      mediaCaption: cap,
      response: response.trim(),
      openAiEnabled: openAiEnabled || Boolean(aiSkillId.trim()),
      openAiSettings: openAiEnabled && openAi.credentialId ? openAiPayload : null,
      aiSkillId: aiSkillId.trim() ? aiSkillId.trim() : null,
      active,
    };

    setSubmitting(true);
    try {
      if (isEdit && editingRule) {
        await apiJson<AutoReplyRuleMutationResponse>(
          `/v1/auto-reply-rules/${editingRule.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        toast.success("Rule updated", { description: `“${name.trim()}” saved.` });
      } else {
        await apiJson<AutoReplyRuleMutationResponse>("/v1/auto-reply-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        toast.success("Rule created", {
          description: `“${name.trim()}” is ${active ? "active" : "inactive"}.`,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not save rule.";
      toast.error("Save failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const triggerHint =
    triggerType === "regex"
      ? "One regex pattern per line. Invalid patterns are rejected on save."
      : "Separate values with commas, new lines, tabs, /, ; or |. Use * to match any message (ideal for 24/7 AI assistants). When Continuous Chat is active, follow-up messages are automatically handled in the session without repeating keywords.";

  const currentStep = WIZARD_STEPS[wizardStep];
  const fieldClass = "h-11 rounded-xl";
  const sectionClass =
    "space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5";
  const helperClass = "text-sm leading-relaxed text-slate-500 dark:text-slate-400";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[min(94vh,900px)] max-w-[calc(100%-.5rem)] flex-col gap-0 overflow-hidden rounded-xl p-0",
          "border border-border bg-card shadow-xl",
          "sm:max-w-5xl md:flex-row"
        )}
      >
        <AiPanelErrorBoundary label="Auto-reply dialog crashed while updating.">
          <aside className="flex shrink-0 flex-col border-b border-border bg-muted/60 md:w-64 md:border-b-0 md:border-r">
            <DialogHeader className="space-y-1 px-5 pb-4 pt-5 text-left sm:px-6 sm:pt-6">
              <DialogTitle className="font-heading text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {isEdit ? "Edit Auto-Reply Rule" : "Create Auto-Reply Rule"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Follow each step, then review and save.
              </DialogDescription>
            </DialogHeader>

            <nav
              aria-label="Auto-reply wizard steps"
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
                      "flex min-w-28 shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors md:min-w-0 md:w-full md:px-3 md:py-3",
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
                Close
              </button>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            {contextLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
                <Loader2 className="size-10 animate-spin text-foreground" />
                <p className="text-sm">Loading devices, templates, and media…</p>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
                  <div className="mb-6 space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      {currentStep.title}
                    </h2>
                    <p className={helperClass}>{currentStep.blurb}</p>
                  </div>

                  <div className="space-y-5">
                    {currentStep.id === "setup" ? (
                      <>
                        <div className={sectionClass}>
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label
                                htmlFor="ar-device"
                                className="text-sm font-semibold"
                              >
                                Device{" "}
                                <span className="font-normal text-red-600 dark:text-red-400">
                                  *
                                </span>
                              </Label>
                              {devices.length === 0 ? (
                                <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                                  No devices — add one under Devices.
                                </p>
                              ) : (
                                <Select
                                  value={deviceId}
                                  onValueChange={(v) => setDeviceId(v ?? "")}
                                  items={devices.map((d) => ({
                                    value: d.id,
                                    label: deviceOptionLabel(d),
                                  }))}
                                >
                                  <SelectTrigger
                                    id="ar-device"
                                    className={cn(fieldClass, "w-full")}
                                  >
                                    <SelectValue placeholder="Select device" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {devices.map((d) => (
                                      <SelectItem key={d.id} value={d.id}>
                                        {deviceOptionLabel(d)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="ar-name"
                                className="text-sm font-semibold"
                              >
                                Rule name{" "}
                                <span className="font-normal text-red-600 dark:text-red-400">
                                  *
                                </span>
                              </Label>
                              <Input
                                id="ar-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Welcome Message"
                                className={cn(fieldClass, "px-3.5")}
                              />
                            </div>
                          </div>
                        </div>

                        <div className={sectionClass}>
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">
                                Trigger type{" "}
                                <span className="font-normal text-red-600 dark:text-red-400">
                                  *
                                </span>
                              </Label>
                              <Select
                                value={triggerType}
                                onValueChange={(v) =>
                                  setTriggerType(
                                    (v ??
                                      "contains") as AutoReplyRule["triggerType"]
                                  )
                                }
                                items={TRIGGER_OPTIONS.map((o) => ({
                                  value: o.value,
                                  label: o.label,
                                }))}
                              >
                                <SelectTrigger className={cn(fieldClass, "w-full")}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRIGGER_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                      {o.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label
                                htmlFor="ar-trigger"
                                className="text-sm font-semibold"
                              >
                                Trigger value{" "}
                                <span className="font-normal text-red-600 dark:text-red-400">
                                  *
                                </span>
                              </Label>
                              <Textarea
                                id="ar-trigger"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="e.g., hello, hi, help (or * for all messages)"
                                className="min-h-[88px] resize-y rounded-xl text-[15px] leading-relaxed"
                              />
                              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                {triggerHint}
                              </p>
                            </div>
                          </div>

                          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                            <span className="text-[15px] font-medium text-slate-800 dark:text-slate-200">
                              Case sensitive — match case exactly
                            </span>
                            <input
                              type="checkbox"
                              checked={caseSensitive}
                              onChange={(e) =>
                                setCaseSensitive(e.target.checked)
                              }
                              className="size-4 rounded border-slate-300 text-blue-600"
                            />
                          </label>
                        </div>
                      </>
                    ) : null}

                    {currentStep.id === "message" ? (
                      <>
                        <div className={sectionClass}>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                              Message type{" "}
                              <span className="font-normal text-red-600 dark:text-red-400">
                                *
                              </span>
                            </Label>
                            <Select
                              value={messageMode}
                              onValueChange={(v) =>
                                setMessageMode(
                                  (v ?? "text") as AutoReplyRule["messageMode"]
                                )
                              }
                              items={MESSAGE_MODES.map((m) => ({
                                value: m.value,
                                label: m.label,
                              }))}
                            >
                              <SelectTrigger className={cn(fieldClass, "w-full")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MESSAGE_MODES.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {messageMode === "template" ? (
                          <div className={sectionClass}>
                            <Label
                              htmlFor="ar-template"
                              className="text-sm font-semibold"
                            >
                              Template{" "}
                              <span className="font-normal text-red-600 dark:text-red-400">
                                *
                              </span>
                            </Label>
                            {templates.length === 0 ? (
                              <p className="rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
                                No templates — create one under Templates
                                (include media in the template to send images).
                              </p>
                            ) : (
                              <>
                                <Select
                                  value={templateId}
                                  onValueChange={(v) =>
                                    setTemplateId(v ?? "__none__")
                                  }
                                  items={[
                                    { value: "__none__", label: "Select template" },
                                    ...templates.map((t) => ({
                                      value: t.id,
                                      label: t.name,
                                    })),
                                  ]}
                                >
                                  <SelectTrigger
                                    id="ar-template"
                                    className={cn(fieldClass, "w-full")}
                                  >
                                    <SelectValue placeholder="Select template" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">
                                      Select template
                                    </SelectItem>
                                    {templates.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Media defined on the template is sent with the
                                  message.
                                </p>
                              </>
                            )}
                          </div>
                        ) : null}

                        {messageMode === "media" ? (
                          <div className={sectionClass}>
                            <Label className="text-sm font-semibold">
                              Media file{" "}
                              <span className="font-normal text-red-600 dark:text-red-400">
                                *
                              </span>
                            </Label>
                            <div className="flex flex-wrap items-center gap-2">
                              <label>
                                <input
                                  type="file"
                                  className="sr-only"
                                  onChange={(e) => void handleMediaUpload(e)}
                                  disabled={mediaUploading}
                                />
                                <span className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                                  {mediaUploading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Upload className="size-4" />
                                  )}
                                  Upload new
                                </span>
                              </label>
                              {mediaAssets.length > 0 ? (
                                <Select
                                  value={mediaAssetId || "__pick__"}
                                  onValueChange={(v) => {
                                    const x = v ?? "";
                                    setMediaAssetId(x === "__pick__" ? "" : x);
                                  }}
                                  items={[
                                    { value: "__pick__", label: "— Choose —" },
                                    ...mediaAssets.map((a) => ({
                                      value: a.id,
                                      label: a.originalName,
                                    })),
                                  ]}
                                >
                                  <SelectTrigger className="h-11 min-w-[200px] flex-1 rounded-xl">
                                    <SelectValue placeholder="Or pick uploaded file" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__pick__">
                                      — Choose —
                                    </SelectItem>
                                    {mediaAssets.map((a) => (
                                      <SelectItem key={a.id} value={a.id}>
                                        {a.originalName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : null}
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="ar-caption"
                                className="text-sm font-semibold"
                              >
                                Caption (optional)
                              </Label>
                              <Textarea
                                id="ar-caption"
                                value={mediaCaption}
                                onChange={(e) => setMediaCaption(e.target.value)}
                                placeholder="Optional caption for the media…"
                                className="min-h-20 resize-y rounded-xl"
                              />
                            </div>
                          </div>
                        ) : null}

                        <div className={sectionClass}>
                          <Label
                            htmlFor="ar-response"
                            className="text-sm font-semibold"
                          >
                            Reply message{" "}
                            {!openAiEnabled && messageMode === "text" ? (
                              <span className="font-normal text-red-600 dark:text-red-400">
                                *
                              </span>
                            ) : (
                              <span className="font-normal text-muted-foreground">
                                (fallback)
                              </span>
                            )}
                          </Label>
                          <Textarea
                            id="ar-response"
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            placeholder="Message when AI is off, or fallback if OpenAI fails…"
                            className="min-h-28 resize-y rounded-xl text-[15px] leading-relaxed"
                          />
                          {openAiEnabled ? (
                            <p className="text-xs text-sky-700 dark:text-sky-300">
                              When AI is enabled, this field is used if AI
                              generation fails.
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              You can leave this empty if you plan to enable AI
                              on the next step.
                            </p>
                          )}
                        </div>
                      </>
                    ) : null}

                    {currentStep.id === "ai" ? (
                      <div
                        className={cn(
                          sectionClass,
                          "border-sky-200/90 bg-sky-50/90 dark:border-sky-900/60 dark:bg-sky-950/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Sparkles className="size-4 text-sky-600 dark:text-sky-400" />
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Use AI for Responses
                              </span>
                              <Badge
                                variant="secondary"
                                className="bg-sky-100 text-sky-800 dark:bg-sky-900/80 dark:text-sky-200"
                              >
                                AI Powered
                              </Badge>
                            </div>
                            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                              Generate replies using taught business AI Skills (continuous chat) or custom credential prompts.
                            </p>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              role="switch"
                              checked={openAiEnabled || Boolean(aiSkillId)}
                              onChange={(e) => {
                                const next = e.target.checked;
                                setOpenAiEnabled(next);
                                if (!next) setAiSkillId("");
                              }}
                              className="sr-only"
                            />
                            <span
                              className={cn(
                                "relative h-7 w-12 shrink-0 rounded-full border border-slate-200 bg-slate-200 transition-colors dark:border-slate-600 dark:bg-slate-700",
                                (openAiEnabled || Boolean(aiSkillId)) &&
                                  "border-emerald-500 bg-emerald-500 dark:border-emerald-500"
                              )}
                            >
                              <span
                                className={cn(
                                  "absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform",
                                  (openAiEnabled || Boolean(aiSkillId)) && "translate-x-5"
                                )}
                              />
                            </span>
                          </label>
                        </div>

                        {openAiEnabled || Boolean(aiSkillId) ? (
                          <div className="mt-4 space-y-4 border-t border-sky-200/70 pt-4 dark:border-sky-900/50">
                            {/* AI Skill selection */}
                            <div className="rounded-xl border border-sky-200 bg-white/80 p-4 shadow-sm dark:border-sky-900/70 dark:bg-slate-950/70">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  Select AI Skill (Recommended)
                                </Label>
                                <a
                                  href="/ai-skills"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-medium text-sky-600 underline hover:text-sky-700 dark:text-sky-400"
                                >
                                  Manage Skills ↗
                                </a>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Select a taught skill with predefined role, services, business knowledge, and continuous chat.
                              </p>
                              <div className="mt-3">
                                <Select
                                  value={aiSkillId || "__none__"}
                                  onValueChange={(val) => {
                                    const next =
                                      !val || val === "__none__" ? "" : val;
                                    setAiSkillId(next);
                                    if (next) setOpenAiEnabled(true);
                                  }}
                                >
                                  <SelectTrigger className="rounded-xl bg-white dark:bg-slate-900">
                                    <SelectValue placeholder="No skill (Custom prompt below)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">
                                      No skill (Use custom prompt below)
                                    </SelectItem>
                                    {aiSkills
                                      .filter((s) => s.active)
                                      .map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                          {s.name}
                                          {s.continuousChat ? " · Continuous Chat" : ""}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {selectedSkill ? (
                                <div className="mt-3 space-y-2 rounded-lg border border-sky-100 bg-sky-50/50 p-3 text-xs dark:border-sky-900/50 dark:bg-sky-950/30">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                      {selectedSkill.name}
                                    </span>
                                    {selectedSkill.continuousChat ? (
                                      <Badge
                                        variant="secondary"
                                        className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300"
                                      >
                                        Continuous Chat Active
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px]">
                                        Single Turn
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    <strong className="font-medium text-slate-800 dark:text-slate-200">
                                      Role:
                                    </strong>{" "}
                                    {selectedSkill.rolePrompt}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    <strong className="font-medium text-slate-800 dark:text-slate-200">
                                      Services:
                                    </strong>{" "}
                                    {selectedSkill.servicesDescription}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    <strong className="font-medium text-slate-800 dark:text-slate-200">
                                      Knowledge:
                                    </strong>{" "}
                                    {selectedSkill.businessKnowledge}
                                  </p>
                                </div>
                              ) : null}
                            </div>

                            <div className="space-y-2 pt-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {selectedSkill
                                  ? "Optional Overrides & Fallback Credential"
                                  : "Custom AI Settings"}
                              </p>
                              <AiPanelErrorBoundary label="AI settings panel crashed.">
                                <CredentialModelFields
                                  credentials={credentials}
                                  value={openAi}
                                  onChange={setOpenAi}
                                  showContinuousChat={!selectedSkill}
                                />
                              </AiPanelErrorBoundary>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-muted-foreground">
                            AI is off. The reply from the Message step will be
                            sent as-is.
                          </p>
                        )}
                      </div>
                    ) : null}

                    {currentStep.id === "options" ? (
                      <>
                        <div className={sectionClass}>
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label
                                htmlFor="ar-priority"
                                className="text-sm font-semibold"
                              >
                                Priority (0–100)
                              </Label>
                              <Input
                                id="ar-priority"
                                type="number"
                                min={0}
                                max={1_000_000}
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className={fieldClass}
                              />
                              <p className="text-xs text-muted-foreground">
                                Lower numbers are checked first when several
                                rules match.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="ar-cooldown"
                                className="text-sm font-semibold"
                              >
                                Cooldown (minutes)
                              </Label>
                              <Input
                                id="ar-cooldown"
                                type="number"
                                min={0}
                                value={cooldown}
                                onChange={(e) => setCooldown(e.target.value)}
                                className={fieldClass}
                              />
                              <p className="text-xs text-muted-foreground">
                                Per sender and matched trigger (0 = none).
                              </p>
                            </div>
                          </div>
                        </div>

                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/40">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                            className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                          />
                          <span className="text-[15px] font-medium text-slate-800 dark:text-slate-200">
                            Rule is active
                          </span>
                        </label>
                      </>
                    ) : null}

                    {currentStep.id === "summary" ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className={sectionClass}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Setup
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            {name.trim() || "Untitled"} ·{" "}
                            {selectedDevice
                              ? deviceName(selectedDevice)
                              : "No device"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {triggerTypeLabel(triggerType)}
                            {caseSensitive ? " · case-sensitive" : ""} ·{" "}
                            {keyword.trim() || "—"}
                          </p>
                        </div>
                        <div className={sectionClass}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Message
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            {messageModeLabel(messageMode)}
                            {messageMode === "template" && selectedTemplate
                              ? ` · ${selectedTemplate.name}`
                              : ""}
                            {messageMode === "media" && selectedMedia
                              ? ` · ${selectedMedia.originalName}`
                              : ""}
                          </p>
                          {response.trim() ? (
                            <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">
                              {response.trim()}
                            </p>
                          ) : null}
                        </div>
                        <div className={sectionClass}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            AI
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            {openAiEnabled || Boolean(aiSkillId)
                              ? `On · ${
                                  selectedSkill
                                    ? `Skill: ${selectedSkill.name}`
                                    : selectedCredential?.name ?? "Custom AI Settings"
                                }${
                                  selectedSkill?.continuousChat || openAi.continuousChat
                                    ? " · Continuous chat enabled"
                                    : ""
                                }`
                              : "Off"}
                          </p>
                        </div>
                        <div className={sectionClass}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Options
                          </p>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            Priority {priority || "0"} · Cooldown{" "}
                            {cooldown || "0"} min ·{" "}
                            {active ? "Active" : "Inactive"}
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
                      Close
                    </button>
                  </div>
                  {currentStep.id === "summary" ? (
                    <Button
                      type="button"
                      size="lg"
                      disabled={!canSubmit}
                      className="w-full sm:w-auto"
                      onClick={() => {
                        if (!contentOk) {
                          toast.error("Reply incomplete", {
                            description:
                              "Add a reply message, or go back and enable AI responses.",
                          });
                          return;
                        }
                        void handleSubmit();
                      }}
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : isEdit ? (
                        <Pencil className="size-4" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      {isEdit ? "Save changes" : "Create rule"}
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
