"use client";

import * as React from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  resetSystemTemplate,
  saveSystemTemplate,
  type SystemTemplate,
} from "@/features/admin/lib/admin-system-api";
import { ApiError } from "@/lib/api";

type Draft = {
  whatsapp: string;
  emailSubject: string;
  emailBody: string;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
};

function toDraft(t: SystemTemplate): Draft {
  return {
    whatsapp: t.whatsapp ?? "",
    emailSubject: t.email?.subject ?? "",
    emailBody: t.email?.body ?? "",
    whatsappEnabled: t.whatsappEnabled,
    emailEnabled: t.emailEnabled,
  };
}

function ChannelLabel({
  label,
  toggleable,
  checked,
  onChange,
}: {
  label: string;
  toggleable: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  if (!toggleable) return <p className="text-sm font-medium">{label}</p>;
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Edits one system message template. Keyed by the parent per template, so state starts fresh. */
export function TemplateEditor({
  template,
  onChange,
}: {
  template: SystemTemplate;
  onChange: (t: SystemTemplate) => void;
}) {
  const [draft, setDraft] = React.useState(() => toDraft(template));
  const [busy, setBusy] = React.useState<"save" | "reset" | null>(null);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(template));
  // The server always keeps a template's only channel on, so only offer the switch when there are two.
  const hasBothChannels = template.whatsapp !== null && template.email !== null;

  async function run(kind: "save" | "reset") {
    setBusy(kind);
    try {
      const { template: next } =
        kind === "reset"
          ? await resetSystemTemplate(template.key)
          : await saveSystemTemplate(template.key, {
              whatsappBody: template.whatsapp === null ? undefined : draft.whatsapp,
              emailSubject: template.email === null ? undefined : draft.emailSubject,
              emailBody: template.email === null ? undefined : draft.emailBody,
              whatsappEnabled: draft.whatsappEnabled,
              emailEnabled: draft.emailEnabled,
            });
      onChange(next);
      setDraft(toDraft(next));
      toast.success(kind === "reset" ? "Template reset to default" : "Template saved");
    } catch (e) {
      toast.error("Could not update template", { description: e instanceof ApiError ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Placeholders:</span>
        {template.variables.map((v) => (
          <Badge key={v} variant="outline" className="font-mono text-[11px]">
            {`{${v}}`}
          </Badge>
        ))}
      </div>

      {template.whatsapp !== null ? (
        <div className="space-y-1.5">
          <ChannelLabel
            label="WhatsApp"
            toggleable={hasBothChannels}
            checked={draft.whatsappEnabled}
            onChange={(whatsappEnabled) => set({ whatsappEnabled })}
          />
          <Textarea rows={4} value={draft.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} />
        </div>
      ) : null}

      {template.email !== null ? (
        <div className="space-y-1.5">
          <ChannelLabel
            label="Email"
            toggleable={hasBothChannels}
            checked={draft.emailEnabled}
            onChange={(emailEnabled) => set({ emailEnabled })}
          />
          <Label className="text-xs text-muted-foreground">Subject</Label>
          <Input value={draft.emailSubject} onChange={(e) => set({ emailSubject: e.target.value })} />
          <Label className="text-xs text-muted-foreground">Body</Label>
          <Textarea rows={7} value={draft.emailBody} onChange={(e) => set({ emailBody: e.target.value })} />
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => run("reset")} disabled={busy !== null || !template.customized}>
          {busy === "reset" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          Reset to default
        </Button>
        <Button onClick={() => run("save")} disabled={busy !== null || !dirty}>
          {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save template
        </Button>
      </div>
    </div>
  );
}
