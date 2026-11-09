"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveSystemMessaging,
  type SystemMessagingConfig,
  type SystemMessagingSettings,
} from "@/features/admin/lib/admin-system-api";
import { ApiError } from "@/lib/api";

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

/** Sender device, channels, OTP requirement and idle-device policy. */
export function MessagingSettingsCard({
  config,
  onSaved,
}: {
  config: SystemMessagingConfig;
  onSaved: (config: SystemMessagingConfig) => void;
}) {
  const [draft, setDraft] = React.useState<SystemMessagingSettings>(config.settings);
  const [saving, setSaving] = React.useState(false);
  const set = (patch: Partial<SystemMessagingSettings>) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(config.settings);
  const sender = config.senderDevices.find((d) => d.id === draft.senderDeviceId);

  async function save() {
    setSaving(true);
    try {
      const next = await saveSystemMessaging(draft);
      onSaved(next);
      setDraft(next.settings);
      toast.success("Messaging settings saved");
    } catch (e) {
      toast.error("Could not save", { description: e instanceof ApiError ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle>Sender & channels</CardTitle>
        <CardDescription>
          OTP codes, renewal reminders and receipts go out from one WhatsApp device in an admin workspace, plus email
          over SMTP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">WhatsApp sender device</Label>
            <select
              className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
              value={draft.senderDeviceId ?? ""}
              onChange={(e) => set({ senderDeviceId: e.target.value || null })}
            >
              <option value="">— None (WhatsApp messages off) —</option>
              {config.senderDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.phone ? ` (${d.phone})` : ""} · {d.connected ? "connected" : "offline"}
                </option>
              ))}
            </select>
            {config.senderDevices.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Connect a WhatsApp device in your own (admin) workspace first, then pick it here.
              </p>
            ) : sender && !sender.connected ? (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                This device is offline — WhatsApp messages and OTP are paused until it reconnects.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Disconnect idle Free-plan devices after (days)</Label>
            <Input
              inputMode="numeric"
              value={String(draft.idleFreeDeviceDays)}
              onChange={(e) => set({ idleFreeDeviceDays: Number(e.target.value) || 0 })}
            />
            <p className="text-[11px] text-muted-foreground">0 = never. Owners are warned 3 days before.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Toggle
            checked={draft.whatsappEnabled}
            onChange={(whatsappEnabled) => set({ whatsappEnabled })}
            label="WhatsApp messages"
            hint="Reminders and receipts on WhatsApp"
          />
          <Toggle
            checked={draft.emailEnabled}
            onChange={(emailEnabled) => set({ emailEnabled })}
            label="Email messages"
            hint={config.smtpConfigured ? "SMTP is configured" : "SMTP is not configured on the server"}
          />
          <Toggle
            checked={draft.requirePhoneVerification}
            onChange={(requirePhoneVerification) => set({ requirePhoneVerification })}
            label="Require WhatsApp OTP"
            hint="Only enforced while the sender is connected"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
