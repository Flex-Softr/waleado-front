"use client";

import * as React from "react";
import { Loader2, Plus, Sparkles, Wand2 } from "lucide-react";

import { NodeMessageTypeCards } from "@/features/chatbot/components/node-message-type-cards";
import type { MessageFormType } from "@/features/single-message/components/message-type-cards";
import type {
  CallResponderCallType,
  CallResponderRule,
} from "@/types/call-responder";
import type { DeviceApiRecord } from "@/types/device";
import type { MessageTemplateApiRecord } from "@/types/templates-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

const CALL_TYPE_OPTIONS: {
  value: CallResponderCallType;
  label: string;
  description: string;
}[] = [
  {
    value: "missed",
    label: "Missed Calls",
    description: "When a caller hangs up or call times out without answer",
  },
  {
    value: "rejected",
    label: "Rejected Calls",
    description: "When a call is declined or busy",
  },
  {
    value: "received",
    label: "Received Calls",
    description: "Follow up after answered calls",
  },
  {
    value: "outgoing",
    label: "Outgoing Calls",
    description: "Follow up after you place a call",
  },
];

const DEFAULT_MISSED_CALL_TEXT =
  "Hello! We noticed we missed your call. How can we help you? Please reply with your inquiry and we will get back to you shortly.";

type CreateCallResponderRuleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: DeviceApiRecord[];
  templates: MessageTemplateApiRecord[];
  initialRule?: CallResponderRule | null;
  onSave: (input: {
    id?: string;
    name: string;
    deviceId: string;
    callTypes: CallResponderCallType[];
    responseDelayMinutes: number;
    messageFormType: "text" | "template";
    messageBody?: string | null;
    templateId?: string | null;
  }) => Promise<CallResponderRule | void>;
};

export function CreateCallResponderRuleDialog({
  open,
  onOpenChange,
  devices,
  templates,
  initialRule,
  onSave,
}: CreateCallResponderRuleDialogProps) {
  const isEditing = Boolean(initialRule);
  const [name, setName] = React.useState("");
  const [deviceId, setDeviceId] = React.useState<string | null>(null);
  const [callTypes, setCallTypes] = React.useState<Set<CallResponderCallType>>(
    () => new Set(["missed", "rejected"])
  );
  const [delayMinutes, setDelayMinutes] = React.useState("0");
  const [messageFormType, setMessageFormType] =
    React.useState<MessageFormType>("text");
  const [messageBody, setMessageBody] = React.useState("");
  const [templateId, setTemplateId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (initialRule) {
      setName(initialRule.name);
      setDeviceId(initialRule.deviceId);
      setCallTypes(new Set(initialRule.callTypes));
      setDelayMinutes(String(initialRule.responseDelayMinutes ?? 0));
      setMessageFormType(initialRule.messageFormType);
      setMessageBody(initialRule.messageBody ?? "");
      setTemplateId(initialRule.templateId ?? null);
    } else {
      setName("Missed Call Auto-Responder");
      setDeviceId(devices[0]?.id ?? null);
      setCallTypes(new Set(["missed", "rejected"]));
      setDelayMinutes("0");
      setMessageFormType("text");
      setMessageBody(DEFAULT_MISSED_CALL_TEXT);
      setTemplateId(null);
    }
    setPending(false);
  }, [devices, initialRule, open]);

  React.useEffect(() => {
    if (messageFormType === "text") setTemplateId(null);
  }, [messageFormType]);

  function toggleCallType(t: CallResponderCallType, on: boolean) {
    setCallTypes((prev) => {
      const n = new Set(prev);
      if (on) n.add(t);
      else n.delete(t);
      return n;
    });
  }

  function insertTag(tag: string) {
    setMessageBody((prev) => (prev ? `${prev} ${tag}` : tag));
  }

  const messageOk =
    messageFormType === "text"
      ? messageBody.trim().length > 0
      : templateId != null;

  const canSubmit =
    name.trim().length > 0 &&
    deviceId != null &&
    callTypes.size > 0 &&
    messageOk;

  async function handleSave() {
    if (!canSubmit || !deviceId) return;
    setPending(true);
    try {
      await onSave({
        id: initialRule?.id,
        name: name.trim(),
        deviceId,
        callTypes: Array.from(callTypes),
        responseDelayMinutes: Math.max(0, Number.parseInt(delayMinutes, 10) || 0),
        messageFormType,
        messageBody:
          messageFormType === "text" ? messageBody.trim() : undefined,
        templateId: messageFormType === "template" ? templateId : null,
      });
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "max-h-[min(94vh,840px)] max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl",
          "border border-border bg-card shadow-2xl backdrop-blur-md"
        )}
      >
        <DialogHeader className="border-b border-border/80 px-6 pb-4 pt-6 text-left sm:px-8 sm:pb-5 sm:pt-7">
          <DialogTitle className="font-heading pr-8 text-xl font-bold tracking-tight sm:text-2xl text-foreground">
            {isEditing ? "Edit Call Responder Rule" : "Create Call Responder Rule"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[min(65vh,580px)] space-y-5 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="cr-name" className="text-xs font-bold text-foreground">
                Rule Name{" "}
                <span className="font-normal text-destructive">*</span>
              </Label>
              <Input
                id="cr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Missed Call Response"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="cr-session" className="text-xs font-bold text-foreground">
                WhatsApp Device / Session{" "}
                <span className="font-normal text-destructive">*</span>
              </Label>
              <Select
                value={deviceId ?? undefined}
                onValueChange={(v) => setDeviceId(v ?? null)}
                items={devices.map((d) => ({
                  value: d.id,
                  label: d.phone ? `${d.name} · ${d.phone}` : d.name,
                }))}
              >
                <SelectTrigger id="cr-session" className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.phone ? `${d.name} · ${d.phone}` : d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold text-foreground">
              Call Types to Trigger Automated Response{" "}
              <span className="font-normal text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CALL_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
                    callTypes.has(opt.value)
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/10"
                      : "border-border bg-muted/40 hover:bg-muted/70"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={callTypes.has(opt.value)}
                    onChange={(e) => toggleCallType(opt.value, e.target.checked)}
                    className="mt-0.5 size-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground">
                      {opt.label}
                    </span>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cr-delay" className="text-xs font-bold text-foreground">
              Response Delay
            </Label>
            <div className="flex flex-wrap items-center gap-2.5">
              <Input
                id="cr-delay"
                type="number"
                min={0}
                max={1440}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
                className="h-11 w-24 rounded-xl tabular-nums text-center font-bold"
              />
              <span className="text-xs text-muted-foreground font-medium">
                {delayMinutes === "0" || delayMinutes === ""
                  ? "minute(s) (Instant — sends immediately when call ends)"
                  : "minute(s) after call ends before sending message"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">
              Message Format{" "}
              <span className="font-normal text-destructive">*</span>
            </Label>
            <NodeMessageTypeCards
              value={messageFormType}
              onChange={setMessageFormType}
            />
          </div>

          {messageFormType === "text" ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cr-body" className="text-xs font-bold text-foreground">
                  Custom Response Message{" "}
                  <span className="font-normal text-destructive">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Supports dynamic tags & spintax
                </span>
              </div>
              <Textarea
                id="cr-body"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Enter custom message to send automatically when a missed call occurs..."
                className="min-h-32 resize-y rounded-xl text-sm leading-relaxed p-3.5"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                  <Sparkles className="size-3 text-primary" /> Insert tag:
                </span>
                <button
                  type="button"
                  onClick={() => insertTag("{{phone}}")}
                  className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground hover:bg-muted"
                >
                  {"{{phone}}"}
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("{{name}}")}
                  className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground hover:bg-muted"
                >
                  {"{{name}}"}
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("{{time}}")}
                  className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground hover:bg-muted"
                >
                  {"{{time}}"}
                </button>
                <button
                  type="button"
                  onClick={() => insertTag("{Hello|Hi|Hey}")}
                  className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground hover:bg-muted"
                >
                  {"{Hello|Hi|Hey}"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="cr-template" className="text-xs font-bold text-foreground">
                Message Template{" "}
                <span className="font-normal text-destructive">*</span>
              </Label>
              <Select
                value={templateId ?? undefined}
                onValueChange={(v) => setTemplateId(v ?? null)}
                items={templates.map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
              >
                <SelectTrigger id="cr-template" className="h-11 w-full rounded-xl">
                  <SelectValue placeholder="Select a template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border/80 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-8">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl px-6"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || pending}
            className="h-11 gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
            onClick={handleSave}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isEditing ? (
              <Wand2 className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {pending
              ? isEditing
                ? "Saving…"
                : "Creating…"
              : isEditing
              ? "Save Changes"
              : "Create Rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
