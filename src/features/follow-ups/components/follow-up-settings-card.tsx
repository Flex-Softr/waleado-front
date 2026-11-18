"use client";

import * as React from "react";
import { ChevronDown, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import type {
  FollowUpAiMode,
  FollowUpSettings,
  FollowUpSettingsResponse,
} from "@/types/follow-ups-api";
import { ApiError, apiJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function hourLabel(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${suffix}`;
}

function clampInt(v: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const AI_MODES: { id: FollowUpAiMode; label: string; hint: string }[] = [
  {
    id: "SUGGEST",
    label: "AI suggests, I approve",
    hint: "The AI drafts a date and message after each chat. Nothing is sent until you approve it.",
  },
  {
    id: "AUTO",
    label: "AI decides",
    hint: "The AI schedules follow-ups by itself. You can still edit or cancel any of them.",
  },
  {
    id: "OFF",
    label: "Manual only",
    hint: "The AI plans nothing. The list only holds the numbers you add yourself.",
  },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function FollowUpSettingsCard() {
  const [settings, setSettings] = React.useState<FollowUpSettings | null>(null);
  const [draft, setDraft] = React.useState<FollowUpSettings | null>(null);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiJson<FollowUpSettingsResponse>("/v1/follow-ups/settings");
        if (cancelled) return;
        // First visit: suggest the browser's timezone instead of UTC.
        const s = res.settings.configured
          ? res.settings
          : { ...res.settings, timezone: browserTimezone() };
        setSettings(res.settings);
        setDraft(s);
      } catch (err) {
        if (!cancelled) {
          toast.error("Could not load follow-up settings", {
            description: err instanceof ApiError ? err.message : undefined,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!draft || !settings) return null;

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings) || !settings.configured;
  const set = <K extends keyof FollowUpSettings>(k: K, v: FollowUpSettings[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function save(next: FollowUpSettings = draft!) {
    setSaving(true);
    try {
      const { configured: _configured, ...body } = next;
      void _configured;
      const res = await apiJson<FollowUpSettingsResponse>("/v1/follow-ups/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSettings(res.settings);
      setDraft(res.settings);
      toast.success("Follow-up settings saved");
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof ApiError ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Automatic sending</span>
              <Badge
                variant="secondary"
                className={
                  settings.autoSend
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }
              >
                {settings.autoSend ? "On" : "Off"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.autoSend
                ? `Planned follow-ups go out by themselves between ${hourLabel(settings.windowStartHour)} and ${hourLabel(settings.windowEndHour)} (${settings.timezone}). Check the list daily and mark buyers as Converted.`
                : "Off: follow-ups are only planned. Use “Send now” on a card, or turn this on to send them on their planned date."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={settings.autoSend ? "outline" : "default"}
              disabled={saving}
              onClick={() => save({ ...draft, autoSend: !settings.autoSend })}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {settings.autoSend ? "Turn off" : "Turn on"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              <Settings2 className="size-4" />
              Settings
              <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <span className="text-sm font-semibold">Who plans the follow-ups</span>
          <div className="flex flex-wrap gap-2">
            {AI_MODES.map((m) => (
              <Button
                key={m.id}
                type="button"
                size="sm"
                variant={settings.aiMode === m.id ? "default" : "outline"}
                disabled={saving}
                aria-pressed={settings.aiMode === m.id}
                onClick={() => {
                  if (settings.aiMode !== m.id) void save({ ...draft, aiMode: m.id });
                }}
              >
                {m.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {AI_MODES.find((m) => m.id === settings.aiMode)?.hint}
          </p>
        </div>

        {open ? (
          <div className="space-y-4 border-t pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fu-start">Send between</Label>
                <div className="flex items-center gap-2">
                  <select
                    id="fu-start"
                    className={selectClass}
                    value={draft.windowStartHour}
                    onChange={(e) => set("windowStartHour", Number(e.target.value))}
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{hourLabel(h)}</option>
                    ))}
                  </select>
                  <span className="text-sm text-muted-foreground">and</span>
                  <select
                    aria-label="Window end"
                    className={selectClass}
                    value={draft.windowEndHour}
                    onChange={(e) => set("windowEndHour", Number(e.target.value))}
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{hourLabel(h)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fu-tz">Timezone</Label>
                <Input
                  id="fu-tz"
                  value={draft.timezone}
                  onChange={(e) => set("timezone", e.target.value)}
                  placeholder="Asia/Dhaka"
                />
                <p className="text-xs text-muted-foreground">
                  Example: Asia/Dhaka, Europe/London, America/New_York.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fu-max">Follow-ups per customer</Label>
                <Input
                  id="fu-max"
                  type="number"
                  min={1}
                  max={5}
                  value={draft.maxFollowUps}
                  onChange={(e) => set("maxFollowUps", clampInt(e.target.value, 1, 5, 3))}
                />
                <p className="text-xs text-muted-foreground">
                  The AI stops after this many unanswered follow-ups. 3 is a safe default.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fu-daily">Daily limit per WhatsApp number</Label>
                <Input
                  id="fu-daily"
                  type="number"
                  min={1}
                  max={500}
                  value={draft.dailyLimitPerDevice}
                  onChange={(e) => set("dailyLimitPerDevice", clampInt(e.target.value, 1, 500, 30))}
                />
                <p className="text-xs text-muted-foreground">
                  Keeps your number safe from being flagged for sending too much.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fu-idle">Review a chat after silence of (hours)</Label>
                <Input
                  id="fu-idle"
                  type="number"
                  min={1}
                  max={24}
                  value={draft.idleHours}
                  onChange={(e) => set("idleHours", clampInt(e.target.value, 1, 24, 2))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fu-days">Longest wait the AI may choose (days)</Label>
                <Input
                  id="fu-days"
                  type="number"
                  min={1}
                  max={90}
                  value={draft.maxDays}
                  onChange={(e) => set("maxDays", clampInt(e.target.value, 1, 90, 30))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fu-instructions">Your guidance for the AI (optional)</Label>
              <Textarea
                id="fu-instructions"
                rows={4}
                maxLength={3000}
                value={draft.instructions}
                onChange={(e) => set("instructions", e.target.value)}
                placeholder="Example: For hosting enquiries follow up within 2–3 days. Keep messages short and polite. Never offer discounts."
              />
              <p className="text-xs text-muted-foreground">
                Tell the AI when to follow up and how to write. It follows this first.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" disabled={saving || !dirty} onClick={() => save()}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save settings
              </Button>
              {dirty ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(settings)}>
                  Reset
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
